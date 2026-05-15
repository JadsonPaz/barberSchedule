// src/routers/blockedSlots.js
import express from 'express'
import BlockedSlotsControllers from '../controllers/blockedSlots.js'
import { body, validationResult } from 'express-validator'
import User from '../models/User.js'

const blockedSlotsRouter = express.Router()
const blockedSlotsControllers = new BlockedSlotsControllers()

// ─── Validação do barberId ────────────────────────────────────────────────────

const validateBarberId = body('barberId')
    .notEmpty().withMessage('barberId é obrigatório')
    .isMongoId().withMessage('barberId inválido')
    .custom(async (id) => {
        const user = await User.findById(id)
        if (!user) throw new Error('Barbeiro não encontrado')
        if (user.role !== 'admin') throw new Error('O usuário informado não é um barbeiro')
        return true
    })

const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/

// ─── Validações ───────────────────────────────────────────────────────────────

const createValidations = [
    validateBarberId,

    // Deve ter date OU weekday, não os dois, não nenhum
    body('date')
        .optional()
        .isISO8601().withMessage('Formato de data inválido (use YYYY-MM-DD)')
        .custom((date, { req }) => {
            if (date && req.body.weekday !== undefined) {
                throw new Error('Envie date OU weekday, não os dois')
            }
            return true
        }),

    body('weekday')
        .optional()
        .isInt({ min: 0, max: 6 }).withMessage('weekday deve ser 0 (domingo) a 6 (sábado)')
        .custom((weekday, { req }) => {
            if (weekday !== undefined && req.body.date) {
                throw new Error('Envie date OU weekday, não os dois')
            }
            if (weekday !== undefined && req.body.isFullDay) {
                throw new Error('isFullDay só pode ser usado com date, não com weekday')
            }
            return true
        }),

    body('isFullDay')
        .optional()
        .isBoolean().withMessage('isFullDay deve ser true ou false')
        .custom((isFullDay, { req }) => {
            if (isFullDay && req.body.weekday !== undefined) {
                throw new Error('isFullDay só pode ser usado com date, não com weekday')
            }
            return true
        }),

    // startTime e endTime são obrigatórios quando não é dia inteiro
    body('startTime')
        .if(body('isFullDay').not().equals('true'))
        .if((value, { req }) => !req.body.isFullDay)
        .custom((value, { req }) => {
            if (!req.body.isFullDay && !value) {
                throw new Error('startTime é obrigatório quando não é dia inteiro')
            }
            if (value && !timeRegex.test(value)) {
                throw new Error('Formato inválido (use HH:MM)')
            }
            return true
        }),

    body('endTime')
        .custom((value, { req }) => {
            if (!req.body.isFullDay && !value) {
                throw new Error('endTime é obrigatório quando não é dia inteiro')
            }
            if (value && !timeRegex.test(value)) {
                throw new Error('Formato inválido (use HH:MM)')
            }
            if (value && req.body.startTime && value <= req.body.startTime) {
                throw new Error('endTime deve ser maior que startTime')
            }
            return true
        }),

    body('reason').optional().isString(),
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

    body('date').optional()
        .isISO8601().withMessage('Formato de data inválido (use YYYY-MM-DD)'),

    body('weekday').optional()
        .isInt({ min: 0, max: 6 }).withMessage('weekday deve ser 0 a 6'),

    body('isFullDay').optional()
        .isBoolean().withMessage('isFullDay deve ser true ou false'),

    body('startTime').optional()
        .matches(timeRegex).withMessage('Formato inválido (use HH:MM)'),

    body('endTime').optional()
        .matches(timeRegex).withMessage('Formato inválido (use HH:MM)')
        .custom((endTime, { req }) => {
            if (req.body.startTime && endTime <= req.body.startTime) {
                throw new Error('endTime deve ser maior que startTime')
            }
            return true
        }),

    body('reason').optional().isString(),
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

// GET /blocked-slots?barberId=...&date=...&weekday=...&dateFrom=...&dateTo=...
blockedSlotsRouter.get('/', async (req, res) => {
    const filters = {
        barberId: req.query.barberId,
        date:     req.query.date,
        weekday:  req.query.weekday !== undefined ? Number(req.query.weekday) : undefined,
        dateFrom: req.query.dateFrom,
        dateTo:   req.query.dateTo,
    }
    const { success, statusCode, body } = await blockedSlotsControllers.getBlockedSlots(filters)
    res.status(statusCode).send({ success, statusCode, body })
})

// GET /blocked-slots/date?barberId=...&date=...  →  todos que afetam aquele dia
blockedSlotsRouter.get('/date', async (req, res) => {
    const { barberId, date } = req.query

    if (!barberId || !date) {
        return res.status(400).send({
            success: false,
            statusCode: 400,
            body: { text: 'barberId e date são obrigatórios' }
        })
    }

    const { success, statusCode, body } = await blockedSlotsControllers.getBlockedSlotsForDate(barberId, date)
    res.status(statusCode).send({ success, statusCode, body })
})

// GET /blocked-slots/:id
blockedSlotsRouter.get('/:id', async (req, res) => {
    const { success, statusCode, body } = await blockedSlotsControllers.getBlockedSlotById(req.params.id)
    res.status(statusCode).send({ success, statusCode, body })
})

// POST /blocked-slots
blockedSlotsRouter.post('/', createValidations, async (req, res) => {
    if (!checkValidations(req, res)) return

    const { success, statusCode, body } = await blockedSlotsControllers.createBlockedSlot(req.body)
    res.status(statusCode).send({ success, statusCode, body })
})

// PUT /blocked-slots/:id
blockedSlotsRouter.put('/:id', updateValidations, async (req, res) => {
    if (!checkValidations(req, res)) return

    const { success, statusCode, body } = await blockedSlotsControllers.updateBlockedSlot(req.params.id, req.body)
    res.status(statusCode).send({ success, statusCode, body })
})

// DELETE /blocked-slots/:id
blockedSlotsRouter.delete('/:id', async (req, res) => {
    const { success, statusCode, body } = await blockedSlotsControllers.deleteBlockedSlot(req.params.id)
    res.status(statusCode).send({ success, statusCode, body })
})

export default blockedSlotsRouter