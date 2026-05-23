import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { connectDB } from './dataBase/mongo.js'
import authRouter from './auth/auth.js'
import usersRouter from './routers/users.js'
import appointmentsRouter from './routers/appointments.js'
import servicesRouter from './routers/services.js'
import availabilityRouter from './routers/availability.js'
import blockedSlotsRouter from './routers/blockedSlots.js'
import { authenticateToken } from './middlewares/auth.middleware.js'

const app = express()

app.use(express.json())
app.use(cors())

app.get('/', (req, res) => {
    res.send({ success: true, statusCode: 200, body: 'tudo certo por aqui' })
})

app.get('/health', (req, res) => {
    res.send({ success: true, statusCode: 200, body: 'healthy' })
})

app.use(async (req, res, next) => {
    await connectDB()
    next()
})

app.use('/auth', authRouter)
app.use('/users',         authenticateToken, usersRouter)
app.use('/appointments',  authenticateToken, appointmentsRouter)
app.use('/services',      authenticateToken, servicesRouter)
app.use('/availability',  authenticateToken, availabilityRouter)
app.use('/blocked-slots', authenticateToken, blockedSlotsRouter)

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})

export default app
