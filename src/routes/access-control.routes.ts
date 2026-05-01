import { Router } from "express";
import { AccessControlController } from "@controllers/access-control.controller";
import { PermissionAction } from "@prisma/client";
import { requirePermission, verifyToken } from "@middlewares";
import { asyncHandler } from "@utils";

const router = Router();
const access = (action: PermissionAction) => [verifyToken, requirePermission("access-control", action)];

router.post("/access-levels", ...access(PermissionAction.CREATE), asyncHandler(AccessControlController.createAccessLevel));
router.get("/access-levels", ...access(PermissionAction.READ), asyncHandler(AccessControlController.listAccessLevels));
router.get("/access-levels/:id", ...access(PermissionAction.READ), asyncHandler(AccessControlController.getAccessLevel));
router.patch("/access-levels/:id", ...access(PermissionAction.UPDATE), asyncHandler(AccessControlController.updateAccessLevel));
router.delete("/access-levels/:id", ...access(PermissionAction.DELETE), asyncHandler(AccessControlController.deleteAccessLevel));
router.post("/access-levels/:levelId/people", ...access(PermissionAction.MANAGE), asyncHandler(AccessControlController.assignAccessLevelPerson));
router.post("/access-levels/:levelId/access-points", ...access(PermissionAction.MANAGE), asyncHandler(AccessControlController.assignAccessLevelPoint));
router.post("/access-groups", ...access(PermissionAction.CREATE), asyncHandler(AccessControlController.createGroup));
router.get("/access-groups", ...access(PermissionAction.READ), asyncHandler(AccessControlController.listGroups));
router.get("/access-groups/:id", ...access(PermissionAction.READ), asyncHandler(AccessControlController.getGroup));
router.patch("/access-groups/:id", ...access(PermissionAction.UPDATE), asyncHandler(AccessControlController.updateGroup));
router.delete("/access-groups/:id", ...access(PermissionAction.DELETE), asyncHandler(AccessControlController.deleteGroup));
router.post("/access-groups/:groupId/people", ...access(PermissionAction.MANAGE), asyncHandler(AccessControlController.assignPerson));
router.post("/access-groups/:groupId/access-points", ...access(PermissionAction.MANAGE), asyncHandler(AccessControlController.assignAccessPoint));
router.post("/access-exceptions", ...access(PermissionAction.MANAGE), asyncHandler(AccessControlController.createException));
router.get("/access-check", verifyToken, asyncHandler(AccessControlController.checkPersonAccess));

export default router;
