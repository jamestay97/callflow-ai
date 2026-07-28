import express, { type Express, type Request, type Response, type NextFunction } from "express";
import type { Server } from "node:http";
import cors from "cors";
import helmet from "helmet";
import { env, getCorsOrigins, isProduction } from "./config/env.js";
import { getReadinessReport } from "./config/readiness.js";
import { initTenantStore, tenantCount } from "./db/tenantStore.js";
import { adminRouter } from "./routes/admin.routes.js";
import { tenantToolsRouter } from "./routes/tools.routes.js";
import { webhookRouter } from "./routes/webhook.routes.js";
import { apiRateLimiter, webhookRateLimiter } from "./middleware/rateLimit.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { logger } from "./utils/logger.js";

export function createApp(): Express {
  initTenantStore();

  const app = express();

  if (env.TRUST_PROXY) {
    app.set("trust proxy", 1);
  }

  app.use(
    helmet({
      contentSecurityPolicy: isProduction(),
    }),
  );

  const corsOrigins = getCorsOrigins();
  app.use(
    cors(
      corsOrigins === true
        ? {}
        : {
            origin: corsOrigins.length > 0 ? corsOrigins : false,
          },
    ),
  );

  app.use(express.json({ limit: "1mb" }));
  app.use(requestLogger);

  app.get("/health", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      service: "ai-receptionist",
      mode: "multi-tenant",
      tenantCount: tenantCount(),
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/ready", (_req: Request, res: Response) => {
    const report = getReadinessReport();
    res.status(report.status === "not_ready" ? 503 : 200).json(report);
  });

  // In dev, redirect browser traffic to the Next.js dashboard (API has no HTML UI)
  if (!isProduction()) {
    const webApp = env.WEB_APP_URL.replace(/\/$/, "");
    app.get("/", (_req, res) => res.redirect(webApp));
    app.get("/dashboard", (_req, res) => res.redirect(`${webApp}/dashboard`));
    app.get("/dashboard/*", (req, res) => res.redirect(`${webApp}${req.path}`));
  }

  app.use("/admin", apiRateLimiter, adminRouter);
  app.use("/api/:tenantSlug/tools", apiRateLimiter, tenantToolsRouter);
  app.use("/webhook", webhookRateLimiter, webhookRouter);

  app.use((_req: Request, res: Response) => {
    if (!isProduction() && _req.accepts("html")) {
      const webApp = env.WEB_APP_URL.replace(/\/$/, "");
      res.status(404).type("html").send(`<!DOCTYPE html>
<html><head><title>CallFlow API</title></head>
<body style="font-family:system-ui;max-width:32rem;margin:3rem auto;padding:0 1rem">
  <h1>API only — no page here</h1>
  <p>This port serves the CallFlow API, not the dashboard.</p>
  <p><a href="${webApp}/dashboard">Open dashboard →</a></p>
  <p style="color:#666;font-size:0.875rem">API health: <a href="/health">/health</a></p>
</body></html>`);
      return;
    }
    res.status(404).json({ error: "Not found", dashboard: env.WEB_APP_URL });
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    logger.error("unhandled error", {
      error: err instanceof Error ? err.message : String(err),
    });
    res.status(500).json({
      error: "Internal server error",
      message: env.NODE_ENV === "development" && err instanceof Error ? err.message : undefined,
    });
  });

  return app;
}

export function startServer(): Server {
  const app = createApp();

  const server = app.listen(env.PORT, () => {
    const apiUrl = env.PUBLIC_BASE_URL ?? `http://localhost:${env.PORT}`;
    logger.info("server started", {
      port: env.PORT,
      environment: env.NODE_ENV,
      tenantCount: tenantCount(),
      publicBaseUrl: apiUrl,
      adminApi: `${apiUrl}/admin/tenants`,
      dashboard: env.WEB_APP_URL,
    });
    if (!isProduction()) {
      console.log("\n  CallFlow AI");
      console.log(`  Dashboard → ${env.WEB_APP_URL}/dashboard`);
      console.log(`  API       → ${apiUrl}\n`);
    }
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      logger.error(`Port ${env.PORT} is already in use — set PORT in .env or stop the other process`);
      process.exit(1);
    }
    throw err;
  });

  return server;
}
