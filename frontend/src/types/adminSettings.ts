/** Application user row for Admin Settings (system / RBAC). */
export interface AdminUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  roleId: number;
  permissions: string[];
  status: 'active' | 'inactive';
  lastLogin: string;
  createdAt: string;
}

/** System role row for Admin Settings. */
export interface AdminRole {
  id: string;
  name: string;
  description: string;
  /** Built-in roles (admin, guest) cannot be deleted. */
  isSystem: boolean;
  usersCount: number;
  permissionsCount: number;
  createdAt: string;
  permissionIds: number[];
  permissionNames: string[];
}

/** System permission for read-only catalog. */
export interface AdminPermission {
  id: number;
  name: string;
  title: string;
  description: string;
  category: string;
}
