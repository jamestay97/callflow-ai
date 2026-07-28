import { Router } from "express";
import {
  bookAppointmentHandler,
  checkCalendarAvailabilityHandler,
  sendPaymentLinkHandler,
} from "../controllers/tools.controller.js";
import { loadTenantFromParam } from "../middleware/tenantContext.js";

export const toolsRouter = Router({ mergeParams: true });

toolsRouter.post("/check_calendar_availability", checkCalendarAvailabilityHandler);
toolsRouter.post("/book_appointment", bookAppointmentHandler);
toolsRouter.post("/send_payment_link", sendPaymentLinkHandler);

/** Tenant-scoped tool routes for direct testing */
export const tenantToolsRouter = Router({ mergeParams: true });

tenantToolsRouter.use(loadTenantFromParam("tenantSlug"));
tenantToolsRouter.post("/check_calendar_availability", checkCalendarAvailabilityHandler);
tenantToolsRouter.post("/book_appointment", bookAppointmentHandler);
tenantToolsRouter.post("/send_payment_link", sendPaymentLinkHandler);
