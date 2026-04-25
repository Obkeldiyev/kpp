import { NextFunction, Request, Response } from "express";

export function asyncHandler(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
}

export function toDate(value: unknown): Date | undefined {
    if (!value) return undefined;
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? undefined : date;
}

export function startOfDay(value: Date): Date {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
}

export function endOfDay(value: Date): Date {
    const date = new Date(value);
    date.setHours(23, 59, 59, 999);
    return date;
}

export function paginate(query: Request["query"]) {
    const page = Math.max(Number(query.page || 1), 1);
    const limit = Math.min(Math.max(Number(query.limit || 50), 1), 500);

    return {
        page,
        limit,
        skip: (page - 1) * limit,
    };
}

export function combineDateAndTime(date: Date, time?: string | null): Date | null {
    if (!time) return null;

    const [hours, minutes] = time.split(":").map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;

    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
}

export function minutesBetween(start?: Date | null, end?: Date | null): number | null {
    if (!start || !end) return null;
    return Math.max(Math.floor((end.getTime() - start.getTime()) / 60000), 0);
}
