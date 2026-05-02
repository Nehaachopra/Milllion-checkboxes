# Authentication API Guide

## 1️⃣ Register

Fill the form at route below to register with our authentication service. 

`GET /client-details`

Requiring
1. App name
2. App URL
3. Redirect URL to send credentials to.

After successfull registration, you will receive in the query of your redirect URL attached,
1. Client ID
2. Client secret

``````
## 2️⃣ Authentication flow

Authenticate the user and initiate the authorization flow.
---

# 1️⃣ Sign In Endpoint

`POST /o/authenticate/sign-in`

### 🧠 Purpose

Authenticate the user and initiate the authorization flow.

---

## 📥 Request Body

```json
{
  "email": "user@example.com",
  "password": "password123",
  "clientID": "your-client-id",
  "redirectURI": "https://yourapp.com/callback",
  "state": "random-string",
  "nonce": "random-string"
}
```

---

## ⚠️ Required Fields

| Field       | Description             |
| ----------- | ----------------------- |
| email       | User email              |
| password    | User password           |
| clientID    | App identifier          |
| redirectURI | Callback URL            |
| state       | CSRF protection         |
| nonce       | Token replay protection |

---

## 📤 Response

```json
{
  "redirect": "https://yourapp.com/callback?code=SHORT_CODE&state=STATE"
}
```

---

## 🔄 Client Action

```js
window.location.href = response.redirect;
```

---

# 2️⃣ Token Endpoint

## 📍 `POST /token`

### 🧠 Purpose

Exchange a short code or refresh token for access tokens.

---

## 🔁 Flow A — Authorization Code Exchange

### 📥 Request

```json
{
  "shortCode": "abc123",
  "clientSecret": "your-client-secret",
  "clientID": "your-client-id"
}
```

---

## 🔁 Flow B — Refresh Token Exchange

### 📥 Request

```json
{
  "refreshToken": "your-refresh-token",
  "clientID": "your-client-id",
  "nonce": "new-random-string"
}
```

---

## ⚠️ Rules

* Either:

  * `shortCode + clientSecret`
  * OR `refreshToken + nonce`
* `clientID` is always required

---

## 📤 Response

```json
{
  "accessToken": "jwt-access-token",
  "refreshToken": "new-refresh-token",
  "idToken": "jwt-id-token"
}
```

---

## 🧠 Token Usage

| Token        | Purpose                |
| ------------ | ---------------------- |
| accessToken  | Call protected APIs    |
| refreshToken | Get new tokens         |
| idToken      | User identity (claims) |

---

# 3️⃣ User Info Endpoint

## 📍 `GET /userinfo`

### 🧠 Purpose

Fetch authenticated user profile.

---

## 📥 Headers

```http
Authorization: Bearer <accessToken>
```

---

## 📤 Response

```json
{
  "message": "User info successfully provided",
  "data": {
    "sub": "user-id",
    "email": "user@example.com",
    "email_verified": true,
    "name": "User Name"
  }
}
```

---

# ⚠️ Error Handling

## Common Errors

| Status | Code                           | Meaning                  |
| ------ | ------------------------------ | ------------------------ |
| 400    | MISSING_CREDENTIALS            | Missing required fields  |
| 401    | INVALID_OR_EXPIRED_CREDENTIALS | Invalid or expired token |
| 403    | UNVERIFIED_USER                | Email not verified       |

---

# 🔐 Security Notes

* Always generate **random ****`state`**** and ****`nonce`**
* Store `state` client-side and validate on redirect
* Never expose `clientSecret` in frontend apps
* Use HTTPS only
* Treat refresh tokens as **sensitive credentials**
* Implement refresh token rotation for better security

---

# 🔄 Full Flow Summary

```
1. Client → POST /sign-in
2. Server → returns redirect URL with shortCode
3. Client → extracts code from redirect
4. Client → POST /token
5. Server → returns tokens
6. Client → GET /userinfo using accessToken
```

---

# 🧠 Mental Model

```
shortCode   → temporary authorization ticket
accessToken → API access key
refreshToken→ long-term session key
```

---

# ⚠️ Implementation Note

Fix this in your backend:

```ts
return res.json(200).json(...) ❌
```

✅ Correct:

```ts
return res.status(200).json(...)
```

---

# ✅ Final Takeaway

This API provides a clean OAuth-like authentication flow.
Clients should follow the sequence strictly and handle tokens securely.

---
