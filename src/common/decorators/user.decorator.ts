import { createParamDecorator, ExecutionContext } from '@nestjs/common';

interface RequestUser {
  id: string;
  email: string;
  role: string;
  roles: string[];
  type: string;
}

interface RequestWithUser extends Request {
  user: RequestUser;
}

export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user;
  },
);
