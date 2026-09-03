// src/controllers/users.js
import UsersDataAccess from '../dataAccess/users.js'
import { ok, serverError, notFound, badRequest, unauthorized } from '../helpers/httpResponse.js'

export default class UsersControllers {
    constructor() {
        this.dataAccess = new UsersDataAccess()
    }

    async getUsers() {
        try {
            const users = await this.dataAccess.getUsers()
            return ok(users)
        } catch (error) {
            return serverError(error)
        }
    }

    async getBarbers() {
        try {
            const barbers = await this.dataAccess.getBarbers()
            return ok(barbers)
        } catch (error) {
            return serverError(error)
        }
    }

    async deleteUser(userId) {
        try {
            const result = await this.dataAccess.deleteUser(userId)
            if (!result) return notFound('Usuário não encontrado')
            return ok(result)
        } catch (error) {
            return serverError(error)
        }
    }

    // ── Atualiza apenas nome e e-mail ──────────────────────────────────────────
    async updateProfile(userId, profileData) {
        try {
            // Remove campos que não devem passar por aqui
            const { fullname, email } = profileData
            const result = await this.dataAccess.updateProfile(userId, { fullname, email })
            if (!result) return notFound('Usuário não encontrado')
            return ok(result)
        } catch (error) {
            return serverError(error)
        }
    }

    // ── Troca senha com verificação da senha atual ─────────────────────────────
    async updatePassword(userId, currentPassword, newPassword) {
        try {
            const result = await this.dataAccess.updatePassword(userId, currentPassword, newPassword)

            if (result === null) return notFound('Usuário não encontrado')
            if (result === false) return unauthorized('Senha atual incorreta')

            return ok({ text: 'Senha atualizada com sucesso' })
        } catch (error) {
            return serverError(error)
        }
    }

    // ── Altera a role (admin only — verificado na rota) ────────────────────────
    async updateRole(userId, role) {
        try {
            const result = await this.dataAccess.updateRole(userId, role)
            if (!result) return notFound('Usuário não encontrado')
            return ok(result)
        } catch (error) {
            return serverError(error)
        }
    }

    async updateAvatar(userId, file) {
        try {
            if (!file) return badRequest('Nenhuma imagem enviada')
            const result = await this.dataAccess.updateAvatar(userId, file.path)
            if (!result) return notFound('Usuário não encontrado')
            return ok(result)
        } catch (error) {
            return serverError(error)
        }
    }

    async addExpoPushToken(userId, expoPushToken) {
        try {
            const result = await this.dataAccess.addExpoPushToken(userId, expoPushToken)
            if (!result) return notFound('Usuário não encontrado')
            return ok({ text: 'Token de notificação registrado com sucesso' })
        } catch (error) {
            return serverError(error)
        }
    }

    async removeExpoPushToken(userId, expoPushToken) {
        try {
            const result = await this.dataAccess.removeExpoPushToken(userId, expoPushToken)
            if (!result) return notFound('Usuário não encontrado')
            return ok({ text: 'Token de notificação removido com sucesso' })
        } catch (error) {
            return serverError(error)
        }
    }
}
