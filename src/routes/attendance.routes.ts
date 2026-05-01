import { Router } from "express";
import { AttendanceController } from "@controllers/attendance.controller";
import { PermissionAction } from "@prisma/client";
import { requirePermission, verifyToken } from "@middlewares";
import { asyncHandler } from "@utils";

const router = Router();
const access = (action: PermissionAction) => [verifyToken, requirePermission("attendance", action)];

router.post("/shifts", ...access(PermissionAction.CREATE), asyncHandler(AttendanceController.createShift));
router.get("/shifts", ...access(PermissionAction.READ), asyncHandler(AttendanceController.listShifts));
router.patch("/shifts/:id", ...access(PermissionAction.UPDATE), asyncHandler(AttendanceController.updateShift));
router.delete("/shifts/:id", ...access(PermissionAction.DELETE), asyncHandler(AttendanceController.deleteShift));
router.post("/timetables", ...access(PermissionAction.CREATE), asyncHandler(AttendanceController.createScheduleTemplate));
router.get("/timetables", ...access(PermissionAction.READ), asyncHandler(AttendanceController.listScheduleTemplates));
router.post("/schedule-templates", ...access(PermissionAction.CREATE), asyncHandler(AttendanceController.createScheduleTemplate));
router.get("/schedule-templates", ...access(PermissionAction.READ), asyncHandler(AttendanceController.listScheduleTemplates));
router.patch("/schedule-templates/:id", ...access(PermissionAction.UPDATE), asyncHandler(AttendanceController.updateScheduleTemplate));
router.delete("/schedule-templates/:id", ...access(PermissionAction.DELETE), asyncHandler(AttendanceController.deleteScheduleTemplate));
router.post("/schedule-assignments", ...access(PermissionAction.CREATE), asyncHandler(AttendanceController.createScheduleAssignment));
router.get("/schedule-assignments", ...access(PermissionAction.READ), asyncHandler(AttendanceController.listScheduleAssignments));
router.delete("/schedule-assignments/:id", ...access(PermissionAction.DELETE), asyncHandler(AttendanceController.deleteScheduleAssignment));
router.post("/rules", ...access(PermissionAction.CREATE), asyncHandler(AttendanceController.createRule));
router.get("/rules", ...access(PermissionAction.READ), asyncHandler(AttendanceController.listRules));
router.patch("/rules/:id", ...access(PermissionAction.UPDATE), asyncHandler(AttendanceController.updateRule));
router.delete("/rules/:id", ...access(PermissionAction.DELETE), asyncHandler(AttendanceController.deleteRule));
router.post("/events", ...access(PermissionAction.CREATE), asyncHandler(AttendanceController.ingestEvent));
router.get("/transactions", ...access(PermissionAction.READ), asyncHandler(AttendanceController.listTransactions));
router.post("/records", ...access(PermissionAction.CREATE), asyncHandler(AttendanceController.createManualRecord));
router.get("/records", ...access(PermissionAction.READ), asyncHandler(AttendanceController.listRecords));
router.delete("/records/:id", ...access(PermissionAction.DELETE), asyncHandler(AttendanceController.deleteRecord));
router.post("/approval-requests", verifyToken, asyncHandler(AttendanceController.createApprovalRequest));
router.get("/approval-requests", ...access(PermissionAction.READ), asyncHandler(AttendanceController.listApprovalRequests));
router.get("/report", ...access(PermissionAction.READ), asyncHandler(AttendanceController.report));

export default router;
