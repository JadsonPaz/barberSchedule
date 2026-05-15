// src/models/Service.js
import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Nome do serviço é obrigatório"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    price: {
      type: Number,
      required: [true, "Preço é obrigatório"],
    },
    duration: {
      type: Number, // em minutos
      required: [true, "Duração é obrigatória"],
    },
    barberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Barbeiro é obrigatório"],
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Service = mongoose.model("Service", serviceSchema);

export default Service;
