-- CreateEnum
CREATE TYPE "AdminStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "PlatformAdminRole" AS ENUM ('super_admin', 'user_manager', 'analytics_viewer', 'system_manager', 'billing_manager');

-- CreateTable
CREATE TABLE "platform_admins" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "roles" "PlatformAdminRole"[],
    "status" "AdminStatus" NOT NULL DEFAULT 'active',
    "must_reset_password" BOOLEAN NOT NULL DEFAULT true,
    "password_reset_token" TEXT,
    "password_reset_token_expires_at" TIMESTAMP(3),
    "password_changed_at" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_admins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_admins_email_key" ON "platform_admins"("email");
