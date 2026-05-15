// src/models/BlockedSlot.js
import mongoose from "mongoose";

const blockedSlotSchema = new mongoose.Schema(
  {
    barberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Barbeiro é obrigatório"],
    },

    // ── Bloqueio recorrente (toda semana no mesmo dia) ──
    weekday: {
      type: Number,
      min: 0,
      max: 6,
      default: null,
      // 0 = domingo ... 6 = sábado
    },

    // ── Bloqueio pontual (data específica) ──
    date: {
      type: Date,
      default: null,
    },

    // ── Bloqueia o dia inteiro (só faz sentido com date) ──
    isFullDay: {
      type: Boolean,
      default: false,
    },

    // ── Horários (obrigatórios quando não é dia inteiro) ──
    startTime: {
      type: String,
      default: null,
    },
    endTime: {
      type: String,
      default: null,
    },

    reason: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const BlockedSlot = mongoose.model("BlockedSlot", blockedSlotSchema);

export default BlockedSlot;