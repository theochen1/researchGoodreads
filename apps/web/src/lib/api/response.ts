import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ApiError } from "./errors";

export type ApiSuccess<T> = {
  data: T;
};

export type ApiFailure = {
  error: {
    code: string;
    message: string;
  };
};

export function ok<T>(
  data: T,
  init?: ResponseInit,
): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ data }, init);
}

export function errorResponse(error: unknown): NextResponse<ApiFailure> {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "validation_error",
          message: error.issues[0]?.message ?? "Invalid request",
        },
      },
      { status: 400 },
    );
  }

  const message =
    error instanceof Error ? error.message : "Unexpected server error";

  return NextResponse.json(
    { error: { code: "internal_error", message } },
    { status: 500 },
  );
}

export function placeholder(taskName: string): NextResponse<ApiFailure> {
  return errorResponse(
    new ApiError(501, "not_implemented", `${taskName} is not implemented yet`),
  );
}
