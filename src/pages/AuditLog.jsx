import { useState, useEffect, useMemo } from 'react';
import { ClipboardCheck, RefreshCw, Search, Filter, User, AlertCircle } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import auditService from '../services/auditService';
import { useAutoT, useDynamicTranslation } from '../i18n/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

const STRINGS = {
  page_title:      'Audit Trail',
  page_subtitle:   'Complete history of all system actions — last 200 entries',
  action_submitted:'Task Submitted',
  action_scored:   'AI Scored',
  action_override: 'Override Applied',
  action_deleted:  'Task Deleted',
  filter_all_time: 'All time',
  filter_today:    'Today',
  filter_week:     'This week',
  filter_month:    'This month',
  search_ph:       'Search by user, task, or details…',
  all_actions:     'All actions',
  col_timestamp:   'Timestamp',
  col_action:      'Action',
  col_user:        'User',
  col_details:     'Details',
  col_task:        'Task',
  loading:         'Loading audit log…',
  no_entries:      'No entries found',
  adjust_filters:  'Try adjusting your filters.',
  empty_note:      'Actions will appear here once users start working.',
  refresh:         'Refresh',
  showing:         'Showing',
  of:              'of',
  entries:         'entries',
  footer_note:     'Last 200 entries · most recent first',
  deleted:         'deleted',
};

const extractAuditStrings = (items) => [
  ...new Set(items.flatMap(item => [item.taskTitle, item.payload].filter(Boolean)))
];

