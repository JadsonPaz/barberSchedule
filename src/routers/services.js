// src/routers/services.js
import express from 'express'
import ServicesControllers from '../controllers/services.js'
import { body, validationResult } from 'express-validator'
import User from '../models/user.js'

const servicesRouter = express.Router()
const servicesControllers = new ServicesControllers()

// ─── Validação customizada do barberId ───────────────────────────────────────

const validateBarberId = body('barberId')
    .notEmpty().withMessage('barberId é obrigatório')
    .isMongoId().withMessage('barberId inválido')
    .custom(async (id) => {
        const user = await User.findById(id)

        if (!user) {
            throw new Error('Barbeiro não encontrado')
        }
        if (user.role !== 'admin') {
            throw new Error('O usuário informado não é um barbeiro')
        }

        return true
    })

const validateBarberIdOptional = body('barberId')
    .optional()
    .isMongoId().withMessage('barberId inválido')
    .custom(async (id) => {
        const user = await User.findById(id)

        if (!user) {
            throw new Error('Barbeiro não encontrado')
        }
        if (user.role !== 'admin') {
            throw new Error('O usuário informado não é um barbeiro')
        }

        return true
    })

// ─── Validações ───────────────────────────────────────────────────────────────

const createValidations = [
    body('name').trim().notEmpty().withMessage('Nome é obrigatório'),

    body('description').optional({ values: 'falsy' }).trim().isString(),

    body('price')
        .notEmpty().withMessage('Preço é obrigatório')
        .isNumeric().withMessage('Preço deve ser um número')
        .custom(v => v >= 0).withMessage('Preço não pode ser negativo'),

    body('duration')
        .notEmpty().withMessage('Duração é obrigatória')
        .isInt({ min: 1 }).withMessage('Duração deve ser em minutos (mínimo 1)'),

    validateBarberId, // <-- validação completa com checagem no banco

    body('active').optional().isBoolean().withMessage('active deve ser true ou false'),
]

const updateValidations = [
    body('name').optional().trim().notEmpty().withMessage('Nome não pode ser vazio'),

    body('description').optional({ values: 'falsy' }).trim().isString(),

    body('price')
        .optional()
        .isNumeric().withMessage('Preço deve ser um número')
        .custom(v => v >= 0).withMessage('Preço não pode ser negativo'),

    body('duration')
        .optional()
        .isInt({ min: 1 }).withMessage('Duração deve ser em minutos (mínimo 1)'),

    validateBarberIdOptional, // <-- opcional mas também valida no banco

    body('active').optional().isBoolean().withMessage('active deve ser true ou false'),
]

// ─── Helper ───────────────────────────────────────────────────────────────────

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

// ─── Rotas ───────────────────────────────────────────────────────────────────

servicesRouter.get('/', async (req, res) => {
    const filters = {
        barberId: req.query.barberId,
        active: req.query.active !== undefined
            ? req.query.active === 'true'
            : undefined
    }
    const { success, statusCode, body } = await servicesControllers.getServices(filters)
    res.status(statusCode).send({ success, statusCode, body })
})

servicesRouter.get('/:id', async (req, res) => {
    const { success, statusCode, body } = await servicesControllers.getServiceById(req.params.id)
    res.status(statusCode).send({ success, statusCode, body })
})

servicesRouter.post('/', createValidations, async (req, res) => {
    if (!checkValidations(req, res)) return

    const { success, statusCode, body } = await servicesControllers.createService(req.body)
    res.status(statusCode).send({ success, statusCode, body })
})

servicesRouter.put('/:id', updateValidations, async (req, res) => {
    if (!checkValidations(req, res)) return

    const { success, statusCode, body } = await servicesControllers.updateService(req.params.id, req.body)
    res.status(statusCode).send({ success, statusCode, body })
})

servicesRouter.delete('/:id', async (req, res) => {
    const { success, statusCode, body } = await servicesControllers.deleteService(req.params.id)
    res.status(statusCode).send({ success, statusCode, body })
})

export default servicesRouter
