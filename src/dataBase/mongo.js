import mongoose from 'mongoose';

export const Mongoose = {
    async connect({ mongoConnectionString }) {
        try {
            await mongoose.connect(mongoConnectionString);

            this.db = mongoose.connection;

            return { text: 'MongoDB connected successfully' };
        } catch (error) {
            return { text: 'Error during mongo connection', error };
        }
    }
}