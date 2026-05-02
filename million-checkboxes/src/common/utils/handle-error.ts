import type { Request, Response, NextFunction } from "express";

export default function handleError(err: any, req:Request, res:Response, next:NextFunction) {
  if (err) {
    res.status(err.statusCode || 500).json({
      message: err.message
    })
  }
}