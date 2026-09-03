// src/models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullname: {
      type: String,
      required: [true, "Nome é obrigatório"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "E-mail é obrigatório"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false, // nunca retorna o password por padrão
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    // src/models/User.js
    avatarUrl: {
      type: String,
      default: null,
    },
    expoPushTokens: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  },


);

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
