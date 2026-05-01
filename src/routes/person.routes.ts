import { Router } from "express";
import { PersonController } from "@controllers/person.controller";
import { asyncHandler } from "@utils";

const router = Router();

router.post("/", asyncHandler(PersonController.create));
router.get("/", asyncHandler(PersonController.list));
router.post("/import", asyncHandler(PersonController.bulkImport));
router.get("/credential-status", asyncHandler(PersonController.credentialStatus));
router.get("/:id", asyncHandler(PersonController.get));
router.patch("/:id", asyncHandler(PersonController.update));
router.delete("/:id", asyncHandler(PersonController.delete));
router.get("/:id/credentials", asyncHandler(PersonController.listCredentials));
router.post("/:id/credentials", asyncHandler(PersonController.addCredential));
router.patch("/:id/credentials/:credentialId", asyncHandler(PersonController.updateCredential));
router.delete("/:id/credentials/:credentialId", asyncHandler(PersonController.deleteCredential));

export default router;
