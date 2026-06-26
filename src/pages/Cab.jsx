import { useState, useEffect, useCallback } from 'react';
import { ListChecks, CheckCircle, XCircle, Clock, RefreshCw, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import taskService from '../services/taskService';
import { useTheme } from '../contexts/ThemeContext';

const MOSCOW_COLOR = { MUST: '#DC2626', SHOULD: '#D97706', COULD: '#2563EB', WONT: '#6B7280' };

const STATUS_META = {
  PENDING_CAB_APPROVAL: { label: 'Pending',  color: '#D97706', bg: 'rgba(217,119,6,0.1)'  },
  CAB_APPROVED:         { label: 'Approved', color: '#16A34A', bg: 'rgba(22,163,74,0.1)'  },
  CAB_REJECTED:         { label: 'Rejected', color: '#DC2626', bg: 'rgba(220,38,38,0.1)'  },
};

function fmt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function TaskRow({ task, onApprove, onReject, theme, isDark }) {
  const [open,    setOpen]    = useState(false);
  const [comment, setComment] = useState('');
  const [busy,    setBusy]    = useState(false);
  const [action,  setAction]  = useState(null); // 'approve' | 'reject'

  const mColor = MOSCOW_COLOR[task.moscowLabel] || '#9CA3AF';
  const isPending = task.status === 'PENDING_CAB_APPROVAL';

  const handleSubmit = async () => {
    setBusy(true);
    try {
      if (action === 'approve') await onApprove(task.id, comment);
      else                      await onReject(task.id, comment);
    } finally {
      setBusy(false);
      setOpen(false);
      setComment('');
      setAction(null);
    }
  };

  return (
    <div style={{
      border: `1px solid ${theme.border}`,
      borderRadius: '0.75rem',
      backgroundColor: theme.cardBg,
      overflow: 'hidden',
      transition: 'box-shadow 0.15s',
    }}>
      {/* Main row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto auto auto',
        alignItems: 'center',
        gap: '1rem',
        padding: '1rem 1.25rem',
      }}>
        {/* Task info */}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: '700', color: theme.text }}>
              {task.title}
            </span>
            {task.moscowLabel && (
              <span style={{
                fontSize: '0.6rem', fontWeight: '700', padding: '1px 6px',
                borderRadius: '9999px', color: mColor,
                background: mColor + '18', border: `1px solid ${mColor}30`,
              }}>
                {task.moscowLabel}
              </span>
            )}
            {task.finalScore != null && (
              <span style={{
                fontSize: '0.7rem', fontWeight: '700', color: '#CC2027',
              }}>
                {task.finalScore.toFixed(1)}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.72rem', color: theme.textMuted, flexWrap: 'wrap' }}>
            <span>Submitted by <strong style={{ color: theme.textSub }}>{task.submittedBy}</strong></span>
            <span>Requested {fmt(task.cabRequestedAt)}</span>
            {task.taskType && <span>{task.taskType}</span>}
          </div>
        </div>

        {/* Status badge */}
        {!isPending && task.status in STATUS_META && (
          <div style={{ textAlign: 'right' }}>
            <span style={{
              fontSize: '0.7rem', fontWeight: '700',
              padding: '3px 10px', borderRadius: '9999px',
              color: STATUS_META[task.status].color,
              background: STATUS_META[task.status].bg,
            }}>
              {STATUS_META[task.status].label}
            </span>
            {task.cabReviewedBy && (
              <p style={{ fontSize: '0.65rem', color: theme.textMuted, marginTop: '3px' }}>
                by {task.cabReviewedBy} · {fmt(task.cabReviewedAt)}
              </p>
            )}
          </div>
        )}

        {/* Action buttons (pending only) */}
        {isPending && (
          <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
            <button
              onClick={() => { setAction('approve'); setOpen(a => a && action === 'approve' ? false : true); }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                padding: '6px 14px', borderRadius: '7px',
                border: '1.5px solid rgba(22,163,74,0.4)',
                background: 'rgba(22,163,74,0.1)',
                color: '#16A34A', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer',
              }}
            >
              <CheckCircle size={14} /> Approve
            </button>
            <button
              onClick={() => { setAction('reject'); setOpen(a => a && action === 'reject' ? false : true); }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                padding: '6px 14px', borderRadius: '7px',
                border: '1.5px solid rgba(220,38,38,0.35)',
                background: 'rgba(220,38,38,0.08)',
                color: '#DC2626', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer',
              }}
            >
              <XCircle size={14} /> Reject
            </button>
          </div>
        )}

        {/* Expand toggle */}
        <button
          onClick={() => { setOpen(v => !v); setAction(null); }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: theme.textMuted, padding: '4px', display: 'flex',
          }}
        >
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Expanded panel */}
      {open && (
        <div style={{
          borderTop: `1px solid ${theme.border}`,
          padding: '1rem 1.25rem',
          background: isDark ? 'rgba(255,255,255,0.02)' : '#FAFAFA',
        }}>
          {task.description && (
            <p style={{ fontSize: '0.8rem', color: theme.textMed, marginBottom: '1rem', lineHeight: 1.6 }}>
              {task.description}
            </p>
          )}

          {/* Past comment (approved/rejected) */}
          {!isPending && task.cabComment && (
            <div style={{
              padding: '0.65rem 0.9rem', borderRadius: '0.5rem',
              background: STATUS_META[task.status]?.bg,
              border: `1px solid ${STATUS_META[task.status]?.color}30`,
              fontSize: '0.78rem', color: theme.textMed,
              marginBottom: '0.5rem',
            }}>
              <strong style={{ color: STATUS_META[task.status]?.color }}>
                {task.status === 'CAB_APPROVED' ? 'Approval note:' : 'Rejection reason:'}
              </strong>{' '}{task.cabComment}
            </div>
          )}

          {/* Comment input for pending actions */}
          {isPending && action && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '600', color: theme.textMed }}>
                {action === 'approve' ? 'Approval note (optional)' : 'Rejection reason (required)'}
              </label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={2}
                placeholder={action === 'approve'
                  ? 'e.g. Approved for Friday deployment window'
                  : 'e.g. Needs security review before production'}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '0.5rem 0.75rem',
                  border: `1.5px solid ${theme.borderMed}`,
                  borderRadius: '0.45rem',
                  background: theme.inputBg, color: theme.text,
                  fontSize: '0.8rem', resize: 'vertical',
                  outline: 'none', fontFamily: 'inherit',
                }}
              />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={handleSubmit}
                  disabled={busy || (action === 'reject' && !comment.trim())}
                  style={{
                    padding: '7px 18px', borderRadius: '7px',
                    border: 'none', cursor: busy ? 'not-allowed' : 'pointer',
                    fontWeight: '700', fontSize: '0.8rem',
                    background: action === 'approve' ? '#16A34A' : '#DC2626',
                    color: 'white', opacity: busy ? 0.7 : 1,
                  }}
                >
                  {busy ? 'Saving…' : action === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
                </button>
                <button
                  onClick={() => { setOpen(false); setAction(null); setComment(''); }}
                  style={{
                    padding: '7px 14px', borderRadius: '7px',
                    border: `1px solid ${theme.borderMed}`,
                    background: 'none', cursor: 'pointer',
                    color: theme.textMuted, fontSize: '0.8rem',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CabPage() {
  const { theme, isDark } = useTheme();
  const [allTasks, setAllTasks] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [tab,      setTab]      = useState('pending'); // 'pending' | 'history'

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const tasks = await taskService.getAllTasks();
      setAllTasks(tasks.filter(t =>
        ['PENDING_CAB_APPROVAL', 'CAB_APPROVED', 'CAB_REJECTED'].includes(t.status)
      ));
    } catch {
      setError('Failed to load CAB queue.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const pending = allTasks.filter(t => t.status === 'PENDING_CAB_APPROVAL');
  const history = allTasks.filter(t => t.status !== 'PENDING_CAB_APPROVAL')
    .sort((a, b) => new Date(b.cabReviewedAt) - new Date(a.cabReviewedAt));

  const handleApprove = async (id, comment) => {
    await taskService.cabApprove(id, comment);
    await load();
  };

  const handleReject = async (id, comment) => {
    await taskService.cabReject(id, comment);
    await load();
  };

  const displayed = tab === 'pending' ? pending : history;

  return (
    <PageWrapper
      title="CAB Approval Queue"
      subtitle="Change Advisory Board — review and approve tasks for production deployment"
    >
      {/* Tabs + refresh */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
        {[
          { key: 'pending', label: 'Pending', icon: Clock,        count: pending.length },
          { key: 'history', label: 'History', icon: ListChecks,   count: history.length },
        ].map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '7px 16px', borderRadius: '8px', cursor: 'pointer',
              border: `1.5px solid ${tab === key ? '#CC2027' : theme.borderMed}`,
              background: tab === key ? '#CC2027' : theme.cardBg,
              color: tab === key ? 'white' : theme.textMed,
              fontSize: '0.82rem', fontWeight: '600',
            }}
          >
            <Icon size={14} />
            {label}
            <span style={{
              padding: '1px 7px', borderRadius: '9999px', fontSize: '0.68rem',
              background: tab === key ? 'rgba(255,255,255,0.25)' : theme.hoverBg,
              color: tab === key ? 'white' : theme.textSub,
            }}>
              {count}
            </span>
          </button>
        ))}

        <button
          onClick={load}
          style={{
            marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '5px',
            padding: '7px 14px', borderRadius: '8px',
            border: `1.5px solid ${theme.borderMed}`, background: theme.cardBg,
            color: theme.textMed, fontSize: '0.8rem', cursor: 'pointer',
          }}
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.75rem 1rem', borderRadius: '0.5rem',
          background: '#FEF2F2', border: '1px solid #FECACA',
          color: '#DC2626', fontSize: '0.82rem', marginBottom: '1rem',
        }}>
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: theme.textMuted }}>
          Loading CAB queue…
        </div>
      ) : displayed.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '3rem',
          border: `1px dashed ${theme.border}`, borderRadius: '0.75rem',
          color: theme.textMuted, fontSize: '0.875rem',
        }}>
          {tab === 'pending'
            ? 'No tasks are currently awaiting CAB approval.'
            : 'No approval decisions recorded yet.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {displayed.map(task => (
            <TaskRow
              key={task.id}
              task={task}
              onApprove={handleApprove}
              onReject={handleReject}
              theme={theme}
              isDark={isDark}
            />
          ))}
        </div>
      )}
    </PageWrapper>
  );
}
