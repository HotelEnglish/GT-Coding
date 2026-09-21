import { Request, Response } from 'express';
import prisma from '../utils/db';
import { hashPassword, comparePassword, validatePasswordStrength } from '../utils/password';
import { generateSecureToken, hashToken, calculateSessionExpiration } from '../utils/jwt';
import { validateEmail } from '../utils/validators';
import { sendRegistrationVerificationEmail, sendPasswordResetVerificationEmail } from '../services/emailService';
import { addCredits } from '../services/creditService';
import { clearLoginAttempts } from '../middleware/rateLimiter';

/**
 * POST /api/auth/send-verification
 * Send verification code for registration or password reset
 */
export async function sendVerification(req: Request, res: Response) {
  try {
    const { email, purpose } = req.body;

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: emailValidation.message },
      });
    }

    // For registration, check if email is already registered
    if (purpose === 'registration') {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: { code: 'AUTH_EMAIL_REGISTERED', message: '该邮箱已注册' },
        });
      }
    }

    // For password reset, check if email is registered
    if (purpose === 'password_reset') {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (!existingUser) {
        return res.status(400).json({
          success: false,
          error: { code: 'AUTH_EMAIL_NOT_REGISTERED', message: '该邮箱未注册' },
        });
      });
    }

    // Invalidate previous unused codes for this email and purpose
    await prisma.verificationCode.updateMany({
      where: {
        email,
        purpose,
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });

    // Send verification email
    const result = await (purpose === 'registration'
      ? sendRegistrationVerificationEmail(email)
      : sendPasswordResetVerificationEmail(email));

    // Store verification code
    await prisma.verificationCode.create({
      data: {
        email,
        code: result.code,
        purpose,
        expiresAt: result.expiresAt,
      },
    });

    return res.json({
      success: true,
      data: { message: '验证码已发送' },
    });
  } catch (error) {
    console.error('Send verification error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '发送验证码失败' },
    });
  }
}

/**
 * POST /api/auth/register
 * Register a new user
 */
export async function register(req: Request, res: Response) {
  try {
    const { email, password, verificationCode } = req.body;

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: emailValidation.message },
      });
    }

    // Validate password
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: passwordValidation.message },
      });
    }

    // Check if email is already registered
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: { code: 'AUTH_EMAIL_REGISTERED', message: '该邮箱已注册' },
      });
    }

    // Verify the code
    const storedCode = await prisma.verificationCode.findFirst({
      where: {
        email,
        purpose: 'registration',
        code: verificationCode,
        usedAt: null,
        expiresAt: { gte: new Date() },
      },
    });

    if (!storedCode) {
      return res.status(400).json({
        success: false,
        error: { code: 'AUTH_INVALID_CODE', message: '验证码错误或已过期' },
      });
    }

    // Mark code as used
    await prisma.verificationCode.update({
      where: { id: storedCode.id },
      data: { usedAt: new Date() },
    });

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user and award initial credits in transaction
    const user = await prisma.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          status: 'active',
        },
      });

      // Award 50 credits registration bonus
      await addCredits(newUser.id, 50, 'registration_bonus', '注册赠送');

      return newUser;
    });

    // Create session
    const sessionToken = generateSecureToken();
    const tokenHash = hashToken(sessionToken);
    const expiresAt = calculateSessionExpiration(7);

    await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Set session cookie
    res.cookie('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
    });

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          registeredAt: user.registeredAt,
        },
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '注册失败' },
    });
  }
}

/**
 * POST /api/auth/login
 * Login user
 */
export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_EMAIL_NOT_REGISTERED', message: '该邮箱未注册' },
      });
    }

    // Check if account is disabled
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: { code: 'AUTH_ACCOUNT_DISABLED', message: '账户已被禁用，请联系管理员' },
      });
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_PASSWORD_WRONG', message: '密码错误' },
      });
    }

    // Create session
    const sessionToken = generateSecureToken();
    const tokenHash = hashToken(sessionToken);
    const expiresAt = calculateSessionExpiration(7);

    await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Clear login attempts on successful login
    clearLoginAttempts(email);

    // Set session cookie
    res.cookie('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
    });

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          registeredAt: user.registeredAt,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '登录失败' },
    });
  }
}

/**
 * POST /api/auth/logout
 * Logout user
 */
export async function logout(req: Request, res: Response) {
  try {
    const token = req.cookies?.session_token;

    if (token) {
      // Delete session from database
      const tokenHash = hashToken(token);
      await prisma.session.deleteMany({ where: { tokenHash } });
    }

    // Clear cookie
    res.clearCookie('session_token');

    return res.json({
      success: true,
      data: { message: '已退出登录' },
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '退出失败' },
    });
  }
}

/**
 * POST /api/auth/reset-password
 * Reset password with verification code
 */
export async function resetPassword(req: Request, res: Response) {
  try {
    const { email, verificationCode, newPassword } = req.body;

    // Validate password
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: passwordValidation.message },
      });
    }

    // Verify the code
    const storedCode = await prisma.verificationCode.findFirst({
      where: {
        email,
        purpose: 'password_reset',
        code: verificationCode,
        usedAt: null,
        expiresAt: { gte: new Date() },
      },
    });

    if (!storedCode) {
      return res.status(400).json({
        success: false,
        error: { code: 'AUTH_INVALID_CODE', message: '验证码错误或已过期' },
      });
    }

    // Mark code as used
    await prisma.verificationCode.update({
      where: { id: storedCode.id },
      data: { usedAt: new Date() },
    });

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({
        success: false,
        error: { code: 'AUTH_EMAIL_NOT_REGISTERED', message: '该邮箱未注册' },
      });
    }

    // Update password
    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Invalidate all existing sessions
    await prisma.session.deleteMany({ where: { userId: user.id } });

    return res.json({
      success: true,
      data: { message: '密码重置成功' },
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '密码重置失败' },
    });
  }
}

/**
 * GET /api/auth/me
 * Get current user info
 */
export async function getCurrentUser(req: Request, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_NO_TOKEN', message: '未登录' },
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        creditBalance: true,
        _count: { select: { codingTasks: true } },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: '用户不存在' },
      });
    }

    // Get total characters processed
    const codingStats = await prisma.codingTask.aggregate({
      where: { userId },
      _sum: { inputTextLength: true },
    });

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          registeredAt: user.registeredAt,
          lastLoginAt: user.lastLoginAt,
          creditBalance: user.creditBalance?.balance ?? 0,
          totalCodingTasks: user._count.codingTasks,
          totalCharactersProcessed: codingStats._sum.inputTextLength ?? 0,
        },
      },
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '获取用户信息失败' },
    });
  }
}
