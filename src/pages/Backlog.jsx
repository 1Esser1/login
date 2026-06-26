import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, RefreshCw, Edit3, Activity, Trash2, BriefcaseBusiness, Scale, Loader2, CheckSquare, Square, Link2, ExternalLink, Plus, X, ChevronDown, Download, Layers, Lock } from 'lucide-react';
import EmptyState from '../components/ui/EmptyState';
import DoraModal from '../components/dashboard/DoraModal';
import PageWrapper from '../components/layout/PageWrapper';
import taskService from '../services/taskService';
import workplaceService from '../services/workplaceService';
import jiraService from '../services/jiraService';
import OverrideModal from '../components/scoring/OverrideModal';
import BulkMoscowModal from '../components/backlog/BulkMoscowModal';
import overrideService from '../services/overrideService';
import dependencyService from '../services/dependencyService';
import { useLanguage, useTranslatedTask, useDynamicTranslation } from '../i18n/LanguageContext';
import useAuthStore from '../store/authStore';
import { useTheme } from '../contexts/ThemeContext';

const JIRA_ISSUE_TYPES = ['Task', 'Bug', 'Story', 'Epic'];

const KANO_COLORS = {
  BASIC: { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA', label: 'Basic' },
  PERFORMANCE: { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE', label: 'Performance' },
  DELIGHTER: { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0', label: 'Delighter' },
  INDIFFERENT: { bg: '#F9FAFB', color: '#6B7280', border: '#E5E7EB', label: 'Indifferent' },
  REVERSE: { bg: '#FFF7ED', color: '#EA580C', border: '#FED7AA', label: 'Reverse' },
};

const MOSCOW_COLORS = {
  MUST: { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
  SHOULD: { bg: '#FFF7ED', color: '#D97706', border: '#FDE68A' },
  COULD: { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
  WONT: { bg: '#F9FAFB', color: '#6B7280', border: '#E5E7EB' },
};

const KANO_MULTIPLIERS = {
  BASIC: 1.3, PERFORMANCE: 1.0,
  DELIGHTER: 0.8, INDIFFERENT: 1.0, REVERSE: 1.0,
};

const MOSCOW_MULTIPLIERS = {
  MUST: 1.5, SHOULD: 1.2, COULD: 1.0, WONT: 0.5,
};

const STATUS_COLORS = {
  AI_SCORED: { bg: '#F0FDF4', color: '#16A34A' },
  PENDING_SCORING: { bg: '#FFF7ED', color: '#D97706' },
  APPROVED: { bg: '#EFF6FF', color: '#2563EB' },
  REJECTED: { bg: '#FEF2F2', color: '#DC2626' },
  OVERRIDE_REQUESTED: { bg: '#F5F3FF', color: '#7C3AED' },
};

function ScoreBar({ value, max = 100 }) {
  const pct = Math.min((value / max) * 100, 100);
  const color = pct >= 70 ? '#16A34A' : pct >= 40 ? '#D97706' : '#DC2626';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{
        flex: 1, height: '6px', backgroundColor: '#F3F4F6',
        borderRadius: '9999px', overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          backgroundColor: color, borderRadius: '9999px',
          transition: 'width 0.3s ease',
        }} />
      </div>
      <span style={{ fontSize: '0.75rem', fontWeight: '700', color, minWidth: '2.5rem' }}>
        {value?.toFixed(1)}
      </span>
    </div>
  );
}

function Badge({ label, style }) {
  return (
    <span style={{
      padding: '0.2rem 0.6rem', borderRadius: '9999px',
      fontSize: '0.7rem', fontWeight: '600',
      border: `1px solid ${style.border}`,
      backgroundColor: style.bg, color: style.color,
    }}>
      {label}
    </span>
  );
}

const extractBacklogStrings = (items) => [
  ...new Set(items.flatMap(item => [item.title, item.taskType].filter(Boolean)))
];

function downloadTasksCSV(rows) {
  const headers = ['Title','Type','MoSCoW','Kano','Final Score','RICE','Reach','Impact','Confidence','Effort','Submitted By','Status','Created At'];
  const esc = v => { const s = String(v ?? ''); return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g,'""')}"` : s; };
  const csv = [headers.join(','), ...rows.map(r => r.map(esc).join(','))].join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `priorit-tasks-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Each card auto-translates all AI-generated text when expanded
function BacklogTaskCard({ task, index, isExpanded, onToggle, onOverride, onDora, isAdmin, onDelete, isSelectedForCompare, onToggleCompare, compareCount, jiraConnected, onJiraPush, onJiraSync, isSyncingJira, txData, isSelected, onToggleSelect, isBlocked }) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const tx = useTranslatedTask(task, isExpanded);
  const [generatingWp, setGeneratingWp] = useState(false);

  const handleWorkspace = async (e) => {
    e.stopPropagation();
    setGeneratingWp(true);
    try {
      const wp = await workplaceService.generate(task.id);
      navigate(`/workplace/${wp.id}`);
    } catch {
      setGeneratingWp(false);
    }
  };

  const kano = KANO_COLORS[task.kanoCategory] || KANO_COLORS.INDIFFERENT;
  const moscow = MOSCOW_COLORS[task.moscowLabel] || MOSCOW_COLORS.COULD;
  const status = STATUS_COLORS[task.status] || STATUS_COLORS.PENDING_SCORING;
  const multiplier = task.multiplierApplied ??
    (KANO_MULTIPLIERS[task.kanoCategory] || 1.0) * (MOSCOW_MULTIPLIERS[task.moscowLabel] || 1.0);

  return (
    <div style={{
      backgroundColor: theme.cardBg,
      borderRadius: '0.75rem',
      border: isBlocked ? '1px solid #FECACA' : `1px solid ${theme.border}`,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      overflow: 'hidden',
      borderLeft: `4px solid ${isBlocked ? '#CC2027' : moscow.color}`,
    }}>
      <div
        onClick={onToggle}
        style={{
          padding: '1rem 1.25rem', display: 'flex',
          alignItems: 'center', gap: '1rem', cursor: 'pointer',
        }}
      >
        {/* Bulk checkbox */}
        <div
          onClick={e => { e.stopPropagation(); onToggleSelect(task.id); }}
          style={{
            width: '18px', height: '18px', borderRadius: '4px', flexShrink: 0,
            border: `2px solid ${isSelected ? '#CC2027' : theme.borderMed}`,
            backgroundColor: isSelected ? '#CC2027' : theme.cardBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
        >
          {isSelected && <span style={{ color: 'white', fontSize: '11px', lineHeight: 1 }}>✓</span>}
        </div>

        {/* Rank */}
        <div style={{
          width: '32px', height: '32px', borderRadius: '50%',
          backgroundColor: index < 3 ? '#1A1A2E' : '#F3F4F6',
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexShrink: 0,
        }}>
          <span style={{
            fontSize: '0.78rem', fontWeight: '700',
            color: index < 3 ? '#CC2027' : '#6B7280',
          }}>
            #{index + 1}
          </span>
        </div>

        {/* Title + badges */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
            {isBlocked && (
              <span title="This task is blocked by a dependency" style={{
                display: 'inline-flex', alignItems: 'center', gap: '3px',
                fontSize: '0.65rem', fontWeight: '700',
                backgroundColor: '#FFF1F2', color: '#CC2027',
                border: '1px solid #FECACA',
                padding: '1px 6px', borderRadius: '9999px', flexShrink: 0,
              }}>
                <Lock size={9} /> BLOCKED
              </span>
            )}
            <p style={{
              fontSize: '0.875rem', fontWeight: '600', color: theme.text,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {txData?.[task.title] || task.title}
            </p>
            <span style={{
              fontSize: '0.68rem', fontWeight: '500',
              backgroundColor: status.bg, color: status.color,
              padding: '0.1rem 0.5rem', borderRadius: '9999px',
            }}>
              {task.status?.replace(/_/g, ' ')}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '0.72rem',
              color: task.taskTypeColor || theme.textSub,
              backgroundColor: task.taskTypeColor ? `${task.taskTypeColor}15` : theme.tagBg,
              padding: '0.1rem 0.5rem', borderRadius: '4px',
              border: `1px solid ${task.taskTypeColor ? `${task.taskTypeColor}30` : theme.borderMed}`,
              fontWeight: '500',
            }}>
              {txData?.[task.taskType] || task.taskType}
            </span>
            <span style={{ color: '#E5E7EB' }}>·</span>
            <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>{task.submittedBy}</span>
            {task.kanoCategory && <Badge label={kano.label} style={kano} />}
            {task.moscowLabel && <Badge label={task.moscowLabel} style={moscow} />}
          </div>
        </div>

        {/* Score */}
        {task.finalScore != null && (
          <div style={{ minWidth: '120px' }}>
            <p style={{ fontSize: '0.68rem', color: '#9CA3AF', marginBottom: '0.25rem' }}>
              {t('rice_score')}
            </p>
            <ScoreBar value={task.finalScore} max={150} />
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
          {task.finalScore != null && (
            <button
              onClick={handleWorkspace}
              disabled={generatingWp}
              title="Generate Workspace"
              style={{
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.4rem 0.75rem', backgroundColor: '#ECFDF5',
                border: '1.5px solid #BBF7D0', borderRadius: '0.5rem',
                fontSize: '0.75rem', fontWeight: '500',
                color: generatingWp ? '#9CA3AF' : '#16A34A',
                cursor: generatingWp ? 'not-allowed' : 'pointer',
                opacity: generatingWp ? 0.7 : 1,
              }}
            >
              {generatingWp ? <Loader2 size={12} /> : <BriefcaseBusiness size={12} />}
              {generatingWp ? '…' : t('btn_workspace')}
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleCompare(task.id); }}
            title={isSelectedForCompare ? t('btn_remove_from_compare') : t('btn_add_to_compare')}
            disabled={compareCount >= 6 && !isSelectedForCompare}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.4rem 0.75rem',
              backgroundColor: isSelectedForCompare ? '#F5F3FF' : theme.cardBg,
              border: `1.5px solid ${isSelectedForCompare ? '#C4B5FD' : theme.borderMed}`,
              borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: '500',
              color: isSelectedForCompare ? '#7C3AED' : '#6B7280',
              cursor: compareCount >= 6 && !isSelectedForCompare ? 'not-allowed' : 'pointer',
              opacity: compareCount >= 6 && !isSelectedForCompare ? 0.45 : 1,
            }}
          >
            {isSelectedForCompare ? <CheckSquare size={12} /> : <Square size={12} />}
            {isSelectedForCompare ? t('btn_compare_selected') : t('btn_compare')}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/tasks/${task.id}`); }}
            title="View task details"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.4rem 0.75rem', backgroundColor: theme.cardBg,
              border: `1.5px solid ${theme.borderMed}`, borderRadius: '0.5rem',
              fontSize: '0.75rem', fontWeight: '500',
              color: theme.textSub, cursor: 'pointer',
            }}
          >
            <ExternalLink size={12} />
            View
          </button>
          {task.finalScore != null && (
            <button
              onClick={(e) => { e.stopPropagation(); onDora(); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.4rem 0.75rem', backgroundColor: '#1A1A2E',
                border: 'none', borderRadius: '0.5rem',
                fontSize: '0.75rem', fontWeight: '500',
                color: '#9CA3AF', cursor: 'pointer',
              }}
            >
              <Activity size={12} />
              DORA
            </button>
          )}
          {task.finalScore != null && (
            <button
              onClick={(e) => { e.stopPropagation(); onOverride(); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.4rem 0.75rem', backgroundColor: theme.cardBg,
                border: `1.5px solid ${theme.borderMed}`, borderRadius: '0.5rem',
                fontSize: '0.75rem', fontWeight: '500',
                color: theme.textSub, cursor: 'pointer',
              }}
            >
              <Edit3 size={12} />
              {t('override')}
            </button>
          )}
          {isAdmin && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.4rem 0.75rem', backgroundColor: theme.cardBg,
                border: '1.5px solid #FECACA', borderRadius: '0.5rem',
                fontSize: '0.75rem', fontWeight: '500',
                color: '#DC2626', cursor: 'pointer',
              }}
            >
              <Trash2 size={12} />
              {t('btn_delete')}
            </button>
          )}
          {/* Jira */}
          {jiraConnected && (
            task.jiraIssueKey ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }} onClick={e => e.stopPropagation()}>
                <a
                  href={task.jiraIssueUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.25rem',
                    padding: '0.4rem 0.625rem', borderRadius: '0.45rem',
                    border: '1.5px solid #BAE6FD', backgroundColor: '#F0F9FF',
                    color: '#0052CC', fontSize: '0.72rem', fontWeight: '700',
                    textDecoration: 'none',
                  }}
                >
                  <Link2 size={10} />
                  {task.jiraIssueKey}
                  <ExternalLink size={9} />
                </a>
                <button
                  onClick={() => onJiraSync(task)}
                  disabled={isSyncingJira}
                  title="Sync Jira status"
                  style={{
                    display: 'flex', alignItems: 'center',
                    padding: '0.4rem', borderRadius: '0.45rem',
                    border: `1.5px solid ${theme.borderMed}`, backgroundColor: theme.cardBg,
                    color: theme.textSub, cursor: isSyncingJira ? 'not-allowed' : 'pointer',
                    opacity: isSyncingJira ? 0.5 : 1,
                  }}
                >
                  <RefreshCw size={11} style={isSyncingJira ? { animation: 'spin 1s linear infinite' } : {}} />
                </button>
              </div>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); onJiraPush(task); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                  padding: '0.4rem 0.75rem',
                  backgroundColor: '#0052CC', border: 'none',
                  borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: '600',
                  color: 'white', cursor: 'pointer',
                }}
              >
                <Plus size={12} />
                Push to Jira
              </button>
            )
          )}

          <div style={{ display: 'flex', alignItems: 'center', color: '#9CA3AF', fontSize: '0.75rem' }}>
            {isExpanded ? '▲' : '▼'}
          </div>
        </div>
      </div>

      {/* Expanded detail — uses tx (translated task) for all AI-generated text */}
      {isExpanded && (
        <div style={{ padding: '1.25rem', borderTop: `1px solid ${theme.border}`, backgroundColor: theme.hoverBg }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div>
              <p style={{
                fontSize: '0.78rem', fontWeight: '600', color: theme.textMed,
                marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                {t('task_description')}
              </p>
              <p style={{ fontSize: '0.825rem', color: theme.textSub, lineHeight: '1.6', marginBottom: '1rem' }}>
                {tx.description}
              </p>

              {task.industryContext && (
                <>
                  <p style={{
                    fontSize: '0.78rem', fontWeight: '600', color: theme.textMed,
                    marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>
                    {t('ai_industry_context')}
                  </p>
                  <div style={{ padding: '0.75rem', backgroundColor: '#1A1A2E', borderRadius: '0.5rem' }}>
                    <p style={{ fontSize: '0.78rem', color: '#9CA3AF', lineHeight: '1.6' }}>
                      {tx.industryContext}
                    </p>
                    <p style={{ fontSize: '0.68rem', color: '#4B5563', marginTop: '0.5rem' }}>
                      🤖 {task.modelUsed}
                    </p>
                  </div>
                </>
              )}
            </div>

            <div>
              <p style={{
                fontSize: '0.78rem', fontWeight: '600', color: theme.textMed,
                marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                {t('rice_breakdown')}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
                {[
                  { label: t('reach'), value: task.reach, max: 10 },
                  { label: t('impact'), value: task.impact, max: 10 },
                  { label: t('confidence'), value: task.confidence ? task.confidence * 10 : null, max: 10, display: task.confidence },
                  { label: t('effort'), value: task.effort, max: 10 },
                ].map(({ label, value, max, display }) => (
                  value != null && (
                    <div key={label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                        <span style={{ fontSize: '0.72rem', color: '#6B7280' }}>{label}</span>
                        <span style={{ fontSize: '0.72rem', fontWeight: '600', color: '#374151' }}>
                          {display !== undefined ? display : value?.toFixed(1)}
                        </span>
                      </div>
                      <ScoreBar value={value} max={max} />
                    </div>
                  )
                ))}
              </div>

              <div style={{
                padding: '0.75rem', backgroundColor: theme.cardBg,
                borderRadius: '0.5rem', border: `1px solid ${theme.border}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <p style={{ fontSize: '0.68rem', color: theme.textMuted }}>{t('rice_score')}</p>
                  <p style={{ fontSize: '1rem', fontWeight: '700', color: theme.text }}>{task.riceScore?.toFixed(2)}</p>
                </div>
                <div style={{ color: theme.textMuted, fontSize: '0.8rem' }}>×</div>
                <div>
                  <p style={{ fontSize: '0.68rem', color: theme.textMuted }}>{t('multiplier')}</p>
                  <p style={{ fontSize: '1rem', fontWeight: '700', color: theme.text }}>{multiplier.toFixed(2)}</p>
                </div>
                <div style={{ color: theme.textMuted, fontSize: '0.8rem' }}>═</div>
                <div>
                  <p style={{ fontSize: '0.68rem', color: theme.textMuted }}>{t('final_score')}</p>
                  <p style={{ fontSize: '1.25rem', fontWeight: '700', color: '#CC2027' }}>{task.finalScore?.toFixed(1)}</p>
                </div>
              </div>

              {task.kanoReasoning && (
                <div style={{ marginTop: '0.75rem' }}>
                  <p style={{ fontSize: '0.72rem', color: '#9CA3AF', marginBottom: '0.25rem' }}>
                    {t('kano_reasoning')}
                  </p>
                  <p style={{ fontSize: '0.78rem', color: '#6B7280', lineHeight: '1.5' }}>
                    {tx.kanoReasoning}
                  </p>
                </div>
              )}
              {task.moscowReasoning && (
                <div style={{ marginTop: '0.5rem' }}>
                  <p style={{ fontSize: '0.72rem', color: '#9CA3AF', marginBottom: '0.25rem' }}>
                    {t('moscow_reasoning')}
                  </p>
                  <p style={{ fontSize: '0.78rem', color: '#6B7280', lineHeight: '1.5' }}>
                    {tx.moscowReasoning}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Backlog() {
  const [tasks, setTasks] = useState([]);
  const [blockedIds, setBlockedIds] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [filterMoscow, setFilterMoscow] = useState(
    () => sessionStorage.getItem('backlog_filter_moscow') || 'ALL'
  );
  const [overrideTask, setOverrideTask] = useState(null);
  const [doraTask, setDoraTask] = useState(null);
  const [compareSelected, setCompareSelected] = useState(new Set());

  // Bulk selection state
  const [bulkSelected,   setBulkSelected]   = useState(new Set());
  const [bulkMoscowOpen, setBulkMoscowOpen] = useState(false);
  const [bulkJiraOpen,   setBulkJiraOpen]   = useState(false);
  const [bulkJiraProject,setBulkJiraProject] = useState('');
  const [bulkJiraType,   setBulkJiraType]   = useState('Task');
  const [bulkWorking,    setBulkWorking]    = useState(false);

  /* jira */
  const [jiraConnected, setJiraConnected] = useState(false);
  const [jiraProjects, setJiraProjects] = useState([]);
  const [pushModal, setPushModal] = useState(null);    // task | null
  const [pushProject, setPushProject] = useState('');
  const [pushType, setPushType] = useState('Task');
  const [pushSummary, setPushSummary] = useState('');
  const [pushSaving, setPushSaving] = useState(false);
  const [pushError, setPushError] = useState('');
  const [syncingJiraId, setSyncingJiraId] = useState(null);

  const { t } = useLanguage();
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'ADMIN';
  const isPrivileged = user?.role === 'ADMIN' || user?.role === 'IT_MANAGER';
  const txData = useDynamicTranslation(tasks, extractBacklogStrings, 'backlog');

  const toggleCompare = (taskId) => {
    setCompareSelected(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) { next.delete(taskId); } else if (next.size < 6) { next.add(taskId); }
      return next;
    });
  };

  const toggleBulk = (id) => setBulkSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const handleBulkMoscow = async (label, justification) => {
    setBulkWorking(true);
    try {
      await Promise.all([...bulkSelected].map(id =>
        overrideService.createOverride({ taskId: id, fieldChanged: 'MOSCOW_LABEL', newValue: label, justification })
      ));
      setBulkMoscowOpen(false);
      setBulkSelected(new Set());
      loadTasks();
    } catch {
      setError('Some overrides failed. Please try again.');
    } finally {
      setBulkWorking(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${bulkSelected.size} task${bulkSelected.size !== 1 ? 's' : ''}? This cannot be undone.`)) return;
    setBulkWorking(true);
    try {
      await Promise.all([...bulkSelected].map(id => taskService.deleteTask(id)));
      setTasks(prev => prev.filter(t => !bulkSelected.has(t.id)));
      setBulkSelected(new Set());
    } catch {
      setError('Some tasks could not be deleted.');
    } finally {
      setBulkWorking(false);
    }
  };

  const handleBulkExport = () => {
    const rows = tasks.filter(t => bulkSelected.has(t.id)).map(t => [
      t.title, t.taskType, t.moscowLabel || '', t.kanoCategory || '',
      t.finalScore?.toFixed(1) || '', t.riceScore?.toFixed(2) || '',
      t.reach || '', t.impact || '', t.confidence || '', t.effort || '',
      t.submittedBy || '', t.status || '',
      t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '',
    ]);
    downloadTasksCSV(rows);
  };

  const handleBulkJiraPush = async () => {
    setBulkWorking(true);
    const eligible = tasks.filter(t => bulkSelected.has(t.id) && !t.jiraIssueKey && t.finalScore != null);
    for (const task of eligible) {
      try {
        const result = await jiraService.createIssue({ taskId: task.id, projectKey: bulkJiraProject, issueType: bulkJiraType, summary: task.title });
        setTasks(prev => prev.map(t => t.id === task.id
          ? { ...t, jiraIssueKey: result.issueKey, jiraIssueUrl: result.issueUrl, jiraIssueStatus: result.status }
          : t
        ));
      } catch {}
    }
    setBulkJiraOpen(false);
    setBulkSelected(new Set());
    setBulkWorking(false);
  };

  const loadTasks = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = isPrivileged
        ? await taskService.getAllTasks()
        : await taskService.getMyTasks();
      const sorted = data.sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0));
      setTasks(sorted);
      dependencyService.getBlockedIds().then(ids => setBlockedIds(new Set(ids))).catch(() => {});
    } catch (err) {
      setError('Failed to load tasks. Make sure the backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    sessionStorage.setItem('backlog_filter_moscow', filterMoscow);
  }, [filterMoscow]);

  useEffect(() => {
    loadTasks();
    jiraService.getStatus().then(s => {
      if (s?.connected) {
        setJiraConnected(true);
        jiraService.listProjects().then(p => setJiraProjects(p)).catch(() => {});
      }
    }).catch(() => {});
  }, []);

  const handleDelete = async (task) => {
    if (!window.confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
    try {
      await taskService.deleteTask(task.id);
      setTasks(prev => prev.filter(t => t.id !== task.id));
      if (expandedId === task.id) setExpandedId(null);
    } catch {
      setError('Failed to delete task.');
    }
  };

  const openPushModal = (task) => {
    setPushModal(task);
    setPushProject(jiraProjects[0]?.key || '');
    setPushType('Task');
    setPushSummary(task.title || '');
    setPushError('');
  };

  const handleJiraPush = async () => {
    if (!pushProject) { setPushError('Select a project.'); return; }
    setPushSaving(true);
    setPushError('');
    try {
      const result = await jiraService.createIssue({
        taskId: pushModal.id,
        projectKey: pushProject,
        issueType: pushType,
        summary: pushSummary,
      });
      setTasks(prev => prev.map(t => t.id === pushModal.id
        ? { ...t, jiraIssueKey: result.issueKey, jiraIssueUrl: result.issueUrl, jiraIssueStatus: result.status }
        : t
      ));
      setPushModal(null);
    } catch (e) {
      setPushError(e?.response?.data?.message || 'Failed to create issue.');
    } finally {
      setPushSaving(false);
    }
  };

  const handleJiraSync = async (task) => {
    setSyncingJiraId(task.id);
    try {
      const result = await jiraService.refreshStatus(task.id);
      setTasks(prev => prev.map(t => t.id === task.id
        ? { ...t, jiraIssueStatus: result.status }
        : t
      ));
    } catch {} finally {
      setSyncingJiraId(null);
    }
  };

  const filtered = filterMoscow === 'ALL'
    ? tasks
    : tasks.filter(t => t.moscowLabel === filterMoscow);

  const allFilteredSelected = filtered.length > 0 && filtered.every(t => bulkSelected.has(t.id));
  const bulkEligibleJira    = tasks.filter(t => bulkSelected.has(t.id) && !t.jiraIssueKey && t.finalScore != null);

  const total = tasks.filter(t => t.moscowLabel).length;
  const ratio = {
    MUST: tasks.filter(t => t.moscowLabel === 'MUST').length,
    SHOULD: tasks.filter(t => t.moscowLabel === 'SHOULD').length,
    COULD: tasks.filter(t => t.moscowLabel === 'COULD').length,
    WONT: tasks.filter(t => t.moscowLabel === 'WONT').length,
  };

  return (
    <PageWrapper
      title={t('backlog_title')}
      subtitle={isPrivileged ? t('backlog_subtitle') : 'Your submitted tasks, ranked by AI score'}
    >

      {/* MoSCoW ratio bar — only meaningful for privileged users seeing all tasks */}
      {isPrivileged && total > 0 && (
        <div style={{
          backgroundColor: theme.cardBg, borderRadius: '0.75rem',
          padding: '1.25rem 1.5rem', marginBottom: '1.25rem',
          border: `1px solid ${theme.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <p style={{ fontSize: '0.8rem', fontWeight: '600', color: theme.textMed }}>
              {t('moscow_distribution')}
            </p>
            <p style={{ fontSize: '0.72rem', color: theme.textMuted }}>
              {t('moscow_target')}
            </p>
          </div>
          <div style={{ display: 'flex', height: '8px', borderRadius: '9999px', overflow: 'hidden', gap: '2px' }}>
            {[
              { key: 'MUST', color: '#DC2626' },
              { key: 'SHOULD', color: '#D97706' },
              { key: 'COULD', color: '#2563EB' },
              { key: 'WONT', color: '#9CA3AF' },
            ].map(({ key, color }) => (
              ratio[key] > 0 && (
                <div key={key} style={{ flex: ratio[key], backgroundColor: color, borderRadius: '2px' }} />
              )
            ))}
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem' }}>
            {[
              { key: 'MUST', color: '#DC2626', label: t('must') },
              { key: 'SHOULD', color: '#D97706', label: t('should') },
              { key: 'COULD', color: '#2563EB', label: t('could') },
              { key: 'WONT', color: '#9CA3AF', label: t('wont') },
            ].map(({ key, color, label }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: color }} />
                <span style={{ fontSize: '0.72rem', color: theme.textSub }}>
                  {label}: {total > 0 ? Math.round((ratio[key] / total) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter + refresh */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {/* Select all checkbox */}
          <div
            onClick={() => allFilteredSelected ? setBulkSelected(new Set()) : setBulkSelected(new Set(filtered.map(t => t.id)))}
            title={allFilteredSelected ? 'Deselect all' : 'Select all'}
            style={{
              width: '18px', height: '18px', borderRadius: '4px', flexShrink: 0,
              border: `2px solid ${allFilteredSelected ? '#CC2027' : theme.borderMed}`,
              backgroundColor: allFilteredSelected ? '#CC2027' : theme.cardBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.15s', marginRight: '0.25rem',
            }}
          >
            {allFilteredSelected && <span style={{ color: 'white', fontSize: '11px', lineHeight: 1 }}>✓</span>}
          </div>
          {['ALL', 'MUST', 'SHOULD', 'COULD', 'WONT'].map((f) => (
            <button key={f} onClick={() => setFilterMoscow(f)}
              style={{
                padding: '0.35rem 0.85rem', borderRadius: '9999px', border: '1.5px solid',
                borderColor: filterMoscow === f ? '#CC2027' : theme.borderMed,
                backgroundColor: filterMoscow === f ? '#FEF2F2' : theme.cardBg,
                color: filterMoscow === f ? '#CC2027' : theme.textSub,
                fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer',
              }}>
              {f === 'ALL' ? t('filter_all_tasks') : f}
            </button>
          ))}
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

      {isLoading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#9CA3AF' }}>
          <p>{t('backlog_loading')}</p>
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div style={{ backgroundColor: theme.cardBg, borderRadius: '0.75rem', border: `1px solid ${theme.border}` }}>
          <EmptyState
            variant="tasks"
            title={t('backlog_empty_title')}
            subtitle={t('backlog_empty_subtitle')}
          />
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {filtered.map((task, index) => (
          <BacklogTaskCard
            key={task.id}
            task={task}
            index={index}
            isExpanded={expandedId === task.id}
            onToggle={() => setExpandedId(expandedId === task.id ? null : task.id)}
            onOverride={() => setOverrideTask(task)}
            onDora={() => setDoraTask(task)}
            isAdmin={isAdmin}
            onDelete={() => handleDelete(task)}
            isSelectedForCompare={compareSelected.has(task.id)}
            onToggleCompare={toggleCompare}
            compareCount={compareSelected.size}
            jiraConnected={jiraConnected}
            onJiraPush={openPushModal}
            onJiraSync={handleJiraSync}
            isSyncingJira={syncingJiraId === task.id}
            txData={txData}
            isSelected={bulkSelected.has(task.id)}
            onToggleSelect={toggleBulk}
            isBlocked={blockedIds.has(task.id)}
          />
        ))}
      </div>

      {/* ── Bulk action bar ── */}
      {bulkSelected.size > 0 && (
        <div style={{
          position: 'fixed',
          bottom: compareSelected.size >= 2 ? '7rem' : '2rem',
          left: '50%', transform: 'translateX(-50%)',
          zIndex: 200, backgroundColor: '#1A1A2E', borderRadius: '0.875rem',
          padding: '0.875rem 1.5rem', boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          border: '1px solid rgba(255,255,255,0.1)',
          whiteSpace: 'nowrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={16} color="#A78BFA" />
            <span style={{ color: 'white', fontSize: '0.875rem', fontWeight: '600' }}>
              {bulkSelected.size} selected
            </span>
          </div>

          <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(255,255,255,0.1)' }} />

          <button
            onClick={() => setBulkMoscowOpen(true)}
            disabled={bulkWorking}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.45rem 0.9rem', borderRadius: '0.45rem',
              backgroundColor: '#CC2027', border: 'none',
              color: 'white', fontSize: '0.8rem', fontWeight: '600',
              cursor: bulkWorking ? 'not-allowed' : 'pointer', opacity: bulkWorking ? 0.6 : 1,
            }}
          >
            <Edit3 size={13} /> Override MoSCoW
          </button>

          <button
            onClick={handleBulkExport}
            disabled={bulkWorking}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.45rem 0.9rem', borderRadius: '0.45rem',
              backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
              color: '#D1D5DB', fontSize: '0.8rem', fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            <Download size={13} /> Export CSV
          </button>

          {jiraConnected && bulkEligibleJira.length > 0 && (
            <button
              onClick={() => { setBulkJiraProject(jiraProjects[0]?.key || ''); setBulkJiraOpen(true); }}
              disabled={bulkWorking}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.45rem 0.9rem', borderRadius: '0.45rem',
                backgroundColor: '#0052CC', border: 'none',
                color: 'white', fontSize: '0.8rem', fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              <Link2 size={13} /> Push to Jira ({bulkEligibleJira.length})
            </button>
          )}

          {isAdmin && (
            <button
              onClick={handleBulkDelete}
              disabled={bulkWorking}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.45rem 0.9rem', borderRadius: '0.45rem',
                backgroundColor: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.3)',
                color: '#F87171', fontSize: '0.8rem', fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              {bulkWorking ? <Loader2 size={13} /> : <Trash2 size={13} />}
              Delete
            </button>
          )}

          <button
            onClick={() => setBulkSelected(new Set())}
            style={{
              padding: '0.45rem 0.7rem', borderRadius: '0.45rem',
              backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
              color: '#6B7280', fontSize: '0.8rem', cursor: 'pointer',
            }}
          >
            <X size={13} />
          </button>
        </div>
      )}

      {compareSelected.size >= 2 && (
        <div style={{
          position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)',
          zIndex: 200, backgroundColor: '#1A1A2E', borderRadius: '0.875rem',
          padding: '0.875rem 1.5rem', boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
          display: 'flex', alignItems: 'center', gap: '1rem',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Scale size={16} color="#A78BFA" />
            <span style={{ color: 'white', fontSize: '0.875rem', fontWeight: '600' }}>
              {compareSelected.size} {t('compare_tasks_selected')}
            </span>
          </div>
          <button
            onClick={() => navigate('/compare', { state: { preSelectedIds: [...compareSelected], mode: 'tasks' } })}
            style={{
              padding: '0.5rem 1.25rem', backgroundColor: '#CC2027',
              border: 'none', borderRadius: '0.5rem',
              fontSize: '0.85rem', fontWeight: '700', color: 'white', cursor: 'pointer',
            }}
          >
            {t('compare_now')}
          </button>
          <button
            onClick={() => setCompareSelected(new Set())}
            style={{
              padding: '0.5rem 0.75rem', backgroundColor: 'transparent',
              border: '1px solid rgba(255,255,255,0.15)', borderRadius: '0.5rem',
              fontSize: '0.8rem', color: '#9CA3AF', cursor: 'pointer',
            }}
          >
            {t('common_clear')}
          </button>
        </div>
      )}

      {overrideTask && (
        <OverrideModal
          task={overrideTask}
          onClose={() => setOverrideTask(null)}
          onSuccess={() => { setOverrideTask(null); loadTasks(); }}
        />
      )}

      {bulkMoscowOpen && (
        <BulkMoscowModal
          count={bulkSelected.size}
          loading={bulkWorking}
          onClose={() => setBulkMoscowOpen(false)}
          onConfirm={handleBulkMoscow}
        />
      )}

      {/* Bulk Jira push modal */}
      {bulkJiraOpen && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000, padding: '1rem',
        }}>
          <div style={{
            backgroundColor: theme.cardBg, borderRadius: '1rem',
            width: '100%', maxWidth: '420px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden',
          }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '0.9rem', fontWeight: '700', color: theme.text }}>Bulk Push to Jira</p>
                <p style={{ fontSize: '0.78rem', color: theme.textMuted, marginTop: '0.15rem' }}>{bulkEligibleJira.length} task{bulkEligibleJira.length !== 1 ? 's' : ''} will be created</p>
              </div>
              <button onClick={() => setBulkJiraOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={18} /></button>
            </div>
            <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: theme.textMed, marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Project</label>
                <div style={{ position: 'relative' }}>
                  <select value={bulkJiraProject} onChange={e => setBulkJiraProject(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 2rem 0.65rem 1rem', border: `1.5px solid ${theme.borderMed}`, borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', backgroundColor: theme.inputBg, color: theme.text, appearance: 'none', boxSizing: 'border-box' }}>
                    {jiraProjects.map(p => <option key={p.key} value={p.key}>{p.name} ({p.key})</option>)}
                  </select>
                  <ChevronDown size={14} color="#9CA3AF" style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: theme.textMed, marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Issue type</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {JIRA_ISSUE_TYPES.map(tp => (
                    <button key={tp} onClick={() => setBulkJiraType(tp)} style={{ padding: '0.35rem 0.875rem', borderRadius: '0.4rem', border: `1.5px solid ${bulkJiraType === tp ? '#0052CC' : theme.borderMed}`, backgroundColor: bulkJiraType === tp ? '#EBF4FF' : theme.cardBg, color: bulkJiraType === tp ? '#0052CC' : theme.textSub, fontSize: '0.8rem', fontWeight: '500', cursor: 'pointer' }}>{tp}</button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ padding: '1rem 1.5rem', borderTop: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button onClick={() => setBulkJiraOpen(false)} style={{ padding: '0.5rem 1.1rem', backgroundColor: theme.cardBg, border: `1.5px solid ${theme.borderMed}`, borderRadius: '0.5rem', fontSize: '0.82rem', fontWeight: '600', color: theme.textSub, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleBulkJiraPush} disabled={bulkWorking || !bulkJiraProject} style={{ padding: '0.5rem 1.25rem', backgroundColor: bulkWorking ? '#9CA3AF' : '#0052CC', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '0.82rem', fontWeight: '600', cursor: bulkWorking ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {bulkWorking ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />}
                {bulkWorking ? 'Pushing…' : `Create ${bulkEligibleJira.length} issues`}
              </button>
            </div>
          </div>
        </div>
      )}
      {doraTask && (
        <DoraModal
          task={doraTask}
          onClose={() => setDoraTask(null)}
          onSuccess={() => setDoraTask(null)}
        />
      )}

      {/* Push to Jira modal */}
      {pushModal && (
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
            {/* Header */}
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
                  Push to Jira
                </p>
              </div>
              <button onClick={() => setPushModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <p style={{ fontSize: '0.8rem', color: theme.textSub }}>
                Creating Jira issue for: <strong style={{ color: theme.text }}>{pushModal.title}</strong>
              </p>

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
                      fontSize: '0.875rem', outline: 'none',
                      backgroundColor: theme.inputBg, color: theme.text,
                      appearance: 'none', cursor: 'pointer', boxSizing: 'border-box',
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
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {JIRA_ISSUE_TYPES.map(t => (
                    <button key={t} onClick={() => setPushType(t)} style={{
                      padding: '0.35rem 0.875rem', borderRadius: '0.4rem',
                      border: `1.5px solid ${pushType === t ? '#0052CC' : theme.borderMed}`,
                      backgroundColor: pushType === t ? '#EBF4FF' : theme.cardBg,
                      color: pushType === t ? '#0052CC' : theme.textSub,
                      fontSize: '0.8rem', fontWeight: '500', cursor: 'pointer',
                    }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block', fontSize: '0.75rem', fontWeight: '600',
                  color: theme.textMed, marginBottom: '0.4rem',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>Summary</label>
                <input
                  type="text"
                  value={pushSummary}
                  onChange={e => setPushSummary(e.target.value)}
                  style={{
                    width: '100%', padding: '0.65rem 1rem',
                    border: `1.5px solid ${theme.borderMed}`, borderRadius: '0.5rem',
                    fontSize: '0.875rem', outline: 'none',
                    boxSizing: 'border-box', backgroundColor: theme.inputBg, color: theme.text,
                  }}
                  onFocus={e => e.target.style.borderColor = '#0052CC'}
                  onBlur={e => e.target.style.borderColor = theme.borderMed}
                />
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

            {/* Footer */}
            <div style={{
              padding: '1rem 1.5rem', borderTop: `1px solid ${theme.border}`,
              display: 'flex', justifyContent: 'flex-end', gap: '0.5rem',
            }}>
              <button onClick={() => setPushModal(null)} style={{
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
                  : <><Plus size={14} /> Create in Jira</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}

export default Backlog;
