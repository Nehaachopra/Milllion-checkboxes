class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor)
  }

  static badRequest(message = "Bad request") {
    return new ApiError(400, message)
  }

  static unauthorized(message="Unauthorized") {
    return new ApiError(401, message)
  }

  static forbidden(message = "forbidden") {
    return new ApiError(403, message);
  }

  static notFound(message="Not found") {
    return new ApiError(404, message)
  }

  static conflict(message = "User already exist") {
    return new ApiError(409, message)
  }

  static gone(message = "Validity expired") {
    return new ApiError(410, message);
  }
}

export {ApiError}