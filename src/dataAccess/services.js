// src/dataAccess/services.js
import Service from "../models/services.js";

export default class Services {

    async getServices(filters = {}) {
        const query = {}

        if (filters.barberId) query.barberId = filters.barberId
        if (filters.active !== undefined) query.active = filters.active

        const result = await Service.find(query)
            .populate('barberId', 'fullname email')
            .sort({ name: 1 })

        return result
    }

    
    async getServiceById(serviceId) {
        const result = await Service.findById(serviceId)
            .populate('barberId', 'fullname email')

        return result
    }

    async createService(serviceData) {
        const result = await Service.create(serviceData)
        return result
    }

    async updateService(serviceId, serviceData) {
        const result = await Service.findByIdAndUpdate(
            serviceId,
            { $set: serviceData },
            { new: true }
        )
        return result
    }

    async deleteService(serviceId) {
        const result = await Service.findByIdAndDelete(serviceId)
        return result
    }
}