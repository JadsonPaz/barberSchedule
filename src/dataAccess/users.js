// src/dataAccess/users.js
import bcrypt from 'bcryptjs'
import User from '../models/user.js'

export default class UsersDataAccess {

    async getUsers() {
        return User.find({})
    }

    async getBarbers() {
        return User.find({ role: 'admin' })
    }

    async deleteUser(userId) {
        return User.findByIdAndDelete(userId)
    }

    // ── Atualiza apenas campos de perfil (nome, email) ─────────────────────────
    async updateProfile(userId, profileData) {
        const { fullname, email } = profileData
        const update = {}
        if (fullname !== undefined) update.fullname = fullname
        if (email !== undefined) update.email = email

        return User.findByIdAndUpdate(
            userId,
            { $set: update },
            { new: true, runValidators: true }
        )
    }

    // ── Troca senha com verificação da senha atual ─────────────────────────────
    // Retorna:
    //   null  → usuário não encontrado
    //   false → senha atual incorreta
    //   User  → sucesso
    async updatePassword(userId, currentPassword, newPassword) {
        const user = await User.findById(userId).select('+password')
        if (!user) return null

        const passwordMatch = await bcrypt.compare(currentPassword, user.password)
        if (!passwordMatch) return false

        user.password = await bcrypt.hash(newPassword, 12)
        await user.save()

        // Retorna o usuário sem a senha
        return User.findById(userId)
    }

    // ── Altera apenas a role ───────────────────────────────────────────────────
    async updateRole(userId, role) {
        return User.findByIdAndUpdate(
            userId,
            { $set: { role } },
            { new: true }
        )
    }

    async updateAvatar(userId, avatarUrl) {
        return User.findByIdAndUpdate(
            userId,
            { $set: { avatarUrl } },
            { new: true }
        )
    }

    async addExpoPushToken(userId, expoPushToken) {
        return User.findByIdAndUpdate(
            userId,
            { $addToSet: { expoPushTokens: expoPushToken } },
            { new: true }
        )
    }

    async removeExpoPushToken(userId, expoPushToken) {
        return User.findByIdAndUpdate(
            userId,
            { $pull: { expoPushTokens: expoPushToken } },
            { new: true }
        )
    }
}
