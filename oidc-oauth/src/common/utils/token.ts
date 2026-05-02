import crypto from 'crypto';
import bcrypt from 'bcrypt';

export function generateToken(bytes: number) {
  const token = crypto.randomBytes(bytes).toString('hex');

  return token
}

export function generateHashedToken(token: string) {
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  return hashedToken
}

export function verifyToken(token: string, hashedToken:string) {
  const hashed = crypto.createHash("sha256").update(token).digest("hex");
  return hashed === hashedToken
}

export async function generateHashWithSalt(password: string, saltRounds: number) {
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  return hashedPassword
}

export async function verifyHashWithSalt(password: string, passwordWithSalt: string) {
  const valid = await bcrypt.compare(password, passwordWithSalt);
  return valid;
}