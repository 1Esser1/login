import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Brain, CheckCircle,
  Clock, TrendingUp, AlertCircle, RefreshCw, ListChecks
} from 'lucide-react';
import EmptyState from '../components/ui/EmptyState';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie,
  Cell, Legend
} from 'recharts';
import PageWrapper from '../components/layout/PageWrapper';
import api from '../services/api';
import taskService from '../services/taskService';
import doraService from '../services/doraService';
import useAuthStore from '../store/authStore';
import { useLanguage, useDynamicTranslation } from '../i18n/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

const extractDashboardStrings = (items) => [
  ...new Set(items.flatMap(item => [item.title, item.taskType].filter(Boolean)))
];

function computeStatsFromTasks(allTasks) {
  const scored = allTasks.filter(t => t.finalScore != null);
  const avgScore = scored.length > 0
    ? scored.reduce((s, t) => s + t.finalScore, 0) / scored.length : 0;
  const avgConf = scored.length > 0
    ? scored.reduce((s, t) => s + (t.confidence || 0), 0) / scored.length : 0;
  return {
    totalTasks: allTasks.length,
    aiScoredTasks: scored.length,
    mustTasks:   allTasks.filter(t => t.moscowLabel === 'MUST').length,
    shouldTasks: allTasks.filter(t => t.moscowLabel === 'SHOULD').length,
    couldTasks:  allTasks.filter(t => t.moscowLabel === 'COULD').length,
    wontTasks:   allTasks.filter(t => t.moscowLabel === 'WONT').length,
    avgFinalScore: avgScore,
    avgConfidence: avgConf,
    pendingTasks:  allTasks.filter(t => t.status === 'PENDING_SCORING' || t.finalScore == null).length,
    overrideTasks: allTasks.filter(t => t.status === 'OVERRIDE_REQUESTED').length,
  };
}

