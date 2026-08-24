// src/models/Appointment.js
import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    clientName: {
      type: String,
      trim: true,
      default: null,
    },
    clientPhone: {
      type: String,
      trim: true,
      default: null,
    },
    barberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Barbeiro é obrigatório"],
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: [true, "Serviço é obrigatório"],
    },
    date: {
      type: Date,
      required: [true, "Data é obrigatória"],
    },
    time: {
      type: String,
      required: [true, "Horário é obrigatório"],
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "done"],
      default: "pending",
    },
    price: {
      type: Number,
      required: [true, "Preço é obrigatório"],
    },
    notes: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Appointment = mongoose.model("Appointment", appointmentSchema);

export default Appointment;   