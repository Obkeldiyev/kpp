import { Router } from "express";
import { AccessControlOverviewController, DashboardController } from "@controllers/dashboard.controller";
import { asyncHandler } from "@utils";

const router = Router();

router.get("/dashboard", asyncHandler(DashboardController.summary));
router.get("/access-control/overview", asyncHandler(AccessControlOverviewController.overview));

export default router;
