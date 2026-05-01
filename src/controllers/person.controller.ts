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

    static async delete(req: Request, res: Response) {
        await prisma.user.delete({ where: { id: req.params.id } });
        res.json({ success: true, data: { id: req.params.id } });
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

    static async listCredentials(req: Request, res: Response) {
        const credentials = await prisma.accessCredential.findMany({
            where: { user_id: req.params.id },
            orderBy: { created_at: "desc" },
        });

        res.json({ success: true, data: credentials });
    }

    static async updateCredential(req: Request, res: Response) {
        const credential = await prisma.accessCredential.update({
            where: { id: req.params.credentialId },
            data: {
                type: req.body.type
                    ? enumValue(HikCentralCredentialType, req.body.type, HikCentralCredentialType.UNKNOWN)
                    : undefined,
                value: asString(req.body.value),
                hikcentral_credential_id: asString(req.body.hikcentral_credential_id),
                is_active: req.body.is_active === undefined ? undefined : asBoolean(req.body.is_active, true),
                issued_at: toDate(req.body.issued_at),
                expires_at: toDate(req.body.expires_at),
            },
        });

        res.json({ success: true, data: credential });
    }

    static async deleteCredential(req: Request, res: Response) {
        await prisma.accessCredential.delete({ where: { id: req.params.credentialId } });
        res.json({ success: true, data: { id: req.params.credentialId } });
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

