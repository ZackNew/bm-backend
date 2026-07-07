import { Module } from '@nestjs/common';
import { AppVersionService } from './app-version.service';
import { AppVersionController } from './app-version.controller';
import { ActivityLogsModule } from 'src/modules/user/activity-logs/activity-logs.module';

@Module({
  imports: [ActivityLogsModule],
  providers: [AppVersionService],
  controllers: [AppVersionController],
  exports: [AppVersionService],
})
export class AppVersionModule {}
