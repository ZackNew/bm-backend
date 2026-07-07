import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SoftDeleteService } from '../../../common/soft-delete/soft-delete.service';
import { UserDeletionService } from '../../../common/user-deletion/user-deletion.service';
import { EmailService } from '../../../common/email/email.service';
import type { Prisma } from 'generated/prisma/client';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private softDeleteService: SoftDeleteService,
    private userDeletionService: UserDeletionService,
    private emailService: EmailService,
  ) {}

  async findAllOwners(query: {
    search?: string;
    status?: 'active' | 'inactive';
    deleted?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      deletedAt: query.deleted ? { not: null } : null,
    };
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          status: true,
          deletedAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    const data = users.map((u) => ({
      ...u,
      purgeAt: u.deletedAt
        ? this.userDeletionService.purgeDateFor(u.deletedAt)
        : null,
    }));

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async softDeleteOwner(id: string, adminId: string) {
    const [user, admin] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id },
        select: { id: true, name: true, email: true, deletedAt: true },
      }),
      this.prisma.platformAdmin.findUnique({
        where: { id: adminId },
        select: { name: true },
      }),
    ]);
    if (!user || user.deletedAt) throw new NotFoundException('User not found');

    const deletedAt = await this.softDeleteService.softDeleteUser(id, adminId);
    const purgeAt = this.userDeletionService.purgeDateFor(deletedAt);

    await this.prisma.platformActivityLog.create({
      data: {
        action: 'delete',
        entityType: 'user',
        entityId: id,
        adminId,
        adminName: admin?.name ?? 'Unknown admin',
        details: { email: user.email, purgeAt: purgeAt.toISOString() },
      },
    });

    try {
      await this.emailService.sendAccountDeletionScheduledEmail(
        user.email,
        user.name,
        purgeAt,
      );
    } catch (error) {
      console.error(error);
    }

    return { id: user.id, email: user.email, deletedAt, purgeAt };
  }

  async restoreOwner(id: string, adminId: string) {
    const [user, admin] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id },
        select: { id: true, name: true, email: true, deletedAt: true },
      }),
      this.prisma.platformAdmin.findUnique({
        where: { id: adminId },
        select: { name: true },
      }),
    ]);
    if (!user) throw new NotFoundException('User not found');
    if (!user.deletedAt) {
      throw new ConflictException('User is not scheduled for deletion');
    }

    await this.softDeleteService.restoreUser(id);

    await this.prisma.platformActivityLog.create({
      data: {
        action: 'update',
        entityType: 'user',
        entityId: id,
        adminId,
        adminName: admin?.name ?? 'Unknown admin',
        details: { email: user.email, restored: true },
      },
    });

    try {
      await this.emailService.sendAccountRestoredEmail(user.email, user.name);
    } catch (error) {
      console.error(error);
    }

    return { id: user.id, email: user.email };
  }

  async updateOwnerStatus(id: string, status: 'active' | 'inactive') {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id },
      data: { status },
      select: { id: true, name: true, email: true, status: true },
    });
    return updated;
  }

  async findAllManagers(query: {
    search?: string;
    status?: 'active' | 'inactive';
    page?: number;
    limit?: number;
  }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ManagerWhereInput = { deletedAt: null };
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [managers, total] = await Promise.all([
      this.prisma.manager.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          status: true,
          createdAt: true,
          userId: true,
          buildingRoles: {
            where: { deletedAt: null },
            select: {
              roles: true,
              building: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.manager.count({ where }),
    ] as const);

    const data = managers.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      phone: m.phone,
      status: m.status,
      createdAt: m.createdAt,
      ownerId: m.userId,
      buildingCount: m.buildingRoles.length,
      buildings: m.buildingRoles.map((r) => ({
        id: r.building.id,
        name: r.building.name,
        roles: r.roles,
      })),
    }));

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async updateManagerStatus(id: string, status: 'active' | 'inactive') {
    const manager = await this.prisma.manager.findFirst({
      where: { id, deletedAt: null },
    });
    if (!manager) throw new NotFoundException('Manager not found');

    const updated = await this.prisma.manager.update({
      where: { id },
      data: { status },
      select: { id: true, name: true, email: true, status: true },
    });
    return updated;
  }

  async findAllTenants(query: {
    search?: string;
    status?: 'active' | 'inactive';
    page?: number;
    limit?: number;
  }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.TenantWhereInput = { deletedAt: null };
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [tenants, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          status: true,
          createdAt: true,
          building: { select: { id: true, name: true, city: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.tenant.count({ where }),
    ]);

    const data = tenants.map((t) => ({
      id: t.id,
      name: t.name,
      email: t.email,
      phone: t.phone,
      status: t.status,
      createdAt: t.createdAt,
      buildingId: t.building.id,
      buildingName: t.building.name,
      buildingCity: t.building.city,
    }));

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async updateTenantStatus(id: string, status: 'active' | 'inactive') {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id, deletedAt: null },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const updated = await this.prisma.tenant.update({
      where: { id },
      data: { status },
      select: { id: true, name: true, email: true, status: true },
    });
    return updated;
  }
}
