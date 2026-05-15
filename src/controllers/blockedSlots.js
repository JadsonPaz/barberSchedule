// src/controllers/blockedSlots.js
import BlockedSlotsDataAccess from "../dataAccess/blockedSlots.js";
import { ok, notFound, serverError } from "../helpers/httpResponse.js";

export default class BlockedSlotsControllers {
    constructor() {
        this.dataAccess = new BlockedSlotsDataAccess()
    }

    async getBlockedSlots(filters) {
        try {
            const result = await this.dataAccess.getBlockedSlots(filters)
            return ok(result)
        } catch (error) {
            return serverError(error)
        }
    }

    async getBlockedSlotById(blockedSlotId) {
        try {
            const result = await this.dataAccess.getBlockedSlotById(blockedSlotId)
            if (!result) return notFound('Bloqueio não encontrado')
            return ok(result)
        } catch (error) {
            return serverError(error)
        }
    }

    // Rota útil pro frontend: "quais bloqueios afetam esse dia?"
    async getBlockedSlotsForDate(barberId, date) {
        try {
            const result = await this.dataAccess.getBlockedSlotsForDate(barberId, date)
            return ok(result)
        } catch (error) {
            return serverError(error)
        }
    }

    async createBlockedSlot(blockedSlotData) {
        try {
            const result = await this.dataAccess.createBlockedSlot(blockedSlotData)
            return { success: true, statusCode: 201, body: result }
        } catch (error) {
            return serverError(error)
        }
    }

    async updateBlockedSlot(blockedSlotId, blockedSlotData) {
        try {
            const result = await this.dataAccess.updateBlockedSlot(blockedSlotId, blockedSlotData)
            if (!result) return notFound('Bloqueio não encontrado')
            return ok(result)
        } catch (error) {
            return serverError(error)
        }
    }

    async deleteBlockedSlot(blockedSlotId) {
        try {
            const result = await this.dataAccess.deleteBlockedSlot(blockedSlotId)
            if (!result) return notFound('Bloqueio não encontrado')
            return ok(result)
        } catch (error) {
            return serverError(error)
        }
    }
}