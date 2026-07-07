import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { UpdateAppVersionDto } from './dto';
import { ActivityLogsService } from 'src/modules/user/activity-logs/activity-logs.service';
import { Prisma } from 'generated/prisma/client';

const DEFAULT_CONFIG = {
  androidMinimumVersion: '1.0.0',
  androidLatestVersion: '1.0.0',
  iosMinimumVersion: '1.0.0',
  iosLatestVersion: '1.0.0',
  versionDescription: '',
  lastForceUpdateVersion: '1.0.0',
  isOptional: true,
};

@Injectable()
export class AppVersionService {
  constructor(
    private prisma: PrismaService,
    private activityLogsService: ActivityLogsService,
  ) {}

  private async getOrCreate() {
    const existing = await this.prisma.appVersionConfig.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.appVersionConfig.create({ data: DEFAULT_CONFIG });
  }

  async getConfig() {
    return this.getOrCreate();
  }

  async update(dto: UpdateAppVersionDto, adminId: string, adminName: string) {
    const current = await this.getOrCreate();

    const updated = await this.prisma.appVersionConfig.update({
      where: { id: current.id },
      data: { ...dto, updatedById: adminId },
    });

    await this.activityLogsService.createPlatformLog({
      action: 'update',
      entityType: 'app_version_config',
      entityId: updated.id,
      adminId,
      adminName,
      details: { changes: dto } as unknown as Prisma.InputJsonValue,
    });

    return updated;
  }
}
