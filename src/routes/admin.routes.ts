import { Router } from "express";
import {
  createTenantHandler,
  deleteTenantHandler,
  getTenantHandler,
  listTenantsHandler,
  tenantOnboardingHandler,
  tenantBookingsHandler,
  tenantPromptHandler,
  tenantSchemasHandler,
  updateTenantHandler,
} from "../controllers/admin.tenants.controller.js";
import { requirePlatformAdmin } from "../middleware/platformAuth.js";

export const adminRouter = Router();

adminRouter.use(requirePlatformAdmin);

adminRouter.get("/tenants", listTenantsHandler);
adminRouter.post("/tenants", createTenantHandler);
adminRouter.get("/tenants/:tenantSlug", getTenantHandler);
adminRouter.patch("/tenants/:tenantSlug", updateTenantHandler);
adminRouter.delete("/tenants/:tenantSlug", deleteTenantHandler);

adminRouter.get("/tenants/:tenantSlug/prompt", tenantPromptHandler);
adminRouter.get("/tenants/:tenantSlug/tools/schemas", tenantSchemasHandler);
adminRouter.get("/tenants/:tenantSlug/bookings", tenantBookingsHandler);
adminRouter.get("/tenants/:tenantSlug/onboarding", tenantOnboardingHandler);
