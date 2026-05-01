import { Router } from "express";
import { LicenseController } from "@controllers/license.controller";
import { PermissionAction } from "@prisma/client";
import { requirePermission, verifyToken } from "@middlewares";
import { asyncHandler } from "@utils";

const router = Router();
const access = (action: PermissionAction) => [verifyToken, requirePermission("licenses", action)];

router.post("/", ...access(PermissionAction.CREATE), asyncHandler(LicenseController.upsert));
router.get("/", ...access(PermissionAction.READ), asyncHandler(LicenseController.list));
router.get("/overview", ...access(PermissionAction.READ), asyncHandler(LicenseController.overview));
router.get("/usage-snapshots", ...access(PermissionAction.READ), asyncHandler(LicenseController.listUsage));
router.post("/usage-snapshots", ...access(PermissionAction.MANAGE), asyncHandler(LicenseController.captureUsage));
router.get("/allocations", ...access(PermissionAction.READ), asyncHandler(LicenseController.listAllocations));
router.get("/:id", ...access(PermissionAction.READ), asyncHandler(LicenseController.get));
router.patch("/:id", ...access(PermissionAction.UPDATE), asyncHandler(LicenseController.update));
router.delete("/:id", ...access(PermissionAction.DELETE), asyncHandler(LicenseController.delete));
router.post("/:licenseId/features", ...access(PermissionAction.MANAGE), asyncHandler(LicenseController.upsertFeature));
router.delete("/:licenseId/features/:featureId", ...access(PermissionAction.MANAGE), asyncHandler(LicenseController.deleteFeature));
router.get("/:licenseId/device-allocations", ...access(PermissionAction.READ), asyncHandler(LicenseController.listAllocations));
router.post("/:licenseId/device-allocations", ...access(PermissionAction.MANAGE), asyncHandler(LicenseController.allocateDevice));
router.patch("/:licenseId/device-allocations/:allocationId/release", ...access(PermissionAction.MANAGE), asyncHandler(LicenseController.releaseAllocation));
router.delete("/:licenseId/device-allocations/:allocationId", ...access(PermissionAction.MANAGE), asyncHandler(LicenseController.deleteAllocation));

export default router;
