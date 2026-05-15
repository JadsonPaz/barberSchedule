// src/controllers/availability.js
import AvailabilityDataAccess from "../dataAccess/availability.js";
import { ok, notFound, serverError } from "../helpers/httpResponse.js";

export default class AvailabilityControllers {
    constructor() {
        this.dataAccess = new AvailabilityDataAccess()
    }

    async getAvailability(filters) {
        try {
            const result = await this.dataAccess.getAvailability(filters)
            return ok(result)
        } catch (error) {
            return serverError(error)
        }
    }

    async getAvailabilityById(availabilityId) {
        try {
            const result = await this.dataAccess.getAvailabilityById(availabilityId)
            if (!result) return notFound('Disponibilidade não encontrada')
            return ok(result)
        } catch (error) {
            return serverError(error)
        }
    }

    async createAvailability(availabilityData) {
        try {
            const result = await this.dataAccess.createAvailability(availabilityData)
            return { success: true, statusCode: 201, body: result }
        } catch (error) {
            return serverError(error)
        }
    }

    async updateAvailability(availabilityId, availabilityData) {
        try {
            const result = await this.dataAccess.updateAvailability(availabilityId, availabilityData)
            if (!result) return notFound('Disponibilidade não encontrada')
            return ok(result)
        } catch (error) {
            return serverError(error)
        }
    }

    async deleteAvailability(availabilityId) {
        try {
            const result = await this.dataAccess.deleteAvailability(availabilityId)
            if (!result) return notFound('Disponibilidade não encontrada')
            return ok(result)
        } catch (error) {
            return serverError(error)
        }
    }

    // Retorna os slots gerados de um availability específico
    async getSlots(availabilityId) {
        try {
            const availability = await this.dataAccess.getAvailabilityById(availabilityId)
            if (!availability) return notFound('Disponibilidade não encontrada')

            const slots = this.dataAccess.generateSlots({
                startTime: availability.startTime,
                endTime: availability.endTime,
                slotDuration: availability.slotDuration,
            })

            return ok({ availability, slots })
        } catch (error) {
            return serverError(error)
        }
    }
}