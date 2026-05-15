// src/controllers/services.js
import Services from "../dataAccess/services.js";
import { ok, notFound, serverError } from "../helpers/httpResponse.js";

export default class ServicesControllers {
    constructor() {
        this.dataAccess = new Services()
    }

    async getServices(filters) {
        try {
            const result = await this.dataAccess.getServices(filters)
            return ok(result)
        } catch (error) {
            return serverError(error)
        }
    }

    async getServiceById(serviceId) {
        try {
            const result = await this.dataAccess.getServiceById(serviceId)
            if (!result) return notFound('Serviço não encontrado')
            return ok(result)
        } catch (error) {
            return serverError(error)
        }
    }

    async createService(serviceData) {
        try {
            const result = await this.dataAccess.createService(serviceData)
            return { success: true, statusCode: 201, body: result }
        } catch (error) {
            return serverError(error)
        }
    }

    async updateService(serviceId, serviceData) {
        try {
            const result = await this.dataAccess.updateService(serviceId, serviceData)
            if (!result) return notFound('Serviço não encontrado')
            return ok(result)
        } catch (error) {
            return serverError(error)
        }
    }

    async deleteService(serviceId) {
        try {
            const result = await this.dataAccess.deleteService(serviceId)
            if (!result) return notFound('Serviço não encontrado')
            return ok(result)
        } catch (error) {
            return serverError(error)
        }
    }
}