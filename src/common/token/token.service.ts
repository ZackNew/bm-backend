import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OtpType, UserType } from 'generated/prisma/client';

@Injectable()
export class TokenService {
  constructor(private prisma: PrismaService) {}

  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async createOTP(
    userId: string,
    userType: UserType,
    type: OtpType,
    expiryMinutes: number = 10,
  ) {
    const otp = this.generateOTP();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);

    await this.prisma.otp.create({
      data: {
        otp,
        type,
        userType,
        userId,
        expiresAt,
      },
    });

    return otp;
  }

  async validateOTP(
    otp: string,
    userId: string,
    type: OtpType,
  ): Promise<boolean> {
    const otpRecord = await this.prisma.otp.findFirst({
      where: {
        otp,
        userId,
        type,
        isUsed: false,
      },
    });

    if (!otpRecord) {
      throw new BadRequestException('Invalid OTP');
    }

    if (new Date() > otpRecord.expiresAt) {
      throw new BadRequestException('OTP expired');
    }

    await this.prisma.otp.update({
      where: { id: otpRecord.id },
      data: { isUsed: true },
    });

    return true;
  }

  async deleteExpiredOTPs() {
    await this.prisma.otp.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }
}