function KPICard({ label, value, subtitle, icon, bg, border, theme, isDark }) {
  return (
    <div style={{
      backgroundColor: theme.cardBg, borderRadius: '0.75rem',
      padding: '1.25rem', border: `1px solid ${theme.border}`,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      display: 'flex', alignItems: 'flex-start', gap: '1rem',
    }}>
      <div style={{
        width: '44px', height: '44px', borderRadius: '0.5rem',
        backgroundColor: isDark ? theme.hoverBg : bg,
        border: `1px solid ${isDark ? theme.borderMed : border}`,
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '1.75rem', fontWeight: '700', color: theme.text, lineHeight: 1 }}>
          {value}
        </p>
        <p style={{ fontSize: '0.8rem', fontWeight: '600', color: theme.textMed, marginTop: '0.25rem' }}>
          {label}
        </p>
        {subtitle && (
          <p style={{ fontSize: '0.72rem', color: theme.textMuted, marginTop: '0.15rem' }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

const MOSCOW_COLORS = {
  MUST: '#DC2626', SHOULD: '#D97706',
  COULD: '#2563EB', WONT: '#9CA3AF',
};

function Dashboard() {
  const { user } = useAuthStore();
  const { t } = useLanguage();
  const { isDark, theme } = useTheme();
  const isPrivileged = user?.role === 'ADMIN' || user?.role === 'IT_MANAGER';
  const [stats, setStats] = useState(null);
  const [tasks, setTasks] = useState([]);
  const txData = useDynamicTranslation(tasks, extractDashboardStrings, 'dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [doraSummary, setDoraSummary] = useState(null);

  const loadData = async () => {
    setIsLoading(true);
    setError('');
    try {
      if (isPrivileged) {
        const [statsRes, tasksRes, doraRes] = await Promise.all([
          api.get('/api/dashboard/stats'),
          api.get('/api/tasks'),
          doraService.getDoraSummary(),
        ]);
        setStats(statsRes.data);
        setDoraSummary(doraRes);
        const sorted = tasksRes.data
          .filter(t => t.finalScore != null)
          .sort((a, b) => b.finalScore - a.finalScore)
          .slice(0, 5);
        setTasks(sorted);
      } else {
        const allMyTasks = await taskService.getMyTasks();
        setStats(computeStatsFromTasks(allMyTasks));
        setDoraSummary(null);
        const sorted = allMyTasks
          .filter(t => t.finalScore != null)
          .sort((a, b) => b.finalScore - a.finalScore)
          .slice(0, 5);
        setTasks(sorted);
      }
    } catch (err) {
      setError('Failed to load dashboard data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const moscowData = stats ? [
    { name: t('must'), value: stats.mustTasks, color: '#DC2626' },
    { name: t('should'), value: stats.shouldTasks, color: '#D97706' },
    { name: t('could'), value: stats.couldTasks, color: '#2563EB' },
    { name: t('wont'), value: stats.wontTasks, color: '#9CA3AF' },
  ].filter(d => d.value > 0) : [];

  const barData = tasks.map(t => {
    const displayTitle = txData?.[t.title] || t.title;
    return {
      name: displayTitle.length > 20 ? displayTitle.slice(0, 20) + '...' : displayTitle,
      score: parseFloat(t.finalScore?.toFixed(1)),
      moscow: t.moscowLabel,
    };
  });

  const totalMoscow = stats
    ? stats.mustTasks + stats.shouldTasks + stats.couldTasks + stats.wontTasks
    : 0;
  const mustPct = totalMoscow > 0
    ? Math.round((stats.mustTasks / totalMoscow) * 100) : 0;
  const isRatioGood = mustPct >= 55 && mustPct <= 65;

  return (
    <PageWrapper
      title={t('dash_title')}
      subtitle={isPrivileged
        ? `${t('auth_welcome')}, ${user?.name} — ${t('dash_subtitle_greeting')}`
        : `${t('auth_welcome')}, ${user?.name} — here's a summary of your tasks`}
    >
      {error && (
        <div style={{
          padding: '1rem', backgroundColor: '#FEF2F2',
          border: '1px solid #FECACA', borderRadius: '0.75rem',
          marginBottom: '1rem', display: 'flex', gap: '0.75rem',
        }}>
          <AlertCircle size={16} color="#DC2626" />
          <p style={{ color: '#DC2626', fontSize: '0.875rem' }}>{error}</p>
        </div>
      )}

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: theme.textMuted }}>
          <p>{t('dash_loading')}</p>
        </div>
      ) : stats && (
        <>
          {/* KPI row 1 */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '1rem', marginBottom: '1rem',
          }}>
            <KPICard theme={theme} isDark={isDark}
              label={isPrivileged ? t('dash_total_tasks') : 'My Tasks'}
              value={stats.totalTasks}
              subtitle={isPrivileged ? t('dash_in_backlog') : 'Tasks you have submitted'}
              icon={<LayoutDashboard size={20} color="#2563EB" />}
              bg="#EFF6FF" border="#BFDBFE"
            />
            <KPICard theme={theme} isDark={isDark}
              label={t('dash_ai_scored')}
              value={stats.aiScoredTasks}
              subtitle={`${stats.totalTasks > 0 ? Math.round((stats.aiScoredTasks / stats.totalTasks) * 100) : 0}% of backlog`}
              icon={<Brain size={20} color="#7C3AED" />}
              bg="#F5F3FF" border="#DDD6FE"
            />
            <KPICard theme={theme} isDark={isDark}
              label={t('dash_must_do')}
              value={stats.mustTasks}
              subtitle={`${mustPct}% of scored tasks`}
              icon={<AlertCircle size={20} color="#DC2626" />}
              bg="#FEF2F2" border="#FECACA"
            />
            <KPICard theme={theme} isDark={isDark}
              label={t('dash_avg_score')}
              value={stats.avgFinalScore?.toFixed(1)}
              subtitle={`Avg confidence: ${(stats.avgConfidence * 100).toFixed(0)}%`}
              icon={<TrendingUp size={20} color="#16A34A" />}
              bg="#F0FDF4" border="#BBF7D0"
            />
          </div>

          {/* KPI row 2 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isPrivileged ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)',
            gap: '1rem', marginBottom: '1.5rem',
          }}>
            <KPICard theme={theme} isDark={isDark}
              label={t('dash_pending')}
              value={stats.pendingTasks}
              subtitle={t('dash_pending_subtitle')}
              icon={<Clock size={20} color="#D97706" />}
              bg="#FFF7ED" border="#FDE68A"
            />
            <KPICard theme={theme} isDark={isDark}
              label={t('dash_overridden')}
              value={stats.overrideTasks}
              subtitle={t('dash_overridden_subtitle')}
              icon={<CheckCircle size={20} color="#059669" />}
              bg="#F0FDF4" border="#BBF7D0"
            />
            {isPrivileged && (
              <KPICard theme={theme} isDark={isDark}
                label="CAB Queue"
                value={stats.pendingCabTasks ?? 0}
                subtitle="Awaiting production approval"
                icon={<ListChecks size={20} color="#7C3AED" />}
                bg="#F5F3FF" border="#DDD6FE"
              />
            )}
            {isPrivileged ? <div style={{
              backgroundColor: isDark
                ? (isRatioGood ? 'rgba(22,163,74,0.1)' : 'rgba(217,119,6,0.1)')
                : (isRatioGood ? '#F0FDF4' : '#FFF7ED'),
              borderRadius: '0.75rem', padding: '1.25rem',
              border: `1px solid ${isDark
                ? (isRatioGood ? 'rgba(22,163,74,0.3)' : 'rgba(217,119,6,0.3)')
                : (isRatioGood ? '#BBF7D0' : '#FDE68A')}`,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: '1.75rem', fontWeight: '700', color: theme.text, lineHeight: 1 }}>
                    {mustPct}%
                  </p>
                  <p style={{ fontSize: '0.8rem', fontWeight: '600', color: theme.textMed, marginTop: '0.25rem' }}>
                    {t('dash_moscow_ratio')}
                  </p>
                  <p style={{ fontSize: '0.72rem', color: theme.textMuted, marginTop: '0.15rem' }}>
                    {t('dash_target')}
                  </p>
                </div>
                <span style={{
                  padding: '0.25rem 0.6rem', borderRadius: '9999px',
                  fontSize: '0.72rem', fontWeight: '600',
                  backgroundColor: isRatioGood ? '#16A34A' : '#D97706',
                  color: 'white',
                }}>
                  {isRatioGood ? t('dash_on_target') : t('dash_off_target')}
                </span>
              </div>
            </div> : null}
          </div>

          {/* Charts */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: '1.25rem', marginBottom: '1.5rem',
          }}>
            <div style={{
              backgroundColor: theme.cardBg, borderRadius: '0.75rem',
              padding: '1.5rem', border: `1px solid ${theme.border}`,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: theme.text }}>
                  {t('dash_charts_moscow')}
                </h3>
                <p style={{ fontSize: '0.75rem', color: theme.textMuted }}>
                  {t('dash_charts_moscow_target')}
                </p>
              </div>
              {moscowData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={moscowData} cx="50%" cy="50%"
                      innerRadius={55} outerRadius={85}
                      paddingAngle={3} dataKey="value"
                    >
                      {moscowData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [value + ' tasks', name]}
                      contentStyle={{
                        backgroundColor: theme.cardBg,
                        border: `1px solid ${theme.borderMed}`,
                        borderRadius: '6px', color: theme.text,
                      }}
                      labelStyle={{ color: theme.textMed }}
                    />
                    <Legend wrapperStyle={{ color: theme.textSub }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState variant="scoring" title={t('dash_no_scored')} compact />
              )}
            </div>

            <div style={{
              backgroundColor: theme.cardBg, borderRadius: '0.75rem',
              padding: '1.5rem', border: `1px solid ${theme.border}`,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: theme.text }}>
                  {t('dash_charts_top5')}
                </h3>
                <p style={{ fontSize: '0.75rem', color: theme.textMuted }}>
                  {t('dash_ranked_by_rice')}
                </p>
              </div>
              {barData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barData} layout="vertical"
                    margin={{ left: 0, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false}
                      stroke={isDark ? 'rgba(255,255,255,0.07)' : '#e5e7eb'} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: theme.textSub }} axisLine={{ stroke: theme.border }} tickLine={false} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: theme.textSub }} width={120} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(value) => [value, 'Final Score']}
                      contentStyle={{
                        backgroundColor: theme.cardBg,
                        border: `1px solid ${theme.borderMed}`,
                        borderRadius: '6px', color: theme.text,
                      }}
                      labelStyle={{ color: theme.textMed }}
                    />
                    <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                      {barData.map((entry, index) => (
                        <Cell key={index} fill={MOSCOW_COLORS[entry.moscow] || '#CC2027'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState variant="scoring" title={t('dash_no_scored')} compact />
              )}
            </div>
          </div>

          {/* Recent tasks table */}
          <div style={{
            backgroundColor: theme.cardBg, borderRadius: '0.75rem',
            border: `1px solid ${theme.border}`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '1.25rem 1.5rem', borderBottom: `1px solid ${theme.border}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: theme.text }}>
                  {isPrivileged ? t('dash_top_ranked') : 'Your Top Scored Tasks'}
                </h3>
                <p style={{ fontSize: '0.75rem', color: theme.textMuted }}>
                  {isPrivileged ? t('dash_top_ranked_subtitle') : 'Your highest-priority tasks ranked by AI score'}
                </p>
              </div>
              <button onClick={loadData} style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.4rem 0.85rem', backgroundColor: theme.cardBg,
                border: `1.5px solid ${theme.borderMed}`, borderRadius: '0.5rem',
                fontSize: '0.78rem', color: theme.textSub, cursor: 'pointer',
              }}>
                <RefreshCw size={13} />
                {t('refresh')}
              </button>
            </div>

            <div style={{
              display: 'grid', gridTemplateColumns: '2rem 1fr 1fr 1fr 1fr 1fr',
              padding: '0.75rem 1.5rem', backgroundColor: theme.hoverBg,
              borderBottom: `1px solid ${theme.border}`,
            }}>
              {['#', t('task_name'), t('task_type'), 'Kano', 'MoSCoW', t('final_score')].map(h => (
                <span key={h} style={{
                  fontSize: '0.7rem', fontWeight: '600', color: theme.textMuted,
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  {h}
                </span>
              ))}
            </div>

            {tasks.map((task, index) => (
              <div key={task.id} style={{
                display: 'grid',
                gridTemplateColumns: '2rem 1fr 1fr 1fr 1fr 1fr',
                padding: '0.875rem 1.5rem',
                borderBottom: index < tasks.length - 1 ? `1px solid ${theme.border}` : 'none',
                alignItems: 'center',
              }}>
                <span style={{
                  fontSize: '0.78rem', fontWeight: '700',
                  color: index < 3 ? '#CC2027' : theme.textMuted,
                }}>
                  #{index + 1}
                </span>
                <span style={{
                  fontSize: '0.825rem', fontWeight: '500', color: theme.text,
                  overflow: 'hidden', textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap', paddingRight: '1rem',
                }}>
                  {txData?.[task.title] || task.title}
                </span>
                <span style={{
                  fontSize: '0.72rem',
                  color: task.taskTypeColor || theme.textSub,
                  backgroundColor: task.taskTypeColor ? `${task.taskTypeColor}15` : theme.tagBg,
                  padding: '0.15rem 0.5rem', borderRadius: '4px',
                  border: `1px solid ${task.taskTypeColor ? `${task.taskTypeColor}30` : theme.borderMed}`,
                  fontWeight: '500', display: 'inline-block',
                }}>
                  {txData?.[task.taskType] || task.taskType}
                </span>
                <span style={{
                  fontSize: '0.72rem', fontWeight: '600',
                  padding: '0.15rem 0.5rem', borderRadius: '9999px',
                  backgroundColor: theme.tagBg, color: theme.textMed,
                  display: 'inline-block',
                }}>
                  {task.kanoCategory}
                </span>
                <span style={{
                  fontSize: '0.72rem', fontWeight: '600',
                  padding: '0.15rem 0.5rem', borderRadius: '9999px',
                  backgroundColor: MOSCOW_COLORS[task.moscowLabel] + '20',
                  color: MOSCOW_COLORS[task.moscowLabel],
                  display: 'inline-block',
                }}>
                  {task.moscowLabel}
                </span>
                <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#CC2027' }}>
                  {task.finalScore?.toFixed(1)}
                </span>
              </div>
            ))}

            {tasks.length === 0 && (
              <EmptyState
                variant="tasks"
                title={t('dash_no_scored')}
                subtitle={t('dash_go_scoring')}
                compact
              />
            )}
          </div>

          {/* DORA KPI Panel — team-wide metrics, stays dark by design */}
          {isPrivileged && doraSummary && (
            <div style={{
              backgroundColor: '#1A1A2E', borderRadius: '0.75rem',
              padding: '1.5rem', marginTop: '1.25rem',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: '1.25rem',
              }}>
                <div>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'white' }}>
                    {t('dora_title')}
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.15rem' }}>
                    {t('dora_subtitle')}
                  </p>
                </div>
                <span style={{
                  fontSize: '0.68rem', fontWeight: '600',
                  backgroundColor: 'rgba(204, 32, 39, 0.2)',
                  color: '#F87171', padding: '0.2rem 0.6rem',
                  borderRadius: '9999px', border: '1px solid rgba(204, 32, 39, 0.3)',
                }}>
                  {doraSummary.totalIndicators} {t('dora_indicators')}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                {[
                  {
                    label: t('dora_lead_time'),
                    value: doraSummary.avgLeadTimeDays > 0 ? `${doraSummary.avgLeadTimeDays}d` : '—',
                    subtitle: t('dora_lead_subtitle'),
                    icon: '⏱️',
                    color: doraSummary.avgLeadTimeDays <= 7 ? '#16A34A'
                      : doraSummary.avgLeadTimeDays <= 14 ? '#D97706' : '#DC2626',
                  },
                  {
                    label: t('dora_freq'),
                    value: doraSummary.mostCommonDeploymentFreq !== 'N/A'
                      ? doraSummary.mostCommonDeploymentFreq.replace(/_/g, ' ') : '—',
                    subtitle: t('dora_freq_subtitle'),
                    icon: '🚀',
                    color: '#2563EB',
                  },
                  {
                    label: t('dora_high_risk'),
                    value: doraSummary.highRiskCount,
                    subtitle: t('dora_high_risk_subtitle'),
                    icon: '⚠️',
                    color: doraSummary.highRiskCount === 0 ? '#16A34A' : '#DC2626',
                  },
                  {
                    label: t('dora_tracked'),
                    value: doraSummary.totalIndicators,
                    subtitle: t('dora_tracked_subtitle'),
                    icon: '📊',
                    color: '#9CA3AF',
                  },
                ].map((kpi) => (
                  <div key={kpi.label} style={{
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    borderRadius: '0.625rem', padding: '1rem',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '1.1rem' }}>{kpi.icon}</span>
                      <p style={{ fontSize: '0.68rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {kpi.label}
                      </p>
                    </div>
                    <p style={{ fontSize: '1.35rem', fontWeight: '700', color: kpi.color, marginBottom: '0.2rem' }}>
                      {kpi.value}
                    </p>
                    <p style={{ fontSize: '0.7rem', color: '#4B5563' }}>{kpi.subtitle}</p>
                  </div>
                ))}
              </div>

              {doraSummary.totalIndicators === 0 && (
                <div style={{
                  marginTop: '1rem', padding: '1rem',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  borderRadius: '0.5rem', textAlign: 'center',
                }}>
                  <p style={{ color: '#6B7280', fontSize: '0.78rem' }}>
                    {t('dora_no_data_hint')}
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </PageWrapper>
  );
}

export default Dashboard;
