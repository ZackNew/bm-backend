import { Injectable } from '@nestjs/common';

@Injectable()
export class EmailService {
  sendOTP(email: string, otp: string, purpose: string) {
    // For MVP: Just log the OTP
    // Later: Integrate with nodemailer/SendGrid/AWS SES
    console.log('=================================');
    console.log(`Sending OTP to: ${email}`);
    console.log(`Purpose: ${purpose}`);
    console.log(`OTP: ${otp}`);
    console.log('=================================');

    // Return success for now
    return { success: true };
  }

  sendPasswordResetOTP(email: string, otp: string) {
    return this.sendOTP(email, otp, 'Password Reset');
  }

  sendEmailVerificationOTP(email: string, otp: string) {
    return this.sendOTP(email, otp, 'Email Verification');
  }
}
