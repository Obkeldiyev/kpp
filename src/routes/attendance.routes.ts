import { Router } from "express";
import { AttendanceController } from "@controllers/attendance.controller";
import { asyncHandler } from "@utils";

const router = Router();

router.post("/shifts", asyncHandler(AttendanceController.createShift));
router.get("/shifts", asyncHandler(AttendanceController.listShifts));
router.patch("/shifts/:id", asyncHandler(AttendanceController.updateShift));
router.delete("/shifts/:id", asyncHandler(AttendanceController.deleteShift));
router.post("/timetables", asyncHandler(AttendanceController.createScheduleTemplate));
router.get("/timetables", asyncHandler(AttendanceController.listScheduleTemplates));
router.post("/schedule-templates", asyncHandler(AttendanceController.createScheduleTemplate));
router.get("/schedule-templates", asyncHandler(AttendanceController.listScheduleTemplates));
router.patch("/schedule-templates/:id", asyncHandler(AttendanceController.updateScheduleTemplate));
router.delete("/schedule-templates/:id", asyncHandler(AttendanceController.deleteScheduleTemplate));
router.post("/schedule-assignments", asyncHandler(AttendanceController.createScheduleAssignment));
router.get("/schedule-assignments", asyncHandler(AttendanceController.listScheduleAssignments));
router.delete("/schedule-assignments/:id", asyncHandler(AttendanceController.deleteScheduleAssignment));
router.post("/rules", asyncHandler(AttendanceController.createRule));
router.get("/rules", asyncHandler(AttendanceController.listRules));
router.patch("/rules/:id", asyncHandler(AttendanceController.updateRule));
router.delete("/rules/:id", asyncHandler(AttendanceController.deleteRule));
router.post("/events", asyncHandler(AttendanceController.ingestEvent));
router.get("/transactions", asyncHandler(AttendanceController.listTransactions));
router.post("/records", asyncHandler(AttendanceController.createManualRecord));
router.get("/records", asyncHandler(AttendanceController.listRecords));
router.delete("/records/:id", asyncHandler(AttendanceController.deleteRecord));
router.post("/approval-requests", asyncHandler(AttendanceController.createApprovalRequest));
router.get("/approval-requests", asyncHandler(AttendanceController.listApprovalRequests));
router.get("/report", asyncHandler(AttendanceController.report));

export default router;
