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
export class DeviceController {
    static async upsertDevice(req: Request, res: Response) {
        const deviceId = req.body.hikcentral_device_id || req.body.id;
        const data = {
            name: req.body.name || req.body.device_name,
            channel_address: asString(req.body.channel_address),
            chanel_address: asString(req.body.chanel_address),
            device_address: asString(req.body.device_address),
            device_name: asString(req.body.device_name),
            type: enumValue(HikCentralDeviceType, req.body.type, HikCentralDeviceType.UNKNOWN),
            network_status: enumValue(DeviceStatus, req.body.network_status, DeviceStatus.OFFLINE),
            record_schedule: asString(req.body.record_schedule),
            manufacturer: asString(req.body.manufacturer),
            marking_status: asString(req.body.marking_status) || "unmarked",
            serial_number: asString(req.body.serial_number),
            ip_address: asString(req.body.ip_address),
            location: asString(req.body.location),
            is_active: req.body.is_active === undefined ? true : asBoolean(req.body.is_active, true),
            area_id: asString(req.body.area_id),
            raw: req.body.raw || req.body,
        };

        const device = deviceId
            ? await prisma.device.upsert({
                  where: { hikcentral_device_id: String(deviceId) },
                  create: { ...data, hikcentral_device_id: String(deviceId) },
                  update: data,
              })
            : await prisma.device.create({ data });

        res.status(201).json({ success: true, data: device });
    }

    static async listDevices(req: Request, res: Response) {
        const devices = await prisma.device.findMany({
            where: {
                area_id: asString(req.query.area_id),
                type: req.query.type ? enumValue(HikCentralDeviceType, req.query.type, HikCentralDeviceType.UNKNOWN) : undefined,
                network_status: req.query.network_status
                    ? enumValue(DeviceStatus, req.query.network_status, DeviceStatus.OFFLINE)
                    : undefined,
            },
            include: { area: true, access_points: true, pictures: true },
            orderBy: { name: "asc" },
        });

        res.json({ success: true, data: devices });
    }

    static async getDevice(req: Request, res: Response) {
        const device = await prisma.device.findUnique({
            where: { id: req.params.id },
            include: { area: true, access_points: true, pictures: true, license_allocations: true, tracking_points: true },
        });

        res.json({ success: true, data: device });
    }

    static async updateDevice(req: Request, res: Response) {
        const device = await prisma.device.update({
            where: { id: req.params.id },
            data: {
                name: asString(req.body.name || req.body.device_name),
                channel_address: asString(req.body.channel_address),
                chanel_address: asString(req.body.chanel_address),
                device_address: asString(req.body.device_address),
                device_name: asString(req.body.device_name),
                hikcentral_device_id: asString(req.body.hikcentral_device_id),
                type: req.body.type ? enumValue(HikCentralDeviceType, req.body.type, HikCentralDeviceType.UNKNOWN) : undefined,
                network_status: req.body.network_status
                    ? enumValue(DeviceStatus, req.body.network_status, DeviceStatus.OFFLINE)
                    : undefined,
                record_schedule: asString(req.body.record_schedule),
                manufacturer: asString(req.body.manufacturer),
                marking_status: asString(req.body.marking_status),
                serial_number: asString(req.body.serial_number),
                ip_address: asString(req.body.ip_address),
                location: asString(req.body.location),
                is_active: req.body.is_active === undefined ? undefined : asBoolean(req.body.is_active, true),
                area_id: asString(req.body.area_id),
                raw: req.body.raw,
            },
            include: { area: true, access_points: true, pictures: true },
        });

        res.json({ success: true, data: device });
    }

    static async deleteDevice(req: Request, res: Response) {
        await prisma.device.delete({ where: { id: req.params.id } });
        res.json({ success: true, data: { id: req.params.id } });
    }

    static async upsertAccessPoint(req: Request, res: Response) {
        const pointId = req.body.hikcentral_point_id || req.body.id || req.body.name;
        const data = {
            name: req.body.name,
            door_no: asString(req.body.door_no),
            floor: asString(req.body.floor),
            location: asString(req.body.location),
            device_id: asString(req.body.device_id),
        };

        const accessPoint = await prisma.hikCentralAccessPoint.upsert({
            where: { hikcentral_point_id: String(pointId) },
            create: { ...data, hikcentral_point_id: String(pointId) },
            update: data,
        });

        res.status(201).json({ success: true, data: accessPoint });
    }

