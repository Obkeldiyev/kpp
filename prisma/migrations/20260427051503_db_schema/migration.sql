/*
  Warnings:

  - You are about to drop the `HikCentralDevice` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('ONLINE', 'OFFLINE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "AttendanceAreaMode" AS ENUM ('CHECK_IN', 'CHECK_OUT', 'BOTH', 'IGNORE');

-- CreateEnum
CREATE TYPE "AttendanceCalculationMode" AS ENUM ('FIRST_IN_LAST_OUT', 'EVERY_IN_OUT_PAIR');

-- CreateEnum
CREATE TYPE "AttendanceShiftType" AS ENUM ('NORMAL', 'FLEXIBLE');

-- CreateEnum
CREATE TYPE "ScheduleTargetType" AS ENUM ('DEPARTMENT', 'GROUP', 'PERSON', 'TEMPORARY');

-- CreateEnum
CREATE TYPE "WeekDay" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "PermissionAction" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE');

-- CreateEnum
CREATE TYPE "PolicyStatus" AS ENUM ('ACTIVE', 'DISABLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ApprovalType" AS ENUM ('LEAVE', 'CHECK_IN_OUT_CORRECTION', 'OVERTIME', 'MOBILE_CHECK_IN_OUT');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "Roles" ADD VALUE 'EMPLOYEE';

-- DropForeignKey
ALTER TABLE "HikCentralAccessEvent" DROP CONSTRAINT "HikCentralAccessEvent_device_id_fkey";

-- DropForeignKey
ALTER TABLE "HikCentralAccessPoint" DROP CONSTRAINT "HikCentralAccessPoint_device_id_fkey";

-- AlterTable
ALTER TABLE "AttendanceRecord" ADD COLUMN     "attendance_group" TEXT;

-- AlterTable
ALTER TABLE "HikCentralAccessEvent" ADD COLUMN     "attendance_group" TEXT,
ADD COLUMN     "card_swiping_type" TEXT,
ADD COLUMN     "skin_surface_temperature" TEXT,
ADD COLUMN     "temperature_status" TEXT,
ADD COLUMN     "verification_mode" TEXT;

-- DropTable
DROP TABLE "HikCentralDevice";

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "action" "PermissionAction" NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminRole" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "PolicyStatus" NOT NULL DEFAULT 'ACTIVE',
    "description" TEXT,
    "effective_from" TIMESTAMP(3),
    "effective_to" TIMESTAMP(3),
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminRolePermission" (
    "id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,

    CONSTRAINT "AdminRolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminRoleAssignment" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminRoleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Area" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hikcentral_area_id" TEXT,
    "company_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Area_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel_address" TEXT,
    "chanel_address" TEXT,
    "device_address" TEXT,
    "device_name" TEXT,
    "hikcentral_device_id" TEXT,
    "type" "HikCentralDeviceType" NOT NULL DEFAULT 'UNKNOWN',
    "network_status" "DeviceStatus" NOT NULL DEFAULT 'OFFLINE',
    "record_schedule" TEXT,
    "manufacturer" TEXT,
    "marking_status" TEXT NOT NULL DEFAULT 'unmarked',
    "serial_number" TEXT,
    "ip_address" TEXT,
    "location" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "raw" JSONB,
    "area_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DevicePicture" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "picture_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DevicePicture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "PolicyStatus" NOT NULL DEFAULT 'ACTIVE',
    "hikcentral_group_id" TEXT,
    "department_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccessGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessLevel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "PolicyStatus" NOT NULL DEFAULT 'ACTIVE',
    "hikcentral_level_id" TEXT,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "company_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccessLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessLevelMember" (
    "id" TEXT NOT NULL,
    "access_level_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessLevelMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessLevelGroup" (
    "id" TEXT NOT NULL,
    "access_level_id" TEXT NOT NULL,
    "access_group_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessLevelGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessLevelAccessPoint" (
    "id" TEXT NOT NULL,
    "access_level_id" TEXT NOT NULL,
    "access_point_id" TEXT NOT NULL,
    "can_enter" BOOLEAN NOT NULL DEFAULT true,
    "can_exit" BOOLEAN NOT NULL DEFAULT true,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessLevelAccessPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessGroupMember" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "access_group_id" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessGroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessGroupAccessPoint" (
    "id" TEXT NOT NULL,
    "access_group_id" TEXT NOT NULL,
    "access_point_id" TEXT NOT NULL,
    "can_enter" BOOLEAN NOT NULL DEFAULT true,
    "can_exit" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessGroupAccessPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonAccessException" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "access_point_id" TEXT NOT NULL,
    "allow_access" BOOLEAN NOT NULL,
    "reason" TEXT,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonAccessException_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceScheduleTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AttendanceShiftType" NOT NULL DEFAULT 'NORMAL',
    "working_time" TEXT,
    "break_period" TEXT,
    "color" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceScheduleTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceScheduleDay" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "week_day" "WeekDay" NOT NULL,
    "is_working_day" BOOLEAN NOT NULL DEFAULT true,
    "start_time" TEXT,
    "end_time" TEXT,
    "break_minutes" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AttendanceScheduleDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_global" BOOLEAN NOT NULL DEFAULT false,
    "department_id" TEXT,
    "schedule_template_id" TEXT,
    "calculation_mode" "AttendanceCalculationMode" NOT NULL DEFAULT 'FIRST_IN_LAST_OUT',
    "late_after_minutes" INTEGER NOT NULL DEFAULT 0,
    "early_leave_minutes" INTEGER NOT NULL DEFAULT 0,
    "overtime_after_minutes" INTEGER NOT NULL DEFAULT 0,
    "weekends" "WeekDay"[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceShift" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "type" "AttendanceShiftType" NOT NULL DEFAULT 'NORMAL',
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "break_minutes" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT,
    "schedule_template_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleAssignment" (
    "id" TEXT NOT NULL,
    "target_type" "ScheduleTargetType" NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3),
    "attendance_check_point" TEXT DEFAULT 'All',
    "department_id" TEXT,
    "access_group_id" TEXT,
    "user_id" TEXT,
    "schedule_template_id" TEXT,
    "shift_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceAreaRule" (
    "id" TEXT NOT NULL,
    "attendance_rule_id" TEXT NOT NULL,
    "access_point_id" TEXT NOT NULL,
    "mode" "AttendanceAreaMode" NOT NULL DEFAULT 'BOTH',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceAreaRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceApprovalRequest" (
    "id" TEXT NOT NULL,
    "type" "ApprovalType" NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at" TIMESTAMP(3),
    "decision_note" TEXT,
    "raw" JSONB,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "AttendanceApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Permission_module_idx" ON "Permission"("module");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_module_action_key" ON "Permission"("module", "action");

-- CreateIndex
CREATE UNIQUE INDEX "AdminRole_name_key" ON "AdminRole"("name");

-- CreateIndex
CREATE INDEX "AdminRole_created_by_id_idx" ON "AdminRole"("created_by_id");

-- CreateIndex
CREATE INDEX "AdminRole_status_idx" ON "AdminRole"("status");

-- CreateIndex
CREATE INDEX "AdminRolePermission_permission_id_idx" ON "AdminRolePermission"("permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "AdminRolePermission_role_id_permission_id_key" ON "AdminRolePermission"("role_id", "permission_id");

-- CreateIndex
CREATE INDEX "AdminRoleAssignment_role_id_idx" ON "AdminRoleAssignment"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "AdminRoleAssignment_admin_id_role_id_key" ON "AdminRoleAssignment"("admin_id", "role_id");

-- CreateIndex
CREATE UNIQUE INDEX "Area_hikcentral_area_id_key" ON "Area"("hikcentral_area_id");

-- CreateIndex
CREATE INDEX "Area_company_id_idx" ON "Area"("company_id");

-- CreateIndex
CREATE INDEX "Area_parent_id_idx" ON "Area"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "Area_company_id_name_parent_id_key" ON "Area"("company_id", "name", "parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "Device_hikcentral_device_id_key" ON "Device"("hikcentral_device_id");

-- CreateIndex
CREATE INDEX "Device_area_id_idx" ON "Device"("area_id");

-- CreateIndex
CREATE INDEX "Device_type_idx" ON "Device"("type");

-- CreateIndex
CREATE INDEX "Device_network_status_idx" ON "Device"("network_status");

-- CreateIndex
CREATE INDEX "DevicePicture_device_id_idx" ON "DevicePicture"("device_id");

-- CreateIndex
CREATE UNIQUE INDEX "AccessGroup_hikcentral_group_id_key" ON "AccessGroup"("hikcentral_group_id");

-- CreateIndex
CREATE INDEX "AccessGroup_department_id_idx" ON "AccessGroup"("department_id");

-- CreateIndex
CREATE INDEX "AccessGroup_status_idx" ON "AccessGroup"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AccessGroup_department_id_name_key" ON "AccessGroup"("department_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "AccessLevel_hikcentral_level_id_key" ON "AccessLevel"("hikcentral_level_id");

-- CreateIndex
CREATE INDEX "AccessLevel_company_id_idx" ON "AccessLevel"("company_id");

-- CreateIndex
CREATE INDEX "AccessLevel_status_idx" ON "AccessLevel"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AccessLevel_company_id_name_key" ON "AccessLevel"("company_id", "name");

-- CreateIndex
CREATE INDEX "AccessLevelMember_user_id_idx" ON "AccessLevelMember"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "AccessLevelMember_access_level_id_user_id_key" ON "AccessLevelMember"("access_level_id", "user_id");

-- CreateIndex
CREATE INDEX "AccessLevelGroup_access_group_id_idx" ON "AccessLevelGroup"("access_group_id");

-- CreateIndex
CREATE UNIQUE INDEX "AccessLevelGroup_access_level_id_access_group_id_key" ON "AccessLevelGroup"("access_level_id", "access_group_id");

-- CreateIndex
CREATE INDEX "AccessLevelAccessPoint_access_point_id_idx" ON "AccessLevelAccessPoint"("access_point_id");

-- CreateIndex
CREATE UNIQUE INDEX "AccessLevelAccessPoint_access_level_id_access_point_id_key" ON "AccessLevelAccessPoint"("access_level_id", "access_point_id");

-- CreateIndex
CREATE INDEX "AccessGroupMember_access_group_id_idx" ON "AccessGroupMember"("access_group_id");

-- CreateIndex
CREATE UNIQUE INDEX "AccessGroupMember_user_id_access_group_id_key" ON "AccessGroupMember"("user_id", "access_group_id");

-- CreateIndex
CREATE INDEX "AccessGroupAccessPoint_access_point_id_idx" ON "AccessGroupAccessPoint"("access_point_id");

-- CreateIndex
CREATE UNIQUE INDEX "AccessGroupAccessPoint_access_group_id_access_point_id_key" ON "AccessGroupAccessPoint"("access_group_id", "access_point_id");

-- CreateIndex
CREATE INDEX "PersonAccessException_user_id_idx" ON "PersonAccessException"("user_id");

-- CreateIndex
CREATE INDEX "PersonAccessException_access_point_id_idx" ON "PersonAccessException"("access_point_id");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceScheduleTemplate_name_key" ON "AttendanceScheduleTemplate"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceScheduleDay_template_id_week_day_key" ON "AttendanceScheduleDay"("template_id", "week_day");

-- CreateIndex
CREATE INDEX "AttendanceRule_department_id_idx" ON "AttendanceRule"("department_id");

-- CreateIndex
CREATE INDEX "AttendanceRule_is_global_idx" ON "AttendanceRule"("is_global");

-- CreateIndex
CREATE INDEX "AttendanceRule_is_active_idx" ON "AttendanceRule"("is_active");

-- CreateIndex
CREATE INDEX "AttendanceShift_schedule_template_id_idx" ON "AttendanceShift"("schedule_template_id");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceShift_name_code_key" ON "AttendanceShift"("name", "code");

-- CreateIndex
CREATE INDEX "ScheduleAssignment_target_type_idx" ON "ScheduleAssignment"("target_type");

-- CreateIndex
CREATE INDEX "ScheduleAssignment_department_id_idx" ON "ScheduleAssignment"("department_id");

-- CreateIndex
CREATE INDEX "ScheduleAssignment_access_group_id_idx" ON "ScheduleAssignment"("access_group_id");

-- CreateIndex
CREATE INDEX "ScheduleAssignment_user_id_idx" ON "ScheduleAssignment"("user_id");

-- CreateIndex
CREATE INDEX "ScheduleAssignment_starts_at_ends_at_idx" ON "ScheduleAssignment"("starts_at", "ends_at");

-- CreateIndex
CREATE INDEX "AttendanceAreaRule_access_point_id_idx" ON "AttendanceAreaRule"("access_point_id");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceAreaRule_attendance_rule_id_access_point_id_key" ON "AttendanceAreaRule"("attendance_rule_id", "access_point_id");

-- CreateIndex
CREATE INDEX "AttendanceApprovalRequest_user_id_idx" ON "AttendanceApprovalRequest"("user_id");

-- CreateIndex
CREATE INDEX "AttendanceApprovalRequest_type_status_idx" ON "AttendanceApprovalRequest"("type", "status");

-- CreateIndex
CREATE INDEX "AttendanceApprovalRequest_requested_at_idx" ON "AttendanceApprovalRequest"("requested_at");

-- AddForeignKey
ALTER TABLE "AdminRole" ADD CONSTRAINT "AdminRole_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminRolePermission" ADD CONSTRAINT "AdminRolePermission_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "AdminRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminRolePermission" ADD CONSTRAINT "AdminRolePermission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminRoleAssignment" ADD CONSTRAINT "AdminRoleAssignment_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminRoleAssignment" ADD CONSTRAINT "AdminRoleAssignment_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "AdminRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Area" ADD CONSTRAINT "Area_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Area" ADD CONSTRAINT "Area_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevicePicture" ADD CONSTRAINT "DevicePicture_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HikCentralAccessPoint" ADD CONSTRAINT "HikCentralAccessPoint_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessGroup" ADD CONSTRAINT "AccessGroup_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessLevel" ADD CONSTRAINT "AccessLevel_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessLevelMember" ADD CONSTRAINT "AccessLevelMember_access_level_id_fkey" FOREIGN KEY ("access_level_id") REFERENCES "AccessLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessLevelMember" ADD CONSTRAINT "AccessLevelMember_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessLevelGroup" ADD CONSTRAINT "AccessLevelGroup_access_level_id_fkey" FOREIGN KEY ("access_level_id") REFERENCES "AccessLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessLevelGroup" ADD CONSTRAINT "AccessLevelGroup_access_group_id_fkey" FOREIGN KEY ("access_group_id") REFERENCES "AccessGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessLevelAccessPoint" ADD CONSTRAINT "AccessLevelAccessPoint_access_level_id_fkey" FOREIGN KEY ("access_level_id") REFERENCES "AccessLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessLevelAccessPoint" ADD CONSTRAINT "AccessLevelAccessPoint_access_point_id_fkey" FOREIGN KEY ("access_point_id") REFERENCES "HikCentralAccessPoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessGroupMember" ADD CONSTRAINT "AccessGroupMember_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessGroupMember" ADD CONSTRAINT "AccessGroupMember_access_group_id_fkey" FOREIGN KEY ("access_group_id") REFERENCES "AccessGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessGroupAccessPoint" ADD CONSTRAINT "AccessGroupAccessPoint_access_group_id_fkey" FOREIGN KEY ("access_group_id") REFERENCES "AccessGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessGroupAccessPoint" ADD CONSTRAINT "AccessGroupAccessPoint_access_point_id_fkey" FOREIGN KEY ("access_point_id") REFERENCES "HikCentralAccessPoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonAccessException" ADD CONSTRAINT "PersonAccessException_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonAccessException" ADD CONSTRAINT "PersonAccessException_access_point_id_fkey" FOREIGN KEY ("access_point_id") REFERENCES "HikCentralAccessPoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceScheduleDay" ADD CONSTRAINT "AttendanceScheduleDay_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "AttendanceScheduleTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRule" ADD CONSTRAINT "AttendanceRule_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRule" ADD CONSTRAINT "AttendanceRule_schedule_template_id_fkey" FOREIGN KEY ("schedule_template_id") REFERENCES "AttendanceScheduleTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceShift" ADD CONSTRAINT "AttendanceShift_schedule_template_id_fkey" FOREIGN KEY ("schedule_template_id") REFERENCES "AttendanceScheduleTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleAssignment" ADD CONSTRAINT "ScheduleAssignment_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleAssignment" ADD CONSTRAINT "ScheduleAssignment_access_group_id_fkey" FOREIGN KEY ("access_group_id") REFERENCES "AccessGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleAssignment" ADD CONSTRAINT "ScheduleAssignment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleAssignment" ADD CONSTRAINT "ScheduleAssignment_schedule_template_id_fkey" FOREIGN KEY ("schedule_template_id") REFERENCES "AttendanceScheduleTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleAssignment" ADD CONSTRAINT "ScheduleAssignment_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "AttendanceShift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceAreaRule" ADD CONSTRAINT "AttendanceAreaRule_attendance_rule_id_fkey" FOREIGN KEY ("attendance_rule_id") REFERENCES "AttendanceRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceAreaRule" ADD CONSTRAINT "AttendanceAreaRule_access_point_id_fkey" FOREIGN KEY ("access_point_id") REFERENCES "HikCentralAccessPoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HikCentralAccessEvent" ADD CONSTRAINT "HikCentralAccessEvent_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceApprovalRequest" ADD CONSTRAINT "AttendanceApprovalRequest_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
