import { Router } from "express";
import { SecurityController } from "@controllers/security.controller";
import { PermissionAction } from "@prisma/client";
import { requirePermission, verifyToken } from "@middlewares";
import { asyncHandler } from "@utils";

const router = Router();
const manageSecurity = [verifyToken, requirePermission("security", PermissionAction.MANAGE)];

router.post("/permissions/defaults", ...manageSecurity, asyncHandler(SecurityController.seedDefaultPermissions));
router.post("/permissions", ...manageSecurity, asyncHandler(SecurityController.createPermission));
router.post("/roles", ...manageSecurity, asyncHandler(SecurityController.createRole));
router.get("/roles", verifyToken, requirePermission("security", PermissionAction.READ), asyncHandler(SecurityController.listRoles));
router.post("/role-assignments", ...manageSecurity, asyncHandler(SecurityController.assignRole));
router.get("/admins", verifyToken, requirePermission("security", PermissionAction.READ), asyncHandler(SecurityController.listAdmins));
router.post("/admins", ...manageSecurity, asyncHandler(SecurityController.createAdmin));

export default router;
