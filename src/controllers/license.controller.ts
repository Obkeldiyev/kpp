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
export class LicenseController {
    static async upsert(req: Request, res: Response) {
        const features = Array.isArray(req.body.features) ? req.body.features : [];
        const data = {
            name: req.body.name,
            hikcentral_license_id: asString(req.body.hikcentral_license_id),
            status: enumValue(HikCentralLicenseStatus, req.body.status, HikCentralLicenseStatus.ACTIVE),
            seats: asNumber(req.body.seats),
            max_devices: asNumber(req.body.max_devices),
            max_doors: asNumber(req.body.max_doors),
            max_cameras: asNumber(req.body.max_cameras),
            max_faces: asNumber(req.body.max_faces),
            max_users: asNumber(req.body.max_users),
            issued_at: toDate(req.body.issued_at),
            activated_at: toDate(req.body.activated_at),
            expires_at: toDate(req.body.expires_at),
            vendor: asString(req.body.vendor),
            company_id: asString(req.body.company_id),
            raw: req.body.raw || req.body,
        };

        const license = await prisma.$transaction(async (tx) => {
            const saved = await tx.hikCentralLicense.upsert({
                where: { license_key: String(req.body.license_key) },
                create: { ...data, license_key: String(req.body.license_key) },
                update: data,
            });

            for (const feature of features) {
                const code = enumValue(HikCentralLicenseFeatureCode, feature.code, HikCentralLicenseFeatureCode.UNKNOWN);
                await tx.hikCentralLicenseFeature.upsert({
                    where: { license_id_code: { license_id: saved.id, code } },
                    create: {
                        license_id: saved.id,
                        code,
                        name: feature.name || code,
                        quota: asNumber(feature.quota),
                        used: asNumber(feature.used) || 0,
                        enabled: feature.enabled === undefined ? true : asBoolean(feature.enabled, true),
                        expires_at: toDate(feature.expires_at),
                        metadata: feature.metadata || feature.raw,
                    },
                    update: {
                        name: feature.name || code,
                        quota: asNumber(feature.quota),
                        used: asNumber(feature.used) || 0,
                        enabled: feature.enabled === undefined ? true : asBoolean(feature.enabled, true),
                        expires_at: toDate(feature.expires_at),
                        metadata: feature.metadata || feature.raw,
                    },
                });
            }

            return tx.hikCentralLicense.findUnique({
                where: { id: saved.id },
                include: { company: true, features: true, allocations: { include: { device: true } } },
            });
        });

        res.status(201).json({ success: true, data: license });
    }

    static async list(req: Request, res: Response) {
        const licenses = await prisma.hikCentralLicense.findMany({
            where: {
                company_id: asString(req.query.company_id),
                status: req.query.status
                    ? enumValue(HikCentralLicenseStatus, req.query.status, HikCentralLicenseStatus.ACTIVE)
                    : undefined,
            },
            include: {
                company: true,
                features: true,
                allocations: { include: { device: true } },
                usage_snapshots: { orderBy: { captured_at: "desc" }, take: 1 },
            },
            orderBy: [{ status: "asc" }, { expires_at: "asc" }],
        });

        res.json({ success: true, data: licenses });
    }

    static async get(req: Request, res: Response) {
        const license = await prisma.hikCentralLicense.findUnique({
            where: { id: req.params.id },
            include: {
                company: true,
                features: true,
                allocations: { include: { device: true } },
                usage_snapshots: { orderBy: { captured_at: "desc" }, take: 20 },
            },
        });

        res.json({ success: true, data: license });
    }

