import { Router } from "express";
import { AccessControlOverviewController, DashboardController } from "@controllers/dashboard.controller";
import { PermissionAction } from "@prisma/client";
import { requirePermission, verifyToken } from "@middlewares";
import { asyncHandler } from "@utils";

const router = Router();

router.get("/dashboard", verifyToken, requirePermission("dashboard", PermissionAction.READ), asyncHandler(DashboardController.summary));
router.get("/access-control/overview", verifyToken, requirePermission("access-control", PermissionAction.READ), asyncHandler(AccessControlOverviewController.overview));

export default router;
