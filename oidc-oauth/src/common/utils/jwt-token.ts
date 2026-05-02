import jwt from "jsonwebtoken";

export function generateJWT(payload: any, secret: string | Buffer) {
  return jwt.sign(payload, secret, {algorithm: "RS256"})
}

export function verifyJWT(token: string,secret:string | Buffer) {
  return jwt.verify(token, secret, {
    algorithms: ["RS256"]
  })
}

export interface JWTTokenClaims {
   "aud"?: string; //client_abc
  "email":string;
  "email_verified": boolean;
  "exp": number,
  "iat": number;
  "iss": string;
  "name"?: string; 
  "picture"?: string;
  "sub"?: string; //user_123
}