import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from 'generated/prisma/client';

const invoiceInclude = {
  tenant: { select: { id: true, name: true, email: true } },
  unit: { select: { id: true, unitNumber: true, floor: true } },
  payments: {
    select: { id: true, amount: true, paymentDate: true, status: true },
  },
} satisfies Prisma.InvoiceInclude;

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  async findAll(buildingId: string) {
    return await this.prisma.invoice.findMany({
      where: { buildingId },
      include: invoiceInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, buildingId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, buildingId },
      include: invoiceInclude,
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }
}
