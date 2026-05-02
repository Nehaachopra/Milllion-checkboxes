import express from 'express';
import path from 'node:path';
import notFoundError from './common/utils/not-found-error.js';
import handleError from './common/utils/handle-error.js';
import authRoute from "./modules/auth/routes.js";

const app = express();
app.use(express.static(path.resolve('./src/public/')));
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

app.use("/", authRoute);

app.use(notFoundError);
app.use(handleError);

export default app;