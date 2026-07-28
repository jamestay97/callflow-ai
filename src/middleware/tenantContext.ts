import type { Request, Response, NextFunction } from "express";
import { getActiveTenant } from "../tenants/tenant.service.js";
import type { TenantRecord } from "../types/tenant.js";
import { paramString } from "../utils/params.js";

declare global {
  namespace Express {
    interface Request {
      tenant?: TenantRecord;
    }
  }
}

export function loadTenantFromParam(paramName = "tenantSlug") {
  return (req: Request, res: Response, next: NextFunction): void => {
    const slug = paramString(req.params[paramName]);
    if (!slug) {
      res.status(400).json({ error: "Tenant slug is required" });
      return;
    }

    try {
      req.tenant = getActiveTenant(slug);
      next();
    } catch (error) {
      res.status(404).json({
        error: error instanceof Error ? error.message : "Tenant not found",
      });
    }
  };
}

export function requireTenant(req: Request, res: Response, next: NextFunction): void {
  if (!req.tenant) {
    res.status(500).json({ error: "Tenant context missing" });
    return;
  }
  next();
}
