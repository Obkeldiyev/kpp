import { Router } from "express";
import {
    AccessControlController,
    AccessControlOverviewController,
    AttendanceController,
    DashboardController,
    DeviceController,
    OrganizationController,
    PersonController,
    SecurityController,
} from "@controllers";
import { asyncHandler } from "@utils";
import { verifyToken } from "@middlewares";

const router = Router();

router.get("/dashboard", asyncHandler(DashboardController.summary));
router.get("/access-control/overview", asyncHandler(AccessControlOverviewController.overview));

router.post("/companies", asyncHandler(OrganizationController.createCompany));
router.get("/companies", asyncHandler(OrganizationController.listCompanies));
router.post("/departments", asyncHandler(OrganizationController.createDepartment));
router.get("/departments", asyncHandler(OrganizationController.listDepartments));
router.post("/areas", asyncHandler(OrganizationController.createArea));
router.get("/areas", asyncHandler(OrganizationController.listAreas));

router.post("/people", asyncHandler(PersonController.create));
router.get("/people", asyncHandler(PersonController.list));
router.post("/people/import", asyncHandler(PersonController.bulkImport));
router.get("/people/credential-status", asyncHandler(PersonController.credentialStatus));
router.get("/people/:id", asyncHandler(PersonController.get));
router.patch("/people/:id", asyncHandler(PersonController.update));
router.post("/people/:id/credentials", asyncHandler(PersonController.addCredential));

router.post("/devices", asyncHandler(DeviceController.upsertDevice));
router.get("/devices", asyncHandler(DeviceController.listDevices));
router.get("/devices/overview", asyncHandler(DeviceController.overview));
router.post("/devices/import", asyncHandler(DeviceController.bulkImportDevices));
router.post("/access-points", asyncHandler(DeviceController.upsertAccessPoint));
router.get("/access-points", asyncHandler(DeviceController.listAccessPoints));

router.post("/access-levels", asyncHandler(AccessControlController.createAccessLevel));
router.get("/access-levels", asyncHandler(AccessControlController.listAccessLevels));
router.post("/access-levels/:levelId/people", asyncHandler(AccessControlController.assignAccessLevelPerson));
router.post("/access-levels/:levelId/access-points", asyncHandler(AccessControlController.assignAccessLevelPoint));
router.post("/access-groups", asyncHandler(AccessControlController.createGroup));
router.get("/access-groups", asyncHandler(AccessControlController.listGroups));
router.post("/access-groups/:groupId/people", asyncHandler(AccessControlController.assignPerson));
router.post("/access-groups/:groupId/access-points", asyncHandler(AccessControlController.assignAccessPoint));
router.post("/access-exceptions", asyncHandler(AccessControlController.createException));
router.get("/access-check", asyncHandler(AccessControlController.checkPersonAccess));

router.post("/permissions", verifyToken, asyncHandler(SecurityController.createPermission));
router.post("/roles", verifyToken, asyncHandler(SecurityController.createRole));
router.get("/roles", asyncHandler(SecurityController.listRoles));
router.post("/role-assignments", verifyToken, asyncHandler(SecurityController.assignRole));

router.post("/attendance/shifts", asyncHandler(AttendanceController.createShift));
router.get("/attendance/shifts", asyncHandler(AttendanceController.listShifts));
router.post("/attendance/timetables", asyncHandler(AttendanceController.createScheduleTemplate));
router.get("/attendance/timetables", asyncHandler(AttendanceController.listScheduleTemplates));
router.post("/attendance/schedule-templates", asyncHandler(AttendanceController.createScheduleTemplate));
router.get("/attendance/schedule-templates", asyncHandler(AttendanceController.listScheduleTemplates));
router.post("/attendance/schedule-assignments", asyncHandler(AttendanceController.createScheduleAssignment));
router.get("/attendance/schedule-assignments", asyncHandler(AttendanceController.listScheduleAssignments));
router.post("/attendance/rules", asyncHandler(AttendanceController.createRule));
router.get("/attendance/rules", asyncHandler(AttendanceController.listRules));
router.post("/attendance/events", asyncHandler(AttendanceController.ingestEvent));
router.get("/attendance/transactions", asyncHandler(AttendanceController.listTransactions));
router.post("/attendance/records", asyncHandler(AttendanceController.createManualRecord));
router.get("/attendance/records", asyncHandler(AttendanceController.listRecords));
router.post("/attendance/approval-requests", asyncHandler(AttendanceController.createApprovalRequest));
router.get("/attendance/approval-requests", asyncHandler(AttendanceController.listApprovalRequests));
router.get("/attendance/report", asyncHandler(AttendanceController.report));

export default router;
