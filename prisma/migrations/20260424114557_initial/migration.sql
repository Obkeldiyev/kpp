-- CreateEnum
CREATE TYPE "Roles" AS ENUM ('ADMIN', 'SUPERADMIN', 'USER');

-- CreateEnum
CREATE TYPE "HikCentralDeviceType" AS ENUM ('ACCESS_CONTROL', 'FACE_TERMINAL', 'CAMERA', 'DOOR', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "HikCentralCredentialType" AS ENUM ('FACE', 'CARD', 'FINGERPRINT', 'PIN', 'QR', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "HikCentralEventType" AS ENUM ('ACCESS_GRANTED', 'ACCESS_DENIED', 'FACE_RECOGNIZED', 'FACE_NOT_RECOGNIZED', 'CHECK_IN', 'CHECK_OUT', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "AttendanceDirection" AS ENUM ('CHECK_IN', 'CHECK_OUT');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "SuperAdmin" (
    "id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "second_name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Roles" NOT NULL DEFAULT 'SUPERADMIN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuperAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "second_name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Roles" NOT NULL DEFAULT 'ADMIN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "id_number" TEXT NOT NULL,
    "identification" TEXT,
    "hikcentral_person_id" TEXT,
    "hikcentral_employee_no" TEXT,
    "first_name" TEXT NOT NULL,
    "second_name" TEXT NOT NULL,
    "full_name" TEXT,
    "position" TEXT,
    "phone" TEXT,
    "role" "Roles" NOT NULL DEFAULT 'USER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "company_id" TEXT,
    "department_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Images" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "hikcentral_image_id" TEXT,
    "is_primary_face" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "Images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hikcentral_org_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "hikcentral_org_id" TEXT,
    "parent_id" TEXT,
    "company_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaceCredential" (
    "id" TEXT NOT NULL,
    "hikcentral_face_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "quality_score" DOUBLE PRECISION,
    "enrolled_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,
    "image_id" TEXT,

    CONSTRAINT "FaceCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessCredential" (
    "id" TEXT NOT NULL,
    "type" "HikCentralCredentialType" NOT NULL,
    "value" TEXT NOT NULL,
    "hikcentral_credential_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "issued_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "AccessCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HikCentralDevice" (
    "id" TEXT NOT NULL,
    "hikcentral_device_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "HikCentralDeviceType" NOT NULL DEFAULT 'UNKNOWN',
    "serial_number" TEXT,
    "ip_address" TEXT,
    "location" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "raw" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HikCentralDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HikCentralAccessPoint" (
    "id" TEXT NOT NULL,
    "hikcentral_point_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "door_no" TEXT,
    "floor" TEXT,
    "location" TEXT,
    "device_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HikCentralAccessPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HikCentralAccessEvent" (
    "id" TEXT NOT NULL,
    "hikcentral_event_id" TEXT,
    "event_type" "HikCentralEventType" NOT NULL DEFAULT 'UNKNOWN',
    "credential_type" "HikCentralCredentialType" NOT NULL DEFAULT 'UNKNOWN',
    "direction" "AttendanceDirection",
    "event_time" TIMESTAMP(3) NOT NULL,
    "person_external_id" TEXT,
    "person_name" TEXT,
    "card_no" TEXT,
    "temperature" DOUBLE PRECISION,
    "success" BOOLEAN,
    "message" TEXT,
    "raw" JSONB,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT,
    "device_id" TEXT,
    "access_point_id" TEXT,

    CONSTRAINT "HikCentralAccessEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceImport" (
    "id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "report_name" TEXT,
    "operator" TEXT,
    "exported_at" TIMESTAMP(3),
    "period_start" TIMESTAMP(3),
    "period_end" TIMESTAMP(3),
    "source" TEXT NOT NULL DEFAULT 'HIKCENTRAL_EXCEL',
    "status" "SyncStatus" NOT NULL DEFAULT 'SUCCESS',
    "raw" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "company_id" TEXT,

    CONSTRAINT "AttendanceImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "person_code" TEXT,
    "identifier" TEXT,
    "first_name" TEXT,
    "second_name" TEXT,
    "full_name" TEXT,
    "department_path" TEXT,
    "time_group" TEXT,
    "position" TEXT,
    "work_date" TIMESTAMP(3) NOT NULL,
    "week_day" TEXT,
    "period_name" TEXT,
    "required_check_in_date" TIMESTAMP(3),
    "required_check_in_time" TEXT,
    "required_check_out_date" TIMESTAMP(3),
    "required_check_out_time" TEXT,
    "check_in_at" TIMESTAMP(3),
    "check_out_at" TIMESTAMP(3),
    "check_in_time" TEXT,
    "check_out_time" TEXT,
    "duration_minutes" INTEGER,
    "total_duration_minutes" INTEGER,
    "raw" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT,
    "department_id" TEXT,
    "import_id" TEXT,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HikCentralSyncJob" (
    "id" TEXT NOT NULL,
    "job_type" TEXT NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "last_cursor" TEXT,
    "error_message" TEXT,
    "raw" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HikCentralSyncJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SuperAdmin_username_key" ON "SuperAdmin"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_username_key" ON "Admin"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_id_number_key" ON "User"("id_number");

-- CreateIndex
CREATE UNIQUE INDEX "User_identification_key" ON "User"("identification");

-- CreateIndex
CREATE UNIQUE INDEX "User_hikcentral_person_id_key" ON "User"("hikcentral_person_id");

-- CreateIndex
CREATE INDEX "User_company_id_idx" ON "User"("company_id");

-- CreateIndex
CREATE INDEX "User_department_id_idx" ON "User"("department_id");

-- CreateIndex
CREATE INDEX "User_hikcentral_employee_no_idx" ON "User"("hikcentral_employee_no");

-- CreateIndex
CREATE UNIQUE INDEX "Images_hikcentral_image_id_key" ON "Images"("hikcentral_image_id");

-- CreateIndex
CREATE INDEX "Images_user_id_idx" ON "Images"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Company_name_key" ON "Company"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Company_hikcentral_org_id_key" ON "Company"("hikcentral_org_id");

-- CreateIndex
CREATE UNIQUE INDEX "Department_hikcentral_org_id_key" ON "Department"("hikcentral_org_id");

-- CreateIndex
CREATE INDEX "Department_company_id_idx" ON "Department"("company_id");

-- CreateIndex
CREATE INDEX "Department_parent_id_idx" ON "Department"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "Department_company_id_path_key" ON "Department"("company_id", "path");

-- CreateIndex
CREATE UNIQUE INDEX "FaceCredential_hikcentral_face_id_key" ON "FaceCredential"("hikcentral_face_id");

-- CreateIndex
CREATE INDEX "FaceCredential_user_id_idx" ON "FaceCredential"("user_id");

-- CreateIndex
CREATE INDEX "FaceCredential_image_id_idx" ON "FaceCredential"("image_id");

-- CreateIndex
CREATE UNIQUE INDEX "AccessCredential_hikcentral_credential_id_key" ON "AccessCredential"("hikcentral_credential_id");

-- CreateIndex
CREATE INDEX "AccessCredential_user_id_idx" ON "AccessCredential"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "AccessCredential_type_value_key" ON "AccessCredential"("type", "value");

-- CreateIndex
CREATE UNIQUE INDEX "HikCentralDevice_hikcentral_device_id_key" ON "HikCentralDevice"("hikcentral_device_id");

-- CreateIndex
CREATE INDEX "HikCentralDevice_type_idx" ON "HikCentralDevice"("type");

-- CreateIndex
CREATE UNIQUE INDEX "HikCentralAccessPoint_hikcentral_point_id_key" ON "HikCentralAccessPoint"("hikcentral_point_id");

-- CreateIndex
CREATE INDEX "HikCentralAccessPoint_device_id_idx" ON "HikCentralAccessPoint"("device_id");

-- CreateIndex
CREATE UNIQUE INDEX "HikCentralAccessEvent_hikcentral_event_id_key" ON "HikCentralAccessEvent"("hikcentral_event_id");

-- CreateIndex
CREATE INDEX "HikCentralAccessEvent_event_time_idx" ON "HikCentralAccessEvent"("event_time");

-- CreateIndex
CREATE INDEX "HikCentralAccessEvent_user_id_event_time_idx" ON "HikCentralAccessEvent"("user_id", "event_time");

-- CreateIndex
CREATE INDEX "HikCentralAccessEvent_person_external_id_idx" ON "HikCentralAccessEvent"("person_external_id");

-- CreateIndex
CREATE INDEX "HikCentralAccessEvent_device_id_idx" ON "HikCentralAccessEvent"("device_id");

-- CreateIndex
CREATE INDEX "HikCentralAccessEvent_access_point_id_idx" ON "HikCentralAccessEvent"("access_point_id");

-- CreateIndex
CREATE INDEX "AttendanceImport_company_id_idx" ON "AttendanceImport"("company_id");

-- CreateIndex
CREATE INDEX "AttendanceImport_period_start_period_end_idx" ON "AttendanceImport"("period_start", "period_end");

-- CreateIndex
CREATE INDEX "AttendanceRecord_user_id_work_date_idx" ON "AttendanceRecord"("user_id", "work_date");

-- CreateIndex
CREATE INDEX "AttendanceRecord_department_id_work_date_idx" ON "AttendanceRecord"("department_id", "work_date");

-- CreateIndex
CREATE INDEX "AttendanceRecord_import_id_idx" ON "AttendanceRecord"("import_id");

-- CreateIndex
CREATE INDEX "AttendanceRecord_work_date_idx" ON "AttendanceRecord"("work_date");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_identifier_work_date_period_name_key" ON "AttendanceRecord"("identifier", "work_date", "period_name");

-- CreateIndex
CREATE INDEX "HikCentralSyncJob_job_type_status_idx" ON "HikCentralSyncJob"("job_type", "status");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Images" ADD CONSTRAINT "Images_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaceCredential" ADD CONSTRAINT "FaceCredential_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaceCredential" ADD CONSTRAINT "FaceCredential_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "Images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessCredential" ADD CONSTRAINT "AccessCredential_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HikCentralAccessPoint" ADD CONSTRAINT "HikCentralAccessPoint_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "HikCentralDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HikCentralAccessEvent" ADD CONSTRAINT "HikCentralAccessEvent_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HikCentralAccessEvent" ADD CONSTRAINT "HikCentralAccessEvent_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "HikCentralDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HikCentralAccessEvent" ADD CONSTRAINT "HikCentralAccessEvent_access_point_id_fkey" FOREIGN KEY ("access_point_id") REFERENCES "HikCentralAccessPoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceImport" ADD CONSTRAINT "AttendanceImport_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "AttendanceImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
