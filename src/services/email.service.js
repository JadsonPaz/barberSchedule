// src/services/email.service.js
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendPasswordResetEmail(toEmail, resetUrl) {
    await resend.emails.send({
        from: process.env.EMAIL_FROM || 'Barbearia <noreply@seudominio.com>',
        to: toEmail,
        subject: 'Redefinição de senha',
        html: `<p>Clique <a href="${resetUrl}">aqui</a> para redefinir sua senha. O link expira em 15 minutos.</p>`,
    })
}