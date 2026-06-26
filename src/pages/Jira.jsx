import { useState, useEffect } from 'react';
import {
  Link2, RefreshCw, Unlink, Plus, Search, ExternalLink,
  Loader2, AlertCircle, CheckCircle2, X, ChevronDown,
} from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import jiraService from '../services/jiraService';
import taskService from '../services/taskService';
import { useAutoT, useDynamicTranslation } from '../i18n/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

/* ─── constants ─── */

const STRINGS = {
  title:            'Jira Integration',
  subtitle:         'Manage Jira issues linked to your PriorIT tasks',
  create_title:     'Create Jira issue',
  create_for_task:  'Creating issue for task:',
  field_project:    'Project',
  select_project:   'Select a project…',
  field_issue_type: 'Issue type',
  field_summary:    'Summary',
  field_desc:       'Description',
  optional:         'optional',
  btn_cancel:       'Cancel',
  creating:         'Creating…',
  btn_create:       'Create issue',
  err_sel_project:  'Select a Jira project.',
  link_title:       'Link existing issue',
  link_for_task:    'Linking to task:',
  field_issue_key:  'Jira issue key',
  ph_issue_key:     'e.g. PROJ-123',
  linking:          'Linking…',
  btn_link:         'Link issue',
  err_enter_key:    'Enter a Jira issue key (e.g. PROJ-123).',
  connected_to:     'Connected to',
  status_active:    'Active',
  not_connected:    'Jira not connected',
  not_conn_sub:     'Go to Settings → Connected Accounts to link your Jira account.',
  manage_conn:      'Manage connection',
  connect_title:    'Connect your Jira account',
  connect_desc:     'Link your Atlassian account to create and track Jira issues directly from PriorIT tasks.',
  go_settings:      'Go to Settings',
  filter_all:       'All',
  filter_linked:    'Linked',
  filter_unlinked:  'Unlinked',
  col_task:         'Task',
  col_priority:     'Priority',
  col_jira:         'Jira Issue',
  col_status:       'Status',
  col_actions:      'Actions',
  ph_search:        'Search tasks…',
  btn_sync:         'Sync',
  btn_unlink:       'Unlink',
  btn_create_short: 'Create',
  btn_link_short:   'Link',
  no_tasks:         'No tasks match the current filter.',
  loading:          'Loading Jira data…',
  toast_unlinked:   'Issue unlinked.',
  toast_unlink_fail:'Unlink failed.',
  toast_ref_fail:   'Refresh failed.',
  linked_to_jira:   'linked to Jira',
  tasks_linked:     'tasks linked',
  task_linked:      'task linked',
  showing:          'Showing',
  of:               'of',
};

const extractJiraStrings = (items) => [
  ...new Set(items.flatMap(item => [item.title, item.type].filter(Boolean)))
];

const ISSUE_TYPES = ['Task', 'Bug', 'Story', 'Epic'];

