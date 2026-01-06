import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from 'generated/prisma/client';
import { CreateLeaseDto, UpdateLeaseDto } from './dto';

const leaseInclude = {
  tenant: { select: { id: true, name: true, email: true } },
  unit: { select: { id: true, unitNumber: true, floor: true } },
} satisfies Prisma.LeaseInclude;

@Injectable()
export class LeasesService {
  constructor(private prisma: PrismaService) {}

  async create(buildingId: string, dto: CreateLeaseDto) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: dto.tenantId, buildingId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found in this building');
    }

    const unit = await this.prisma.unit.findFirst({
      where: { id: dto.unitId, buildingId },
    });

    if (!unit) {
      throw new NotFoundException('Unit not found in this building');
    }

    const overlapping = await this.prisma.lease.findFirst({
      where: {
        unitId: dto.unitId,
        status: 'active',
        OR: [
          {
            AND: [
              { startDate: { lte: new Date(dto.startDate) } },
              { endDate: { gte: new Date(dto.startDate) } },
            ],
          },
          {
            AND: [
              { startDate: { lte: new Date(dto.endDate) } },
              { endDate: { gte: new Date(dto.endDate) } },
            ],
          },
        ],
      },
    });

    if (overlapping) {
      throw new BadRequestException('Unit has an overlapping active lease');
    }

    const lease = await this.prisma.$transaction(async (tx) => {
      const newLease = await tx.lease.create({
        data: {
          buildingId,
          tenantId: dto.tenantId,
          unitId: dto.unitId,
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
          rentAmount: dto.rentAmount,
          securityDeposit: dto.securityDeposit,
          status: dto.status || 'active',
          terms: dto.terms as Prisma.InputJsonValue,
        },
        include: leaseInclude,
      });

      // Generate payment periods for lease duration
      const months = this.generateMonthsBetween(
        new Date(dto.startDate),
        new Date(dto.endDate),
      );

      await tx.paymentPeriod.createMany({
        data: months.map((month) => ({
          leaseId: newLease.id,
          month,
          rentAmount: dto.rentAmount,
          status: 'unpaid' as const,
        })),
      });

      return newLease;
    });

    return lease;
  }

  async findAll(buildingId: string) {
    return await this.prisma.lease.findMany({
      where: { buildingId },
      include: leaseInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, buildingId: string) {
    const lease = await this.prisma.lease.findFirst({
      where: { id, buildingId },
      include: leaseInclude,
    });

    if (!lease) {
      throw new NotFoundException('Lease not found');
    }

    return lease;
  }

  async update(id: string, buildingId: string, dto: UpdateLeaseDto) {
    const lease = await this.prisma.lease.findFirst({
      where: { id, buildingId },
    });

    if (!lease) {
      throw new NotFoundException('Lease not found');
    }

    const updated = await this.prisma.lease.update({
      where: { id },
      data: {
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        rentAmount: dto.rentAmount,
        securityDeposit: dto.securityDeposit,
        status: dto.status,
        terms: dto.terms as Prisma.InputJsonValue,
      },
      include: leaseInclude,
    });

    return updated;
  }

  async remove(id: string, buildingId: string) {
    const lease = await this.prisma.lease.findFirst({
      where: { id, buildingId },
    });

    if (!lease) {
      throw new NotFoundException('Lease not found');
    }

    await this.prisma.lease.delete({
      where: { id },
    });

    return { message: 'Lease deleted successfully' };
  }

  private generateMonthsBetween(start: Date, end: Date): string[] {
    const months: string[] = [];
    const current = new Date(start.getFullYear(), start.getMonth(), 1);
    const endDate = new Date(end.getFullYear(), end.getMonth(), 1);

    while (current <= endDate) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      months.push(`${year}-${month}`);
      current.setMonth(current.getMonth() + 1);
    }

    return months;
  }
}
