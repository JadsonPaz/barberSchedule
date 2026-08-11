// src/auth/auth.js
import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { body, validationResult } from 'express-validator'
import User from '../models/user.js'
import PasswordResetToken from '../models/passwordResetToken.js'
import RefreshToken from '../models/refreshToken.js'
import { sendPasswordResetEmail } from '../services/email.service.js'

const authRouter = express.Router()

const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '1h'
const REFRESH_TOKEN_DAYS = Number(process.env.JWT_REFRESH_EXPIRES_DAYS || 60)

function checkValidations(req, res) {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        res.status(400).send({
            success: false,
            statusCode: 400,
            body: { text: 'Erro de validação', errors: errors.array() },
        })
        return false
    }
    return true
}

function hashToken(rawToken) {
    return crypto.createHash('sha256').update(rawToken).digest('hex')
}

function createAccessToken(user) {
    return jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
    )
}

function getRefreshTokenExpiresAt() {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_DAYS)
    return expiresAt
}

async function createRefreshToken(userId) {
    const rawToken = crypto.randomBytes(48).toString('hex')

    await RefreshToken.create({
        token: hashToken(rawToken),
        userId,
        expiresAt: getRefreshTokenExpiresAt(),
    })

    return rawToken
}

async function createAuthBody(user, text) {
    const token = createAccessToken(user)
    const refreshToken = await createRefreshToken(user._id)

    return { text, user, token, refreshToken }
}

const signupValidations = [
    body('fullname')
        .trim()
        .notEmpty().withMessage('Nome completo obrigatório')
        .isLength({ min: 3 }).withMessage('Nome deve ter ao menos 3 caracteres'),
    body('email')
        .trim()
        .notEmpty().withMessage('E-mail obrigatório')
        .isEmail().withMessage('E-mail inválido'),
    body('password')
        .notEmpty().withMessage('Senha obrigatória')
        .isLength({ min: 6 }).withMessage('Senha deve ter ao menos 6 caracteres'),
]

const loginValidations = [
    body('email').trim().notEmpty().isEmail().withMessage('E-mail inválido'),
    body('password').notEmpty().withMessage('Senha obrigatória'),
]

const forgotPasswordValidations = [
    body('email')
        .trim()
        .notEmpty().withMessage('E-mail obrigatório')
        .isEmail().withMessage('E-mail inválido'),
]

const resetPasswordValidations = [
    body('token')
        .notEmpty().withMessage('Token obrigatório'),
    body('newPassword')
        .notEmpty().withMessage('Nova senha obrigatória')
        .isLength({ min: 6 }).withMessage('Nova senha deve ter ao menos 6 caracteres'),
]

const refreshTokenValidations = [
    body('refreshToken')
        .notEmpty().withMessage('Refresh token obrigatório'),
]

authRouter.post('/signup', signupValidations, async (req, res) => {
    if (!checkValidations(req, res)) return

    try {
        const { fullname, email, password } = req.body

        const existingUser = await User.findOne({ $or: [{ email }, { fullname }] })
        if (existingUser) {
            const message =
                existingUser.email === email ? 'Email já cadastrado' : 'Nome já cadastrado'
            return res.status(409).send({
                success: false,
                statusCode: 409,
                body: { text: message },
            })
        }

        const hashedPassword = await bcrypt.hash(password, 12)
        const newUser = await User.create({ fullname, email, password: hashedPassword, role: 'user' })
        const user = await User.findById(newUser._id)
        const responseBody = await createAuthBody(user, 'Usuário cadastrado com sucesso')

        return res.status(201).send({
            success: true,
            statusCode: 201,
            body: responseBody,
        })
    } catch (error) {
        return res.status(500).send({
            success: false,
            statusCode: 500,
            body: { text: 'Erro interno no servidor', error: error.message },
        })
    }
})

authRouter.post('/login', loginValidations, async (req, res) => {
    if (!checkValidations(req, res)) return

    try {
        const { email, password } = req.body
        const user = await User.findOne({ email }).select('+password')

        if (!user) {
            return res.status(401).send({
                success: false,
                statusCode: 401,
                body: { text: 'Credenciais inválidas' },
            })
        }

        const passwordMatch = await bcrypt.compare(password, user.password)
        if (!passwordMatch) {
            return res.status(401).send({
                success: false,
                statusCode: 401,
                body: { text: 'Credenciais inválidas' },
            })
        }

        const safeUser = await User.findById(user._id)
        const responseBody = await createAuthBody(safeUser, 'Login realizado com sucesso')

        return res.status(200).send({
            success: true,
            statusCode: 200,
            body: responseBody,
        })
    } catch (error) {
        return res.status(500).send({
            success: false,
            statusCode: 500,
            body: { text: 'Erro interno no servidor', error: error.message },
        })
    }
})

