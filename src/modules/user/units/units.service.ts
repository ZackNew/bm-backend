import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateUnitDto, UpdateUnitDto } from './dto';

@Injectable()
export class UnitsService {
  constructor(private prisma: PrismaService) {}

  async create(buildingId: string, dto: CreateUnitDto) {
    const existingUnit = await this.prisma.unit.findUnique({
      where: {
        buildingId_unitNumber: {
          buildingId,
          unitNumber: dto.unitNumber,
        },
      },
    });

    if (existingUnit) {
      throw new BadRequestException(
        'Unit number already exists in this building',
      );
    }

    const unit = await this.prisma.unit.create({
      data: {
        buildingId,
        unitNumber: dto.unitNumber,
        floor: dto.floor,
        size: dto.size,
        type: dto.type,
        rentPrice: dto.rentPrice,
        status: dto.status,
      },
      include: {
        building: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return unit;
  }

  async findAll(buildingId: string) {
    const units = await this.prisma.unit.findMany({
      where: { buildingId },
      include: {
        building: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return units;
  }

  async findOne(buildingId: string, id: string) {
    const unit = await this.prisma.unit.findUnique({
      where: { id },
      include: {
        building: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    if (unit.buildingId !== buildingId) {
      throw new NotFoundException('Unit not found in this building');
    }

    return unit;
  }

  async update(buildingId: string, id: string, dto: UpdateUnitDto) {
    const unit = await this.prisma.unit.findUnique({
      where: { id },
    });

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    if (unit.buildingId !== buildingId) {
      throw new NotFoundException('Unit not found in this building');
    }

    if (dto.unitNumber && dto.unitNumber !== unit.unitNumber) {
      const existingUnit = await this.prisma.unit.findUnique({
        where: {
          buildingId_unitNumber: {
            buildingId,
            unitNumber: dto.unitNumber,
          },
        },
      });

      if (existingUnit) {
        throw new BadRequestException(
          'Unit number already exists in this building',
        );
      }
    }

    const updatedUnit = await this.prisma.unit.update({
      where: { id },
      data: {
        unitNumber: dto.unitNumber,
        floor: dto.floor,
        size: dto.size,
        type: dto.type,
        rentPrice: dto.rentPrice,
        status: dto.status,
      },
      include: {
        building: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return updatedUnit;
  }

  async remove(buildingId: string, id: string) {
    const unit = await this.prisma.unit.findUnique({
      where: { id },
    });

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    if (unit.buildingId !== buildingId) {
      throw new NotFoundException('Unit not found in this building');
    }

    await this.prisma.unit.delete({
      where: { id },
    });

    return { message: 'Unit deleted successfully' };
  }
}
