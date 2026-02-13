// Re-exports from permissions.ts (source of truth for RBAC types)
// This file exists for backwards compatibility

export type {
  Permission,
  Role,
  User,
  UserStatus,
  SystemUser,
  SystemRole,
} from './permissions';

export {
  ROLE_PERMISSIONS,
  ROLE_LABELS,
  USER_STATUS_LABELS,
} from './permissions';
