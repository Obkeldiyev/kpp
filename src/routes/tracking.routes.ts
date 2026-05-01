import { Router } from "express";
import { TrackingController } from "@controllers/tracking.controller";
import { PermissionAction } from "@prisma/client";
import { requirePermission, verifyToken } from "@middlewares";
import { asyncHandler } from "@utils";

const router = Router();
const access = (action: PermissionAction) => [verifyToken, requirePermission("tracking", action)];

router.post("/sessions", ...access(PermissionAction.CREATE), asyncHandler(TrackingController.startSession));
router.get("/sessions", ...access(PermissionAction.READ), asyncHandler(TrackingController.listSessions));
router.get("/sessions/:id", ...access(PermissionAction.READ), asyncHandler(TrackingController.getSession));
router.patch("/sessions/:id", ...access(PermissionAction.UPDATE), asyncHandler(TrackingController.updateSession));
router.delete("/sessions/:id", ...access(PermissionAction.DELETE), asyncHandler(TrackingController.deleteSession));
router.post("/sessions/:id/points", ...access(PermissionAction.CREATE), asyncHandler(TrackingController.addPoint));
router.patch("/sessions/:id/finish", ...access(PermissionAction.MANAGE), asyncHandler(TrackingController.finishSession));
router.get("/points", ...access(PermissionAction.READ), asyncHandler(TrackingController.latestPoints));
router.patch("/points/:pointId", ...access(PermissionAction.UPDATE), asyncHandler(TrackingController.updatePoint));
router.delete("/points/:pointId", ...access(PermissionAction.DELETE), asyncHandler(TrackingController.deletePoint));

export default router;
