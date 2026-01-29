import nodemailer from 'nodemailer';

/**
 * 이메일 전송 설정 (Gmail SMTP)
 */
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // TLS
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

/**
 * 이메일 전송 인터페이스
 */
export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * 이메일 전송 함수
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    console.log(`📧 [EMAIL] Sending to: ${options.to}`);
    console.log(`📧 [EMAIL] Subject: ${options.subject}`);

    const info = await transporter.sendMail({
      from: `"NVOIM Planner" <${process.env.GMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    console.log(`✅ [EMAIL] Email sent successfully: ${info.messageId}`);

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error: any) {
    console.error(`❌ [EMAIL] Failed to send email:`, error);

    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * 이메일 설정 검증 (서버 시작 시 호출)
 */
export async function verifyEmailConfig(): Promise<boolean> {
  try {
    await transporter.verify();
    console.log('✅ Email configuration is valid');
    return true;
  } catch (error: any) {
    console.error('❌ Email configuration error:', error.message);
    return false;
  }
}
