import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getOccupancy(buildingId: string) {
    const [totalUnits, occupiedUnits, vacantUnits] = await Promise.all([
      this.prisma.unit.count({
        where: { buildingId, status: { not: 'inactive' } },
      }),
      this.prisma.unit.count({ where: { buildingId, status: 'occupied' } }),
      this.prisma.unit.findMany({
        where: { buildingId, status: 'vacant' },
        select: {
          id: true,
          unitNumber: true,
          floor: true,
          type: true,
          rentPrice: true,
        },
      }),
    ]);

    const occupancyRate =
      totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

    return {
      totalUnits,
      occupiedUnits,
      vacantUnits: totalUnits - occupiedUnits,
      occupancyRate: Math.round(occupancyRate * 100) / 100,
      vacantUnitsList: vacantUnits,
    };
  }

  async getRevenue(buildingId: string, startDate?: string, endDate?: string) {
    const start = startDate
      ? new Date(startDate)
      : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate) : new Date();

    type PaymentPeriodWithLease = Prisma.PaymentPeriodGetPayload<{
      include: {
        lease: {
          select: {
            tenant: { select: { id: true; name: true } };
            unit: { select: { id: true; unitNumber: true } };
          };
        };
      };
    }>;

    const payments = await this.prisma.payment.findMany({
      where: {
        buildingId,
        status: 'completed',
        paymentDate: { gte: start, lte: end },
      },
      select: {
        amount: true,
        type: true,
        paymentDate: true,
        unit: { select: { id: true, unitNumber: true } },
      },
    });

    const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    const revenueByUnit = payments.reduce(
      (acc, payment) => {
        if (!payment.unit) return acc;
        const unitId = payment.unit.id;
        if (!acc[unitId]) {
          acc[unitId] = {
            unitId,
            unitNumber: payment.unit.unitNumber,
            revenue: 0,
          };
        }
        acc[unitId].revenue += Number(payment.amount);
        return acc;
      },
      {} as Record<
        string,
        { unitId: string; unitNumber: string; revenue: number }
      >,
    );

    const outstandingPaymentsData: PaymentPeriodWithLease[] =
      await this.prisma.paymentPeriod.findMany({
        where: {
          lease: { buildingId },
          status: { in: ['unpaid', 'overdue'] },
        },
        include: {
          lease: {
            select: {
              tenant: { select: { id: true, name: true } },
              unit: { select: { id: true, unitNumber: true } },
            },
          },
        },
      });

    const outstandingAmount = outstandingPaymentsData.reduce(
      (sum, p) => sum + Number(p.rentAmount),
      0,
    );

    const outstandingPeriods: Array<{
      month: string;
      amount: number;
      status: string;
      tenant: { id: string; name: string };
      unit: { id: string; unitNumber: string };
    }> = outstandingPaymentsData.map((p) => ({
      month: p.month,
      amount: Number(p.rentAmount),
      status: p.status,
      tenant: p.lease.tenant,
      unit: p.lease.unit,
    }));

    return {
      totalRevenue,
      dateRange: { startDate: start, endDate: end },
      revenueByUnit: Object.values(revenueByUnit),
      outstanding: {
        count: outstandingPaymentsData.length,
        amount: outstandingAmount,
        periods: outstandingPeriods,
      },
    };
  }

  async getTenants(buildingId: string) {
    const [activeTenants, inactiveTenants, upcomingExpirations] =
      await Promise.all([
        this.prisma.tenant.count({ where: { buildingId, status: 'active' } }),
        this.prisma.tenant.count({ where: { buildingId, status: 'inactive' } }),
        this.prisma.lease.findMany({
          where: {
            buildingId,
            status: 'active',
            endDate: {
              gte: new Date(),
              lte: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
            },
          },
          include: {
            tenant: { select: { id: true, name: true, email: true } },
            unit: { select: { id: true, unitNumber: true } },
          },
          orderBy: { endDate: 'asc' },
        }),
      ]);

    const tenantPaymentHistory = await this.prisma.tenant.findMany({
      where: { buildingId, status: 'active' },
      select: {
        id: true,
        name: true,
        email: true,
        payments: {
          where: { status: 'completed' },
          select: { amount: true, paymentDate: true },
        },
      },
    });

    const paymentSummary = tenantPaymentHistory.map((tenant) => ({
      tenantId: tenant.id,
      tenantName: tenant.name,
      email: tenant.email,
      totalPaid: tenant.payments.reduce((sum, p) => sum + Number(p.amount), 0),
      paymentsCount: tenant.payments.length,
      lastPayment:
        tenant.payments.length > 0
          ? tenant.payments.sort(
              (a, b) =>
                new Date(b.paymentDate).getTime() -
                new Date(a.paymentDate).getTime(),
            )[0].paymentDate
          : null,
    }));

    return {
      totalTenants: activeTenants + inactiveTenants,
      activeTenants,
      inactiveTenants,
      upcomingExpirations: upcomingExpirations.map((lease) => ({
        leaseId: lease.id,
        tenant: lease.tenant,
        unit: lease.unit,
        endDate: lease.endDate,
        daysUntilExpiration: Math.ceil(
          (lease.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        ),
      })),
      paymentHistory: paymentSummary,
    };
  }
}
