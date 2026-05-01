import {
    ApprovalStatus,
    ApprovalType,
    AttendanceAreaMode,
    AttendanceCalculationMode,
    AttendanceDirection,
    AttendanceShiftType,
    DeviceStatus,
    HikCentralCredentialType,
    HikCentralDeviceType,
    HikCentralEventType,
    HikCentralLicenseFeatureCode,
    HikCentralLicenseStatus,
    HikCentralTrackingEventType,
    HikCentralTrackingStatus,
    HikCentralTrackingSubjectType,
    PermissionAction,
    PolicyStatus,
    Roles,
    ScheduleTargetType,
    SyncStatus,
    WeekDay,
} from "@prisma/client";
import { Request, Response } from "express";
import { prisma } from "@config";

export class PlatformMetadataController {
    static async health(_req: Request, res: Response) {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ success: true, data: { status: "ok", service: "hikcentral-api", checked_at: new Date() } });
    }

    static async capabilities(_req: Request, res: Response) {
        res.json({
            success: true,
            data: {
                modules: [
                    "dashboard",
                    "organization",
                    "people",
                    "devices",
                    "access-control",
                    "attendance",
                    "licenses",
                    "tracking",
                    "sync-jobs",
                    "security",
                ],
                routes: {
                    organization: ["companies", "departments", "areas"],
                    people: ["people", "credentials", "bulk-import", "credential-status"],
                    devices: ["devices", "access-points", "bulk-import", "overview"],
                    accessControl: ["access-levels", "access-groups", "access-exceptions", "access-check"],
                    attendance: ["shifts", "schedule-templates", "assignments", "rules", "events", "records", "reports"],
                    licenses: ["licenses", "features", "allocations", "usage-snapshots", "overview"],
                    tracking: ["sessions", "points", "latest-feed"],
                    syncJobs: ["create", "start", "finish", "fail", "cursor"],
                },
            },
        });
    }

    static async enums(_req: Request, res: Response) {
        res.json({
            success: true,
            data: {
                ApprovalStatus,
                ApprovalType,
                AttendanceAreaMode,
                AttendanceCalculationMode,
                AttendanceDirection,
                AttendanceShiftType,
                DeviceStatus,
                HikCentralCredentialType,
                HikCentralDeviceType,
                HikCentralEventType,
                HikCentralLicenseFeatureCode,
                HikCentralLicenseStatus,
                HikCentralTrackingEventType,
                HikCentralTrackingStatus,
                HikCentralTrackingSubjectType,
                PermissionAction,
                PolicyStatus,
                Roles,
                ScheduleTargetType,
                SyncStatus,
                WeekDay,
            },
        });
    }
}
