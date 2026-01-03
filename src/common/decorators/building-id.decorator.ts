import { createParamDecorator, ExecutionContext } from '@nestjs/common';

interface RequestWithBuildingId extends Request {
  buildingId: string;
}

export const BuildingId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<RequestWithBuildingId>();
    return request.buildingId;
  },
);
