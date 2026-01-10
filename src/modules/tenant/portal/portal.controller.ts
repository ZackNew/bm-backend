import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { PortalService } from './portal.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { User } from 'src/common/decorators/user.decorator';
import { SubmitMaintenanceRequestDto } from './dto';

@Controller('v1/tenant')
@UseGuards(JwtAuthGuard)
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  @Get('profile')
  async getProfile(@User() user: { id: string }) {
    return await this.portalService.getProfile(user.id);
  }

  @Get('rent-status')
  async getRentStatus(@User() user: { id: string }) {
    return await this.portalService.getRentStatus(user.id);
  }

  @Get('payment-history')
  async getPaymentHistory(@User() user: { id: string }) {
    return await this.portalService.getPaymentHistory(user.id);
  }

  @Post('maintenance-requests')
  async submitMaintenanceRequest(
    @User() user: { id: string },
    @Body() dto: SubmitMaintenanceRequestDto,
  ) {
    return await this.portalService.submitMaintenanceRequest(user.id, dto);
  }

  @Get('maintenance-requests')
  async getMaintenanceRequests(@User() user: { id: string }) {
    return await this.portalService.getMaintenanceRequests(user.id);
  }

  @Get('maintenance-requests/:id')
  async getMaintenanceRequest(
    @User() user: { id: string },
    @Param('id') id: string,
  ) {
    return await this.portalService.getMaintenanceRequest(user.id, id);
  }
}
