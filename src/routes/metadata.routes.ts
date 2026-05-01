import { Router } from "express";
import { PlatformMetadataController } from "@controllers/metadata.controller";
import { asyncHandler } from "@utils";

const router = Router();

router.get("/health", asyncHandler(PlatformMetadataController.health));
router.get("/metadata/capabilities", asyncHandler(PlatformMetadataController.capabilities));
router.get("/metadata/enums", asyncHandler(PlatformMetadataController.enums));

export default router;
