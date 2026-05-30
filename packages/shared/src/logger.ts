import pino from "pino";

export function createLogger(name: string) {
  const isProduction = process.env.NODE_ENV === "production";
  return pino({
    name,
    level: process.env.LOG_LEVEL || "info",
    transport: isProduction
      ? undefined
      : {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss Z",
            ignore: "pid,hostname",
          },
        },
  });
}
