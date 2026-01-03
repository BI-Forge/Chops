import React, { useState } from 'react';
import { Search, Filter, Check, Play } from 'lucide-react';
import { BackgroundPattern } from '../components/BackgroundPattern';
import { Sidebar } from '../components/Sidebar';
import { MobileMenu } from '../components/MobileMenu';
import { DashboardHeader } from '../components/DashboardHeader';
import { UserDetailsModal } from '../components/UserDetailsModal';
import { UsersTable, User } from '../components/UsersTable';
import { CustomSelect } from '../components/CustomSelect';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { useTheme } from '../contexts/ThemeContext';
import { useAlert } from '../contexts/AlertContext';

interface UsersPageProps {
  onLogout?: () => void;
  activePage?: string;
  onPageChange?: (page: string) => void;
}

export default function UsersPage({ onLogout, activePage, onPageChange }: UsersPageProps) {
  const { theme } = useTheme();
  const { showAlert } = useAlert();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToCopy, setUserToCopy] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('All Roles');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);

  // Mock data
  const users: User[] = [
    {
      name: 'etlstore',
      id: 'd1f3ce00-4b9d-8dd5-ec9a-a52838311b4e',
      storage: 'users_xml',
      query_cnt: 0,
      role_name: null,
      database: null,
      table: null,
      column: null,
      grants: ['READ', 'KAFKA', 'NATS', 'RABBITMQ', 'SOURCES', 'SET DEFINER', 'SQLITE', 'ODBC', 'JDBC', 'HDFS', 'S3', 'HIVE', 'AZURE', 'FILE', 'URL', 'REMOTE', 'MONGO', 'REDIS', 'MYSQL', 'POSTGRES', 'KILL TRANSACTION', 'MOVE PARTITION BETWEEN SHARDS', 'SYSTEM', 'dictGet', 'displaySecretsInShowAndSelect', 'INTROSPECTION', 'CLUSTER', 'CREATE', 'DROP', 'UNDROP TABLE', 'TRUNCATE', 'OPTIMIZE', 'BACKUP', 'KILL QUERY', 'WRITE', 'TABLE ENGINE', 'CHECK', 'SHOW', 'SELECT', 'INSERT', 'ALTER']
    },
    {
      name: 'admin',
      id: 'a2e4df11-5c8e-9ee6-fd0b-b63949422c5f',
      storage: 'users_xml',
      query_cnt: 127,
      role_name: 'admin_role',
      database: null,
      table: null,
      column: null,
      grants: ['ALL']
    },
    {
      name: 'analytics_user',
      id: 'c3f5eg22-6d9f-0ff7-ge1c-c74050533d6g',
      storage: 'users_xml',
      query_cnt: 458,
      role_name: 'analyst',
      database: 'analytics',
      table: null,
      column: null,
      grants: ['SELECT', 'SHOW', 'INTROSPECTION']
    },
    {
      name: 'backup_service',
      id: 'e5h7ij44-8f1h-2hh9-ig3e-e96272755f8i',
      storage: 'users_xml',
      query_cnt: 89,
      role_name: 'backup_role',
      database: null,
      table: null,
      column: null,
      grants: ['BACKUP', 'SELECT', 'SHOW', 'SOURCES']
    },
    {
      name: 'readonly_user',
      id: 'g7j9kl66-0h3j-4jj1-ki5g-g18494977h0k',
      storage: 'users_xml',
      query_cnt: 1234,
      role_name: 'readonly',
      database: 'production',
      table: 'logs',
      column: null,
      grants: ['SELECT', 'SHOW']
    },
    {
      name: 'data_engineer',
      id: 'i9l1mn88-2j5l-6ll3-mk7i-i30616199j2m',
      storage: 'users_xml',
      query_cnt: 567,
      role_name: 'engineer',
      database: null,
      table: null,
      column: null,
      grants: ['SELECT', 'INSERT', 'ALTER', 'CREATE', 'DROP', 'OPTIMIZE', 'SHOW']
    },
    {
      name: 'monitoring',
      id: 'k1n3op00-4l7n-8nn5-ok9k-k52838311l4o',
      storage: 'users_xml',
      query_cnt: 2341,
      role_name: 'monitor',
      database: 'system',
      table: null,
      column: null,
      grants: ['SELECT', 'SHOW', 'INTROSPECTION', 'SYSTEM']
    },
    {
      name: 'etl_pipeline',
      id: 'm3p5qr22-6n9p-0pp7-qm1m-m74050533n6q',
      storage: 'users_xml',
      query_cnt: 789,
      role_name: 'etl_role',
      database: null,
      table: null,
      column: null,
      grants: ['SELECT', 'INSERT', 'ALTER', 'TRUNCATE', 'OPTIMIZE', 'KAFKA', 'SOURCES']
    },
  ];

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.role_name && user.role_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = selectedRole === 'All Roles' || user.role_name === selectedRole;
    
    return matchesSearch && matchesRole;
  });

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const handleDeleteUser = (user: User) => {
    console.log('Deleting user:', user.name);
    showAlert(`User ${user.name} deleted successfully`, 'success');
    setUserToDelete(null);
  };

  const handleCopyUser = (user: User) => {
    console.log('Copying user:', user.name);
    showAlert(`User ${user.name} copied successfully`, 'success');
    setUserToCopy(null);
  };

  return (
    <div className="h-screen relative overflow-hidden">
      {/* Background Pattern */}
      <BackgroundPattern />

      {/* Content */}
      <div className="relative z-10 flex h-full">
        {/* Desktop Sidebar - Hidden on mobile */}
        <div className="hidden md:block">
          <Sidebar
            collapsed={sidebarCollapsed}
            onCollapse={setSidebarCollapsed}
            onLogout={onLogout}
            activePage={activePage || 'users'}
            onPageChange={onPageChange}
          />
        </div>

        {/* Mobile Menu */}
        <MobileMenu
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          activePage={activePage || 'users'}
          onLogout={onLogout}
          onPageChange={onPageChange}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Header */}
          <DashboardHeader
            title="Users"
            description="User management and permissions"
            onMenuOpen={() => setMobileMenuOpen(true)}
          />

          {/* Main Content - Scrollable */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Search and Filters */}
              <div className={`${
                theme === 'light' 
                  ? 'bg-white/90 border-amber-500/30' 
                  : 'bg-gray-900/60 border-yellow-500/20'
              } backdrop-blur-md rounded-xl border p-6`}>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <Filter className={`w-5 h-5 ${theme === 'light' ? 'text-amber-600' : 'text-yellow-400'}`} />
                    <h2 className={theme === 'light' ? 'text-amber-700' : 'text-yellow-400'}>Filters</h2>
                  </div>
                  
                  {/* Apply Button */}
                  <button
                    onClick={() => {
                      setCurrentPage(1);
                      setIsApplyingFilters(true);
                      setTimeout(() => setIsApplyingFilters(false), 1000);
                    }}
                    disabled={isApplyingFilters}
                    className={`px-4 py-2 rounded-lg text-sm ${
                      theme === 'light'
                        ? 'bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-600 text-amber-700 hover:text-amber-800'
                        : 'bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 hover:border-yellow-500/50 text-yellow-400 hover:text-yellow-300'
                    } transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}>
                    {isApplyingFilters ? (
                      <Play className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>Apply</span>
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Search */}
                  <div className="lg:col-span-2">
                    <label className={`block ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>Search Users</label>
                    <div className="relative">
                      <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${theme === 'light' ? 'text-gray-700' : 'text-gray-500'}`} />
                      <input
                        type="text"
                        placeholder="Search by name, ID, or role..."
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setCurrentPage(1);
                        }}
                        className={`w-full pl-10 pr-4 py-2.5 rounded-lg border ${
                          theme === 'light'
                            ? 'bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-amber-500/50'
                            : 'bg-gray-800/50 border-gray-700/50 text-white placeholder-gray-500 focus:border-yellow-500/50'
                        } focus:outline-none transition-colors`}
                      />
                    </div>
                  </div>

                  {/* Role Filter */}
                  <div>
                    <label className={`block ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>Role</label>
                    <CustomSelect
                      value={selectedRole}
                      onChange={setSelectedRole}
                      options={['All Roles', 'admin_role', 'analyst', 'backup_role', 'readonly', 'engineer', 'monitor', 'etl_role']}
                    />
                  </div>

                  {/* Items per page */}
                  <div>
                    <label className={`block ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>Show</label>
                    <CustomSelect
                      value={itemsPerPage.toString()}
                      onChange={(value) => handleItemsPerPageChange(Number(value))}
                      options={['5', '10', '25', '50']}
                    />
                  </div>
                </div>
              </div>

              {/* Users Table */}
              <UsersTable
                users={currentUsers}
                currentPage={currentPage}
                totalPages={totalPages}
                startIndex={startIndex}
                endIndex={endIndex}
                totalCount={filteredUsers.length}
                onUserClick={setSelectedUser}
                onPageChange={handlePageChange}
                onCreateUser={() => setIsCreatingUser(true)}
                onDeleteClick={(user) => setUserToDelete(user)}
                onCopyClick={(user) => setUserToCopy(user)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* User Details Modal */}
      <UserDetailsModal
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        user={selectedUser}
      />

      {/* Create User Modal */}
      <UserDetailsModal
        isOpen={isCreatingUser}
        onClose={() => setIsCreatingUser(false)}
        user={null}
        isNewUser={true}
      />

      {/* Confirm Delete User Modal */}
      <ConfirmDeleteModal
        isOpen={userToDelete !== null}
        onClose={() => setUserToDelete(null)}
        onConfirm={() => {
          if (userToDelete) {
            handleDeleteUser(userToDelete);
          }
        }}
        itemName={userToDelete?.name || ''}
        itemType="user"
      />

      {/* Confirm Copy User Modal */}
      {userToCopy && (
        <UserDetailsModal
          isOpen={true}
          onClose={() => setUserToCopy(null)}
          user={userToCopy}
          isNewUser={false}
        />
      )}
    </div>
  );
}