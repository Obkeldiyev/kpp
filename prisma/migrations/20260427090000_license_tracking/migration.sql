-- CreateEnum
CREATE TYPE "HikCentralLicenseStatus" AS ENUM ('ACTIVE', 'TRIAL', 'EXPIRED', 'SUSPENDED', 'DISABLED');

-- CreateEnum
CREATE TYPE "HikCentralLicenseFeatureCode" AS ENUM ('VIDEO', 'ACCESS_CONTROL', 'ATTENDANCE', 'FACE_RECOGNITION', 'VISITOR', 'ALARM', 'MOBILE', 'API', 'STORAGE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "HikCentralTrackingSubjectType" AS ENUM ('PERSON', 'VEHICLE', 'ASSET', 'DEVICE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "HikCentralTrackingStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "HikCentralTrackingEventType" AS ENUM ('ACCESS_EVENT', 'CAMERA_DETECTION', 'FACE_MATCH', 'MANUAL', 'ALARM', 'LOCATION_UPDATE', 'UNKNOWN');

-- CreateTable
CREATE TABLE "HikCentralLicense" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "license_key" TEXT NOT NULL,
    "hikcentral_license_id" TEXT,
    "status" "HikCentralLicenseStatus" NOT NULL DEFAULT 'ACTIVE',
    "seats" INTEGER,
    "max_devices" INTEGER,
    "max_doors" INTEGER,
    "max_cameras" INTEGER,
    "max_faces" INTEGER,
    "max_users" INTEGER,
    "issued_at" TIMESTAMP(3),
    "activated_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "vendor" TEXT,
    "raw" JSONB,
    "company_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HikCentralLicense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HikCentralLicenseFeature" (
    "id" TEXT NOT NULL,
    "license_id" TEXT NOT NULL,
    "code" "HikCentralLicenseFeatureCode" NOT NULL DEFAULT 'UNKNOWN',
    "name" TEXT NOT NULL,
    "quota" INTEGER,
    "used" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HikCentralLicenseFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HikCentralLicenseAllocation" (
    "id" TEXT NOT NULL,
    "license_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "feature" "HikCentralLicenseFeatureCode" NOT NULL DEFAULT 'UNKNOWN',
    "allocated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "released_at" TIMESTAMP(3),

    CONSTRAINT "HikCentralLicenseAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HikCentralLicenseUsageSnapshot" (
    "id" TEXT NOT NULL,
    "license_id" TEXT,
    "company_id" TEXT,
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active_users" INTEGER NOT NULL DEFAULT 0,
    "active_devices" INTEGER NOT NULL DEFAULT 0,
    "active_cameras" INTEGER NOT NULL DEFAULT 0,
    "active_doors" INTEGER NOT NULL DEFAULT 0,
    "active_faces" INTEGER NOT NULL DEFAULT 0,
    "access_events" INTEGER NOT NULL DEFAULT 0,
    "attendance_records" INTEGER NOT NULL DEFAULT 0,
    "raw" JSONB,

    CONSTRAINT "HikCentralLicenseUsageSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HikCentralTrackingSession" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject_type" "HikCentralTrackingSubjectType" NOT NULL DEFAULT 'PERSON',
    "status" "HikCentralTrackingStatus" NOT NULL DEFAULT 'ACTIVE',
    "hikcentral_track_id" TEXT,
    "subject_external_id" TEXT,
    "subject_name" TEXT,
    "starts_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ends_at" TIMESTAMP(3),
    "last_seen_at" TIMESTAMP(3),
    "note" TEXT,
    "raw" JSONB,
    "company_id" TEXT,
    "user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HikCentralTrackingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HikCentralTrackingPoint" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "event_type" "HikCentralTrackingEventType" NOT NULL DEFAULT 'UNKNOWN',
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "area_name" TEXT,
    "location" TEXT,
    "confidence" DOUBLE PRECISION,
    "snapshot_url" TEXT,
    "message" TEXT,
    "raw" JSONB,
    "user_id" TEXT,
    "device_id" TEXT,
    "access_event_id" TEXT,

    CONSTRAINT "HikCentralTrackingPoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HikCentralLicense_license_key_key" ON "HikCentralLicense"("license_key");

-- CreateIndex
CREATE UNIQUE INDEX "HikCentralLicense_hikcentral_license_id_key" ON "HikCentralLicense"("hikcentral_license_id");

-- CreateIndex
CREATE INDEX "HikCentralLicense_company_id_idx" ON "HikCentralLicense"("company_id");

-- CreateIndex
CREATE INDEX "HikCentralLicense_status_idx" ON "HikCentralLicense"("status");

-- CreateIndex
CREATE INDEX "HikCentralLicense_expires_at_idx" ON "HikCentralLicense"("expires_at");

-- CreateIndex
CREATE INDEX "HikCentralLicenseFeature_code_idx" ON "HikCentralLicenseFeature"("code");

-- CreateIndex
CREATE INDEX "HikCentralLicenseFeature_enabled_idx" ON "HikCentralLicenseFeature"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "HikCentralLicenseFeature_license_id_code_key" ON "HikCentralLicenseFeature"("license_id", "code");

-- CreateIndex
CREATE INDEX "HikCentralLicenseAllocation_device_id_idx" ON "HikCentralLicenseAllocation"("device_id");

-- CreateIndex
CREATE INDEX "HikCentralLicenseAllocation_feature_idx" ON "HikCentralLicenseAllocation"("feature");

-- CreateIndex
CREATE UNIQUE INDEX "HikCentralLicenseAllocation_license_id_device_id_feature_key" ON "HikCentralLicenseAllocation"("license_id", "device_id", "feature");

-- CreateIndex
CREATE INDEX "HikCentralLicenseUsageSnapshot_license_id_idx" ON "HikCentralLicenseUsageSnapshot"("license_id");

-- CreateIndex
CREATE INDEX "HikCentralLicenseUsageSnapshot_company_id_idx" ON "HikCentralLicenseUsageSnapshot"("company_id");

-- CreateIndex
CREATE INDEX "HikCentralLicenseUsageSnapshot_captured_at_idx" ON "HikCentralLicenseUsageSnapshot"("captured_at");

-- CreateIndex
CREATE UNIQUE INDEX "HikCentralTrackingSession_hikcentral_track_id_key" ON "HikCentralTrackingSession"("hikcentral_track_id");

-- CreateIndex
CREATE INDEX "HikCentralTrackingSession_company_id_idx" ON "HikCentralTrackingSession"("company_id");

-- CreateIndex
CREATE INDEX "HikCentralTrackingSession_user_id_idx" ON "HikCentralTrackingSession"("user_id");

-- CreateIndex
CREATE INDEX "HikCentralTrackingSession_status_idx" ON "HikCentralTrackingSession"("status");

-- CreateIndex
CREATE INDEX "HikCentralTrackingSession_subject_external_id_idx" ON "HikCentralTrackingSession"("subject_external_id");

-- CreateIndex
CREATE INDEX "HikCentralTrackingSession_starts_at_ends_at_idx" ON "HikCentralTrackingSession"("starts_at", "ends_at");

-- CreateIndex
CREATE INDEX "HikCentralTrackingPoint_session_id_occurred_at_idx" ON "HikCentralTrackingPoint"("session_id", "occurred_at");

-- CreateIndex
CREATE INDEX "HikCentralTrackingPoint_user_id_idx" ON "HikCentralTrackingPoint"("user_id");

-- CreateIndex
CREATE INDEX "HikCentralTrackingPoint_device_id_idx" ON "HikCentralTrackingPoint"("device_id");

-- CreateIndex
CREATE INDEX "HikCentralTrackingPoint_access_event_id_idx" ON "HikCentralTrackingPoint"("access_event_id");

-- CreateIndex
CREATE INDEX "HikCentralTrackingPoint_event_type_idx" ON "HikCentralTrackingPoint"("event_type");

-- AddForeignKey
ALTER TABLE "HikCentralLicense" ADD CONSTRAINT "HikCentralLicense_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HikCentralLicenseFeature" ADD CONSTRAINT "HikCentralLicenseFeature_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "HikCentralLicense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HikCentralLicenseAllocation" ADD CONSTRAINT "HikCentralLicenseAllocation_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "HikCentralLicense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HikCentralLicenseAllocation" ADD CONSTRAINT "HikCentralLicenseAllocation_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HikCentralLicenseUsageSnapshot" ADD CONSTRAINT "HikCentralLicenseUsageSnapshot_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "HikCentralLicense"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HikCentralLicenseUsageSnapshot" ADD CONSTRAINT "HikCentralLicenseUsageSnapshot_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HikCentralTrackingSession" ADD CONSTRAINT "HikCentralTrackingSession_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HikCentralTrackingSession" ADD CONSTRAINT "HikCentralTrackingSession_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HikCentralTrackingPoint" ADD CONSTRAINT "HikCentralTrackingPoint_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "HikCentralTrackingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HikCentralTrackingPoint" ADD CONSTRAINT "HikCentralTrackingPoint_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HikCentralTrackingPoint" ADD CONSTRAINT "HikCentralTrackingPoint_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HikCentralTrackingPoint" ADD CONSTRAINT "HikCentralTrackingPoint_access_event_id_fkey" FOREIGN KEY ("access_event_id") REFERENCES "HikCentralAccessEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
