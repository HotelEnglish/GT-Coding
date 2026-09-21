import nodemailer from 'nodemailer';
import { generateVerificationCode, calculateVerificationCodeExpiration } from '../utils/jwt';

// SMTP configuration
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';

// Create transporter
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

export interface EmailVerificationResult {
  code: string;
  expiresAt: Date;
}

/**
 * Send verification code email for registration
 */
export async function sendRegistrationVerificationEmail(email: string): Promise<EmailVerificationResult> {
  const code = generateVerificationCode();
  const expiresAt = calculateVerificationCodeExpiration(10);

  const mailOptions = {
    from: `"GT-Coding 扎根理论编码" <${SMTP_USER}>`,
    to: email,
    subject: '【GT-Coding】注册验证码',
    html: getRegistrationEmailTemplate(code, expiresAt),
  };

  await transporter.sendMail(mailOptions);

  return { code, expiresAt };
}

/**
 * Send verification code email for password reset
 */
export async function sendPasswordResetVerificationEmail(email: string): Promise<EmailVerificationResult> {
  const code = generateVerificationCode();
  const expiresAt = calculateVerificationCodeExpiration(10);

  const mailOptions = {
    from: `"GT-Coding 扎根理论编码" <${SMTP_USER}>`,
    to: email,
    subject: '【GT-Coding】密码重置验证码',
    html: getPasswordResetEmailTemplate(code, expiresAt),
  };

  await transporter.sendMail(mailOptions);

  return { code, expiresAt };
}

/**
 * Send recharge order status notification
 */
export async function sendOrderStatusEmail(
  email: string,
  orderNumber: string,
  status: 'approved' | 'rejected',
  credits?: number,
  reason?: string
): Promise<void> {
  const subject = status === 'approved' 
    ? '【GT-Coding】充值订单已通过' 
    : '【GT-Coding】充值订单已拒绝';

  const html = status === 'approved'
    ? getOrderApprovedTemplate(orderNumber, credits!)
    : getOrderRejectedTemplate(orderNumber, reason!);

  await transporter.sendMail({
    from: `"GT-Coding 扎根理论编码" <${SMTP_USER}>`,
    to: email,
    subject,
    html,
  });
}

// Email templates

function getRegistrationEmailTemplate(code: string, expiresAt: Date): string {
  const expiresIn = Math.floor((expiresAt.getTime() - Date.now()) / 1000 / 60);

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">
        GT-Coding 注册验证码
      </h2>
      <p style="font-size: 16px; color: #666;">您好！</p>
      <p style="font-size: 16px; color: #666;">
        感谢您注册 GT-Coding 扎根理论编码平台。请使用以下验证码完成注册：
      </p>
      <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
        <span style="font-size: 32px; font-weight: bold; color: #4CAF50; letter-spacing: 8px;">
          ${code}
        </span>
      </div>
      <p style="font-size: 14px; color: #999;">
        验证码将在 <strong>${expiresIn}分钟</strong>后过期，请尽快完成验证。
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      <p style="font-size: 12px; color: #999;">
        <strong>安全提示：</strong>请勿将验证码告知他人，GT-Coding 工作人员不会向您索要验证码。
      </p>
      <p style="font-size: 12px; color: #999;">
        如果您没有进行注册操作，请忽略此邮件。
      </p>
    </div>
  `;
}

function getPasswordResetEmailTemplate(code: string, expiresAt: Date): string {
  const expiresIn = Math.floor((expiresAt.getTime() - Date.now()) / 1000 / 60);

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333; border-bottom: 2px solid #FF9800; padding-bottom: 10px;">
        GT-Coding 密码重置验证码
      </h2>
      <p style="font-size: 16px; color: #666;">您好！</p>
      <p style="font-size: 16px; color: #666;">
        我们收到了您的密码重置请求。请使用以下验证码重置您的密码：
      </p>
      <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
        <span style="font-size: 32px; font-weight: bold; color: #FF9800; letter-spacing: 8px;">
          ${code}
        </span>
      </div>
      <p style="font-size: 14px; color: #999;">
        验证码将在 <strong>${expiresIn}分钟</strong>后过期，请尽快完成验证。
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      <p style="font-size: 12px; color: #999;">
        <strong>安全提示：</strong>请勿将验证码告知他人，GT-Coding 工作人员不会向您索要验证码。
      </p>
      <p style="font-size: 12px; color: #999;">
        如果您没有请求重置密码，请忽略此邮件，您的账户安全不会受到影响。
      </p>
    </div>
  `;
}

function getOrderApprovedTemplate(orderNumber: string, credits: number): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">
        充值订单已通过审核
      </h2>
      <p style="font-size: 16px; color: #666;">您好！</p>
      <p style="font-size: 16px; color: #666;">
        您的充值订单已通过审核，积分已到账。
      </p>
      <div style="background-color: #e8f5e9; padding: 20px; margin: 20px 0; border-radius: 8px;">
        <p style="margin: 5px 0;"><strong>订单号：</strong>${orderNumber}</p>
        <p style="margin: 5px 0;"><strong>获得积分：</strong><span style="color: #4CAF50; font-size: 20px;">${credits}</span> 积分</p>
        <p style="margin: 5px 0;"><strong>可编码字符数：</strong>${credits * 10} 字符</p>
      </div>
      <p style="font-size: 14px; color: #666;">
        您现在可以使用这些积分进行扎根理论编码分析。感谢您的支持！
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      <p style="font-size: 12px; color: #999;">
        如有疑问，请联系管理员。
      </p>
    </div>
  `;
}

function getOrderRejectedTemplate(orderNumber: string, reason: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333; border-bottom: 2px solid #f44336; padding-bottom: 10px;">
        充值订单审核未通过
      </h2>
      <p style="font-size: 16px; color: #666;">您好！</p>
      <p style="font-size: 16px; color: #666;">
        很抱歉，您的充值订单未通过审核。
      </p>
      <div style="background-color: #ffebee; padding: 20px; margin: 20px 0; border-radius: 8px;">
        <p style="margin: 5px 0;"><strong>订单号：</strong>${orderNumber}</p>
        <p style="margin: 5px 0;"><strong>拒绝原因：</strong>${reason}</p>
      </div>
      <p style="font-size: 14px; color: #666;">
        请核对支付信息后重新提交订单，或联系管理员咨询。
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      <p style="font-size: 12px; color: #999;">
        如有疑问，请联系管理员。
      </p>
    </div>
  `;
}

/**
 * Verify SMTP connection
 */
export async function verifyEmailConnection(): Promise<boolean> {
  try {
    await transporter.verify();
    return true;
  } catch (error) {
    console.error('Email service connection failed:', error);
    return false;
  }
}
