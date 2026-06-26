import { useState, useEffect } from 'react';
import {
  CheckCircle, XCircle, Clock, RefreshCw, Shield, AlertCircle,
  Bot, Users, Eye, Edit3, Trash2, X, Save, ChevronDown,
} from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import adminService from '../services/adminService';
import { useAutoT } from '../i18n/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

const STRINGS = {
  page_title:        'Admin Panel',
  page_subtitle:     'Manage users, roles and system settings',
  stat_pending:      'Pending Approval',
  stat_total:        'Total Users',
  stat_active:       'Active Accounts',
  stat_action:       'Action Required',
  yes:               'Yes',
  no:                'No',
  ai_title:          'AI Scoring Provider',
  ai_subtitle:       'Active provider used to score submitted tasks',
  save_provider:     'Save Provider',
  saving:            'Saving…',
  tab_pending:       'Pending Requests',
  tab_users:         'All Users',
  pending_header:    'Pending Registration Requests',
  refresh:           'Refresh',
  loading_pending:   'Loading pending users...',
  all_caught_up:     'All caught up',
  no_pending:        'No pending registration requests at this time.',
  processing:        'Processing...',
  approve:           'Approve',
  reject:            'Reject',
  registered:        'Registered',
  search_ph:         'Search by name, email or role…',
  loading_users:     'Loading users...',
  no_users:          'No users found',
  try_different:     'Try a different search term.',
  close:             'Close',
  edit_user:         'Edit User',
  full_name:         'Full Name',
  role_label:        'Role',
  cancel:            'Cancel',
  save_changes:      'Save Changes',
  detail_role:       'Role',
  detail_status:     'Account Status',
  detail_email:      'Email',
  detail_verified:   'Email Verified',
  detail_registered: 'Registered',
  detail_pw:         'Password Strength',
  rl_developer:      'IT Developer',
  rl_product:        'Product / Mobile Team',
  rl_manager:        'IT Manager',
  rl_admin:          'Administrator',
  st_active:         'Active',
  st_pending:        'Pending',
  st_rejected:       'Rejected',
  st_inactive:       'Inactive',
};

const AI_PROVIDERS = [
  { value: 'groq',    label: 'Groq',    description: 'llama-3.3-70b-versatile' },
  { value: 'gemini',  label: 'Gemini',  description: 'gemini-2.0-flash' },
  { value: 'mistral', label: 'Mistral', description: 'mistral-small-latest' },
  { value: 'ollama',  label: 'Ollama',  description: 'llama3.2 (local)' },
];

const ROLE_COLORS = {
  DEVELOPER:    { bg: '#EFF6FF', color: '#2563EB' },
  PRODUCT_TEAM: { bg: '#FFF7ED', color: '#D97706' },
  IT_MANAGER:   { bg: '#F5F3FF', color: '#7C3AED' },
  ADMIN:        { bg: '#FEF2F2', color: '#DC2626' },
};

