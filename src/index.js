import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { connectDB } from '../src/dataBase/mongo.js'
import authRouter from '../src/auth/auth.js'
import usersRouter from '../src/routers/users.js'
import appointmentsRouter from '../src/routers/appointments.js'
import servicesRouter from '../src/routers/services.js'
import availabilityRouter from '../src/routers/availability.js'
import blockedSlotsRouter from '../src/routers/blockedSlots.js'
import { authenticateToken } from '../src/middlewares/auth.middleware.js'

const app = express()

app.use(express.json())
app.use(cors())

app.use(async (req, res, next) => {
    await connectDB()
    next()
})

app.get('/', (req, res) => {
    res.send({ success: true, statusCode: 200, body: 'tudo certo por aqui' })
})

app.use('/auth', authRouter)
app.use('/users',         authenticateToken, usersRouter)
app.use('/appointments',  authenticateToken, appointmentsRouter)
app.use('/services',      authenticateToken, servicesRouter)
app.use('/availability',  authenticateToken, availabilityRouter)
app.use('/blocked-slots', authenticateToken, blockedSlotsRouter)

export default app