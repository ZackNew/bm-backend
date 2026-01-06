import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { BuildingAccessGuard } from '../../../common/guards/building-access.guard';
import { ManagerRolesGuard } from '../../../common/guards/manager-roles.guard';
import { RequireManagerRoles } from '../../../common/decorators/require-manager-roles.decorator';
import { BuildingId } from '../../../common/decorators/building-id.decorator';
import { ManagerRole } from 'generated/prisma/client';

@Controller('v1/app/payments')
@UseGuards(JwtAuthGuard, BuildingAccessGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @UseGuards(ManagerRolesGuard)
  @RequireManagerRoles(ManagerRole.payment_manager)
  async create(
    @BuildingId() buildingId: string,
    @Body() dto: CreatePaymentDto,
  ) {
    const result = await this.paymentsService.create(buildingId, dto);
    return {
      success: true,
      data: result,
      message: 'Payment recorded successfully',
    };
  }

  @Get()
  @UseGuards(ManagerRolesGuard)
  @RequireManagerRoles(ManagerRole.payment_manager)
  async findAll(@BuildingId() buildingId: string) {
    const result = await this.paymentsService.findAll(buildingId);
    return {
      success: true,
      data: result,
    };
  }

  @Get(':id')
  @UseGuards(ManagerRolesGuard)
  @RequireManagerRoles(ManagerRole.payment_manager)
  async findOne(@BuildingId() buildingId: string, @Param('id') id: string) {
    const result = await this.paymentsService.findOne(id, buildingId);
    return {
      success: true,
      data: result,
    };
  }

  @Get('calendar/:tenantId')
  @UseGuards(ManagerRolesGuard)
  @RequireManagerRoles(ManagerRole.payment_manager)
  async getPaymentCalendar(
    @BuildingId() buildingId: string,
    @Param('tenantId') tenantId: string,
  ) {
    const result = await this.paymentsService.getPaymentCalendar(
      buildingId,
      tenantId,
    );
    return {
      success: true,
      data: result,
    };
  }
}
