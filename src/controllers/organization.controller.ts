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

    static async getCompany(req: Request, res: Response) {
        const company = await prisma.company.findUnique({
            where: { id: req.params.id },
            include: { departments: true, areas: true, users: true, access_levels: true, licenses: true },
        });

        res.json({ success: true, data: company });
    }

    static async updateCompany(req: Request, res: Response) {
        const company = await prisma.company.update({
            where: { id: req.params.id },
            data: { name: asString(req.body.name), hikcentral_org_id: asString(req.body.hikcentral_org_id) },
            include: { departments: true, areas: true },
        });

        res.json({ success: true, data: company });
    }

    static async deleteCompany(req: Request, res: Response) {
        await prisma.company.delete({ where: { id: req.params.id } });
        res.json({ success: true, data: { id: req.params.id } });
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

    static async getDepartment(req: Request, res: Response) {
        const department = await prisma.department.findUnique({
            where: { id: req.params.id },
            include: { parent: true, children: true, company: true, users: true },
        });

        res.json({ success: true, data: department });
    }

    static async updateDepartment(req: Request, res: Response) {
        const department = await prisma.department.update({
            where: { id: req.params.id },
            data: {
                name: asString(req.body.name),
                path: asString(req.body.path),
                hikcentral_org_id: asString(req.body.hikcentral_org_id),
                company_id: asString(req.body.company_id),
                parent_id: asString(req.body.parent_id),
            },
            include: { parent: true, children: true, company: true },
        });

        res.json({ success: true, data: department });
    }

    static async deleteDepartment(req: Request, res: Response) {
        await prisma.department.delete({ where: { id: req.params.id } });
        res.json({ success: true, data: { id: req.params.id } });
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

    static async getArea(req: Request, res: Response) {
        const area = await prisma.area.findUnique({
            where: { id: req.params.id },
            include: { parent: true, children: true, company: true, devices: true },
        });

        res.json({ success: true, data: area });
    }

    static async updateArea(req: Request, res: Response) {
        const area = await prisma.area.update({
            where: { id: req.params.id },
            data: {
                name: asString(req.body.name),
                hikcentral_area_id: asString(req.body.hikcentral_area_id),
                company_id: asString(req.body.company_id),
                parent_id: asString(req.body.parent_id),
            },
            include: { parent: true, children: true, company: true, devices: true },
        });

        res.json({ success: true, data: area });
    }

    static async deleteArea(req: Request, res: Response) {
        await prisma.area.delete({ where: { id: req.params.id } });
        res.json({ success: true, data: { id: req.params.id } });
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

