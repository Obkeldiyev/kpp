import { Router } from "express";
import { PersonController } from "@controllers/person.controller";
import { PermissionAction } from "@prisma/client";
import { requirePermission, verifyBridgeToken, verifyToken } from "@middlewares";
import { asyncHandler } from "@utils";

const router = Router();
const access = (action: PermissionAction) => [verifyToken, requirePermission("people", action)];

router.post("/", ...access(PermissionAction.CREATE), asyncHandler(PersonController.create));
router.post("/bridge", verifyBridgeToken, asyncHandler(PersonController.upsertFromBridge));
router.get("/", ...access(PermissionAction.READ), asyncHandler(PersonController.list));
router.post("/import", ...access(PermissionAction.MANAGE), asyncHandler(PersonController.bulkImport));
router.get("/credential-status", ...access(PermissionAction.READ), asyncHandler(PersonController.credentialStatus));
router.get("/:id", ...access(PermissionAction.READ), asyncHandler(PersonController.get));
router.patch("/:id", ...access(PermissionAction.UPDATE), asyncHandler(PersonController.update));
router.delete("/:id", ...access(PermissionAction.DELETE), asyncHandler(PersonController.delete));
router.get("/:id/credentials", ...access(PermissionAction.READ), asyncHandler(PersonController.listCredentials));
router.post("/:id/credentials", ...access(PermissionAction.MANAGE), asyncHandler(PersonController.addCredential));
router.patch("/:id/credentials/:credentialId", ...access(PermissionAction.MANAGE), asyncHandler(PersonController.updateCredential));
router.delete("/:id/credentials/:credentialId", ...access(PermissionAction.MANAGE), asyncHandler(PersonController.deleteCredential));

export default router;
