import { Router } from "express";
import { AccessControlController } from "@controllers/access-control.controller";
import { asyncHandler } from "@utils";

const router = Router();

router.post("/access-levels", asyncHandler(AccessControlController.createAccessLevel));
router.get("/access-levels", asyncHandler(AccessControlController.listAccessLevels));
router.get("/access-levels/:id", asyncHandler(AccessControlController.getAccessLevel));
router.patch("/access-levels/:id", asyncHandler(AccessControlController.updateAccessLevel));
router.delete("/access-levels/:id", asyncHandler(AccessControlController.deleteAccessLevel));
router.post("/access-levels/:levelId/people", asyncHandler(AccessControlController.assignAccessLevelPerson));
router.post("/access-levels/:levelId/access-points", asyncHandler(AccessControlController.assignAccessLevelPoint));
router.post("/access-groups", asyncHandler(AccessControlController.createGroup));
router.get("/access-groups", asyncHandler(AccessControlController.listGroups));
router.get("/access-groups/:id", asyncHandler(AccessControlController.getGroup));
router.patch("/access-groups/:id", asyncHandler(AccessControlController.updateGroup));
router.delete("/access-groups/:id", asyncHandler(AccessControlController.deleteGroup));
router.post("/access-groups/:groupId/people", asyncHandler(AccessControlController.assignPerson));
router.post("/access-groups/:groupId/access-points", asyncHandler(AccessControlController.assignAccessPoint));
router.post("/access-exceptions", asyncHandler(AccessControlController.createException));
router.get("/access-check", asyncHandler(AccessControlController.checkPersonAccess));

export default router;
