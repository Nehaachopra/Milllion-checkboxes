import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    select: false
  },
  verificationToken: {
    type: String,
    select: false
  },
  verificationTokenExpiry: {
    type: Date,
    select: false
  },
  resetPasswordToken: {
    type: String,
    select: false
  },
  resetPasswordTokenExpiry: {
    type: Date,
    select: false
  }
}, {timestamps: true})

const clientSchema = new mongoose.Schema({
  appName: {
    type: String,
    required: [true, 'App name is required'],
    trim: true
  },
  applicationURL: {
    type:String,
    required: [true, 'Application URL is required'],
  },
  redirectURL: {
    type:String,
    required: [true, 'Redirect URL is required'],
  },
  clientSecret: {
    type:String,
    required: [true, 'Secret is required'],
    select: false
  }
}, {timestamps: true})

const oauthSession = new mongoose.Schema({
  clientID: {
    type: String,
  },
  state: {
    type: String
  },
  scope: {
    type: String
  },
  shortCode: {
    type:String
  },
  shortCodeExpiry: {
    type: Date
  },
  userID: {
    type: String
  }
}, {
  timestamps: true
})

const refreshTokenSchema = new mongoose.Schema({
  clientID: {
    type: String,
  },
  userID: {
    type: String
  },
  refreshToken:{
    type: String
  }
},
{timestamps: true})

export const User = mongoose.model("user", userSchema);
export const Client = mongoose.model("client", clientSchema);
export const OauthSession = mongoose.model("oauthSession", oauthSession);
export const RefreshTokens = mongoose.model("refreshToken", refreshTokenSchema);