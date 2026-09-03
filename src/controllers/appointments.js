import Appointments from "../dataAccess/appointments.js";
import { conflict, ok, notFound, serverError } from "../helpers/httpResponse.js";
import {
    notifyBarberAppointmentCancelled,
    notifyBarberAppointmentCreated,
} from "../services/pushNotification.service.js";

export default class AppointmentsControllers {
    constructor() {
        this.dataAccess = new Appointments();
    }

    async getAppointments(filters) {
        try {
            const result = await this.dataAccess.getAppointments(filters);
            return ok(result);
        } catch (error) {
            return serverError(error);
        }
    }

    async getAppointmentById(appointmentId) {
        try {
            const result = await this.dataAccess.getAppointmentById(appointmentId);
            if (!result) return notFound("Agendamento não encontrado");
            return ok(result);
        } catch (error) {
            return serverError(error);
        }
    }

    async createAppointment(appointmentData) {
        try {
            const result = await this.dataAccess.createAppointment(appointmentData);
            notifyBarberAppointmentCreated(result._id).catch((error) => {
                console.error("Erro ao notificar novo agendamento:", error);
            });
            return { success: true, statusCode: 201, body: result };
        } catch (error) {
            if (error.code === "APPOINTMENT_CONFLICT") {
                return conflict(error.message, error.details);
            }
            if (error.code === "AVAILABILITY_CONFLICT") {
                return conflict(error.message, error.details);
            }
            if (error.code === "BLOCKED_SLOT_CONFLICT") {
                return conflict(error.message, error.details);
            }
            return serverError(error);
        }
    }

    async updateAppointment(appointmentId, appointmentData) {
        try {
            const result = await this.dataAccess.updateAppointment(appointmentId, appointmentData);
            if (!result) return notFound("Agendamento não encontrado");
            return ok(result);
        } catch (error) {
            if (error.code === "APPOINTMENT_CONFLICT") {
                return conflict(error.message, error.details);
            }
            if (error.code === "AVAILABILITY_CONFLICT") {
                return conflict(error.message, error.details);
            }
            if (error.code === "BLOCKED_SLOT_CONFLICT") {
                return conflict(error.message, error.details);
            }
            return serverError(error);
        }
    }

    async deleteAppointment(appointmentId, requester) {
        try {
            const result = await this.dataAccess.deleteAppointment(appointmentId);
            if (!result) return notFound("Agendamento não encontrado");
            if (requester?.role !== "admin") {
                notifyBarberAppointmentCancelled(result._id).catch((error) => {
                    console.error("Erro ao notificar cancelamento de agendamento:", error);
                });
            }
            return ok(result);
        } catch (error) {
            return serverError(error);
        }
    }
}
