import { Router } from "express";
import { SyncJobController } from "@controllers/sync.controller";
import { asyncHandler } from "@utils";

const router = Router();

router.post("/sync-jobs", asyncHandler(SyncJobController.create));
router.get("/sync-jobs", asyncHandler(SyncJobController.list));
router.get("/sync-jobs/:id", asyncHandler(SyncJobController.get));
router.patch("/sync-jobs/:id", asyncHandler(SyncJobController.update));
router.patch("/sync-jobs/:id/start", asyncHandler(SyncJobController.start));
router.patch("/sync-jobs/:id/finish", asyncHandler(SyncJobController.finish));
router.patch("/sync-jobs/:id/fail", asyncHandler(SyncJobController.fail));
router.delete("/sync-jobs/:id", asyncHandler(SyncJobController.delete));

export default router;
