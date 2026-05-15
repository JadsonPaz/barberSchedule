// src/index.js
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { Mongoose } from './dataBase/mongo.js'
import authRouter from './auth/auth.js'
import usersRouter from './routers/users.js'
import appointmentsRouter from './routers/appointments.js'
import servicesRouter from './routers/services.js'
import availabilityRouter from './routers/availability.js'
import blockedSlotsRouter from './routers/blockedSlots.js'
import { authenticateToken } from './middlewares/auth.middleware.js'

async function main() {
    const hostname = process.env.HOST || '0.0.0.0'
    const port = process.env.PORT || 3000

    const app = express()
    const mongooseConnection = await Mongoose.connect({
        mongoConnectionString: process.env.MONGOOSE_CS
    })
    console.log(mongooseConnection)

    app.use(express.json())
    app.use(cors())

    app.get('/', (req, res) => {
        res.send({ success: true, statusCode: 200, body: 'tudo certo por aqui' })
    })

    app.use('/auth', authRouter)

    app.use('/users',         authenticateToken, usersRouter)
    app.use('/appointments',  authenticateToken, appointmentsRouter)
    app.use('/services',      authenticateToken, servicesRouter)
    app.use('/availability',  authenticateToken, availabilityRouter)
    app.use('/blocked-slots', authenticateToken, blockedSlotsRouter)

    app.listen(port, hostname, () => {
        console.log(`Servidor rodando em http://${hostname}:${port}`)
    })
}

main()
