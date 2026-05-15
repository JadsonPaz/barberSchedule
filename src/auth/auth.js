// src/auth/auth.js
import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'            // nativo do Node — sem instalação
import { body, validationResult } from 'express-validator'
import User from '../models/user.js'
import PasswordResetToken from '../models/passwordResetToken.js'
import { sendPasswordResetEmail } from '../services/email.service.js'

const authRouter = express.Router()

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// Só o hash sha256 fica no banco — o token bruto vai no email
function hashToken(rawToken) {
    return crypto.createHash('sha256').update(rawToken).digest('hex')
}

// ─── Validações ───────────────────────────────────────────────────────────────

const signupValidations = [
    body('fullname')
        .trim()
        .notEmpty().withMessage('Nome completo é obrigatório')
        .isLength({ min: 3 }).withMessage('Nome deve ter ao menos 3 caracteres'),
    body('email')
        .trim()
        .notEmpty().withMessage('E-mail é obrigatório')
        .isEmail().withMessage('E-mail inválido'),
    body('password')
        .notEmpty().withMessage('Senha é obrigatória')
        .isLength({ min: 6 }).withMessage('Senha deve ter ao menos 6 caracteres'),
]

const loginValidations = [
    body('email').trim().notEmpty().isEmail().withMessage('E-mail inválido'),
    body('password').notEmpty().withMessage('Senha é obrigatória'),
]

const forgotPasswordValidations = [
    body('email')
        .trim()
        .notEmpty().withMessage('E-mail é obrigatório')
        .isEmail().withMessage('E-mail inválido'),
]

const resetPasswordValidations = [
    body('token')
        .notEmpty().withMessage('Token é obrigatório'),
    body('newPassword')
        .notEmpty().withMessage('Nova senha é obrigatória')
        .isLength({ min: 6 }).withMessage('Nova senha deve ter ao menos 6 caracteres'),
]

// ─── POST /auth/signup ────────────────────────────────────────────────────────

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

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        )

        return res.status(201).send({
            success: true,
            statusCode: 201,
            body: { text: 'Usuário cadastrado com sucesso', user, token },
        })
    } catch (error) {
        return res.status(500).send({
            success: false,
            statusCode: 500,
            body: { text: 'Erro interno no servidor', error: error.message },
        })
    }
})

// ─── POST /auth/login ─────────────────────────────────────────────────────────

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

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        )

        const safeUser = await User.findById(user._id)
        return res.status(200).send({
            success: true,
            statusCode: 200,
            body: { text: 'Login realizado com sucesso', user: safeUser, token },
        })
    } catch (error) {
        return res.status(500).send({
            success: false,
            statusCode: 500,
            body: { text: 'Erro interno no servidor', error: error.message },
        })
    }
})

// ─── POST /auth/forgot-password ───────────────────────────────────────────────

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

        // Invalida qualquer token anterior do mesmo usuário
        await PasswordResetToken.deleteMany({ userId: user._id })

        // Token bruto (vai no email) e hash (fica no banco)
        const rawToken = crypto.randomBytes(32).toString('hex')
        const hashedToken = hashToken(rawToken)

        await PasswordResetToken.create({
            token: hashedToken,
            userId: user._id,
            // expiresAt: default de 15 min definido no model
        })

        // Monte a URL com o token bruto na query string
        const resetUrl = `${process.env.FRONTEND_URL}reset-password?token=${rawToken}`

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

// ─── POST /auth/reset-password ────────────────────────────────────────────────

authRouter.post('/reset-password', resetPasswordValidations, async (req, res) => {
    if (!checkValidations(req, res)) return

    try {
        const { token: rawToken, newPassword } = req.body

        // Hasheia para buscar no banco (nunca armazenamos o token bruto)
        const hashedToken = hashToken(rawToken)

        const resetRecord = await PasswordResetToken.findOne({ token: hashedToken })

        // Documento inexistente = token inválido ou TTL já expirou e deletou
        if (!resetRecord || resetRecord.used) {
            return res.status(400).send({
                success: false,
                statusCode: 400,
                body: { text: 'Token inválido ou expirado' },
            })
        }

        // Verificação manual de expiração (defesa em profundidade além do TTL)
        if (resetRecord.expiresAt < new Date()) {
            await PasswordResetToken.deleteOne({ _id: resetRecord._id })
            return res.status(400).send({
                success: false,
                statusCode: 400,
                body: { text: 'Token expirado. Solicite um novo link.' },
            })
        }

        // Marca como usado ANTES de salvar a nova senha.
        // Evita race condition: dois requests simultâneos com o mesmo token.
        resetRecord.used = true
        await resetRecord.save()

        // Atualiza a senha no banco
        const hashedPassword = await bcrypt.hash(newPassword, 12)
        await User.findByIdAndUpdate(resetRecord.userId, {
            $set: { password: hashedPassword },
        })

        // Limpeza proativa do token (o TTL faria isso eventualmente de qualquer forma)
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
