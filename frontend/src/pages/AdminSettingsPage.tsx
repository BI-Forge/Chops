import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Users as UsersIcon, Key, Lock } from 'lucide-react';
import { BackgroundPattern } from '../components/BackgroundPattern';
import { Sidebar } from '../components/Sidebar';
import { MobileMenu } from '../components/MobileMenu';
import { DashboardHeader } from '../components/DashboardHeader';
import { AdminUsersList } from '../components/admin/AdminUsersList';
import { AdminUserDetailsModal } from '../components/admin/AdminUserDetailsModal';
import { AdminRolesList } from '../components/admin/AdminRolesList';
import { AdminRoleDetailsModal } from '../components/admin/AdminRoleDetailsModal';
import { AdminPermissionsList } from '../components/admin/AdminPermissionsList';
import { useTheme } from '../contexts/ThemeContext';
import { useAlert } from '../contexts/AlertContext';
import { useSidebar } from '../contexts/SidebarContext';
import type { AdminPermission, AdminRole, AdminUser } from '../types/adminSettings';
import * as systemRBACAPI from '../services/systemRBACAPI';
import { formatApiError } from '../services/systemRBACAPI';
import { formatIsoDate, permissionCodeTitle } from '../utils/adminSettingsFormat';
import { useAuth } from '../services/AuthContext';

function mapSystemUser(u: systemRBACAPI.SystemUserResponse): AdminUser {
  return {
    id: String(u.id),
    username: u.username,
    email: u.email,
    fullName: u.full_name || u.username,
    role: u.role_name,
    roleId: u.role_id,
    permissions: u.permissions,
    status: u.is_active ? 'active' : 'inactive',
    lastLogin: '—',
    createdAt: formatIsoDate(u.created_at),
  };
}

function mapRoleListRow(r: systemRBACAPI.RoleResponse): AdminRole {
  return {
    id: String(r.id),
    name: r.name,
    description: r.description || '',
    isSystem: r.is_system,
    usersCount: r.users_count,
    permissionsCount: r.permissions_count,
    createdAt: formatIsoDate(r.created_at),
    permissionIds: [],
    permissionNames: [],
  };
}

function mergeRoleDetail(listRow: AdminRole, detail: systemRBACAPI.RoleDetailResponse): AdminRole {
  return {
    ...listRow,
    name: detail.name,
    description: detail.description || '',
    isSystem: detail.is_system,
    permissionsCount: detail.permissions.length,
    permissionIds: detail.permissions.map((p) => p.id),
    permissionNames: detail.permissions.map((p) => p.name),
  };
}

