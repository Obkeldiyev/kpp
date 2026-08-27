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
import { enrollFaceOnBridge } from "../services/bridge.service";
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
    static async enrollOnDevices(req: Request, res: Response) {
        const file = req.file;
        const personId = asString(req.body.id_number);
        const deviceIds = String(req.body.device_ids || "").split(",").map((id) => id.trim()).filter(Boolean);
        if (!file || !personId || deviceIds.length === 0) {
            res.status(400).json({ success: false, message: "Person ID, face image, and at least one device are required" });
            return;
        }

        const devices = await prisma.device.findMany({ where: { id: { in: deviceIds } } });
        if (devices.length !== deviceIds.length) {
            res.status(400).json({ success: false, message: "One or more selected devices were not found" });
            return;
        }

        const fullName = asString(req.body.full_name) || `${req.body.first_name || ""} ${req.body.second_name || ""}`.trim() || personId;
        const [firstName, ...rest] = fullName.split(" ");
        const person = await prisma.user.upsert({
            where: { id_number: personId },
            create: { id_number: personId, first_name: firstName, second_name: rest.join(" ") || "-", full_name: fullName, role: Roles.USER },
            update: { first_name: firstName, second_name: rest.join(" ") || "-", full_name: fullName },
        });

        const results = [];
        for (const device of devices) {
            if (!device.ip_address || !device.sdk_username || !device.sdk_password) {
                results.push({ device_id: device.id, ok: false, error: "Device credentials are incomplete" });
                continue;
            }
            try {
                const result = await enrollFaceOnBridge(device, personId, file);
                results.push({ device_id: device.id, name: device.name, ok: Boolean(result?.ok), result });
            } catch (error: any) {
                results.push({ device_id: device.id, name: device.name, ok: false, error: error?.response?.data?.detail || error.message });
            }
        }

        const successful = results.filter((result) => result.ok).length;
        await prisma.faceCredential.create({ data: { user_id: person.id, status: successful ? "ACTIVE" : "FAILED", enrolled_at: successful ? new Date() : null } });
        res.status(successful ? 201 : 502).json({ success: successful > 0, data: { person, results, enrolled: successful, total: results.length } });
    }

    static async upsertFromBridge(req: Request, res: Response) {
        const personId = asString(req.body.person_id || req.body.id_number || req.body.employee_no);
        if (!personId) {
            res.status(400).json({ success: false, message: "person_id is required" });
            return;
        }

        const fullName = asString(req.body.full_name || req.body.name) || personId;
        const [firstName, ...rest] = fullName.split(" ");
        const secondName = rest.join(" ") || "-";
        const imageUrl = asString(req.body.image_url || req.body.photo_url);

        const person = await prisma.user.upsert({
            where: { id_number: personId },
            create: {
                id_number: personId,
                identification: asString(req.body.identification),
                hikcentral_person_id: asString(req.body.hikcentral_person_id || personId),
                hikcentral_employee_no: asString(req.body.hikcentral_employee_no || req.body.employee_no || personId),
                first_name: asString(req.body.first_name) || firstName,
                second_name: asString(req.body.second_name) || secondName,
                full_name: fullName,
                position: asString(req.body.position),
                phone: asString(req.body.phone),
                role: Roles.USER,
                company_id: asString(req.body.company_id),
                department_id: asString(req.body.department_id),
                images: imageUrl
                    ? {
                          create: {
                              url: imageUrl,
                              hikcentral_image_id: asString(req.body.hikcentral_image_id),
                              is_primary_face: true,
                          },
                      }
                    : undefined,
                face_credentials: asString(req.body.hikcentral_face_id)
                    ? {
                          create: {
                              hikcentral_face_id: asString(req.body.hikcentral_face_id),
                              status: asString(req.body.face_status) || "ACTIVE",
                              enrolled_at: toDate(req.body.enrolled_at) || new Date(),
                          },
                      }
                    : undefined,
            },
            update: {
                identification: asString(req.body.identification),
                hikcentral_person_id: asString(req.body.hikcentral_person_id || personId),
                hikcentral_employee_no: asString(req.body.hikcentral_employee_no || req.body.employee_no || personId),
                first_name: asString(req.body.first_name) || firstName,
                second_name: asString(req.body.second_name) || secondName,
                full_name: fullName,
                position: asString(req.body.position),
                phone: asString(req.body.phone),
                company_id: asString(req.body.company_id),
                department_id: asString(req.body.department_id),
                images: imageUrl
                    ? {
                          create: {
                              url: imageUrl,
                              hikcentral_image_id: asString(req.body.hikcentral_image_id),
                              is_primary_face: true,
                          },
                      }
                    : undefined,
            },
            include: includePerson,
        });

        const faceId = asString(req.body.hikcentral_face_id);
        const faceStatus = asString(req.body.face_status) || "ACTIVE";
        const savedImage = imageUrl
            ? await prisma.images.findFirst({
                  where: { user_id: person.id, url: imageUrl },
                  orderBy: { created_at: "desc" },
              })
            : null;

        if (faceId || imageUrl) {
            const existingFace = faceId
                ? await prisma.faceCredential.findUnique({ where: { hikcentral_face_id: faceId } })
                : await prisma.faceCredential.findFirst({ where: { user_id: person.id, image_id: savedImage?.id } });

            if (existingFace) {
                await prisma.faceCredential.update({
                    where: { id: existingFace.id },
                    data: { status: faceStatus, image_id: savedImage?.id || existingFace.image_id, enrolled_at: new Date() },
                });
            } else {
                await prisma.faceCredential.create({
                    data: {
                        user_id: person.id,
                        hikcentral_face_id: faceId,
                        status: faceStatus,
                        image_id: savedImage?.id,
                        enrolled_at: new Date(),
                    },
                });
            }
        }

        const refreshed = await prisma.user.findUnique({ where: { id: person.id }, include: includePerson });

        res.status(201).json({ success: true, data: refreshed });
    }

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
                face_credentials: asString(req.body.hikcentral_face_id)
                    ? {
                          create: {
                              hikcentral_face_id: asString(req.body.hikcentral_face_id),
                              status: asString(req.body.face_status) || "ACTIVE",
                              enrolled_at: toDate(req.body.enrolled_at) || new Date(),
                          },
                      }
                    : undefined,
                access_credentials: asString(req.body.card_no)
                    ? {
                          create: {
                              type: HikCentralCredentialType.CARD,
                              value: asString(req.body.card_no)!,
                              hikcentral_credential_id: asString(req.body.hikcentral_credential_id),
                              is_active: true,
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

    static async addFace(req: Request, res: Response) {
        const imageUrl = asString(req.body.image_url || req.body.photo_url);
        const image = imageUrl
            ? await prisma.images.create({
                  data: {
                      user_id: req.params.id,
                      url: imageUrl,
                      hikcentral_image_id: asString(req.body.hikcentral_image_id),
                      is_primary_face: req.body.is_primary_face === undefined ? true : asBoolean(req.body.is_primary_face, true),
                  },
              })
            : null;

        const face = await prisma.faceCredential.create({
            data: {
                user_id: req.params.id,
                image_id: image?.id,
                hikcentral_face_id: asString(req.body.hikcentral_face_id),
                status: asString(req.body.status || req.body.face_status) || "ACTIVE",
                quality_score: req.body.quality_score === undefined ? undefined : Number(req.body.quality_score),
                enrolled_at: toDate(req.body.enrolled_at) || new Date(),
                expires_at: toDate(req.body.expires_at),
            },
            include: { image: true },
        });

        res.status(201).json({ success: true, data: face });
    }

    static async listFaces(req: Request, res: Response) {
        const faces = await prisma.faceCredential.findMany({
            where: { user_id: req.params.id },
            include: { image: true },
            orderBy: { created_at: "desc" },
        });

        res.json({ success: true, data: faces });
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

