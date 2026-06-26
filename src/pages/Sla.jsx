import { useState, useEffect, useMemo } from 'react';
import { RefreshCw, AlertCircle, Calendar, CheckCircle, Clock, Edit2, X, Check } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import slaService from '../services/slaService';
import useAuthStore from '../store/authStore';
import { useAutoT, useDynamicTranslation } from '../i18n/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

// ── Strings ───────────────────────────────────────────────────────────────────

const STRINGS = {
  page_title:      'SLA & Deadlines',
  page_subtitle:   'Monitor task deadlines and delivery compliance',
  s_overdue:       'Overdue',
  s_at_risk:       'At Risk',
  s_on_track:      'On Track',
  s_completed:     'Completed',
  s_no_sla:        'No SLA',
  r_developer:     'Developer',
  r_product:       'Product',
  r_manager:       'Manager',
  r_admin:         'Admin',
  set_deadline:    'Set deadline',
  days_overdue:    'days overdue',
  day_overdue:     'day overdue',
  due_today:       'Due today',
  days_remaining:  'days remaining',
  day_remaining:   'day remaining',
  subtasks:        'subtasks',
  filter_all:      'All',
  refresh:         'Refresh',
  no_workplaces:   'No workplaces found',
  no_wp_sub:       'Generate workplaces from the Backlog to start tracking SLAs.',
  no_filter:       'Try switching to a different filter.',
};

// ── SLA config ────────────────────────────────────────────────────────────────

function getSLA(tx) {
  return {
    OVERDUE:   { label: tx.s_overdue,   color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', dot: '#EF4444' },
    AT_RISK:   { label: tx.s_at_risk,   color: '#D97706', bg: '#FFF7ED', border: '#FDE68A', dot: '#F59E0B' },
    ON_TRACK:  { label: tx.s_on_track,  color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0', dot: '#22C55E' },
    COMPLETED: { label: tx.s_completed, color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', dot: '#3B82F6' },
    NO_SLA:    { label: tx.s_no_sla,    color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB', dot: '#9CA3AF' },
  };
}

const STATUS_KEYS = ['OVERDUE', 'AT_RISK', 'ON_TRACK', 'NO_SLA', 'COMPLETED'];

const extractSlaStrings = (items) => [
  ...new Set(items.flatMap(item => [item.taskTitle, item.taskType].filter(Boolean)))
];

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ name, size = 28 }) {
  const colors = ['#CC2027', '#1A1A2E', '#2563EB', '#7C3AED', '#D97706', '#16A34A'];
  const idx = (name?.charCodeAt(0) ?? 0) % colors.length;
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', backgroundColor: colors[idx], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ color: 'white', fontSize: size * 0.4, fontWeight: '700' }}>{name?.charAt(0)?.toUpperCase() ?? '?'}</span>
    </div>
  );
}

// ── Inline deadline editor ────────────────────────────────────────────────────

function DeadlineEditor({ item, isManager, onSaved, tx }) {
  const { theme } = useTheme();
  const [editing, setEditing] = useState(false);
  const [value, setValue]     = useState(item.dueDate ?? '');
  const [saving, setSaving]   = useState(false);

  const save = async () => {
    setSaving(true);
    try { await slaService.setDeadline(item.workplaceId, value); onSaved(item.workplaceId, value || null); setEditing(false); }
    catch { /* silent */ }
    setSaving(false);
  };

  if (!isManager) {
    return item.dueDate
      ? <span style={{ fontSize: '0.78rem', fontWeight: '600', color: theme.textMed }}>{new Date(item.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
      : <span style={{ fontSize: '0.75rem', color: theme.textMuted }}>—</span>;
  }

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)}
        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.6rem', borderRadius: '0.4rem', border: `1.5px dashed ${theme.borderMed}`, backgroundColor: 'transparent', cursor: 'pointer', fontSize: '0.75rem', color: item.dueDate ? theme.textMed : theme.textMuted, fontWeight: item.dueDate ? '600' : '400', transition: 'all 0.15s' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#CC2027'; e.currentTarget.style.color = '#CC2027'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = theme.borderMed; e.currentTarget.style.color = item.dueDate ? theme.textMed : theme.textMuted; }}>
        <Calendar size={11} />
        {item.dueDate ? new Date(item.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : tx.set_deadline}
        <Edit2 size={10} />
      </button>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
      <input type="date" value={value} onChange={e => setValue(e.target.value)} style={{ padding: '0.25rem 0.5rem', borderRadius: '0.4rem', border: '1.5px solid #CC2027', fontSize: '0.75rem', color: theme.text, backgroundColor: theme.inputBg, outline: 'none' }} />
      <button onClick={save} disabled={saving} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: '50%', border: 'none', backgroundColor: '#16A34A', cursor: 'pointer' }}><Check size={12} color="white" /></button>
      <button onClick={() => { setEditing(false); setValue(item.dueDate ?? ''); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: '50%', border: 'none', backgroundColor: theme.tagBg, cursor: 'pointer' }}><X size={12} color={theme.textSub} /></button>
    </div>
  );
}

