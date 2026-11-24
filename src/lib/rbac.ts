import type { AdminRole } from '../types/qorvia';

export const BOOTSTRAPPED_SUPER_ADMIN_EMAIL = 'sbgangster016@gmail.com';

export type UserRole = 'reader' | AdminRole;

export interface AuthSubject {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  role: UserRole;
  isActive: boolean;
}

const VALID_ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;

export function isValidDocumentId(id: string): boolean {
  return VALID_ID_REGEX.test(id);
}

export function isBootstrappedSuperAdmin(subject: Pick<AuthSubject, 'email' | 'emailVerified'>): boolean {
  return (
    subject.emailVerified === true &&
    subject.email?.toLowerCase() === BOOTSTRAPPED_SUPER_ADMIN_EMAIL
  );
}

export function resolveEffectiveRole(subject: AuthSubject): UserRole {
  if (isBootstrappedSuperAdmin(subject)) {
    return 'superAdmin';
  }
  if (!subject.isActive) return 'reader';
  return subject.role;
}

export function canAccessAdminDashboard(subject: AuthSubject | null): boolean {
  if (!subject || !subject.emailVerified) return false;
  const role = resolveEffectiveRole(subject);
  return role === 'superAdmin' || role === 'editor' || role === 'reviewer' || role === 'adsManager';
}

export function canManageAds(subject: AuthSubject | null): boolean {
  if (!subject || !subject.emailVerified) return false;
  const role = resolveEffectiveRole(subject);
  return role === 'superAdmin' || role === 'adsManager';
}

export function canPublishArticles(subject: AuthSubject | null): boolean {
  if (!subject || !subject.emailVerified) return false;
  const role = resolveEffectiveRole(subject);
  return role === 'superAdmin' || role === 'reviewer';
}

export function canManageUsersAndRoles(subject: AuthSubject | null): boolean {
  if (!subject || !subject.emailVerified) return false;
  return resolveEffectiveRole(subject) === 'superAdmin';
}

export function validateFirestorePayloadConstraints(payload: {
  id: string;
  title?: string;
  zoneId?: string;
  tags?: string[];
}): { valid: boolean; reason?: string } {
  if (!isValidDocumentId(payload.id)) {
    return { valid: false, reason: 'Invalid document ID format or length (>128).' };
  }
  if (payload.title !== undefined && (payload.title.trim().length < 2 || payload.title.length > 240)) {
    return { valid: false, reason: 'Title must be between 2 and 240 characters.' };
  }
  if (payload.zoneId !== undefined && !/^[0-9]{4,12}$/.test(payload.zoneId)) {
    return { valid: false, reason: 'Zone ID must be 4 to 12 digits.' };
  }
  if (payload.tags !== undefined && payload.tags.length > 15) {
    return { valid: false, reason: 'Tags array exceeds maximum size of 15.' };
  }
  return { valid: true };
}
