import { Module } from '@nestjs/common';
import { MaintenanceRequestsService } from './maintenance-requests.service';
import { MaintenanceRequestsController } from './maintenance-requests.controller';

@Module({
  providers: [MaintenanceRequestsService],
  controllers: [MaintenanceRequestsController]
})
export class MaintenanceRequestsModule {}
