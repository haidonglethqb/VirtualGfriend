/**
 * Password validation utilities (shared between BE and FE)
 */

export const PASSWORD_REQUIREMENTS = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 128,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBER: true,
  REQUIRE_SPECIAL: true,
}

export const PASSWORD_PATTERNS = {
  HAS_UPPERCASE: /[A-Z]/,
  HAS_LOWERCASE: /[a-z]/,
  HAS_NUMBER: /[0-9]/,
  HAS_SPECIAL: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
}

export interface PasswordValidationResult {
  valid: boolean
  errors: string[]
  strength: 'weak' | 'fair' | 'good' | 'strong'
}

export type ValidationLanguage = 'vi' | 'en'

export function validatePassword(password: string, language: ValidationLanguage = 'vi'): PasswordValidationResult {
  const errors: string[] = []
  let strengthScore = 0
  const tr = (vi: string, en: string) => (language === 'vi' ? vi : en)
  
  // Length checks
  if (password.length < PASSWORD_REQUIREMENTS.MIN_LENGTH) {
    errors.push(tr(
      `Mật khẩu phải có ít nhất ${PASSWORD_REQUIREMENTS.MIN_LENGTH} ký tự`,
      `Password must be at least ${PASSWORD_REQUIREMENTS.MIN_LENGTH} characters`
    ))
  } else {
    strengthScore += 1
    if (password.length >= 12) strengthScore += 1
    if (password.length >= 16) strengthScore += 1
  }
  
  if (password.length > PASSWORD_REQUIREMENTS.MAX_LENGTH) {
    errors.push(tr(
      `Mật khẩu không được quá ${PASSWORD_REQUIREMENTS.MAX_LENGTH} ký tự`,
      `Password must not exceed ${PASSWORD_REQUIREMENTS.MAX_LENGTH} characters`
    ))
  }
  
  // Character type checks
  const hasUppercase = PASSWORD_PATTERNS.HAS_UPPERCASE.test(password)
  const hasLowercase = PASSWORD_PATTERNS.HAS_LOWERCASE.test(password)
  const hasNumber = PASSWORD_PATTERNS.HAS_NUMBER.test(password)
  const hasSpecial = PASSWORD_PATTERNS.HAS_SPECIAL.test(password)
  
  if (PASSWORD_REQUIREMENTS.REQUIRE_UPPERCASE && !hasUppercase) {
    errors.push(tr('Mật khẩu phải có ít nhất 1 chữ hoa', 'Password must include at least 1 uppercase letter'))
  } else if (hasUppercase) {
    strengthScore += 1
  }
  
  if (PASSWORD_REQUIREMENTS.REQUIRE_LOWERCASE && !hasLowercase) {
    errors.push(tr('Mật khẩu phải có ít nhất 1 chữ thường', 'Password must include at least 1 lowercase letter'))
  } else if (hasLowercase) {
    strengthScore += 1
  }
  
  if (PASSWORD_REQUIREMENTS.REQUIRE_NUMBER && !hasNumber) {
    errors.push(tr('Mật khẩu phải có ít nhất 1 số', 'Password must include at least 1 number'))
  } else if (hasNumber) {
    strengthScore += 1
  }
  
  if (PASSWORD_REQUIREMENTS.REQUIRE_SPECIAL && !hasSpecial) {
    errors.push(tr('Mật khẩu phải có ít nhất 1 ký tự đặc biệt', 'Password must include at least 1 special character'))
  } else if (hasSpecial) {
    strengthScore += 2 // Bonus for special chars
  }
  
  // Determine strength
  let strength: 'weak' | 'fair' | 'good' | 'strong' = 'weak'
  if (strengthScore >= 7) strength = 'strong'
  else if (strengthScore >= 5) strength = 'good'
  else if (strengthScore >= 3) strength = 'fair'
  
  return { valid: errors.length === 0, errors, strength }
}

export function getPasswordStrengthColor(strength: string): string {
  switch (strength) {
    case 'strong': return 'bg-green-500'
    case 'good': return 'bg-blue-500'
    case 'fair': return 'bg-yellow-500'
    default: return 'bg-red-500'
  }
}

export function getPasswordStrengthLabel(strength: string, language: ValidationLanguage = 'vi'): string {
  const tr = (vi: string, en: string) => (language === 'vi' ? vi : en)

  switch (strength) {
    case 'strong': return tr('Mạnh', 'Strong')
    case 'good': return tr('Tốt', 'Good')
    case 'fair': return tr('Trung bình', 'Fair')
    default: return tr('Yếu', 'Weak')
  }
}
