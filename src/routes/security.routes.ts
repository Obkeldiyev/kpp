import { Router } from "express";
import { SecurityController } from "@controllers/security.controller";
import { verifyToken } from "@middlewares";
import { asyncHandler } from "@utils";

const router = Router();

router.post("/permissions", verifyToken, asyncHandler(SecurityController.createPermission));
router.post("/roles", verifyToken, asyncHandler(SecurityController.createRole));
router.get("/roles", asyncHandler(SecurityController.listRoles));
router.post("/role-assignments", verifyToken, asyncHandler(SecurityController.assignRole));

export default router;
