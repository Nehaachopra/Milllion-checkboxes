import type { Request, Response } from "express";
import { ApiError } from "./api-error.js";

export default function notFoundError(req: Request, res: Response) {
  ApiError.notFound();
}
