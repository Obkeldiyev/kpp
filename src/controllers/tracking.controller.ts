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
export class TrackingController {
    static async startSession(req: Request, res: Response) {
        const person = await resolvePerson(asString(req.body.subject_external_id), asString(req.body.user_id));
        const session = await prisma.hikCentralTrackingSession.create({
            data: {
                name: req.body.name || req.body.subject_name || person?.full_name || "Tracking session",
                subject_type: enumValue(
                    HikCentralTrackingSubjectType,
                    req.body.subject_type,
                    HikCentralTrackingSubjectType.PERSON
                ),
                status: enumValue(HikCentralTrackingStatus, req.body.status, HikCentralTrackingStatus.ACTIVE),
                hikcentral_track_id: asString(req.body.hikcentral_track_id),
                subject_external_id: asString(req.body.subject_external_id || person?.hikcentral_person_id || person?.id_number),
                subject_name: asString(req.body.subject_name || person?.full_name),
                starts_at: toDate(req.body.starts_at) || new Date(),
                ends_at: toDate(req.body.ends_at),
                note: asString(req.body.note),
                raw: req.body.raw || req.body,
                company_id: asString(req.body.company_id || person?.company_id),
                user_id: person?.id || asString(req.body.user_id),
            },
            include: { company: true, user: true, points: true },
        });

        res.status(201).json({ success: true, data: session });
    }

    static async listSessions(req: Request, res: Response) {
        const { skip, limit, page } = paginate(req.query);
        const sessions = await prisma.hikCentralTrackingSession.findMany({
            where: {
                company_id: asString(req.query.company_id),
                user_id: asString(req.query.user_id),
                status: req.query.status
                    ? enumValue(HikCentralTrackingStatus, req.query.status, HikCentralTrackingStatus.ACTIVE)
                    : undefined,
                subject_type: req.query.subject_type
                    ? enumValue(HikCentralTrackingSubjectType, req.query.subject_type, HikCentralTrackingSubjectType.UNKNOWN)
                    : undefined,
            },
            include: {
                company: true,
                user: { include: { department: true, images: true } },
                points: { orderBy: { occurred_at: "desc" }, take: 5, include: { device: true, access_event: true } },
            },
            orderBy: [{ status: "asc" }, { last_seen_at: "desc" }, { starts_at: "desc" }],
            skip,
            take: limit,
        });
        const total = await prisma.hikCentralTrackingSession.count({
            where: {
                company_id: asString(req.query.company_id),
                user_id: asString(req.query.user_id),
                status: req.query.status
                    ? enumValue(HikCentralTrackingStatus, req.query.status, HikCentralTrackingStatus.ACTIVE)
                    : undefined,
            },
        });

        res.json({ success: true, data: sessions, meta: { total, page, limit } });
    }

    static async getSession(req: Request, res: Response) {
        const session = await prisma.hikCentralTrackingSession.findUnique({
            where: { id: req.params.id },
            include: {
                company: true,
                user: { include: { department: true, images: true } },
                points: { orderBy: { occurred_at: "desc" }, include: { device: true, access_event: true } },
            },
        });

        res.json({ success: true, data: session });
    }

    static async updateSession(req: Request, res: Response) {
        const person = req.body.user_id || req.body.subject_external_id
            ? await resolvePerson(asString(req.body.subject_external_id), asString(req.body.user_id))
            : null;
        const session = await prisma.hikCentralTrackingSession.update({
            where: { id: req.params.id },
            data: {
                name: asString(req.body.name),
                subject_type: req.body.subject_type
                    ? enumValue(HikCentralTrackingSubjectType, req.body.subject_type, HikCentralTrackingSubjectType.PERSON)
                    : undefined,
                status: req.body.status
                    ? enumValue(HikCentralTrackingStatus, req.body.status, HikCentralTrackingStatus.ACTIVE)
                    : undefined,
                hikcentral_track_id: asString(req.body.hikcentral_track_id),
                subject_external_id: asString(req.body.subject_external_id || person?.hikcentral_person_id || person?.id_number),
                subject_name: asString(req.body.subject_name || person?.full_name),
                starts_at: toDate(req.body.starts_at),
                ends_at: toDate(req.body.ends_at),
                last_seen_at: toDate(req.body.last_seen_at),
                note: asString(req.body.note),
                raw: req.body.raw,
                company_id: asString(req.body.company_id || person?.company_id),
                user_id: person?.id || asString(req.body.user_id),
            },
            include: { company: true, user: true, points: { orderBy: { occurred_at: "desc" }, take: 10 } },
        });

        res.json({ success: true, data: session });
    }

