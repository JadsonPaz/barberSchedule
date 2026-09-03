import { Expo } from 'expo-server-sdk'
import Appointment from '../models/appointments.js'

const expo = new Expo(
    process.env.EXPO_ACCESS_TOKEN
        ? { accessToken: process.env.EXPO_ACCESS_TOKEN }
        : undefined
)

export function isValidExpoPushToken(token) {
    return Expo.isExpoPushToken(token)
}

function getAppointmentClientName(appointment) {
    return appointment.clientName
        || appointment.userId?.fullname
        || appointment.userId?.name
        || 'Cliente'
}

function formatAppointmentDate(date) {
    return new Date(date).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
    })
}

async function sendPushNotifications(tokens, notification) {
    const messages = tokens
        .filter((token) => Expo.isExpoPushToken(token))
        .map((token) => ({
            to: token,
            sound: 'default',
            priority: 'high',
            ...notification,
        }))

    if (messages.length === 0) return

    const chunks = expo.chunkPushNotifications(messages)

    for (const chunk of chunks) {
        try {
            const tickets = await expo.sendPushNotificationsAsync(chunk)
            console.log('Expo push tickets:', tickets)
        } catch (error) {
            console.error('Erro ao enviar notificacao push:', error)
        }
    }
}

async function getAppointmentForNotification(appointmentId) {
    return Appointment.findById(appointmentId)
        .populate('userId', 'fullname name')
        .populate('barberId', 'expoPushTokens')
        .populate('serviceId', 'name')
}

export async function notifyBarberAppointmentCreated(appointmentId) {
    const appointment = await getAppointmentForNotification(appointmentId)
    const tokens = appointment?.barberId?.expoPushTokens ?? []

    if (!appointment || tokens.length === 0) return

    const clientName = getAppointmentClientName(appointment)
    const date = formatAppointmentDate(appointment.date)

    await sendPushNotifications(tokens, {
        title: 'Novo agendamento',
        body: `${clientName} agendou às ${appointment.time} do dia ${date}`,
        data: {
            type: 'appointment_created',
            appointmentId: String(appointment._id),
        },
    })
}

export async function notifyBarberAppointmentCancelled(appointmentId) {
    const appointment = await getAppointmentForNotification(appointmentId)
    const tokens = appointment?.barberId?.expoPushTokens ?? []

    if (!appointment || tokens.length === 0) return

    const clientName = getAppointmentClientName(appointment)
    const date = formatAppointmentDate(appointment.date)

    await sendPushNotifications(tokens, {
        title: 'Agendamento cancelado',
        body: `${clientName} cancelou o agendamento para o dia ${date}`,
        data: {
            type: 'appointment_cancelled',
            appointmentId: String(appointment._id),
        },
    })
}
