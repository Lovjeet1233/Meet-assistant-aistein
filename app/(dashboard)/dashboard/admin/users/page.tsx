'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Search } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/Button';
import {
  DataTable,
  DataTableBody,
  DataTableCard,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  createdAt: string;
  lastLoginAt?: string;
  isActive: boolean;
  conversationCount: number;
  knowledgeBaseCount: number;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    void fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();

      if (data.success) {
        setUsers(data.users);
      } else if (response.status === 403) {
        alert('Admin access required');
        router.push('/dashboard/meetings');
      }
    } catch (e) {
      console.error('Failed to fetch users:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setProcessing(true);

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          email: newEmail || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setShowAddModal(false);
        setNewUsername('');
        setNewPassword('');
        setNewEmail('');
        setConfirmPassword('');
        void fetchUsers();
        alert('User created successfully');
      } else {
        setError(data.message || 'Failed to create user');
      }
    } catch (e) {
      setError('An error occurred');
      console.error(e);
    } finally {
      setProcessing(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (resetPassword !== resetConfirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (resetPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!selectedUser) return;

    setProcessing(true);

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: resetPassword }),
      });

      const data = await response.json();

      if (data.success) {
        setShowResetModal(false);
        setResetPassword('');
        setResetConfirmPassword('');
        setSelectedUser(null);
        alert('Password reset successfully');
      } else {
        setError(data.message || 'Failed to reset password');
      }
    } catch (e) {
      setError('An error occurred');
      console.error(e);
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setProcessing(true);

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setShowDeleteModal(false);
        setSelectedUser(null);
        void fetchUsers();
        alert('User deleted successfully');
      } else {
        alert(data.message || 'Failed to delete user');
      }
    } catch (e) {
      alert('An error occurred');
      console.error(e);
    } finally {
      setProcessing(false);
    }
  };

  const openResetModal = (user: User) => {
    setSelectedUser(user);
    setShowResetModal(true);
    setError('');
  };

  const openDeleteModal = (user: User) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const viewUserDetails = (userId: string) => {
    router.push(`/dashboard/admin/users/${userId}`);
  };

  const toggleUserStatus = async (user: User) => {
    const action = user.isActive ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} ${user.username}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive }),
      });

      const data = await response.json();

      if (data.success) {
        void fetchUsers();
        alert(data.message);
      } else {
        alert(data.message || `Failed to ${action} user`);
      }
    } catch (e) {
      alert('An error occurred');
      console.error(e);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" aria-label="Loading" />
      </div>
    );
  }

  const modalWrap = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm';
  const modalBox = 'w-full max-w-md rounded-2xl bg-primary p-6 shadow-xl';

  return (
    <div>
      <PageHeader
        title="User management"
        subtitle="Manage all registered users"
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                setShowAddModal(true);
                setError('');
              }}
            >
              <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              Add user
            </Button>
            <Button type="button" variant="secondary" onClick={() => router.push('/dashboard/admin')}>
              Back to dashboard
            </Button>
          </div>
        }
      />

      <div className="relative mb-6">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tertiary"
          strokeWidth={1.75}
          aria-hidden
        />
        <input
          type="search"
          placeholder="Search users…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-10 w-full rounded-lg border border-slate-200 bg-primary py-2 pl-10 pr-3 text-sm text-primary outline-none placeholder:text-tertiary focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
        />
      </div>

      {filteredUsers.length === 0 ? (
        <EmptyState icon={Search} title="No users found" description="Try a different search term." />
      ) : (
        <DataTableCard>
          <DataTable>
            <DataTableHead>
              <DataTableHeaderCell>User</DataTableHeaderCell>
              <DataTableHeaderCell>Email</DataTableHeaderCell>
              <DataTableHeaderCell>Role</DataTableHeaderCell>
              <DataTableHeaderCell>Status</DataTableHeaderCell>
              <DataTableHeaderCell>Chats</DataTableHeaderCell>
              <DataTableHeaderCell>KBs</DataTableHeaderCell>
              <DataTableHeaderCell>Last login</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Actions</DataTableHeaderCell>
            </DataTableHead>
            <DataTableBody>
              {filteredUsers.map((user) => (
                <DataTableRow key={user.id}>
                  <DataTableCell>
                    <span className="font-medium text-primary">{user.username}</span>
                  </DataTableCell>
                  <DataTableCell className="max-w-[180px] truncate">{user.email}</DataTableCell>
                  <DataTableCell>
                    {user.role === 'admin' ? (
                      <Badge variant="admin">admin</Badge>
                    ) : (
                      <Badge variant="neutral">{user.role}</Badge>
                    )}
                  </DataTableCell>
                  <DataTableCell>
                    {user.isActive ? <Badge variant="active">Active</Badge> : <Badge variant="deactivated">Inactive</Badge>}
                  </DataTableCell>
                  <DataTableCell>{user.conversationCount}</DataTableCell>
                  <DataTableCell>{user.knowledgeBaseCount}</DataTableCell>
                  <DataTableCell className="whitespace-nowrap text-xs text-tertiary">
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                  </DataTableCell>
                  <DataTableCell align="right">
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-8 px-3 text-xs"
                        onClick={() => viewUserDetails(user.id)}
                      >
                        Details
                      </Button>
                      <Button type="button" variant="ghost" className="h-8 px-3 text-xs text-red-600 hover:bg-red-50" onClick={() => openResetModal(user)}>
                        Reset
                      </Button>
                      {user.role !== 'admin' ? (
                        <>
                          <Button
                            type="button"
                            variant="secondary"
                            className="h-8 px-3 text-xs"
                            onClick={() => void toggleUserStatus(user)}
                          >
                            {user.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-8 px-3 text-xs text-red-600 hover:bg-red-50"
                            onClick={() => openDeleteModal(user)}
                          >
                            Delete
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        </DataTableCard>
      )}

      <p className="mt-4 text-center text-xs text-tertiary">
        Total: {filteredUsers.length}
        {searchTerm ? ` (filtered from ${users.length})` : ''}
      </p>

      {showAddModal ? (
        <div className={modalWrap}>
          <div className={modalBox}>
            <h2 className="text-lg font-semibold text-primary">Add user</h2>
            <form onSubmit={handleAddUser} className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-slate-600">Username *</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-slate-600">Email (optional)</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-slate-600">Password * (min 6)</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-slate-600">Confirm password *</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                  required
                />
              </div>
              {error ? (
                <div className="rounded-lg border border-slate-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
              ) : null}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  disabled={processing}
                  onClick={() => {
                    setShowAddModal(false);
                    setNewUsername('');
                    setNewPassword('');
                    setNewEmail('');
                    setConfirmPassword('');
                    setError('');
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" className="flex-1" disabled={processing}>
                  {processing ? 'Creating…' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showResetModal && selectedUser ? (
        <div className={modalWrap}>
          <div className={modalBox}>
            <h2 className="text-lg font-semibold text-primary">Reset password</h2>
            <p className="mt-1 text-sm text-secondary">
              User: <span className="font-medium text-primary">{selectedUser.username}</span>
            </p>
            <form onSubmit={handleResetPassword} className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-slate-600">New password *</label>
                <input
                  type="password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-slate-600">Confirm *</label>
                <input
                  type="password"
                  value={resetConfirmPassword}
                  onChange={(e) => setResetConfirmPassword(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                  required
                />
              </div>
              {error ? (
                <div className="rounded-lg border border-slate-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
              ) : null}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  disabled={processing}
                  onClick={() => {
                    setShowResetModal(false);
                    setSelectedUser(null);
                    setResetPassword('');
                    setResetConfirmPassword('');
                    setError('');
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="danger" className="flex-1" disabled={processing}>
                  {processing ? 'Resetting…' : 'Reset password'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showDeleteModal && selectedUser ? (
        <div className={modalWrap}>
          <div className={modalBox}>
            <h2 className="text-lg font-semibold text-red-600">Delete user</h2>
            <p className="mt-2 text-sm text-secondary">
              Permanently delete <span className="font-medium text-primary">{selectedUser.username}</span>?
            </p>
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-secondary">
              This removes {selectedUser.conversationCount} conversations, {selectedUser.knowledgeBaseCount}{' '}
              knowledge bases, and all messages.
            </div>
            <div className="mt-6 flex gap-3">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                disabled={processing}
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedUser(null);
                }}
              >
                Cancel
              </Button>
              <Button type="button" variant="danger" className="flex-1" disabled={processing} onClick={() => void handleDeleteUser()}>
                {processing ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
