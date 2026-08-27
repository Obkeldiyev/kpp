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

    static async updateShift(req: Request, res: Response) {
        const shift = await prisma.attendanceShift.update({
            where: { id: req.params.id },
            data: {
                name: asString(req.body.name),
                code: asString(req.body.code),
                type: req.body.type ? enumValue(AttendanceShiftType, req.body.type, AttendanceShiftType.NORMAL) : undefined,
                start_time: asString(req.body.start_time),
                end_time: asString(req.body.end_time),
                break_minutes: asNumber(req.body.break_minutes),
                color: asString(req.body.color),
                schedule_template_id: asString(req.body.schedule_template_id),
            },
            include: { schedule_template: true },
        });

        res.json({ success: true, data: shift });
    }

    static async deleteShift(req: Request, res: Response) {
        await prisma.attendanceShift.delete({ where: { id: req.params.id } });
        res.json({ success: true, data: { id: req.params.id } });
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

    static async updateScheduleTemplate(req: Request, res: Response) {
        const template = await prisma.attendanceScheduleTemplate.update({
            where: { id: req.params.id },
            data: {
                name: asString(req.body.name),
                type: req.body.type ? enumValue(AttendanceShiftType, req.body.type, AttendanceShiftType.NORMAL) : undefined,
                working_time: asString(req.body.working_time),
                break_period: asString(req.body.break_period),
                color: asString(req.body.color),
                description: asString(req.body.description),
            },
            include: { days: true },
        });

        res.json({ success: true, data: template });
    }

    static async deleteScheduleTemplate(req: Request, res: Response) {
        await prisma.attendanceScheduleTemplate.delete({ where: { id: req.params.id } });
        res.json({ success: true, data: { id: req.params.id } });
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

    static async deleteScheduleAssignment(req: Request, res: Response) {
        await prisma.scheduleAssignment.delete({ where: { id: req.params.id } });
        res.json({ success: true, data: { id: req.params.id } });
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

    static async updateRule(req: Request, res: Response) {
        const rule = await prisma.attendanceRule.update({
            where: { id: req.params.id },
            data: {
                name: asString(req.body.name),
                description: asString(req.body.description),
                is_global: req.body.is_global === undefined ? undefined : asBoolean(req.body.is_global),
                department_id: asString(req.body.department_id),
                schedule_template_id: asString(req.body.schedule_template_id),
                late_after_minutes: asNumber(req.body.late_after_minutes),
                early_leave_minutes: asNumber(req.body.early_leave_minutes),
                overtime_after_minutes: asNumber(req.body.overtime_after_minutes),
                weekends: Array.isArray(req.body.weekends)
                    ? req.body.weekends.map((day: string) => enumValue(WeekDay, day, WeekDay.SUNDAY))
                    : undefined,
                is_active: req.body.is_active === undefined ? undefined : asBoolean(req.body.is_active, true),
            },
            include: {
                schedule_template: { include: { days: true } },
                area_rules: { include: { access_point: true } },
            },
        });

        res.json({ success: true, data: rule });
    }

    static async deleteRule(req: Request, res: Response) {
        await prisma.attendanceRule.delete({ where: { id: req.params.id } });
        res.json({ success: true, data: { id: req.params.id } });
    }

    static async ingestEvent(req: Request, res: Response) {
        const eventTime = toDate(req.body.event_time) || new Date();
        const rawEventType = asString(req.body.event_type || req.body.eventType || req.body.major_event_type);
        const rawCredentialType = asString(req.body.credential_type || req.body.credentialType || req.body.credential);
        const verificationMode = asString(req.body.verification_mode || req.body.verify_mode || req.body.method);
        const faceLike = [rawEventType, rawCredentialType, verificationMode]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes("face"));
        const success = req.body.success === undefined ? undefined : asBoolean(req.body.success);
        const eventType = rawEventType
            ? enumValue(HikCentralEventType, rawEventType, HikCentralEventType.UNKNOWN)
            : faceLike
              ? success === false
                  ? HikCentralEventType.FACE_NOT_RECOGNIZED
                  : HikCentralEventType.FACE_RECOGNIZED
              : HikCentralEventType.UNKNOWN;
        const credentialType = rawCredentialType
            ? enumValue(HikCentralCredentialType, rawCredentialType, HikCentralCredentialType.UNKNOWN)
            : faceLike
              ? HikCentralCredentialType.FACE
              : HikCentralCredentialType.UNKNOWN;
        const personExternalId = asString(req.body.person_external_id || req.body.person_id || req.body.employee_no);
        const person = await resolvePerson(personExternalId, asString(req.body.user_id));
        const accessPoint = req.body.access_point_id
            ? await prisma.hikCentralAccessPoint.findUnique({ where: { id: req.body.access_point_id } })
            : req.body.hikcentral_point_id
              ? await prisma.hikCentralAccessPoint.findUnique({ where: { hikcentral_point_id: req.body.hikcentral_point_id } })
              : null;
        const device = req.body.device_id
            ? await prisma.device.findUnique({ where: { id: req.body.device_id } })
            : req.body.hikcentral_device_id
              ? await prisma.device.findUnique({ where: { hikcentral_device_id: req.body.hikcentral_device_id } })
              : req.body.device_ip
                ? await prisma.device.findFirst({
                      where: {
                          OR: [
                              { ip_address: req.body.device_ip },
                              { device_address: { contains: req.body.device_ip } },
                              { channel_address: { contains: req.body.device_ip } },
                          ],
                      },
                  })
                : null;
        const areaMode = await resolveAttendanceAreaMode(accessPoint?.id, person?.department_id);
        const direction =
            req.body.direction && req.body.direction !== "AUTO"
                ? enumValue(AttendanceDirection, req.body.direction, AttendanceDirection.CHECK_IN)
                : eventDirection(eventType, areaMode);

        const eventData = {
            hikcentral_event_id: asString(req.body.hikcentral_event_id),
            event_type: eventType,
            credential_type: credentialType,
            direction: direction || undefined,
            event_time: eventTime,
            person_external_id: personExternalId,
            person_name: asString(req.body.person_name || person?.full_name),
            card_no: asString(req.body.card_no),
            temperature: req.body.temperature === undefined ? undefined : Number(req.body.temperature),
            skin_surface_temperature: asString(req.body.skin_surface_temperature),
            temperature_status: asString(req.body.temperature_status),
            card_swiping_type: asString(req.body.card_swiping_type),
            verification_mode: verificationMode,
            attendance_group: asString(req.body.attendance_group),
            success,
            message: asString(req.body.message),
            raw: req.body,
            user_id: person?.id,
            device_id: device?.id,
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

    static async deleteRecord(req: Request, res: Response) {
        await prisma.attendanceRecord.delete({ where: { id: req.params.id } });
        res.json({ success: true, data: { id: req.params.id } });
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

