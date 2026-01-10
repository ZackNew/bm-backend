import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SubmitMaintenanceRequestDto } from './dto';

@Injectable()
export class PortalService {
  constructor(private prisma: PrismaService) {}

  async getProfile(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        building: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            country: true,
            contactEmail: true,
            contactPhone: true,
          },
        },
        unit: {
          select: {
            id: true,
            unitNumber: true,
            floor: true,
            size: true,
            type: true,
            rentPrice: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return {
      success: true,
      data: {
        id: tenant.id,
        name: tenant.name,
        email: tenant.email,
        phone: tenant.phone,
        status: tenant.status,
        building: tenant.building,
        unit: tenant.unit,
      },
    };
  }

  async getRentStatus(tenantId: string) {
    const lease = await this.prisma.lease.findFirst({
      where: {
        tenantId,
        status: 'active',
      },
      include: {
        unit: {
          select: {
            id: true,
            unitNumber: true,
            floor: true,
            rentPrice: true,
          },
        },
        paymentPeriods: {
          orderBy: {
            month: 'desc',
          },
        },
      },
    });

    if (!lease) {
      return {
        success: true,
        data: null,
        message: 'No active lease found',
      };
    }

    return {
      success: true,
      data: lease,
    };
  }

  async getPaymentHistory(tenantId: string) {
    const payments = await this.prisma.payment.findMany({
      where: { tenantId },
      include: {
        unit: {
          select: {
            id: true,
            unitNumber: true,
          },
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: payments,
    };
  }

  async submitMaintenanceRequest(
    tenantId: string,
    dto: SubmitMaintenanceRequestDto,
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { buildingId: true, unitId: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const request = await this.prisma.maintenanceRequest.create({
      data: {
        buildingId: tenant.buildingId,
        tenantId,
        unitId: tenant.unitId,
        title: dto.title,
        description: dto.description,
        priority: dto.priority || 'medium',
        notes: [],
      },
      include: {
        unit: {
          select: {
            id: true,
            unitNumber: true,
            floor: true,
          },
        },
      },
    });

    return {
      success: true,
      data: request,
      message: 'Maintenance request submitted successfully',
    };
  }

  async getMaintenanceRequests(tenantId: string) {
    const requests = await this.prisma.maintenanceRequest.findMany({
      where: { tenantId },
      include: {
        unit: {
          select: {
            id: true,
            unitNumber: true,
            floor: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: requests,
    };
  }

  async getMaintenanceRequest(tenantId: string, id: string) {
    const request = await this.prisma.maintenanceRequest.findFirst({
      where: { id, tenantId },
      include: {
        unit: {
          select: {
            id: true,
            unitNumber: true,
            floor: true,
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Maintenance request not found');
    }

    return {
      success: true,
      data: request,
    };
  }
}
