import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const now = () => new Date();

const softDeleteData = (at: Date, by: string) =>
  ({ deletedAt: at, deletedById: by }) as {
    deletedAt: Date;
    deletedById: string;
  };

@Injectable()
export class SoftDeleteService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Soft-delete a building and cascade to units, tenants, leases, parking, maintenance, manager roles.
   */
  async softDeleteBuilding(
    buildingId: string,
    deletedById: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const at = now();
      const data = softDeleteData(at, deletedById);
      await tx.building.updateMany({ where: { id: buildingId }, data });
      await tx.unit.updateMany({ where: { buildingId }, data });
      await tx.tenant.updateMany({ where: { buildingId }, data });
      await tx.lease.updateMany({ where: { buildingId }, data });
      await tx.parkingRegistration.updateMany({ where: { buildingId }, data });
      await tx.maintenanceRequest.updateMany({ where: { buildingId }, data });
      await tx.managerBuildingRole.updateMany({ where: { buildingId }, data });
    });
  }

  async softDeleteUnit(unitId: string, deletedById: string): Promise<void> {
    await this.prisma.unit.updateMany({
      where: { id: unitId },
      data: softDeleteData(now(), deletedById),
    });
  }

  /**
   * Soft-delete a tenant and cascade to their leases, parking registrations
   * and maintenance requests. Units held by active leases are freed back to
   * vacant. Payments, invoices and payment periods are left untouched —
   * financial history survives tenant deletion and is only removed when the
   * owning account is purged.
   *
   * Every cascaded row receives the same `deletedAt` timestamp, which acts as
   * the restore key: `restoreTenant` only resurrects rows deleted by this
   * exact operation, never rows that were already soft-deleted beforehand.
   */
  async softDeleteTenant(
    tenantId: string,
    deletedById: string,
  ): Promise<{
    at: Date;
    leases: number;
    unitsFreed: number;
    parkingRegistrations: number;
    maintenanceRequests: number;
  }> {
    const at = now();
    const data = softDeleteData(at, deletedById);

    return this.prisma.$transaction(async (tx) => {
      const activeLeases = await tx.lease.findMany({
        where: { tenantId, deletedAt: null, status: 'active' },
        select: { unitId: true },
      });

      await tx.tenant.updateMany({
        where: { id: tenantId, deletedAt: null },
        data,
      });
      const leases = await tx.lease.updateMany({
        where: { tenantId, deletedAt: null },
        data,
      });
      const parkingRegistrations = await tx.parkingRegistration.updateMany({
        where: { tenantId, deletedAt: null },
        data,
      });
      const maintenanceRequests = await tx.maintenanceRequest.updateMany({
        where: { tenantId, deletedAt: null },
        data,
      });

      const unitsFreed = await tx.unit.updateMany({
        where: {
          id: { in: activeLeases.map((l) => l.unitId) },
          deletedAt: null,
        },
        data: { status: 'vacant' },
      });

      // Push tokens and pending OTPs are dead the moment the tenant is
      // deleted; they are recreated on login after a restore.
      await tx.deviceToken.deleteMany({
        where: { userId: tenantId, userType: 'tenant' },
      });
      await tx.otp.deleteMany({
        where: { userId: tenantId, userType: 'tenant' },
      });

      return {
        at,
        leases: leases.count,
        unitsFreed: unitsFreed.count,
        parkingRegistrations: parkingRegistrations.count,
        maintenanceRequests: maintenanceRequests.count,
      };
    });
  }

  /**
   * Restore a soft-deleted tenant. Uses the shared deletion timestamp to
   * restore exactly the cascade set of that operation. Restored active leases
   * re-occupy their unit unless the unit gained another active lease in the
   * meantime — those leases come back as `terminated` and their unit ids are
   * reported in `unitConflicts`.
   */
  async restoreTenant(
    tenantId: string,
  ): Promise<{ restoredLeases: number; unitConflicts: string[] }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { deletedAt: true },
    });
    if (!tenant?.deletedAt) return { restoredLeases: 0, unitConflicts: [] };
    const at = tenant.deletedAt;
    const clear = { deletedAt: null, deletedById: null };

    return this.prisma.$transaction(async (tx) => {
      await tx.tenant.updateMany({ where: { id: tenantId }, data: clear });
      await tx.lease.updateMany({
        where: { tenantId, deletedAt: at },
        data: clear,
      });
      await tx.parkingRegistration.updateMany({
        where: { tenantId, deletedAt: at },
        data: clear,
      });
      await tx.maintenanceRequest.updateMany({
        where: { tenantId, deletedAt: at },
        data: clear,
      });

      const restoredActive = await tx.lease.findMany({
        where: { tenantId, deletedAt: null, status: 'active' },
        select: { id: true, unitId: true },
      });

      const unitConflicts: string[] = [];
      for (const lease of restoredActive) {
        const competing = await tx.lease.findFirst({
          where: {
            unitId: lease.unitId,
            status: 'active',
            deletedAt: null,
            id: { not: lease.id },
          },
          select: { id: true },
        });
        if (competing) {
          // The unit was re-leased while the tenant was deleted; two active
          // leases on one unit is worse than demoting the restored one.
          await tx.lease.update({
            where: { id: lease.id },
            data: { status: 'terminated' },
          });
          unitConflicts.push(lease.unitId);
        } else {
          await tx.unit.updateMany({
            where: { id: lease.unitId, deletedAt: null },
            data: { status: 'occupied' },
          });
        }
      }

      return { restoredLeases: restoredActive.length, unitConflicts };
    });
  }

  async softDeleteLease(leaseId: string, deletedById: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const at = now();
      const data = softDeleteData(at, deletedById);
      await tx.lease.updateMany({ where: { id: leaseId }, data });
      await tx.parkingRegistration.updateMany({ where: { leaseId }, data });
    });
  }

  async softDeleteParkingRegistration(
    id: string,
    deletedById: string,
  ): Promise<void> {
    await this.prisma.parkingRegistration.updateMany({
      where: { id },
      data: softDeleteData(now(), deletedById),
    });
  }

  async softDeleteMaintenanceRequest(
    id: string,
    deletedById: string,
  ): Promise<void> {
    await this.prisma.maintenanceRequest.updateMany({
      where: { id },
      data: softDeleteData(now(), deletedById),
    });
  }

  /**
   * Soft-delete a manager and their building role assignments.
   */
  async softDeleteManager(
    managerId: string,
    deletedById: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const at = now();
      const data = softDeleteData(at, deletedById);
      await tx.manager.updateMany({ where: { id: managerId }, data });
      await tx.managerBuildingRole.updateMany({ where: { managerId }, data });
    });
  }

  /**
   * Soft-delete an owner account and everything it owns: buildings (with the
   * full building cascade), managers, subscriptions, device tokens and OTPs.
   *
   * Every cascaded row receives the same `deletedAt` timestamp, which acts as
   * the restore key: `restoreUser` only resurrects rows deleted by this exact
   * operation, never rows that were already soft-deleted beforehand.
   *
   * Returns the timestamp the account will be purged is based on (deletedAt).
   */
  async softDeleteUser(userId: string, deletedById: string): Promise<Date> {
    const at = now();
    const data = softDeleteData(at, deletedById);

    await this.prisma.$transaction(async (tx) => {
      const buildings = await tx.building.findMany({
        where: { userId, deletedAt: null },
        select: { id: true },
      });
      const buildingIds = buildings.map((b) => b.id);

      await tx.user.updateMany({
        where: { id: userId, deletedAt: null },
        data: { ...data, status: 'inactive' },
      });

      await tx.building.updateMany({
        where: { id: { in: buildingIds } },
        data,
      });
      await tx.unit.updateMany({
        where: { buildingId: { in: buildingIds }, deletedAt: null },
        data,
      });
      await tx.tenant.updateMany({
        where: { buildingId: { in: buildingIds }, deletedAt: null },
        data,
      });
      await tx.lease.updateMany({
        where: { buildingId: { in: buildingIds }, deletedAt: null },
        data,
      });
      await tx.parkingRegistration.updateMany({
        where: { buildingId: { in: buildingIds }, deletedAt: null },
        data,
      });
      await tx.maintenanceRequest.updateMany({
        where: { buildingId: { in: buildingIds }, deletedAt: null },
        data,
      });
      await tx.managerBuildingRole.updateMany({
        where: {
          deletedAt: null,
          OR: [{ buildingId: { in: buildingIds } }, { manager: { userId } }],
        },
        data,
      });
      await tx.manager.updateMany({
        where: { userId, deletedAt: null },
        data,
      });

      // Cancel active subscriptions; the history row's createdAt is pinned to
      // `at` so restore can tell deletion-cancellations apart from user ones.
      const activeSubscriptions = await tx.subscription.findMany({
        where: { userId, status: 'active' },
        select: { id: true, planId: true },
      });
      if (activeSubscriptions.length > 0) {
        await tx.subscription.updateMany({
          where: { id: { in: activeSubscriptions.map((s) => s.id) } },
          data: { status: 'cancelled' },
        });
        await tx.subscriptionHistory.createMany({
          data: activeSubscriptions.map((s) => ({
            userId,
            subscriptionId: s.id,
            action: 'cancelled' as const,
            oldPlanId: s.planId,
            newPlanId: s.planId,
            notes: 'Cancelled due to account deletion',
            createdAt: at,
          })),
        });
      }

      // Push tokens and pending OTPs are dead the moment the account is
      // scheduled for deletion; they are recreated on login after a restore.
      await tx.deviceToken.deleteMany({
        where: { userId, userType: 'user' },
      });
      await tx.otp.deleteMany({ where: { userId, userType: 'user' } });
    });

    return at;
  }

  /**
   * Restore a soft-deleted owner within the grace period. Uses the shared
   * deletion timestamp to restore exactly the cascade set of that operation.
   */
  async restoreUser(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { deletedAt: true },
    });
    if (!user?.deletedAt) return;
    const at = user.deletedAt;
    const clear = { deletedAt: null, deletedById: null };

    await this.prisma.$transaction(async (tx) => {
      await tx.user.updateMany({
        where: { id: userId },
        data: { ...clear, status: 'active' },
      });
      await tx.building.updateMany({
        where: { userId, deletedAt: at },
        data: clear,
      });
      await tx.unit.updateMany({
        where: { building: { userId }, deletedAt: at },
        data: clear,
      });
      await tx.tenant.updateMany({
        where: { building: { userId }, deletedAt: at },
        data: clear,
      });
      await tx.lease.updateMany({
        where: { building: { userId }, deletedAt: at },
        data: clear,
      });
      await tx.parkingRegistration.updateMany({
        where: { building: { userId }, deletedAt: at },
        data: clear,
      });
      await tx.maintenanceRequest.updateMany({
        where: { building: { userId }, deletedAt: at },
        data: clear,
      });
      await tx.managerBuildingRole.updateMany({
        where: {
          deletedAt: at,
          OR: [{ building: { userId } }, { manager: { userId } }],
        },
        data: clear,
      });
      await tx.manager.updateMany({
        where: { userId, deletedAt: at },
        data: clear,
      });

      // Reactivate subscriptions that were cancelled by this deletion and
      // whose billing cycle has not ended in the meantime.
      const cancelledByDeletion = await tx.subscriptionHistory.findMany({
        where: { userId, action: 'cancelled', createdAt: at },
        select: { subscriptionId: true, newPlanId: true },
      });
      const restorable = await tx.subscription.findMany({
        where: {
          id: { in: cancelledByDeletion.map((h) => h.subscriptionId) },
          status: 'cancelled',
          billingCycleEnd: { gt: new Date() },
        },
        select: { id: true, planId: true },
      });
      if (restorable.length > 0) {
        await tx.subscription.updateMany({
          where: { id: { in: restorable.map((s) => s.id) } },
          data: { status: 'active' },
        });
        await tx.subscriptionHistory.createMany({
          data: restorable.map((s) => ({
            userId,
            subscriptionId: s.id,
            action: 'renewed' as const,
            oldPlanId: s.planId,
            newPlanId: s.planId,
            notes: 'Reactivated after account restore',
          })),
        });
      }
    });
  }

  /**
   * Soft-delete a manager's assignment to a building (remove from building).
   */
  async softDeleteManagerBuildingRole(
    managerId: string,
    buildingId: string,
    deletedById: string,
  ): Promise<void> {
    await this.prisma.managerBuildingRole.updateMany({
      where: { managerId, buildingId },
      data: softDeleteData(now(), deletedById),
    });
  }
}
