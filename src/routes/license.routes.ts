import { Router } from "express";
import { LicenseController } from "@controllers/license.controller";
import { asyncHandler } from "@utils";

const router = Router();

router.post("/", asyncHandler(LicenseController.upsert));
router.get("/", asyncHandler(LicenseController.list));
router.get("/overview", asyncHandler(LicenseController.overview));
router.get("/usage-snapshots", asyncHandler(LicenseController.listUsage));
router.post("/usage-snapshots", asyncHandler(LicenseController.captureUsage));
router.get("/allocations", asyncHandler(LicenseController.listAllocations));
router.get("/:id", asyncHandler(LicenseController.get));
router.patch("/:id", asyncHandler(LicenseController.update));
router.delete("/:id", asyncHandler(LicenseController.delete));
router.post("/:licenseId/features", asyncHandler(LicenseController.upsertFeature));
router.delete("/:licenseId/features/:featureId", asyncHandler(LicenseController.deleteFeature));
router.get("/:licenseId/device-allocations", asyncHandler(LicenseController.listAllocations));
router.post("/:licenseId/device-allocations", asyncHandler(LicenseController.allocateDevice));
router.patch("/:licenseId/device-allocations/:allocationId/release", asyncHandler(LicenseController.releaseAllocation));
router.delete("/:licenseId/device-allocations/:allocationId", asyncHandler(LicenseController.deleteAllocation));

export default router;
