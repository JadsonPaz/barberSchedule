// src/routers/users.js
import express from 'express'
import UsersControllers from '../controllers/users.js'
import { body, validationResult } from 'express-validator'
import { upload } from '../config/cloudinary.js'
import {
    authenticateToken,
    requireAdmin,
    requireSelfOrAdmin
} from '../middlewares/auth.middleware.js'

const usersRouter = express.Router()
const usersControllers = new UsersControllers()

// ─── Validações ────────────────────────────────────────────────────────────────

const profileValidations = [
    body('fullname')
        .optional()
        .trim()
        .isLength({ min: 3 }).withMessage('Nome deve ter ao menos 3 caracteres'),

    body('email')
        .optional()
        .trim()
        .isEmail().withMessage('E-mail inválido'),
]

const passwordValidations = [
    body('currentPassword')
        .notEmpty().withMessage('Senha atual é obrigatória'),

    body('newPassword')
        .notEmpty().withMessage('Nova senha é obrigatória')
        .isLength({ min: 6 }).withMessage('Nova senha deve ter ao menos 6 caracteres'),
]

const roleValidation = [
    body('role')
        .notEmpty().withMessage('Role é obrigatória')
        .isIn(['user', 'admin']).withMessage('Role inválida'),
]

function checkValidations(req, res) {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        res.status(400).send({
            success: false,
            statusCode: 400,
            body: { text: 'Erro de validação', errors: errors.array() }
        })
        return false
    }
    return true
}

// GET /users/barbers - listar barbeiros para agendamento (usuario autenticado)
usersRouter.get(
    '/barbers',
    authenticateToken,
    async (req, res) => {
        const { success, statusCode, body } = await usersControllers.getBarbers()
        res.status(statusCode).send({ success, statusCode, body })
    }
)

// ─── Rotas Admin ───────────────────────────────────────────────────────────────

// GET /users — listar todos (admin)
usersRouter.get(
    '/',
    authenticateToken,
    requireAdmin,
    async (req, res) => {
        const { success, statusCode, body } = await usersControllers.getUsers()
        res.status(statusCode).send({ success, statusCode, body })
    }
)

// DELETE /users/:id — remover usuário (admin)
usersRouter.delete(
    '/:id',
    authenticateToken,
    requireAdmin,
    async (req, res) => {
        const { success, statusCode, body } = await usersControllers.deleteUser(req.params.id)
        res.status(statusCode).send({ success, statusCode, body })
    }
)

// PATCH /users/:id/role — alterar role (admin)
usersRouter.patch(
    '/:id/role',
    authenticateToken,
    requireAdmin,
    roleValidation,
    async (req, res) => {
        if (!checkValidations(req, res)) return
        const { success, statusCode, body } = await usersControllers.updateRole(
            req.params.id,
            req.body.role
        )
        res.status(statusCode).send({ success, statusCode, body })
    }
)

// ─── Rotas do próprio usuário ──────────────────────────────────────────────────

// PATCH /users/:id/profile — atualizar nome/email (próprio usuário ou admin)
usersRouter.patch(
    '/:id/profile',
    authenticateToken,
    requireSelfOrAdmin,
    profileValidations,
    async (req, res) => {
        if (!checkValidations(req, res)) return

        // Garante que dados sensíveis não sejam alterados por aqui
        const { fullname, email } = req.body
        const { success, statusCode, body } = await usersControllers.updateProfile(
            req.params.id,
            { fullname, email }
        )
        res.status(statusCode).send({ success, statusCode, body })
    }
)

// PATCH /users/:id/password — trocar senha com confirmação da senha atual
usersRouter.patch(
    '/:id/password',
    authenticateToken,
    requireSelfOrAdmin,
    passwordValidations,
    async (req, res) => {
        if (!checkValidations(req, res)) return

        const { currentPassword, newPassword } = req.body
        const { success, statusCode, body } = await usersControllers.updatePassword(
            req.params.id,
            currentPassword,
            newPassword
        )
        res.status(statusCode).send({ success, statusCode, body })
    }
)

// PATCH /users/:id/avatar — atualizar foto de perfil (próprio usuário ou admin)
usersRouter.patch(
    '/:id/avatar',
    authenticateToken,
    requireSelfOrAdmin,
    (req, res, next) => {
        upload.single('avatar')(req, res, (err) => {
            if (err) {
                console.error('Erro no multer/cloudinary:', err.message, err)
                return res.status(500).send({ error: err.message })
            }
            next()
        })
    },
    async (req, res) => {
        const { success, statusCode, body } = await usersControllers.updateAvatar(
            req.params.id,
            req.file
        )
        res.status(statusCode).send({ success, statusCode, body })
    }
)

export default usersRouter