const STATUS_STYLE = {
  ACTIVE:           { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0' },
  APPROVED:         { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0' },
  ENABLED:          { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0' },
  PENDING_APPROVAL: { bg: '#FFF7ED', color: '#D97706', border: '#FDE68A' },
  PENDING:          { bg: '#FFF7ED', color: '#D97706', border: '#FDE68A' },
  REJECTED:         { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
  INACTIVE:         { bg: '#F9FAFB', color: '#6B7280', border: '#E5E7EB' },
};

function getRoleLabel(role, tx) {
  return { DEVELOPER: tx.rl_developer, PRODUCT_TEAM: tx.rl_product, IT_MANAGER: tx.rl_manager, ADMIN: tx.rl_admin }[role] || role;
}

function getStatusLabel(status, tx) {
  const active  = ['ACTIVE', 'APPROVED', 'ENABLED'];
  const pending = ['PENDING_APPROVAL', 'PENDING'];
  if (active.includes(status))   return tx.st_active;
  if (pending.includes(status))  return tx.st_pending;
  if (status === 'REJECTED')     return tx.st_rejected;
  if (status === 'INACTIVE')     return tx.st_inactive;
  return status;
}

function resolveStatus(user) {
  const raw = user.status || user.accountStatus;
  if (raw) return raw;
  if (user.approved === true || user.enabled === true) return 'ACTIVE';
  if (user.approved === false) return 'REJECTED';
  return null;
}

const ALL_ROLES = ['DEVELOPER', 'PRODUCT_TEAM', 'IT_MANAGER', 'ADMIN'];

function Avatar({ user, size = 44, tx }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      backgroundColor: '#1A1A2E', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {user.photoPath ? (
        <img
          src={`http://localhost:8080/${user.photoPath}`}
          alt={user.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <span style={{ color: '#CC2027', fontSize: size * 0.38, fontWeight: '700' }}>
          {user.name?.charAt(0)?.toUpperCase()}
        </span>
      )}
    </div>
  );
}

function RoleBadge({ role, tx }) {
  const s = ROLE_COLORS[role] || ROLE_COLORS.DEVELOPER;
  return (
    <span style={{ padding: '0.15rem 0.6rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: '600', backgroundColor: s.bg, color: s.color }}>
      {getRoleLabel(role, tx)}
    </span>
  );
}

function StatusBadge({ user, tx }) {
  const status = resolveStatus(user);
  const s = STATUS_STYLE[status];
  if (!s) return null;
  return (
    <span style={{ padding: '0.15rem 0.6rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: '600', backgroundColor: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {getStatusLabel(status, tx)}
    </span>
  );
}

/* ─── View Details Modal ─── */
function UserDetailModal({ user, onClose, tx }) {
  const { theme } = useTheme();
  const formatDate = (d) => d
    ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '1rem',
    }}>
      <div style={{
        backgroundColor: theme.cardBg, borderRadius: '1rem',
        width: '100%', maxWidth: '480px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        overflow: 'hidden',
      }}>
        {/* Header — intentionally dark navy */}
        <div style={{
          backgroundColor: '#1A1A2E', padding: '1.5rem',
          display: 'flex', alignItems: 'center', gap: '1rem',
        }}>
          <Avatar user={user} size={56} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <p style={{ fontSize: '1rem', fontWeight: '700', color: 'white' }}>{user.name}</p>
              {user.emailVerified && (
                <span style={{
                  fontSize: '0.65rem', fontWeight: '600', color: '#3B82F6',
                  backgroundColor: '#1E3A5F', padding: '0.1rem 0.4rem', borderRadius: '4px',
                }}>
                  ✓ Verified
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.82rem', color: '#9CA3AF' }}>{user.email}</p>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', flexShrink: 0,
          }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {[
            { label: tx.detail_role,       value: <RoleBadge role={user.role} tx={tx} /> },
            { label: tx.detail_status,     value: <StatusBadge user={user} tx={tx} /> },
            { label: tx.detail_email,      value: user.email },
            { label: tx.detail_verified,   value: user.emailVerified ? '✓ Yes' : '✗ No' },
            { label: tx.detail_registered, value: formatDate(user.createdAt) },
            { label: tx.detail_pw,         value: user.passwordStrength || '—' },
          ].map(({ label, value }) => (
            <div key={label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              paddingBottom: '0.75rem', borderBottom: `1px solid ${theme.border}`,
            }}>
              <span style={{ fontSize: '0.8rem', color: theme.textMuted, fontWeight: '500' }}>{label}</span>
              <span style={{ fontSize: '0.82rem', color: theme.text, fontWeight: '600' }}>{value}</span>
            </div>
          ))}
        </div>

        <div style={{ padding: '1rem 1.5rem', borderTop: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '0.5rem 1.25rem', backgroundColor: theme.tagBg, border: 'none', borderRadius: '0.5rem', fontSize: '0.82rem', fontWeight: '600', color: theme.textMed, cursor: 'pointer' }}>
            {tx.close}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Edit User Modal ─── */
function EditUserModal({ user, onClose, onSave, tx }) {
  const { theme } = useTheme();
  const [name, setName] = useState(user.name || '');
  const [role, setRole] = useState(user.role || 'DEVELOPER');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) { setError('Name cannot be empty.'); return; }
    setIsSaving(true);
    setError('');
    try {
      await onSave(user.id, { name: name.trim(), role });
    } catch {
      setError('Failed to save changes.');
      setIsSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '1rem',
    }}>
      <div style={{
        backgroundColor: theme.cardBg, borderRadius: '1rem',
        width: '100%', maxWidth: '440px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: `1px solid ${theme.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Avatar user={user} size={36} />
            <div>
              <p style={{ fontSize: '0.9rem', fontWeight: '700', color: theme.text }}>{tx.edit_user}</p>
              <p style={{ fontSize: '0.75rem', color: theme.textMuted }}>{user.email}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textSub }}>
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>

          {/* Name */}
          <div>
            <label style={{
              display: 'block', fontSize: '0.75rem', fontWeight: '600',
              color: theme.textMed, marginBottom: '0.4rem',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              {tx.full_name}
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              style={{
                width: '100%', padding: '0.65rem 0.875rem',
                border: `1.5px solid ${theme.borderMed}`, borderRadius: '0.5rem',
                fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box',
                backgroundColor: theme.inputBg, color: theme.text,
              }}
              onFocus={e => e.target.style.borderColor = '#CC2027'}
              onBlur={e => e.target.style.borderColor = theme.borderMed}
            />
          </div>

          {/* Role */}
          <div>
            <label style={{
              display: 'block', fontSize: '0.75rem', fontWeight: '600',
              color: theme.textMed, marginBottom: '0.5rem',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              {tx.role_label}
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {ALL_ROLES.map(r => {
                const s = ROLE_COLORS[r];
                const selected = role === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.6rem 0.875rem', borderRadius: '0.5rem', cursor: 'pointer',
                      border: `1.5px solid ${selected ? s.color : theme.borderMed}`,
                      backgroundColor: selected ? s.bg : theme.cardBg,
                      transition: 'all 0.12s',
                    }}
                  >
                    <span style={{ fontSize: '0.82rem', fontWeight: selected ? '700' : '500', color: selected ? s.color : theme.textMed }}>
                      {getRoleLabel(r, tx)}
                    </span>
                    {selected && (
                      <CheckCircle size={15} color={s.color} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <p style={{ fontSize: '0.8rem', color: '#DC2626' }}>{error}</p>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem', borderTop: `1px solid ${theme.border}`,
          display: 'flex', justifyContent: 'flex-end', gap: '0.5rem',
        }}>
          <button onClick={onClose} style={{ padding: '0.5rem 1.25rem', backgroundColor: theme.cardBg, border: `1.5px solid ${theme.borderMed}`, borderRadius: '0.5rem', fontSize: '0.82rem', fontWeight: '600', color: theme.textSub, cursor: 'pointer' }}>
            {tx.cancel}
          </button>
          <button onClick={handleSave} disabled={isSaving} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1.25rem', backgroundColor: isSaving ? '#9CA3AF' : '#CC2027', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '0.82rem', fontWeight: '600', cursor: isSaving ? 'not-allowed' : 'pointer' }}>
            <Save size={14} />
            {isSaving ? tx.saving : tx.save_changes}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Admin Page ─── */
function Admin() {
  const tx = useAutoT(STRINGS);
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('pending');

  // Pending users
  const [pendingUsers, setPendingUsers] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [pendingError, setPendingError] = useState('');
  const [processingId, setProcessingId] = useState(null);

  // All users
  const [allUsers, setAllUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [viewUser, setViewUser] = useState(null);
  const [editUser, setEditUser] = useState(null);

  // Notification
  const [notification, setNotification] = useState(null);

  // AI provider
  const [aiProvider, setAiProvider] = useState('');
  const [aiProviderSaving, setAiProviderSaving] = useState(false);
  const [aiProviderError, setAiProviderError] = useState('');

  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const formatDate = (d) => d
    ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  /* ── Loaders ── */
  const loadPendingUsers = async () => {
    setPendingLoading(true);
    setPendingError('');
    try {
      const data = await adminService.getPendingUsers();
      setPendingUsers(data);
    } catch {
      setPendingError('Failed to load pending users.');
    } finally {
      setPendingLoading(false);
    }
  };

  const loadAllUsers = async () => {
    setUsersLoading(true);
    setUsersError('');
    try {
      const data = await adminService.getAllUsers();
      setAllUsers(data);
    } catch {
      setUsersError('Failed to load users.');
    } finally {
      setUsersLoading(false);
    }
  };

  const loadAiProvider = async () => {
    try {
      const data = await adminService.getAiProvider();
      setAiProvider(data.provider || '');
    } catch {
      setAiProviderError('Could not load AI provider setting.');
    }
  };

  useEffect(() => {
    loadPendingUsers();
    loadAiProvider();
  }, []);

  useEffect(() => {
    if (activeTab === 'users' && allUsers.length === 0) loadAllUsers();
  }, [activeTab]);

  /* ── Pending actions ── */
  const handleApprove = async (userId, userName) => {
    setProcessingId(userId);
    try {
      await adminService.approveUser(userId);
      setPendingUsers(prev => prev.filter(u => u.id !== userId));
      showNotification(`${userName} has been approved.`, 'success');
    } catch {
      showNotification('Failed to approve user.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (userId, userName) => {
    if (!window.confirm(`Reject ${userName}'s registration request?`)) return;
    setProcessingId(userId);
    try {
      await adminService.rejectUser(userId);
      setPendingUsers(prev => prev.filter(u => u.id !== userId));
      showNotification(`${userName}'s request has been rejected.`, 'error');
    } catch {
      showNotification('Failed to reject user.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  /* ── All users actions ── */
  const handleSaveUser = async (userId, data) => {
    await adminService.updateUser(userId, data);
    setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, ...data } : u));
    setEditUser(null);
    showNotification('User updated successfully.', 'success');
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Permanently delete ${user.name}? This cannot be undone.`)) return;
    try {
      await adminService.deleteUser(user.id);
      setAllUsers(prev => prev.filter(u => u.id !== user.id));
      showNotification(`${user.name} has been deleted.`, 'error');
    } catch {
      showNotification('Failed to delete user.', 'error');
    }
  };

  /* ── AI provider ── */
  const handleSaveAiProvider = async () => {
    if (!aiProvider) return;
    setAiProviderSaving(true);
    setAiProviderError('');
    try {
      await adminService.setAiProvider(aiProvider);
      showNotification(`AI provider switched to ${aiProvider}.`, 'success');
    } catch {
      setAiProviderError('Failed to update AI provider.');
    } finally {
      setAiProviderSaving(false);
    }
  };

  /* ── Filtered users ── */
  const filteredUsers = allUsers.filter(u => {
    const q = searchQuery.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      getRoleLabel(u.role, tx)?.toLowerCase().includes(q)
    );
  });

  const totalActive = allUsers.filter(u => u.status === 'ACTIVE').length;

  /* ─────────────────────────────── RENDER ─────────────────────────────── */
  return (
    <PageWrapper title={tx.page_title} subtitle={tx.page_subtitle}>

      {/* Toast notification */}
      {notification && (
        <div style={{
          position: 'fixed', top: '1.5rem', right: '1.5rem',
          zIndex: 2000, maxWidth: '360px',
          padding: '1rem 1.25rem',
          backgroundColor: notification.type === 'success' ? '#F0FDF4' : '#FEF2F2',
          border: `1px solid ${notification.type === 'success' ? '#BBF7D0' : '#FECACA'}`,
          borderRadius: '0.75rem',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
        }}>
          {notification.type === 'success'
            ? <CheckCircle size={18} color="#16A34A" style={{ flexShrink: 0 }} />
            : <AlertCircle size={18} color="#DC2626" style={{ flexShrink: 0 }} />
          }
          <p style={{ fontSize: '0.85rem', fontWeight: '500', color: notification.type === 'success' ? '#16A34A' : '#DC2626' }}>
            {notification.message}
          </p>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: tx.stat_pending, value: pendingUsers.length, icon: <Clock size={20} color="#D97706" />, bg: '#FFF7ED', border: '#FDE68A' },
          { label: tx.stat_total,   value: allUsers.length || '—', icon: <Users size={20} color="#2563EB" />, bg: '#EFF6FF', border: '#BFDBFE' },
          { label: tx.stat_active,  value: totalActive || '—', icon: <CheckCircle size={20} color="#16A34A" />, bg: '#F0FDF4', border: '#BBF7D0' },
          {
            label: tx.stat_action,
            value: pendingUsers.length > 0 ? tx.yes : tx.no,
            icon: <AlertCircle size={20} color={pendingUsers.length > 0 ? '#DC2626' : '#16A34A'} />,
            bg: pendingUsers.length > 0 ? '#FEF2F2' : '#F0FDF4',
            border: pendingUsers.length > 0 ? '#FECACA' : '#BBF7D0',
          },
        ].map(stat => (
          <div key={stat.label} style={{
            backgroundColor: theme.cardBg, borderRadius: '0.75rem',
            padding: '1.25rem', border: `1px solid ${theme.border}`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex', alignItems: 'center', gap: '1rem',
          }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '0.5rem',
              backgroundColor: stat.bg, border: `1px solid ${stat.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              {stat.icon}
            </div>
            <div>
              <p style={{ fontSize: '1.5rem', fontWeight: '700', color: theme.text }}>{stat.value}</p>
              <p style={{ fontSize: '0.78rem', color: theme.textMuted }}>{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* AI Provider selector */}
      <div style={{
        backgroundColor: theme.cardBg, borderRadius: '0.75rem',
        border: `1px solid ${theme.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        padding: '1.25rem 1.5rem', marginBottom: '1.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '0.4rem',
            backgroundColor: '#F0F4FF', border: '1px solid #C7D2FE',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Bot size={16} color="#4F6EF7" />
          </div>
          <div>
            <p style={{ fontSize: '0.9rem', fontWeight: '700', color: theme.text }}>{tx.ai_title}</p>
            <p style={{ fontSize: '0.75rem', color: theme.textMuted }}>{tx.ai_subtitle}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.875rem' }}>
          {AI_PROVIDERS.map(p => (
            <button key={p.value} onClick={() => setAiProvider(p.value)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
              padding: '0.65rem 1rem', borderRadius: '0.5rem', cursor: 'pointer',
              border: `2px solid ${aiProvider === p.value ? '#4F6EF7' : theme.borderMed}`,
              backgroundColor: aiProvider === p.value ? '#F0F4FF' : theme.cardBg,
              minWidth: '110px', transition: 'all 0.15s',
            }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '700', color: aiProvider === p.value ? '#4F6EF7' : theme.textMed }}>
                {p.label}
              </span>
              <span style={{ fontSize: '0.68rem', color: theme.textMuted, marginTop: '0.1rem' }}>{p.description}</span>
            </button>
          ))}
        </div>
        {aiProviderError && <p style={{ fontSize: '0.8rem', color: '#DC2626', marginBottom: '0.75rem' }}>{aiProviderError}</p>}
        <button onClick={handleSaveAiProvider} disabled={aiProviderSaving || !aiProvider} style={{
          padding: '0.5rem 1.25rem',
          backgroundColor: aiProviderSaving || !aiProvider ? '#9CA3AF' : '#4F6EF7',
          color: 'white', border: 'none', borderRadius: '0.5rem',
          fontSize: '0.82rem', fontWeight: '600',
          cursor: aiProviderSaving || !aiProvider ? 'not-allowed' : 'pointer',
        }}>
          {aiProviderSaving ? tx.saving : tx.save_provider}
        </button>
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: '0.25rem',
        backgroundColor: theme.hoverBg, borderRadius: '0.625rem',
        padding: '0.25rem', marginBottom: '1.25rem',
        width: 'fit-content',
      }}>
        {[
          { key: 'pending', label: tx.tab_pending, count: pendingUsers.length },
          { key: 'users',   label: tx.tab_users,   count: allUsers.length || null },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.5rem 1.1rem', borderRadius: '0.4rem', border: 'none',
            backgroundColor: activeTab === tab.key ? theme.cardBg : 'transparent',
            color: activeTab === tab.key ? theme.text : theme.textSub,
            fontWeight: activeTab === tab.key ? '700' : '500',
            fontSize: '0.82rem', cursor: 'pointer',
            boxShadow: activeTab === tab.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.15s',
          }}>
            {tab.label}
            {tab.count != null && tab.count > 0 && (
              <span style={{
                fontSize: '0.68rem', fontWeight: '700',
                backgroundColor: activeTab === tab.key ? '#FEF2F2' : theme.tagBg,
                color: activeTab === tab.key ? '#CC2027' : theme.textSub,
                padding: '0.1rem 0.45rem', borderRadius: '9999px',
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─── TAB: PENDING ─── */}
      {activeTab === 'pending' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: theme.text }}>{tx.pending_header}</h3>
            <button onClick={loadPendingUsers} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.85rem', backgroundColor: theme.cardBg, border: `1.5px solid ${theme.borderMed}`, borderRadius: '0.5rem', fontSize: '0.78rem', color: theme.textSub, cursor: 'pointer' }}>
              <RefreshCw size={13} />{tx.refresh}
            </button>
          </div>

          {pendingError && (
            <div style={{ padding: '1rem', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '0.75rem', marginBottom: '1rem' }}>
              <p style={{ color: '#DC2626', fontSize: '0.875rem' }}>{pendingError}</p>
            </div>
          )}

          {pendingLoading && (
            <div style={{ textAlign: 'center', padding: '3rem', color: theme.textMuted }}>
              <p>{tx.loading_pending}</p>
            </div>
          )}

          {!pendingLoading && pendingUsers.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: theme.cardBg, borderRadius: '0.75rem', border: `1px solid ${theme.border}` }}>
              <CheckCircle size={32} color="#16A34A" style={{ marginBottom: '0.75rem' }} />
              <p style={{ fontWeight: '600', color: theme.text, marginBottom: '0.25rem' }}>{tx.all_caught_up}</p>
              <p style={{ color: theme.textMuted, fontSize: '0.875rem' }}>{tx.no_pending}</p>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {pendingUsers.map(user => {
              const isProcessing = processingId === user.id;
              return (
                <div key={user.id} style={{
                  backgroundColor: theme.cardBg, borderRadius: '0.75rem',
                  border: `1px solid ${theme.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  padding: '1.25rem 1.5rem',
                  display: 'flex', alignItems: 'center', gap: '1.25rem',
                }}>
                  <Avatar user={user} size={48} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                      <p style={{ fontSize: '0.9rem', fontWeight: '600', color: theme.text }}>{user.name}</p>
                      {user.emailVerified && <span style={{ color: '#3B82F6', fontSize: '0.75rem' }} title="Email verified">✓</span>}
                    </div>
                    <p style={{ fontSize: '0.8rem', color: theme.textSub, marginBottom: '0.3rem' }}>{user.email}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <RoleBadge role={user.role} tx={tx} />
                      <span style={{ fontSize: '0.72rem', color: theme.textMuted }}>{tx.registered} {formatDate(user.createdAt)}</span>
                    </div>
                  </div>

                  <div style={{ padding: '0.25rem 0.75rem', backgroundColor: '#FFF7ED', border: '1px solid #FDE68A', borderRadius: '9999px', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: '600', color: '#D97706' }}>⏳ Pending</span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    <button onClick={() => setViewUser(user)} style={{
                      display: 'flex', alignItems: 'center', gap: '0.35rem',
                      padding: '0.5rem 0.85rem', backgroundColor: theme.cardBg,
                      border: `1.5px solid ${theme.borderMed}`, borderRadius: '0.5rem',
                      fontSize: '0.8rem', color: theme.textSub, cursor: 'pointer',
                    }}>
                      <Eye size={14} />
                    </button>
                    <button onClick={() => handleApprove(user.id, user.name)} disabled={isProcessing} style={{
                      display: 'flex', alignItems: 'center', gap: '0.35rem',
                      padding: '0.5rem 1rem',
                      backgroundColor: isProcessing ? '#9CA3AF' : '#16A34A',
                      color: 'white', border: 'none', borderRadius: '0.5rem',
                      fontSize: '0.8rem', fontWeight: '600', cursor: isProcessing ? 'not-allowed' : 'pointer',
                    }}>
                      <CheckCircle size={14} />
                      {isProcessing ? tx.processing : tx.approve}
                    </button>
                    <button onClick={() => handleReject(user.id, user.name)} disabled={isProcessing} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 1rem', backgroundColor: theme.cardBg, color: '#DC2626', border: '1.5px solid #FECACA', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: '600', cursor: isProcessing ? 'not-allowed' : 'pointer' }}>
                      <XCircle size={14} />{tx.reject}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ─── TAB: ALL USERS ─── */}
      {activeTab === 'users' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '0.75rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder={tx.search_ph}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                flex: 1, minWidth: '220px', maxWidth: '360px',
                padding: '0.5rem 0.875rem', border: `1.5px solid ${theme.borderMed}`,
                borderRadius: '0.5rem', fontSize: '0.82rem',
                outline: 'none', backgroundColor: theme.cardBg, color: theme.text,
              }}
              onFocus={e => e.target.style.borderColor = '#CC2027'}
              onBlur={e => e.target.style.borderColor = theme.borderMed}
            />
            <button onClick={loadAllUsers} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.85rem', backgroundColor: theme.cardBg, border: `1.5px solid ${theme.borderMed}`, borderRadius: '0.5rem', fontSize: '0.78rem', color: theme.textSub, cursor: 'pointer' }}>
              <RefreshCw size={13} />{tx.refresh}
            </button>
          </div>

          {usersError && (
            <div style={{ padding: '1rem', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '0.75rem', marginBottom: '1rem' }}>
              <p style={{ color: '#DC2626', fontSize: '0.875rem' }}>{usersError}</p>
            </div>
          )}

          {usersLoading && (
            <div style={{ textAlign: 'center', padding: '3rem', color: theme.textMuted }}>
              <p>{tx.loading_users}</p>
            </div>
          )}

          {!usersLoading && filteredUsers.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: theme.cardBg, borderRadius: '0.75rem', border: `1px solid ${theme.border}` }}>
              <Users size={32} color={theme.borderMed} style={{ marginBottom: '0.75rem' }} />
              <p style={{ fontWeight: '600', color: theme.textMed, marginBottom: '0.25rem' }}>{tx.no_users}</p>
              <p style={{ color: theme.textMuted, fontSize: '0.875rem' }}>{tx.try_different}</p>
            </div>
          )}

          <div style={{ backgroundColor: theme.cardBg, borderRadius: '0.75rem', border: `1px solid ${theme.border}`, overflow: 'hidden' }}>
            {filteredUsers.map((user, i) => (
              <div key={user.id} style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                padding: '1rem 1.25rem',
                borderBottom: i < filteredUsers.length - 1 ? `1px solid ${theme.border}` : 'none',
              }}>
                <Avatar user={user} size={40} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: '600', color: theme.text }}>{user.name}</p>
                    {user.emailVerified && <span style={{ color: '#3B82F6', fontSize: '0.7rem' }} title="Email verified">✓</span>}
                  </div>
                  <p style={{ fontSize: '0.78rem', color: theme.textSub }}>{user.email}</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                  <RoleBadge role={user.role} tx={tx} />
                  <StatusBadge user={user} tx={tx} />
                  <span style={{ fontSize: '0.72rem', color: theme.textMuted, minWidth: '80px', textAlign: 'right' }}>
                    {formatDate(user.createdAt)}
                  </span>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                  <button
                    onClick={() => setViewUser(user)}
                    title="View details"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: '32px', height: '32px', borderRadius: '0.4rem',
                      border: `1.5px solid ${theme.borderMed}`, backgroundColor: theme.cardBg,
                      color: theme.textSub, cursor: 'pointer',
                    }}
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    onClick={() => setEditUser(user)}
                    title="Edit user"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: '32px', height: '32px', borderRadius: '0.4rem',
                      border: '1.5px solid #BFDBFE', backgroundColor: '#EFF6FF',
                      color: '#2563EB', cursor: 'pointer',
                    }}
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteUser(user)}
                    title="Delete user"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: '32px', height: '32px', borderRadius: '0.4rem',
                      border: '1.5px solid #FECACA', backgroundColor: '#FEF2F2',
                      color: '#DC2626', cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modals */}
      {viewUser && <UserDetailModal user={viewUser} onClose={() => setViewUser(null)} tx={tx} />}
      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSave={handleSaveUser}
          tx={tx}
        />
      )}
    </PageWrapper>
  );
}

export default Admin;