// ── Row card ──────────────────────────────────────────────────────────────────

function SlaRow({ item, isManager, onDeadlineSaved, tx, SLA, txData }) {
  const { theme } = useTheme();
  const sla = SLA[item.slaStatus] || SLA.NO_SLA;
  const pct = item.progressPercent ?? 0;

  const daysLabel = () => {
    if (item.slaStatus === 'COMPLETED' || item.daysRemaining == null) return null;
    const d = item.daysRemaining;
    if (d < 0)  return `${Math.abs(d)} ${Math.abs(d) !== 1 ? tx.days_overdue : tx.day_overdue}`;
    if (d === 0) return tx.due_today;
    return `${d} ${d !== 1 ? tx.days_remaining : tx.day_remaining}`;
  };
  const dl = daysLabel();

  const roleMap = { DEVELOPER: tx.r_developer, PRODUCT_TEAM: tx.r_product, IT_MANAGER: tx.r_manager, ADMIN: tx.r_admin };

  return (
    <div style={{ backgroundColor: theme.cardBg, border: `1px solid ${item.slaStatus === 'OVERDUE' ? '#FECACA' : theme.border}`, borderLeft: `4px solid ${sla.dot}`, borderRadius: '0.625rem', padding: '1rem 1.125rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', transition: 'box-shadow 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 3px 10px rgba(0,0,0,0.08)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; }}>

      <span style={{ fontSize: '0.65rem', fontWeight: '800', padding: '0.2rem 0.6rem', borderRadius: '9999px', backgroundColor: sla.bg, color: sla.color, border: `1px solid ${sla.border}`, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
        {sla.label}
      </span>

      <div style={{ flex: 2, minWidth: '160px' }}>
        <p style={{ fontWeight: '700', fontSize: '0.875rem', color: theme.text, marginBottom: '0.15rem' }}>{txData?.[item.taskTitle] || item.taskTitle}</p>
        {item.taskType && <span style={{ fontSize: '0.65rem', color: theme.textSub, fontWeight: '500' }}>{txData?.[item.taskType] || item.taskType}</span>}
      </div>

      {item.assigneeName && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: '110px' }}>
          <Avatar name={item.assigneeName} size={24} />
          <div>
            <p style={{ fontSize: '0.72rem', fontWeight: '600', color: theme.textMed }}>{item.assigneeName.split(' ')[0]}</p>
            {item.assigneeRole && <p style={{ fontSize: '0.62rem', color: theme.textMuted }}>{roleMap[item.assigneeRole] ?? item.assigneeRole}</p>}
          </div>
        </div>
      )}

      <div style={{ minWidth: '130px', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
          <span style={{ fontSize: '0.65rem', color: theme.textMuted }}>{item.doneSubtasks}/{item.totalSubtasks} {tx.subtasks}</span>
          <span style={{ fontSize: '0.65rem', fontWeight: '700', color: pct >= 70 ? '#16A34A' : pct >= 35 ? '#D97706' : theme.textSub }}>{pct}%</span>
        </div>
        <div style={{ height: '5px', backgroundColor: theme.tagBg, borderRadius: '9999px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, backgroundColor: pct >= 70 ? '#16A34A' : pct >= 35 ? '#D97706' : '#3B82F6', borderRadius: '9999px', transition: 'width 0.4s ease' }} />
        </div>
      </div>

      <div style={{ minWidth: '160px' }}>
        <DeadlineEditor item={item} isManager={isManager} onSaved={onDeadlineSaved} tx={tx} />
      </div>

      {dl && (
        <span style={{ fontSize: '0.72rem', fontWeight: '700', color: sla.color, backgroundColor: sla.bg, border: `1px solid ${sla.border}`, padding: '0.2rem 0.6rem', borderRadius: '9999px', whiteSpace: 'nowrap' }}>
          <Clock size={10} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
          {dl}
        </span>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SlaPage() {
  const { user } = useAuthStore();
  const tx = useAutoT(STRINGS);
  const { theme } = useTheme();
  const SLA = useMemo(() => getSLA(tx), [tx.s_overdue, tx.s_at_risk, tx.s_on_track, tx.s_completed, tx.s_no_sla]);
  const isManager = user?.role === 'IT_MANAGER' || user?.role === 'ADMIN';

  const [items, setItems]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [refreshing, setRefreshing]   = useState(false);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const txData = useDynamicTranslation(items, extractSlaStrings, 'sla');

  const load = async () => {
    try { setItems(await slaService.getAll() || []); setError(''); }
    catch (e) { setError(e?.response?.data?.message || 'Failed to load SLA data.'); }
  };
  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, []);
  const handleRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleDeadlineSaved = (workplaceId, dueDate) => {
    setItems(prev => prev.map(it => {
      if (it.workplaceId !== workplaceId) return it;
      const today = new Date().toISOString().split('T')[0];
      let slaStatus = it.slaStatus, daysRemaining = it.daysRemaining;
      if (it.workplaceStatus !== 'COMPLETED') {
        if (!dueDate) { slaStatus = 'NO_SLA'; daysRemaining = null; }
        else {
          const diff = Math.floor((new Date(dueDate) - new Date(today)) / 86400000);
          daysRemaining = diff;
          slaStatus = diff < 0 ? 'OVERDUE' : diff <= 3 ? 'AT_RISK' : 'ON_TRACK';
        }
      }
      return { ...it, dueDate: dueDate || null, slaStatus, daysRemaining };
    }));
  };

  const filtered = useMemo(() => {
    const list = activeFilter === 'ALL' ? items : items.filter(i => i.slaStatus === activeFilter);
    return [...list].sort((a, b) => {
      const order = { OVERDUE: 0, AT_RISK: 1, ON_TRACK: 2, NO_SLA: 3, COMPLETED: 4 };
      return (order[a.slaStatus] ?? 5) - (order[b.slaStatus] ?? 5);
    });
  }, [items, activeFilter]);

  const counts = useMemo(() => {
    const c = { OVERDUE: 0, AT_RISK: 0, ON_TRACK: 0, NO_SLA: 0, COMPLETED: 0 };
    items.forEach(i => { if (c[i.slaStatus] !== undefined) c[i.slaStatus]++; });
    return c;
  }, [items]);

  const FILTER_LIST = ['ALL', ...STATUS_KEYS];

  return (
    <PageWrapper title={tx.page_title} subtitle={tx.page_subtitle}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Summary strip */}
      {!loading && items.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
          {[
            { key: 'OVERDUE',   icon: AlertCircle },
            { key: 'AT_RISK',   icon: Clock },
            { key: 'ON_TRACK',  icon: CheckCircle },
            { key: 'COMPLETED', icon: CheckCircle },
            { key: 'NO_SLA',    icon: Calendar },
          ].map(({ key, icon: Icon }) => {
            const sla = SLA[key];
            return (
              <div key={key} onClick={() => setActiveFilter(activeFilter === key ? 'ALL' : key)}
                style={{ padding: '0.875rem 1rem', borderRadius: '0.625rem', backgroundColor: activeFilter === key ? sla.bg : theme.cardBg, border: `1.5px solid ${activeFilter === key ? sla.border : theme.border}`, cursor: 'pointer', transition: 'all 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = sla.border; e.currentTarget.style.backgroundColor = sla.bg; }}
                onMouseLeave={e => { if (activeFilter !== key) { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.backgroundColor = theme.cardBg; } }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                  <Icon size={13} color={sla.color} />
                  <span style={{ fontSize: '0.65rem', fontWeight: '600', color: sla.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{sla.label}</span>
                </div>
                <p style={{ fontSize: '1.5rem', fontWeight: '800', color: sla.color }}>{counts[key]}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Filter tabs + refresh */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.2rem', backgroundColor: theme.tagBg, borderRadius: '0.5rem', padding: '0.2rem' }}>
          {FILTER_LIST.map(f => {
            const label = f === 'ALL' ? tx.filter_all : (SLA[f]?.label ?? f);
            const active = activeFilter === f;
            return (
              <button key={f} onClick={() => setActiveFilter(f)}
                style={{ padding: '0.3rem 0.7rem', borderRadius: '0.35rem', border: 'none', cursor: 'pointer', fontSize: '0.72rem', fontWeight: '600', backgroundColor: active ? theme.cardBg : 'transparent', color: active ? (SLA[f]?.color ?? theme.text) : theme.textSub, boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                {label}
                {f !== 'ALL' && counts[f] > 0 && (
                  <span style={{ marginLeft: '0.3rem', fontSize: '0.65rem', fontWeight: '800', backgroundColor: active ? (SLA[f]?.bg ?? theme.tagBg) : theme.tagBg, color: active ? (SLA[f]?.color ?? theme.textMed) : theme.textSub, padding: '0.05rem 0.35rem', borderRadius: '9999px' }}>{counts[f]}</span>
                )}
              </button>
            );
          })}
        </div>

        <button onClick={handleRefresh} disabled={refreshing} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.875rem', borderRadius: '0.5rem', border: `1.5px solid ${theme.borderMed}`, backgroundColor: theme.cardBg, color: theme.textSub, fontSize: '0.8rem', fontWeight: '500', cursor: refreshing ? 'not-allowed' : 'pointer', opacity: refreshing ? 0.6 : 1 }}>
          <RefreshCw size={13} style={refreshing ? { animation: 'spin 1s linear infinite' } : {}} />
          {tx.refresh}
        </button>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1rem', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '0.625rem', marginBottom: '1rem' }}>
          <AlertCircle size={16} color="#DC2626" />
          <p style={{ color: '#DC2626', fontSize: '0.825rem' }}>{error}</p>
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
          <RefreshCw size={24} color="#CC2027" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', backgroundColor: theme.cardBg, borderRadius: '0.875rem', border: `1px solid ${theme.border}` }}>
          <Calendar size={36} color={theme.borderMed} style={{ marginBottom: '0.75rem' }} />
          <p style={{ fontWeight: '700', color: theme.textMed, marginBottom: '0.35rem' }}>
            {activeFilter === 'ALL' ? tx.no_workplaces : `${SLA[activeFilter]?.label ?? activeFilter}`}
          </p>
          <p style={{ color: theme.textMuted, fontSize: '0.875rem' }}>
            {activeFilter === 'ALL' ? tx.no_wp_sub : tx.no_filter}
          </p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {filtered.map(item => (
            <SlaRow key={item.workplaceId} item={item} isManager={isManager} onDeadlineSaved={handleDeadlineSaved} tx={tx} SLA={SLA} txData={txData} />
          ))}
        </div>
      )}
    </PageWrapper>
  );
}
