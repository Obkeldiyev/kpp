import { Router } from "express";
import { DeviceController } from "@controllers/device.controller";
import { PermissionAction } from "@prisma/client";
import { requirePermission, verifyToken } from "@middlewares";
import { asyncHandler } from "@utils";

const router = Router();
const access = (action: PermissionAction) => [verifyToken, requirePermission("devices", action)];

router.post("/devices", ...access(PermissionAction.CREATE), asyncHandler(DeviceController.upsertDevice));
router.get("/devices", ...access(PermissionAction.READ), asyncHandler(DeviceController.listDevices));
router.get("/devices/overview", ...access(PermissionAction.READ), asyncHandler(DeviceController.overview));
router.post("/devices/import", ...access(PermissionAction.MANAGE), asyncHandler(DeviceController.bulkImportDevices));
router.get("/devices/:id", ...access(PermissionAction.READ), asyncHandler(DeviceController.getDevice));
router.patch("/devices/:id", ...access(PermissionAction.UPDATE), asyncHandler(DeviceController.updateDevice));
router.delete("/devices/:id", ...access(PermissionAction.DELETE), asyncHandler(DeviceController.deleteDevice));
router.post("/access-points", ...access(PermissionAction.CREATE), asyncHandler(DeviceController.upsertAccessPoint));
router.get("/access-points", ...access(PermissionAction.READ), asyncHandler(DeviceController.listAccessPoints));
router.get("/access-points/:id", ...access(PermissionAction.READ), asyncHandler(DeviceController.getAccessPoint));
router.patch("/access-points/:id", ...access(PermissionAction.UPDATE), asyncHandler(DeviceController.updateAccessPoint));
router.delete("/access-points/:id", ...access(PermissionAction.DELETE), asyncHandler(DeviceController.deleteAccessPoint));

export default router;
