import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodType } from "zod";

// ============================================================
// Centralized API error handling.
// Every route handler wraps its logic in apiHandler(); thrown
// ApiErrors become clean JSON responses, Zod errors become 400s,
// and unexpected errors are logged server-side (never leaked).
// ============================================================

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const badRequest = (message: string, code = "BAD_REQUEST") =>
  new ApiError(400, code, message);
export const unauthorized = (message = "You must be signed in.") =>
  new ApiError(401, "UNAUTHORIZED", message);
export const forbidden = (message = "You do not have permission to do that.") =>
  new ApiError(403, "FORBIDDEN", message);
export const notFound = (message = "Not found.") => new ApiError(404, "NOT_FOUND", message);
export const conflict = (message: string) => new ApiError(409, "CONFLICT", message);
export const tooManyRequests = (message = "Too many requests. Please slow down.") =>
  new ApiError(429, "RATE_LIMITED", message);

type Handler = (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;

export function apiHandler(handler: Handler) {
  return async (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json(
          { error: { code: err.code, message: err.message, details: err.details } },
          { status: err.status },
        );
      }
      if (err instanceof ZodError) {
        return NextResponse.json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: "Invalid input.",
              details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
            },
          },
          { status: 400 },
        );
      }
      console.error("[api] Unhandled error:", err);
      return NextResponse.json(
        { error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } },
        { status: 500 },
      );
    }
  };
}

/** Parse + validate a JSON body, or the search params, against a Zod schema. */
export async function parseJson<T>(req: NextRequest, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw badRequest("Request body must be valid JSON.", "INVALID_JSON");
  }
  return schema.parse(raw);
}

export function parseQuery<T>(req: NextRequest, schema: ZodType<T>): T {
  const raw: Record<string, string | string[]> = {};
  req.nextUrl.searchParams.forEach((value, key) => {
    const existing = raw[key];
    if (existing === undefined) raw[key] = value;
    else if (Array.isArray(existing)) existing.push(value);
    else raw[key] = [existing, value];
  });
  return schema.parse(raw);
}

export function json<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}
