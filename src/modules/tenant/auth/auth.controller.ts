import { Controller, Post, Body, Res, Req } from '@nestjs/common';
import type { Response, Request } from 'express';
import { TenantAuthService } from './auth.service';
import { TenantLoginDto, RequestOtpDto, ResetPasswordDto } from './dto';

interface RequestWithCookies extends Request {
  cookies: {
    refreshToken?: string;
  };
}

@Controller('v1/tenant/auth')
export class TenantAuthController {
  constructor(private readonly authService: TenantAuthService) {}

  @Post('login')
  async login(@Body() dto: TenantLoginDto, @Res() res: Response) {
    const result = await this.authService.login(dto);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      data: {
        accessToken: result.accessToken,
        tenant: result.tenant,
        mustResetPassword: result.mustResetPassword,
      },
    });
  }

  @Post('request-otp')
  async requestOtp(@Body() dto: RequestOtpDto) {
    const result = await this.authService.requestOtp(dto);
    return {
      success: true,
      message: result.message,
    };
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    const result = await this.authService.resetPassword(dto);
    return {
      success: true,
      message: result.message,
    };
  }

  @Post('refresh')
  async refresh(@Req() req: RequestWithCookies, @Res() res: Response) {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token not found',
      });
    }

    const result = await this.authService.refresh(refreshToken);

    return res.json({
      success: true,
      data: result,
    });
  }
}
