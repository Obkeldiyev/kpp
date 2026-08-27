import { Roles } from "@prisma/client";
import { Request, Response } from "express";
import { prisma } from "@config";
import { sign } from "jsonwebtoken";
import { pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";
import { asString } from "./shared";

const HASH_PREFIX = "pbkdf2_sha256";
const ITERATIONS = 120000;
const KEY_LENGTH = 32;
const DIGEST = "sha256";

function hashPassword(password: string) {
    const salt = randomBytes(16).toString("hex");
    const hash = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString("hex");
    return `${HASH_PREFIX}$${ITERATIONS}$${salt}$${hash}`;
}

function verifyPassword(password: string, stored: string) {
    const parts = stored.split("$");
    if (parts.length !== 4 || parts[0] !== HASH_PREFIX) {
        return password === stored;
    }

    const [, iterationsRaw, salt, hash] = parts;
    const expected = Buffer.from(hash, "hex");
    const actual = pbkdf2Sync(password, salt, Number(iterationsRaw), expected.length, DIGEST);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function tokenFor(user: { id: string; username: string; role: Roles }) {
    const secret = process.env.SECRET_KEY;
    if (!secret) {
        throw new Error("SECRET_KEY missing in .env");
    }

    return sign({ id: user.id, role: user.role, username: user.username }, secret, { expiresIn: "8h" });
}

async function ensureDefaultSecurity(adminId?: string) {
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
    const actions = ["CREATE", "READ", "UPDATE", "DELETE", "MANAGE"] as const;

    const permissions = await prisma.$transaction(
        modules.flatMap((module) =>
            actions.map((action) =>
                prisma.permission.upsert({
                    where: { module_action: { module, action } },
                    create: { module, action, description: `${action.toLowerCase()} access for ${module}` },
                    update: {},
                })
            )
        )
    );

    if (adminId) {
        const role = await prisma.adminRole.upsert({
            where: { name: "System Administrator" },
            create: {
                name: "System Administrator",
                description: "Full application access",
                permissions: {
                    create: permissions.map((permission) => ({
                        permission: { connect: { id: permission.id } },
                    })),
                },
            },
            update: {},
        });

        await prisma.adminRoleAssignment.upsert({
            where: { admin_id_role_id: { admin_id: adminId, role_id: role.id } },
            create: { admin_id: adminId, role_id: role.id },
            update: {},
        });
    }
}

export class AuthController {
    static async status(_req: Request, res: Response) {
        const [admins, superAdmins] = await Promise.all([prisma.admin.count(), prisma.superAdmin.count()]);
        res.json({ success: true, data: { configured: admins + superAdmins > 0, admins, super_admins: superAdmins } });
    }

    static async setup(req: Request, res: Response) {
        const [admins, superAdmins] = await Promise.all([prisma.admin.count(), prisma.superAdmin.count()]);
        if (admins + superAdmins > 0) {
            res.status(409).json({ success: false, message: "Admin already exists" });
            return;
        }

        const username = asString(req.body.username) || "admin";
        const password = asString(req.body.password);
        if (!password || password.length < 6) {
            res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
            return;
        }

        const user = await prisma.superAdmin.create({
            data: {
                first_name: asString(req.body.first_name) || "System",
                second_name: asString(req.body.second_name) || "Administrator",
                username,
                password: hashPassword(password),
                role: Roles.SUPERADMIN,
            },
        });

        await ensureDefaultSecurity();

        const token = tokenFor(user);
        res.status(201).json({
            success: true,
            data: {
                token,
                user: { id: user.id, username: user.username, role: user.role },
            },
        });
    }

    static async login(req: Request, res: Response) {
        const username = asString(req.body.username);
        const password = asString(req.body.password);
        if (!username || !password) {
            res.status(400).json({ success: false, message: "Username and password are required" });
            return;
        }

        const superAdmin = await prisma.superAdmin.findUnique({ where: { username } });
        const admin = superAdmin ? null : await prisma.admin.findUnique({ where: { username } });
        const user = superAdmin || admin;

        if (!user || !verifyPassword(password, user.password)) {
            res.status(401).json({ success: false, message: "Invalid credentials" });
            return;
        }

        if (admin) {
            await ensureDefaultSecurity(admin.id);
        }

        const token = tokenFor(user);
        res.json({
            success: true,
            data: {
                token,
                user: { id: user.id, username: user.username, role: user.role },
            },
        });
    }
}
