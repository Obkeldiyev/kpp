import { Router } from "express";
import { PlatformMetadataController } from "@controllers/metadata.controller";
import { PermissionAction } from "@prisma/client";
import { requirePermission, verifyToken } from "@middlewares";
import { asyncHandler } from "@utils";

const router = Router();

router.get("/health", asyncHandler(PlatformMetadataController.health));
router.get("/metadata/capabilities", verifyToken, requirePermission("metadata", PermissionAction.READ), asyncHandler(PlatformMetadataController.capabilities));
router.get("/metadata/enums", verifyToken, requirePermission("metadata", PermissionAction.READ), asyncHandler(PlatformMetadataController.enums));

export default router;
