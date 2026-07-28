import { startServer } from "./server.js";
import { logger } from "./utils/logger.js";

const server = startServer();

function shutdown(signal: string): void {
  logger.info("shutdown signal received", { signal });
  server.close(() => {
    logger.info("server closed");
    process.exit(0);
  });

  setTimeout(() => {
    logger.error("forced shutdown after timeout");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  logger.error("unhandled rejection", { reason: String(reason) });
});

process.on("uncaughtException", (error) => {
  logger.error("uncaught exception", { error: error.message });
  process.exit(1);
});
