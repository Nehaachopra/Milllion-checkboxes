import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import path from "node:path";

import {
  getOpenIdDiscovery,
  getPublicKey,
  registerClient,
  signUpUser,
  verifyEmail,
  signInUser,
  grantToken,
  grantTokenOnRefreshToken,
  giveUserData,
  verifyClient
} from "./controller.js";
import { ApiError } from "../../common/utils/api-error.js";
import { ApiResponse } from "../../common/utils/api-response.js";

const route = Router();

route.get("/.well-known/openid-configuration",
  (req: Request, res: Response) => {
    const obj = getOpenIdDiscovery();
    return res.json(obj);
  },
);

route.get("/jwks", async (req: Request, res: Response) => {
  const key = await getPublicKey();
  const keys = Object.fromEntries(
    Object.entries({ ...key, alg: "RS256" }).sort(([keyA], [keyB]) =>
      keyA.localeCompare(keyB),
    ),
  );
  return res.json({ keys: [keys] });
});

route.get("/client-details", (req: Request, res: Response) => {
  const pathName = path.resolve("./src/public/client/index.html");
  res.sendFile(pathName);
});

route.post("/client-details", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { appName, applicationURL, redirectURL } = req.body;

      if (!appName || !applicationURL || !redirectURL) {
        throw ApiError.badRequest("Enter all the details");
      }

      
      const clientData = await registerClient(
        appName,
        applicationURL,
        redirectURL,
      );

      return res.json({data: clientData});
    } catch (err) {
      next(err);
    }
  },
);

route.get("/o/authenticate", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { client_id, redirect_url, state, scope } = req.query as {
      client_id?: string;
      redirect_url?: string;
      state?: string;
      scope?: string;
    };

    if (!client_id || !redirect_url || !state) {
      throw ApiError.badRequest("MISSING_CREDENTIALS");
    }

    const DEFAULT_SCOPE = "openid email profile";
    const requestedScope = (scope || DEFAULT_SCOPE).trim();

    const ALLOWED = new Set(["openid", "email", "profile"]);
    const assignedScope = requestedScope
      .split(/\s+/)
      .filter(s => ALLOWED.has(s))
      .join(" ") || DEFAULT_SCOPE;

    await verifyClient(client_id, redirect_url);

    // 🔒 Always encode query params
    const redirectURL = `/o/authenticate/sign-in?client_id=${encodeURIComponent(client_id)}&redirect_url=${encodeURIComponent(redirect_url)}&state=${encodeURIComponent(state)}&scope=${encodeURIComponent(assignedScope)}`;

    return res.redirect(redirectURL);

  } catch (error) {
    next(error);
  }
});

route.get("/o/authenticate/sign-in", (req, res, next) => {
  const pathName = path.resolve("./src/public/auth/index.html");
  res.sendFile(pathName);
})

route.post("/o/authenticate/sign-in/", async(req, res, next) => {
  try {
    const {email, password, clientID, redirectURL, state, scope} = req.body;
    if (!clientID || !redirectURL || !state || !scope) {
      throw ApiError.badRequest("MISSING_CLIENT_CREDENTIALS")
    }
    if (!email || !password) {
      throw ApiError.badRequest("MISSING_USER_CREDENTIALS")
    }

    const shortCode = await signInUser(email, password, clientID, redirectURL, state, scope);

    const updatedRedirectURL = `${redirectURL}?code=${shortCode}&state=${state}`;

    return res.status(200).json({
      redirect: updatedRedirectURL
    });
  }
  catch(err) {
    next(err);
  }
})

route.post("/o/authenticate/sign-up",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { firstName, lastName="", email, password, clientID, redirectURL, state, scope} = req.body;
      if (!firstName || !email || !password) {
        throw ApiError.badRequest("MISSING_USER_CREDENTIALS");
      }
      if (!clientID || !redirectURL || !state || !scope) {
        throw ApiError.badRequest("MISSING_CLIENT_CREDENTIALS")
      }
      await signUpUser(firstName, lastName, email, password, clientID, redirectURL, state, scope);
      
      ApiResponse.created(res, "Verification email sent. Please check your inbox.");
    } catch (err) {
      next(err);
    }
  }
);

route.get("/o/authenticate/verify-email/:token", async(req, res) => {
  try{
    const token = req.params.token;
    const {client_id, redirect_url, state, scope} = req.query as {
      client_id: string,
      redirect_url: string,
      state: string,
      scope: string
    }
    if (!token || !client_id || !redirect_url || !state || !scope) {
      throw ApiError.badRequest("Invalid or expired verification link")
    }

    await verifyEmail(token);

    const url = `/o/authenticate/sign-in/?verify=success&client_id=${encodeURIComponent(client_id)}&redirect_url=${encodeURIComponent(redirect_url)}&state=${encodeURIComponent(state)}&scope=${encodeURIComponent(scope)}`;

    return res.redirect(url);
  }
  catch(err) {
    return res.redirect("o/authenticate/sign-in/?verify=error")
  }
})

route.post("/token", async(req, res, next) => {
  try {
    const {shortCode, clientSecret, clientID, refreshToken, nonce} = req.body;

    if (!clientID || !nonce) {
      throw ApiError.badRequest("MISSING_CREDENTIALS")
    }

    let data;
    
    if (refreshToken) {
      data = await grantTokenOnRefreshToken(refreshToken, clientID, nonce);
    }

    if (!shortCode || !clientSecret) {
      throw ApiError.badRequest("MISSING_CREDENTIALS")
    }
    else {
      data = await grantToken(shortCode, clientSecret, clientID, nonce);
    }

    return res.status(200).json(data);
  }
  catch(error) {
    next(error)
  }

})

route.get("/userinfo", async(req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer")) {
      throw ApiError.badRequest("INVALID_OR_MISSING_TOKEN")
    }

    const token = authHeader.split(" ")[1];
    const data = await giveUserData(token!);

    return ApiResponse.ok(res, "User info successfully provided", data);
  }
  catch(error) {
    next(error);
  }
})

export default route;
