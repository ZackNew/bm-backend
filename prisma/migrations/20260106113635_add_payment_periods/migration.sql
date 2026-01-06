-- CreateEnum
CREATE TYPE "PaymentPeriodStatus" AS ENUM ('unpaid', 'paid', 'overdue');

-- CreateTable
CREATE TABLE "payment_periods" (
    "id" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "rentAmount" DECIMAL(10,2) NOT NULL,
    "status" "PaymentPeriodStatus" NOT NULL DEFAULT 'unpaid',
    "paidAt" TIMESTAMP(3),
    "paymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_periods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_periods_leaseId_month_key" ON "payment_periods"("leaseId", "month");

-- AddForeignKey
ALTER TABLE "payment_periods" ADD CONSTRAINT "payment_periods_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "leases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_periods" ADD CONSTRAINT "payment_periods_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
