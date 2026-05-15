// src/dataAccess/blockedSlots.js
import BlockedSlot from "../models/blockedSlots.js";

function getDateOnly(value) {
    if (!value) return null

    if (value instanceof Date) {
        return value.toISOString().split('T')[0]
    }

    return String(value).split('T')[0]
}

function getLocalDateRange(value) {
    const dateOnly = getDateOnly(value)
    const [year, month, day] = dateOnly.split('-').map(Number)

    return {
        start: new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0)),
        end: new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999)),
    }
}

function getWeekdayFromDate(value) {
    const dateOnly = getDateOnly(value)
    const [year, month, day] = dateOnly.split('-').map(Number)

    return new Date(year, month - 1, day, 12, 0, 0, 0).getDay()
}

export default class BlockedSlotsDataAccess {

    async getBlockedSlots(filters = {}) {
        const query = {}

        if (filters.barberId) query.barberId = filters.barberId

        // Filtra só recorrentes
        if (filters.weekday !== undefined) {
            query.weekday = filters.weekday
        }

        // Filtra por data exata
        if (filters.date) {
            const { start, end } = getLocalDateRange(filters.date)
            query.date = { $gte: start, $lte: end }
        } else if (filters.dateFrom || filters.dateTo) {
            query.date = {}
            if (filters.dateFrom) query.date.$gte = new Date(filters.dateFrom)
            if (filters.dateTo)   query.date.$lte = new Date(filters.dateTo)
        }

        const result = await BlockedSlot.find(query)
            .populate('barberId', 'fullname email')
            .sort({ date: 1, weekday: 1, startTime: 1 })

        return result
    }

    async getBlockedSlotById(blockedSlotId) {
        const result = await BlockedSlot.findById(blockedSlotId)
            .populate('barberId', 'fullname email')

        return result
    }

    // Busca todos os bloqueios que afetam uma data específica
    // (pontuais naquele dia + recorrentes no weekday daquele dia)
    async getBlockedSlotsForDate(barberId, date) {
        const weekday = getWeekdayFromDate(date)
        const { start, end } = getLocalDateRange(date)

        const result = await BlockedSlot.find({
            barberId,
            $or: [
                { date: { $gte: start, $lte: end } }, // pontual naquele dia
                { weekday }                             // recorrente naquele weekday
            ]
        }).sort({ startTime: 1 })

        return result
    }

    async createBlockedSlot(blockedSlotData) {
        const result = await BlockedSlot.create(blockedSlotData)
        return result
    }

    async updateBlockedSlot(blockedSlotId, blockedSlotData) {
        const result = await BlockedSlot.findByIdAndUpdate(
            blockedSlotId,
            { $set: blockedSlotData },
            { new: true }
        )
        return result
    }

    async deleteBlockedSlot(blockedSlotId) {
        const result = await BlockedSlot.findByIdAndDelete(blockedSlotId)
        return result
    }
}
