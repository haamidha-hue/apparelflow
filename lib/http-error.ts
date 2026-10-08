import { jsonError } from "@/lib/api-response";

// Throw this anywhere inside a route to send a specific status code.
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

// Used in every catch block: known errors keep their status, others become 500.
export function handleRouteError(err: unknown, label: string) {
  if (err instanceof HttpError) return jsonError(err.status, err.message);
  console.error(`${label} failed:`, err);
  return jsonError(500, "Unexpected server error");
}