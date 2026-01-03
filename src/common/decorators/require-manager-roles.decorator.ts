import { SetMetadata } from '@nestjs/common';
import { ManagerRole } from 'generated/prisma/client';

export const MANAGER_ROLES_KEY = 'managerRoles';
export const RequireManagerRoles = (...roles: ManagerRole[]) =>
  SetMetadata(MANAGER_ROLES_KEY, roles);