    static async deleteSession(req: Request, res: Response) {
        await prisma.hikCentralTrackingSession.delete({ where: { id: req.params.id } });
        res.json({ success: true, data: { id: req.params.id } });
    }

    static async addPoint(req: Request, res: Response) {
        const occurredAt = toDate(req.body.occurred_at) || new Date();
        const session = await prisma.hikCentralTrackingSession.findFirst({
            where: {
                OR: [
                    { id: asString(req.params.id) },
                    { hikcentral_track_id: asString(req.body.hikcentral_track_id) },
                ].filter((item) => Object.values(item)[0]) as Prisma.HikCentralTrackingSessionWhereInput[],
            },
        });

        if (!session) {
            res.status(404).json({ success: false, message: "Tracking session not found" });
            return;
        }

        const point = await prisma.hikCentralTrackingPoint.create({
            data: {
                session_id: session.id,
                event_type: enumValue(HikCentralTrackingEventType, req.body.event_type, HikCentralTrackingEventType.UNKNOWN),
                occurred_at: occurredAt,
                latitude: asNumber(req.body.latitude),
                longitude: asNumber(req.body.longitude),
                area_name: asString(req.body.area_name),
                location: asString(req.body.location),
                confidence: asNumber(req.body.confidence),
                snapshot_url: asString(req.body.snapshot_url),
                message: asString(req.body.message),
                raw: req.body.raw || req.body,
                user_id: asString(req.body.user_id || session.user_id),
                device_id: asString(req.body.device_id),
                access_event_id: asString(req.body.access_event_id),
            },
            include: { session: true, user: true, device: true, access_event: true },
        });

        await prisma.hikCentralTrackingSession.update({
            where: { id: session.id },
            data: { last_seen_at: occurredAt, status: "ACTIVE" },
        });

        res.status(201).json({ success: true, data: point });
    }

    static async updatePoint(req: Request, res: Response) {
        const point = await prisma.hikCentralTrackingPoint.update({
            where: { id: req.params.pointId },
            data: {
                event_type: req.body.event_type
                    ? enumValue(HikCentralTrackingEventType, req.body.event_type, HikCentralTrackingEventType.UNKNOWN)
                    : undefined,
                occurred_at: toDate(req.body.occurred_at),
                latitude: asNumber(req.body.latitude),
                longitude: asNumber(req.body.longitude),
                area_name: asString(req.body.area_name),
                location: asString(req.body.location),
                confidence: asNumber(req.body.confidence),
                snapshot_url: asString(req.body.snapshot_url),
                message: asString(req.body.message),
                raw: req.body.raw,
                user_id: asString(req.body.user_id),
                device_id: asString(req.body.device_id),
                access_event_id: asString(req.body.access_event_id),
            },
            include: { session: true, user: true, device: true, access_event: true },
        });

        res.json({ success: true, data: point });
    }

    static async deletePoint(req: Request, res: Response) {
        await prisma.hikCentralTrackingPoint.delete({ where: { id: req.params.pointId } });
        res.json({ success: true, data: { id: req.params.pointId } });
    }

    static async latestPoints(req: Request, res: Response) {
        const { skip, limit, page } = paginate(req.query);
        const where: Prisma.HikCentralTrackingPointWhereInput = {
            session: {
                company_id: asString(req.query.company_id),
                status: req.query.status
                    ? enumValue(HikCentralTrackingStatus, req.query.status, HikCentralTrackingStatus.ACTIVE)
                    : undefined,
            },
            user_id: asString(req.query.user_id),
            device_id: asString(req.query.device_id),
            event_type: req.query.event_type
                ? enumValue(HikCentralTrackingEventType, req.query.event_type, HikCentralTrackingEventType.UNKNOWN)
                : undefined,
        };

        const [items, total] = await Promise.all([
            prisma.hikCentralTrackingPoint.findMany({
                where,
                include: {
                    session: true,
                    user: { include: { department: true, images: true } },
                    device: true,
                    access_event: true,
                },
                orderBy: { occurred_at: "desc" },
                skip,
                take: limit,
            }),
            prisma.hikCentralTrackingPoint.count({ where }),
        ]);

        res.json({ success: true, data: items, meta: { total, page, limit } });
    }

    static async finishSession(req: Request, res: Response) {
        const session = await prisma.hikCentralTrackingSession.update({
            where: { id: req.params.id },
            data: {
                status: enumValue(HikCentralTrackingStatus, req.body.status, HikCentralTrackingStatus.COMPLETED),
                ends_at: toDate(req.body.ends_at) || new Date(),
                note: asString(req.body.note),
            },
            include: { points: { orderBy: { occurred_at: "desc" }, take: 10 } },
        });

        res.json({ success: true, data: session });
    }
}

