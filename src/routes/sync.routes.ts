import { Router } from "express";
import { SyncJobController } from "@controllers/sync.controller";
import { PermissionAction } from "@prisma/client";
import { requirePermission, verifyToken } from "@middlewares";
import { asyncHandler } from "@utils";

const router = Router();
const access = (action: PermissionAction) => [verifyToken, requirePermission("sync", action)];

router.post("/sync-jobs", ...access(PermissionAction.CREATE), asyncHandler(SyncJobController.create));
router.get("/sync-jobs", ...access(PermissionAction.READ), asyncHandler(SyncJobController.list));
router.get("/sync-jobs/:id", ...access(PermissionAction.READ), asyncHandler(SyncJobController.get));
router.patch("/sync-jobs/:id", ...access(PermissionAction.UPDATE), asyncHandler(SyncJobController.update));
router.patch("/sync-jobs/:id/start", ...access(PermissionAction.MANAGE), asyncHandler(SyncJobController.start));
router.patch("/sync-jobs/:id/finish", ...access(PermissionAction.MANAGE), asyncHandler(SyncJobController.finish));
router.patch("/sync-jobs/:id/fail", ...access(PermissionAction.MANAGE), asyncHandler(SyncJobController.fail));
router.delete("/sync-jobs/:id", ...access(PermissionAction.DELETE), asyncHandler(SyncJobController.delete));

export default router;
