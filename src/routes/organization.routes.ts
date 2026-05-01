import { Router } from "express";
import { OrganizationController } from "@controllers/organization.controller";
import { PermissionAction } from "@prisma/client";
import { requirePermission, verifyToken } from "@middlewares";
import { asyncHandler } from "@utils";

const router = Router();
const access = (action: PermissionAction) => [verifyToken, requirePermission("organization", action)];

router.post("/companies", ...access(PermissionAction.CREATE), asyncHandler(OrganizationController.createCompany));
router.get("/companies", ...access(PermissionAction.READ), asyncHandler(OrganizationController.listCompanies));
router.get("/companies/:id", ...access(PermissionAction.READ), asyncHandler(OrganizationController.getCompany));
router.patch("/companies/:id", ...access(PermissionAction.UPDATE), asyncHandler(OrganizationController.updateCompany));
router.delete("/companies/:id", ...access(PermissionAction.DELETE), asyncHandler(OrganizationController.deleteCompany));
router.post("/departments", ...access(PermissionAction.CREATE), asyncHandler(OrganizationController.createDepartment));
router.get("/departments", ...access(PermissionAction.READ), asyncHandler(OrganizationController.listDepartments));
router.get("/departments/:id", ...access(PermissionAction.READ), asyncHandler(OrganizationController.getDepartment));
router.patch("/departments/:id", ...access(PermissionAction.UPDATE), asyncHandler(OrganizationController.updateDepartment));
router.delete("/departments/:id", ...access(PermissionAction.DELETE), asyncHandler(OrganizationController.deleteDepartment));
router.post("/areas", ...access(PermissionAction.CREATE), asyncHandler(OrganizationController.createArea));
router.get("/areas", ...access(PermissionAction.READ), asyncHandler(OrganizationController.listAreas));
router.get("/areas/:id", ...access(PermissionAction.READ), asyncHandler(OrganizationController.getArea));
router.patch("/areas/:id", ...access(PermissionAction.UPDATE), asyncHandler(OrganizationController.updateArea));
router.delete("/areas/:id", ...access(PermissionAction.DELETE), asyncHandler(OrganizationController.deleteArea));

export default router;