export default function AdminSettingsPage() {
  const { theme } = useTheme();
  const { user: authUser } = useAuth();
  const { error: showError } = useAlert();
  const { sidebarCollapsed, setSidebarCollapsed } = useSidebar();
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'permissions'>('users');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [permissionCatalog, setPermissionCatalog] = useState<AdminPermission[]>([]);
  const [rawPermissions, setRawPermissions] = useState<systemRBACAPI.PermissionSummary[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<AdminRole | null>(null);
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [roleDetailLoading, setRoleDetailLoading] = useState(false);

  const refreshUsers = useCallback(async (): Promise<AdminUser[]> => {
    const list = await systemRBACAPI.listSystemUsers();
    const mapped = list.map(mapSystemUser);
    setUsers(mapped);
    return mapped;
  }, []);

  const refreshRoles = useCallback(async (): Promise<AdminRole[]> => {
    const list = await systemRBACAPI.listSystemRoles();
    const mapped = list.map(mapRoleListRow);
    setRoles(mapped);
    return mapped;
  }, []);

  const refreshPermissions = useCallback(async () => {
    const list = await systemRBACAPI.listSystemPermissions();
    setRawPermissions(list);
    setPermissionCatalog(
      list.map((p) => ({
        id: p.id,
        name: p.name,
        title: permissionCodeTitle(p.name),
        description: p.description || '',
        category: p.name.includes('.') ? p.name.split('.')[0] : 'other',
      }))
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await Promise.all([refreshUsers(), refreshRoles(), refreshPermissions()]);
      } catch (e) {
        if (!cancelled) showError(formatApiError(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshUsers, refreshRoles, refreshPermissions, showError]);

  const handleViewUser = (user: AdminUser) => {
    setSelectedUser(user);
  };

  const handleCloseUserModal = () => {
    setSelectedUser(null);
  };

  const handleViewRole = async (role: AdminRole) => {
    setRoleDetailLoading(true);
    setIsCreatingRole(false);
    try {
      const detail = await systemRBACAPI.getSystemRole(Number(role.id));
      setSelectedRole(mergeRoleDetail(role, detail));
    } catch (e) {
      showError(formatApiError(e));
    } finally {
      setRoleDetailLoading(false);
    }
  };

  const handleCloseRoleModal = () => {
    setSelectedRole(null);
    setIsCreatingRole(false);
  };

  const handleCreateRole = () => {
    setIsCreatingRole(true);
    setSelectedRole({
      id: '',
      name: '',
      description: '',
      isSystem: false,
      usersCount: 0,
      permissionsCount: 0,
      createdAt: '',
      permissionIds: [],
      permissionNames: [],
    });
  };

  const handleUserRoleSaved = async (userId: string) => {
    try {
      const mapped = await refreshUsers();
      const next = mapped.find((u) => u.id === userId);
      if (next) setSelectedUser(next);
    } catch (e) {
      showError(formatApiError(e));
    }
  };

  const handleUserActiveSaved = async (userId: string) => {
    try {
      const mapped = await refreshUsers();
      await refreshRoles();
      const next = mapped.find((u) => u.id === userId);
      if (next) setSelectedUser(next);
    } catch (e) {
      showError(formatApiError(e));
    }
  };

  const handleDeleteRole = async (role: AdminRole) => {
    try {
      await systemRBACAPI.deleteSystemRole(Number(role.id));
      await refreshRoles();
      if (selectedRole?.id === role.id) {
        handleCloseRoleModal();
      }
    } catch (e) {
      showError(formatApiError(e));
    }
  };

  const handleRoleSaved = async (payload: { roleId: string; wasCreate: boolean }) => {
    try {
      const rolesList = await refreshRoles();
      await refreshPermissions();
      if (payload.wasCreate) {
        setIsCreatingRole(false);
      }
      const row = rolesList.find((r) => r.id === payload.roleId);
      if (!row) {
        showError('Error', 'Role not found after save');
        return;
      }
      const detail = await systemRBACAPI.getSystemRole(Number(payload.roleId));
      setSelectedRole(mergeRoleDetail(row, detail));
    } catch (e) {
      showError(formatApiError(e));
    }
  };

  const roleOptionsForUserModal = useMemo(() => {
    const byId = new Map<number, string>();
    roles.forEach((r) => byId.set(Number(r.id), r.name));
    if (selectedUser && !byId.has(selectedUser.roleId)) {
      byId.set(selectedUser.roleId, selectedUser.role);
    }
    return Array.from(byId.entries()).map(([id, name]) => ({ id, name }));
  }, [roles, selectedUser]);

  const tabs = [
    { id: 'users' as const, label: 'Users', icon: UsersIcon },
    { id: 'roles' as const, label: 'Roles', icon: Key },
    { id: 'permissions' as const, label: 'Permissions', icon: Lock },
  ];

  return (
    <div className={`h-screen relative overflow-hidden ${theme === 'light' ? 'bg-white' : 'bg-gray-950'}`}>
      <BackgroundPattern />

      <div className="relative z-10 flex h-full overflow-hidden">
        <div className="hidden md:block">
          <Sidebar collapsed={sidebarCollapsed} onCollapse={setSidebarCollapsed} />
        </div>

        <MobileMenu isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

        <div className="flex-1 flex flex-col overflow-hidden">
          <DashboardHeader
            title="Admin Settings"
            description="Manage users, roles and permissions"
            onMenuOpen={() => setMobileMenuOpen(true)}
          />

          <main
            className={`flex-1 overflow-y-auto custom-scrollbar ${
              theme === 'light' ? 'bg-gray-50/50' : 'bg-transparent'
            }`}
          >
            <div className="max-w-[1920px] mx-auto p-6 space-y-6">
              <div
                className={`${
                  theme === 'light'
                    ? 'bg-white/90 border-amber-500/30'
                    : 'bg-gray-900/60 border-yellow-500/20'
                } backdrop-blur-md rounded-xl border p-2`}
              >
                <div className="flex gap-2">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all text-sm font-medium ${
                          activeTab === tab.id
                            ? theme === 'light'
                              ? 'bg-amber-500/10 text-amber-700 border border-amber-500/30'
                              : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
                            : theme === 'light'
                              ? 'text-gray-600 hover:bg-amber-50 hover:text-amber-700'
                              : 'text-gray-400 hover:bg-gray-800/50 hover:text-yellow-400'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {loading && (
                <p className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                  Loading…
                </p>
              )}

              {!loading && activeTab === 'users' && (
                <AdminUsersList users={users} onViewUser={handleViewUser} onRetry={refreshUsers} />
              )}

              {!loading && activeTab === 'roles' && (
                <AdminRolesList
                  roles={roles}
                  onViewRole={handleViewRole}
                  onCreateRole={handleCreateRole}
                  onDeleteRole={(r) => void handleDeleteRole(r)}
                />
              )}

              {!loading && activeTab === 'permissions' && (
                <AdminPermissionsList permissions={permissionCatalog} />
              )}
            </div>
          </main>
        </div>
      </div>

      {selectedUser && (
        <AdminUserDetailsModal
          user={selectedUser}
          roleOptions={roleOptionsForUserModal}
          currentUserId={authUser?.id ?? null}
          onClose={handleCloseUserModal}
          onRoleSaved={handleUserRoleSaved}
          onActiveSaved={handleUserActiveSaved}
        />
      )}

      {selectedRole && (
        <AdminRoleDetailsModal
          role={selectedRole}
          allPermissions={rawPermissions}
          isCreating={isCreatingRole}
          detailLoading={roleDetailLoading}
          onClose={handleCloseRoleModal}
          onSaved={handleRoleSaved}
        />
      )}
    </div>
  );
}
