import React, { useState } from 'react';
import { Shield, Users as UsersIcon, Key, Lock } from 'lucide-react';
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

interface AdminSettingsPageProps {
  onLogout?: () => void;
  activePage?: string;
  onPageChange?: (page: string) => void;
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  permissions: string[];
  status: 'active' | 'inactive' | 'locked';
  lastLogin: string;
  createdAt: string;
}

export interface AdminRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  usersCount: number;
  createdAt: string;
}

export interface AdminPermission {
  name: string;
  title: string;
  description: string;
  category: string;
}

export default function AdminSettingsPage({ onLogout, activePage, onPageChange }: AdminSettingsPageProps) {
  const { theme } = useTheme();
  const { success, error: showError } = useAlert();
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'permissions'>('users');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<AdminRole | null>(null);
  const [isCreatingRole, setIsCreatingRole] = useState(false);

  // Mock data - пользователи системы
  const users: AdminUser[] = [
    {
      id: '1',
      username: 'admin',
      email: 'admin@clickhouse-ops.com',
      fullName: 'System Administrator',
      role: 'Administrator',
      permissions: ['users.view', 'users.create', 'users.edit', 'users.delete', 'roles.manage', 'permissions.manage', 'databases.manage', 'queries.execute', 'settings.manage'],
      status: 'active',
      lastLogin: '2025-12-18 10:30:00',
      createdAt: '2024-01-15 08:00:00'
    },
    {
      id: '2',
      username: 'jsmith',
      email: 'john.smith@company.com',
      fullName: 'John Smith',
      role: 'Database Admin',
      permissions: ['databases.view', 'databases.create', 'databases.edit', 'queries.execute', 'tables.manage'],
      status: 'active',
      lastLogin: '2025-12-18 09:15:00',
      createdAt: '2024-03-20 14:30:00'
    },
    {
      id: '3',
      username: 'mwilson',
      email: 'mary.wilson@company.com',
      fullName: 'Mary Wilson',
      role: 'Analyst',
      permissions: ['databases.view', 'queries.execute', 'queries.view'],
      status: 'active',
      lastLogin: '2025-12-17 16:45:00',
      createdAt: '2024-05-10 09:00:00'
    },
    {
      id: '4',
      username: 'rjohnson',
      email: 'robert.johnson@company.com',
      fullName: 'Robert Johnson',
      role: 'Developer',
      permissions: ['databases.view', 'queries.execute', 'tables.view', 'queries.create'],
      status: 'active',
      lastLogin: '2025-12-18 08:00:00',
      createdAt: '2024-06-15 11:20:00'
    },
    {
      id: '5',
      username: 'sbrown',
      email: 'sarah.brown@company.com',
      fullName: 'Sarah Brown',
      role: 'Viewer',
      permissions: ['databases.view', 'queries.view'],
      status: 'inactive',
      lastLogin: '2025-11-30 17:00:00',
      createdAt: '2024-08-22 10:15:00'
    },
    {
      id: '6',
      username: 'dlee',
      email: 'david.lee@company.com',
      fullName: 'David Lee',
      role: 'Database Admin',
      permissions: ['databases.view', 'databases.create', 'databases.edit', 'queries.execute', 'tables.manage'],
      status: 'locked',
      lastLogin: '2025-12-10 13:20:00',
      createdAt: '2024-04-18 15:45:00'
    }
  ];

  // Mock data - роли системы
  const roles: AdminRole[] = [
    {
      id: '1',
      name: 'Administrator',
      description: 'Full access to all system features and settings',
      permissions: ['users.view', 'users.create', 'users.edit', 'users.delete', 'roles.manage', 'permissions.manage', 'databases.manage', 'queries.execute', 'settings.manage'],
      usersCount: 1,
      createdAt: '2024-01-15 08:00:00'
    },
    {
      id: '2',
      name: 'Database Admin',
      description: 'Manage databases and execute queries',
      permissions: ['databases.view', 'databases.create', 'databases.edit', 'queries.execute', 'tables.manage'],
      usersCount: 2,
      createdAt: '2024-03-20 14:30:00'
    },
    {
      id: '3',
      name: 'Analyst',
      description: 'View databases and execute queries',
      permissions: ['databases.view', 'queries.execute', 'queries.view'],
      usersCount: 1,
      createdAt: '2024-05-10 09:00:00'
    },
    {
      id: '4',
      name: 'Developer',
      description: 'View databases and execute queries',
      permissions: ['databases.view', 'queries.execute', 'tables.view', 'queries.create'],
      usersCount: 1,
      createdAt: '2024-06-15 11:20:00'
    },
    {
      id: '5',
      name: 'Viewer',
      description: 'View databases and queries',
      permissions: ['databases.view', 'queries.view'],
      usersCount: 1,
      createdAt: '2024-08-22 10:15:00'
    }
  ];

  // Mock data - системные разрешения (read-only)
  const permissions: AdminPermission[] = [
    // Users permissions
    { name: 'users.view', title: 'View Users', description: 'Allows viewing user list and user details', category: 'users' },
    { name: 'users.create', title: 'Create Users', description: 'Allows creating new users in the system', category: 'users' },
    { name: 'users.edit', title: 'Edit Users', description: 'Allows editing existing user information', category: 'users' },
    { name: 'users.delete', title: 'Delete Users', description: 'Allows deleting users from the system', category: 'users' },
    
    // Roles permissions
    { name: 'roles.view', title: 'View Roles', description: 'Allows viewing role list and role details', category: 'roles' },
    { name: 'roles.manage', title: 'Manage Roles', description: 'Allows creating, editing and deleting roles', category: 'roles' },
    
    // Permissions permissions
    { name: 'permissions.view', title: 'View Permissions', description: 'Allows viewing system permissions list', category: 'permissions' },
    { name: 'permissions.manage', title: 'Manage Permissions', description: 'Allows managing permission assignments', category: 'permissions' },
    
    // Databases permissions
    { name: 'databases.view', title: 'View Databases', description: 'Allows viewing database list and database details', category: 'databases' },
    { name: 'databases.create', title: 'Create Databases', description: 'Allows creating new databases', category: 'databases' },
    { name: 'databases.edit', title: 'Edit Databases', description: 'Allows editing database configuration', category: 'databases' },
    { name: 'databases.delete', title: 'Delete Databases', description: 'Allows deleting databases', category: 'databases' },
    { name: 'databases.manage', title: 'Manage Databases', description: 'Full control over database operations', category: 'databases' },
    
    // Queries permissions
    { name: 'queries.view', title: 'View Queries', description: 'Allows viewing query history and query details', category: 'queries' },
    { name: 'queries.create', title: 'Create Queries', description: 'Allows creating and saving new queries', category: 'queries' },
    { name: 'queries.edit', title: 'Edit Queries', description: 'Allows editing existing queries', category: 'queries' },
    { name: 'queries.delete', title: 'Delete Queries', description: 'Allows deleting queries', category: 'queries' },
    { name: 'queries.execute', title: 'Execute Queries', description: 'Allows executing SQL queries against databases', category: 'queries' },
    
    // Tables permissions
    { name: 'tables.view', title: 'View Tables', description: 'Allows viewing table list and table schema', category: 'tables' },
    { name: 'tables.create', title: 'Create Tables', description: 'Allows creating new tables', category: 'tables' },
    { name: 'tables.edit', title: 'Edit Tables', description: 'Allows modifying table structure', category: 'tables' },
    { name: 'tables.delete', title: 'Delete Tables', description: 'Allows deleting tables', category: 'tables' },
    { name: 'tables.manage', title: 'Manage Tables', description: 'Full control over table operations', category: 'tables' },
    
    // Settings permissions
    { name: 'settings.view', title: 'View Settings', description: 'Allows viewing system settings', category: 'settings' },
    { name: 'settings.manage', title: 'Manage Settings', description: 'Allows modifying system settings and configuration', category: 'settings' },
    
    // Backups permissions
    { name: 'backups.view', title: 'View Backups', description: 'Allows viewing backup list and backup details', category: 'backups' },
    { name: 'backups.create', title: 'Create Backups', description: 'Allows creating new database backups', category: 'backups' },
    { name: 'backups.restore', title: 'Restore Backups', description: 'Allows restoring databases from backups', category: 'backups' },
    
    // Monitoring permissions
    { name: 'monitoring.view', title: 'View Monitoring', description: 'Allows viewing system monitoring dashboards and metrics', category: 'monitoring' },
    
    // Logs permissions
    { name: 'logs.view', title: 'View Logs', description: 'Allows viewing system logs and query logs', category: 'logs' },
    { name: 'logs.export', title: 'Export Logs', description: 'Allows exporting logs to external systems', category: 'logs' },
    
    // Reports permissions
    { name: 'reports.view', title: 'View Reports', description: 'Allows viewing generated reports', category: 'reports' },
    { name: 'reports.create', title: 'Create Reports', description: 'Allows creating and generating new reports', category: 'reports' },
    
    // System permissions
    { name: 'system.manage', title: 'Manage System', description: 'Allows managing system-level operations', category: 'system' },
    { name: 'system.restart', title: 'Restart System', description: 'Allows restarting system services', category: 'system' }
  ];

  const handleViewUser = (user: AdminUser) => {
    setSelectedUser(user);
  };

  const handleCloseUserModal = () => {
    setSelectedUser(null);
  };

  const handleViewRole = (role: AdminRole) => {
    setSelectedRole(role);
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
      permissions: [],
      usersCount: 0,
      createdAt: new Date().toISOString()
    });
  };

  const handleDeleteRole = (roleId: string) => {
    console.log('Deleting role:', roleId);
    success('Role deleted successfully');
  };

  const tabs = [
    { id: 'users' as const, label: 'Users', icon: UsersIcon },
    { id: 'roles' as const, label: 'Roles', icon: Key },
    { id: 'permissions' as const, label: 'Permissions', icon: Lock }
  ];

  return (
    <div className={`min-h-screen ${theme === 'light' ? 'bg-white' : 'bg-gray-950'} relative`}>
      <BackgroundPattern />
      
      <div className="relative flex h-screen overflow-hidden">
        {/* Sidebar */}
        <Sidebar 
          collapsed={sidebarCollapsed} 
          onCollapse={setSidebarCollapsed}
          onLogout={onLogout}
          activePage={activePage}
          onPageChange={onPageChange}
        />
        
        {/* Mobile Menu */}
        <MobileMenu 
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          onLogout={onLogout}
          activePage={activePage}
          onPageChange={onPageChange}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <DashboardHeader 
            title="Admin Settings"
            description="Manage users, roles and permissions"
            onMenuOpen={() => setMobileMenuOpen(true)}
          />

          <main className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Tabs */}
              <div className={`${
                theme === 'light' 
                  ? 'bg-white/90 border-amber-500/30' 
                  : 'bg-gray-900/60 border-yellow-500/20'
              } backdrop-blur-md rounded-xl border p-2`}>
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

              {/* Content based on active tab */}
              {activeTab === 'users' && (
                <AdminUsersList 
                  users={users}
                  onViewUser={handleViewUser}
                />
              )}

              {activeTab === 'roles' && (
                <AdminRolesList 
                  roles={roles}
                  onViewRole={handleViewRole}
                  onCreateRole={handleCreateRole}
                  onDeleteRole={handleDeleteRole}
                />
              )}

              {activeTab === 'permissions' && (
                <AdminPermissionsList 
                  permissions={permissions}
                />
              )}
            </div>
          </main>
        </div>
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <AdminUserDetailsModal
          user={selectedUser}
          onClose={handleCloseUserModal}
        />
      )}

      {/* Role Details Modal */}
      {selectedRole && (
        <AdminRoleDetailsModal
          role={selectedRole}
          onClose={handleCloseRoleModal}
          isCreating={isCreatingRole}
        />
      )}
    </div>
  );
}