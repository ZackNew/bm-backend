-- CreateEnum
CREATE TYPE "OtpType" AS ENUM ('password_reset', 'email_verification', 'two_factor_auth');

-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('platform_admin', 'user', 'manager', 'tenant');

-- CreateTable
CREATE TABLE "otps" (
    "id" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "type" "OtpType" NOT NULL,
    "user_type" "UserType" NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "otps_user_id_type_idx" ON "otps"("user_id", "type");

-- CreateIndex
CREATE INDEX "otps_otp_type_idx" ON "otps"("otp", "type");
