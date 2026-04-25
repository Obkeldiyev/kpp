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

const includePerson = {
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

function asString(value: unknown): string | undefined {
    if (value === undefined || value === null || value === "") return undefined;
    return String(value);
}

function asBoolean(value: unknown, fallback = false): boolean {
    if (value === undefined || value === null) return fallback;
    return value === true || value === "true";
}

function enumValue<T extends Record<string, string>>(source: T, value: unknown, fallback: T[keyof T]): T[keyof T] {
    const incoming = String(value || "").toUpperCase();
    return Object.values(source).includes(incoming) ? (incoming as T[keyof T]) : fallback;
}

function eventDirection(eventType: HikCentralEventType, areaMode?: AttendanceAreaMode | null): AttendanceDirection | null {
    if (areaMode === "CHECK_IN") return "CHECK_IN";
    if (areaMode === "CHECK_OUT") return "CHECK_OUT";
    if (eventType === "CHECK_IN") return "CHECK_IN";
    if (eventType === "CHECK_OUT") return "CHECK_OUT";
    return null;
}

function weekDayName(date: Date): string {
    return ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"][date.getDay()];
}

async function resolvePerson(externalId?: string, userId?: string) {
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

async function resolveAttendanceAreaMode(accessPointId?: string | null, departmentId?: string | null) {
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

async function updateAttendanceFromEvent(params: {
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

export class OrganizationController {
    static async createCompany(req: Request, res: Response) {
        const company = await prisma.company.create({
            data: {
                name: req.body.name,
                hikcentral_org_id: asString(req.body.hikcentral_org_id),
            },
        });

        res.status(201).json({ success: true, data: company });
    }

    static async listCompanies(_req: Request, res: Response) {
        const companies = await prisma.company.findMany({
            include: {
                departments: true,
                areas: true,
            },
            orderBy: { name: "asc" },
        });

        res.json({ success: true, data: companies });
    }

    static async createDepartment(req: Request, res: Response) {
        const parent = req.body.parent_id
            ? await prisma.department.findUnique({ where: { id: req.body.parent_id } })
            : null;
        const path = req.body.path || (parent ? `${parent.path}>${req.body.name}` : req.body.name);

        const department = await prisma.department.create({
            data: {
                name: req.body.name,
                path,
                hikcentral_org_id: asString(req.body.hikcentral_org_id),
                company_id: req.body.company_id,
                parent_id: asString(req.body.parent_id),
            },
            include: { parent: true, children: true },
        });

        res.status(201).json({ success: true, data: department });
    }

    static async listDepartments(req: Request, res: Response) {
        const departments = await prisma.department.findMany({
            where: {
                company_id: asString(req.query.company_id),
                parent_id: req.query.root === "true" ? null : asString(req.query.parent_id),
            },
            include: { children: true, users: true },
            orderBy: { path: "asc" },
        });

        res.json({ success: true, data: departments });
    }

    static async createArea(req: Request, res: Response) {
        const area = await prisma.area.create({
            data: {
                name: req.body.name,
                hikcentral_area_id: asString(req.body.hikcentral_area_id),
                company_id: req.body.company_id,
                parent_id: asString(req.body.parent_id),
            },
            include: { parent: true, children: true },
        });

        res.status(201).json({ success: true, data: area });
    }

    static async listAreas(req: Request, res: Response) {
        const areas = await prisma.area.findMany({
            where: {
                company_id: asString(req.query.company_id),
                parent_id: req.query.root === "true" ? null : asString(req.query.parent_id),
            },
            include: { children: true, devices: true },
            orderBy: { name: "asc" },
        });

        res.json({ success: true, data: areas });
    }
}

export class PersonController {
    static async create(req: Request, res: Response) {
        const fullName = req.body.full_name || `${req.body.first_name} ${req.body.second_name}`.trim();
        const person = await prisma.user.create({
            data: {
                id_number: req.body.id_number,
                identification: asString(req.body.identification),
                hikcentral_person_id: asString(req.body.hikcentral_person_id),
                hikcentral_employee_no: asString(req.body.hikcentral_employee_no),
                first_name: req.body.first_name,
                second_name: req.body.second_name,
                full_name: fullName,
                position: asString(req.body.position),
                phone: asString(req.body.phone),
                role: enumValue(Roles, req.body.role, Roles.USER),
                company_id: asString(req.body.company_id),
                department_id: asString(req.body.department_id),
                images: req.body.image_url
                    ? {
                          create: {
                              url: req.body.image_url,
                              hikcentral_image_id: asString(req.body.hikcentral_image_id),
                              is_primary_face: true,
                          },
                      }
                    : undefined,
            },
            include: includePerson,
        });

        res.status(201).json({ success: true, data: person });
    }

    static async list(req: Request, res: Response) {
        const { skip, limit, page } = paginate(req.query);
        const search = asString(req.query.search);
        const where: Prisma.UserWhereInput = {
            department_id: asString(req.query.department_id),
            company_id: asString(req.query.company_id),
            is_active: req.query.is_active === undefined ? undefined : asBoolean(req.query.is_active),
            OR: search
                ? [
                      { first_name: { contains: search, mode: "insensitive" } },
                      { second_name: { contains: search, mode: "insensitive" } },
                      { full_name: { contains: search, mode: "insensitive" } },
                      { id_number: { contains: search, mode: "insensitive" } },
                      { identification: { contains: search, mode: "insensitive" } },
                  ]
                : undefined,
        };

        const [items, total] = await Promise.all([
            prisma.user.findMany({
                where,
                include: includePerson,
                orderBy: { created_at: "desc" },
                skip,
                take: limit,
            }),
            prisma.user.count({ where }),
        ]);

        res.json({ success: true, data: items, meta: { total, page, limit } });
    }

    static async get(req: Request, res: Response) {
        const person = await prisma.user.findUnique({
            where: { id: req.params.id },
            include: includePerson,
        });

        res.json({ success: true, data: person });
    }

    static async update(req: Request, res: Response) {
        const person = await prisma.user.update({
            where: { id: req.params.id },
            data: {
                id_number: asString(req.body.id_number),
                identification: asString(req.body.identification),
                hikcentral_person_id: asString(req.body.hikcentral_person_id),
                hikcentral_employee_no: asString(req.body.hikcentral_employee_no),
                first_name: asString(req.body.first_name),
                second_name: asString(req.body.second_name),
                full_name: asString(req.body.full_name),
                position: asString(req.body.position),
                phone: asString(req.body.phone),
                is_active: req.body.is_active === undefined ? undefined : asBoolean(req.body.is_active),
                company_id: asString(req.body.company_id),
                department_id: asString(req.body.department_id),
            },
            include: includePerson,
        });

        res.json({ success: true, data: person });
    }

    static async addCredential(req: Request, res: Response) {
        const credential = await prisma.accessCredential.create({
            data: {
                user_id: req.params.id,
                type: enumValue(HikCentralCredentialType, req.body.type, HikCentralCredentialType.UNKNOWN),
                value: req.body.value,
                hikcentral_credential_id: asString(req.body.hikcentral_credential_id),
                issued_at: toDate(req.body.issued_at),
                expires_at: toDate(req.body.expires_at),
            },
        });

        res.status(201).json({ success: true, data: credential });
    }

    static async credentialStatus(req: Request, res: Response) {
        const where: Prisma.UserWhereInput = {
            department_id: asString(req.query.department_id),
            company_id: asString(req.query.company_id),
            is_active: true,
        };
        const people = await prisma.user.findMany({
            where,
            include: {
                images: true,
                face_credentials: true,
                access_credentials: true,
            },
        });

        const data = people.map((person) => {
            const activeCredentials = person.access_credentials.filter((credential) => credential.is_active);
            return {
                id: person.id,
                id_number: person.id_number,
                full_name: person.full_name,
                card: activeCredentials.filter((credential) => credential.type === "CARD").length,
                fingerprint: activeCredentials.filter((credential) => credential.type === "FINGERPRINT").length,
                face: person.face_credentials.length,
                qr: activeCredentials.filter((credential) => credential.type === "QR").length,
                palm: activeCredentials.filter((credential) => credential.value.startsWith("PALM:")).length,
            };
        });

        res.json({ success: true, data });
    }

    static async bulkImport(req: Request, res: Response) {
        const people = Array.isArray(req.body.people) ? req.body.people : [];
        const created = await prisma.$transaction(
            people.map((person: any) =>
                prisma.user.upsert({
                    where: { id_number: String(person.id_number) },
                    create: {
                        id_number: String(person.id_number),
                        identification: asString(person.identification),
                        hikcentral_person_id: asString(person.hikcentral_person_id),
                        hikcentral_employee_no: asString(person.hikcentral_employee_no),
                        first_name: person.first_name,
                        second_name: person.second_name,
                        full_name: person.full_name || `${person.first_name} ${person.second_name}`.trim(),
                        position: asString(person.position),
                        phone: asString(person.phone),
                        company_id: asString(person.company_id),
                        department_id: asString(person.department_id),
                    },
                    update: {
                        identification: asString(person.identification),
                        hikcentral_person_id: asString(person.hikcentral_person_id),
                        hikcentral_employee_no: asString(person.hikcentral_employee_no),
                        first_name: person.first_name,
                        second_name: person.second_name,
                        full_name: person.full_name || `${person.first_name} ${person.second_name}`.trim(),
                        position: asString(person.position),
                        phone: asString(person.phone),
                        company_id: asString(person.company_id),
                        department_id: asString(person.department_id),
                    },
                })
            )
        );

        res.status(201).json({ success: true, data: { imported: created.length, people: created } });
    }
}

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

export class SecurityController {
    static async createPermission(req: Request, res: Response) {
        const permission = await prisma.permission.upsert({
            where: {
                module_action: {
                    module: req.body.module,
                    action: enumValue(PermissionAction, req.body.action, PermissionAction.READ),
                },
            },
            create: {
                module: req.body.module,
                action: enumValue(PermissionAction, req.body.action, PermissionAction.READ),
                description: asString(req.body.description),
            },
            update: {
                description: asString(req.body.description),
            },
        });

        res.status(201).json({ success: true, data: permission });
    }

    static async createRole(req: Request, res: Response) {
        const role = await prisma.adminRole.create({
            data: {
                name: req.body.name,
                status: enumValue(PolicyStatus, req.body.status, PolicyStatus.ACTIVE),
                description: asString(req.body.description),
                effective_from: toDate(req.body.effective_from),
                effective_to: toDate(req.body.effective_to),
                created_by_id: req.user?.role === "ADMIN" ? req.user.id : undefined,
                permissions: req.body.permission_ids?.length
                    ? {
                          create: req.body.permission_ids.map((permission_id: string) => ({
                              permission: { connect: { id: permission_id } },
                          })),
                      }
                    : undefined,
            },
            include: { permissions: { include: { permission: true } } },
        });

        res.status(201).json({ success: true, data: role });
    }

    static async listRoles(_req: Request, res: Response) {
        const roles = await prisma.adminRole.findMany({
            include: {
                created_by: true,
                permissions: { include: { permission: true } },
                assignments: { include: { admin: true } },
            },
            orderBy: { created_at: "desc" },
        });

        res.json({ success: true, data: roles });
    }

    static async assignRole(req: Request, res: Response) {
        const assignment = await prisma.adminRoleAssignment.upsert({
            where: {
                admin_id_role_id: {
                    admin_id: req.body.admin_id,
                    role_id: req.body.role_id,
                },
            },
            create: {
                admin_id: req.body.admin_id,
                role_id: req.body.role_id,
            },
            update: {},
        });

        res.status(201).json({ success: true, data: assignment });
    }
}

export class AttendanceController {
    static async createShift(req: Request, res: Response) {
        const shift = await prisma.attendanceShift.create({
            data: {
                name: req.body.name,
                code: asString(req.body.code),
                type: enumValue(AttendanceShiftType, req.body.type, AttendanceShiftType.NORMAL),
                start_time: req.body.start_time,
                end_time: req.body.end_time,
                break_minutes: Number(req.body.break_minutes || 0),
                color: asString(req.body.color),
                schedule_template_id: asString(req.body.schedule_template_id),
            },
            include: { schedule_template: true },
        });

        res.status(201).json({ success: true, data: shift });
    }

    static async listShifts(req: Request, res: Response) {
        const shifts = await prisma.attendanceShift.findMany({
            where: {
                type: req.query.type ? enumValue(AttendanceShiftType, req.query.type, AttendanceShiftType.NORMAL) : undefined,
                schedule_template_id: asString(req.query.schedule_template_id),
            },
            include: { schedule_template: true },
            orderBy: { name: "asc" },
        });

        res.json({ success: true, data: shifts });
    }

    static async createScheduleTemplate(req: Request, res: Response) {
        const template = await prisma.attendanceScheduleTemplate.create({
            data: {
                name: req.body.name,
                type: enumValue(AttendanceShiftType, req.body.type, AttendanceShiftType.NORMAL),
                working_time: asString(req.body.working_time),
                break_period: asString(req.body.break_period),
                color: asString(req.body.color),
                description: asString(req.body.description),
                days: {
                    create: (req.body.days || []).map((day: any) => ({
                        week_day: enumValue(WeekDay, day.week_day, WeekDay.MONDAY),
                        is_working_day: day.is_working_day === undefined ? true : asBoolean(day.is_working_day, true),
                        start_time: asString(day.start_time),
                        end_time: asString(day.end_time),
                        break_minutes: Number(day.break_minutes || 0),
                    })),
                },
            },
            include: { days: true },
        });

        res.status(201).json({ success: true, data: template });
    }

    static async listScheduleTemplates(_req: Request, res: Response) {
        const templates = await prisma.attendanceScheduleTemplate.findMany({
            include: { days: true },
            orderBy: { name: "asc" },
        });

        res.json({ success: true, data: templates });
    }

    static async createScheduleAssignment(req: Request, res: Response) {
        const assignment = await prisma.scheduleAssignment.create({
            data: {
                target_type: enumValue(ScheduleTargetType, req.body.target_type, ScheduleTargetType.DEPARTMENT),
                starts_at: toDate(req.body.starts_at) || new Date(),
                ends_at: toDate(req.body.ends_at),
                attendance_check_point: asString(req.body.attendance_check_point) || "All",
                department_id: asString(req.body.department_id),
                access_group_id: asString(req.body.access_group_id),
                user_id: asString(req.body.user_id),
                schedule_template_id: asString(req.body.schedule_template_id),
                shift_id: asString(req.body.shift_id),
            },
            include: {
                department: true,
                access_group: true,
                user: true,
                schedule_template: true,
                shift: true,
            },
        });

        res.status(201).json({ success: true, data: assignment });
    }

    static async listScheduleAssignments(req: Request, res: Response) {
        const from = toDate(req.query.from);
        const to = toDate(req.query.to);
        const assignments = await prisma.scheduleAssignment.findMany({
            where: {
                target_type: req.query.target_type
                    ? enumValue(ScheduleTargetType, req.query.target_type, ScheduleTargetType.DEPARTMENT)
                    : undefined,
                department_id: asString(req.query.department_id),
                access_group_id: asString(req.query.access_group_id),
                user_id: asString(req.query.user_id),
                starts_at: from || to ? { gte: from, lte: to } : undefined,
            },
            include: {
                department: true,
                access_group: true,
                user: { include: { images: true, department: true } },
                schedule_template: { include: { days: true } },
                shift: true,
            },
            orderBy: { starts_at: "asc" },
        });

        res.json({ success: true, data: assignments });
    }

    static async createRule(req: Request, res: Response) {
        const rule = await prisma.attendanceRule.create({
            data: {
                name: req.body.name,
                description: asString(req.body.description),
                is_global: asBoolean(req.body.is_global),
                department_id: asString(req.body.department_id),
                schedule_template_id: asString(req.body.schedule_template_id),
                calculation_mode: enumValue(
                    { FIRST_IN_LAST_OUT: "FIRST_IN_LAST_OUT", EVERY_IN_OUT_PAIR: "EVERY_IN_OUT_PAIR" },
                    req.body.calculation_mode,
                    "FIRST_IN_LAST_OUT"
                ) as any,
                late_after_minutes: Number(req.body.late_after_minutes || 0),
                early_leave_minutes: Number(req.body.early_leave_minutes || 0),
                overtime_after_minutes: Number(req.body.overtime_after_minutes || 0),
                weekends: (req.body.weekends || []).map((day: string) => enumValue(WeekDay, day, WeekDay.SUNDAY)),
                is_active: req.body.is_active === undefined ? true : asBoolean(req.body.is_active, true),
                area_rules: req.body.area_rules?.length
                    ? {
                          create: req.body.area_rules.map((area: any) => ({
                              access_point_id: area.access_point_id,
                              mode: enumValue(AttendanceAreaMode, area.mode, AttendanceAreaMode.BOTH),
                          })),
                      }
                    : undefined,
            },
            include: {
                schedule_template: { include: { days: true } },
                area_rules: { include: { access_point: true } },
            },
        });

        res.status(201).json({ success: true, data: rule });
    }

    static async listRules(req: Request, res: Response) {
        const rules = await prisma.attendanceRule.findMany({
            where: {
                department_id: asString(req.query.department_id),
                is_global: req.query.is_global === undefined ? undefined : asBoolean(req.query.is_global),
                is_active: req.query.is_active === undefined ? undefined : asBoolean(req.query.is_active),
            },
            include: {
                department: true,
                schedule_template: { include: { days: true } },
                area_rules: { include: { access_point: true } },
            },
            orderBy: { created_at: "desc" },
        });

        res.json({ success: true, data: rules });
    }

    static async ingestEvent(req: Request, res: Response) {
        const eventTime = toDate(req.body.event_time) || new Date();
        const eventType = enumValue(HikCentralEventType, req.body.event_type, HikCentralEventType.UNKNOWN);
        const personExternalId = asString(req.body.person_external_id || req.body.person_id || req.body.employee_no);
        const person = await resolvePerson(personExternalId, asString(req.body.user_id));
        const accessPoint = req.body.access_point_id
            ? await prisma.hikCentralAccessPoint.findUnique({ where: { id: req.body.access_point_id } })
            : req.body.hikcentral_point_id
              ? await prisma.hikCentralAccessPoint.findUnique({ where: { hikcentral_point_id: req.body.hikcentral_point_id } })
              : null;
        const areaMode = await resolveAttendanceAreaMode(accessPoint?.id, person?.department_id);
        const direction =
            req.body.direction && req.body.direction !== "AUTO"
                ? enumValue(AttendanceDirection, req.body.direction, AttendanceDirection.CHECK_IN)
                : eventDirection(eventType, areaMode);

        const eventData = {
            hikcentral_event_id: asString(req.body.hikcentral_event_id),
            event_type: eventType,
            credential_type: enumValue(HikCentralCredentialType, req.body.credential_type, HikCentralCredentialType.UNKNOWN),
            direction: direction || undefined,
            event_time: eventTime,
            person_external_id: personExternalId,
            person_name: asString(req.body.person_name || person?.full_name),
            card_no: asString(req.body.card_no),
            temperature: req.body.temperature === undefined ? undefined : Number(req.body.temperature),
            skin_surface_temperature: asString(req.body.skin_surface_temperature),
            temperature_status: asString(req.body.temperature_status),
            card_swiping_type: asString(req.body.card_swiping_type),
            verification_mode: asString(req.body.verification_mode || req.body.verify_mode),
            attendance_group: asString(req.body.attendance_group),
            success: req.body.success === undefined ? undefined : asBoolean(req.body.success),
            message: asString(req.body.message),
            raw: req.body,
            user_id: person?.id,
            device_id: asString(req.body.device_id),
            access_point_id: accessPoint?.id,
        };

        const event = eventData.hikcentral_event_id
            ? await prisma.hikCentralAccessEvent.upsert({
                  where: { hikcentral_event_id: eventData.hikcentral_event_id },
                  create: eventData,
                  update: eventData,
              })
            : await prisma.hikCentralAccessEvent.create({ data: eventData });

        const attendance =
            person && direction && areaMode !== "IGNORE" && eventData.success !== false
                ? await updateAttendanceFromEvent({
                      userId: person.id,
                      departmentId: person.department_id,
                      personExternalId,
                      personName: eventData.person_name,
                      eventTime,
                      direction,
                  })
                : null;

        res.status(201).json({ success: true, data: { event, attendance, counted: Boolean(attendance) } });
    }

    static async listRecords(req: Request, res: Response) {
        const from = toDate(req.query.from) || startOfDay(new Date());
        const to = toDate(req.query.to) || endOfDay(from);
        const { skip, limit, page } = paginate(req.query);
        const where: Prisma.AttendanceRecordWhereInput = {
            work_date: { gte: startOfDay(from), lte: endOfDay(to) },
            user_id: asString(req.query.user_id),
            department_id: asString(req.query.department_id),
        };

        const [items, total] = await Promise.all([
            prisma.attendanceRecord.findMany({
                where,
                include: { user: true, department: true },
                orderBy: [{ work_date: "desc" }, { full_name: "asc" }],
                skip,
                take: limit,
            }),
            prisma.attendanceRecord.count({ where }),
        ]);

        res.json({ success: true, data: items, meta: { total, page, limit } });
    }

    static async listTransactions(req: Request, res: Response) {
        const from = toDate(req.query.from) || startOfDay(new Date());
        const to = toDate(req.query.to) || endOfDay(from);
        const { skip, limit, page } = paginate(req.query);
        const where: Prisma.HikCentralAccessEventWhereInput = {
            event_time: { gte: from, lte: to },
            user_id: asString(req.query.user_id),
            access_point_id: asString(req.query.access_point_id),
            credential_type: req.query.credential_type
                ? enumValue(HikCentralCredentialType, req.query.credential_type, HikCentralCredentialType.UNKNOWN)
                : undefined,
        };

        const [items, total] = await Promise.all([
            prisma.hikCentralAccessEvent.findMany({
                where,
                include: {
                    user: { include: { department: true, images: true } },
                    device: true,
                    access_point: true,
                },
                orderBy: { event_time: "desc" },
                skip,
                take: limit,
            }),
            prisma.hikCentralAccessEvent.count({ where }),
        ]);

        res.json({ success: true, data: items, meta: { total, page, limit } });
    }

    static async createManualRecord(req: Request, res: Response) {
        const workDate = startOfDay(toDate(req.body.work_date) || new Date());
        const checkInAt = toDate(req.body.check_in_at) || combineDateAndTime(workDate, req.body.check_in_time);
        const checkOutAt = toDate(req.body.check_out_at) || combineDateAndTime(workDate, req.body.check_out_time);
        const record = await prisma.attendanceRecord.create({
            data: {
                user_id: asString(req.body.user_id),
                department_id: asString(req.body.department_id),
                identifier: asString(req.body.identifier),
                full_name: asString(req.body.full_name),
                attendance_group: asString(req.body.attendance_group),
                work_date: workDate,
                week_day: weekDayName(workDate),
                period_name: asString(req.body.period_name) || "Default",
                required_check_in_time: asString(req.body.required_check_in_time),
                required_check_out_time: asString(req.body.required_check_out_time),
                check_in_at: checkInAt || undefined,
                check_out_at: checkOutAt || undefined,
                check_in_time: checkInAt ? checkInAt.toTimeString().slice(0, 5) : undefined,
                check_out_time: checkOutAt ? checkOutAt.toTimeString().slice(0, 5) : undefined,
                duration_minutes: minutesBetween(checkInAt, checkOutAt) || undefined,
                total_duration_minutes: minutesBetween(checkInAt, checkOutAt) || undefined,
                raw: req.body.raw,
            },
        });

        res.status(201).json({ success: true, data: record });
    }

    static async createApprovalRequest(req: Request, res: Response) {
        const request = await prisma.attendanceApprovalRequest.create({
            data: {
                user_id: req.body.user_id,
                type: enumValue(ApprovalType, req.body.type, ApprovalType.LEAVE),
                status: enumValue(ApprovalStatus, req.body.status, ApprovalStatus.PENDING),
                reason: asString(req.body.reason),
                starts_at: toDate(req.body.starts_at),
                ends_at: toDate(req.body.ends_at),
                raw: req.body.raw || req.body,
            },
            include: { user: true },
        });

        res.status(201).json({ success: true, data: request });
    }

    static async listApprovalRequests(req: Request, res: Response) {
        const requests = await prisma.attendanceApprovalRequest.findMany({
            where: {
                user_id: asString(req.query.user_id),
                type: req.query.type ? enumValue(ApprovalType, req.query.type, ApprovalType.LEAVE) : undefined,
                status: req.query.status ? enumValue(ApprovalStatus, req.query.status, ApprovalStatus.PENDING) : undefined,
            },
            include: { user: { include: { department: true } } },
            orderBy: { requested_at: "desc" },
        });

        res.json({ success: true, data: requests });
    }

    static async report(req: Request, res: Response) {
        const from = toDate(req.query.from) || startOfDay(new Date());
        const to = toDate(req.query.to) || endOfDay(from);
        const records = await prisma.attendanceRecord.findMany({
            where: {
                work_date: { gte: startOfDay(from), lte: endOfDay(to) },
                department_id: asString(req.query.department_id),
            },
            include: { user: true, department: true },
            orderBy: [{ work_date: "asc" }, { full_name: "asc" }],
        });

        const totals = records.reduce(
            (acc, record) => {
                acc.records += 1;
                acc.present += record.check_in_at ? 1 : 0;
                acc.missingCheckout += record.check_in_at && !record.check_out_at ? 1 : 0;
                acc.minutes += record.total_duration_minutes || record.duration_minutes || 0;
                return acc;
            },
            { records: 0, present: 0, missingCheckout: 0, minutes: 0 }
        );

        res.json({ success: true, data: { totals, records } });
    }
}
