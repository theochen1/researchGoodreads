export type ApiErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "validation_error"
  | "internal_error"
  | "not_implemented";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export function badRequest(message: string): ApiError {
  return new ApiError(400, "bad_request", message);
}

export function unauthorized(message = "Authentication required"): ApiError {
  return new ApiError(401, "unauthorized", message);
}

export function forbidden(message = "Forbidden"): ApiError {
  return new ApiError(403, "forbidden", message);
}

export function notFound(message = "Not found"): ApiError {
  return new ApiError(404, "not_found", message);
}

export function notImplemented(message = "Not implemented yet"): ApiError {
  return new ApiError(501, "not_implemented", message);
}
