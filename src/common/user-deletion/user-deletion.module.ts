import { Global, Module } from '@nestjs/common';
import { UserDeletionService } from './user-deletion.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [UserDeletionService],
  exports: [UserDeletionService],
})
export class UserDeletionModule {}
