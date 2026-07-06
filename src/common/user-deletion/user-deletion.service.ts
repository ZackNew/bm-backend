import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/** Days between soft-deletion and permanent purge of an owner account. */
export const USER_PURGE_GRACE_DAYS = 14;

const toNumber = (value: unknown): number | null =>
  value === null || value === undefined ? null : Number(value);

@Injectable()
export class UserDeletionService {
  private readonly logger = new Logger(UserDeletionService.name);

  constructor(private prisma: PrismaService) {}

  purgeDateFor(deletedAt: Date): Date {
    const purgeAt = new Date(deletedAt);
    purgeAt.setDate(purgeAt.getDate() + USER_PURGE_GRACE_DAYS);
    return purgeAt;
  }

  /**
   * Permanently remove owners whose grace period has elapsed.
   * Called daily by the scheduler.
   */
  async purgeExpiredUsers(): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - USER_PURGE_GRACE_DAYS);

    const users = await this.prisma.user.findMany({
      where: { deletedAt: { not: null, lte: cutoff } },
      select: { id: true, name: true, email: true, deletedAt: true },
    });

    let purged = 0;
    for (const user of users) {
      try {
        await this.purgeUser(user);
        purged++;
        this.logger.log(`Purged owner ${user.id} (${user.email})`);
      } catch (error) {
        console.error(error);
        this.logger.error(`Failed to purge owner ${user.id}`);
      }
    }
    return purged;
  }

  /**
   * Archive the owner's financial records, then hard-delete the account and
   * everything it owns. Buildings are deleted first so the DB-level cascades
   * remove units, tenants, leases, payments, invoices, payment periods,
   * parking and maintenance records; the remaining rows (managers,
   * subscriptions, notifications, tokens, OTPs, activity logs) have no FK to
   * the owner and are removed explicitly.
   */
  private async purgeUser(user: {
    id: string;
    name: string;
    email: string;
    deletedAt: Date | null;
  }): Promise<void> {
    const userId = user.id;

    // The data is frozen (account is soft-deleted), so the archive snapshot
    // can be read outside the delete transaction.
    const [subscriptions, buildings, managers] = await Promise.all([
      this.prisma.subscription.findMany({
        where: { userId },
        select: {
          totalAmount: true,
          billingCycleStart: true,
          billingCycleEnd: true,
          status: true,
          createdAt: true,
          plan: { select: { name: true } },
        },
      }),
      this.prisma.building.findMany({
        where: { userId },
        select: {
          id: true,
          name: true,
          address: true,
          city: true,
          country: true,
          vatRate: true,
          withholdingRate: true,
        },
      }),
      this.prisma.manager.findMany({
        where: { userId },
        select: { id: true },
      }),
    ]);

    const buildingIds = buildings.map((b) => b.id);
    const managerIds = managers.map((m) => m.id);

    const [payments, invoices, tenants] = await Promise.all([
      this.prisma.payment.findMany({
        where: { buildingId: { in: buildingIds } },
        select: {
          buildingId: true,
          amount: true,
          baseAmount: true,
          vatAmount: true,
          withholdingAmount: true,
          type: true,
          status: true,
          paymentDate: true,
          createdAt: true,
        },
      }),
      this.prisma.invoice.findMany({
        where: { buildingId: { in: buildingIds } },
        select: {
          buildingId: true,
          invoiceNumber: true,
          amount: true,
          dueDate: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.tenant.findMany({
        where: { buildingId: { in: buildingIds } },
        select: { id: true },
      }),
    ]);
    const tenantIds = tenants.map((t) => t.id);

    // Tenant PII is deliberately excluded: only the owner's identity and the
    // tax-relevant financial figures survive the purge.
    const archiveData = {
      graceDays: USER_PURGE_GRACE_DAYS,
      subscriptions: subscriptions.map((s) => ({
        planName: s.plan.name,
        totalAmount: toNumber(s.totalAmount),
        billingCycleStart: s.billingCycleStart,
        billingCycleEnd: s.billingCycleEnd,
        status: s.status,
        createdAt: s.createdAt,
      })),
      buildings: buildings.map((b) => ({
        name: b.name,
        address: b.address,
        city: b.city,
        country: b.country,
        vatRate: toNumber(b.vatRate),
        withholdingRate: toNumber(b.withholdingRate),
        payments: payments
          .filter((p) => p.buildingId === b.id)
          .map((p) => ({
            amount: toNumber(p.amount),
            baseAmount: toNumber(p.baseAmount),
            vatAmount: toNumber(p.vatAmount),
            withholdingAmount: toNumber(p.withholdingAmount),
            type: p.type,
            status: p.status,
            paymentDate: p.paymentDate,
            createdAt: p.createdAt,
          })),
        invoices: invoices
          .filter((i) => i.buildingId === b.id)
          .map((i) => ({
            invoiceNumber: i.invoiceNumber,
            amount: toNumber(i.amount),
            dueDate: i.dueDate,
            status: i.status,
            createdAt: i.createdAt,
          })),
      })),
    };

    await this.prisma.$transaction(
      async (tx) => {
        await tx.userDeletionArchive.create({
          data: {
            userId,
            userName: user.name,
            userEmail: user.email,
            deletedAt: user.deletedAt ?? new Date(),
            data: JSON.parse(JSON.stringify(archiveData)) as object,
          },
        });

        await tx.activityLog.deleteMany({
          where: { buildingId: { in: buildingIds } },
        });
        await tx.building.deleteMany({ where: { userId } });
        await tx.manager.deleteMany({ where: { userId } });
        await tx.subscription.deleteMany({ where: { userId } });

        await tx.notification.deleteMany({
          where: {
            OR: [
              { userId, userType: 'user' },
              { userId: { in: managerIds }, userType: 'manager' },
              { userId: { in: tenantIds }, userType: 'tenant' },
            ],
          },
        });
        await tx.deviceToken.deleteMany({
          where: {
            OR: [
              { userId, userType: 'user' },
              { userId: { in: managerIds }, userType: 'manager' },
              { userId: { in: tenantIds }, userType: 'tenant' },
            ],
          },
        });
        await tx.otp.deleteMany({
          where: {
            OR: [
              { userId, userType: 'user' },
              { userId: { in: managerIds }, userType: 'manager' },
              { userId: { in: tenantIds }, userType: 'tenant' },
            ],
          },
        });

        await tx.user.delete({ where: { id: userId } });
      },
      { timeout: 120_000 },
    );
  }
}
