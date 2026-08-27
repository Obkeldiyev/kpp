import { Router } from "express";
import { AuthController } from "@controllers/auth.controller";
import { asyncHandler } from "@utils";

const router = Router();

router.get("/auth/status", asyncHandler(AuthController.status));
router.post("/auth/setup", asyncHandler(AuthController.setup));
router.post("/auth/login", asyncHandler(AuthController.login));

export default router;
