import { randomUUID } from "node:crypto";

type LogLevel = "info" | "warn" | "error";

type LogPayload = Record<string, unknown>;

function emit(level: LogLevel, message: string, payload?: LogPayload) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...payload,
  };
  // Single-line JSON — easy to parse with any log aggregator (Logtail, Datadog, etc.)
  // eslint-disable-next-line no-console
  console[level](JSON.stringify(entry));
}

export const logger = {
  info:  (msg: string, payload?: LogPayload) => emit("info",  msg, payload),
  warn:  (msg: string, payload?: LogPayload) => emit("warn",  msg, payload),
  error: (msg: string, payload?: LogPayload) => emit("error", msg, payload),
};

/**
 * Call at the top of each API route handler to get a logger with a stable
 * request ID that flows through every log line for that request.
 *
 *   const { log, requestId } = createRequestLogger("GET /api/business-rules");
 *   log.info("handler called");
 *   log.error("db write failed", { error: e.message });
 */
export function createRequestLogger(route: string) {
  const requestId = randomUUID();
  const log = {
    info:  (msg: string, payload?: LogPayload) => emit("info",  msg, { requestId, route, ...payload }),
    warn:  (msg: string, payload?: LogPayload) => emit("warn",  msg, { requestId, route, ...payload }),
    error: (msg: string, payload?: LogPayload) => emit("error", msg, { requestId, route, ...payload }),
  };
  return { log, requestId };
}