    static async update(req: Request, res: Response) {
        const license = await prisma.hikCentralLicense.update({
            where: { id: req.params.id },
            data: {
                name: asString(req.body.name),
                license_key: asString(req.body.license_key),
                hikcentral_license_id: asString(req.body.hikcentral_license_id),
                status: req.body.status
                    ? enumValue(HikCentralLicenseStatus, req.body.status, HikCentralLicenseStatus.ACTIVE)
                    : undefined,
                seats: asNumber(req.body.seats),
                max_devices: asNumber(req.body.max_devices),
                max_doors: asNumber(req.body.max_doors),
                max_cameras: asNumber(req.body.max_cameras),
                max_faces: asNumber(req.body.max_faces),
                max_users: asNumber(req.body.max_users),
                issued_at: toDate(req.body.issued_at),
                activated_at: toDate(req.body.activated_at),
                expires_at: toDate(req.body.expires_at),
                vendor: asString(req.body.vendor),
                company_id: asString(req.body.company_id),
                raw: req.body.raw,
            },
            include: { company: true, features: true, allocations: { include: { device: true } } },
        });

        res.json({ success: true, data: license });
    }

    static async delete(req: Request, res: Response) {
        await prisma.hikCentralLicense.delete({ where: { id: req.params.id } });
        res.json({ success: true, data: { id: req.params.id } });
    }

    static async upsertFeature(req: Request, res: Response) {
        const code = enumValue(HikCentralLicenseFeatureCode, req.body.code, HikCentralLicenseFeatureCode.UNKNOWN);
        const feature = await prisma.hikCentralLicenseFeature.upsert({
            where: { license_id_code: { license_id: req.params.licenseId, code } },
            create: {
                license_id: req.params.licenseId,
                code,
                name: req.body.name || code,
                quota: asNumber(req.body.quota),
                used: asNumber(req.body.used) || 0,
                enabled: req.body.enabled === undefined ? true : asBoolean(req.body.enabled, true),
                expires_at: toDate(req.body.expires_at),
                metadata: req.body.metadata || req.body.raw,
            },
            update: {
                name: asString(req.body.name) || code,
                quota: asNumber(req.body.quota),
                used: asNumber(req.body.used),
                enabled: req.body.enabled === undefined ? undefined : asBoolean(req.body.enabled, true),
                expires_at: toDate(req.body.expires_at),
                metadata: req.body.metadata || req.body.raw,
            },
            include: { license: true },
        });

        res.status(201).json({ success: true, data: feature });
    }

    static async deleteFeature(req: Request, res: Response) {
        await prisma.hikCentralLicenseFeature.delete({ where: { id: req.params.featureId } });
        res.json({ success: true, data: { id: req.params.featureId } });
    }

    static async allocateDevice(req: Request, res: Response) {
        const feature = enumValue(HikCentralLicenseFeatureCode, req.body.feature, HikCentralLicenseFeatureCode.UNKNOWN);
        const allocation = await prisma.hikCentralLicenseAllocation.upsert({
            where: {
                license_id_device_id_feature: {
                    license_id: req.params.licenseId,
                    device_id: req.body.device_id,
                    feature,
                },
            },
            create: {
                license_id: req.params.licenseId,
                device_id: req.body.device_id,
                feature,
                released_at: toDate(req.body.released_at),
            },
            update: {
                released_at: toDate(req.body.released_at),
            },
            include: { license: true, device: true },
        });

        res.status(201).json({ success: true, data: allocation });
    }

    static async listAllocations(req: Request, res: Response) {
        const allocations = await prisma.hikCentralLicenseAllocation.findMany({
            where: {
                license_id: asString(req.params.licenseId || req.query.license_id),
                device_id: asString(req.query.device_id),
                feature: req.query.feature
                    ? enumValue(HikCentralLicenseFeatureCode, req.query.feature, HikCentralLicenseFeatureCode.UNKNOWN)
                    : undefined,
            },
            include: { license: true, device: true },
            orderBy: { allocated_at: "desc" },
        });

        res.json({ success: true, data: allocations });
    }

    static async releaseAllocation(req: Request, res: Response) {
        const allocation = await prisma.hikCentralLicenseAllocation.update({
            where: { id: req.params.allocationId },
            data: { released_at: toDate(req.body.released_at) || new Date() },
            include: { license: true, device: true },
        });

        res.json({ success: true, data: allocation });
    }

    static async deleteAllocation(req: Request, res: Response) {
        await prisma.hikCentralLicenseAllocation.delete({ where: { id: req.params.allocationId } });
        res.json({ success: true, data: { id: req.params.allocationId } });
    }

