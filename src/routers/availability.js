// src/routers/availability.js
import express from 'express'
import AvailabilityControllers from '../controllers/availability.js'
import { body, query, validationResult } from 'express-validator'
import User from '../models/user.js'

const availabilityRouter = express.Router()
const availabilityControllers = new AvailabilityControllers()

// ─── Validação customizada do barberId ───────────────────────────────────────

const validateBarberId = body('barberId')
    .notEmpty().withMessage('barberId é obrigatório')
    .isMongoId().withMessage('barberId inválido')
    .custom(async (id) => {
        const user = await User.findById(id)
        if (!user) throw new Error('Barbeiro não encontrado')
        if (user.role !== 'admin') throw new Error('O usuário informado não é um barbeiro')
        return true
    })

// ─── Validações ───────────────────────────────────────────────────────────────

const weekdayMap = {
    domingo: 0, segunda: 1, terca: 2, quarta: 3,
    quinta: 4, sexta: 5, sabado: 6
}

// Aceita 0-6 ou "segunda", "terca"...
function parseWeekday(value) {
    if (!isNaN(value)) return Number(value)
    return weekdayMap[value.toLowerCase()] ?? null
}

const createValidations = [
    validateBarberId,

    body('weekday')
        .notEmpty().withMessage('Dia da semana é obrigatório')
        .custom((value) => {
            const parsed = parseWeekday(value)
            if (parsed === null || parsed < 0 || parsed > 6) {
                throw new Error('Dia da semana inválido (use 0-6 ou "segunda", "terca"...)')
            }
            return true
        }),

    body('startTime')
        .notEmpty().withMessage('Horário de início é obrigatório')
        .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Formato inválido (use HH:MM)'),

    body('endTime')
        .notEmpty().withMessage('Horário de término é obrigatório')
        .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Formato inválido (use HH:MM)')
        .custom((endTime, { req }) => {
            if (endTime <= req.body.startTime) {
                throw new Error('endTime deve ser maior que startTime')
            }
            return true
        }),

    body('slotDuration')
        .optional()
        .isInt({ min: 5 }).withMessage('slotDuration deve ser em minutos (mínimo 5)'),
]

const updateValidations = [
    body('barberId').optional()
        .isMongoId().withMessage('barberId inválido')
        .custom(async (id) => {
            const user = await User.findById(id)
            if (!user) throw new Error('Barbeiro não encontrado')
            if (user.role !== 'admin') throw new Error('O usuário informado não é um barbeiro')
            return true
        }),

    body('weekday').optional()
        .custom((value) => {
            const parsed = parseWeekday(value)
            if (parsed === null || parsed < 0 || parsed > 6) {
                throw new Error('Dia da semana inválido (use 0-6 ou "segunda", "terca"...)')
            }
            return true
        }),

    body('startTime').optional()
        .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Formato inválido (use HH:MM)'),

    body('endTime').optional()
        .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Formato inválido (use HH:MM)')
        .custom((endTime, { req }) => {
            if (req.body.startTime && endTime <= req.body.startTime) {
                throw new Error('endTime deve ser maior que startTime')
            }
            return true
        }),

    body('slotDuration').optional()
        .isInt({ min: 5 }).withMessage('slotDuration deve ser em minutos (mínimo 5)'),
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

// ─── Rotas ───────────────────────────────────────────────────────────────────

// GET /availability?barberId=...&weekday=...
availabilityRouter.get('/', async (req, res) => {
    const filters = {
        barberId: req.query.barberId,
        weekday: req.query.weekday !== undefined
            ? parseWeekday(req.query.weekday)
            : undefined
    }
    const { success, statusCode, body } = await availabilityControllers.getAvailability(filters)
    res.status(statusCode).send({ success, statusCode, body })
})

// GET /availability/:id
availabilityRouter.get('/:id', async (req, res) => {
    const { success, statusCode, body } = await availabilityControllers.getAvailabilityById(req.params.id)
    res.status(statusCode).send({ success, statusCode, body })
})

// GET /availability/:id/slots  →  retorna os horários gerados
availabilityRouter.get('/:id/slots', async (req, res) => {
    const { success, statusCode, body } = await availabilityControllers.getSlots(req.params.id)
    res.status(statusCode).send({ success, statusCode, body })
})

// POST /availability
availabilityRouter.post('/', createValidations, async (req, res) => {
    if (!checkValidations(req, res)) return

    // Converte weekday para número antes de salvar
    req.body.weekday = parseWeekday(req.body.weekday)

    const { success, statusCode, body } = await availabilityControllers.createAvailability(req.body)
    res.status(statusCode).send({ success, statusCode, body })
})

// PUT /availability/:id
availabilityRouter.put('/:id', updateValidations, async (req, res) => {
    if (!checkValidations(req, res)) return

    if (req.body.weekday !== undefined) {
        req.body.weekday = parseWeekday(req.body.weekday)
    }

    const { success, statusCode, body } = await availabilityControllers.updateAvailability(req.params.id, req.body)
    res.status(statusCode).send({ success, statusCode, body })
})

// DELETE /availability/:id
availabilityRouter.delete('/:id', async (req, res) => {
    const { success, statusCode, body } = await availabilityControllers.deleteAvailability(req.params.id)
    res.status(statusCode).send({ success, statusCode, body })
})

export default availabilityRouter