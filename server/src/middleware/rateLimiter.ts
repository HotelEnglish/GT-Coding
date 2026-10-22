import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetAt: number;
  };
}

// In-memory rate limit store
// In production, use Redis for distributed rate limiting
const verificationCodeStore: RateLimitStore = {};
const loginAttemptStore: RateLimitStore = {};

/**
 * Rate limiter for verification code requests
 * Limit: 3 requests per hour per email
 */
export function verificationCodeRateLimiter(req: Request, res: Response, next: NextFunction) {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: '邮箱地址不能为空',
      },
    });
  }

  const key = email.toLowerCase();
  const now = Date.now();
  const hourInMs = 60 * 60 * 1000;

  // Clean up expired entries
  if (verificationCodeStore[key] && verificationCodeStore[key].resetAt < now) {
    delete verificationCodeStore[key];
  }

  // Check rate limit
  if (verificationCodeStore[key]) {
    if (verificationCodeStore[key].count >= 3) {
      const resetAt = verificationCodeStore[key].resetAt;
      const waitTime = Math.ceil((resetAt - now) / 60000);
      
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `请求过于频繁，请在${waitTime}分钟后再试`,
        },
      });
    }

    // Increment count
    verificationCodeStore[key].count++;
  } else {
    // Create new entry
    verificationCodeStore[key] = {
      count: 1,
      resetAt: now + hourInMs,
    };
  }

  return next();
}

/**
 * Rate limiter for login attempts
 * Limit: 5 attempts per 15 minutes per email
 */
export function loginRateLimiter(req: Request, res: Response, next: NextFunction) {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: '邮箱地址不能为空',
      },
    });
  }

  const key = email.toLowerCase();
  const now = Date.now();
  const fifteenMinutesInMs = 15 * 60 * 1000;

  // Clean up expired entries
  if (loginAttemptStore[key] && loginAttemptStore[key].resetAt < now) {
    delete loginAttemptStore[key];
  }

  // Check rate limit
  if (loginAttemptStore[key]) {
    if (loginAttemptStore[key].count >= 5) {
      const resetAt = loginAttemptStore[key].resetAt;
      const waitTime = Math.ceil((resetAt - now) / 60000);
      
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `登录尝试次数过多，请在${waitTime}分钟后再试`,
        },
      });
    }

    // Increment count
    loginAttemptStore[key].count++;
  } else {
    // Create new entry
    loginAttemptStore[key] = {
      count: 1,
      resetAt: now + fifteenMinutesInMs,
    };
  }

  return next();
}

/**
 * Clear login attempts for a specific email (on successful login)
 */
export function clearLoginAttempts(email: string) {
  const key = email.toLowerCase();
  delete loginAttemptStore[key];
}

/**
 * Reset verification code attempts for a specific email
 */
export function resetVerificationCodeAttempts(email: string) {
  const key = email.toLowerCase();
  delete verificationCodeStore[key];
}
