import { useState, useEffect, useRef } from 'react';
import { User, Bell, Shield, Brain, CheckCircle, Eye, EyeOff, Camera, X, Lock, GitBranch, GitFork, Loader2, AlertCircle, CheckCircle2, ExternalLink, Link2 } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import useAuthStore from '../store/authStore';
import settingsService from '../services/settingsService';
import adminService from '../services/adminService';
import gitService from '../services/gitService';
import jiraService from '../services/jiraService';
import { useAutoT } from '../i18n/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

const STRINGS = {
  page_title:      'Settings',
  page_subtitle:   'Manage your account and application preferences',
  sec_profile:     'My Profile',
  sec_permissions: 'Roles & Permissions',
  sec_ai:          'AI Scoring Config',
  sec_notif:       'Notifications',
  sec_git:         'Connected Accounts',
  profile_title:   'My Profile',
  profile_sub:     'Update your personal information, photo and password',
  perm_title:      'Roles & Permissions',
  notif_title:     'Notification Preferences',
  notif_sub:       'Choose which events trigger notifications',
  git_title:       'Connected Accounts',
  ai_title:        'AI Scoring Configuration',
  ai_sub:          'Overview of the multi-provider AI scoring engine. Switch providers from the Admin panel.',
  save_changes:    'Save changes',
  save_prefs:      'Save preferences',
  cancel:          'Cancel',
  full_name:       'Full name',
  email_addr:      'Email address',
  new_password:    'New password',
  confirm_password:'Confirm new password',
  pw_mismatch:     'Passwords do not match',
  change_pw:       'Change password',
  pw_hint:         '(leave blank to keep current)',
  verified:        'Verified',
  new_photo:       '✓ New photo selected — save to apply',
  rl_developer:    'IT Developer',
  rl_product:      'Product / Mobile Team',
  rl_manager:      'IT Manager',
  rl_admin:        'Administrator',
  manage_roles:    'Manage User Roles',
  manage_roles_sub:'Change the role of any user. A password confirmation is required.',
  save:            'Save',
  loading_users:   'Loading users…',
  avail_providers: 'Available providers',
  kano_mult:       'Kano multipliers',
  moscow_mult:     'MoSCoW multipliers',
  admin_only_hint: 'To switch the active AI provider, go to the Admin Panel → AI Scoring Provider. Only administrators can change this setting.',
  refresh:         'Refresh',
  disconnect:      'Disconnect',
  disconnecting:   'Disconnecting…',
  view_profile:    'View profile',
  connected:       'Connected',
  not_connected:   'Not connected — click to authorise via OAuth',
  connect:         'Connect',
  notif_scored:    'Task AI scored',
  notif_override:  'Score overridden',
  notif_approved:  'Task approved',
  notif_digest:    'Weekly backlog digest',
  notif_alert:     'MoSCoW ratio alert',
  notif_d_scored:  'Notify me when my submitted task is scored by the AI',
  notif_d_override:'Notify me when a score on my task is manually overridden',
  notif_d_approved:'Notify me when my task is approved and added to the backlog',
  notif_d_digest:  'Receive a weekly summary of top-priority tasks every Monday',
  notif_d_alert:   'Alert when the Must ratio deviates from the 60% target',
  delivery_method: 'Notification delivery method',
  in_app:          'In-app only',
  email_only:      'Email only',
  both:            'Both',
  manager_plus:    'Manager+',
  jira_domain:     'Jira domain',
  jira_email:      'Jira account email',
  api_token:       'API token',
  connect_jira:    'Connect Jira',
  connecting:      'Connecting…',
  verifying:       'Verifying…',
  confirm_save:    'Confirm & Save',
  confirm_pw:      'Confirm with password',
  current_pw:      'Current password',
};

/* ─── constants ─── */

const ALL_ROLES = ['DEVELOPER', 'PRODUCT_TEAM', 'IT_MANAGER', 'ADMIN'];

function getRoleLabel(role, tx) {
  return { DEVELOPER: tx.rl_developer, PRODUCT_TEAM: tx.rl_product, IT_MANAGER: tx.rl_manager, ADMIN: tx.rl_admin }[role] || role;
}

function getSections(tx) {
  return [
    { id: 'profile',       label: tx.sec_profile,     icon: User      },
    { id: 'permissions',   label: tx.sec_permissions,  icon: Shield    },
    { id: 'ai',            label: tx.sec_ai,           icon: Brain     },
    { id: 'notifications', label: tx.sec_notif,        icon: Bell      },
    { id: 'git',           label: tx.sec_git,          icon: GitBranch },
  ];
}

const ROLE_COLORS = {
  DEVELOPER:    { bg: '#EFF6FF', color: '#2563EB' },
  PRODUCT_TEAM: { bg: '#FFF7ED', color: '#D97706' },
  IT_MANAGER:   { bg: '#F5F3FF', color: '#7C3AED' },
  ADMIN:        { bg: '#FEF2F2', color: '#DC2626' },
};

const ROLE_PERMISSIONS = [
  { feature: 'Submit tasks',            developer: true,  productTeam: true,  manager: true,  admin: true  },
  { feature: 'View AI scores',          developer: true,  productTeam: true,  manager: true,  admin: true  },
  { feature: 'View full backlog',       developer: false, productTeam: false, manager: true,  admin: true  },
  { feature: 'Override AI scores',      developer: true,  productTeam: true,  manager: true,  admin: true  },
  { feature: 'Export reports',          developer: true,  productTeam: true,  manager: true,  admin: true  },
  { feature: 'View audit trail',        developer: false, productTeam: false, manager: true,  admin: true  },
  { feature: 'Approve registrations',   developer: false, productTeam: false, manager: false, admin: true  },
  { feature: 'Configure AI provider',   developer: false, productTeam: false, manager: false, admin: true  },
  { feature: 'Manage user roles',       developer: false, productTeam: false, manager: false, admin: true  },
  { feature: 'Delete tasks',            developer: false, productTeam: false, manager: false, admin: true  },
  { feature: 'MoSCoW ratio dashboard',  developer: false, productTeam: false, manager: true,  admin: true  },
];

const AI_PROVIDERS_INFO = [
  {
    value: 'groq', label: 'Groq', color: '#F97316',
    model: 'llama-3.3-70b-versatile',
    description: 'Fast inference. Best for real-time scoring.',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
  },
  {
    value: 'gemini', label: 'Gemini', color: '#4285F4',
    model: 'gemini-2.0-flash',
    description: 'Google DeepMind. Strong reasoning and context.',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta',
  },
  {
    value: 'mistral', label: 'Mistral', color: '#FF7000',
    model: 'mistral-small-latest',
    description: 'Efficient European model. Good multilingual support.',
    endpoint: 'https://api.mistral.ai/v1/chat/completions',
  },
  {
    value: 'ollama', label: 'Ollama', color: '#1A1A2E',
    model: 'llama3.2',
    description: 'Local inference. No external API calls.',
    endpoint: 'http://localhost:11434/api/chat',
  },
];

