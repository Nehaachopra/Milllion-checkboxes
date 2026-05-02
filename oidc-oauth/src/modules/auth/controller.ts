import jose from "node-jose";
import fs from "node:fs";
import path from "node:path";

import { User, Client, OauthSession, RefreshTokens } from "./model.js";
import { ApiError } from "../../common/utils/api-error.js";
import { sendMail } from "../../common/mail/mail.js";
import { verificationMailContent } from "../../common/mail/templates.js";
import { generateToken, generateHashedToken, verifyToken } from "../../common/utils/token.js";
import type { JWTTokenClaims } from "../../common/utils/jwt-token.js";
import { generateJWT,verifyJWT } from "../../common/utils/jwt-token.js";
import { generateHashWithSalt, verifyHashWithSalt } from "../../common/utils/token.js";

const PORT = process.env.PORT || 8000;
const PUBLIC_KEY = fs.readFileSync(path.resolve("./cert/public-key.pub"));
const PRIVATE_KEY = fs.readFileSync(path.resolve("./cert/private-key.pem"));
const issuer = `http://localhost:${PORT}`;

//Return OIDC discovery endpoints JSON
function getOpenIdDiscovery() {
  return {
    issuer,
    authorization_endpoint: `${issuer}/o/authenticate`,
    token_endpoint: `${issuer}/token`,
    userinfo_endpoint: `${issuer}/userinfo`,
    jwks_uri: `${issuer}/jwks`,
  };
}

//Return public key
async function getPublicKey() {
  const key = await jose.JWK.asKey(PUBLIC_KEY, "public");
  return key.toJSON();
}

//take - app name, application url, redirect uri
//return - client id, secret 
async function registerClient(
  appName: string,
  applicationURL: string,
  redirectURL: string,
) {
  const existingClient = await Client.findOne({ appName, applicationURL });

  if (existingClient) {
    throw ApiError.conflict("Client already registered");
  }

  const clientSecret = generateToken(32);
  const clientSecretSalt = Number(process.env.CLIENT_SECRET_SALT_ROUNDS ?? 10);
  const hashedSecret = await generateHashWithSalt(clientSecret, clientSecretSalt);

  const client = await Client.create({
    appName,
    applicationURL,
    redirectURL,
    clientSecret: hashedSecret,
  });

  return {clientID: client._id, clientSecret}
}

async function verifyClient(clientID: string, redirectURL: string) {
  const client = await Client.findById(clientID);

  if (!client || client.redirectURL !== redirectURL) {
    throw ApiError.badRequest("INVALID_CLIENT");
  }
}

//take - fname, lname, email, password
//give - nothing. send verification mail
async function signUpUser(firstName:string, lastName: string, email:string, password:string, clientID:string, redirectURL:string, state:string, scope:string) {
  const existingUser = await User.findOne({email});

  if (existingUser) {
    throw ApiError.conflict("EXISTING_USER");
  }
  const saltRounds = Number(process.env.PASSWORD_SALT_ROUNDS ?? 10);
  const hashedPassword = await generateHashWithSalt(password, saltRounds);

  const data = generateVerificationToken();

  const user = await User.create({
    firstName, lastName, email, password: hashedPassword, verificationToken: data.hashedVerificationToken, verificationTokenExpiry: data.verificationTokenExpiry
  })

  await sendVerificationMail(email, data.verificationToken!, clientID, redirectURL, state, scope);
}

//take - token
//give - nothing. update is verified
async function verifyEmail(token:string) {
  const verificationToken = generateHashedToken(token);
  const user = await User.findOne({verificationToken}).select("+verificationTokenExpiry");

  if (!user) {
    throw ApiError.badRequest("Invalid or expired verification link")
  }

  if (user.isVerified) {
    throw ApiError.badRequest("Account already verified. Please login.");
  }

  if (new Date() > user.verificationTokenExpiry!) {
    throw ApiError.badRequest("Invalid or expired verification link")
  }

  user.isVerified = true;
  user.verificationToken = null;
  user.verificationTokenExpiry = null;
  await user.save();
}

//take - email: string, password:string, clientID:string, redirectURL: string, state:string,nonce:string
//give -  shortCode
async function signInUser(email: string, password:string, clientID:string, redirectURL:string, state:string, scope:string) {
  const user = await User.findOne({email}).select("+password");
  if (!user) {
    throw ApiError.badRequest("INVALID_USER_CREDENTIALS")
  }

  const valid = await verifyHashWithSalt(password, user.password);
  if(!valid) {
    throw ApiError.badRequest("INVALID_USER_CREDENTIALS")
  }

  if (!user.isVerified) {
    const data = generateVerificationToken();
    await sendVerificationMail(email, data.verificationToken, clientID, redirectURL, state, scope );
    throw ApiError.forbidden("UNVERIFIED_USER")
  }
  
  const client = await Client.findById(clientID)
  if (!client) {
    throw ApiError.badRequest("INVALID_CLIENT_CREDENTIALS");
  }

  const shortCode = generateToken(16);
  const hashedShortCode = generateHashedToken(shortCode);
  const shortCodeExpiry = new Date(Date.now() + Number(process.env.SHORT_CODE_EXPIRY_IN_MINS ?? 5) * 60 * 1000)

  await OauthSession.create({
    clientID,
    state,
    scope,
    shortCode: hashedShortCode,
    shortCodeExpiry,
    userID: user._id.toString()
  })

  return shortCode
}

