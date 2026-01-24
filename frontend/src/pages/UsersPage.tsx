import { useState, useEffect } from 'react';
import { Search, Filter, Check, Play } from 'lucide-react';
import { BackgroundPattern } from '../components/BackgroundPattern';
import { Sidebar } from '../components/Sidebar';
import { MobileMenu } from '../components/MobileMenu';
import { DashboardHeader } from '../components/DashboardHeader';
import { UserDetailsModal } from '../components/users/UserDetailsModal';
import { UsersTable, User } from '../components/users/UsersTable';
import { CustomSelect } from '../components/CustomSelect';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { useTheme } from '../contexts/ThemeContext';
import { useAlert } from '../contexts/AlertContext';
import { useSidebar } from '../contexts/SidebarContext';
import { usersAPI } from '../services/usersAPI';
import { metricsAPI } from '../services/metricsAPI';
import type { NodeInfo } from '../types/metrics';

export function UsersPage() {
  const { theme } = useTheme();
  const { success, error: showError } = useAlert();
  const { sidebarCollapsed, setSidebarCollapsed } = useSidebar();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToCopy, setUserToCopy] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('All Roles');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [nodes, setNodes] = useState<NodeInfo[]>([]);
  const [selectedNode, setSelectedNode] = useState<string>('');
  const [loadingNodes, setLoadingNodes] = useState(true);

  // Load nodes from API
  useEffect(() => {
    const loadNodes = async () => {
      try {
        setLoadingNodes(true);
        const availableNodes = await metricsAPI.getAvailableNodes();
        setNodes(availableNodes);
        
        // Get saved node from sessionStorage or use first node
        const savedNode = sessionStorage.getItem('selectedNode');
        const savedNodeInfo = availableNodes.find(n => n.name === savedNode);
        if (savedNodeInfo) {
          setSelectedNode(savedNodeInfo.name);
        } else if (availableNodes.length > 0) {
          setSelectedNode(availableNodes[0].name);
          sessionStorage.setItem('selectedNode', availableNodes[0].name);
        }
      } catch (error) {
        console.error('Failed to load nodes:', error);
        showError('Failed to load nodes');
      } finally {
        setLoadingNodes(false);
      }
    };

    loadNodes();
  }, [showError]);

  // Load users from API
  useEffect(() => {
    if (!selectedNode) {
      setUsers([]);
      setLoading(false);
      return;
    }

    const loadUsers = async () => {
      try {
        setLoading(true);
        const usersList = await usersAPI.getUsersList(selectedNode);
        // Map API response to User interface
        const mappedUsers: User[] = usersList.map(user => ({
          name: user.name,
          id: user.id,
          profile: user.profile || '',
          storage: user.storage || '',
          role_name: user.role_name || '',
          grants: user.grants || [],
        }));
        setUsers(mappedUsers);
      } catch (error) {
        console.error('Failed to load users:', error);
        showError('Failed to load users');
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [selectedNode, showError]);

  // Save selected node to sessionStorage
  const handleNodeSelect = (node: string) => {
    setSelectedNode(node);
    sessionStorage.setItem('selectedNode', node);
  };

  // Get unique roles from users for filter
  const availableRoles = ['All Roles', ...Array.from(new Set(users.map(u => u.role_name).filter(Boolean)))].filter(Boolean) as string[];

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.role_name && user.role_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.profile && user.profile.toLowerCase().includes(searchTerm.toLowerCase()));
    
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
    success(`User ${user.name} deleted successfully`);
    setUserToDelete(null);
  };

  const handleCopyUser = (user: User) => {
    console.log('Copying user:', user.name);
    success(`User ${user.name} copied successfully`);
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
          />
        </div>

        {/* Mobile Menu */}
        <MobileMenu
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Header */}
          <DashboardHeader
            title="Users"
            description="User management and permissions"
            onMenuOpen={() => setMobileMenuOpen(true)}
            nodes={nodes}
            selectedNode={selectedNode}
            onSelectNode={handleNodeSelect}
          />

          {/* Main Content - Scrollable */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
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
                      options={availableRoles}
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
              {loading ? (
                <div className={`${
                  theme === 'light' 
                    ? 'bg-white/90 border-amber-500/30' 
                    : 'bg-gray-900/60 border-yellow-500/20'
                } backdrop-blur-md rounded-xl border p-12 flex items-center justify-center`}>
                  <div className="text-center">
                    <div className={`inline-block animate-spin rounded-full h-8 w-8 border-b-2 ${
                      theme === 'light' ? 'border-amber-600' : 'border-yellow-400'
                    }`}></div>
                    <p className={`mt-4 text-sm ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'}`}>
                      Loading users...
                    </p>
                  </div>
                </div>
              ) : !selectedNode ? (
                <div className={`${
                  theme === 'light' 
                    ? 'bg-white/90 border-amber-500/30' 
                    : 'bg-gray-900/60 border-yellow-500/20'
                } backdrop-blur-md rounded-xl border p-12 flex items-center justify-center`}>
                  <p className={`text-sm ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'}`}>
                    Please select a node to view users
                  </p>
                </div>
              ) : (
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
              )}
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
        userName={userToDelete?.name || ''}
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