const KANO_MULTIPLIERS = [
  { label: 'Basic Need',   value: '×1.3', note: 'Users complain if missing' },
  { label: 'Performance',  value: '×1.0', note: 'Users appreciate it' },
  { label: 'Delighter',    value: '×0.8', note: 'Users surprised if present' },
  { label: 'Indifferent',  value: '×1.0', note: 'No satisfaction impact' },
  { label: 'Reverse',      value: '×1.0', note: 'Some users dislike it' },
];

const MOSCOW_MULTIPLIERS = [
  { label: 'Must',   value: '×1.5', color: '#DC2626' },
  { label: 'Should', value: '×1.2', color: '#D97706' },
  { label: 'Could',  value: '×1.0', color: '#2563EB' },
  { label: "Won't",  value: '×0.5', color: '#9CA3AF' },
];

/* ─── shared styles ─── */

const BASE_INPUT_STYLE = {
  width: '100%', padding: '0.65rem 1rem',
  borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none',
  boxSizing: 'border-box', fontFamily: 'Inter, sans-serif',
};

/* ─── Toggle ─── */
function Toggle({ checked, onChange }) {
  return (
    <div onClick={onChange} style={{
      width: '44px', height: '24px', borderRadius: '9999px',
      backgroundColor: checked ? '#CC2027' : '#E5E7EB',
      cursor: 'pointer', position: 'relative',
      transition: 'background-color 0.2s', flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', top: '3px',
        left: checked ? '23px' : '3px',
        width: '18px', height: '18px',
        borderRadius: '50%', backgroundColor: 'white',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        transition: 'left 0.2s',
      }} />
    </div>
  );
}

