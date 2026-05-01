import {
    AttendanceAreaMode,
    AttendanceDirection,
    AttendanceShiftType,
    ApprovalStatus,
    ApprovalType,
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
    Prisma,
    Roles,
    ScheduleTargetType,
    WeekDay,
} from "@prisma/client";
import { Request, Response } from "express";
import { prisma } from "@config";
import { combineDateAndTime, endOfDay, minutesBetween, paginate, startOfDay, toDate } from "@utils";
import {
    asBoolean,
    asNumber,
    asString,
    enumValue,
    eventDirection,
    includePerson,
    resolveAttendanceAreaMode,
    resolvePerson,
    updateAttendanceFromEvent,
    weekDayName,
} from "./shared";
export class DashboardController {
    static async summary(req: Request, res: Response) {
        const from = toDate(req.query.from) || startOfDay(new Date());
        const to = toDate(req.query.to) || endOfDay(new Date());

        const [
            people,
            departments,
            areas,
            onlineDevices,
            offlineDevices,
            accessGroups,
            events,
            attendanceRecords,
            deniedEvents,
        ] = await Promise.all([
            prisma.user.count({ where: { is_active: true } }),
            prisma.department.count(),
            prisma.area.count(),
            prisma.device.count({ where: { network_status: "ONLINE" } }),
            prisma.device.count({ where: { network_status: { not: "ONLINE" } } }),
            prisma.accessGroup.count({ where: { status: "ACTIVE" } }),
            prisma.hikCentralAccessEvent.count({ where: { event_time: { gte: from, lte: to } } }),
            prisma.attendanceRecord.count({ where: { work_date: { gte: startOfDay(from), lte: endOfDay(to) } } }),
            prisma.hikCentralAccessEvent.count({
                where: {
                    event_time: { gte: from, lte: to },
                    OR: [{ event_type: "ACCESS_DENIED" }, { success: false }],
                },
            }),
        ]);

        res.json({
            success: true,
            data: {
                people,
                departments,
                areas,
                devices: { online: onlineDevices, offline: offlineDevices, total: onlineDevices + offlineDevices },
                accessGroups,
                events,
                deniedEvents,
                attendanceRecords,
            },
        });
    }
}

export class AccessControlOverviewController {
    static async overview(_req: Request, res: Response) {
        const [
            totalPeople,
            cardConfigured,
            faceConfigured,
            fingerprintConfigured,
            irisConfigured,
            palmConfigured,
            accessLevels,
            activeAccessLevels,
        ] = await Promise.all([
            prisma.user.count({ where: { is_active: true } }),
            prisma.accessCredential.count({ where: { type: "CARD", is_active: true } }),
            prisma.faceCredential.count(),
            prisma.accessCredential.count({ where: { type: "FINGERPRINT", is_active: true } }),
            prisma.accessCredential.count({ where: { type: "UNKNOWN", value: { startsWith: "IRIS:" }, is_active: true } }),
            prisma.accessCredential.count({ where: { type: "UNKNOWN", value: { startsWith: "PALM:" }, is_active: true } }),
            prisma.accessLevel.count(),
            prisma.accessLevel.count({ where: { status: "ACTIVE" } }),
        ]);

        res.json({
            success: true,
            data: {
                totalPeople,
                accessLevels: {
                    total: accessLevels,
                    active: activeAccessLevels,
                    disabled: accessLevels - activeAccessLevels,
                },
                credentials: {
                    card: { configured: cardConfigured, notAdded: Math.max(totalPeople - cardConfigured, 0) },
                    face: { configured: faceConfigured, notAdded: Math.max(totalPeople - faceConfigured, 0) },
                    fingerprint: {
                        configured: fingerprintConfigured,
                        notAdded: Math.max(totalPeople - fingerprintConfigured, 0),
                    },
                    iris: { configured: irisConfigured, notAdded: Math.max(totalPeople - irisConfigured, 0) },
                    palm: { configured: palmConfigured, notAdded: Math.max(totalPeople - palmConfigured, 0) },
                },
            },
        });
    }
}

