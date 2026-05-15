// src/middlewares/auth.middleware.js
import jwt from 'jsonwebtoken'

export function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : null

    if (!token) {
        return res.status(401).send({
            success: false,
            statusCode: 401,
            body: { text: 'Token de autenticação ausente' }
        })
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.user = decoded // { id, role, iat, exp }
        next()
    } catch (error) {
        const isExpired = error.name === 'TokenExpiredError'
        return res.status(401).send({
            success: false,
            statusCode: 401,
            body: { text: isExpired ? 'Token expirado' : 'Token inválido' }
        })
    }
}

export function requireAdmin(req, res, next) {
    if (req.user?.role !== 'admin') {
        return res.status(403).send({
            success: false,
            statusCode: 403,
            body: { text: 'Acesso restrito a administradores' }
        })
    }
    next()
}

export function requireSelfOrAdmin(req, res, next) {
    const targetId = req.params.id
    if (req.user?.role === 'admin' || req.user?.id === targetId) {
        return next()
    }
    return res.status(403).send({
        success: false,
        statusCode: 403,
        body: { text: 'Sem permissão para acessar este recurso' }
    })
}
