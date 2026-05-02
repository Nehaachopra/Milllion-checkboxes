import express from "express";
import path from "node:path";
import notFoundError from "./common/utils/not-found-error.js";
import handleError from "./common/utils/handle-error.js";
import { Session } from "./model.js";
import {
  generateToken,
  generateHashedToken,
  verifyToken,
} from "./common/utils/token.js";
import { redis } from "./redis.js";
import cookieParser from 'cookie-parser';

let clientID = process.env.CLIENT_ID!;
let redirectURL = process.env.REDIRECT_URL!;
const issuer = "http://localhost:8000";

const app = express();
app.use(express.static(path.resolve("./src/public/")));
app.use(express.json());
app.use(cookieParser());

app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

app.get("/data", async (req, res) => {
  const checked = await redis.smembers("checkboxes");
  const data = checked ? checked.map(Number) : [];
  return res.status(200).json({ data: data });
});

app.get("/", async (req, res) => {
  try {
    clientID = process.env.CLIENT_ID!;
    redirectURL = process.env.REDIRECT_URL!;

    const state = generateToken(16);
    const hashedState = generateHashedToken(state);

    const scopeArray = ["openid", "email"];
    const scope = scopeArray.join(" ");

    await Session.create({
      state: hashedState,
    });

    const authorizationURL = `${issuer}/o/authenticate?client_id=${encodeURIComponent(clientID)}&redirect_url=${encodeURIComponent(redirectURL)}&state=${encodeURIComponent(state)}&scope=${encodeURIComponent(scope)}`;

    return res.redirect(authorizationURL);
  } catch (error) {
    const notFoundPath = path.resolve("./src/public/error/index.html");
    return res.sendFile(notFoundPath);
  }
});

app.get("/callback", async (req, res) => {
  try {
    const { code, state } = req.query as {
      code: string;
      state: string;
    };

    if (!code || !state) {
      return res.redirect("/error?type=auth");
    }

    const hashedCode = generateHashedToken(code);
    const hashedState = generateHashedToken(state);

    const session = await Session.findOneAndUpdate(
      { state: hashedState },
      { code: hashedCode },
    );
    console.log("session: ", session);

    if (!session) {
      return res.redirect("/error?type=auth");
    }

    const nonce = generateToken(16);
    const tokenRes = await fetch(`${issuer}/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        shortCode: code,
        clientSecret: process.env.CLIENT_SECRET,
        clientID,
        nonce,
      }),
    });
    console.log("Toekn response: ", tokenRes);

    if (!tokenRes.ok) {
      return res.redirect("/error?type=auth");
    }

    const data = await tokenRes.json();
    if (data.nonce !== nonce) {
      return res.redirect("/error?type=auth");
    }
    console.log("/callback - data: ", data);

    const accessToken = data.accessToken;
    const refreshToken = data.refreshToken;

    session.accessToken = accessToken;
    session.refreshToken = refreshToken;
    await session.save();

    console.log("Updated session: ", session)

    res.cookie("sessionId", session._id, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
    });

    return res.redirect("/home");
  } catch (error) {
    return res.redirect("/error?type=auth");
  }
});

app.get("/me", async (req, res) => {
  try {
    console.log(req);
    const sessionId = req.cookies.sessionId;
    console.log("Session ID: ", sessionId);

    if (!sessionId) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(401).json({ message: "Invalid session" });
    }
    console.log("Session: ", session);

    const accessToken = session.accessToken;
    const refreshToken = session.refreshToken;

    const userRes = await fetch(`${issuer}/userinfo`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    console.log("userRes: ", userRes);

    if (userRes.ok) {
      const userData = await userRes.json();
      return res.json(userData);
    }

    const nonce = generateToken(16);
    const tokenRes = await fetch(`${issuer}/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refreshToken,
        clientID,
        nonce,
      }),
    });

    if (!tokenRes.ok) {
      return res.status(401).json({ message: "Invalid session" });
    }

    const data = await tokenRes.json();
    console.log("Data:", data);
    if (data.nonce !== nonce) {
      return res.status(401).json({ message: "Invalid session" });
    }

    const userResAgain = await fetch(`${issuer}/userinfo`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${data.accessToken}`,
      },
    });
    console.log("user res again:", userResAgain);

    if (!userResAgain.ok) {
      return res.status(401).json({ message: "Invalid session" });
    }

    session.accessToken = data.accessToken;
    session.refreshToken = data.refreshToken;
    await session.save();

    const newUserData = await userResAgain.json();
    return res.json(newUserData);
  } catch (error) {
    return res.status(401).json({ message: "Unauthenticated" });
  }
});

app.get("/error", (req, res) => {
  const pathName = path.resolve("./src/public/error/index.html");
  res.sendFile(pathName);
});

app.get("/home", (req, res) => {
  const pathName = path.resolve("./src/public/checkboxes/index.html");
  return res.sendFile(pathName);
});

app.use(notFoundError);
app.use(handleError);

export default app;
