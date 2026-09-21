/**
 * Allowed email domains for registration
 */
const ALLOWED_EMAIL_DOMAINS = ['gmail.com', '163.com', '126.com', 'qq.com'];

/**
 * Email validation regex pattern
 */
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Validate email format
 */
export function validateEmailFormat(email: string): { valid: boolean; message?: string } {
  if (!email || email.trim().length === 0) {
    return { valid: false, message: '邮箱地址不能为空' };
  }

  if (!EMAIL_REGEX.test(email)) {
    return { valid: false, message: '邮箱格式不正确' };
  }

  return { valid: true };
}

/**
 * Validate email domain against allowed list
 * @param email - Full email address
 */
export function validateEmailDomain(email: string): { valid: boolean; message?: string } {
  const domain = email.split('@')[1]?.toLowerCase();

  if (!domain) {
    return { valid: false, message: '邮箱格式不正确' };
  }

  if (!ALLOWED_EMAIL_DOMAINS.includes(domain)) {
    return { 
      valid: false, 
      message: '仅支持 Gmail、163/126网易邮箱、QQ邮箱' 
    };
  }

  return { valid: true };
}

/**
 * Combined email validation (format + domain)
 */
export function validateEmail(email: string): { valid: boolean; message?: string } {
  const formatResult = validateEmailFormat(email);
  if (!formatResult.valid) {
    return formatResult;
  }

  return validateEmailDomain(email);
}

/**
 * Get allowed email domains list
 */
export function getAllowedEmailDomains(): string[] {
  return [...ALLOWED_EMAIL_DOMAINS];
}
