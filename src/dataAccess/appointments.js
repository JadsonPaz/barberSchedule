import Appointment from "../models/appointments.js";
import AvailabilityDataAccess from "./availability.js";
import BlockedSlotsDataAccess from "./blockedSlots.js";

const availabilityDA = new AvailabilityDataAccess();
const blockedSlotsDA = new BlockedSlotsDataAccess();

function buildAvailabilityError(barberId, date, time) {
    const error = new Error("Horário fora do período de atendimento do barbeiro");
    error.code = "AVAILABILITY_CONFLICT";
    error.details = { barberId, date, time };
    return error;
}

function buildBlockedSlotError(barberId, date, time) {
    const error = new Error("Horário está bloqueado para este barbeiro");
    error.code = "BLOCKED_SLOT_CONFLICT";
    error.details = { barberId, date, time };
    return error;
}

function buildConflictError(conflictingAppointment) {
    const error = new Error("Horário indisponível para este barbeiro");
    error.code = "APPOINTMENT_CONFLICT";
    error.details = {
        conflictingAppointmentId: conflictingAppointment._id,
        barberId: conflictingAppointment.barberId,
        date: conflictingAppointment.date,
        time: conflictingAppointment.time,
    };
    return error;
}

export default class Appointments {
    async getAppointments(filters = {}) {
        const query = {};

        if (filters.userId) query.userId = filters.userId;
        if (filters.barberId) query.barberId = filters.barberId;

        const result = await Appointment.find(query)
            .populate("userId", "fullname email avatarUrl")
            .populate("barberId", "fullname email avatarUrl")
            .populate("serviceId", "name price")
            .sort({ date: 1, time: 1 });

        return result;
    }

    async getAppointmentById(appointmentId) {
        const result = await Appointment.findById(appointmentId)
            .populate("userId", "fullname email avatarUrl")
            .populate("barberId", "fullname email avatarUrl")
            .populate("serviceId", "name price");

        return result;
    }

    async findAvailabilityConflict({ appointmentId, barberId, date, time }) {
        if (!barberId || !date || !time) return null;

        const query = {
            barberId,
            date,
            time,
            status: { $ne: "cancelled" },
        };

        if (appointmentId) {
            query._id = { $ne: appointmentId };
        }

        return Appointment.findOne(query);
    }

    // Valida se o horário está dentro do availability do barbeiro
    async validateAvailability({ barberId, date, time }) {
        if (!barberId || !date || !time) return;

        // Converte a data para obter o dia da semana (0 = domingo, 1 = segunda, etc.)
        const appointmentDate = new Date(date);
        const weekday = appointmentDate.getDay();

        // Busca availability para esse barbeiro nesse dia da semana
        const availabilities = await availabilityDA.getAvailability({
            barberId,
            weekday,
        });

        if (!availabilities || availabilities.length === 0) {
            throw buildAvailabilityError(barberId, date, time);
        }

        // Verifica se o horário está dentro de algum período de disponibilidade
        const timeMinutes = this.timeToMinutes(time);
        let isAvailable = false;

        for (const avail of availabilities) {
            const startMinutes = this.timeToMinutes(avail.startTime);
            const endMinutes = this.timeToMinutes(avail.endTime);

            if (timeMinutes >= startMinutes && timeMinutes < endMinutes) {
                isAvailable = true;
                break;
            }
        }

        if (!isAvailable) {
            throw buildAvailabilityError(barberId, date, time);
        }
    }

    // Valida se o horário não está bloqueado (blockedSlots)
    async validateBlockedSlots({ barberId, date, time }) {
        if (!barberId || !date || !time) return;

        const dateOnly = date instanceof Date
            ? date.toISOString().split('T')[0]
            : String(date).split('T')[0];

        const blockedSlots = await blockedSlotsDA.getBlockedSlotsForDate(barberId, dateOnly);

        if (!blockedSlots || blockedSlots.length === 0) return;

        const timeMinutes = this.timeToMinutes(time);

        for (const blocked of blockedSlots) {
            if (blocked.isFullDay) {
                throw buildBlockedSlotError(barberId, date, time);
            }

            if (!blocked.startTime || !blocked.endTime) {
                continue;
            }

            const startMinutes = this.timeToMinutes(blocked.startTime);
            const endMinutes = this.timeToMinutes(blocked.endTime);

            // Verifica se o horário está dentro de um período bloqueado
            if (timeMinutes >= startMinutes && timeMinutes < endMinutes) {
                throw buildBlockedSlotError(barberId, date, time);
            }
        }
    }

    // Converte string "HH:MM" para minutos
    timeToMinutes(time) {
        const [hours, minutes] = time.split(":").map(Number);
        return hours * 60 + minutes;
    }

    async ensureAvailability({ appointmentId, barberId, date, time, status }) {
        if (status === "cancelled") return;

        // 1. Verifica se o horário está dentro do availability do barbeiro
        await this.validateAvailability({ barberId, date, time });

        // 2. Verifica se o horário não está bloqueado
        await this.validateBlockedSlots({ barberId, date, time });

        // 3. Verifica conflito com outros appointments
        const conflictingAppointment = await this.findAvailabilityConflict({
            appointmentId,
            barberId,
            date,
            time,
        });

        if (conflictingAppointment) {
            throw buildConflictError(conflictingAppointment);
        }
    }

    async createAppointment(appointmentData) {
        // Normaliza a data para meio-dia UTC antes de salvar
        // Isso evita que conversões de fuso mudem o dia
        if (appointmentData.date) {
            const dateOnly = appointmentData.date.split('T')[0]; // pega só "YYYY-MM-DD"
            appointmentData.date = new Date(`${dateOnly}T12:00:00.000Z`);
        }

        await this.ensureAvailability({
            barberId: appointmentData.barberId,
            date: appointmentData.date,
            time: appointmentData.time,
            status: appointmentData.status,
        });

        const result = await Appointment.create(appointmentData);
        return result;
    }

    async updateAppointment(appointmentId, appointmentData) {
        if (appointmentData.date) {
            const dateOnly = typeof appointmentData.date === 'string'
                ? appointmentData.date.split('T')[0]
                : appointmentData.date.toISOString().split('T')[0];
            appointmentData.date = new Date(`${dateOnly}T12:00:00.000Z`);
        }
        const currentAppointment = await Appointment.findById(appointmentId);
        if (!currentAppointment) return null;

        const nextAppointmentData = {
            barberId: appointmentData.barberId ?? currentAppointment.barberId,
            date: appointmentData.date ?? currentAppointment.date,
            time: appointmentData.time ?? currentAppointment.time,
            status: appointmentData.status ?? currentAppointment.status,
        };

        await this.ensureAvailability({
            appointmentId,
            ...nextAppointmentData,
        });

        const result = await Appointment.findByIdAndUpdate(
            appointmentId,
            { $set: appointmentData },
            { new: true }
        );

        return result;
    }

    async deleteAppointment(appointmentId) {
        const result = await Appointment.findByIdAndUpdate(
            appointmentId,
            { $set: { status: "cancelled" } },
            { new: true }
        );
        return result;
    }
}
