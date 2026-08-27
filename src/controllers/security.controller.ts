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
import { pbkdf2Sync, randomBytes } from "crypto";
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

const HASH_PREFIX = "pbkdf2_sha256";
const ITERATIONS = 120000;
const KEY_LENGTH = 32;
const DIGEST = "sha256";

function hashPassword(password: string) {
    const salt = randomBytes(16).toString("hex");
    const hash = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString("hex");
    return `${HASH_PREFIX}$${ITERATIONS}$${salt}$${hash}`;
}

export class SecurityController {
    static async seedDefaultPermissions(_req: Request, res: Response) {
        const modules = [
            "dashboard",
            "metadata",
            "organization",
            "people",
            "devices",
            "access-control",
            "attendance",
            "licenses",
            "tracking",
            "sync",
            "security",
        ];
        const actions = [
            PermissionAction.CREATE,
            PermissionAction.READ,
            PermissionAction.UPDATE,
            PermissionAction.DELETE,
            PermissionAction.MANAGE,
        ];

        const permissions = await prisma.$transaction(
            modules.flatMap((module) =>
                actions.map((action) =>
                    prisma.permission.upsert({
                        where: { module_action: { module, action } },
                        create: {
                            module,
                            action,
                            description: `${action.toLowerCase()} access for ${module}`,
                        },
                        update: {},
                    })
                )
            )
        );

        res.status(201).json({ success: true, data: { created_or_existing: permissions.length, permissions } });
    }

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

    static async listAdmins(_req: Request, res: Response) {
        const admins = await prisma.admin.findMany({
            include: {
                role_assignments: {
                    include: {
                        role: {
                            include: { permissions: { include: { permission: true } } },
                        },
                    },
                },
            },
            orderBy: { created_at: "desc" },
        });

        res.json({
            success: true,
            data: admins.map(({ password, ...admin }) => admin),
        });
    }

    static async createAdmin(req: Request, res: Response) {
        const username = asString(req.body.username);
        const password = asString(req.body.password);
        if (!username || !password || password.length < 6) {
            res.status(400).json({ success: false, message: "Username and password of at least 6 characters are required" });
            return;
        }

        const permissionIds = Array.isArray(req.body.permission_ids) ? req.body.permission_ids : [];
        const modules = Array.isArray(req.body.modules) ? req.body.modules.map(String) : [];
        const actions = Array.isArray(req.body.actions) && req.body.actions.length ? req.body.actions : [PermissionAction.READ];

        const normalizedActions = actions.map((action: string) => enumValue(PermissionAction, action, PermissionAction.READ));
        const modulePermissions = modules.length
            ? await prisma.$transaction(
                  modules.flatMap((module: string) =>
                      normalizedActions.map((action: PermissionAction) =>
                          prisma.permission.upsert({
                              where: { module_action: { module, action } },
                              create: { module, action, description: `${action.toLowerCase()} access for ${module}` },
                              update: {},
                          })
                      )
                  )
              )
            : [];

        const finalPermissionIds = Array.from(new Set([...permissionIds, ...modulePermissions.map((permission) => permission.id)]));
        const roleName = asString(req.body.role_name) || `${username} access`;

        const admin = await prisma.admin.create({
            data: {
                first_name: asString(req.body.first_name) || username,
                second_name: asString(req.body.second_name) || "-",
                username,
                password: hashPassword(password),
                role: Roles.ADMIN,
            },
        });

        const role = finalPermissionIds.length
            ? await prisma.adminRole.create({
                  data: {
                      name: roleName,
                      description: asString(req.body.description) || `Access profile for ${username}`,
                      created_by_id: req.user?.role === "ADMIN" ? req.user.id : undefined,
                      permissions: {
                          create: finalPermissionIds.map((permission_id) => ({
                              permission: { connect: { id: permission_id } },
                          })),
                      },
                      assignments: {
                          create: { admin_id: admin.id },
                      },
                  },
                  include: { permissions: { include: { permission: true } } },
              })
            : null;

        const { password: _password, ...safeAdmin } = admin;
        res.status(201).json({ success: true, data: { admin: safeAdmin, role } });
    }
}