    static async getAccessPoint(req: Request, res: Response) {
        const accessPoint = await prisma.hikCentralAccessPoint.findUnique({
            where: { id: req.params.id },
            include: { device: true, attendance_areas: true, access_events: { take: 20, orderBy: { event_time: "desc" } } },
        });

        res.json({ success: true, data: accessPoint });
    }

    static async updateAccessPoint(req: Request, res: Response) {
        const accessPoint = await prisma.hikCentralAccessPoint.update({
            where: { id: req.params.id },
            data: {
                hikcentral_point_id: asString(req.body.hikcentral_point_id),
                name: asString(req.body.name),
                door_no: asString(req.body.door_no),
                floor: asString(req.body.floor),
                location: asString(req.body.location),
                device_id: asString(req.body.device_id),
            },
            include: { device: true, attendance_areas: true },
        });

        res.json({ success: true, data: accessPoint });
    }

    static async deleteAccessPoint(req: Request, res: Response) {
        await prisma.hikCentralAccessPoint.delete({ where: { id: req.params.id } });
        res.json({ success: true, data: { id: req.params.id } });
    }

    static async listAccessPoints(req: Request, res: Response) {
        const accessPoints = await prisma.hikCentralAccessPoint.findMany({
            where: { device_id: asString(req.query.device_id) },
            include: { device: true, attendance_areas: true },
            orderBy: { name: "asc" },
        });

        res.json({ success: true, data: accessPoints });
    }

    static async overview(_req: Request, res: Response) {
        const [areas, cameras, doors, online, offline, devices] = await Promise.all([
            prisma.area.count(),
            prisma.device.count({ where: { type: "CAMERA" } }),
            prisma.hikCentralAccessPoint.count(),
            prisma.device.count({ where: { network_status: "ONLINE" } }),
            prisma.device.count({ where: { network_status: { not: "ONLINE" } } }),
            prisma.device.findMany({
                include: { area: true, access_points: true },
                orderBy: { name: "asc" },
            }),
        ]);

        res.json({
            success: true,
            data: {
                totals: { areas, cameras, doors, online, offline },
                devices,
            },
        });
    }

    static async bulkImportDevices(req: Request, res: Response) {
        const devices = Array.isArray(req.body.devices) ? req.body.devices : [];
        const imported = await prisma.$transaction(
            devices.map((device: any) =>
                prisma.device.upsert({
                    where: { hikcentral_device_id: String(device.hikcentral_device_id || device.id || device.device_address) },
                    create: {
                        hikcentral_device_id: String(device.hikcentral_device_id || device.id || device.device_address),
                        name: device.name || device.device_name,
                        channel_address: asString(device.channel_address),
                        chanel_address: asString(device.chanel_address),
                        device_address: asString(device.device_address),
                        device_name: asString(device.device_name),
                        type: enumValue(HikCentralDeviceType, device.type, HikCentralDeviceType.CAMERA),
                        network_status: enumValue(DeviceStatus, device.network_status, DeviceStatus.OFFLINE),
                        record_schedule: asString(device.record_schedule),
                        manufacturer: asString(device.manufacturer),
                        marking_status: asString(device.marking_status) || "unmarked",
                        ip_address: asString(device.ip_address),
                        area_id: asString(device.area_id),
                        raw: device,
                    },
                    update: {
                        name: device.name || device.device_name,
                        channel_address: asString(device.channel_address),
                        chanel_address: asString(device.chanel_address),
                        device_address: asString(device.device_address),
                        device_name: asString(device.device_name),
                        type: enumValue(HikCentralDeviceType, device.type, HikCentralDeviceType.CAMERA),
                        network_status: enumValue(DeviceStatus, device.network_status, DeviceStatus.OFFLINE),
                        record_schedule: asString(device.record_schedule),
                        manufacturer: asString(device.manufacturer),
                        marking_status: asString(device.marking_status) || "unmarked",
                        ip_address: asString(device.ip_address),
                        area_id: asString(device.area_id),
                        raw: device,
                    },
                })
            )
        );

        res.status(201).json({ success: true, data: { imported: imported.length, devices: imported } });
    }
}

