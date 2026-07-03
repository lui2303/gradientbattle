import pino from "pino";

export const logger = pino({
    level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV !== "production" ? "debug" : "info"),
    transport: process.env.NODE_ENV !== "production"
        ? { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss.l" } }
        : undefined,
});