function generateVerificationToken() {
  const verificationToken = generateToken(16);

  const hashedVerificationToken = generateHashedToken(verificationToken);
  const verificationTokenExpiry = new Date(Date.now() + Number(process.env.VERIFICATION_TOKEN_EXPIRY_in_Hours ?? 24) * 60 * 60 * 1000)

  return {verificationToken, hashedVerificationToken, verificationTokenExpiry}
}

async function sendVerificationMail(email:string, token:string, clientID:string, redirectURL:string, state:string, scope:string) {
  const url = new URL(`http://localhost:${PORT}/o/authenticate/verify-email/${token}`);

  url.searchParams.set("client_id", clientID);
  url.searchParams.set("redirect_url", redirectURL);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", scope);

  const verficationMailDetails = {
    verificationLink: url,
    appName: "Million checkboxes"
  }

  const {html, text} = verificationMailContent(verficationMailDetails);

  await sendMail(email, "Verify your email.", text, html);
}

//take - short code, secret, clientid
//give - access and refresh tokens
async function grantToken(shortCode: string, secret:string, clientID: string, nonce: string) {
  const hashedShortCode = generateHashedToken(shortCode); 
  const session = await OauthSession.findOne({shortCode: hashedShortCode, clientID});
  if (!session) {
    throw ApiError.badRequest("INVALID_OR_EXPIRED_CREDENTIALS")
  }

  if (new Date() > session.shortCodeExpiry!) {
    await OauthSession.findByIdAndDelete(session._id);
    throw ApiError.badRequest("INVALID_OR_EXPIRED_CREDENTIALS")
  }

  const client = await Client.findById(clientID).select("+clientSecret");
  if (!client) {
    throw ApiError.badRequest("INVALID_OR_EXPIRED_CREDENTIALS")
  }

  const valid = await verifyHashWithSalt(secret, client.clientSecret);

  if (!valid) {
    throw ApiError.badRequest("INVALID_OR_EXPIRED_CREDENTIALS")
  }

  const userID = session.userID!;

  const user = await User.findById(userID);
  if (!user) {
    throw ApiError.unauthorized("INVALID_OR_EXPIRED_CREDENTIALS");
  }
  
  const tokens = await generateJWTTokens(client, user);

  await OauthSession.findByIdAndDelete(session._id);
  
  return {...tokens,nonce};
}

//take - refreshToken, clientID, nonce
//give - access and refresh tokens
async function grantTokenOnRefreshToken(refreshToken: string, clientID: string, nonce: string) {
  const hashed = generateHashedToken(refreshToken);
  const refreshTokenRow = await RefreshTokens.findOne({refreshToken: hashed});
  if (!refreshTokenRow || clientID !== refreshTokenRow.clientID) {
    throw ApiError.badRequest("INVALID_OR_EXPIRED_CREDENTIALS")
  }

  const payload = verifyJWT(refreshToken, PUBLIC_KEY);
  if (!payload) {
    await RefreshTokens.findByIdAndDelete(refreshTokenRow._id);
    throw ApiError.badRequest("INVALID_OR_EXPIRED_CREDENTIALS")
  }

  const user = await User.findById(refreshTokenRow.userID);
  if (!user) {
    throw ApiError.unauthorized("INVALID_OR_EXPIRED_CREDENTIALS");
  }

  const client = await Client.findById(clientID);
  if (!client) {
    throw ApiError.unauthorized("INVALID_OR_EXPIRED_CREDENTIALS");
  }

  await RefreshTokens.findByIdAndDelete(refreshTokenRow._id);

  const tokens = await generateJWTTokens(client, user);

  return {...tokens, nonce};
}

async function generateJWTTokens(client:any, user:any) {
  const now = Math.floor(Date.now() / 1000);
  const clientID = client._id;
  const userID = user._id;

  const accessPayload: JWTTokenClaims = {
    "aud": clientID,
    "email": user.email, 
    "email_verified": user.isVerified,
    "iat": now,
    "exp": now + Number(process.env.REFRESH_TOKEN_EXPIRY_IN_DAYS ?? 7) * 24 * 60 * 60,
    "iss": issuer,
    "sub": userID,
  }

  const refreshPayload: JWTTokenClaims = {
    "aud": clientID,
    "email": user.email, 
    "email_verified": user.isVerified,
    "iat": now,
    "exp": now + Number(process.env.ACCESS_TOKEN_EXPIRY_IN_MIN ?? 15) * 60,
    "iss": issuer,
    "sub": userID,
  }

  const accessToken = generateJWT(accessPayload, PRIVATE_KEY);
  const refreshToken = generateJWT(refreshPayload, PRIVATE_KEY);
  const hashedRefreshToken = generateHashedToken(refreshToken)

  await RefreshTokens.create({
    clientID,
    userID,
    refreshToken: hashedRefreshToken
  })

  return {accessToken, refreshToken}
}

//take - token
//give - users information
async function giveUserData(token: string) {
  const payload = verifyJWT(token, PUBLIC_KEY);
  if (!payload) {
    throw ApiError.badRequest("INVALID_OR_MISSING_TOKEN")
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    throw ApiError.badRequest("INVALID_OR_MISSING_TOKEN")
  }

  return {
    sub: user.id,
    email: user.email,
    email_verified: user.isVerified,
    given_name: user.firstName,
    family_name: user.lastName,
    name: [user.firstName, user.lastName].filter(Boolean).join(" ")
  }
}

export { getOpenIdDiscovery, getPublicKey, registerClient, signUpUser, verifyEmail , signInUser, grantToken, grantTokenOnRefreshToken, giveUserData, verifyClient};