import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Clock, CheckCircle2, Circle, PlayCircle,
  Lightbulb, Building2, AlertTriangle, BarChart3,
  Loader2, AlertCircle, RefreshCw, ChevronDown, ChevronUp,
  Rocket, BookOpen, ShieldCheck, GitFork, GitBranch, GitCommitHorizontal,
  Link2, ExternalLink, Plus, X, Layers,
} from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import workplaceService from '../services/workplaceService';
import useAuthStore from '../store/authStore';
import jiraService from '../services/jiraService';
import { useLanguage, useTranslatedWorkplace } from '../i18n/LanguageContext';
import CommitModal from '../components/git/CommitModal';
import { useTheme } from '../contexts/ThemeContext';

const JIRA_ISSUE_TYPES = ['Task', 'Bug', 'Story', 'Epic'];

// ── Style constants ────────────────────────────────────────────────────────────

const STATUS_STYLE = {
  ACTIVE:     { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0' },
  COMPLETED:  { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
  ARCHIVED:   { bg: '#F9FAFB', color: '#6B7280', border: '#E5E7EB' },
};

const SUBTASK_STATUS = {
  TODO:        { bg: '#F9FAFB', color: '#6B7280', border: '#E5E7EB', icon: Circle },
  IN_PROGRESS: { bg: '#FFF7ED', color: '#D97706', border: '#FDE68A', icon: PlayCircle },
  DONE:        { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0', icon: CheckCircle2 },
};

const COMPLEXITY_STYLE = {
  LOW:    { bg: '#F0FDF4', color: '#16A34A' },
  MEDIUM: { bg: '#FFF7ED', color: '#D97706' },
  HIGH:   { bg: '#FEF2F2', color: '#DC2626' },
};

const RISK_STYLE = {
  LOW:      { bg: '#F0FDF4', color: '#16A34A' },
  MEDIUM:   { bg: '#FFF7ED', color: '#D97706' },
  HIGH:     { bg: '#FEF2F2', color: '#DC2626' },
  CRITICAL: { bg: '#FDF4FF', color: '#9333EA' },
};

const FREQ_KEY_MAP = {
  MULTIPLE_PER_DAY:  'freq_multiple',
  DAILY:             'freq_daily',
  WEEKLY:            'freq_weekly',
  MONTHLY:           'freq_monthly',
  LESS_THAN_MONTHLY: 'freq_less_monthly',
};

const NEXT_STATUS = { TODO: 'IN_PROGRESS', IN_PROGRESS: 'DONE', DONE: 'DONE' };

// ── Sub-components ─────────────────────────────────────────────────────────────

function SubtaskCard({ subtask, onStatusChange, updating, repoName, provider, onCommit, jiraConnected, onJiraPush, isPushingJira, onJiraSync, isSyncingJira }) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [tipsOpen, setTipsOpen] = useState(false);

  const st      = SUBTASK_STATUS[subtask.status] || SUBTASK_STATUS.TODO;
  const cx      = COMPLEXITY_STYLE[subtask.complexity] || COMPLEXITY_STYLE.MEDIUM;
  const StatusIcon = st.icon;
  const canAdvance = subtask.status !== 'DONE';
  const isDone     = subtask.status === 'DONE';
  const ProviderIcon = provider === 'gitlab' ? GitBranch : GitFork;

  return (
    <div style={{
      backgroundColor: theme.cardBg, borderRadius: '0.75rem',
      border: `1px solid ${theme.border}`, overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      borderLeft: `3px solid ${st.color}`,
      opacity: updating ? 0.7 : 1,
      transition: 'opacity 0.15s',
    }}>
      <div style={{ padding: '1rem 1.25rem' }}>
        {/* Row 1: order + title + badges + action buttons */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          {/* Order number */}
          <div style={{
            width: '28px', height: '28px', flexShrink: 0,
            borderRadius: '50%', backgroundColor: theme.tagBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: theme.textMed }}>
              {subtask.subtaskOrder}
            </span>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
              <h4 style={{
                fontSize: '0.9rem', fontWeight: '700', color: theme.text, marginRight: '0.25rem',
              }}>
                {subtask.title}
              </h4>
              <span style={{
                padding: '0.15rem 0.5rem', borderRadius: '9999px',
                fontSize: '0.65rem', fontWeight: '600',
                backgroundColor: cx.bg, color: cx.color,
              }}>
                {t(`subtask_${subtask.complexity?.toLowerCase()}`)}
              </span>
              <span style={{
                display: 'flex', alignItems: 'center', gap: '0.25rem',
                padding: '0.15rem 0.5rem', borderRadius: '9999px',
                fontSize: '0.65rem', fontWeight: '600',
                backgroundColor: theme.tagBg, color: theme.textMed,
              }}>
                <Clock size={10} /> {subtask.estimatedHours}h
              </span>
              {subtask.status === 'DONE' && subtask.actualLeadTimeHours != null && (
                <span style={{ fontSize: '0.65rem', color: '#16A34A', fontWeight: '600' }}>
                  ✓ {subtask.actualLeadTimeHours.toFixed(1)}h {t('subtask_actual')}
                </span>
              )}
              {subtask.codeCommitted && subtask.commitSha && (
                <span style={{
                  display: 'flex', alignItems: 'center', gap: '0.25rem',
                  padding: '0.15rem 0.5rem', borderRadius: '9999px',
                  fontSize: '0.65rem', fontWeight: '600',
                  backgroundColor: '#EFF6FF', color: '#2563EB',
                  border: '1px solid #BFDBFE', fontFamily: 'monospace',
                }}>
                  <GitCommitHorizontal size={9} />
                  {subtask.commitSha.slice(0, 7)}
                </span>
              )}
            </div>

            <p style={{ fontSize: '0.82rem', color: theme.textMed, lineHeight: 1.6, marginBottom: '0.5rem' }}>
              {subtask.description}
            </p>

            {/* Tips toggle */}
            {subtask.tips?.length > 0 && (
              <button
                onClick={() => setTipsOpen(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                  border: 'none', background: 'none', cursor: 'pointer',
                  color: '#F5A623', fontSize: '0.75rem', fontWeight: '600', padding: 0,
                }}
              >
                <Lightbulb size={13} />
                {tipsOpen ? t('subtask_hide_tips') : `${subtask.tips.length} ${t('subtask_tips')}`}
                {tipsOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'flex-end', flexShrink: 0 }}>
            {/* Status button */}
            <button
              onClick={() => canAdvance && onStatusChange(subtask.id, NEXT_STATUS[subtask.status])}
              disabled={!canAdvance || updating}
              title={canAdvance ? `Mark as ${NEXT_STATUS[subtask.status].replace('_', ' ')}` : 'Completed'}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.35rem 0.75rem', borderRadius: '0.5rem',
                border: `1px solid ${st.border}`,
                backgroundColor: st.bg, color: st.color,
                fontSize: '0.72rem', fontWeight: '700',
                cursor: canAdvance && !updating ? 'pointer' : 'default',
                transition: 'all 0.15s',
                opacity: updating ? 0.6 : 1,
              }}
            >
              {updating ? (
                <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <StatusIcon size={13} />
              )}
              {t(`subtask_${subtask.status?.toLowerCase()}`)}
            </button>

            {/* Commit button — only for DONE subtasks with a linked repo */}
            {repoName && isDone && !subtask.codeCommitted && (
              <button
                onClick={() => onCommit(subtask)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.3rem',
                  padding: '0.3rem 0.65rem', borderRadius: '0.5rem',
                  border: '1px solid #D1D5DB',
                  backgroundColor: '#1A1A2E', color: 'white',
                  fontSize: '0.68rem', fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                <ProviderIcon size={11} />
                Commit Code
              </button>
            )}

            {/* Already committed badge */}
            {repoName && isDone && subtask.codeCommitted && (
              <span style={{
                display: 'flex', alignItems: 'center', gap: '0.25rem',
                padding: '0.3rem 0.65rem', borderRadius: '0.5rem',
                fontSize: '0.68rem', fontWeight: '600',
                backgroundColor: '#F0FDF4', color: '#16A34A',
                border: '1px solid #BBF7D0',
              }}>
                <CheckCircle2 size={11} /> Pushed
              </span>
            )}

            {/* Jira */}
            {jiraConnected && (
              subtask.jiraIssueKey ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-end' }}>
                  {/* Issue key + sync button row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <a
                      href={subtask.jiraIssueUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.25rem',
                        padding: '0.3rem 0.65rem', borderRadius: '0.5rem',
                        border: '1.5px solid #BAE6FD', backgroundColor: '#F0F9FF',
                        color: '#0052CC', fontSize: '0.68rem', fontWeight: '700',
                        textDecoration: 'none',
                      }}
                    >
                      <Link2 size={10} />
                      {subtask.jiraIssueKey}
                      <ExternalLink size={9} />
                    </a>
                    <button
                      onClick={() => onJiraSync(subtask)}
                      disabled={isSyncingJira}
                      title="Force-sync PriorIT status → Jira"
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '24px', height: '24px', borderRadius: '0.375rem',
                        border: `1px solid ${theme.borderMed}`, backgroundColor: theme.cardBg,
                        color: theme.textSub, cursor: isSyncingJira ? 'not-allowed' : 'pointer',
                        opacity: isSyncingJira ? 0.5 : 1, flexShrink: 0,
                      }}
                    >
                      <RefreshCw size={11} style={isSyncingJira ? { animation: 'spin 1s linear infinite' } : {}} />
                    </button>
                  </div>
                  {/* Jira status badge */}
                  {subtask.jiraIssueStatus && (() => {
                    const s = subtask.jiraIssueStatus.toLowerCase();
                    const style = s.includes('done') || s.includes('resolved') || s.includes('closed')
                      ? { bg: '#F0FDF4', color: '#16A34A' }
                      : s.includes('progress') || s.includes('review')
                      ? { bg: '#EFF6FF', color: '#2563EB' }
                      : { bg: '#F5F3FF', color: '#7C3AED' };
                    return (
                      <span style={{
                        fontSize: '0.62rem', fontWeight: '600',
                        backgroundColor: style.bg, color: style.color,
                        padding: '0.1rem 0.45rem', borderRadius: '9999px',
                      }}>
                        {subtask.jiraIssueStatus}
                      </span>
                    );
                  })()}
                </div>
              ) : (
                <button
                  onClick={() => onJiraPush(subtask)}
                  disabled={isPushingJira}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.25rem',
                    padding: '0.3rem 0.65rem', borderRadius: '0.5rem',
                    border: 'none', backgroundColor: '#0052CC',
                    color: 'white', fontSize: '0.68rem', fontWeight: '600',
                    cursor: isPushingJira ? 'not-allowed' : 'pointer',
                    opacity: isPushingJira ? 0.6 : 1,
                  }}
                >
                  {isPushingJira
                    ? <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} />
                    : <Plus size={10} />}
                  {isPushingJira ? '…' : 'Push to Jira'}
                </button>
              )
            )}
          </div>
        </div>

        {/* Tips expanded */}
        {tipsOpen && subtask.tips?.length > 0 && (
          <div style={{
            marginTop: '0.75rem', marginLeft: '2.5rem',
            backgroundColor: '#FFFBEB', borderRadius: '0.5rem',
            padding: '0.75rem', border: '1px solid #FDE68A',
          }}>
            {subtask.tips.map((tip, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
                marginBottom: i < subtask.tips.length - 1 ? '0.5rem' : 0,
              }}>
                <span style={{ color: '#F5A623', fontWeight: '700', flexShrink: 0, fontSize: '0.78rem' }}>
                  {i + 1}.
                </span>
                <p style={{ fontSize: '0.78rem', color: theme.textMed, lineHeight: 1.5 }}>{tip}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PlanCard({ text }) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  return (
    <div style={{
      backgroundColor: theme.cardBg, borderRadius: '0.75rem',
      border: `1px solid ${theme.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '0.875rem 1.25rem',
        borderBottom: `1px solid ${theme.border}`,
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        backgroundColor: '#1A1A2E',
      }}>
        <Rocket size={15} color="#F87171" />
        <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'white' }}>
          {t('workplace_overall_plan')}
        </span>
      </div>
      <div style={{ padding: '1rem 1.25rem' }}>
        <p style={{ fontSize: '0.83rem', color: theme.textMed, lineHeight: 1.7 }}>{text}</p>
      </div>
    </div>
  );
}

function TipsCard({ tips }) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  if (!tips?.length) return null;
  return (
    <div style={{
      backgroundColor: theme.cardBg, borderRadius: '0.75rem',
      border: `1px solid ${theme.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '0.875rem 1.25rem',
        borderBottom: `1px solid ${theme.border}`,
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        backgroundColor: '#FFFBEB',
      }}>
        <Lightbulb size={15} color="#D97706" />
        <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#92400E' }}>
          {t('workplace_tips')}
        </span>
      </div>
      <div style={{ padding: '0.875rem 1.25rem' }}>
        {tips.map((tip, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: '0.625rem',
            marginBottom: i < tips.length - 1 ? '0.75rem' : 0,
          }}>
            <div style={{
              width: '20px', height: '20px', borderRadius: '50%',
              backgroundColor: '#FEF3C7', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: '0.65rem', fontWeight: '700', color: '#D97706' }}>{i + 1}</span>
            </div>
            <p style={{ fontSize: '0.82rem', color: theme.textMed, lineHeight: 1.6 }}>{tip}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function BenchmarksCard({ benchmarks }) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  if (!benchmarks?.length) return null;
  return (
    <div style={{
      backgroundColor: theme.cardBg, borderRadius: '0.75rem',
      border: `1px solid ${theme.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '0.875rem 1.25rem',
        borderBottom: `1px solid ${theme.border}`,
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        backgroundColor: '#F0FDF4',
      }}>
        <Building2 size={15} color="#16A34A" />
        <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#14532D' }}>
          {t('workplace_benchmarks')}
        </span>
      </div>
      <div style={{ padding: '0.75rem' }}>
        {benchmarks.map((bm, i) => (
          <div key={i} style={{
            padding: '0.75rem',
            borderRadius: '0.5rem',
            backgroundColor: theme.hoverBg,
            border: `1px solid ${theme.border}`,
            marginBottom: i < benchmarks.length - 1 ? '0.5rem' : 0,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: '700', color: theme.text }}>
                🏦 {bm.bank}
              </span>
              <span style={{
                padding: '0.15rem 0.5rem', borderRadius: '9999px',
                fontSize: '0.65rem', fontWeight: '600',
                backgroundColor: '#DCFCE7', color: '#16A34A',
                flexShrink: 0, marginLeft: '0.5rem',
              }}>
                {bm.implementationTime}
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', fontWeight: '600', color: theme.textMed, marginBottom: '0.25rem' }}>
              {bm.feature}
            </p>
            {bm.outcome && (
              <p style={{ fontSize: '0.75rem', color: theme.textSub, lineHeight: 1.5 }}>
                {bm.outcome}
              </p>
            )}
            {bm.source && (
              <p style={{ fontSize: '0.68rem', color: theme.textMuted, marginTop: '0.35rem', fontStyle: 'italic' }}>
                {t('benchmark_source')}: {bm.source}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DoraCard({ wp }) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const riskStyle = RISK_STYLE[wp.changeFailureRisk] || RISK_STYLE.MEDIUM;

  return (
    <div style={{
      backgroundColor: theme.cardBg, borderRadius: '0.75rem',
      border: `1px solid ${theme.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '0.875rem 1.25rem',
        borderBottom: `1px solid ${theme.border}`,
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        backgroundColor: '#EFF6FF',
      }}>
        <BarChart3 size={15} color="#2563EB" />
        <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#1E40AF' }}>
          {t('workplace_dora')}
        </span>
      </div>
      <div style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div style={{ backgroundColor: theme.hoverBg, borderRadius: '0.5rem', padding: '0.625rem' }}>
            <p style={{ fontSize: '0.68rem', color: theme.textSub, marginBottom: '0.25rem' }}>
              {t('dora_lead_time')}
            </p>
            <p style={{ fontSize: '1.1rem', fontWeight: '700', color: theme.text }}>
              {wp.estimatedLeadTimeDays ?? '—'}<span style={{ fontSize: '0.75rem', color: theme.textSub, marginLeft: '0.2rem' }}>d</span>
            </p>
          </div>
          <div style={{ backgroundColor: theme.hoverBg, borderRadius: '0.5rem', padding: '0.625rem' }}>
            <p style={{ fontSize: '0.68rem', color: theme.textSub, marginBottom: '0.25rem' }}>
              {t('dora_freq')}
            </p>
            <p style={{ fontSize: '0.78rem', fontWeight: '700', color: theme.text }}>
              {FREQ_KEY_MAP[wp.deploymentFrequency] ? t(FREQ_KEY_MAP[wp.deploymentFrequency]) : (wp.deploymentFrequency ?? '—')}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: theme.textSub }}>{t('dora_change_risk')}</span>
          <span style={{
            padding: '0.2rem 0.6rem', borderRadius: '9999px',
            fontSize: '0.7rem', fontWeight: '700',
            backgroundColor: riskStyle.bg, color: riskStyle.color,
          }}>
            {wp.changeFailureRisk ?? '—'}
          </span>
        </div>

        {wp.recoveryPlan && (
          <div style={{
            backgroundColor: '#F0F9FF', borderRadius: '0.5rem',
            padding: '0.625rem', border: '1px solid #BAE6FD',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.3rem' }}>
              <ShieldCheck size={12} color="#0284C7" />
              <span style={{ fontSize: '0.68rem', fontWeight: '700', color: '#0284C7' }}>
                {t('dora_recovery_plan')}
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: theme.textMed, lineHeight: 1.5 }}>
              {wp.recoveryPlan}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

const PRIORITY_COLOR = ['#CC2027', '#7C3AED', '#2563EB', '#059669'];
const MOSCOW_COLOR = { MUST: '#DC2626', SHOULD: '#D97706', COULD: '#2563EB', WONT: '#9CA3AF' };
const MOSCOW_BG    = { MUST: '#FEF2F2', SHOULD: '#FFF7ED', COULD: '#EFF6FF', WONT: '#F9FAFB' };

function WorkplaceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const { user } = useAuthStore();

  const [workplace, setWorkplace] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [updatingIds, setUpdatingIds] = useState(new Set());
  const [regenerating, setRegenerating] = useState(false);
  const [commitModal, setCommitModal] = useState(null);

  /* unified workplace */
  const [unified, setUnified]           = useState(null);
  const [merging, setMerging]           = useState(false);
  const [mergeError, setMergeError]     = useState(null);

  /* jira */
  const [jiraConnected, setJiraConnected] = useState(false);
  const [jiraProjects, setJiraProjects] = useState([]);
  const [jiraPushModal, setJiraPushModal] = useState(null); // { subtask, pushAll }
  const [pushProject, setPushProject] = useState('');
  const [pushType, setPushType] = useState('Task');
  const [pushSaving, setPushSaving] = useState(false);
  const [pushError, setPushError] = useState('');
  const [pushingSubtaskId, setPushingSubtaskId] = useState(null);
  const [syncingJiraId, setSyncingJiraId] = useState(null);

  // displayWorkplace has the same shape as workplace but with AI text auto-translated
  const displayWorkplace = useTranslatedWorkplace(workplace);

  const loadUnified = () => {
    workplaceService.getUnified(id).then(setUnified).catch(() => setUnified(null));
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await workplaceService.getById(id);
      setWorkplace(data);
      loadUnified();
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    jiraService.getStatus().then(s => {
      if (s?.connected) {
        setJiraConnected(true);
        jiraService.listProjects().then(p => {
          setJiraProjects(p);
          if (p.length > 0) setPushProject(p[0].key);
        }).catch(() => {});
      }
    }).catch(() => {});
  }, [id]);

  const handleStatusChange = async (subtaskId, newStatus) => {
    setUpdatingIds(prev => new Set(prev).add(subtaskId));

    // Optimistic update
    setWorkplace(prev => ({
      ...prev,
      subtasks: prev.subtasks.map(s =>
        s.id === subtaskId
          ? { ...s, status: newStatus,
              startedAt: newStatus === 'IN_PROGRESS' && !s.startedAt ? new Date().toISOString() : s.startedAt,
              completedAt: newStatus === 'DONE' ? new Date().toISOString() : s.completedAt }
          : s
      ),
    }));

    try {
      const updated = await workplaceService.updateSubtaskStatus(subtaskId, newStatus);
      setWorkplace(prev => ({
        ...prev,
        progressPercent: updated.progressPercent ?? prev.progressPercent,
        status: updated.status ?? prev.status,
        subtasks: prev.subtasks.map(s => s.id === subtaskId ? { ...s, ...updated } : s),
      }));
      // Reload full workplace to get updated progress/status
      const fresh = await workplaceService.getById(id);
      setWorkplace(fresh);
      loadUnified();
    } catch (e) {
      // Revert on error
      load();
    } finally {
      setUpdatingIds(prev => { const s = new Set(prev); s.delete(subtaskId); return s; });
    }
  };

  const openPushModal = (subtask) => {
    setJiraPushModal({ subtask, pushAll: false });
    setPushError('');
    setPushType('Task');
  };

  const openPushAllModal = () => {
    setJiraPushModal({ subtask: null, pushAll: true });
    setPushError('');
    setPushType('Task');
  };

  const handleJiraPush = async () => {
    if (!pushProject) { setPushError('Select a project.'); return; }
    setPushSaving(true);
    setPushError('');

    const subtasksToPush = jiraPushModal.pushAll
      ? (workplace.subtasks || []).filter(s => !s.jiraIssueKey)
      : [jiraPushModal.subtask];

    try {
      for (const subtask of subtasksToPush) {
        setPushingSubtaskId(subtask.id);
        const result = await jiraService.pushSubtask({
          subtaskId: subtask.id,
          projectKey: pushProject,
          issueType: pushType,
        });
        setWorkplace(prev => ({
          ...prev,
          subtasks: prev.subtasks.map(s => s.id === subtask.id
            ? { ...s, jiraIssueKey: result.issueKey, jiraIssueUrl: result.issueUrl, jiraIssueStatus: result.status }
            : s
          ),
        }));
      }
      setJiraPushModal(null);
    } catch (e) {
      setPushError(e?.response?.data?.message || 'Failed to create Jira issue.');
    } finally {
      setPushSaving(false);
      setPushingSubtaskId(null);
    }
  };

  const handleJiraForceSync = async (subtask) => {
    setSyncingJiraId(subtask.id);
    try {
      const result = await jiraService.forceSyncSubtask(subtask.id);
      if (result?.jiraStatus) {
        setWorkplace(prev => ({
          ...prev,
          subtasks: prev.subtasks.map(s => s.id === subtask.id
            ? { ...s, jiraIssueStatus: result.jiraStatus }
            : s
          ),
        }));
      }
    } catch (e) {
      // fire-and-forget — sync errors don't break the UI
    } finally {
      setSyncingJiraId(null);
    }
  };

  const handleRegenerate = async () => {
    if (!workplace) return;
    setRegenerating(true);
    try {
      const fresh = await workplaceService.regenerate(workplace.taskId);
      setWorkplace(fresh);
      loadUnified();
    } catch (e) {
      setError(e.response?.data?.message || 'Regeneration failed');
    } finally {
      setRegenerating(false);
    }
  };

  const handleMerge = async () => {
    setMerging(true);
    setMergeError(null);
    try {
      const result = await workplaceService.merge(id);
      setUnified(result);
      const fresh = await workplaceService.getById(id);
      setWorkplace(fresh);
    } catch (e) {
      setMergeError(e.response?.data?.message || 'Merge failed');
    } finally {
      setMerging(false);
    }
  };

  if (loading) return (
    <PageWrapper title="">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ textAlign: 'center', padding: '4rem', color: '#6B7280' }}>
        <Loader2 size={32} color="#CC2027" style={{ margin: '0 auto 0.75rem', animation: 'spin 1s linear infinite' }} />
        <p style={{ fontSize: '0.85rem' }}>{t('common_loading')}</p>
      </div>
    </PageWrapper>
  );

  if (error || !workplace) return (
    <PageWrapper title="">
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '0.875rem 1rem', borderRadius: '0.5rem',
        backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
        color: '#DC2626', fontSize: '0.85rem',
      }}>
        <AlertCircle size={16} />
        <span>{error || 'Workplace not found'}</span>
      </div>
    </PageWrapper>
  );

  const isUnified = (unified?.sections?.length ?? 0) > 1;
  const canMerge  = isUnified && unified?.canMerge
    && (user?.role === 'ADMIN' || user?.role === 'IT_MANAGER');

  const pct = isUnified ? (unified?.overallProgress ?? 0) : (displayWorkplace.progressPercent ?? 0);
  const statusStyle = STATUS_STYLE[displayWorkplace.status] || STATUS_STYLE.ACTIVE;
  const doneCnt = isUnified ? (unified?.doneSubtasks ?? 0) : (displayWorkplace.subtasks?.filter(s => s.status === 'DONE').length ?? 0);
  const total   = isUnified ? (unified?.totalSubtasks ?? 0) : (displayWorkplace.subtasks?.length ?? 0);

  const hasRepo         = !!workplace.gitRepoName;
  const gitProviderLC   = workplace.gitProvider?.toLowerCase();
  const ProviderIcon    = gitProviderLC === 'gitlab' ? GitBranch : GitFork;
  const uncommittedDone = workplace.subtasks?.filter(s => s.status === 'DONE' && !s.codeCommitted) ?? [];

  return (
    <PageWrapper title={displayWorkplace.taskTitle} subtitle={displayWorkplace.taskType}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Jira push modal */}
      {jiraPushModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000, padding: '1rem',
        }}>
          <div style={{
            backgroundColor: theme.cardBg, borderRadius: '1rem',
            width: '100%', maxWidth: '460px',
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
                <div>
                  <p style={{ fontSize: '0.9rem', fontWeight: '700', color: theme.text }}>
                    {jiraPushModal.pushAll ? 'Push all subtasks to Jira' : 'Push subtask to Jira'}
                  </p>
                  {!jiraPushModal.pushAll && (
                    <p style={{ fontSize: '0.75rem', color: theme.textSub, marginTop: '0.1rem' }}>
                      {jiraPushModal.subtask?.title}
                    </p>
                  )}
                  {jiraPushModal.pushAll && (
                    <p style={{ fontSize: '0.75rem', color: theme.textSub, marginTop: '0.1rem' }}>
                      {workplace.subtasks?.filter(s => !s.jiraIssueKey).length} subtasks will be created
                    </p>
                  )}
                </div>
              </div>
              <button onClick={() => setJiraPushModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textMuted }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div>
                <label style={{
                  display: 'block', fontSize: '0.75rem', fontWeight: '600',
                  color: theme.textMed, marginBottom: '0.4rem',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>Project</label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={pushProject}
                    onChange={e => setPushProject(e.target.value)}
                    style={{
                      width: '100%', padding: '0.65rem 2rem 0.65rem 1rem',
                      border: `1.5px solid ${theme.borderMed}`, borderRadius: '0.5rem',
                      fontSize: '0.875rem', outline: 'none', appearance: 'none',
                      backgroundColor: theme.inputBg, color: theme.text,
                      cursor: 'pointer', boxSizing: 'border-box',
                    }}
                  >
                    {jiraProjects.length === 0 && <option value="">No projects found</option>}
                    {jiraProjects.map(p => (
                      <option key={p.key} value={p.key}>{p.name} ({p.key})</option>
                    ))}
                  </select>
                  <ChevronDown size={14} color="#9CA3AF" style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block', fontSize: '0.75rem', fontWeight: '600',
                  color: theme.textMed, marginBottom: '0.4rem',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>Issue type</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {JIRA_ISSUE_TYPES.map(tp => (
                    <button key={tp} onClick={() => setPushType(tp)} style={{
                      padding: '0.35rem 0.875rem', borderRadius: '0.4rem',
                      border: `1.5px solid ${pushType === tp ? '#0052CC' : theme.borderMed}`,
                      backgroundColor: pushType === tp ? '#EBF4FF' : theme.cardBg,
                      color: pushType === tp ? '#0052CC' : theme.textSub,
                      fontSize: '0.8rem', fontWeight: '500', cursor: 'pointer',
                    }}>{tp}</button>
                  ))}
                </div>
              </div>

              {pushError && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.6rem 0.875rem', backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA', borderRadius: '0.45rem',
                }}>
                  <AlertCircle size={14} color="#DC2626" />
                  <p style={{ fontSize: '0.78rem', color: '#DC2626' }}>{pushError}</p>
                </div>
              )}
            </div>

            <div style={{
              padding: '1rem 1.5rem', borderTop: `1px solid ${theme.border}`,
              display: 'flex', justifyContent: 'flex-end', gap: '0.5rem',
            }}>
              <button onClick={() => setJiraPushModal(null)} style={{
                padding: '0.5rem 1.1rem', backgroundColor: theme.cardBg,
                border: `1.5px solid ${theme.borderMed}`, borderRadius: '0.5rem',
                fontSize: '0.82rem', fontWeight: '600', color: theme.textSub, cursor: 'pointer',
              }}>
                Cancel
              </button>
              <button onClick={handleJiraPush} disabled={pushSaving} style={{
                padding: '0.5rem 1.25rem',
                backgroundColor: pushSaving ? '#9CA3AF' : '#0052CC',
                color: 'white', border: 'none', borderRadius: '0.5rem',
                fontSize: '0.82rem', fontWeight: '600',
                cursor: pushSaving ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '0.4rem',
              }}>
                {pushSaving
                  ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Pushing…</>
                  : <><Plus size={14} /> {jiraPushModal.pushAll ? 'Push all' : 'Create in Jira'}</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CommitModal */}
      {commitModal && (
        <CommitModal
          subtask={commitModal.subtask || null}
          subtaskIds={commitModal.subtaskIds || null}
          repoName={workplace.gitRepoName}
          repoBranch={workplace.gitRepoBranch || 'main'}
          provider={gitProviderLC}
          taskTitle={workplace.taskTitle}
          onSuccess={() => { load(); setCommitModal(null); }}
          onClose={() => setCommitModal(null)}
        />
      )}

      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <button onClick={() => navigate('/workplace')} style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          border: 'none', background: 'none', cursor: 'pointer',
          color: theme.textSub, fontSize: '0.82rem', padding: 0,
        }}>
          <ArrowLeft size={16} /> {t('workplace_back')}
        </button>

        <div style={{ flex: 1 }} />

        {/* Repo badge */}
        {hasRepo && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.3rem 0.75rem', borderRadius: '0.5rem',
            border: `1px solid ${theme.borderMed}`, backgroundColor: theme.hoverBg,
          }}>
            <ProviderIcon size={13} color={theme.textMed} />
            <span style={{ fontSize: '0.72rem', fontWeight: '600', color: theme.textMed, fontFamily: 'monospace' }}>
              {workplace.gitRepoName}
            </span>
            <span style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>→</span>
            <span style={{ fontSize: '0.72rem', fontWeight: '600', color: '#2563EB', fontFamily: 'monospace' }}>
              {workplace.gitRepoBranch || 'main'}
            </span>
          </div>
        )}

        {/* Status badge */}
        <span style={{
          padding: '0.25rem 0.75rem', borderRadius: '9999px',
          fontSize: '0.72rem', fontWeight: '700',
          backgroundColor: statusStyle.bg, color: statusStyle.color,
          border: `1px solid ${statusStyle.border}`,
        }}>
          {t(`workplace_status_${displayWorkplace.status?.toLowerCase()}`)}
        </span>

        {/* Stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: theme.textMed }}>
          <Clock size={13} color={theme.textSub} />
          <span>{displayWorkplace.totalEstimatedHours}h</span>
        </div>
        <div style={{ fontSize: '0.78rem', color: theme.textMed }}>
          {doneCnt}/{total} {t('workplace_subtasks')}
        </div>

        {/* Refresh */}
        <button onClick={load} style={{
          display: 'flex', alignItems: 'center', gap: '0.35rem',
          padding: '0.4rem 0.875rem', border: `1px solid ${theme.borderMed}`,
          borderRadius: '0.5rem', backgroundColor: theme.cardBg,
          color: theme.textMed, fontSize: '0.78rem', cursor: 'pointer',
        }}>
          <RefreshCw size={13} /> {t('common_refresh')}
        </button>

        {/* Regenerate */}
        <button onClick={handleRegenerate} disabled={regenerating} style={{
          display: 'flex', alignItems: 'center', gap: '0.35rem',
          padding: '0.4rem 0.875rem', border: `1px solid ${theme.borderMed}`,
          borderRadius: '0.5rem', backgroundColor: theme.cardBg,
          color: theme.textMed, fontSize: '0.78rem',
          cursor: regenerating ? 'not-allowed' : 'pointer',
          opacity: regenerating ? 0.6 : 1,
        }}>
          {regenerating
            ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
            : <RefreshCw size={13} />}
          {t('workplace_regenerate')}
        </button>

        {/* Unified badge */}
        {isUnified && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.35rem',
            padding: '0.3rem 0.75rem', borderRadius: '0.5rem',
            backgroundColor: '#F5F3FF', border: '1px solid #DDD6FE',
            color: '#7C3AED', fontSize: '0.72rem', fontWeight: '700',
          }}>
            <Layers size={12} />
            Unified Workspace
          </div>
        )}

        {/* Merge Workplaces — IT_MANAGER/ADMIN when linked workplaces exist */}
        {canMerge && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
            <button
              onClick={handleMerge}
              disabled={merging}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.4rem 0.875rem',
                border: 'none', backgroundColor: merging ? '#9CA3AF' : '#7C3AED',
                borderRadius: '0.5rem', color: 'white',
                fontSize: '0.78rem', fontWeight: '600',
                cursor: merging ? 'not-allowed' : 'pointer',
              }}
            >
              {merging
                ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                : <Layers size={13} />}
              {merging ? 'Merging…' : 'Merge Workplaces'}
            </button>
            {mergeError && (
              <span style={{ fontSize: '0.68rem', color: '#DC2626' }}>{mergeError}</span>
            )}
          </div>
        )}

        {/* Push All to Jira — when connected and there are unlinked subtasks */}
        {jiraConnected && workplace.subtasks?.some(s => !s.jiraIssueKey) && (
          <button
            onClick={openPushAllModal}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.4rem 0.875rem',
              border: 'none', backgroundColor: '#0052CC',
              borderRadius: '0.5rem', color: 'white',
              fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer',
            }}
          >
            <Link2 size={13} />
            Push All to Jira ({workplace.subtasks.filter(s => !s.jiraIssueKey).length})
          </button>
        )}

        {/* Push All — only when repo is linked and there are uncommitted DONE subtasks */}
        {hasRepo && uncommittedDone.length > 0 && (
          <button
            onClick={() => setCommitModal({ subtaskIds: uncommittedDone.map(s => s.id) })}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.4rem 0.875rem',
              border: 'none', backgroundColor: '#1A1A2E',
              borderRadius: '0.5rem', color: 'white',
              fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer',
            }}
          >
            <ProviderIcon size={13} />
            Push All ({uncommittedDone.length})
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div style={{
        backgroundColor: theme.cardBg, borderRadius: '0.75rem',
        border: `1px solid ${theme.border}`, padding: '1rem 1.25rem',
        marginBottom: '1.25rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: '600', color: theme.textMed }}>
            {isUnified && <Layers size={13} color="#7C3AED" />}
            {isUnified ? 'Overall Progress' : t('workplace_progress')}
          </span>
          <span style={{
            fontSize: '0.9rem', fontWeight: '800',
            color: pct === 100 ? '#16A34A' : (isUnified ? '#7C3AED' : '#CC2027'),
          }}>
            {doneCnt}/{total} · {pct}%
          </span>
        </div>
        <div style={{ height: '10px', backgroundColor: theme.tagBg, borderRadius: '9999px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: '9999px',
            width: `${pct}%`,
            backgroundColor: pct === 100 ? '#16A34A' : '#CC2027',
            transition: 'width 0.4s ease',
          }} />
        </div>
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.25rem', alignItems: 'start' }}>

        {/* LEFT — Subtasks (unified sections or single task) */}
        <div>
          {isUnified ? (
            unified.sections.map((section, idx) => {
              const color = PRIORITY_COLOR[idx] || '#6B7280';
              const sDone  = section.subtasks.filter(s => s.status === 'DONE').length;
              const sTotal = section.subtasks.length;
              const mColor = MOSCOW_COLOR[section.moscowLabel] || '#6B7280';
              const mBg    = MOSCOW_BG[section.moscowLabel]    || '#F9FAFB';
              return (
                <div key={section.workplaceId} style={{ marginBottom: '1.25rem' }}>
                  {/* Section header */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap',
                    padding: '0.75rem 1rem',
                    backgroundColor: `${color}10`,
                    borderRadius: '0.75rem 0.75rem 0 0',
                    border: `1.5px solid ${color}30`, borderBottom: 'none',
                  }}>
                    <span style={{
                      fontSize: '0.62rem', fontWeight: '800', letterSpacing: '0.06em',
                      backgroundColor: color, color: 'white',
                      padding: '0.15rem 0.55rem', borderRadius: '9999px',
                    }}>
                      #{section.priority}
                    </span>
                    <h3 style={{
                      fontSize: '0.9rem', fontWeight: '700', color: theme.text,
                      flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {section.taskTitle}
                    </h3>
                    {section.moscowLabel && (
                      <span style={{
                        padding: '0.15rem 0.5rem', borderRadius: '9999px',
                        fontSize: '0.65rem', fontWeight: '700',
                        backgroundColor: mBg, color: mColor,
                      }}>
                        {section.moscowLabel}
                      </span>
                    )}
                    <span style={{ fontSize: '0.72rem', color: theme.textSub, whiteSpace: 'nowrap' }}>
                      {sDone}/{sTotal}
                    </span>
                    <div style={{
                      width: '72px', height: '6px',
                      backgroundColor: theme.borderMed, borderRadius: '9999px',
                      overflow: 'hidden', flexShrink: 0,
                    }}>
                      <div style={{
                        height: '100%', borderRadius: '9999px',
                        width: `${section.progressPercent}%`,
                        backgroundColor: color,
                        transition: 'width 0.4s ease',
                      }} />
                    </div>
                  </div>

                  {/* Subtask list */}
                  <div style={{
                    border: `1.5px solid ${color}30`,
                    borderTop: 'none',
                    borderRadius: '0 0 0.75rem 0.75rem',
                    padding: '0.875rem',
                    display: 'flex', flexDirection: 'column', gap: '0.75rem',
                    backgroundColor: theme.cardBg,
                  }}>
                    {section.subtasks.length === 0 ? (
                      <p style={{ fontSize: '0.82rem', color: theme.textMuted, textAlign: 'center', padding: '1rem 0' }}>
                        No subtasks in this section yet
                      </p>
                    ) : section.subtasks.map(subtask => (
                      <SubtaskCard
                        key={subtask.id}
                        subtask={subtask}
                        onStatusChange={handleStatusChange}
                        updating={updatingIds.has(subtask.id)}
                        repoName={workplace.gitRepoName}
                        provider={gitProviderLC}
                        onCommit={(s) => setCommitModal({ subtask: s })}
                        jiraConnected={jiraConnected}
                        onJiraPush={openPushModal}
                        isPushingJira={pushingSubtaskId === subtask.id}
                        onJiraSync={handleJiraForceSync}
                        isSyncingJira={syncingJiraId === subtask.id}
                      />
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            <>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                marginBottom: '0.875rem',
              }}>
                <BookOpen size={16} color="#CC2027" />
                <h2 style={{ fontSize: '0.9rem', fontWeight: '700', color: theme.text }}>
                  {t('workplace_subtasks')}
                </h2>
                <span style={{
                  padding: '0.1rem 0.5rem', borderRadius: '9999px',
                  fontSize: '0.65rem', fontWeight: '700',
                  backgroundColor: '#FEF2F2', color: '#CC2027',
                }}>
                  {total}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {displayWorkplace.subtasks?.map(subtask => (
                  <SubtaskCard
                    key={subtask.id}
                    subtask={subtask}
                    onStatusChange={handleStatusChange}
                    updating={updatingIds.has(subtask.id)}
                    repoName={workplace.gitRepoName}
                    provider={gitProviderLC}
                    onCommit={(s) => setCommitModal({ subtask: s })}
                    jiraConnected={jiraConnected}
                    onJiraPush={openPushModal}
                    isPushingJira={pushingSubtaskId === subtask.id}
                    onJiraSync={handleJiraForceSync}
                    isSyncingJira={syncingJiraId === subtask.id}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* RIGHT — Plan, Tips, Benchmarks, DORA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {displayWorkplace.overallPlan && <PlanCard text={displayWorkplace.overallPlan} />}
          <TipsCard tips={displayWorkplace.tips} />
          <BenchmarksCard benchmarks={displayWorkplace.bankingBenchmarks} />
          <DoraCard wp={displayWorkplace} />
        </div>
      </div>
    </PageWrapper>
  );
}

export default WorkplaceDetail;
