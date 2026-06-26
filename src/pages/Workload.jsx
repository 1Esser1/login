import { useState, useEffect, useMemo } from 'react';
import { RefreshCw, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import sprintService from '../services/sprintService';
import { useAutoT, useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { translateBatch } from '../i18n/translateService';

const STRINGS = {
  page_title:     'Team Workload',
  page_subtitle:  'Active sprint workload across the team',
  available:      'No workload',
  light:          'Light load',
  moderate:       'Moderate load',
  heavy:          'Heavy load',
  low:            'Low priority',
  med:            'Medium priority',
  high:           'High priority',
  all:            'All Teams',
  developer:      'IT Developer',
  product:        'Product Team',
  refresh:        'Refresh',
  no_subtasks:    'No active subtasks',
  ready:          'Ready for new tasks',
  est_hours:      'Estimated hours',
  to_do:          'To Do',
  in_progress:    'In Progress',
  done:           'Done',
  active_sub_s:   'active subtask',
  active_sub_pl:  'active subtasks',
  no_members:     'No team members found',
  no_members_sub: 'Approve some Developer or Product Team accounts first.',
};

function getLoad(hours, tx) {
  if (hours === 0)  return { label: tx.available, color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0', dot: '#22C55E' };
  if (hours < 20)   return { label: tx.light,     color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', dot: '#3B82F6' };
  if (hours < 35)   return { label: tx.moderate,  color: '#D97706', bg: '#FFF7ED', border: '#FDE68A', dot: '#F59E0B' };
  return            { label: tx.heavy,     color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', dot: '#EF4444' };
}

function getComplexityStyle(key, tx) {
  const map = {
    LOW:    { label: tx.low,  bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0' },
    MEDIUM: { label: tx.med,  bg: '#FFF7ED', color: '#D97706', border: '#FDE68A' },
    HIGH:   { label: tx.high, bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
  };
  return map[key];
}

const CAPACITY = 40;

function Avatar({ name, photoPath, size = 44 }) {
  const colors = ['#CC2027', '#1A1A2E', '#2563EB', '#7C3AED', '#D97706', '#16A34A'];
  const idx = (name?.charCodeAt(0) ?? 0) % colors.length;
  if (photoPath) {
    return <img src={`http://localhost:8080/${photoPath}`} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', backgroundColor: colors[idx], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ color: 'white', fontSize: size * 0.38, fontWeight: '700' }}>{name?.charAt(0)?.toUpperCase() ?? '?'}</span>
    </div>
  );
}

function MemberCard({ member, tx, txTitles }) {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const load = getLoad(member.totalEstimatedHours, tx);
  const barPct = Math.min((member.totalEstimatedHours / CAPACITY) * 100, 100);
  const totalActive = member.todoCount + member.inProgressCount + member.doneCount;

  const ROLE_LABELS = { DEVELOPER: tx.developer, PRODUCT_TEAM: tx.product };

  return (
    <div style={{ backgroundColor: theme.cardBg, border: `1px solid ${load.border}`, borderRadius: '0.875rem', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      <div style={{ padding: '1rem 1.125rem', borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
        <Avatar name={member.name} photoPath={member.photoPath} size={44} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
            <p style={{ fontWeight: '700', fontSize: '0.9rem', color: theme.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.name}</p>
            <span style={{ fontSize: '0.65rem', fontWeight: '800', padding: '0.2rem 0.55rem', borderRadius: '9999px', backgroundColor: load.bg, color: load.color, border: `1px solid ${load.border}`, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{load.label}</span>
          </div>
          <p style={{ fontSize: '0.72rem', color: theme.textMuted, marginTop: '0.1rem' }}>{ROLE_LABELS[member.role] ?? member.role}</p>
        </div>
      </div>

      <div style={{ padding: '1rem 1.125rem' }}>
        {totalActive === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.25rem 0', color: '#16A34A' }}>
            <div style={{ fontSize: '1.6rem', marginBottom: '0.35rem' }}>✓</div>
            <p style={{ fontWeight: '600', fontSize: '0.85rem' }}>{tx.no_subtasks}</p>
            <p style={{ fontSize: '0.75rem', color: theme.textSub, marginTop: '0.2rem' }}>{tx.ready}</p>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.72rem', color: theme.textSub, fontWeight: '500' }}>{tx.est_hours}</span>
                <span style={{ fontSize: '0.78rem', fontWeight: '800', color: load.color }}>
                  {member.totalEstimatedHours}h<span style={{ fontWeight: '400', color: theme.textMuted, fontSize: '0.68rem' }}> / ~{CAPACITY}h</span>
                </span>
              </div>
              <div style={{ height: '8px', backgroundColor: theme.tagBg, borderRadius: '9999px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${barPct}%`, backgroundColor: load.color, borderRadius: '9999px', transition: 'width 0.5s ease' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.875rem', flexWrap: 'wrap' }}>
              {[
                { label: tx.to_do,      value: member.todoCount,       color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
                { label: tx.in_progress,value: member.inProgressCount, color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
                { label: tx.done,       value: member.doneCount,       color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.6rem', backgroundColor: s.bg, border: `1px solid ${s.border}`, borderRadius: '9999px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: '800', color: s.color }}>{s.value}</span>
                  <span style={{ fontSize: '0.65rem', color: s.color, fontWeight: '500' }}>{s.label}</span>
                </div>
              ))}
            </div>

            {(member.lowCount > 0 || member.mediumCount > 0 || member.highCount > 0) && (
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {[{ key: 'LOW', count: member.lowCount }, { key: 'MEDIUM', count: member.mediumCount }, { key: 'HIGH', count: member.highCount }].filter(c => c.count > 0).map(c => {
                  const s = getComplexityStyle(c.key, tx);
                  return (
                    <span key={c.key} style={{ fontSize: '0.65rem', fontWeight: '700', padding: '0.15rem 0.5rem', borderRadius: '9999px', border: `1px solid ${s.border}`, backgroundColor: s.bg, color: s.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {s.label} ×{c.count}
                    </span>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {totalActive > 0 && (
        <>
          <button onClick={() => setExpanded(v => !v)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 1.125rem', borderTop: `1px solid ${theme.border}`, border: 'none', backgroundColor: expanded ? theme.hoverBg : theme.cardBg, cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600', color: theme.textSub, transition: 'background-color 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = theme.tagBg; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = expanded ? theme.hoverBg : theme.cardBg; }}>
            <span>{totalActive} {totalActive !== 1 ? tx.active_sub_pl : tx.active_sub_s}</span>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {expanded && (
            <div style={{ borderTop: `1px solid ${theme.border}`, maxHeight: '220px', overflowY: 'auto' }}>
              {member.activeSubtasks.map(s => {
                const cx = getComplexityStyle(s.complexity, tx);
                return (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '0.55rem 1.125rem', borderBottom: `1px solid ${theme.border}`, gap: '0.5rem' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '0.775rem', color: theme.textMed, fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{txTitles[s.title] || s.title}</p>
                      <p style={{ fontSize: '0.65rem', color: theme.textMuted, marginTop: '0.1rem' }}>{txTitles[s.taskTitle] || s.taskTitle}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                      {cx && <span style={{ fontSize: '0.6rem', fontWeight: '700', padding: '0.1rem 0.35rem', borderRadius: '9999px', border: `1px solid ${cx.border}`, backgroundColor: cx.bg, color: cx.color, textTransform: 'uppercase' }}>{cx.label}</span>}
                      {s.estimatedHours != null && <span style={{ fontSize: '0.65rem', color: theme.textMuted, fontWeight: '500' }}>{s.estimatedHours}h</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function WorkloadPage() {
  const tx = useAutoT(STRINGS);
  const { language } = useLanguage();
  const { theme } = useTheme();
  const [members, setMembers]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [refreshing, setRefreshing]   = useState(false);
  const [roleFilter, setRoleFilter]   = useState('ALL');
  const [txTitles, setTxTitles]       = useState({});

  const load = async () => {
    try { setMembers((await sprintService.getWorkload()).members || []); setError(''); }
    catch (e) { setError(e?.response?.data?.message || 'Failed to load workload data.'); }
  };
  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, []);

  useEffect(() => {
    if (!members.length || language === 'en') { setTxTitles({}); return; }
    const allTitles = [];
    members.forEach(m => m.activeSubtasks?.forEach(s => {
      if (s.title    && !allTitles.includes(s.title))    allTitles.push(s.title);
      if (s.taskTitle && !allTitles.includes(s.taskTitle)) allTitles.push(s.taskTitle);
    }));
    if (!allTitles.length) return;
    const cacheKey = `priorit_subtask_tx_${language}`;
    let cached = {};
    try { cached = JSON.parse(localStorage.getItem(cacheKey) || '{}'); } catch {}
    const needed = allTitles.filter(t => !cached[t]);
    if (!needed.length) { setTxTitles(cached); return; }
    setTxTitles(cached);
    translateBatch(needed, language).then(translated => {
      const updated = { ...cached };
      needed.forEach((t, i) => { updated[t] = translated[i] || t; });
      localStorage.setItem(cacheKey, JSON.stringify(updated));
      setTxTitles({ ...updated });
    });
  }, [members, language]);
  const handleRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const visible = useMemo(() => {
    const filtered = roleFilter === 'ALL' ? members : members.filter(m => m.role === roleFilter);
    return [...filtered].sort((a, b) => b.totalEstimatedHours - a.totalEstimatedHours);
  }, [members, roleFilter]);

  const available = members.filter(m => m.totalEstimatedHours === 0).length;
  const light     = members.filter(m => m.totalEstimatedHours > 0 && m.totalEstimatedHours < 20).length;
  const moderate  = members.filter(m => m.totalEstimatedHours >= 20 && m.totalEstimatedHours < 35).length;
  const heavy     = members.filter(m => m.totalEstimatedHours >= 35).length;

  return (
    <PageWrapper title={tx.page_title} subtitle={tx.page_subtitle}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        {!loading && members.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {[
              { label: tx.available, value: available, color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
              { label: tx.light,     value: light,     color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
              { label: tx.moderate,  value: moderate,  color: '#D97706', bg: '#FFF7ED', border: '#FDE68A' },
              { label: tx.heavy,     value: heavy,     color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
            ].filter(s => s.value > 0).map(s => (
              <span key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.7rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600', backgroundColor: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                <span style={{ fontWeight: '800' }}>{s.value}</span> {s.label}
              </span>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '0.2rem', backgroundColor: theme.tagBg, borderRadius: '0.5rem', padding: '0.2rem' }}>
            {[
              { key: 'ALL',          label: tx.all },
              { key: 'DEVELOPER',    label: tx.developer },
              { key: 'PRODUCT_TEAM', label: tx.product },
            ].map(opt => (
              <button key={opt.key} onClick={() => setRoleFilter(opt.key)}
                style={{ padding: '0.3rem 0.75rem', borderRadius: '0.35rem', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600', backgroundColor: roleFilter === opt.key ? theme.cardBg : 'transparent', color: roleFilter === opt.key ? theme.text : theme.textSub, boxShadow: roleFilter === opt.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}>
                {opt.label}
              </button>
            ))}
          </div>
          <button onClick={handleRefresh} disabled={refreshing}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.875rem', borderRadius: '0.5rem', border: `1.5px solid ${theme.borderMed}`, backgroundColor: theme.cardBg, color: theme.textSub, fontSize: '0.8rem', fontWeight: '500', cursor: refreshing ? 'not-allowed' : 'pointer', opacity: refreshing ? 0.6 : 1 }}>
            <RefreshCw size={13} style={refreshing ? { animation: 'spin 1s linear infinite' } : {}} />
            {tx.refresh}
          </button>
        </div>
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

      {!loading && !error && visible.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', backgroundColor: theme.cardBg, borderRadius: '0.875rem', border: `1px solid ${theme.border}` }}>
          <p style={{ fontWeight: '700', color: theme.textMed, marginBottom: '0.35rem' }}>{tx.no_members}</p>
          <p style={{ color: theme.textMuted, fontSize: '0.875rem' }}>{tx.no_members_sub}</p>
        </div>
      )}

      {!loading && visible.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {visible.map(member => <MemberCard key={member.id} member={member} tx={tx} txTitles={txTitles} />)}
        </div>
      )}
    </PageWrapper>
  );
}
