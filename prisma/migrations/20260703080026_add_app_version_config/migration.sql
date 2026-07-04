-- CreateTable
CREATE TABLE "app_version_configs" (
    "id" TEXT NOT NULL,
    "android_minimum_version" TEXT NOT NULL,
    "android_latest_version" TEXT NOT NULL,
    "ios_minimum_version" TEXT NOT NULL,
    "ios_latest_version" TEXT NOT NULL,
    "version_description" TEXT NOT NULL,
    "last_force_update_version" TEXT NOT NULL,
    "is_optional" BOOLEAN NOT NULL DEFAULT true,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_version_configs_pkey" PRIMARY KEY ("id")
);
