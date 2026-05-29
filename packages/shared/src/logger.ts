export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

export interface LogPayload {
  level: LogLevel;
  msg: string;
  time: string;
  traceId?: string;
  error?: string;
  stack?: string;
  [key: string]: unknown;
}

export class Logger {
  private static getTimestamp(): string {
    return new Date().toISOString();
  }

  private static print(payload: LogPayload) {
    if (process.env.NODE_ENV === "production") {
      console.log(JSON.stringify(payload));
    } else {
      const colors = {
        DEBUG: "\x1b[36m", // Cyan
        INFO: "\x1b[32m",  // Green
        WARN: "\x1b[33m",  // Yellow
        ERROR: "\x1b[31m", // Red
      };
      const reset = "\x1b[0m";
      const color = colors[payload.level] || reset;
      
      const timeStr = `[${payload.time.split("T")[1].slice(0, 8)}]`;
      const levelStr = `${color}[${payload.level}]${reset}`;
      const msgStr = payload.msg;

      const extraKeys = Object.keys(payload).filter(
        (k) => !["level", "msg", "time", "error", "stack"].includes(k)
      );
      const metadataStr = extraKeys.length > 0
        ? ` | \x1b[90mmetadata: ${JSON.stringify(
            extraKeys.reduce((acc, k) => ({ ...acc, [k]: payload[k] }), {})
          )}${reset}`
        : "";

      const errorStr = payload.error ? ` | \x1b[31mError: ${payload.error}${reset}` : "";
      const stackStr = payload.stack ? `\n\x1b[90m${payload.stack}${reset}` : "";

      console.log(`${timeStr} ${levelStr}: ${msgStr}${metadataStr}${errorStr}${stackStr}`);
    }
  }

  public static debug(msg: string, meta?: Record<string, unknown>, traceId?: string) {
    this.print({
      level: "DEBUG",
      msg,
      time: this.getTimestamp(),
      traceId,
      ...meta,
    });
  }

  public static info(msg: string, meta?: Record<string, unknown>, traceId?: string) {
    this.print({
      level: "INFO",
      msg,
      time: this.getTimestamp(),
      traceId,
      ...meta,
    });
  }

  public static warn(msg: string, meta?: Record<string, unknown>, traceId?: string) {
    this.print({
      level: "WARN",
      msg,
      time: this.getTimestamp(),
      traceId,
      ...meta,
    });
  }

  public static error(msg: string, error?: unknown, meta?: Record<string, unknown>, traceId?: string) {
    const errObj = error instanceof Error ? error : new Error(String(error || "Unknown Error"));
    this.print({
      level: "ERROR",
      msg,
      time: this.getTimestamp(),
      traceId,
      error: errObj.message,
      stack: errObj.stack,
      ...meta,
    });
  }
}
