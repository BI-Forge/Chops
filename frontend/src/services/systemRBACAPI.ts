import api from './api'

export interface PermissionSummary {
  id: number
  name: string
  description?: string
}

export interface RoleResponse {
  id: number
  name: string
  description?: string
  is_system: boolean
  users_count: number
  permissions_count: number
  created_at: string
}

export interface RoleDetailResponse {
  id: number
  name: string
  description?: string
  is_system: boolean
  permissions: PermissionSummary[]
}

export interface SystemUserResponse {
  id: number
  username: string
  email: string
  full_name: string
  role_id: number
  role_name: string
  permissions: string[]
  is_active: boolean
  created_at: string
}

export interface CreateRoleRequest {
  name: string
  description?: string
}

export interface SetRolePermissionsRequest {
  permission_ids: number[]
}

export interface AssignUserRoleRequest {
  role_id: number
}

export interface SetUserActiveRequest {
  is_active: boolean
}

function formatApiError(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const r = (err as { response?: { data?: { message?: string; error?: string } } }).response
    const d = r?.data
    return d?.message || d?.error || 'Request failed'
  }
  return 'Request failed'
}

/** Fetches system (application) users with roles and effective permission codes. */
export async function listSystemUsers(): Promise<SystemUserResponse[]> {
  const { data } = await api.get<SystemUserResponse[]>('/system/users')
  return data
}

/** Fetches system roles with user and permission counts. */
export async function listSystemRoles(): Promise<RoleResponse[]> {
  const { data } = await api.get<RoleResponse[]>('/system/roles')
  return data
}

/** Fetches one role with permission rows. */
export async function getSystemRole(roleId: number): Promise<RoleDetailResponse> {
  const { data } = await api.get<RoleDetailResponse>(`/system/roles/${roleId}`)
  return data
}

/** Creates a system role (no permissions until updated). */
export async function createSystemRole(body: CreateRoleRequest): Promise<RoleResponse> {
  const { data } = await api.post<RoleResponse>('/system/roles', body)
  return data
}

/** Replaces permissions linked to a role. */
export async function setSystemRolePermissions(roleId: number, body: SetRolePermissionsRequest): Promise<void> {
  await api.put(`/system/roles/${roleId}/permissions`, body)
}

/** Assigns a system role to an application user. */
export async function assignSystemUserRole(userId: number, body: AssignUserRoleRequest): Promise<void> {
  await api.put(`/system/users/${userId}/role`, body)
}

/** Deletes a custom role with no assigned users (system roles cannot be deleted). */
export async function deleteSystemRole(roleId: number): Promise<void> {
  await api.delete(`/system/roles/${roleId}`)
}

/** Sets application user active flag (requires system.users.set_active). */
export async function setSystemUserActive(userId: number, body: SetUserActiveRequest): Promise<void> {
  await api.put(`/system/users/${userId}/active`, body)
}

/** Lists all permissions, optionally filtered to a role. */
export async function listSystemPermissions(roleId?: number): Promise<PermissionSummary[]> {
  const { data } = await api.get<PermissionSummary[]>('/system/permissions', {
    params: roleId != null ? { role_id: roleId } : undefined,
  })
  return data
}

export { formatApiError }
