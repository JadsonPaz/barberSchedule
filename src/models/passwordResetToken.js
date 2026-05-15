// src/models/passwordResetToken.js
import mongoose from 'mongoose'

/**
 * Armazena tokens temporários de redefinição de senha.
 *
 * - token:     hash sha256 do token bruto enviado por email
 * - userId:    referência ao usuário dono do token
 * - expiresAt: data de expiração (15 minutos a partir da criação)
 * - used:      impede reutilização do mesmo token após uso
 *
 * O índice TTL do MongoDB apaga documentos automaticamente após expiresAt,
 * funcionando como limpeza automática — sem precisar de cron job.
 */
const passwordResetTokenSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
        unique: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    expiresAt: {
        type: Date,
        required: true,
        default: () => new Date(Date.now() + 15 * 60 * 1000), // 15 min
    },
    used: {
        type: Boolean,
        default: false,
    },
})

// TTL index: o MongoDB deleta o documento automaticamente ao atingir expiresAt
passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

const PasswordResetToken =
    mongoose.models.PasswordResetToken ||
    mongoose.model('PasswordResetToken', passwordResetTokenSchema)

export default PasswordResetToken
