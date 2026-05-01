import { Router } from "express";
import { TrackingController } from "@controllers/tracking.controller";
import { asyncHandler } from "@utils";

const router = Router();

router.post("/sessions", asyncHandler(TrackingController.startSession));
router.get("/sessions", asyncHandler(TrackingController.listSessions));
router.get("/sessions/:id", asyncHandler(TrackingController.getSession));
router.patch("/sessions/:id", asyncHandler(TrackingController.updateSession));
router.delete("/sessions/:id", asyncHandler(TrackingController.deleteSession));
router.post("/sessions/:id/points", asyncHandler(TrackingController.addPoint));
router.patch("/sessions/:id/finish", asyncHandler(TrackingController.finishSession));
router.get("/points", asyncHandler(TrackingController.latestPoints));
router.patch("/points/:pointId", asyncHandler(TrackingController.updatePoint));
router.delete("/points/:pointId", asyncHandler(TrackingController.deletePoint));

export default router;
