import { useState, useEffect } from 'react';
import { Brain, ChevronDown, ChevronUp, RefreshCw, AlertCircle } from 'lucide-react';
import EmptyState from '../components/ui/EmptyState';
import PageWrapper from '../components/layout/PageWrapper';
import taskService from '../services/taskService';
import { useLanguage, useTranslatedTask, useDynamicTranslation } from '../i18n/LanguageContext';
import useAuthStore from '../store/authStore';
import { useTheme } from '../contexts/ThemeContext';

const KANO_STYLES = {
  BASIC: { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA', label: 'Basic Need' },
  PERFORMANCE: { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE', label: 'Performance' },
  DELIGHTER: { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0', label: 'Delighter' },
  INDIFFERENT: { bg: '#F9FAFB', color: '#6B7280', border: '#E5E7EB', label: 'Indifferent' },
  REVERSE: { bg: '#FFF7ED', color: '#EA580C', border: '#FED7AA', label: 'Reverse' },
};

const MOSCOW_STYLES = {
  MUST: { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
  SHOULD: { bg: '#FFF7ED', color: '#D97706', border: '#FDE68A' },
  COULD: { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
  WONT: { bg: '#F9FAFB', color: '#6B7280', border: '#E5E7EB' },
};

const CONFIDENCE_STYLES = {
  HIGH: { color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
  MEDIUM: { color: '#D97706', bg: '#FFF7ED', border: '#FDE68A' },
  LOW: { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
};

const KANO_MULTIPLIERS = {
  BASIC: 1.3, PERFORMANCE: 1.0,
  DELIGHTER: 0.8, INDIFFERENT: 1.0, REVERSE: 1.0,
};

const MOSCOW_MULTIPLIERS = {
  MUST: 1.5, SHOULD: 1.2, COULD: 1.0, WONT: 0.5,
};

function RiceBar({ label, value, max, displayValue }) {
  const pct = Math.min((value / max) * 100, 100);
  const color = pct >= 70 ? '#16A34A' : pct >= 40 ? '#D97706' : '#DC2626';
  return (
    <div style={{ marginBottom: '0.6rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
        <span style={{ fontSize: '0.72rem', color: '#6B7280', fontWeight: '500' }}>{label}</span>
        <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#374151' }}>
          {displayValue ?? value}
        </span>
      </div>
      <div style={{
        height: '5px', backgroundColor: '#F3F4F6',
        borderRadius: '9999px', overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          backgroundColor: color, borderRadius: '9999px',
          transition: 'width 0.4s ease',
        }} />
      </div>
    </div>
  );
}

function Badge({ label, style }) {
  return (
    <span style={{
      padding: '0.25rem 0.75rem', borderRadius: '9999px',
      fontSize: '0.75rem', fontWeight: '600',
      border: `1px solid ${style.border}`,
      backgroundColor: style.bg, color: style.color,
    }}>
      {label}
    </span>
  );
}

const extractScoringStrings = (items) => [
  ...new Set(items.flatMap(item => [item.title, item.taskType].filter(Boolean)))
];

// Each card uses useTranslatedTask — auto-translates all AI text when expanded
function ScoredTaskCard({ task, index, isExpanded, onToggle, txData }) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const tx = useTranslatedTask(task, isExpanded);

  const kano = KANO_STYLES[task.kanoCategory] || KANO_STYLES.INDIFFERENT;
  const moscow = MOSCOW_STYLES[task.moscowLabel] || MOSCOW_STYLES.COULD;
  const conf = CONFIDENCE_STYLES[task.confidenceLevel] || CONFIDENCE_STYLES.MEDIUM;
  const multiplier = task.multiplierApplied ??
    (KANO_MULTIPLIERS[task.kanoCategory] || 1.0) * (MOSCOW_MULTIPLIERS[task.moscowLabel] || 1.0);

  return (
    <div style={{
      backgroundColor: theme.cardBg,
      borderRadius: '0.75rem',
      border: `1px solid ${theme.border}`,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      overflow: 'hidden',
    }}>
      {/* Card header */}
      <div style={{
        padding: '1.25rem 1.5rem',
        display: 'flex', alignItems: 'flex-start',
        gap: '1rem', cursor: 'pointer',
      }}
        onClick={onToggle}
      >
        {/* Rank + AI icon */}
        <div style={{ flexShrink: 0, textAlign: 'center' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            backgroundColor: index < 3 ? '#1A1A2E' : '#F3F4F6',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '0.25rem',
          }}>
            <span style={{
              fontSize: '0.75rem', fontWeight: '700',
              color: index < 3 ? '#CC2027' : '#6B7280',
            }}>
              #{index + 1}
            </span>
          </div>
          <Brain size={14} color="#9CA3AF" />
        </div>

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: '0.925rem', fontWeight: '700',
                color: theme.text, marginBottom: '0.4rem',
              }}>
                {txData?.[task.title] || task.title}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.5rem' }}>
                <span style={{
                  fontSize: '0.72rem', color: theme.textMuted,
                  backgroundColor: theme.tagBg, padding: '0.1rem 0.5rem',
                  borderRadius: '4px',
                }}>
                  {txData?.[task.taskType] || task.taskType}
                </span>
                <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>
                  by {task.submittedBy}
                </span>
                <Badge label={kano.label} style={kano} />
                <Badge label={task.moscowLabel} style={moscow} />
                <Badge label={`${task.confidenceLevel} confidence`} style={conf} />
                {task.modelUsed && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                    padding: '0.2rem 0.6rem', borderRadius: '9999px',
                    fontSize: '0.68rem', fontWeight: '500',
                    backgroundColor: '#F0F4FF', color: '#4F6EF7',
                    border: '1px solid #C7D2FE',
                  }}>
                    🤖 {task.modelUsed}
                  </span>
                )}
              </div>

              {/* Score formula */}
              <div style={{
                display: 'flex', alignItems: 'center',
                gap: '0.5rem', flexWrap: 'wrap',
                fontSize: '0.75rem', color: '#6B7280',
              }}>
                <span>RICE {task.riceScore?.toFixed(1)}</span>
                <span>×</span>
                <span style={{ color: '#CC2027', fontWeight: '600' }}>
                  {multiplier.toFixed(2)}
                </span>
                <span>=</span>
                <span style={{ fontSize: '1rem', fontWeight: '800', color: '#CC2027' }}>
                  {task.finalScore?.toFixed(1)}
                </span>
                <span style={{ color: '#D1D5DB' }}>·</span>
                <span style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>
                  Kano ×{KANO_MULTIPLIERS[task.kanoCategory] || 1.0}
                  · MoSCoW ×{MOSCOW_MULTIPLIERS[task.moscowLabel] || 1.0}
                </span>
              </div>
            </div>

            {/* Score circle */}
            <div style={{
              flexShrink: 0, textAlign: 'center',
              padding: '0.75rem 1rem',
              backgroundColor: '#FEF2F2',
              borderRadius: '0.75rem',
              border: '1px solid #FECACA',
            }}>
              <p style={{ fontSize: '1.75rem', fontWeight: '800', color: '#CC2027', lineHeight: 1 }}>
                {task.finalScore?.toFixed(0)}
              </p>
              <p style={{ fontSize: '0.65rem', color: '#9CA3AF', marginTop: '0.2rem' }}>
                {t('final_score')}
              </p>
            </div>
          </div>
        </div>

        {/* Expand toggle */}
        <div style={{ flexShrink: 0, color: '#9CA3AF' }}>
          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </div>

      {/* Expanded detail — uses tx (translated task) for all AI-generated text */}
      {isExpanded && (
        <div style={{ borderTop: `1px solid ${theme.border}`, backgroundColor: theme.hoverBg }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0 }}>

            {/* Column 1 — Description + Industry context */}
            <div style={{ padding: '1.5rem', borderRight: `1px solid ${theme.border}` }}>
              <p style={{
                fontSize: '0.72rem', fontWeight: '600', color: theme.textMed,
                textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem',
              }}>
                {t('task_description')}
              </p>
              <p style={{ fontSize: '0.825rem', color: theme.textSub, lineHeight: '1.6', marginBottom: '1.25rem' }}>
                {tx.description}
              </p>

              {task.industryContext && (
                <>
                  <p style={{
                    fontSize: '0.72rem', fontWeight: '600', color: theme.textMed,
                    textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem',
                  }}>
                    🌍 {t('industry_context')}
                  </p>
                  <div style={{ padding: '0.875rem', backgroundColor: '#1A1A2E', borderRadius: '0.5rem' }}>
                    <p style={{ fontSize: '0.78rem', color: '#9CA3AF', lineHeight: '1.6' }}>
                      {tx.industryContext}
                    </p>
                    <p style={{ fontSize: '0.65rem', color: '#4B5563', marginTop: '0.5rem' }}>
                      🤖 {task.modelUsed}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Column 2 — RICE breakdown */}
            <div style={{ padding: '1.5rem', borderRight: `1px solid ${theme.border}` }}>
              <p style={{
                fontSize: '0.72rem', fontWeight: '600', color: theme.textMed,
                textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.875rem',
              }}>
                {t('rice_variables')}
              </p>

              <RiceBar label={t('reach')} value={task.reach || 0} max={10} />
              <RiceBar label={t('impact')} value={task.impact || 0} max={10} />
              <RiceBar
                label={t('confidence')}
                value={(task.confidence || 0) * 10}
                max={10}
                displayValue={task.confidence}
              />
              <RiceBar label={t('effort')} value={task.effort || 0} max={10} />

              <div style={{
                marginTop: '1rem', padding: '0.875rem',
                backgroundColor: theme.cardBg, borderRadius: '0.5rem',
                border: `1px solid ${theme.border}`,
              }}>
                <p style={{ fontSize: '0.68rem', color: theme.textMuted, marginBottom: '0.5rem', textAlign: 'center' }}>
                  {t('rice_formula')}
                </p>
                <div style={{
                  display: 'flex', justifyContent: 'center',
                  alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem',
                }}>
                  <span style={{ color: theme.textMed, fontWeight: '600' }}>{task.riceScore?.toFixed(2)}</span>
                  <span style={{ color: theme.textMuted }}>×</span>
                  <span style={{ color: theme.textMed, fontWeight: '600' }}>{multiplier.toFixed(2)}</span>
                  <span style={{ color: theme.textMuted }}>=</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#CC2027' }}>
                    {task.finalScore?.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>

            {/* Column 3 — AI reasoning (auto-translated via tx) */}
            <div style={{ padding: '1.5rem' }}>
              <p style={{
                fontSize: '0.72rem', fontWeight: '600', color: theme.textMed,
                textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.875rem',
              }}>
                {t('ai_reasoning')}
              </p>

              {/* Kano reasoning */}
              <div style={{
                padding: '0.875rem',
                backgroundColor: kano.bg,
                border: `1px solid ${kano.border}`,
                borderRadius: '0.5rem',
                marginBottom: '0.75rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <span style={{
                    fontSize: '0.68rem', fontWeight: '700', color: kano.color,
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>
                    Kano — {kano.label}
                  </span>
                  <span style={{ fontSize: '0.65rem', fontWeight: '600', color: kano.color }}>
                    ×{KANO_MULTIPLIERS[task.kanoCategory] || 1.0}
                  </span>
                </div>
                <p style={{ fontSize: '0.78rem', color: theme.textMed, lineHeight: '1.5' }}>
                  {tx.kanoReasoning || '—'}
                </p>
              </div>

              {/* MoSCoW reasoning */}
              <div style={{
                padding: '0.875rem',
                backgroundColor: moscow.bg,
                border: `1px solid ${moscow.border}`,
                borderRadius: '0.5rem',
                marginBottom: '0.75rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <span style={{
                    fontSize: '0.68rem', fontWeight: '700', color: moscow.color,
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>
                    MoSCoW — {task.moscowLabel}
                  </span>
                  <span style={{ fontSize: '0.65rem', fontWeight: '600', color: moscow.color }}>
                    ×{MOSCOW_MULTIPLIERS[task.moscowLabel] || 1.0}
                  </span>
                </div>
                <p style={{ fontSize: '0.78rem', color: theme.textMed, lineHeight: '1.5' }}>
                  {tx.moscowReasoning || '—'}
                </p>
              </div>

              {/* Confidence level */}
              <div style={{
                padding: '0.75rem',
                backgroundColor: conf.bg,
                border: `1px solid ${conf.border}`,
                borderRadius: '0.5rem',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '600', color: conf.color }}>
                  {t('ai_confidence_level')}
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: conf.color }}>
                  {task.confidenceLevel}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Scoring() {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [filterKano, setFilterKano] = useState('ALL');
  const [filterMoscow, setFilterMoscow] = useState('ALL');
  const { t } = useLanguage();
  const { theme } = useTheme();
  const txData = useDynamicTranslation(tasks, extractScoringStrings, 'scoring');
  const { user } = useAuthStore();
  const isPrivileged = user?.role === 'ADMIN' || user?.role === 'IT_MANAGER';

  const loadTasks = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = isPrivileged
        ? await taskService.getAllTasks()
        : await taskService.getMyTasks();
      const scored = data
        .filter(t => t.finalScore != null)
        .sort((a, b) => b.finalScore - a.finalScore);
      setTasks(scored);
    } catch (err) {
      setError('Failed to load scoring data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadTasks(); }, []);

  const filtered = tasks
    .filter(t => filterKano === 'ALL' || t.kanoCategory === filterKano)
    .filter(t => filterMoscow === 'ALL' || t.moscowLabel === filterMoscow);

  return (
    <PageWrapper
      title={t('scoring_title')}
      subtitle={isPrivileged ? t('scoring_subtitle') : 'AI scoring breakdown for your submitted tasks'}
    >

      {/* Summary stats */}
      {tasks.length > 0 && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1rem', marginBottom: '1.5rem',
        }}>
          {[
            { label: t('scoring_total'), value: tasks.length, color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
            {
              label: t('scoring_avg'),
              value: (tasks.reduce((s, t) => s + t.finalScore, 0) / tasks.length).toFixed(1),
              color: '#CC2027', bg: '#FEF2F2', border: '#FECACA',
            },
            {
              label: t('scoring_confidence'),
              value: (tasks.reduce((s, t) => s + (t.confidence || 0), 0) / tasks.length * 100).toFixed(0) + '%',
              color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0',
            },
            {
              label: t('scoring_high_conf'),
              value: tasks.filter(t => t.confidenceLevel === 'HIGH').length,
              color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE',
            },
          ].map(stat => (
            <div key={stat.label} style={{
              backgroundColor: theme.cardBg, borderRadius: '0.75rem',
              padding: '1.1rem 1.25rem', border: `1px solid ${theme.border}`,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              borderLeft: `4px solid ${stat.color}`,
            }}>
              <p style={{ fontSize: '1.5rem', fontWeight: '700', color: theme.text }}>{stat.value}</p>
              <p style={{ fontSize: '0.75rem', color: theme.textMuted, marginTop: '0.15rem' }}>{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem',
      }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            {['ALL', 'BASIC', 'PERFORMANCE', 'DELIGHTER', 'INDIFFERENT'].map(f => (
              <button key={f} onClick={() => setFilterKano(f)}
                style={{
                  padding: '0.3rem 0.7rem', borderRadius: '9999px', border: '1.5px solid',
                  borderColor: filterKano === f ? '#CC2027' : theme.borderMed,
                  backgroundColor: filterKano === f ? '#FEF2F2' : theme.cardBg,
                  color: filterKano === f ? '#CC2027' : theme.textSub,
                  fontSize: '0.72rem', fontWeight: '600', cursor: 'pointer',
                }}>
                {f === 'ALL' ? t('filter_all_kano') : f}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            {['ALL', 'MUST', 'SHOULD', 'COULD', 'WONT'].map(f => (
              <button key={f} onClick={() => setFilterMoscow(f)}
                style={{
                  padding: '0.3rem 0.7rem', borderRadius: '9999px', border: '1.5px solid',
                  borderColor: filterMoscow === f ? '#1A1A2E' : theme.borderMed,
                  backgroundColor: filterMoscow === f ? '#1A1A2E' : theme.cardBg,
                  color: filterMoscow === f ? 'white' : theme.textSub,
                  fontSize: '0.72rem', fontWeight: '600', cursor: 'pointer',
                }}>
                {f === 'ALL' ? t('filter_all_moscow') : f}
              </button>
            ))}
          </div>
        </div>
        <button onClick={loadTasks} style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          padding: '0.4rem 0.85rem', backgroundColor: theme.cardBg,
          border: `1.5px solid ${theme.borderMed}`, borderRadius: '0.5rem',
          fontSize: '0.78rem', color: theme.textSub, cursor: 'pointer',
        }}>
          <RefreshCw size={13} />
          {t('refresh')}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '1rem', backgroundColor: '#FEF2F2',
          border: '1px solid #FECACA', borderRadius: '0.75rem',
          display: 'flex', gap: '0.75rem', marginBottom: '1rem',
        }}>
          <AlertCircle size={16} color="#DC2626" />
          <p style={{ color: '#DC2626', fontSize: '0.875rem' }}>{error}</p>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#9CA3AF' }}>
          <Brain size={32} color="#E5E7EB" style={{ marginBottom: '0.75rem' }} />
          <p>{t('scoring_loading')}</p>
        </div>
      )}

      {/* Empty */}
      {!isLoading && filtered.length === 0 && (
        <div style={{ backgroundColor: theme.cardBg, borderRadius: '0.75rem', border: `1px solid ${theme.border}` }}>
          <EmptyState
            variant="scoring"
            title={t('scoring_empty_title')}
            subtitle={t('scoring_empty_subtitle')}
          />
        </div>
      )}

      {/* Task cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filtered.map((task, index) => (
          <ScoredTaskCard
            key={task.id}
            task={task}
            index={index}
            isExpanded={expandedId === task.id}
            onToggle={() => setExpandedId(expandedId === task.id ? null : task.id)}
            txData={txData}
          />
        ))}
      </div>
    </PageWrapper>
  );
}

export default Scoring;