authRouter.post('/refresh', refreshTokenValidations, async (req, res) => {
    if (!checkValidations(req, res)) return

    try {
        const { refreshToken } = req.body
        const hashedToken = hashToken(refreshToken)
        const refreshRecord = await RefreshToken.findOne({ token: hashedToken })

        if (!refreshRecord || refreshRecord.revokedAt || refreshRecord.expiresAt < new Date()) {
            return res.status(401).send({
                success: false,
                statusCode: 401,
                body: { text: 'Sua sessão expirou, entre novamente' },
            })
        }

        const user = await User.findById(refreshRecord.userId)
        if (!user) {
            await RefreshToken.deleteOne({ _id: refreshRecord._id })
            return res.status(401).send({
                success: false,
                statusCode: 401,
                body: { text: 'Sua sessão expirou, entre novamente' },
            })
        }

        refreshRecord.revokedAt = new Date()
        await refreshRecord.save()

        const token = createAccessToken(user)
        const nextRefreshToken = await createRefreshToken(user._id)

        return res.status(200).send({
            success: true,
            statusCode: 200,
            body: {
                text: 'Sessão renovada com sucesso',
                user,
                token,
                refreshToken: nextRefreshToken,
            },
        })
    } catch (error) {
        return res.status(500).send({
            success: false,
            statusCode: 500,
            body: { text: 'Erro interno no servidor', error: error.message },
        })
    }
})

authRouter.post('/logout', async (req, res) => {
    try {
        const { refreshToken } = req.body || {}

        if (refreshToken) {
            await RefreshToken.deleteOne({ token: hashToken(refreshToken) })
        }

        return res.status(200).send({
            success: true,
            statusCode: 200,
            body: { text: 'Logout realizado com sucesso' },
        })
    } catch (error) {
        return res.status(500).send({
            success: false,
            statusCode: 500,
            body: { text: 'Erro interno no servidor', error: error.message },
        })
    }
})

authRouter.post('/forgot-password', forgotPasswordValidations, async (req, res) => {
    if (!checkValidations(req, res)) return

    try {
        const { email } = req.body

        const sendGenericResponse = () =>
            res.status(200).send({
                success: true,
                statusCode: 200,
                body: {
                    text: 'Se este email estiver cadastrado, você receberá as instruções em breve.',
                },
            })

        const user = await User.findOne({ email })
        if (!user) return sendGenericResponse()

        await PasswordResetToken.deleteMany({ userId: user._id })

        const rawToken = crypto.randomBytes(32).toString('hex')
        const hashedToken = hashToken(rawToken)

        await PasswordResetToken.create({
            token: hashedToken,
            userId: user._id,
        })

        const resetUrl = process.env.FRONTEND_URL + 'reset-password?token=' + rawToken

        await sendPasswordResetEmail(user.email, resetUrl)

        return sendGenericResponse()
    } catch (error) {
        return res.status(500).send({
            success: false,
            statusCode: 500,
            body: { text: 'Erro interno no servidor', error: error.message },
        })
    }
})

authRouter.post('/reset-password', resetPasswordValidations, async (req, res) => {
    if (!checkValidations(req, res)) return

    try {
        const { token: rawToken, newPassword } = req.body
        const hashedToken = hashToken(rawToken)
        const resetRecord = await PasswordResetToken.findOne({ token: hashedToken })

        if (!resetRecord || resetRecord.used) {
            return res.status(400).send({
                success: false,
                statusCode: 400,
                body: { text: 'Token invalido ou expirado' },
            })
        }

        if (resetRecord.expiresAt < new Date()) {
            await PasswordResetToken.deleteOne({ _id: resetRecord._id })
            return res.status(400).send({
                success: false,
                statusCode: 400,
                body: { text: 'Token expirado. Solicite um novo link.' },
            })
        }

        resetRecord.used = true
        await resetRecord.save()

        const hashedPassword = await bcrypt.hash(newPassword, 12)
        await User.findByIdAndUpdate(resetRecord.userId, {
            $set: { password: hashedPassword },
        })
        await RefreshToken.deleteMany({ userId: resetRecord.userId })

        await PasswordResetToken.deleteOne({ _id: resetRecord._id })

        return res.status(200).send({
            success: true,
            statusCode: 200,
            body: { text: 'Senha redefinida com sucesso. Faça login com a nova senha.' },
        })
    } catch (error) {
        return res.status(500).send({
            success: false,
            statusCode: 500,
            body: { text: 'Erro interno no servidor', error: error.message },
        })
    }
})

export default authRouter
