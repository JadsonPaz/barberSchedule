// src/dataAccess/availability.js
import Availability from "../models/availability.js";

export default class AvailabilityDataAccess {

    async getAvailability(filters = {}) {
        const query = {}

        if (filters.barberId) query.barberId = filters.barberId
        if (filters.weekday !== undefined) query.weekday = filters.weekday

        const result = await Availability.find(query)
            .populate('barberId', 'fullname email')
            .sort({ weekday: 1, startTime: 1 })

        return result
    }

    async getAvailabilityById(availabilityId) {
        const result = await Availability.findById(availabilityId)
            .populate('barberId', 'fullname email')

        return result
    }

    async createAvailability(availabilityData) {
        const result = await Availability.create(availabilityData)
        return result
    }

    async updateAvailability(availabilityId, availabilityData) {
        const result = await Availability.findByIdAndUpdate(
            availabilityId,
            { $set: availabilityData },
            { new: true }
        )
        return result
    }

    async deleteAvailability(availabilityId) {
        const result = await Availability.findByIdAndDelete(availabilityId)
        return result
    }

    // Gera os slots de horário com base no startTime, endTime e slotDuration
    generateSlots({ startTime, endTime, slotDuration }) {
        const slots = []

        const [startHour, startMin] = startTime.split(':').map(Number)
        const [endHour, endMin] = endTime.split(':').map(Number)

        let current = startHour * 60 + startMin
        const end = endHour * 60 + endMin

        while (current + slotDuration <= end) {
            const h = String(Math.floor(current / 60)).padStart(2, '0')
            const m = String(current % 60).padStart(2, '0')
            slots.push(`${h}:${m}`)
            current += slotDuration
        }

        return slots
    }
}