import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema({
  state: {
    type: String
  },
  code: {
    type: String
  },
  accessToken: {
    type: String
  },
  refreshToken: {
    type: String
  },
}, {timestamps: true});

export const Session = mongoose.model("session", sessionSchema);