/* ─── Password Confirm Modal ─── */
function ConfirmPasswordModal({ message, onConfirm, onClose, tx }) {
  const { theme } = useTheme();
  const inputStyle = { ...BASE_INPUT_STYLE, border: `1.5px solid ${theme.borderMed}`, backgroundColor: theme.inputBg, color: theme.text };
  const labelStyle = { display: 'block', fontSize: '0.75rem', fontWeight: '600', color: theme.textMed, marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' };
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!password) { setError('Please enter your current password.'); return; }
    setLoading(true);
    setError('');
    try {
      await onConfirm(password);
    } catch (e) {
      setError(e?.response?.data?.message || 'Incorrect password. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000, padding: '1rem',
    }}>
      <div style={{
        backgroundColor: theme.cardBg, borderRadius: '1rem',
        width: '100%', maxWidth: '380px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden',
      }}>
        <div style={{
          padding: '1.25rem 1.5rem', borderBottom: `1px solid ${theme.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '0.4rem',
              backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Lock size={15} color="#DC2626" />
            </div>
            <p style={{ fontSize: '0.9rem', fontWeight: '700', color: theme.text }}>
              {tx?.confirm_pw || 'Confirm with password'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textMuted }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '1.25rem 1.5rem' }}>
          <p style={{ fontSize: '0.82rem', color: theme.textSub, marginBottom: '1rem', lineHeight: '1.5' }}>
            {message}
          </p>
          <label style={labelStyle}>{tx?.current_pw || 'Current password'}</label>
          <div style={{ position: 'relative' }}>
            <input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleConfirm()}
              placeholder="••••••••"
              style={{ ...inputStyle, paddingRight: '2.5rem' }}
              onFocus={e => e.target.style.borderColor = '#CC2027'}
              onBlur={e => e.target.style.borderColor = theme.borderMed}
              autoFocus
            />
            <button type="button" onClick={() => setShow(!show)} style={{
              position: 'absolute', right: '0.75rem', top: '50%',
              transform: 'translateY(-50%)', background: 'none',
              border: 'none', cursor: 'pointer', color: theme.textMuted,
            }}>
              {show ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          {error && (
            <p style={{ fontSize: '0.78rem', color: '#DC2626', marginTop: '0.5rem' }}>{error}</p>
          )}
        </div>

        <div style={{
          padding: '1rem 1.5rem', borderTop: `1px solid ${theme.border}`,
          display: 'flex', justifyContent: 'flex-end', gap: '0.5rem',
        }}>
          <button onClick={onClose} style={{
            padding: '0.5rem 1.1rem', backgroundColor: theme.cardBg,
            border: `1.5px solid ${theme.borderMed}`, borderRadius: '0.5rem',
            fontSize: '0.82rem', fontWeight: '600', color: theme.textSub, cursor: 'pointer',
          }}>
            {tx?.cancel || 'Cancel'}
          </button>
          <button onClick={handleConfirm} disabled={loading} style={{
            padding: '0.5rem 1.25rem',
            backgroundColor: loading ? '#9CA3AF' : '#CC2027',
            color: 'white', border: 'none', borderRadius: '0.5rem',
            fontSize: '0.82rem', fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}>
            {loading ? (tx?.verifying || 'Verifying…') : (tx?.confirm_save || 'Confirm & Save')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Settings Page ─── */
function Settings() {
  const tx = useAutoT(STRINGS);
  const { theme } = useTheme();
  const { user, updateUser } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const inputStyle = { ...BASE_INPUT_STYLE, border: `1.5px solid ${theme.borderMed}`, backgroundColor: theme.inputBg, color: theme.text };
  const labelStyle = { display: 'block', fontSize: '0.75rem', fontWeight: '600', color: theme.textMed, marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' };
  const isManager = user?.role === 'IT_MANAGER' || isAdmin;
  const SECTIONS = getSections(tx);

  const [activeSection, setActiveSection] = useState('profile');
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const photoInputRef = useRef(null);

  /* git connected accounts */
  const [gitStatus, setGitStatus] = useState(null);
  const [gitLoading, setGitLoading] = useState(false);
  const [gitDisconnecting, setGitDisconnecting] = useState('');

  /* jira connection */
  const [jiraStatus, setJiraStatus] = useState(null);
  const [jiraLoading, setJiraLoading] = useState(false);
  const [jiraSaving, setJiraSaving] = useState(false);
  const [jiraForm, setJiraForm] = useState({ domain: '', jiraEmail: '', apiToken: '' });
  const [jiraError, setJiraError] = useState('');
  const [showJiraToken, setShowJiraToken] = useState(false);

  /* profile */
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [newPhoto, setNewPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [profileError, setProfileError] = useState('');

  /* notifications */
  const [notifications, setNotifications] = useState({
    taskScored: true,
    taskOverridden: true,
    taskApproved: true,
    weeklyDigest: false,
    moscowAlert: true,
    method: 'both',
  });
  const [notifError, setNotifError] = useState('');

  /* admin: user list for permissions */
  const [allUsers, setAllUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [roleEdits, setRoleEdits] = useState({});

  useEffect(() => {
    if (activeSection === 'permissions' && isAdmin && allUsers.length === 0) {
      setUsersLoading(true);
      adminService.getAllUsers()
        .then(data => setAllUsers(data))
        .catch(() => {})
        .finally(() => setUsersLoading(false));
    }
  }, [activeSection]);

  useEffect(() => {
    if (activeSection === 'notifications') {
      settingsService.getNotifications()
        .then(prefs => setNotifications(prefs))
        .catch(() => {});
    }
  }, [activeSection]);

  // Handle OAuth callback redirects — GitHub/GitLab send browser back here with ?github=connected etc.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const githubResult = params.get('github');
    const gitlabResult = params.get('gitlab');
    if (githubResult === 'connected') {
      showToast('GitHub account connected successfully!');
      setActiveSection('git');
      window.history.replaceState({}, '', '/settings');
    } else if (githubResult === 'error') {
      showToast(decodeURIComponent(params.get('message') || 'GitHub connection failed.'), 'error');
      window.history.replaceState({}, '', '/settings');
    }
    if (gitlabResult === 'connected') {
      showToast('GitLab account connected successfully!');
      setActiveSection('git');
      window.history.replaceState({}, '', '/settings');
    } else if (gitlabResult === 'error') {
      showToast(decodeURIComponent(params.get('message') || 'GitLab connection failed.'), 'error');
      window.history.replaceState({}, '', '/settings');
    }
  }, []);

  // Load git + jira status whenever the connected-accounts section is opened
  useEffect(() => {
    if (activeSection === 'git') {
      setGitLoading(true);
      gitService.getStatus()
        .then(data => setGitStatus(data))
        .catch(() => {})
        .finally(() => setGitLoading(false));

      setJiraLoading(true);
      jiraService.getStatus()
        .then(data => setJiraStatus(data))
        .catch(() => {})
        .finally(() => setJiraLoading(false));
    }
  }, [activeSection]);

  const handleGitConnect = async (provider) => {
    try {
      const { authUrl } = await gitService.getAuthUrl(provider);
      window.location.href = authUrl;
    } catch {
      showToast(`Failed to start ${provider} connection.`, 'error');
    }
  };

  const handleJiraConnect = async () => {
    if (!jiraForm.domain || !jiraForm.jiraEmail || !jiraForm.apiToken) {
      setJiraError('All fields are required.');
      return;
    }
    setJiraSaving(true);
    setJiraError('');
    try {
      const result = await jiraService.connect(jiraForm);
      setJiraStatus(result);
      setJiraForm({ domain: '', jiraEmail: '', apiToken: '' });
      showToast('Jira account connected successfully!');
    } catch (e) {
      setJiraError(e?.response?.data?.message || 'Connection failed. Check your credentials.');
    } finally {
      setJiraSaving(false);
    }
  };

  const handleJiraDisconnect = async () => {
    setJiraSaving(true);
    try {
      await jiraService.disconnect();
      setJiraStatus({ connected: false });
      showToast('Jira account disconnected.');
    } catch {
      showToast('Disconnect failed.', 'error');
    } finally {
      setJiraSaving(false);
    }
  };

  const handleGitDisconnect = async (provider) => {
    setGitDisconnecting(provider);
    try {
      await gitService.disconnect(provider);
      setGitStatus(prev => ({
        ...prev,
        [`${provider}Connected`]: false,
        [`${provider}Username`]: null,
      }));
      showToast(`${provider === 'github' ? 'GitHub' : 'GitLab'} account disconnected.`);
    } catch {
      showToast('Disconnect failed.', 'error');
    } finally {
      setGitDisconnecting('');
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setNewPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  /* ── save profile (after password confirm) ── */
  const requestProfileSave = () => {
    setProfileError('');
    if (newPassword && newPassword !== confirmPassword) {
      setProfileError('New passwords do not match.');
      return;
    }
    setConfirmModal({
      message: 'Enter your current password to save your profile changes.',
      onConfirm: async (currentPassword) => {
        const payload = {
          name: profileName,
          email: profileEmail,
          currentPassword,
          ...(newPassword ? { newPassword } : {}),
        };
        const updated = await settingsService.updateProfile(payload, newPhoto);
        updateUser({
          name: updated.name ?? profileName,
          email: updated.email ?? profileEmail,
          photoPath: updated.photoPath ?? user?.photoPath,
        });
        setConfirmModal(null);
        setNewPassword('');
        setConfirmPassword('');
        setNewPhoto(null);
        setPhotoPreview(null);
        showToast('Profile updated successfully.');
      },
    });
  };

  /* ── save notifications (after password confirm) ── */
  const requestNotifSave = () => {
    setNotifError('');
    setConfirmModal({
      message: 'Enter your current password to save your notification preferences.',
      onConfirm: async (currentPassword) => {
        await settingsService.saveNotifications({ ...notifications, currentPassword });
        setConfirmModal(null);
        showToast('Notification preferences saved.');
      },
    });
  };

  /* ── admin: save role change (after password confirm) ── */
  const requestRoleSave = (userId, userName, newRole) => {
    setConfirmModal({
      message: `Enter your password to change ${userName}'s role to ${getRoleLabel(newRole, tx)}.`,
      onConfirm: async (currentPassword) => {
        await adminService.updateUser(userId, { role: newRole, currentPassword });
        setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
        setRoleEdits(prev => { const next = { ...prev }; delete next[userId]; return next; });
        setConfirmModal(null);
        showToast(`${userName}'s role updated to ${getRoleLabel(newRole, tx)}.`);
      },
    });
  };

  const storedPhotoUrl = user?.photoPath
    ? (user.photoPath.startsWith('http') ? user.photoPath : `http://localhost:8080/${user.photoPath}`)
    : null;
  const currentPhotoSrc = photoPreview || storedPhotoUrl;

  const userAccessMap = {
    DEVELOPER: perm => perm.developer,
    PRODUCT_TEAM: perm => perm.productTeam,
    IT_MANAGER: perm => perm.manager,
    ADMIN: perm => perm.admin,
  };
  const myAccess = userAccessMap[user?.role] || (() => false);

  return (
    <PageWrapper title={tx.page_title} subtitle={tx.page_subtitle}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '1.5rem', right: '1.5rem',
          zIndex: 2000, maxWidth: '340px',
          padding: '0.875rem 1.25rem',
          backgroundColor: toast.type === 'success' ? '#F0FDF4' : '#FEF2F2',
          border: `1px solid ${toast.type === 'success' ? '#BBF7D0' : '#FECACA'}`,
          borderRadius: '0.75rem', boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
        }}>
          <CheckCircle size={16} color={toast.type === 'success' ? '#16A34A' : '#DC2626'} />
          <p style={{ fontSize: '0.85rem', fontWeight: '500', color: toast.type === 'success' ? '#16A34A' : '#DC2626' }}>
            {toast.message}
          </p>
        </div>
      )}

      {/* Password confirm modal */}
      {confirmModal && (
        <ConfirmPasswordModal
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onClose={() => setConfirmModal(null)}
          tx={tx}
        />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '1.5rem' }}>

        {/* Left nav */}
        <div style={{
          backgroundColor: theme.cardBg, borderRadius: '0.75rem',
          border: `1px solid ${theme.border}`, padding: '0.75rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)', height: 'fit-content',
        }}>
          {SECTIONS.map(section => {
            const Icon = section.icon;
            const active = activeSection === section.id;
            return (
              <button key={section.id} onClick={() => setActiveSection(section.id)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.65rem 0.875rem', borderRadius: '0.5rem', border: 'none',
                backgroundColor: active ? '#FEF2F2' : 'transparent',
                borderLeft: `3px solid ${active ? '#CC2027' : 'transparent'}`,
                color: active ? '#CC2027' : theme.textSub,
                fontSize: '0.85rem', fontWeight: active ? '600' : '400',
                cursor: 'pointer', textAlign: 'left', marginBottom: '0.1rem',
              }}>
                <Icon size={16} />
                {section.label}
              </button>
            );
          })}
        </div>

        {/* Right content */}
        <div style={{
          backgroundColor: theme.cardBg, borderRadius: '0.75rem',
          border: `1px solid ${theme.border}`, padding: '2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>

          {/* ─── MY PROFILE ─── */}
          {activeSection === 'profile' && (
            <div>
              <p style={{ fontSize: '0.9rem', fontWeight: '700', color: theme.text, marginBottom: '0.25rem' }}>{tx.profile_title}</p>
              <p style={{ fontSize: '0.78rem', color: theme.textMuted, marginBottom: '1.5rem' }}>{tx.profile_sub}</p>

              {/* Avatar + upload */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '1.25rem',
                marginBottom: '1.75rem', padding: '1.25rem',
                backgroundColor: theme.hoverBg, borderRadius: '0.75rem', border: `1px solid ${theme.border}`,
              }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{
                    width: '72px', height: '72px', borderRadius: '50%',
                    backgroundColor: '#1A1A2E', overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '3px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                  }}>
                    {currentPhotoSrc ? (
                      <img src={currentPhotoSrc} alt="avatar"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ color: '#CC2027', fontSize: '1.75rem', fontWeight: '700' }}>
                        {user?.name?.charAt(0)?.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    style={{
                      position: 'absolute', bottom: 0, right: 0,
                      width: '24px', height: '24px', borderRadius: '50%',
                      backgroundColor: '#CC2027', border: '2px solid white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <Camera size={12} color="white" />
                  </button>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    style={{ display: 'none' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                    <p style={{ fontSize: '1rem', fontWeight: '700', color: theme.text }}>{user?.name}</p>
                    {user?.emailVerified && (
                      <span style={{ fontSize: '0.68rem', fontWeight: '600', backgroundColor: '#EFF6FF', color: '#2563EB', padding: '0.1rem 0.4rem', borderRadius: '9999px', border: '1px solid #BFDBFE' }}>✓ {tx.verified}</span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.8rem', color: theme.textSub, marginBottom: '0.35rem' }}>{user?.email}</p>
                  <span style={{
                    fontSize: '0.72rem', fontWeight: '600',
                    backgroundColor: '#FEF2F2', color: '#CC2027',
                    padding: '0.15rem 0.6rem', borderRadius: '9999px',
                    border: '1px solid #FECACA',
                  }}>
                    {user?.role?.replace(/_/g, ' ')}
                  </span>
                  {newPhoto && (
                    <p style={{ fontSize: '0.72rem', color: '#16A34A', marginTop: '0.35rem' }}>
                      ✓ New photo selected — save to apply
                    </p>
                  )}
                </div>
              </div>

              {/* Name + Email */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={labelStyle}>{tx.full_name}</label>
                  <input
                    type="text" value={profileName}
                    onChange={e => setProfileName(e.target.value)}
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#CC2027'}
                    onBlur={e => e.target.style.borderColor = theme.borderMed}
                  />
                </div>
                <div>
                  <label style={labelStyle}>{tx.email_addr}</label>
                  <input
                    type="email" value={profileEmail}
                    onChange={e => setProfileEmail(e.target.value)}
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#CC2027'}
                    onBlur={e => e.target.style.borderColor = theme.borderMed}
                  />
                </div>
              </div>

              {/* Change password */}
              <div style={{
                padding: '1.25rem', backgroundColor: theme.hoverBg,
                borderRadius: '0.75rem', border: `1px solid ${theme.border}`, marginBottom: '1.25rem',
              }}>
                <p style={{ fontSize: '0.85rem', fontWeight: '600', color: theme.textMed, marginBottom: '1rem' }}>
                  {tx.change_pw} <span style={{ fontSize: '0.72rem', fontWeight: '400', color: theme.textMuted }}>{tx.pw_hint}</span>
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={labelStyle}>{tx.new_password}</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showNewPw ? 'text' : 'password'}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        style={{ ...inputStyle, paddingRight: '2.5rem' }}
                        onFocus={e => e.target.style.borderColor = '#CC2027'}
                        onBlur={e => e.target.style.borderColor = theme.borderMed}
                      />
                      <button type="button" onClick={() => setShowNewPw(!showNewPw)} style={{
                        position: 'absolute', right: '0.75rem', top: '50%',
                        transform: 'translateY(-50%)', background: 'none',
                        border: 'none', cursor: 'pointer', color: theme.textMuted,
                      }}>
                        {showNewPw ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>{tx.confirm_password}</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showConfirmPw ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        style={{
                          ...inputStyle, paddingRight: '2.5rem',
                          borderColor: confirmPassword && confirmPassword !== newPassword ? '#DC2626' : theme.borderMed,
                        }}
                        onFocus={e => e.target.style.borderColor = '#CC2027'}
                        onBlur={e => e.target.style.borderColor = theme.borderMed}
                      />
                      <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} style={{
                        position: 'absolute', right: '0.75rem', top: '50%',
                        transform: 'translateY(-50%)', background: 'none',
                        border: 'none', cursor: 'pointer', color: theme.textMuted,
                      }}>
                        {showConfirmPw ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    {confirmPassword && confirmPassword !== newPassword && (
                      <p style={{ fontSize: '0.7rem', color: '#DC2626', marginTop: '0.25rem' }}>{tx.pw_mismatch}</p>
                    )}
                  </div>
                </div>
              </div>

              {profileError && (
                <p style={{ fontSize: '0.8rem', color: '#DC2626', marginBottom: '0.75rem' }}>{profileError}</p>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={requestProfileSave} style={{
                  padding: '0.65rem 1.5rem', backgroundColor: '#CC2027',
                  color: 'white', border: 'none', borderRadius: '0.5rem',
                  fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                }}>
                  <Lock size={14} />
                  {tx.save_changes}
                </button>
              </div>
            </div>
          )}

          {/* ─── ROLES & PERMISSIONS ─── */}
          {activeSection === 'permissions' && (
            <div>
              <p style={{ fontSize: '0.9rem', fontWeight: '700', color: theme.text, marginBottom: '0.25rem' }}>{tx.perm_title}</p>
              <p style={{ fontSize: '0.78rem', color: theme.textMuted, marginBottom: '1.25rem' }}>
                {isAdmin ? 'View permission matrix and manage user roles' : 'Your access level based on your assigned role'}
              </p>

              {/* Permission matrix */}
              <div style={{ border: `1px solid ${theme.border}`, borderRadius: '0.75rem', overflow: 'hidden', marginBottom: isAdmin ? '2rem' : '0' }}>
                <div style={{
                  display: 'grid', gridTemplateColumns: '1.6fr repeat(4, 1fr)',
                  padding: '0.75rem 1rem', backgroundColor: theme.hoverBg,
                  borderBottom: `1px solid ${theme.border}`,
                }}>
                  {['Feature', 'Developer', 'Product', 'Manager', 'Admin'].map(h => (
                    <span key={h} style={{
                      fontSize: '0.68rem', fontWeight: '600', color: theme.textMuted,
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>{h}</span>
                  ))}
                </div>
                {ROLE_PERMISSIONS.map((perm, i) => {
                  const cols = [perm.developer, perm.productTeam, perm.manager, perm.admin];
                  const hasAccess = myAccess(perm);
                  return (
                    <div key={perm.feature} style={{
                      display: 'grid', gridTemplateColumns: '1.6fr repeat(4, 1fr)',
                      padding: '0.75rem 1rem',
                      borderBottom: i < ROLE_PERMISSIONS.length - 1 ? `1px solid ${theme.border}` : 'none',
                      alignItems: 'center',
                      backgroundColor: hasAccess ? theme.cardBg : theme.hoverBg,
                    }}>
                      <span style={{ fontSize: '0.8rem', color: theme.textMed, fontWeight: hasAccess ? '500' : '400' }}>
                        {perm.feature}
                      </span>
                      {cols.map((val, ci) => (
                        <span key={ci} style={{ fontSize: '0.8rem' }}>
                          {val
                            ? <span style={{ color: '#16A34A', fontWeight: '700' }}>✓</span>
                            : <span style={{ color: '#D1D5DB' }}>—</span>
                          }
                        </span>
                      ))}
                    </div>
                  );
                })}
              </div>

              {/* Admin: manage user roles */}
              {isAdmin && (
                <div>
                  <p style={{ fontSize: '0.9rem', fontWeight: '700', color: theme.text, marginBottom: '0.25rem' }}>{tx.manage_roles}</p>
                  <p style={{ fontSize: '0.78rem', color: theme.textMuted, marginBottom: '1rem' }}>{tx.manage_roles_sub}</p>

                  {usersLoading && (
                    <p style={{ color: theme.textMuted, fontSize: '0.875rem' }}>{tx.loading_users}</p>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {allUsers.map(u => {
                      const currentRole = roleEdits[u.id] ?? u.role;
                      const changed = roleEdits[u.id] && roleEdits[u.id] !== u.role;
                      const rs = ROLE_COLORS[currentRole] || ROLE_COLORS.DEVELOPER;
                      return (
                        <div key={u.id} style={{
                          display: 'flex', alignItems: 'center', gap: '1rem',
                          padding: '0.875rem 1rem',
                          border: `1px solid ${changed ? '#BFDBFE' : theme.border}`,
                          borderRadius: '0.625rem',
                          backgroundColor: changed ? '#F0F7FF' : theme.cardBg,
                        }}>
                          {/* Avatar */}
                          <div style={{
                            width: '36px', height: '36px', borderRadius: '50%',
                            backgroundColor: '#1A1A2E', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            overflow: 'hidden',
                          }}>
                            {u.photoPath ? (
                              <img src={`http://localhost:8080/${u.photoPath}`} alt={u.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <span style={{ color: '#CC2027', fontSize: '0.875rem', fontWeight: '700' }}>
                                {u.name?.charAt(0)?.toUpperCase()}
                              </span>
                            )}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '0.85rem', fontWeight: '600', color: theme.text }}>{u.name}</p>
                            <p style={{ fontSize: '0.75rem', color: theme.textMuted }}>{u.email}</p>
                          </div>

                          {/* Role selector */}
                          <select
                            value={currentRole}
                            onChange={e => setRoleEdits(prev => ({ ...prev, [u.id]: e.target.value }))}
                            style={{
                              padding: '0.4rem 0.75rem', borderRadius: '0.4rem',
                              border: `1.5px solid ${changed ? '#2563EB' : theme.borderMed}`,
                              fontSize: '0.78rem', fontWeight: '600',
                              backgroundColor: rs.bg, color: rs.color,
                              cursor: 'pointer', outline: 'none',
                            }}
                          >
                            {ALL_ROLES.map(r => (
                              <option key={r} value={r}>{getRoleLabel(r, tx)}</option>
                            ))}
                          </select>

                          {changed && (
                            <button
                              onClick={() => requestRoleSave(u.id, u.name, roleEdits[u.id])}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '0.3rem',
                                padding: '0.4rem 0.875rem',
                                backgroundColor: '#CC2027', color: 'white',
                                border: 'none', borderRadius: '0.4rem',
                                fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer',
                              }}
                            >
                              <Lock size={12} />
                              {tx.save}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── AI SCORING CONFIG ─── */}
          {activeSection === 'ai' && (
            <div>
              <p style={{ fontSize: '0.9rem', fontWeight: '700', color: theme.text, marginBottom: '0.25rem' }}>{tx.ai_title}</p>
              <p style={{ fontSize: '0.78rem', color: theme.textMuted, marginBottom: '1.5rem' }}>{tx.ai_sub}</p>

              {/* Provider cards */}
              <p style={{ fontSize: '0.78rem', fontWeight: '600', color: theme.textMed, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{tx.avail_providers}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.75rem' }}>
                {AI_PROVIDERS_INFO.map(p => (
                  <div key={p.value} style={{
                    padding: '1rem', borderRadius: '0.625rem',
                    border: `1.5px solid ${p.color}30`,
                    backgroundColor: `${p.color}08`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                      <span style={{
                        fontSize: '0.75rem', fontWeight: '700',
                        color: p.color, backgroundColor: `${p.color}18`,
                        padding: '0.15rem 0.5rem', borderRadius: '9999px',
                      }}>
                        {p.label}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: theme.textSub, fontFamily: 'monospace' }}>
                        {p.model}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: theme.textSub, lineHeight: '1.4', marginBottom: '0.5rem' }}>
                      {p.description}
                    </p>
                    <p style={{ fontSize: '0.68rem', color: theme.textMuted, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      {p.endpoint}
                    </p>
                  </div>
                ))}
              </div>

              {/* Formula */}
              <div style={{
                padding: '1rem 1.25rem', backgroundColor: '#1A1A2E',
                borderRadius: '0.75rem', marginBottom: '1.5rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
              }}>
                {[
                  { v: '(R × I × C)', label: 'RICE numerator' },
                  { v: '÷ E', label: 'effort divisor' },
                  { v: '× Kano', label: 'category multiplier' },
                  { v: '× MoSCoW', label: 'priority multiplier' },
                ].map((part, i) => (
                  <div key={i} style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.95rem', fontWeight: '700', color: '#CC2027' }}>{part.v}</p>
                    <p style={{ fontSize: '0.6rem', color: '#4B5563', marginTop: '0.15rem' }}>{part.label}</p>
                  </div>
                ))}
              </div>

              {/* Multipliers */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div>
                  <p style={{ fontSize: '0.78rem', fontWeight: '600', color: theme.textMed, marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Kano multipliers
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {KANO_MULTIPLIERS.map(m => (
                      <div key={m.label} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '0.5rem 0.875rem', backgroundColor: theme.hoverBg,
                        borderRadius: '0.4rem', border: `1px solid ${theme.border}`,
                      }}>
                        <div>
                          <span style={{ fontSize: '0.78rem', color: theme.textMed, fontWeight: '500' }}>{m.label}</span>
                          <span style={{ fontSize: '0.68rem', color: theme.textMuted, marginLeft: '0.4rem' }}>{m.note}</span>
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#CC2027' }}>{m.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: '0.78rem', fontWeight: '600', color: theme.textMed, marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    MoSCoW multipliers
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {MOSCOW_MULTIPLIERS.map(m => (
                      <div key={m.label} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '0.5rem 0.875rem', backgroundColor: theme.hoverBg,
                        borderRadius: '0.4rem', border: `1px solid ${theme.border}`,
                      }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: '600', color: m.color }}>{m.label}</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#CC2027' }}>{m.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {!isAdmin && (
                <div style={{
                  marginTop: '1.25rem', padding: '0.875rem 1rem',
                  backgroundColor: '#FFF7ED', border: '1px solid #FDE68A',
                  borderRadius: '0.5rem', display: 'flex', gap: '0.75rem',
                }}>
                  <span style={{ fontSize: '0.875rem' }}>⚠️</span>
                  <p style={{ fontSize: '0.8rem', color: '#92400E' }}>
                    To switch the active AI provider, go to the <strong>Admin Panel → AI Scoring Provider</strong>.
                    Only administrators can change this setting.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ─── NOTIFICATIONS ─── */}
          {activeSection === 'notifications' && (
            <div>
              <p style={{ fontSize: '0.9rem', fontWeight: '700', color: theme.text, marginBottom: '0.25rem' }}>{tx.notif_title}</p>
              <p style={{ fontSize: '0.78rem', color: theme.textMuted, marginBottom: '0.75rem' }}>{tx.notif_sub}</p>

              {/* Backend note */}
              <div style={{
                padding: '0.875rem 1rem', marginBottom: '1.25rem',
                backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE',
                borderRadius: '0.5rem', display: 'flex', gap: '0.75rem',
              }}>
                <span style={{ fontSize: '0.875rem' }}>ℹ️</span>
                <p style={{ fontSize: '0.78rem', color: '#1D4ED8', lineHeight: '1.5' }}>
                  Preferences are saved to the backend. Actual email/in-app delivery requires the
                  notification service to be configured in <strong>application.properties</strong> (SMTP for email,
                  WebSocket for in-app).
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {[
                  { key: 'taskScored',    label: tx.notif_scored,    desc: tx.notif_d_scored },
                  { key: 'taskOverridden',label: tx.notif_override,  desc: tx.notif_d_override },
                  { key: 'taskApproved',  label: tx.notif_approved,  desc: tx.notif_d_approved },
                  { key: 'weeklyDigest',  label: tx.notif_digest,    desc: tx.notif_d_digest, managerOnly: false },
                  { key: 'moscowAlert',   label: tx.notif_alert,     desc: tx.notif_d_alert, managerOnly: true },
                ].map((item, i, arr) => {
                  if (item.managerOnly && !isManager) return null;
                  return (
                    <div key={item.key} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      gap: '1rem', padding: '1rem 0',
                      borderBottom: i < arr.length - 1 ? `1px solid ${theme.border}` : 'none',
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <p style={{ fontSize: '0.85rem', fontWeight: '500', color: theme.textMed }}>
                            {item.label}
                          </p>
                          {item.managerOnly && (
                            <span style={{ fontSize: '0.65rem', fontWeight: '600', backgroundColor: '#F5F3FF', color: '#7C3AED', padding: '0.1rem 0.4rem', borderRadius: '9999px', border: '1px solid #DDD6FE' }}>{tx.manager_plus}</span>
                          )}
                        </div>
                        <p style={{ fontSize: '0.75rem', color: theme.textMuted, marginTop: '0.15rem' }}>
                          {item.desc}
                        </p>
                      </div>
                      <Toggle
                        checked={notifications[item.key]}
                        onChange={() => setNotifications(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Notification method */}
              <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: `1px solid ${theme.border}` }}>
                <label style={labelStyle}>{tx.delivery_method}</label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {[
                    { value: 'app',   label: tx.in_app },
                    { value: 'email', label: tx.email_only },
                    { value: 'both',  label: tx.both },
                  ].map(opt => (
                    <button key={opt.value}
                      onClick={() => setNotifications(prev => ({ ...prev, method: opt.value }))}
                      style={{
                        padding: '0.5rem 1rem', borderRadius: '0.5rem',
                        border: `1.5px solid ${notifications.method === opt.value ? '#CC2027' : theme.borderMed}`,
                        backgroundColor: notifications.method === opt.value ? '#FEF2F2' : theme.cardBg,
                        color: notifications.method === opt.value ? '#CC2027' : theme.textSub,
                        fontSize: '0.825rem', fontWeight: '500', cursor: 'pointer',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {notifError && (
                <p style={{ fontSize: '0.8rem', color: '#DC2626', marginTop: '0.75rem' }}>{notifError}</p>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button onClick={requestNotifSave} style={{
                  padding: '0.65rem 1.5rem', backgroundColor: '#CC2027',
                  color: 'white', border: 'none', borderRadius: '0.5rem',
                  fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                }}>
                  <Lock size={14} />
                  {tx.save_prefs}
                </button>
              </div>
            </div>
          )}

          {/* ─── CONNECTED ACCOUNTS ─── */}
          {activeSection === 'git' && (
            <div>
              <p style={{ fontSize: '0.9rem', fontWeight: '700', color: theme.text, marginBottom: '0.25rem' }}>{tx.git_title}</p>
              <p style={{ fontSize: '0.78rem', color: theme.textMuted, marginBottom: '1.5rem' }}>
                Link your GitHub or GitLab account to commit code directly from PriorIT tasks.
                Your access token is stored securely on the server — never exposed to the browser.
              </p>

              {gitLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '2rem', color: theme.textMuted }}>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: '0.85rem' }}>Loading account status…</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                  {/* GitHub card */}
                  {[
                    { provider: 'github', label: 'GitHub', Icon: GitFork, accentColor: '#1A1A2E', bgColor: '#F8F9FB' },
                    { provider: 'gitlab', label: 'GitLab', Icon: GitBranch, accentColor: '#FC6D26', bgColor: '#FFF7F3' },
                  ].map(({ provider, label, Icon, accentColor, bgColor }) => {
                    const connected = gitStatus?.[`${provider}Connected`];
                    const username = gitStatus?.[`${provider}Username`];
                    const isDisconnecting = gitDisconnecting === provider;
                    return (
                      <div key={provider} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        gap: '1rem', padding: '1.25rem 1.5rem',
                        border: `1.5px solid ${connected ? (provider === 'github' ? theme.borderMed : '#FC6D2650') : theme.border}`,
                        borderRadius: '0.75rem',
                        backgroundColor: connected ? theme.hoverBg : theme.cardBg,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{
                            width: '42px', height: '42px', borderRadius: '0.6rem',
                            backgroundColor: accentColor,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                            <Icon size={20} color="white" />
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                              <p style={{ fontSize: '0.9rem', fontWeight: '700', color: theme.text }}>{label}</p>
                              {connected && (
                                <span style={{
                                  display: 'flex', alignItems: 'center', gap: '0.25rem',
                                  fontSize: '0.68rem', fontWeight: '600',
                                  backgroundColor: '#F0FDF4', color: '#16A34A',
                                  padding: '0.15rem 0.5rem', borderRadius: '9999px',
                                  border: '1px solid #BBF7D0',
                                }}>
                                  <CheckCircle2 size={10} />
                                  Connected
                                </span>
                              )}
                            </div>
                            {connected ? (
                              <p style={{ fontSize: '0.8rem', color: theme.textSub }}>
                                Signed in as <strong style={{ color: theme.text }}>@{username}</strong>
                              </p>
                            ) : (
                              <p style={{ fontSize: '0.8rem', color: theme.textMuted }}>
                                Not connected — click to authorise via OAuth
                              </p>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                          {connected ? (
                            <>
                              <a
                                href={`https://${provider}.com/${username}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '0.3rem',
                                  padding: '0.45rem 0.875rem', borderRadius: '0.45rem',
                                  border: `1px solid ${theme.borderMed}`, backgroundColor: theme.cardBg,
                                  color: theme.textMed, fontSize: '0.78rem', fontWeight: '500',
                                  textDecoration: 'none',
                                }}
                              >
                                <ExternalLink size={12} />
                                {tx.view_profile}
                              </a>
                              <button
                                onClick={() => handleGitDisconnect(provider)}
                                disabled={isDisconnecting}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '0.3rem',
                                  padding: '0.45rem 0.875rem', borderRadius: '0.45rem',
                                  border: '1px solid #FECACA', backgroundColor: '#FEF2F2',
                                  color: '#DC2626', fontSize: '0.78rem', fontWeight: '600',
                                  cursor: isDisconnecting ? 'not-allowed' : 'pointer',
                                  opacity: isDisconnecting ? 0.6 : 1,
                                }}
                              >
                                {isDisconnecting
                                  ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> {tx.disconnecting}</>
                                  : <><X size={12} /> {tx.disconnect}</>
                                }
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleGitConnect(provider)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '0.4rem',
                                padding: '0.5rem 1.25rem', borderRadius: '0.45rem',
                                border: 'none', backgroundColor: accentColor,
                                color: 'white', fontSize: '0.82rem', fontWeight: '600',
                                cursor: 'pointer',
                              }}
                            >
                              <Icon size={14} />
                              {tx.connect} {label}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Jira card */}
                  {(() => {
                    const jiraConnected = jiraStatus?.connected;
                    return (
                      <div style={{
                        border: `1.5px solid ${jiraConnected ? '#0052CC50' : theme.border}`,
                        borderRadius: '0.75rem',
                        backgroundColor: jiraConnected ? theme.hoverBg : theme.cardBg,
                        overflow: 'hidden',
                      }}>
                        {/* Card header */}
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          gap: '1rem', padding: '1.25rem 1.5rem',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{
                              width: '42px', height: '42px', borderRadius: '0.6rem',
                              backgroundColor: '#0052CC',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0,
                            }}>
                              <Link2 size={20} color="white" />
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                                <p style={{ fontSize: '0.9rem', fontWeight: '700', color: theme.text }}>Jira</p>
                                {jiraConnected && (
                                  <span style={{
                                    display: 'flex', alignItems: 'center', gap: '0.25rem',
                                    fontSize: '0.68rem', fontWeight: '600',
                                    backgroundColor: '#F0FDF4', color: '#16A34A',
                                    padding: '0.15rem 0.5rem', borderRadius: '9999px',
                                    border: '1px solid #BBF7D0',
                                  }}>
                                    <CheckCircle2 size={10} />
                                    Connected
                                  </span>
                                )}
                              </div>
                              {jiraConnected ? (
                                <p style={{ fontSize: '0.8rem', color: theme.textSub }}>
                                  <strong style={{ color: theme.text }}>{jiraStatus.domain}</strong>
                                  {' · '}{jiraStatus.jiraEmail}
                                </p>
                              ) : (
                                <p style={{ fontSize: '0.8rem', color: theme.textMuted }}>
                                  Connect with API token — no OAuth required
                                </p>
                              )}
                            </div>
                          </div>

                          {jiraConnected && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                              <a
                                href={`https://${jiraStatus.domain}/jira`}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '0.3rem',
                                  padding: '0.45rem 0.875rem', borderRadius: '0.45rem',
                                  border: `1px solid ${theme.borderMed}`, backgroundColor: theme.cardBg,
                                  color: theme.textMed, fontSize: '0.78rem', fontWeight: '500',
                                  textDecoration: 'none',
                                }}
                              >
                                <ExternalLink size={12} />
                                {tx.view_profile}
                              </a>
                              <button
                                onClick={handleJiraDisconnect}
                                disabled={jiraSaving}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '0.3rem',
                                  padding: '0.45rem 0.875rem', borderRadius: '0.45rem',
                                  border: '1px solid #FECACA', backgroundColor: '#FEF2F2',
                                  color: '#DC2626', fontSize: '0.78rem', fontWeight: '600',
                                  cursor: jiraSaving ? 'not-allowed' : 'pointer',
                                  opacity: jiraSaving ? 0.6 : 1,
                                }}
                              >
                                {jiraSaving
                                  ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> {tx.disconnecting}</>
                                  : <><X size={12} /> {tx.disconnect}</>
                                }
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Connect form — shown only when not connected */}
                        {!jiraConnected && (
                          <div style={{
                            padding: '0 1.5rem 1.5rem',
                            borderTop: `1px solid ${theme.border}`,
                          }}>
                            <div style={{ paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                              <div>
                                <label style={labelStyle}>{tx.jira_domain}</label>
                                <input
                                  type="text"
                                  value={jiraForm.domain}
                                  onChange={e => setJiraForm(prev => ({ ...prev, domain: e.target.value }))}
                                  placeholder="yourcompany.atlassian.net"
                                  style={inputStyle}
                                  onFocus={e => e.target.style.borderColor = '#0052CC'}
                                  onBlur={e => e.target.style.borderColor = theme.borderMed}
                                />
                              </div>
                              <div>
                                <label style={labelStyle}>{tx.jira_email}</label>
                                <input
                                  type="email"
                                  value={jiraForm.jiraEmail}
                                  onChange={e => setJiraForm(prev => ({ ...prev, jiraEmail: e.target.value }))}
                                  placeholder="you@yourcompany.com"
                                  style={inputStyle}
                                  onFocus={e => e.target.style.borderColor = '#0052CC'}
                                  onBlur={e => e.target.style.borderColor = theme.borderMed}
                                />
                              </div>
                              <div>
                                <label style={labelStyle}>{tx.api_token}</label>
                                <div style={{ position: 'relative' }}>
                                  <input
                                    type={showJiraToken ? 'text' : 'password'}
                                    value={jiraForm.apiToken}
                                    onChange={e => setJiraForm(prev => ({ ...prev, apiToken: e.target.value }))}
                                    placeholder="Paste your Atlassian API token"
                                    style={{ ...inputStyle, paddingRight: '2.5rem' }}
                                    onFocus={e => e.target.style.borderColor = '#0052CC'}
                                    onBlur={e => e.target.style.borderColor = theme.borderMed}
                                  />
                                  <button type="button" onClick={() => setShowJiraToken(!showJiraToken)} style={{
                                    position: 'absolute', right: '0.75rem', top: '50%',
                                    transform: 'translateY(-50%)', background: 'none',
                                    border: 'none', cursor: 'pointer', color: theme.textMuted,
                                  }}>
                                    {showJiraToken ? <EyeOff size={14} /> : <Eye size={14} />}
                                  </button>
                                </div>
                                <p style={{ fontSize: '0.72rem', color: theme.textMuted, marginTop: '0.35rem' }}>
                                  Generate at <strong>id.atlassian.com → Security → API tokens</strong>
                                </p>
                              </div>

                              {jiraError && (
                                <div style={{
                                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                                  padding: '0.6rem 0.875rem', backgroundColor: '#FEF2F2',
                                  border: '1px solid #FECACA', borderRadius: '0.45rem',
                                }}>
                                  <AlertCircle size={14} color="#DC2626" />
                                  <p style={{ fontSize: '0.78rem', color: '#DC2626' }}>{jiraError}</p>
                                </div>
                              )}

                              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button
                                  onClick={handleJiraConnect}
                                  disabled={jiraSaving}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                                    padding: '0.5rem 1.25rem', borderRadius: '0.45rem',
                                    border: 'none', backgroundColor: jiraSaving ? '#9CA3AF' : '#0052CC',
                                    color: 'white', fontSize: '0.82rem', fontWeight: '600',
                                    cursor: jiraSaving ? 'not-allowed' : 'pointer',
                                  }}
                                >
                                  {jiraSaving
                                    ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> {tx.connecting}</>
                                    : <><Link2 size={14} /> {tx.connect_jira}</>
                                  }
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Info box */}
                  <div style={{
                    padding: '0.875rem 1rem', marginTop: '0.5rem',
                    backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE',
                    borderRadius: '0.5rem', display: 'flex', gap: '0.75rem',
                  }}>
                    <AlertCircle size={15} color="#2563EB" style={{ flexShrink: 0, marginTop: '1px' }} />
                    <div style={{ fontSize: '0.78rem', color: '#1D4ED8', lineHeight: '1.55' }}>
                      <strong>How it works:</strong> PriorIT uses OAuth to request read/write access to your
                      repositories. Your token is stored encrypted on our server and is only used when you
                      push code from a subtask. You can disconnect at any time.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </PageWrapper>
  );
}

export default Settings;