const MOSCOW_STYLE = {
  MUST:   { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
  SHOULD: { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' },
  COULD:  { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
  WONT:   { bg: '#F9FAFB', color: '#9CA3AF', border: '#E5E7EB' },
};

const JIRA_STATUS_COLOR = (s) => {
  if (!s) return { bg: '#F9FAFB', color: '#9CA3AF' };
  const l = s.toLowerCase();
  if (l.includes('done') || l.includes('closed') || l.includes('resolved'))
    return { bg: '#F0FDF4', color: '#16A34A' };
  if (l.includes('progress') || l.includes('review'))
    return { bg: '#EFF6FF', color: '#2563EB' };
  return { bg: '#F5F3FF', color: '#7C3AED' };
};

const BASE_INPUT_STYLE = {
  width: '100%', padding: '0.65rem 1rem',
  borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none',
  boxSizing: 'border-box', fontFamily: 'Inter, sans-serif',
};

const BASE_LABEL_STYLE = {
  display: 'block', fontSize: '0.75rem', fontWeight: '600',
  marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em',
};

/* ─── Create Issue Modal ─── */
function CreateIssueModal({ task, projects, onClose, onCreate, tx }) {
  const { theme } = useTheme();
  const inputStyle = { ...BASE_INPUT_STYLE, border: `1.5px solid ${theme.borderMed}`, backgroundColor: theme.inputBg, color: theme.text };
  const labelStyle = { ...BASE_LABEL_STYLE, color: theme.textMed };
  const [projectKey, setProjectKey] = useState('');
  const [issueType, setIssueType] = useState('Task');
  const [summary, setSummary] = useState(task.title || '');
  const [description, setDescription] = useState(task.description || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!projectKey) { setError(tx.err_sel_project || 'Select a Jira project.'); return; }
    setSaving(true);
    setError('');
    try {
      const result = await jiraService.createIssue({
        taskId: task.id,
        projectKey,
        issueType,
        summary,
        description,
      });
      onCreate(task.id, result);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to create issue.');
    } finally {
      setSaving(false);
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
        width: '100%', maxWidth: '500px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden',
      }}>
        <div style={{
          padding: '1.25rem 1.5rem', borderBottom: `1px solid ${theme.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '0.4rem',
              backgroundColor: '#0052CC',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Plus size={15} color="white" />
            </div>
            <p style={{ fontSize: '0.9rem', fontWeight: '700', color: theme.text }}>
              {tx.create_title || 'Create Jira issue'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textMuted }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <p style={{ fontSize: '0.8rem', color: theme.textSub }}>
            {tx.create_for_task || 'Creating issue for task:'} <strong style={{ color: theme.text }}>{task.title}</strong>
          </p>

          <div>
            <label style={labelStyle}>{tx.field_project || 'Project'}</label>
            <div style={{ position: 'relative' }}>
              <select
                value={projectKey}
                onChange={e => setProjectKey(e.target.value)}
                style={{ ...inputStyle, paddingRight: '2rem', appearance: 'none', cursor: 'pointer' }}
                onFocus={e => e.target.style.borderColor = '#0052CC'}
                onBlur={e => e.target.style.borderColor = theme.borderMed}
              >
                <option value="">{tx.select_project || 'Select a project…'}</option>
                {projects.map(p => (
                  <option key={p.key} value={p.key}>{p.name} ({p.key})</option>
                ))}
              </select>
              <ChevronDown size={14} color="#9CA3AF" style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>{tx.field_issue_type || 'Issue type'}</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {ISSUE_TYPES.map(t => (
                <button key={t} onClick={() => setIssueType(t)} style={{
                  padding: '0.35rem 0.875rem', borderRadius: '0.4rem',
                  border: `1.5px solid ${issueType === t ? '#0052CC' : theme.borderMed}`,
                  backgroundColor: issueType === t ? '#EBF4FF' : theme.cardBg,
                  color: issueType === t ? '#0052CC' : theme.textSub,
                  fontSize: '0.8rem', fontWeight: '500', cursor: 'pointer',
                }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>{tx.field_summary || 'Summary'}</label>
            <input
              type="text" value={summary}
              onChange={e => setSummary(e.target.value)}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#0052CC'}
              onBlur={e => e.target.style.borderColor = theme.borderMed}
            />
          </div>

          <div>
            <label style={labelStyle}>{tx.field_desc || 'Description'} <span style={{ fontWeight: '400', color: theme.textMuted, textTransform: 'none' }}>({tx.optional || 'optional'})</span></label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.5' }}
              onFocus={e => e.target.style.borderColor = '#0052CC'}
              onBlur={e => e.target.style.borderColor = theme.borderMed}
            />
          </div>

          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.6rem 0.875rem', backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA', borderRadius: '0.45rem',
            }}>
              <AlertCircle size={14} color="#DC2626" />
              <p style={{ fontSize: '0.78rem', color: '#DC2626' }}>{error}</p>
            </div>
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
            {tx.btn_cancel || 'Cancel'}
          </button>
          <button onClick={handleCreate} disabled={saving} style={{
            padding: '0.5rem 1.25rem',
            backgroundColor: saving ? '#9CA3AF' : '#0052CC',
            color: 'white', border: 'none', borderRadius: '0.5rem',
            fontSize: '0.82rem', fontWeight: '600',
            cursor: saving ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.4rem',
          }}>
            {saving
              ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> {tx.creating || 'Creating…'}</>
              : <><Plus size={14} /> {tx.btn_create || 'Create issue'}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Link Issue Modal ─── */
function LinkIssueModal({ task, onClose, onLink, tx }) {
  const { theme } = useTheme();
  const inputStyle = { ...BASE_INPUT_STYLE, border: `1.5px solid ${theme.borderMed}`, backgroundColor: theme.inputBg, color: theme.text };
  const labelStyle = { ...BASE_LABEL_STYLE, color: theme.textMed };
  const [issueKey, setIssueKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleLink = async () => {
    if (!issueKey.trim()) { setError(tx.err_enter_key || 'Enter a Jira issue key (e.g. PROJ-123).'); return; }
    setSaving(true);
    setError('');
    try {
      const result = await jiraService.linkIssue({ taskId: task.id, issueKey: issueKey.trim().toUpperCase() });
      onLink(task.id, result);
    } catch (e) {
      setError(e?.response?.data?.message || 'Issue not found or access denied.');
    } finally {
      setSaving(false);
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
        width: '100%', maxWidth: '400px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden',
      }}>
        <div style={{
          padding: '1.25rem 1.5rem', borderBottom: `1px solid ${theme.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '0.4rem',
              backgroundColor: '#0052CC',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Link2 size={15} color="white" />
            </div>
            <p style={{ fontSize: '0.9rem', fontWeight: '700', color: theme.text }}>
              {tx.link_title || 'Link existing issue'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textMuted }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <p style={{ fontSize: '0.8rem', color: theme.textSub }}>
            {tx.link_for_task || 'Linking to task:'} <strong style={{ color: theme.text }}>{task.title}</strong>
          </p>
          <div>
            <label style={labelStyle}>{tx.field_issue_key || 'Jira issue key'}</label>
            <input
              type="text" value={issueKey}
              onChange={e => setIssueKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLink()}
              placeholder={tx.ph_issue_key || 'e.g. PROJ-123'}
              style={{ ...inputStyle, textTransform: 'uppercase' }}
              onFocus={e => e.target.style.borderColor = '#0052CC'}
              onBlur={e => e.target.style.borderColor = theme.borderMed}
              autoFocus
            />
          </div>
          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.6rem 0.875rem', backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA', borderRadius: '0.45rem',
            }}>
              <AlertCircle size={14} color="#DC2626" />
              <p style={{ fontSize: '0.78rem', color: '#DC2626' }}>{error}</p>
            </div>
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
            {tx.btn_cancel || 'Cancel'}
          </button>
          <button onClick={handleLink} disabled={saving} style={{
            padding: '0.5rem 1.25rem',
            backgroundColor: saving ? '#9CA3AF' : '#0052CC',
            color: 'white', border: 'none', borderRadius: '0.5rem',
            fontSize: '0.82rem', fontWeight: '600',
            cursor: saving ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.4rem',
          }}>
            {saving
              ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> {tx.linking || 'Linking…'}</>
              : <><Link2 size={14} /> {tx.btn_link || 'Link issue'}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Jira Page ─── */
function JiraPage() {
  const { theme } = useTheme();
  const inputStyle = { ...BASE_INPUT_STYLE, border: `1.5px solid ${theme.borderMed}`, backgroundColor: theme.inputBg, color: theme.text };
  const tx = useAutoT(STRINGS);

  const [jiraStatus, setJiraStatus] = useState(null);
  const [tasks, setTasks] = useState([]);
  const txData = useDynamicTranslation(tasks, extractJiraStrings, 'jira');
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | linked | unlinked
  const [search, setSearch] = useState('');
  const [refreshingId, setRefreshingId] = useState(null);
  const [unlinkingId, setUnlinkingId] = useState(null);
  const [createModal, setCreateModal] = useState(null); // task object
  const [linkModal, setLinkModal] = useState(null);     // task object
  const [toast, setToast] = useState(null);

  useEffect(() => {
    Promise.all([
      jiraService.getStatus(),
      taskService.getAllTasks().catch(() => taskService.getMyTasks()),
    ]).then(([status, taskList]) => {
      setJiraStatus(status || null);
      setTasks(Array.isArray(taskList) ? taskList : []);
      if (status?.connected) {
        jiraService.listProjects()
          .then(p => setProjects(p))
          .catch(() => {});
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleRefresh = async (task) => {
    setRefreshingId(task.id);
    try {
      const result = await jiraService.refreshStatus(task.id);
      setTasks(prev => prev.map(t => t.id === task.id
        ? { ...t, jiraIssueStatus: result.status }
        : t
      ));
      showToast(`Status synced: ${result.status}`);
    } catch (e) {
      showToast(e?.response?.data?.message || (tx.toast_ref_fail || 'Refresh failed.'), 'error');
    } finally {
      setRefreshingId(null);
    }
  };

  const handleUnlink = async (task) => {
    setUnlinkingId(task.id);
    try {
      await jiraService.unlinkIssue(task.id);
      setTasks(prev => prev.map(t => t.id === task.id
        ? { ...t, jiraIssueKey: null, jiraIssueUrl: null, jiraIssueStatus: null }
        : t
      ));
      showToast(tx.toast_unlinked || 'Issue unlinked.');
    } catch {
      showToast(tx.toast_unlink_fail || 'Unlink failed.', 'error');
    } finally {
      setUnlinkingId(null);
    }
  };

  const handleCreated = (taskId, result) => {
    setTasks(prev => prev.map(t => t.id === taskId
      ? { ...t, jiraIssueKey: result.issueKey, jiraIssueUrl: result.issueUrl, jiraIssueStatus: result.status }
      : t
    ));
    setCreateModal(null);
    showToast(`Issue ${result.issueKey} created!`);
  };

  const handleLinked = (taskId, result) => {
    setTasks(prev => prev.map(t => t.id === taskId
      ? { ...t, jiraIssueKey: result.issueKey, jiraIssueUrl: result.issueUrl, jiraIssueStatus: result.status }
      : t
    ));
    setLinkModal(null);
    showToast(`Linked to ${result.issueKey}`);
  };

  const filtered = tasks.filter(t => {
    if (filter === 'linked' && !t.jiraIssueKey) return false;
    if (filter === 'unlinked' && t.jiraIssueKey) return false;
    if (search && !t.title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const linkedCount = tasks.filter(t => t.jiraIssueKey).length;

  return (
    <PageWrapper title={tx.title || 'Jira Integration'} subtitle={tx.subtitle || 'Manage Jira issues linked to your PriorIT tasks'}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '1.5rem', right: '1.5rem',
          zIndex: 3000, maxWidth: '340px',
          padding: '0.875rem 1.25rem',
          backgroundColor: toast.type === 'success' ? '#F0FDF4' : '#FEF2F2',
          border: `1px solid ${toast.type === 'success' ? '#BBF7D0' : '#FECACA'}`,
          borderRadius: '0.75rem', boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
        }}>
          <CheckCircle2 size={16} color={toast.type === 'success' ? '#16A34A' : '#DC2626'} />
          <p style={{ fontSize: '0.85rem', fontWeight: '500', color: toast.type === 'success' ? '#16A34A' : '#DC2626' }}>
            {toast.message}
          </p>
        </div>
      )}

      {/* Modals */}
      {createModal && (
        <CreateIssueModal
          task={createModal}
          projects={projects}
          onClose={() => setCreateModal(null)}
          onCreate={handleCreated}
          tx={tx}
        />
      )}
      {linkModal && (
        <LinkIssueModal
          task={linkModal}
          onClose={() => setLinkModal(null)}
          onLink={handleLinked}
          tx={tx}
        />
      )}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '3rem', color: theme.textMuted }}>
          <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
          <span>{tx.loading || 'Loading Jira data…'}</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Connection status card */}
          <div style={{
            padding: '1.25rem 1.5rem',
            borderRadius: '0.75rem',
            border: `1.5px solid ${jiraStatus?.connected ? '#BAE6FD' : theme.border}`,
            backgroundColor: jiraStatus?.connected ? '#F0F9FF' : theme.hoverBg,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '0.625rem',
                backgroundColor: '#0052CC', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Link2 size={22} color="white" />
              </div>
              <div>
                {jiraStatus?.connected ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                      <p style={{ fontSize: '0.95rem', fontWeight: '700', color: theme.text }}>
                        {tx.connected_to || 'Connected to'} {jiraStatus.domain}
                      </p>
                      <span style={{
                        display: 'flex', alignItems: 'center', gap: '0.25rem',
                        fontSize: '0.68rem', fontWeight: '600',
                        backgroundColor: '#F0FDF4', color: '#16A34A',
                        padding: '0.15rem 0.5rem', borderRadius: '9999px',
                        border: '1px solid #BBF7D0',
                      }}>
                        <CheckCircle2 size={10} /> {tx.status_active || 'Active'}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: theme.textSub }}>
                      {jiraStatus.jiraEmail} · {linkedCount} {linkedCount !== 1 ? (tx.tasks_linked || 'tasks linked') : (tx.task_linked || 'task linked')}
                    </p>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: '0.95rem', fontWeight: '700', color: theme.textMed, marginBottom: '0.2rem' }}>
                      {tx.not_connected || 'Jira not connected'}
                    </p>
                    <p style={{ fontSize: '0.8rem', color: theme.textMuted }}>
                      {tx.not_conn_sub || 'Go to Settings → Connected Accounts to link your Jira account.'}
                    </p>
                  </>
                )}
              </div>
            </div>
            <a href="/settings" style={{
              padding: '0.5rem 1rem', borderRadius: '0.45rem',
              border: `1px solid ${theme.borderMed}`, backgroundColor: theme.cardBg,
              color: theme.textMed, fontSize: '0.78rem', fontWeight: '500',
              textDecoration: 'none', flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: '0.3rem',
            }}>
              {tx.manage_conn || 'Manage connection'}
            </a>
          </div>

          {/* Not connected prompt */}
          {!jiraStatus?.connected && (
            <div style={{
              padding: '3rem 2rem', textAlign: 'center',
              backgroundColor: theme.cardBg, borderRadius: '0.75rem',
              border: `1px solid ${theme.border}`,
            }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '1rem',
                backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1rem',
              }}>
                <Link2 size={24} color="#2563EB" />
              </div>
              <p style={{ fontSize: '1rem', fontWeight: '700', color: theme.text, marginBottom: '0.5rem' }}>
                {tx.connect_title || 'Connect your Jira account'}
              </p>
              <p style={{ fontSize: '0.85rem', color: theme.textSub, maxWidth: '360px', margin: '0 auto 1.5rem', lineHeight: '1.6' }}>
                {tx.connect_desc || 'Link your Atlassian account to create and track Jira issues directly from PriorIT tasks.'}
              </p>
              <a href="/settings" style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.6rem 1.5rem', borderRadius: '0.5rem',
                backgroundColor: '#0052CC', color: 'white',
                fontSize: '0.875rem', fontWeight: '600', textDecoration: 'none',
              }}>
                {tx.go_settings || 'Go to Settings'}
              </a>
            </div>
          )}

          {/* Task table — shown only when connected */}
          {jiraStatus?.connected && (
            <div style={{
              backgroundColor: theme.cardBg, borderRadius: '0.75rem',
              border: `1px solid ${theme.border}`, overflow: 'hidden',
            }}>
              {/* Toolbar */}
              <div style={{
                padding: '1rem 1.25rem',
                borderBottom: `1px solid ${theme.border}`,
                display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
              }}>
                {/* Search */}
                <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
                  <Search size={14} color="#9CA3AF" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text" value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={tx.ph_search || 'Search tasks…'}
                    style={{ ...inputStyle, paddingLeft: '2.25rem', padding: '0.5rem 1rem 0.5rem 2.25rem' }}
                  />
                </div>

                {/* Filter pills */}
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  {[
                    { key: 'all',      label: `${tx.filter_all || 'All'} (${tasks.length})` },
                    { key: 'linked',   label: `${tx.filter_linked || 'Linked'} (${linkedCount})` },
                    { key: 'unlinked', label: `${tx.filter_unlinked || 'Unlinked'} (${tasks.length - linkedCount})` },
                  ].map(f => (
                    <button key={f.key} onClick={() => setFilter(f.key)} style={{
                      padding: '0.4rem 0.875rem', borderRadius: '9999px',
                      border: `1.5px solid ${filter === f.key ? '#0052CC' : theme.borderMed}`,
                      backgroundColor: filter === f.key ? '#EBF4FF' : theme.cardBg,
                      color: filter === f.key ? '#0052CC' : theme.textSub,
                      fontSize: '0.78rem', fontWeight: '500', cursor: 'pointer',
                    }}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Column headers */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '2.5fr 100px 160px 120px 180px',
                padding: '0.65rem 1.25rem',
                backgroundColor: theme.hoverBg,
                borderBottom: `1px solid ${theme.border}`,
              }}>
                {[tx.col_task || 'Task', tx.col_priority || 'Priority', tx.col_jira || 'Jira Issue', tx.col_status || 'Status', tx.col_actions || 'Actions'].map(h => (
                  <span key={h} style={{
                    fontSize: '0.68rem', fontWeight: '600', color: theme.textMuted,
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>{h}</span>
                ))}
              </div>

              {/* Rows */}
              {filtered.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: theme.textMuted, fontSize: '0.875rem' }}>
                  {tx.no_tasks || 'No tasks match the current filter.'}
                </div>
              ) : (
                filtered.map((task, i) => {
                  const linked = !!task.jiraIssueKey;
                  const moscow = task.moscowLabel || 'COULD';
                  const ms = MOSCOW_STYLE[moscow] || MOSCOW_STYLE.COULD;
                  const js = JIRA_STATUS_COLOR(task.jiraIssueStatus);
                  const isRefreshing = refreshingId === task.id;
                  const isUnlinking = unlinkingId === task.id;

                  return (
                    <div key={task.id} style={{
                      display: 'grid',
                      gridTemplateColumns: '2.5fr 100px 160px 120px 180px',
                      padding: '0.875rem 1.25rem',
                      borderBottom: i < filtered.length - 1 ? `1px solid ${theme.border}` : 'none',
                      alignItems: 'center',
                    }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = theme.hoverBg}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {/* Task title */}
                      <div style={{ minWidth: 0, paddingRight: '1rem' }}>
                        <p style={{
                          fontSize: '0.85rem', fontWeight: '500', color: theme.text,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {txData?.[task.title] || task.title}
                        </p>
                        {task.type && (
                          <p style={{ fontSize: '0.72rem', color: theme.textMuted, marginTop: '0.15rem' }}>{txData?.[task.type] || task.type}</p>
                        )}
                      </div>

                      {/* MoSCoW */}
                      <div>
                        <span style={{
                          fontSize: '0.72rem', fontWeight: '600',
                          backgroundColor: ms.bg, color: ms.color,
                          padding: '0.15rem 0.5rem', borderRadius: '9999px',
                          border: `1px solid ${ms.border}`,
                        }}>
                          {moscow}
                        </span>
                      </div>

                      {/* Jira issue */}
                      <div>
                        {linked ? (
                          <a href={task.jiraIssueUrl} target="_blank" rel="noreferrer" style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                            fontSize: '0.8rem', fontWeight: '600', color: '#0052CC',
                            textDecoration: 'none',
                          }}>
                            {task.jiraIssueKey}
                            <ExternalLink size={11} />
                          </a>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: theme.borderMed }}>—</span>
                        )}
                      </div>

                      {/* Jira status */}
                      <div>
                        {linked && task.jiraIssueStatus ? (
                          <span style={{
                            fontSize: '0.72rem', fontWeight: '600',
                            backgroundColor: js.bg, color: js.color,
                            padding: '0.15rem 0.5rem', borderRadius: '9999px',
                          }}>
                            {task.jiraIssueStatus}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: theme.borderMed }}>—</span>
                        )}
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        {linked ? (
                          <>
                            <button
                              onClick={() => handleRefresh(task)}
                              disabled={isRefreshing}
                              title="Sync status from Jira"
                              style={{
                                display: 'flex', alignItems: 'center', gap: '0.25rem',
                                padding: '0.3rem 0.625rem', borderRadius: '0.375rem',
                                border: `1px solid ${theme.borderMed}`, backgroundColor: theme.cardBg,
                                color: theme.textMed, fontSize: '0.72rem', fontWeight: '500',
                                cursor: isRefreshing ? 'not-allowed' : 'pointer',
                                opacity: isRefreshing ? 0.6 : 1,
                              }}
                            >
                              <RefreshCw size={11} style={isRefreshing ? { animation: 'spin 1s linear infinite' } : {}} />
                              {tx.btn_sync || 'Sync'}
                            </button>
                            <button
                              onClick={() => handleUnlink(task)}
                              disabled={isUnlinking}
                              title="Unlink Jira issue"
                              style={{
                                display: 'flex', alignItems: 'center', gap: '0.25rem',
                                padding: '0.3rem 0.625rem', borderRadius: '0.375rem',
                                border: '1px solid #FECACA', backgroundColor: '#FEF2F2',
                                color: '#DC2626', fontSize: '0.72rem', fontWeight: '500',
                                cursor: isUnlinking ? 'not-allowed' : 'pointer',
                                opacity: isUnlinking ? 0.6 : 1,
                              }}
                            >
                              <Unlink size={11} />
                              {tx.btn_unlink || 'Unlink'}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => setCreateModal(task)}
                              title="Create new Jira issue"
                              style={{
                                display: 'flex', alignItems: 'center', gap: '0.25rem',
                                padding: '0.3rem 0.625rem', borderRadius: '0.375rem',
                                border: 'none', backgroundColor: '#0052CC',
                                color: 'white', fontSize: '0.72rem', fontWeight: '500',
                                cursor: 'pointer',
                              }}
                            >
                              <Plus size={11} />
                              {tx.btn_create_short || 'Create'}
                            </button>
                            <button
                              onClick={() => setLinkModal(task)}
                              title="Link existing Jira issue"
                              style={{
                                display: 'flex', alignItems: 'center', gap: '0.25rem',
                                padding: '0.3rem 0.625rem', borderRadius: '0.375rem',
                                border: `1px solid ${theme.borderMed}`, backgroundColor: theme.cardBg,
                                color: theme.textMed, fontSize: '0.72rem', fontWeight: '500',
                                cursor: 'pointer',
                              }}
                            >
                              <Link2 size={11} />
                              {tx.btn_link_short || 'Link'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {/* Footer count */}
              {filtered.length > 0 && (
                <div style={{
                  padding: '0.75rem 1.25rem',
                  borderTop: `1px solid ${theme.border}`,
                  backgroundColor: theme.hoverBg,
                }}>
                  <p style={{ fontSize: '0.75rem', color: theme.textMuted }}>
                    {tx.showing || 'Showing'} {filtered.length} {tx.of || 'of'} {tasks.length} task{tasks.length !== 1 ? 's' : ''}
                    {linkedCount > 0 && ` · ${linkedCount} ${tx.linked_to_jira || 'linked to Jira'}`}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </PageWrapper>
  );
}

export default JiraPage;
