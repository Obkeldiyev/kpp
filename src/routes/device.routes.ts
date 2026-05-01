import { Router } from "express";
import { DeviceController } from "@controllers/device.controller";
import { asyncHandler } from "@utils";

const router = Router();

router.post("/devices", asyncHandler(DeviceController.upsertDevice));
router.get("/devices", asyncHandler(DeviceController.listDevices));
router.get("/devices/overview", asyncHandler(DeviceController.overview));
router.post("/devices/import", asyncHandler(DeviceController.bulkImportDevices));
router.get("/devices/:id", asyncHandler(DeviceController.getDevice));
router.patch("/devices/:id", asyncHandler(DeviceController.updateDevice));
router.delete("/devices/:id", asyncHandler(DeviceController.deleteDevice));
router.post("/access-points", asyncHandler(DeviceController.upsertAccessPoint));
router.get("/access-points", asyncHandler(DeviceController.listAccessPoints));
router.get("/access-points/:id", asyncHandler(DeviceController.getAccessPoint));
router.patch("/access-points/:id", asyncHandler(DeviceController.updateAccessPoint));
router.delete("/access-points/:id", asyncHandler(DeviceController.deleteAccessPoint));

export default router;
