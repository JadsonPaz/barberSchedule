// src/models/Availability.js
import mongoose from "mongoose";

const availabilitySchema = new mongoose.Schema(
  {
    barberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Barbeiro é obrigatório"],
    },
    weekday: {
      type: Number,
      required: [true, "Dia da semana é obrigatório"],
      min: 0,
      max: 6,
      // 0 = domingo, 1 = segunda ... 6 = sábado
    },
    startTime: {
      type: String,
      required: [true, "Horário de início é obrigatório"],
    },
    endTime: {
      type: String,
      required: [true, "Horário de término é obrigatório"],
    },
    slotDuration: {
      type: Number, // em minutos
      default: 100,
    },
  },
  {
    timestamps: true,
  }
);

const Availability = mongoose.model("Availability", availabilitySchema);

export default Availability;