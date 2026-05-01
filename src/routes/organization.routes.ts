import { Router } from "express";
import { OrganizationController } from "@controllers/organization.controller";
import { asyncHandler } from "@utils";

const router = Router();

router.post("/companies", asyncHandler(OrganizationController.createCompany));
router.get("/companies", asyncHandler(OrganizationController.listCompanies));
router.get("/companies/:id", asyncHandler(OrganizationController.getCompany));
router.patch("/companies/:id", asyncHandler(OrganizationController.updateCompany));
router.delete("/companies/:id", asyncHandler(OrganizationController.deleteCompany));
router.post("/departments", asyncHandler(OrganizationController.createDepartment));
router.get("/departments", asyncHandler(OrganizationController.listDepartments));
router.get("/departments/:id", asyncHandler(OrganizationController.getDepartment));
router.patch("/departments/:id", asyncHandler(OrganizationController.updateDepartment));
router.delete("/departments/:id", asyncHandler(OrganizationController.deleteDepartment));
router.post("/areas", asyncHandler(OrganizationController.createArea));
router.get("/areas", asyncHandler(OrganizationController.listAreas));
router.get("/areas/:id", asyncHandler(OrganizationController.getArea));
router.patch("/areas/:id", asyncHandler(OrganizationController.updateArea));
router.delete("/areas/:id", asyncHandler(OrganizationController.deleteArea));

export default router;