function formatTimestamp(iso) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffH < 24) return `${diffH}h ago`;
  if (diffD < 7) return `${diffD}d ago`;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatAbsolute(iso) {
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function ActionBadge({ action, tx }) {
  const META = {
    TASK_SUBMITTED:   { label: tx.action_submitted, bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
    AI_SCORED:        { label: tx.action_scored,    bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' },
    OVERRIDE_APPLIED: { label: tx.action_override,  bg: '#FFF7ED', color: '#D97706', border: '#FDE68A' },
    TASK_DELETED:     { label: tx.action_deleted,   bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
  };
  const meta = META[action] || { label: action, bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' };
  return (
    <span style={{ fontSize: '0.7rem', fontWeight: '600', backgroundColor: meta.bg, color: meta.color, border: `1px solid ${meta.border}`, padding: '0.2rem 0.55rem', borderRadius: '9999px', whiteSpace: 'nowrap', display: 'inline-block' }}>
      {meta.label}
    </span>
  );
}

function AuditLog() {
  const { theme } = useTheme();
  const tx = useAutoT(STRINGS);
  const [logs, setLogs] = useState([]);
  const txData = useDynamicTranslation(logs, extractAuditStrings, 'audit');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  const DATE_FILTERS = [
    { value: 'all',   label: tx.filter_all_time },
    { value: 'today', label: tx.filter_today },
    { value: 'week',  label: tx.filter_week },
    { value: 'month', label: tx.filter_month },
  ];

  const load = async () => {
    setIsLoading(true); setError('');
    try { setLogs(await auditService.getAll()); }
    catch { setError('Failed to load audit log.'); }
    finally { setIsLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const actionTypes = useMemo(() => [...new Set(logs.map(l => l.action))], [logs]);

  const filtered = useMemo(() => {
    const now = new Date();
    return logs.filter(log => {
      if (actionFilter !== 'all' && log.action !== actionFilter) return false;
      if (dateFilter !== 'all') {
        const d = new Date(log.loggedAt);
        if (dateFilter === 'today' && d.toDateString() !== now.toDateString()) return false;
        if (dateFilter === 'week' && now - d > 7 * 86400000) return false;
        if (dateFilter === 'month' && now - d > 30 * 86400000) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        return log.userName?.toLowerCase().includes(q) || log.taskTitle?.toLowerCase().includes(q) || log.payload?.toLowerCase().includes(q) || log.action?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [logs, actionFilter, dateFilter, search]);

  return (
    <PageWrapper title={tx.page_title} subtitle={tx.page_subtitle}>
      {error && (
        <div style={{ padding: '1rem', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '0.75rem', marginBottom: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <AlertCircle size={16} color="#DC2626" />
          <p style={{ color: '#DC2626', fontSize: '0.875rem' }}>{error}</p>
        </div>
      )}

      {/* Filters bar */}
      <div style={{ backgroundColor: theme.cardBg, borderRadius: '0.75rem', border: `1px solid ${theme.border}`, padding: '1rem 1.25rem', marginBottom: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
          <Search size={14} color={theme.textMuted} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input type="text" placeholder={tx.search_ph} value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.25rem', border: `1.5px solid ${theme.borderMed}`, borderRadius: '0.5rem', fontSize: '0.825rem', outline: 'none', boxSizing: 'border-box', backgroundColor: theme.inputBg, color: theme.text }}
            onFocus={e => e.target.style.borderColor = '#CC2027'} onBlur={e => e.target.style.borderColor = theme.borderMed} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Filter size={13} color={theme.textMuted} />
          <select value={actionFilter} onChange={e => setActionFilter(e.target.value)}
            style={{ padding: '0.5rem 0.75rem', border: `1.5px solid ${theme.borderMed}`, borderRadius: '0.5rem', fontSize: '0.825rem', backgroundColor: theme.inputBg, color: theme.textMed, outline: 'none', cursor: 'pointer' }}>
            <option value="all">{tx.all_actions}</option>
            {actionTypes.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '0.35rem' }}>
          {DATE_FILTERS.map(f => (
            <button key={f.value} onClick={() => setDateFilter(f.value)}
              style={{ padding: '0.4rem 0.8rem', borderRadius: '0.4rem', border: `1.5px solid ${dateFilter === f.value ? '#CC2027' : theme.borderMed}`, backgroundColor: dateFilter === f.value ? '#FEF2F2' : theme.cardBg, color: dateFilter === f.value ? '#CC2027' : theme.textSub, fontSize: '0.78rem', fontWeight: dateFilter === f.value ? '600' : '400', cursor: 'pointer' }}>
              {f.label}
            </button>
          ))}
        </div>

        <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.875rem', backgroundColor: theme.cardBg, border: `1.5px solid ${theme.borderMed}`, borderRadius: '0.5rem', fontSize: '0.78rem', color: theme.textSub, cursor: 'pointer', marginLeft: 'auto' }}>
          <RefreshCw size={13} /> {tx.refresh}
        </button>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: theme.cardBg, borderRadius: '0.75rem', border: `1px solid ${theme.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '140px 160px 200px 1fr 160px', padding: '0.75rem 1.5rem', backgroundColor: theme.hoverBg, borderBottom: `1px solid ${theme.border}` }}>
          {[tx.col_timestamp, tx.col_action, tx.col_user, tx.col_details, tx.col_task].map(h => (
            <span key={h} style={{ fontSize: '0.68rem', fontWeight: '600', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
          ))}
        </div>

        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: theme.textMuted }}>
            <p style={{ fontSize: '0.875rem' }}>{tx.loading}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <ClipboardCheck size={28} color={theme.borderMed} style={{ marginBottom: '0.75rem' }} />
            <p style={{ fontSize: '0.875rem', fontWeight: '500', color: theme.textMed, marginBottom: '0.25rem' }}>{tx.no_entries}</p>
            <p style={{ fontSize: '0.78rem', color: theme.textMuted }}>
              {search || actionFilter !== 'all' || dateFilter !== 'all' ? tx.adjust_filters : tx.empty_note}
            </p>
          </div>
        ) : (
          filtered.map((log, index) => (
            <div key={log.id}
              style={{ display: 'grid', gridTemplateColumns: '140px 160px 200px 1fr 160px', padding: '0.875rem 1.5rem', borderBottom: index < filtered.length - 1 ? `1px solid ${theme.border}` : 'none', alignItems: 'center' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = theme.hoverBg}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div title={log.loggedAt ? formatAbsolute(log.loggedAt) : ''}>
                <p style={{ fontSize: '0.8rem', color: theme.textMed, fontWeight: '500' }}>{log.loggedAt ? formatTimestamp(log.loggedAt) : '—'}</p>
                <p style={{ fontSize: '0.68rem', color: theme.textMuted, marginTop: '0.1rem' }}>{log.loggedAt ? formatAbsolute(log.loggedAt) : ''}</p>
              </div>
              <div><ActionBadge action={log.action} tx={tx} /></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#1A1A2E', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {log.userName ? <span style={{ color: '#CC2027', fontSize: '0.7rem', fontWeight: '700' }}>{log.userName.charAt(0).toUpperCase()}</span> : <User size={12} color={theme.textSub} />}
                </div>
                <span style={{ fontSize: '0.8rem', color: theme.textMed, fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.userName || '—'}</span>
              </div>
              <span style={{ fontSize: '0.78rem', color: theme.textSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '1rem' }} title={log.payload}>
                {log.payload ? (txData?.[log.payload] || log.payload) : '—'}
              </span>
              <span style={{ fontSize: '0.78rem', color: log.taskTitle ? theme.textMed : theme.borderMed, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontStyle: log.taskTitle ? 'normal' : 'italic' }}>
                {log.taskTitle ? (txData?.[log.taskTitle] || log.taskTitle) : tx.deleted}
              </span>
            </div>
          ))
        )}

        {!isLoading && filtered.length > 0 && (
          <div style={{ padding: '0.75rem 1.5rem', borderTop: `1px solid ${theme.border}`, backgroundColor: theme.hoverBg, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: '0.72rem', color: theme.textMuted }}>
              {tx.showing} <strong style={{ color: theme.textMed }}>{filtered.length}</strong> {tx.of} <strong style={{ color: theme.textMed }}>{logs.length}</strong> {tx.entries}
            </p>
            <p style={{ fontSize: '0.72rem', color: theme.textMuted }}>{tx.footer_note}</p>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}

export default AuditLog;
