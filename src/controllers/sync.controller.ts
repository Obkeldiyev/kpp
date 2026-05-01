import { Prisma, SyncStatus } from "@prisma/client";
import { Request, Response } from "express";
import { prisma } from "@config";
import { paginate, toDate } from "@utils";
import { asString, enumValue } from "./shared";

export class SyncJobController {
    static async create(req: Request, res: Response) {
        const job = await prisma.hikCentralSyncJob.create({
            data: {
                job_type: req.body.job_type,
                status: enumValue(SyncStatus, req.body.status, SyncStatus.PENDING),
                started_at: toDate(req.body.started_at),
                finished_at: toDate(req.body.finished_at),
                last_cursor: asString(req.body.last_cursor),
                error_message: asString(req.body.error_message),
                raw: req.body.raw || req.body,
            },
        });

        res.status(201).json({ success: true, data: job });
    }

    static async list(req: Request, res: Response) {
        const { skip, limit, page } = paginate(req.query);
        const where: Prisma.HikCentralSyncJobWhereInput = {
            job_type: asString(req.query.job_type),
            status: req.query.status ? enumValue(SyncStatus, req.query.status, SyncStatus.PENDING) : undefined,
        };

        const [items, total] = await Promise.all([
            prisma.hikCentralSyncJob.findMany({
                where,
                orderBy: { created_at: "desc" },
                skip,
                take: limit,
            }),
            prisma.hikCentralSyncJob.count({ where }),
        ]);

        res.json({ success: true, data: items, meta: { total, page, limit } });
    }

    static async get(req: Request, res: Response) {
        const job = await prisma.hikCentralSyncJob.findUnique({ where: { id: req.params.id } });
        res.json({ success: true, data: job });
    }

    static async update(req: Request, res: Response) {
        const job = await prisma.hikCentralSyncJob.update({
            where: { id: req.params.id },
            data: {
                job_type: asString(req.body.job_type),
                status: req.body.status ? enumValue(SyncStatus, req.body.status, SyncStatus.PENDING) : undefined,
                started_at: toDate(req.body.started_at),
                finished_at: toDate(req.body.finished_at),
                last_cursor: asString(req.body.last_cursor),
                error_message: asString(req.body.error_message),
                raw: req.body.raw,
            },
        });

        res.json({ success: true, data: job });
    }

    static async start(req: Request, res: Response) {
        const job = await prisma.hikCentralSyncJob.update({
            where: { id: req.params.id },
            data: { status: SyncStatus.RUNNING, started_at: new Date(), finished_at: null, error_message: null },
        });

        res.json({ success: true, data: job });
    }

    static async finish(req: Request, res: Response) {
        const job = await prisma.hikCentralSyncJob.update({
            where: { id: req.params.id },
            data: {
                status: SyncStatus.SUCCESS,
                finished_at: new Date(),
                last_cursor: asString(req.body.last_cursor),
                error_message: null,
            },
        });

        res.json({ success: true, data: job });
    }

    static async fail(req: Request, res: Response) {
        const job = await prisma.hikCentralSyncJob.update({
            where: { id: req.params.id },
            data: {
                status: SyncStatus.FAILED,
                finished_at: new Date(),
                error_message: asString(req.body.error_message) || "Sync failed",
            },
        });

        res.json({ success: true, data: job });
    }

    static async delete(req: Request, res: Response) {
        await prisma.hikCentralSyncJob.delete({ where: { id: req.params.id } });
        res.json({ success: true, data: { id: req.params.id } });
    }
}
