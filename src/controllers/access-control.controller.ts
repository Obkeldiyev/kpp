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
export class AccessControlController {
    static async createAccessLevel(req: Request, res: Response) {
        const accessLevel = await prisma.accessLevel.create({
            data: {
                name: req.body.name,
                description: asString(req.body.description),
                status: enumValue(PolicyStatus, req.body.status, PolicyStatus.ACTIVE),
                hikcentral_level_id: asString(req.body.hikcentral_level_id),
                company_id: asString(req.body.company_id),
                starts_at: toDate(req.body.starts_at),
                ends_at: toDate(req.body.ends_at),
                people: req.body.user_ids?.length
                    ? { create: req.body.user_ids.map((user_id: string) => ({ user_id })) }
                    : undefined,
                groups: req.body.access_group_ids?.length
                    ? { create: req.body.access_group_ids.map((access_group_id: string) => ({ access_group_id })) }
                    : undefined,
                access_points: req.body.access_points?.length
                    ? {
                          create: req.body.access_points.map((point: any) => ({
                              access_point_id: point.access_point_id,
                              can_enter: point.can_enter === undefined ? true : asBoolean(point.can_enter, true),
                              can_exit: point.can_exit === undefined ? true : asBoolean(point.can_exit, true),
                              starts_at: toDate(point.starts_at),
                              ends_at: toDate(point.ends_at),
                          })),
                      }
                    : undefined,
            },
            include: {
                people: { include: { user: true } },
                groups: { include: { access_group: true } },
                access_points: { include: { access_point: true } },
            },
        });

        res.status(201).json({ success: true, data: accessLevel });
    }

    static async listAccessLevels(req: Request, res: Response) {
        const accessLevels = await prisma.accessLevel.findMany({
            where: {
                company_id: asString(req.query.company_id),
                status: req.query.status ? enumValue(PolicyStatus, req.query.status, PolicyStatus.ACTIVE) : undefined,
            },
            include: {
                people: { include: { user: true } },
                groups: { include: { access_group: true } },
                access_points: { include: { access_point: true } },
            },
            orderBy: { created_at: "desc" },
        });

        res.json({ success: true, data: accessLevels });
    }

    static async getAccessLevel(req: Request, res: Response) {
        const accessLevel = await prisma.accessLevel.findUnique({
            where: { id: req.params.id },
            include: {
                company: true,
                people: { include: { user: true } },
                groups: { include: { access_group: true } },
                access_points: { include: { access_point: true } },
            },
        });

        res.json({ success: true, data: accessLevel });
    }

    static async updateAccessLevel(req: Request, res: Response) {
        const accessLevel = await prisma.accessLevel.update({
            where: { id: req.params.id },
            data: {
                name: asString(req.body.name),
                description: asString(req.body.description),
                status: req.body.status ? enumValue(PolicyStatus, req.body.status, PolicyStatus.ACTIVE) : undefined,
                hikcentral_level_id: asString(req.body.hikcentral_level_id),
                company_id: asString(req.body.company_id),
                starts_at: toDate(req.body.starts_at),
                ends_at: toDate(req.body.ends_at),
            },
            include: {
                people: { include: { user: true } },
                groups: { include: { access_group: true } },
                access_points: { include: { access_point: true } },
            },
        });

        res.json({ success: true, data: accessLevel });
    }

    static async deleteAccessLevel(req: Request, res: Response) {
        await prisma.accessLevel.delete({ where: { id: req.params.id } });
        res.json({ success: true, data: { id: req.params.id } });
    }

    static async assignAccessLevelPerson(req: Request, res: Response) {
        const item = await prisma.accessLevelMember.upsert({
            where: {
                access_level_id_user_id: {
                    access_level_id: req.params.levelId,
                    user_id: req.body.user_id,
                },
            },
            create: {
                access_level_id: req.params.levelId,
                user_id: req.body.user_id,
                starts_at: toDate(req.body.starts_at),
                ends_at: toDate(req.body.ends_at),
            },
            update: {
                starts_at: toDate(req.body.starts_at),
                ends_at: toDate(req.body.ends_at),
            },
        });

        res.status(201).json({ success: true, data: item });
    }

