import nodemailer from 'nodemailer';
import { createModuleLogger } from './logger';

const log = createModuleLogger('Email');

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private resendConfigured = false;
  private initialized = false;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.trim();
    const resendApiKey = process.env.RESEND_API_KEY?.trim();
    const resendFromEmail = process.env.RESEND_FROM_EMAIL?.trim();
    const emailProvider = (process.env.EMAIL_PROVIDER || 'smtp').trim().toLowerCase();

    const emailConfig = {
      host: process.env.SMTP_HOST?.trim() || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      connectionTimeout: parseInt(process.env.SMTP_CONNECTION_TIMEOUT_MS || '10000'),
      greetingTimeout: parseInt(process.env.SMTP_GREETING_TIMEOUT_MS || '10000'),
      socketTimeout: parseInt(process.env.SMTP_SOCKET_TIMEOUT_MS || '20000'),
      auth: {
        user,
        pass,
      },
    };

    this.transporter = null;
    this.resendConfigured = false;

    if (emailProvider === 'resend') {
      if (resendApiKey && resendFromEmail) {
        this.resendConfigured = true;
        log.info('Service initialized with Resend API');
      } else {
        log.warn('Resend not configured - RESEND_API_KEY: ' + (resendApiKey ? 'SET' : 'MISSING') + ', RESEND_FROM_EMAIL: ' + (resendFromEmail ? 'SET' : 'MISSING'));
      }
      this.initialized = true;
      return;
    }

    // Default SMTP provider
    if (user && pass) {
      this.transporter = nodemailer.createTransport(emailConfig);
      log.info('Service initialized with user:', user);
    } else {
      log.warn('Service not configured - SMTP_USER: ' + (user ? 'SET' : 'MISSING') + ', SMTP_PASS: ' + (pass ? 'SET' : 'MISSING'));
    }

    // Optional fallback transport over HTTPS (works on port 443)
    if (resendApiKey && resendFromEmail) {
      this.resendConfigured = true;
      log.info('Resend fallback enabled');
    }

    this.initialized = true;
  }

  /**
   * Lazy re-check: if not initialized at startup, try again now
   * (handles case where env vars weren't ready at module load time)
   */
  private ensureInitialized() {
    if (!this.initialized) {
      log.info('Re-attempting SMTP initialization...');
      this.initializeTransporter();
    }
  }

  isConfigured(): boolean {
    this.ensureInitialized();
    return this.transporter !== null || this.resendConfigured;
  }

  private getFromAddress(): string {
    const fromName = process.env.SMTP_FROM_NAME || 'VGfriend';
    const fromEmail = process.env.RESEND_FROM_EMAIL || process.env.SMTP_USER;
    if (!fromEmail) return fromName;
    return `"${fromName}" <${fromEmail}>`;
  }

  private async sendWithResend({ to, subject, html, text }: SendEmailOptions): Promise<boolean> {
    if (!this.resendConfigured) {
      return false;
    }

    const resendApiKey = process.env.RESEND_API_KEY?.trim();
    const resendFromEmail = process.env.RESEND_FROM_EMAIL?.trim();
    if (!resendApiKey || !resendFromEmail) {
      log.error('Cannot send via Resend - missing API key or from email');
      return false;
    }

    const resendApiUrl = process.env.RESEND_API_URL?.trim() || 'https://api.resend.com/emails';

    try {
      const response = await fetch(resendApiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.getFromAddress(),
          to: [to],
          subject,
          html,
          text,
        }),
      });

      if (!response.ok) {
        const responseText = await response.text();
        log.error(`Resend API error: ${response.status} ${response.statusText} - ${responseText.slice(0, 500)}`);
        return false;
      }

      const payload = (await response.json().catch(() => ({}))) as { id?: string };
      log.info('Message sent via Resend API:', payload.id || 'NO_ID');
      return true;
    } catch (error) {
      log.error('Error sending email via Resend API:', error);
      return false;
    }
  }

  async sendEmail({ to, subject, html, text }: SendEmailOptions): Promise<boolean> {
    this.ensureInitialized();

    if (this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from: this.getFromAddress(),
          to,
          subject,
          text,
          html,
        });

        log.info('Message sent via SMTP:', info.messageId);
        return true;
      } catch (error) {
        log.error('Error sending email via SMTP:', error);
        if (this.resendConfigured) {
          log.warn('Trying Resend fallback after SMTP failure...');
          return this.sendWithResend({ to, subject, html, text });
        }
        return false;
      }
    }

    if (this.resendConfigured) {
      return this.sendWithResend({ to, subject, html, text });
    }

    log.error('Cannot send email - no provider configured');
    return false;
  }

  async sendOTP(email: string, otp: string): Promise<boolean> {
    const subject = 'Mã OTP đặt lại mật khẩu - VGfriend';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #f4258c 0%, #d81b60 100%); padding: 40px 20px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 28px; }
          .content { padding: 40px 30px; }
          .otp-box { background: linear-gradient(135deg, #f4258c 0%, #d81b60 100%); color: white; padding: 20px; border-radius: 12px; text-align: center; margin: 30px 0; }
          .otp-code { font-size: 36px; font-weight: bold; letter-spacing: 8px; margin: 10px 0; }
          .info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          .warning { color: #f44336; font-weight: 500; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💕 VGfriend</h1>
          </div>
          <div class="content">
            <h2 style="color: #333;">Đặt lại mật khẩu</h2>
            <p style="color: #666; line-height: 1.6;">
              Chào bạn,<br><br>
              Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản VGfriend. 
              Sử dụng mã OTP bên dưới để tiếp tục:
            </p>
            
            <div class="otp-box">
              <div style="font-size: 14px; opacity: 0.9;">Mã OTP của bạn</div>
              <div class="otp-code">${otp}</div>
              <div style="font-size: 12px; opacity: 0.8; margin-top: 10px;">Có hiệu lực trong 10 phút</div>
            </div>

            <div class="info">
              <p style="margin: 0; color: #666;">
                <strong>Lưu ý:</strong>
              </p>
              <ul style="color: #666; margin: 10px 0;">
                <li>Mã OTP này chỉ có hiệu lực trong <strong>10 phút</strong></li>
                <li>Không chia sẻ mã này với bất kỳ ai</li>
                <li>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này</li>
              </ul>
            </div>

            <p class="warning" style="text-align: center; margin-top: 30px;">
              ⚠️ Không chia sẻ mã OTP này với bất kỳ ai!
            </p>
          </div>
          <div class="footer">
            <p>Email này được gửi tự động, vui lòng không reply.</p>
            <p style="margin-top: 10px;">© 2026 VGfriend - Virtual Girlfriend</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Mã OTP đặt lại mật khẩu VGfriend

Mã OTP của bạn: ${otp}

Mã này có hiệu lực trong 10 phút.
Không chia sẻ mã này với bất kỳ ai.

Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.

© 2026 VGfriend
    `;

    return this.sendEmail({ to: email, subject, html, text });
  }

  async sendRegistrationOTP(email: string, otp: string): Promise<boolean> {
    const subject = 'Xác nhận đăng ký tài khoản - Amoura';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #f4258c 0%, #8b5cf6 100%); padding: 40px 20px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 28px; }
          .content { padding: 40px 30px; }
          .otp-box { background: linear-gradient(135deg, #f4258c 0%, #8b5cf6 100%); color: white; padding: 20px; border-radius: 12px; text-align: center; margin: 30px 0; }
          .otp-code { font-size: 36px; font-weight: bold; letter-spacing: 8px; margin: 10px 0; }
          .info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          .warning { color: #f44336; font-weight: 500; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💕 Amoura</h1>
          </div>
          <div class="content">
            <h2 style="color: #333;">Xác nhận đăng ký tài khoản</h2>
            <p style="color: #666; line-height: 1.6;">
              Chào bạn,<br><br>
              Cảm ơn bạn đã đăng ký tài khoản Amoura!
              Sử dụng mã OTP bên dưới để xác nhận email của bạn:
            </p>
            
            <div class="otp-box">
              <div style="font-size: 14px; opacity: 0.9;">Mã xác nhận của bạn</div>
              <div class="otp-code">${otp}</div>
              <div style="font-size: 12px; opacity: 0.8; margin-top: 10px;">Có hiệu lực trong 10 phút</div>
            </div>

            <div class="info">
              <p style="margin: 0; color: #666;">
                <strong>Lưu ý:</strong>
              </p>
              <ul style="color: #666; margin: 10px 0;">
                <li>Mã OTP này chỉ có hiệu lực trong <strong>10 phút</strong></li>
                <li>Không chia sẻ mã này với bất kỳ ai</li>
                <li>Nếu bạn không đăng ký tài khoản, vui lòng bỏ qua email này</li>
              </ul>
            </div>

            <p class="warning" style="text-align: center; margin-top: 30px;">
              ⚠️ Không chia sẻ mã OTP này với bất kỳ ai!
            </p>
          </div>
          <div class="footer">
            <p>Email này được gửi tự động, vui lòng không reply.</p>
            <p style="margin-top: 10px;">© 2026 Amoura</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Xác nhận đăng ký tài khoản Amoura

Mã xác nhận của bạn: ${otp}

Mã này có hiệu lực trong 10 phút.
Không chia sẻ mã này với bất kỳ ai.

Nếu bạn không đăng ký tài khoản, vui lòng bỏ qua email này.

© 2026 Amoura
    `;

    return this.sendEmail({ to: email, subject, html, text });
  }

  async sendPasswordResetSuccess(email: string): Promise<boolean> {
    const subject = 'Mật khẩu đã được đặt lại thành công - VGfriend';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #4caf50 0%, #2e7d32 100%); padding: 40px 20px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 28px; }
          .content { padding: 40px 30px; text-align: center; }
          .success-icon { font-size: 64px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Thành công!</h1>
          </div>
          <div class="content">
            <div class="success-icon">🎉</div>
            <h2 style="color: #333;">Mật khẩu đã được đặt lại</h2>
            <p style="color: #666; line-height: 1.6;">
              Mật khẩu của bạn đã được đặt lại thành công.<br>
              Giờ bạn có thể đăng nhập bằng mật khẩu mới.
            </p>
            <p style="color: #999; font-size: 14px; margin-top: 30px;">
              Nếu bạn không thực hiện thay đổi này, vui lòng liên hệ với chúng tôi ngay lập tức.
            </p>
          </div>
          <div class="footer">
            <p>© 2026 VGfriend - Virtual Girlfriend</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({ to: email, subject, html });
  }
}

export const emailService = new EmailService();
