import mongoose from 'mongoose';

let cached = global._mongooseCache || (global._mongooseCache = { conn: null, promise: null })

export const Mongoose = {
    async connect({ mongoConnectionString }) {
        try {
            if (cached.conn) return { text: 'MongoDB already connected' }

            if (!cached.promise) {
                cached.promise = mongoose.connect(mongoConnectionString)
            }

            cached.conn = await cached.promise
            this.db = mongoose.connection

            return { text: 'MongoDB connected successfully' }
        } catch (error) {
            cached.promise = null
            return { text: 'Error during mongo connection', error }
        }
    }
}
export async function connectDB() {
    return Mongoose.connect({ mongoConnectionString: process.env.MONGOOSE_CS })
}