    static async assignAccessLevelPoint(req: Request, res: Response) {
        const item = await prisma.accessLevelAccessPoint.upsert({
            where: {
                access_level_id_access_point_id: {
                    access_level_id: req.params.levelId,
                    access_point_id: req.body.access_point_id,
                },
            },
            create: {
                access_level_id: req.params.levelId,
                access_point_id: req.body.access_point_id,
                can_enter: req.body.can_enter === undefined ? true : asBoolean(req.body.can_enter, true),
                can_exit: req.body.can_exit === undefined ? true : asBoolean(req.body.can_exit, true),
                starts_at: toDate(req.body.starts_at),
                ends_at: toDate(req.body.ends_at),
            },
            update: {
                can_enter: req.body.can_enter === undefined ? undefined : asBoolean(req.body.can_enter, true),
                can_exit: req.body.can_exit === undefined ? undefined : asBoolean(req.body.can_exit, true),
                starts_at: toDate(req.body.starts_at),
                ends_at: toDate(req.body.ends_at),
            },
        });

        res.status(201).json({ success: true, data: item });
    }

    static async createGroup(req: Request, res: Response) {
        const group = await prisma.accessGroup.create({
            data: {
                name: req.body.name,
                description: asString(req.body.description),
                status: enumValue(PolicyStatus, req.body.status, PolicyStatus.ACTIVE),
                hikcentral_group_id: asString(req.body.hikcentral_group_id),
                department_id: asString(req.body.department_id),
            },
        });

        res.status(201).json({ success: true, data: group });
    }

    static async listGroups(req: Request, res: Response) {
        const groups = await prisma.accessGroup.findMany({
            where: {
                department_id: asString(req.query.department_id),
                status: req.query.status ? enumValue(PolicyStatus, req.query.status, PolicyStatus.ACTIVE) : undefined,
            },
            include: {
                department: true,
                members: { include: { user: true } },
                access_points: { include: { access_point: true } },
            },
            orderBy: { name: "asc" },
        });

        res.json({ success: true, data: groups });
    }

    static async getGroup(req: Request, res: Response) {
        const group = await prisma.accessGroup.findUnique({
            where: { id: req.params.id },
            include: {
                department: true,
                members: { include: { user: true } },
                access_points: { include: { access_point: true } },
                access_level_members: { include: { access_level: true } },
                schedule_assignments: true,
            },
        });

        res.json({ success: true, data: group });
    }

    static async updateGroup(req: Request, res: Response) {
        const group = await prisma.accessGroup.update({
            where: { id: req.params.id },
            data: {
                name: asString(req.body.name),
                description: asString(req.body.description),
                status: req.body.status ? enumValue(PolicyStatus, req.body.status, PolicyStatus.ACTIVE) : undefined,
                hikcentral_group_id: asString(req.body.hikcentral_group_id),
                department_id: asString(req.body.department_id),
            },
            include: {
                department: true,
                members: { include: { user: true } },
                access_points: { include: { access_point: true } },
            },
        });

        res.json({ success: true, data: group });
    }

    static async deleteGroup(req: Request, res: Response) {
        await prisma.accessGroup.delete({ where: { id: req.params.id } });
        res.json({ success: true, data: { id: req.params.id } });
    }

    static async assignPerson(req: Request, res: Response) {
        const member = await prisma.accessGroupMember.upsert({
            where: {
                user_id_access_group_id: {
                    user_id: req.body.user_id,
                    access_group_id: req.params.groupId,
                },
            },
            create: {
                user_id: req.body.user_id,
                access_group_id: req.params.groupId,
                starts_at: toDate(req.body.starts_at),
                ends_at: toDate(req.body.ends_at),
            },
            update: {
                starts_at: toDate(req.body.starts_at),
                ends_at: toDate(req.body.ends_at),
            },
        });

        res.status(201).json({ success: true, data: member });
    }

