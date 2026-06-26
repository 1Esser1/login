import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import EmptyState from '../components/ui/EmptyState';
import {
  ArrowLeft, User, Calendar, Tag, Brain, ExternalLink,
  BriefcaseBusiness, Link2, GitBranch, Clock, CheckCircle2,
  AlertCircle, Loader2, Lock, Plus, X, Search, GitMerge, ListChecks,
} from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import taskService from '../services/taskService';
import workplaceService from '../services/workplaceService';
import dependencyService from '../services/dependencyService';
import taskLinkService from '../services/taskLinkService';
import useAuthStore from '../store/authStore';
import { useLanguage, useTranslatedTask } from '../i18n/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

const KANO_COLORS = {
  BASIC:        { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA', label: 'Basic' },
  PERFORMANCE:  { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE', label: 'Performance' },
  DELIGHTER:    { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0', label: 'Delighter' },
  INDIFFERENT:  { bg: '#F9FAFB', color: '#6B7280', border: '#E5E7EB', label: 'Indifferent' },
  REVERSE:      { bg: '#FFF7ED', color: '#EA580C', border: '#FED7AA', label: 'Reverse' },
};
const MOSCOW_COLORS = {
  MUST:   { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
  SHOULD: { bg: '#FFF7ED', color: '#D97706', border: '#FDE68A' },
  COULD:  { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
  WONT:   { bg: '#F9FAFB', color: '#6B7280', border: '#E5E7EB' },
};
const STATUS_LABELS = {
  AI_SCORED:            { label: 'AI Scored',             bg: '#F0FDF4', color: '#16A34A' },
  PENDING_SCORING:      { label: 'Pending Scoring',        bg: '#FFF7ED', color: '#D97706' },
  APPROVED:             { label: 'Approved',                bg: '#EFF6FF', color: '#2563EB' },
  REJECTED:             { label: 'Rejected',                bg: '#FEF2F2', color: '#DC2626' },
  OVERRIDE_REQUESTED:   { label: 'Override Requested',     bg: '#F5F3FF', color: '#7C3AED' },
  PENDING_CAB_APPROVAL: { label: 'Awaiting CAB Approval',  bg: '#FFF7ED', color: '#D97706' },
  CAB_APPROVED:         { label: 'CAB Approved',            bg: '#F0FDF4', color: '#16A34A' },
  CAB_REJECTED:         { label: 'CAB Rejected',            bg: '#FEF2F2', color: '#DC2626' },
};

function ScoreBar({ label, value, max = 10 }) {
  const { theme } = useTheme();
  const pct   = Math.min((value / max) * 100, 100);
  const color = pct >= 70 ? '#16A34A' : pct >= 40 ? '#D97706' : '#DC2626';
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
        <span style={{ fontSize: '0.78rem', color: theme.textSub }}>{label}</span>
        <span style={{ fontSize: '0.78rem', fontWeight: '700', color }}>{value?.toFixed(1)}</span>
      </div>
      <div style={{ height: '6px', backgroundColor: theme.tagBg, borderRadius: '9999px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: '9999px' }} />
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value, accent }) {
  const { theme } = useTheme();
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
      padding: '1rem', backgroundColor: accent || theme.hoverBg,
      borderRadius: '0.65rem', border: `1px solid ${theme.border}`,
    }}>
      <div style={{
        width: '34px', height: '34px', borderRadius: '0.5rem',
        backgroundColor: theme.cardBg, border: `1px solid ${theme.borderMed}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={16} color={theme.textSub} />
      </div>
      <div>
        <p style={{ fontSize: '0.68rem', color: theme.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.2rem' }}>
          {label}
        </p>
        <p style={{ fontSize: '0.875rem', fontWeight: '600', color: theme.text }}>{value}</p>
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  const { theme } = useTheme();
  return (
    <p style={{
      fontSize: '0.72rem', fontWeight: '700', color: theme.textMuted,
      textTransform: 'uppercase', letterSpacing: '0.09em',
      marginBottom: '0.75rem',
    }}>
      {children}
    </p>
  );
}

function Badge({ label, style }) {
  return (
    <span style={{
      padding: '0.25rem 0.65rem', borderRadius: '9999px',
      fontSize: '0.72rem', fontWeight: '600',
      border: `1px solid ${style.border}`,
      backgroundColor: style.bg, color: style.color,
    }}>
      {label}
    </span>
  );
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function TaskDetail() {
  const { theme } = useTheme();
  const { id }       = useParams();
  const navigate     = useNavigate();
  const { t }        = useLanguage();

  const { user } = useAuthStore();
  const canManageDeps = user?.role === 'ADMIN' || user?.role === 'IT_MANAGER';

  const [task,      setTask]      = useState(null);
  const [workplace, setWorkplace] = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [wpLoading, setWpLoading] = useState(false);
  const [error,     setError]     = useState('');

  const [linkedTasks, setLinkedTasks]   = useState({ requires: [], requiredFor: [] });
  const [linksLoading, setLinksLoading] = useState(false);
  const [showAddLink,  setShowAddLink]  = useState(false);
  const [linkSearch,   setLinkSearch]   = useState('');
  const [linkError,    setLinkError]    = useState('');
  const [addingLink,   setAddingLink]   = useState(false);
  const [pendingLink,  setPendingLink]  = useState(null); // task selected, waiting for direction
  const linkSearchRef = useRef(null);

  const [deps,        setDeps]        = useState({ blockedBy: [], blocks: [] });
  const [depsLoading, setDepsLoading] = useState(false);
  const [showAddDep,  setShowAddDep]  = useState(false);
  const [allTasks,    setAllTasks]    = useState([]);
  const [depSearch,   setDepSearch]   = useState('');
  const [addingDep,   setAddingDep]   = useState(false);
  const [depError,    setDepError]    = useState('');
  const searchRef = useRef(null);

  const [cabBusy, setCabBusy] = useState(false);
  const handleRequestCab = async () => {
    setCabBusy(true);
    try {
      const updated = await taskService.requestCabApproval(task.id);
      setTask(updated);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to request approval');
    } finally {
      setCabBusy(false);
    }
  };

  const tx = useTranslatedTask(task, !!task);

  useEffect(() => {
    setLoading(true);
    taskService.getById(id)
      .then(data => {
        setTask(data);
        setWpLoading(true);
        return workplaceService.getByTask(data.id).catch(() => null);
      })
      .then(wp => { setWorkplace(wp); })
      .catch(err => {
        if (err?.response?.status === 403) {
          setError("You don't have permission to view this task.");
        } else {
          setError('Task not found or server is unavailable.');
        }
      })
      .finally(() => { setLoading(false); setWpLoading(false); });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setLinksLoading(true);
    taskLinkService.getLinks(id)
      .then(data => setLinkedTasks(data || { requires: [], requiredFor: [] }))
      .catch(() => {})
      .finally(() => setLinksLoading(false));
  }, [id]);

  const refreshLinks = async () => {
    const data = await taskLinkService.getLinks(id);
    setLinkedTasks(data || { requires: [], requiredFor: [] });
  };

  const handleAddLink = async (direction) => {
    if (!pendingLink) return;
    setAddingLink(true);
    setLinkError('');
    try {
      await taskLinkService.linkTasks(Number(id), pendingLink.id, direction);
      await refreshLinks();
      setPendingLink(null);
      setLinkSearch('');
      setShowAddLink(false);
    } catch (e) {
      setLinkError(e?.response?.data?.message || 'Failed to link tasks');
    } finally {
      setAddingLink(false);
    }
  };

  const handleAddLinkAi = async () => {
    if (!pendingLink) return;
    setAddingLink(true);
    setLinkError('');
    try {
      await taskLinkService.linkTasksWithAi(Number(id), pendingLink.id);
      await refreshLinks();
      setPendingLink(null);
      setLinkSearch('');
      setShowAddLink(false);
    } catch (e) {
      setLinkError(e?.response?.data?.message || 'Failed to link tasks');
    } finally {
      setAddingLink(false);
    }
  };

  // Remove a "requires" link: prereqTask → this task
  const handleRemoveRequires = async (prereqTask) => {
    try {
      await taskLinkService.unlinkTasks(prereqTask.id, Number(id));
      setLinkedTasks(prev => ({ ...prev, requires: prev.requires.filter(t => t.id !== prereqTask.id) }));
    } catch (e) {
      setLinkError(e?.response?.data?.message || 'Failed to remove link');
    }
  };

  // Remove a "requiredFor" link: this task → depTask
  const handleRemoveRequiredFor = async (depTask) => {
    try {
      await taskLinkService.unlinkTasks(Number(id), depTask.id);
      setLinkedTasks(prev => ({ ...prev, requiredFor: prev.requiredFor.filter(t => t.id !== depTask.id) }));
    } catch (e) {
      setLinkError(e?.response?.data?.message || 'Failed to remove link');
    }
  };

  useEffect(() => {
    if (!id) return;
    setDepsLoading(true);
    dependencyService.getAll(id)
      .then(data => setDeps(data))
      .catch(() => {})
      .finally(() => setDepsLoading(false));
  }, [id]);

  const loadAllTasks = () => {
    if (allTasks.length > 0) return;
    taskService.getAllTasks().then(data => setAllTasks(data)).catch(() => {});
  };

  const handleAddDep = async (blockingTaskId) => {
    setAddingDep(true);
    setDepError('');
    try {
      await dependencyService.add(id, blockingTaskId);
      const updated = await dependencyService.getAll(id);
      setDeps(updated);
      setDepSearch('');
      setShowAddDep(false);
    } catch (e) {
      setDepError(e?.response?.data?.message || 'Failed to add dependency');
    } finally {
      setAddingDep(false);
    }
  };

  const handleRemoveDep = async (blockingTaskId) => {
    try {
      await dependencyService.remove(id, blockingTaskId);
      setDeps(prev => ({
        blockedBy: prev.blockedBy.filter(t => t.id !== blockingTaskId),
        blocks: prev.blocks,
      }));
    } catch (e) {
      setDepError(e?.response?.data?.message || 'Failed to remove dependency');
    }
  };

  const handleRemoveBlocks = async (blockedTaskId) => {
    try {
      await dependencyService.remove(blockedTaskId, Number(id));
      setDeps(prev => ({
        blockedBy: prev.blockedBy,
        blocks: prev.blocks.filter(t => t.id !== blockedTaskId),
      }));
    } catch (e) {
      setDepError(e?.response?.data?.message || 'Failed to remove dependency');
    }
  };

  if (loading) {
    return (
      <PageWrapper title="Task Detail">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '0.75rem', color: theme.textMuted }}>
          <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
          <span>Loading task…</span>
        </div>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper title="Task Detail">
        <div style={{ maxWidth: '500px', margin: '3rem auto', textAlign: 'center' }}>
          <AlertCircle size={36} color="#DC2626" style={{ marginBottom: '1rem' }} />
          <p style={{ fontWeight: '600', color: theme.text, marginBottom: '0.5rem' }}>{error}</p>
          <button onClick={() => navigate(-1)} style={{
            marginTop: '1rem', padding: '0.5rem 1.25rem',
            backgroundColor: '#1A1A2E', color: 'white',
            border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.875rem',
          }}>
            Go back
          </button>
        </div>
      </PageWrapper>
    );
  }

  const kano   = KANO_COLORS[task.kanoCategory]  || null;
  const moscow = MOSCOW_COLORS[task.moscowLabel]  || null;
  const status = STATUS_LABELS[task.status]       || { label: task.status, bg: '#F3F4F6', color: '#6B7280' };
  const multiplier = task.multiplierApplied ?? 1.0;

  return (
    <PageWrapper title={tx?.title || task.title} subtitle="Task detail">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
          padding: '0.4rem 0.85rem', marginBottom: '1.25rem',
          backgroundColor: theme.cardBg, border: `1.5px solid ${theme.borderMed}`,
          borderRadius: '0.5rem', fontSize: '0.8rem', color: theme.textSub,
          cursor: 'pointer',
        }}
      >
        <ArrowLeft size={14} /> Back
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.25rem', alignItems: 'start' }}>

        {/* ── Left column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Title + badges */}
          <div style={{
            backgroundColor: theme.cardBg, borderRadius: '0.85rem',
            border: `1px solid ${theme.border}`, padding: '1.5rem',
            borderLeft: `4px solid ${moscow?.color || theme.borderMed}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              <span style={{
                fontSize: '0.72rem', fontWeight: '600',
                padding: '0.2rem 0.65rem', borderRadius: '9999px',
                backgroundColor: status.bg, color: status.color,
              }}>
                {status.label}
              </span>
              {kano   && <Badge label={kano.label}        style={kano} />}
              {moscow && <Badge label={task.moscowLabel}  style={moscow} />}
              {task.taskType && (
                <span style={{
                  fontSize: '0.72rem', fontWeight: '500',
                  padding: '0.2rem 0.65rem', borderRadius: '4px',
                  backgroundColor: task.taskTypeColor ? `${task.taskTypeColor}15` : theme.tagBg,
                  color: task.taskTypeColor || theme.textSub,
                  border: `1px solid ${task.taskTypeColor ? `${task.taskTypeColor}30` : theme.borderMed}`,
                }}>
                  {task.taskType}
                </span>
              )}
            </div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: '700', color: theme.text, marginBottom: '0.75rem', lineHeight: 1.4 }}>
              {tx?.title || task.title}
            </h2>
            {task.description && (
              <p style={{ fontSize: '0.875rem', color: theme.textSub, lineHeight: 1.7 }}>
                {tx?.description || task.description}
              </p>
            )}

            {/* ── CAB section ── */}
            {/* Request button — developer/product role + task is AI_SCORED */}
            {(user?.role === 'DEVELOPER' || user?.role === 'PRODUCT_TEAM') && task.status === 'AI_SCORED' && (
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: `1px solid ${theme.border}` }}>
                <button
                  onClick={handleRequestCab}
                  disabled={cabBusy}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '7px',
                    padding: '8px 18px', borderRadius: '8px',
                    border: '1.5px solid rgba(124,58,237,0.4)',
                    background: 'rgba(124,58,237,0.1)',
                    color: '#7C3AED', fontSize: '0.82rem', fontWeight: '700',
                    cursor: cabBusy ? 'not-allowed' : 'pointer',
                    opacity: cabBusy ? 0.7 : 1,
                  }}
                >
                  <ListChecks size={15} />
                  {cabBusy ? 'Requesting…' : 'Request Production Approval'}
                </button>
              </div>
            )}

            {/* CAB status banner — pending / approved / rejected */}
            {['PENDING_CAB_APPROVAL', 'CAB_APPROVED', 'CAB_REJECTED'].includes(task.status) && (
              <div style={{
                marginTop: '1rem', paddingTop: '1rem', borderTop: `1px solid ${theme.border}`,
                display: 'flex', flexDirection: 'column', gap: '0.4rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ListChecks size={14} color={STATUS_LABELS[task.status]?.color} />
                  <span style={{ fontSize: '0.78rem', fontWeight: '700', color: STATUS_LABELS[task.status]?.color }}>
                    {STATUS_LABELS[task.status]?.label}
                  </span>
                  {task.cabReviewedBy && (
                    <span style={{ fontSize: '0.72rem', color: theme.textMuted }}>
                      · by {task.cabReviewedBy}
                    </span>
                  )}
                </div>
                {task.cabComment && (
                  <p style={{
                    fontSize: '0.78rem', color: theme.textMed,
                    padding: '0.5rem 0.75rem', borderRadius: '6px',
                    background: task.status === 'CAB_APPROVED'
                      ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)',
                    border: `1px solid ${task.status === 'CAB_APPROVED'
                      ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.2)'}`,
                  }}>
                    {task.cabComment}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* AI Industry Context */}
          {task.industryContext && (
            <div style={{ backgroundColor: '#1A1A2E', borderRadius: '0.85rem', padding: '1.25rem' }}>
              <SectionTitle><span style={{ color: '#4B5563' }}>AI Industry Context</span></SectionTitle>
              <p style={{ fontSize: '0.825rem', color: '#9CA3AF', lineHeight: 1.7 }}>
                {tx?.industryContext || task.industryContext}
              </p>
              {task.modelUsed && (
                <p style={{ fontSize: '0.68rem', color: '#4B5563', marginTop: '0.75rem' }}>
                  🤖 {task.modelUsed}
                </p>
              )}
            </div>
          )}

          {/* Kano + MoSCoW reasoning */}
          {(task.kanoReasoning || task.moscowReasoning) && (
            <div style={{
              backgroundColor: theme.cardBg, borderRadius: '0.85rem',
              border: `1px solid ${theme.border}`, padding: '1.5rem',
            }}>
              {task.kanoReasoning && (
                <div style={{ marginBottom: task.moscowReasoning ? '1.25rem' : 0 }}>
                  <SectionTitle>Kano Reasoning</SectionTitle>
                  <p style={{ fontSize: '0.825rem', color: theme.textSub, lineHeight: 1.7 }}>
                    {tx?.kanoReasoning || task.kanoReasoning}
                  </p>
                </div>
              )}
              {task.moscowReasoning && (
                <div>
                  <SectionTitle>MoSCoW Reasoning</SectionTitle>
                  <p style={{ fontSize: '0.825rem', color: theme.textSub, lineHeight: 1.7 }}>
                    {tx?.moscowReasoning || task.moscowReasoning}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Linked Tasks */}
          <div style={{
            backgroundColor: theme.cardBg, borderRadius: '0.85rem',
            border: `1px solid ${theme.border}`, padding: '1.5rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Link2 size={15} color="#7C3AED" />
                <SectionTitle>Task Dependencies</SectionTitle>
              </div>
              <button
                onClick={() => { setShowAddLink(v => !v); setLinkError(''); setPendingLink(null); loadAllTasks(); setTimeout(() => linkSearchRef.current?.focus(), 50); }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  padding: '4px 10px', borderRadius: '6px', border: `1.5px solid ${theme.borderMed}`,
                  background: showAddLink ? theme.tagBg : theme.cardBg,
                  fontSize: '0.75rem', fontWeight: '600', color: theme.textMed, cursor: 'pointer',
                }}
              >
                <Plus size={12} /> Link
              </button>
            </div>

            {linksLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: theme.textMuted, fontSize: '0.8rem' }}>
                <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Loading…
              </div>
            ) : (
              <>
                {/* Requires section */}
                {linkedTasks.requires.length > 0 && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <p style={{ fontSize: '0.65rem', fontWeight: '700', color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.4rem' }}>
                      ⬆ Requires first
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {linkedTasks.requires.map(t => (
                        <div key={t.id} style={{ borderRadius: '0.5rem', background: '#FEF2F2', border: '1px solid #FECACA', overflow: 'hidden' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.45rem 0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                              <span style={{ fontSize: '0.65rem', color: '#DC2626', fontWeight: '700', flexShrink: 0 }}>PRE</span>
                              <Link to={`/tasks/${t.id}`} style={{
                                fontSize: '0.8rem', fontWeight: '600', color: '#111827',
                                textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}>
                                {t.title}
                              </Link>
                              {t.moscowLabel && (
                                <span style={{
                                  fontSize: '0.65rem', fontWeight: '600', padding: '1px 6px',
                                  borderRadius: '9999px', flexShrink: 0,
                                  background: '#FEF2F2', color: '#DC2626',
                                }}>
                                  {t.moscowLabel}
                                </span>
                              )}
                            </div>
                            <button onClick={() => handleRemoveRequires(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textMuted, padding: '2px', flexShrink: 0 }}>
                              <X size={13} />
                            </button>
                          </div>
                          {t.aiDefined && t.aiReason && (
                            <div style={{ padding: '0 0.75rem 0.5rem', display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
                              <Brain size={10} color="#DC2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                              <span style={{ fontSize: '0.68rem', color: '#B91C1C', lineHeight: '1.4', fontStyle: 'italic' }}>{t.aiReason}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Required For section */}
                {linkedTasks.requiredFor.length > 0 && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <p style={{ fontSize: '0.65rem', fontWeight: '700', color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.4rem' }}>
                      ⬇ Unlocks next
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {linkedTasks.requiredFor.map(t => (
                        <div key={t.id} style={{ borderRadius: '0.5rem', background: '#F5F3FF', border: '1px solid #DDD6FE', overflow: 'hidden' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.45rem 0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                              {t.sequenceOrder && (
                                <span style={{ fontSize: '0.65rem', color: '#7C3AED', fontWeight: '700', flexShrink: 0 }}>#{t.sequenceOrder}</span>
                              )}
                              <Link to={`/tasks/${t.id}`} style={{
                                fontSize: '0.8rem', fontWeight: '600', color: '#111827',
                                textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}>
                                {t.title}
                              </Link>
                              {t.moscowLabel && (
                                <span style={{
                                  fontSize: '0.65rem', fontWeight: '600', padding: '1px 6px',
                                  borderRadius: '9999px', flexShrink: 0,
                                  background: '#F5F3FF', color: '#7C3AED',
                                }}>
                                  {t.moscowLabel}
                                </span>
                              )}
                            </div>
                            <button onClick={() => handleRemoveRequiredFor(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textMuted, padding: '2px', flexShrink: 0 }}>
                              <X size={13} />
                            </button>
                          </div>
                          {t.aiDefined && t.aiReason && (
                            <div style={{ padding: '0 0.75rem 0.5rem', display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
                              <Brain size={10} color="#7C3AED" style={{ flexShrink: 0, marginTop: '2px' }} />
                              <span style={{ fontSize: '0.68rem', color: '#6D28D9', lineHeight: '1.4', fontStyle: 'italic' }}>{t.aiReason}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {linkedTasks.requires.length === 0 && linkedTasks.requiredFor.length === 0 && !showAddLink && (
                  <EmptyState
                    variant="dependency"
                    title="No dependencies yet"
                    subtitle="Link tasks to define the execution order."
                    compact
                  />
                )}

                {/* Add link panel */}
                {showAddLink && (
                  <div style={{ paddingTop: (linkedTasks.requires.length + linkedTasks.requiredFor.length) > 0 ? '1rem' : 0, borderTop: (linkedTasks.requires.length + linkedTasks.requiredFor.length) > 0 ? `1px solid ${theme.border}` : 'none' }}>
                    {!pendingLink ? (
                      <>
                        <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                          <Search size={13} color={theme.textMuted} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                          <input
                            ref={linkSearchRef}
                            value={linkSearch}
                            onChange={e => setLinkSearch(e.target.value)}
                            placeholder="Search task to link…"
                            style={{
                              width: '100%', boxSizing: 'border-box',
                              padding: '8px 10px 8px 30px',
                              border: `1.5px solid ${theme.borderMed}`, borderRadius: '8px',
                              fontSize: '0.8rem', outline: 'none',
                              backgroundColor: theme.inputBg, color: theme.text,
                            }}
                          />
                        </div>
                        <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {allTasks
                            .filter(t =>
                              t.id !== Number(id) &&
                              !linkedTasks.requires.some(l => l.id === t.id) &&
                              !linkedTasks.requiredFor.some(l => l.id === t.id) &&
                              (linkSearch === '' || t.title.toLowerCase().includes(linkSearch.toLowerCase()))
                            )
                            .slice(0, 8)
                            .map(t => (
                              <button key={t.id} onClick={() => setPendingLink(t)}
                                style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                  padding: '7px 10px', borderRadius: '6px',
                                  border: `1px solid ${theme.border}`, background: theme.cardBg,
                                  cursor: 'pointer', textAlign: 'left',
                                }}
                              >
                                <span style={{ fontSize: '0.8rem', color: theme.text, fontWeight: '500' }}>{t.title}</span>
                                <span style={{ fontSize: '0.68rem', color: theme.textMuted }}>{t.submittedBy}</span>
                              </button>
                            ))}
                        </div>
                      </>
                    ) : (
                      <div style={{ background: '#F5F3FF', borderRadius: '8px', border: '1px solid #DDD6FE', padding: '12px' }}>
                        <p style={{ fontSize: '0.72rem', fontWeight: '700', color: '#7C3AED', marginBottom: '10px' }}>
                          Who must be completed first?
                        </p>
                        <p style={{ fontSize: '0.75rem', color: theme.textMed, marginBottom: '8px', fontWeight: '600' }}>
                          "{pendingLink.title}"
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <button onClick={() => handleAddLink('to')} disabled={addingLink} style={{
                            padding: '8px 12px', borderRadius: '6px', border: '1.5px solid #FECACA',
                            background: '#FEF2F2', color: '#DC2626', fontSize: '0.78rem', fontWeight: '600',
                            cursor: 'pointer', textAlign: 'left', opacity: addingLink ? 0.6 : 1,
                          }}>
                            ⬆ "{pendingLink.title}" must come first
                          </button>
                          <button onClick={() => handleAddLink('from')} disabled={addingLink} style={{
                            padding: '8px 12px', borderRadius: '6px', border: '1.5px solid #DDD6FE',
                            background: '#EDE9FE', color: '#7C3AED', fontSize: '0.78rem', fontWeight: '600',
                            cursor: 'pointer', textAlign: 'left', opacity: addingLink ? 0.6 : 1,
                          }}>
                            ⬇ This task must come first (unlocks "{pendingLink.title}")
                          </button>
                          <button onClick={handleAddLinkAi} disabled={addingLink} style={{
                            padding: '8px 12px', borderRadius: '6px', border: `1.5px solid ${theme.borderMed}`,
                            background: theme.cardBg, color: theme.textMed, fontSize: '0.78rem', fontWeight: '600',
                            cursor: 'pointer', textAlign: 'left', opacity: addingLink ? 0.6 : 1,
                            display: 'flex', alignItems: 'center', gap: '6px',
                          }}>
                            <Brain size={13} color={theme.textSub} />
                            {addingLink ? 'AI deciding…' : 'Let AI decide'}
                          </button>
                          <button onClick={() => setPendingLink(null)} style={{
                            padding: '6px 12px', borderRadius: '6px', border: 'none',
                            background: 'none', color: theme.textMuted, fontSize: '0.75rem',
                            cursor: 'pointer', textAlign: 'left',
                          }}>
                            ← Back to search
                          </button>
                        </div>
                        {linkError && (
                          <p style={{ fontSize: '0.75rem', color: '#CC2027', marginTop: '8px', fontWeight: '600' }}>
                            {linkError}
                          </p>
                        )}
                      </div>
                    )}
                    {!pendingLink && linkError && (
                      <p style={{ fontSize: '0.75rem', color: '#CC2027', marginTop: '0.5rem', fontWeight: '600' }}>
                        {linkError}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Dependencies */}
          <div style={{
            backgroundColor: theme.cardBg, borderRadius: '0.85rem',
            border: `1px solid ${theme.border}`, padding: '1.5rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <GitMerge size={15} color={theme.textSub} />
                <SectionTitle>Dependencies</SectionTitle>
              </div>
              {canManageDeps && (
                <button
                  onClick={() => { setShowAddDep(v => !v); setDepError(''); loadAllTasks(); setTimeout(() => searchRef.current?.focus(), 50); }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    padding: '4px 10px', borderRadius: '6px', border: `1.5px solid ${theme.borderMed}`,
                    background: showAddDep ? theme.tagBg : theme.cardBg,
                    fontSize: '0.75rem', fontWeight: '600', color: theme.textMed, cursor: 'pointer',
                  }}
                >
                  <Plus size={12} /> Add
                </button>
              )}
            </div>

            {depsLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: theme.textMuted, fontSize: '0.8rem' }}>
                <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Loading…
              </div>
            ) : (
              <>
                {/* Blocked by */}
                <div style={{ marginBottom: '1rem' }}>
                  <p style={{ fontSize: '0.68rem', fontWeight: '700', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                    Blocked by
                  </p>
                  {deps.blockedBy.length === 0 ? (
                    <p style={{ fontSize: '0.8rem', color: theme.borderMed, fontStyle: 'italic' }}>None</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {deps.blockedBy.map(t => (
                        <div key={t.id} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '0.5rem 0.75rem', borderRadius: '0.5rem',
                          background: '#FFF1F2', border: '1px solid #FECACA',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                            <Lock size={12} color="#CC2027" style={{ flexShrink: 0 }} />
                            <Link to={`/tasks/${t.id}`} style={{
                              fontSize: '0.8rem', fontWeight: '600', color: '#111827',
                              textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {t.title}
                            </Link>
                            {t.moscowLabel && (
                              <span style={{
                                fontSize: '0.65rem', fontWeight: '600', padding: '1px 6px',
                                borderRadius: '9999px', flexShrink: 0,
                                background: t.moscowLabel === 'MUST' ? '#FEF2F2' : t.moscowLabel === 'SHOULD' ? '#FFF7ED' : '#EFF6FF',
                                color:      t.moscowLabel === 'MUST' ? '#DC2626' : t.moscowLabel === 'SHOULD' ? '#D97706' : '#2563EB',
                              }}>
                                {t.moscowLabel}
                              </span>
                            )}
                          </div>
                          {canManageDeps && (
                            <button onClick={() => handleRemoveDep(t.id)} style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              color: theme.textMuted, padding: '2px', flexShrink: 0,
                            }}>
                              <X size={13} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Blocks */}
                <div>
                  <p style={{ fontSize: '0.68rem', fontWeight: '700', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                    Blocks
                  </p>
                  {deps.blocks.length === 0 ? (
                    <p style={{ fontSize: '0.8rem', color: theme.borderMed, fontStyle: 'italic' }}>None</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {deps.blocks.map(t => (
                        <div key={t.id} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '0.5rem 0.75rem', borderRadius: '0.5rem',
                          background: '#FFF7ED', border: '1px solid #FDE68A',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                            <GitMerge size={12} color="#D97706" style={{ flexShrink: 0 }} />
                            <Link to={`/tasks/${t.id}`} style={{
                              fontSize: '0.8rem', fontWeight: '600', color: '#111827',
                              textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {t.title}
                            </Link>
                            {t.finalScore != null && (
                              <span style={{ fontSize: '0.65rem', color: theme.textMuted, flexShrink: 0 }}>
                                {t.finalScore.toFixed(1)}
                              </span>
                            )}
                          </div>
                          {canManageDeps && (
                            <button onClick={() => handleRemoveBlocks(t.id)} style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              color: theme.textMuted, padding: '2px', flexShrink: 0,
                            }}>
                              <X size={13} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add dependency panel */}
                {showAddDep && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: `1px solid ${theme.border}` }}>
                    <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                      <Search size={13} color={theme.textMuted} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                      <input
                        ref={searchRef}
                        value={depSearch}
                        onChange={e => setDepSearch(e.target.value)}
                        placeholder="Search task to block this one…"
                        style={{
                          width: '100%', boxSizing: 'border-box',
                          padding: '8px 10px 8px 30px',
                          border: `1.5px solid ${theme.borderMed}`, borderRadius: '8px',
                          fontSize: '0.8rem', outline: 'none',
                          backgroundColor: theme.inputBg, color: theme.text,
                        }}
                      />
                    </div>
                    {depError && (
                      <p style={{ fontSize: '0.75rem', color: '#CC2027', marginBottom: '0.5rem', fontWeight: '600' }}>
                        {depError}
                      </p>
                    )}
                    <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {allTasks
                        .filter(t =>
                          t.id !== Number(id) &&
                          !deps.blockedBy.some(d => d.id === t.id) &&
                          (depSearch === '' || t.title.toLowerCase().includes(depSearch.toLowerCase()))
                        )
                        .slice(0, 8)
                        .map(t => (
                          <button
                            key={t.id}
                            onClick={() => handleAddDep(t.id)}
                            disabled={addingDep}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '7px 10px', borderRadius: '6px',
                              border: `1px solid ${theme.border}`, background: theme.cardBg,
                              cursor: 'pointer', textAlign: 'left',
                              opacity: addingDep ? 0.5 : 1,
                            }}
                          >
                            <span style={{ fontSize: '0.8rem', color: theme.text, fontWeight: '500' }}>{t.title}</span>
                            <span style={{ fontSize: '0.68rem', color: theme.textMuted }}>{t.status?.replace('_', ' ')}</span>
                          </button>
                        ))}
                      {allTasks.length > 0 && allTasks.filter(t =>
                        t.id !== Number(id) &&
                        !deps.blockedBy.some(d => d.id === t.id) &&
                        (depSearch === '' || t.title.toLowerCase().includes(depSearch.toLowerCase()))
                      ).length === 0 && (
                        <p style={{ fontSize: '0.78rem', color: theme.textMuted, textAlign: 'center', padding: '0.5rem' }}>No tasks found</p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Workplace */}
          <div style={{
            backgroundColor: theme.cardBg, borderRadius: '0.85rem',
            border: `1px solid ${theme.border}`, padding: '1.5rem',
          }}>
            <SectionTitle>Workplace</SectionTitle>
            {wpLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: theme.textMuted, fontSize: '0.825rem' }}>
                <Loader2 size={14} />
                Checking…
              </div>
            ) : workplace ? (
              <Link
                to={`/workplace/${workplace.id}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.6rem 1.1rem',
                  backgroundColor: '#ECFDF5', border: '1.5px solid #BBF7D0',
                  borderRadius: '0.5rem', textDecoration: 'none',
                  color: '#16A34A', fontSize: '0.825rem', fontWeight: '600',
                }}
              >
                <BriefcaseBusiness size={15} />
                Open Workplace
                <ExternalLink size={13} />
              </Link>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  backgroundColor: theme.borderMed,
                }} />
                <span style={{ fontSize: '0.825rem', color: theme.textMuted }}>
                  No workplace generated yet
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Right column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Meta info */}
          <div style={{
            backgroundColor: theme.cardBg, borderRadius: '0.85rem',
            border: `1px solid ${theme.border}`, padding: '1.25rem',
            display: 'flex', flexDirection: 'column', gap: '0.75rem',
          }}>
            <SectionTitle>Task Info</SectionTitle>
            <InfoCard icon={User}     label="Created by"   value={task.submittedBy || '—'} />
            <InfoCard icon={Calendar} label="Created at"   value={formatDate(task.createdAt)} />
            <InfoCard icon={Tag}      label="Task type"    value={task.taskType || '—'} />
            <InfoCard icon={CheckCircle2} label="Status"   value={status.label} accent={status.bg + '66'} />
          </div>

          {/* RICE breakdown */}
          {task.finalScore != null && (
            <div style={{
              backgroundColor: theme.cardBg, borderRadius: '0.85rem',
              border: `1px solid ${theme.border}`, padding: '1.25rem',
            }}>
              <SectionTitle>RICE Breakdown</SectionTitle>
              {task.reach      != null && <ScoreBar label="Reach"      value={task.reach} />}
              {task.impact     != null && <ScoreBar label="Impact"     value={task.impact} />}
              {task.confidence != null && <ScoreBar label="Confidence" value={task.confidence * 10} />}
              {task.effort     != null && <ScoreBar label="Effort"     value={task.effort} />}

              <div style={{
                marginTop: '1rem', padding: '0.875rem',
                backgroundColor: theme.hoverBg, borderRadius: '0.5rem',
                border: `1px solid ${theme.border}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '0.65rem', color: theme.textMuted }}>RICE</p>
                  <p style={{ fontSize: '1rem', fontWeight: '700', color: theme.text }}>{task.riceScore?.toFixed(2)}</p>
                </div>
                <span style={{ color: theme.borderMed }}>×</span>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '0.65rem', color: theme.textMuted }}>Multiplier</p>
                  <p style={{ fontSize: '1rem', fontWeight: '700', color: theme.text }}>{multiplier.toFixed(2)}</p>
                </div>
                <span style={{ color: theme.borderMed }}>═</span>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '0.65rem', color: theme.textMuted }}>Final</p>
                  <p style={{ fontSize: '1.25rem', fontWeight: '700', color: '#CC2027' }}>{task.finalScore?.toFixed(1)}</p>
                </div>
              </div>

              {task.confidenceLevel && (
                <p style={{ fontSize: '0.72rem', color: theme.textMuted, marginTop: '0.5rem', textAlign: 'center' }}>
                  AI Confidence: <strong style={{ color: theme.textMed }}>{task.confidenceLevel}</strong>
                </p>
              )}
            </div>
          )}

          {/* Jira link */}
          {task.jiraIssueKey && (
            <div style={{
              backgroundColor: theme.cardBg, borderRadius: '0.85rem',
              border: '1px solid #BAE6FD', padding: '1.25rem',
            }}>
              <SectionTitle>Jira</SectionTitle>
              <a
                href={task.jiraIssueUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: '#EBF4FF', border: '1.5px solid #BAE6FD',
                  borderRadius: '0.5rem', textDecoration: 'none',
                  color: '#0052CC', fontSize: '0.825rem', fontWeight: '700',
                }}
              >
                <Link2 size={14} />
                {task.jiraIssueKey}
                <ExternalLink size={12} />
              </a>
              {task.jiraIssueStatus && (
                <p style={{ fontSize: '0.72rem', color: theme.textMuted, marginTop: '0.5rem' }}>
                  Status: {task.jiraIssueStatus}
                </p>
              )}
            </div>
          )}

          {/* Git repo */}
          {task.gitRepoUrl && (
            <div style={{
              backgroundColor: theme.cardBg, borderRadius: '0.85rem',
              border: `1px solid ${theme.border}`, padding: '1.25rem',
            }}>
              <SectionTitle>Git Repository</SectionTitle>
              <a
                href={task.gitRepoUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                  textDecoration: 'none', color: theme.textMed,
                  fontSize: '0.825rem', fontWeight: '600',
                }}
              >
                <GitBranch size={14} color={theme.textSub} />
                {task.gitRepoName || task.gitRepoUrl}
                <ExternalLink size={12} color={theme.textMuted} />
              </a>
              {task.gitRepoBranch && (
                <p style={{ fontSize: '0.72rem', color: theme.textMuted, marginTop: '0.25rem' }}>
                  Branch: {task.gitRepoBranch}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