    static async captureUsage(req: Request, res: Response) {
        const companyId = asString(req.body.company_id || req.query.company_id);
        const from = toDate(req.body.from || req.query.from) || startOfDay(new Date());
        const to = toDate(req.body.to || req.query.to) || endOfDay(from);
        const userWhere: Prisma.UserWhereInput = { company_id: companyId, is_active: true };
        const deviceWhere: Prisma.DeviceWhereInput = companyId ? { area: { company_id: companyId }, is_active: true } : { is_active: true };

        const [activeUsers, activeDevices, activeCameras, activeDoors, activeFaces, accessEvents, attendanceRecords] =
            await Promise.all([
                prisma.user.count({ where: userWhere }),
                prisma.device.count({ where: deviceWhere }),
                prisma.device.count({ where: { ...deviceWhere, type: "CAMERA" } }),
                prisma.hikCentralAccessPoint.count({ where: companyId ? { device: { area: { company_id: companyId } } } : undefined }),
                prisma.faceCredential.count({ where: companyId ? { user: { company_id: companyId, is_active: true } } : undefined }),
                prisma.hikCentralAccessEvent.count({
                    where: {
                        event_time: { gte: from, lte: to },
                        user: companyId ? { company_id: companyId } : undefined,
                    },
                }),
                prisma.attendanceRecord.count({
                    where: {
                        work_date: { gte: startOfDay(from), lte: endOfDay(to) },
                        user: companyId ? { company_id: companyId } : undefined,
                    },
                }),
            ]);

        const snapshot = await prisma.hikCentralLicenseUsageSnapshot.create({
            data: {
                license_id: asString(req.body.license_id || req.query.license_id),
                company_id: companyId,
                active_users: activeUsers,
                active_devices: activeDevices,
                active_cameras: activeCameras,
                active_doors: activeDoors,
                active_faces: activeFaces,
                access_events: accessEvents,
                attendance_records: attendanceRecords,
                raw: { from, to },
            },
        });

        res.status(201).json({ success: true, data: snapshot });
    }

    static async listUsage(req: Request, res: Response) {
        const { skip, limit, page } = paginate(req.query);
        const where: Prisma.HikCentralLicenseUsageSnapshotWhereInput = {
            license_id: asString(req.query.license_id),
            company_id: asString(req.query.company_id),
            captured_at: {
                gte: toDate(req.query.from),
                lte: toDate(req.query.to),
            },
        };

        const [items, total] = await Promise.all([
            prisma.hikCentralLicenseUsageSnapshot.findMany({
                where,
                include: { license: true, company: true },
                orderBy: { captured_at: "desc" },
                skip,
                take: limit,
            }),
            prisma.hikCentralLicenseUsageSnapshot.count({ where }),
        ]);

        res.json({ success: true, data: items, meta: { total, page, limit } });
    }

    static async overview(req: Request, res: Response) {
        const companyId = asString(req.query.company_id);
        const now = new Date();
        const expiringTo = new Date(now);
        expiringTo.setDate(expiringTo.getDate() + 30);

        const [total, active, expired, expiringSoon, features, latestUsage] = await Promise.all([
            prisma.hikCentralLicense.count({ where: { company_id: companyId } }),
            prisma.hikCentralLicense.count({ where: { company_id: companyId, status: { in: ["ACTIVE", "TRIAL"] } } }),
            prisma.hikCentralLicense.count({
                where: { company_id: companyId, OR: [{ status: "EXPIRED" }, { expires_at: { lt: now } }] },
            }),
            prisma.hikCentralLicense.count({ where: { company_id: companyId, expires_at: { gte: now, lte: expiringTo } } }),
            prisma.hikCentralLicenseFeature.findMany({
                where: { license: { company_id: companyId }, enabled: true },
                include: { license: true },
                orderBy: { code: "asc" },
            }),
            prisma.hikCentralLicenseUsageSnapshot.findFirst({
                where: { company_id: companyId },
                orderBy: { captured_at: "desc" },
            }),
        ]);

        res.json({
            success: true,
            data: {
                licenses: { total, active, expired, expiringSoon },
                features,
                latestUsage,
            },
        });
    }
}

