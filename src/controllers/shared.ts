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

export const includePerson = {
    company: true,
    department: true,
    images: true,
    face_credentials: true,
    access_credentials: true,
    access_group_members: {
        include: {
            access_group: {
                include: {
                    access_points: {
                        include: {
                            access_point: true,
                        },
                    },
                },
            },
        },
    },
    access_level_members: {
        include: {
            access_level: {
                include: {
                    access_points: {
                        include: {
                            access_point: true,
                        },
                    },
                },
            },
        },
    },
    schedule_assignments: {
        include: {
            schedule_template: true,
            shift: true,
        },
    },
} satisfies Prisma.UserInclude;

export function asString(value: unknown): string | undefined {
    if (value === undefined || value === null || value === "") return undefined;
    return String(value);
}

export function asBoolean(value: unknown, fallback = false): boolean {
    if (value === undefined || value === null) return fallback;
    return value === true || value === "true";
}

export function asNumber(value: unknown): number | undefined {
    if (value === undefined || value === null || value === "") return undefined;
    const number = Number(value);
    return Number.isFinite(number) ? number : undefined;
}

export function enumValue<T extends Record<string, string>>(source: T, value: unknown, fallback: T[keyof T]): T[keyof T] {
    const incoming = String(value || "").toUpperCase();
    return Object.values(source).includes(incoming) ? (incoming as T[keyof T]) : fallback;
}

export function eventDirection(eventType: HikCentralEventType, areaMode?: AttendanceAreaMode | null): AttendanceDirection | null {
    if (areaMode === "CHECK_IN") return "CHECK_IN";
    if (areaMode === "CHECK_OUT") return "CHECK_OUT";
    if (eventType === "CHECK_IN") return "CHECK_IN";
    if (eventType === "CHECK_OUT") return "CHECK_OUT";
    return null;
}

export function weekDayName(date: Date): string {
    return ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"][date.getDay()];
}

export async function resolvePerson(externalId?: string, userId?: string) {
    if (userId) return prisma.user.findUnique({ where: { id: userId } });
    if (!externalId) return null;

    return prisma.user.findFirst({
        where: {
            OR: [
                { hikcentral_person_id: externalId },
                { hikcentral_employee_no: externalId },
                { id_number: externalId },
                { identification: externalId },
            ],
        },
    });
}

export async function resolveAttendanceAreaMode(accessPointId?: string | null, departmentId?: string | null) {
    if (!accessPointId) return null;

    const areaRule = await prisma.attendanceAreaRule.findFirst({
        where: {
            access_point_id: accessPointId,
            attendance_rule: {
                is_active: true,
                OR: [{ department_id: departmentId || undefined }, { is_global: true }],
            },
        },
        orderBy: [{ attendance_rule: { is_global: "asc" } }, { created_at: "desc" }],
    });

    return areaRule?.mode || null;
}

export async function updateAttendanceFromEvent(params: {
    userId?: string | null;
    departmentId?: string | null;
    personExternalId?: string | null;
    personName?: string | null;
    eventTime: Date;
    direction: AttendanceDirection;
}) {
    const workDate = startOfDay(params.eventTime);
    const current = await prisma.attendanceRecord.findFirst({
        where: {
            work_date: workDate,
            period_name: "Default",
            OR: [
                params.userId ? { user_id: params.userId } : undefined,
                params.personExternalId ? { identifier: params.personExternalId } : undefined,
            ].filter(Boolean) as Prisma.AttendanceRecordWhereInput[],
        },
    });

    const nextCheckIn =
        params.direction === "CHECK_IN" && (!current?.check_in_at || params.eventTime < current.check_in_at)
            ? params.eventTime
            : current?.check_in_at || null;
    const nextCheckOut =
        params.direction === "CHECK_OUT" && (!current?.check_out_at || params.eventTime > current.check_out_at)
            ? params.eventTime
            : current?.check_out_at || null;

    const data = {
        identifier: params.personExternalId || current?.identifier || undefined,
        full_name: params.personName || current?.full_name || undefined,
        work_date: workDate,
        week_day: weekDayName(workDate),
        period_name: "Default",
        check_in_at: nextCheckIn || undefined,
        check_out_at: nextCheckOut || undefined,
        check_in_time: nextCheckIn ? nextCheckIn.toTimeString().slice(0, 5) : undefined,
        check_out_time: nextCheckOut ? nextCheckOut.toTimeString().slice(0, 5) : undefined,
        duration_minutes: minutesBetween(nextCheckIn, nextCheckOut) || undefined,
        total_duration_minutes: minutesBetween(nextCheckIn, nextCheckOut) || undefined,
        user_id: params.userId || undefined,
        department_id: params.departmentId || undefined,
    };

    if (current) {
        return prisma.attendanceRecord.update({
            where: { id: current.id },
            data,
        });
    }

    return prisma.attendanceRecord.create({ data });
}