    static async assignAccessPoint(req: Request, res: Response) {
        const item = await prisma.accessGroupAccessPoint.upsert({
            where: {
                access_group_id_access_point_id: {
                    access_group_id: req.params.groupId,
                    access_point_id: req.body.access_point_id,
                },
            },
            create: {
                access_group_id: req.params.groupId,
                access_point_id: req.body.access_point_id,
                can_enter: req.body.can_enter === undefined ? true : asBoolean(req.body.can_enter, true),
                can_exit: req.body.can_exit === undefined ? true : asBoolean(req.body.can_exit, true),
            },
            update: {
                can_enter: req.body.can_enter === undefined ? undefined : asBoolean(req.body.can_enter, true),
                can_exit: req.body.can_exit === undefined ? undefined : asBoolean(req.body.can_exit, true),
            },
        });

        res.status(201).json({ success: true, data: item });
    }

    static async createException(req: Request, res: Response) {
        const exception = await prisma.personAccessException.create({
            data: {
                user_id: req.body.user_id,
                access_point_id: req.body.access_point_id,
                allow_access: asBoolean(req.body.allow_access),
                reason: asString(req.body.reason),
                starts_at: toDate(req.body.starts_at),
                ends_at: toDate(req.body.ends_at),
            },
        });

        res.status(201).json({ success: true, data: exception });
    }

    static async checkPersonAccess(req: Request, res: Response) {
        const now = new Date();
        const direction = enumValue(AttendanceDirection, req.query.direction, AttendanceDirection.CHECK_IN);
        const userId = String(req.query.user_id);
        const accessPointId = String(req.query.access_point_id);

        const exception = await prisma.personAccessException.findFirst({
            where: {
                user_id: userId,
                access_point_id: accessPointId,
                OR: [{ starts_at: null }, { starts_at: { lte: now } }],
                AND: [{ OR: [{ ends_at: null }, { ends_at: { gte: now } }] }],
            },
            orderBy: { created_at: "desc" },
        });

        if (exception) {
            res.json({ success: true, data: { allowed: exception.allow_access, source: "PERSON_EXCEPTION" } });
            return;
        }

        const membership = await prisma.accessGroupMember.findFirst({
            where: {
                user_id: userId,
                access_group: {
                    status: "ACTIVE",
                    access_points: {
                        some: {
                            access_point_id: accessPointId,
                            ...(direction === "CHECK_IN" ? { can_enter: true } : { can_exit: true }),
                        },
                    },
                },
                OR: [{ starts_at: null }, { starts_at: { lte: now } }],
                AND: [{ OR: [{ ends_at: null }, { ends_at: { gte: now } }] }],
            },
        });

        if (membership) {
            res.json({ success: true, data: { allowed: true, source: "ACCESS_GROUP" } });
            return;
        }

        const accessLevel = await prisma.accessLevel.findFirst({
            where: {
                status: "ACTIVE",
                OR: [
                    { people: { some: { user_id: userId } } },
                    { groups: { some: { access_group: { members: { some: { user_id: userId } } } } } },
                ],
                access_points: {
                    some: {
                        access_point_id: accessPointId,
                        ...(direction === "CHECK_IN" ? { can_enter: true } : { can_exit: true }),
                    },
                },
                AND: [
                    { OR: [{ starts_at: null }, { starts_at: { lte: now } }] },
                    { OR: [{ ends_at: null }, { ends_at: { gte: now } }] },
                ],
            },
        });

        res.json({ success: true, data: { allowed: Boolean(accessLevel), source: accessLevel ? "ACCESS_LEVEL" : "NO_RULE" } });
    }
}

