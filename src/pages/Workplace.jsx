import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BriefcaseBusiness, Plus, Loader2, AlertCircle, RefreshCw,
  Clock, CheckCircle2, ChevronRight, Zap, X, ListTodo,
} from 'lucide-react';
import EmptyState from '../components/ui/EmptyState';
import PageWrapper from '../components/layout/PageWrapper';
import workplaceService from '../services/workplaceService';
import taskService from '../services/taskService';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

const STATUS_STYLE = {
  ACTIVE:     { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0', dot: '#16A34A' },
  COMPLETED:  { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE', dot: '#2563EB' },
  ARCHIVED:   { bg: '#F9FAFB', color: '#6B7280', border: '#E5E7EB', dot: '#9CA3AF' },
};

const RISK_STYLE = {
  LOW:      { bg: '#F0FDF4', color: '#16A34A' },
  MEDIUM:   { bg: '#FFF7ED', color: '#D97706' },
  HIGH:     { bg: '#FEF2F2', color: '#DC2626' },
  CRITICAL: { bg: '#FDF4FF', color: '#9333EA' },
};

function StatCard({ icon: Icon, label, value, accent }) {
  const { theme } = useTheme();
  return (
    <div style={{
      backgroundColor: theme.cardBg, borderRadius: '0.75rem',
      padding: '1.25rem', border: `1px solid ${theme.border}`,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      display: 'flex', alignItems: 'center', gap: '1rem',
    }}>
      <div style={{
        width: '40px', height: '40px', borderRadius: '0.5rem',
        backgroundColor: accent + '18',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={18} color={accent} />
      </div>
      <div>
        <p style={{ fontSize: '1.5rem', fontWeight: '700', color: theme.text, lineHeight: 1 }}>{value}</p>
        <p style={{ fontSize: '0.75rem', color: theme.textSub, marginTop: '0.2rem' }}>{label}</p>
      </div>
    </div>
  );
}

function WorkplaceCard({ wp, onOpen }) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const statusStyle = STATUS_STYLE[wp.status] || STATUS_STYLE.ACTIVE;
  const riskStyle   = RISK_STYLE[wp.changeFailureRisk] || RISK_STYLE.MEDIUM;
  const doneCnt     = wp.subtasks?.filter(s => s.status === 'DONE').length ?? 0;
  const total       = wp.subtasks?.length ?? 0;
  const pct         = total > 0 ? Math.round((doneCnt / total) * 100) : wp.progressPercent ?? 0;

  return (
    <div style={{
      backgroundColor: theme.cardBg, borderRadius: '0.75rem',
      border: `1px solid ${theme.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
      transition: 'box-shadow 0.15s',
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'}
    >
      {/* Colored top border based on status */}
      <div style={{ height: '3px', backgroundColor: statusStyle.dot }} />

      <div style={{ padding: '1.25rem', flex: 1 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
          <div style={{ flex: 1, minWidth: 0, marginRight: '0.75rem' }}>
            <p style={{ fontSize: '0.7rem', color: theme.textSub, marginBottom: '0.2rem' }}>
              {wp.taskType}
            </p>
            <h3 style={{
              fontSize: '0.9rem', fontWeight: '700', color: theme.text,
              overflow: 'hidden', textOverflow: 'ellipsis',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            }}>
              {wp.taskTitle}
            </h3>
          </div>
          <span style={{
            padding: '0.2rem 0.6rem', borderRadius: '9999px',
            fontSize: '0.65rem', fontWeight: '700',
            backgroundColor: statusStyle.bg, color: statusStyle.color,
            border: `1px solid ${statusStyle.border}`,
            flexShrink: 0,
          }}>
            {t(`workplace_status_${wp.status?.toLowerCase()}`)}
          </span>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.7rem', color: theme.textSub }}>{t('workplace_progress')}</span>
            <span style={{ fontSize: '0.7rem', fontWeight: '700', color: theme.text }}>{pct}%</span>
          </div>
          <div style={{ height: '6px', backgroundColor: theme.tagBg, borderRadius: '9999px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: '9999px',
              width: `${pct}%`,
              backgroundColor: pct === 100 ? '#16A34A' : '#CC2027',
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>

        {/* Meta row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.3rem',
            backgroundColor: theme.tagBg, borderRadius: '0.35rem',
            padding: '0.25rem 0.5rem',
          }}>
            <Clock size={12} color={theme.textSub} />
            <span style={{ fontSize: '0.7rem', color: theme.textSub }}>
              {wp.totalEstimatedHours}h
            </span>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.3rem',
            backgroundColor: theme.tagBg, borderRadius: '0.35rem',
            padding: '0.25rem 0.5rem',
          }}>
            <ListTodo size={12} color={theme.textSub} />
            <span style={{ fontSize: '0.7rem', color: theme.textSub }}>
              {doneCnt}/{total} {t('workplace_subtasks')}
            </span>
          </div>
          {wp.changeFailureRisk && (
            <span style={{
              padding: '0.25rem 0.5rem', borderRadius: '0.35rem',
              fontSize: '0.7rem', fontWeight: '600',
              backgroundColor: riskStyle.bg, color: riskStyle.color,
            }}>
              {wp.changeFailureRisk}
            </span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '0.75rem 1.25rem',
        borderTop: `1px solid ${theme.border}`,
        display: 'flex', justifyContent: 'flex-end',
      }}>
        <button onClick={() => onOpen(wp.id)} style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          padding: '0.45rem 1rem', borderRadius: '0.5rem',
          backgroundColor: '#CC2027', border: 'none',
          color: 'white', fontSize: '0.78rem', fontWeight: '600',
          cursor: 'pointer',
        }}>
          {t('workplace_open')} <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

function TaskPickerModal({ tasks, generating, onGenerate, onClose }) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [search, setSearch] = useState('');

  const filtered = tasks.filter(task =>
    task.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '1rem',
    }}>
      <div style={{
        backgroundColor: theme.cardBg, borderRadius: '0.75rem',
        width: '100%', maxWidth: '540px', maxHeight: '80vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        {/* Modal header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: `1px solid ${theme.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: '700', color: theme.text }}>
              {t('workplace_pick_task')}
            </h2>
            <p style={{ fontSize: '0.78rem', color: theme.textSub, marginTop: '0.1rem' }}>
              {t('workplace_pick_subtitle')}
            </p>
          </div>
          <button onClick={onClose} style={{
            border: 'none', background: 'none', cursor: 'pointer',
            color: theme.textSub, padding: '0.25rem',
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: `1px solid ${theme.border}` }}>
          <input
            type="text"
            placeholder={t('workplace_search_tasks')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '0.6rem 0.875rem',
              border: `1px solid ${theme.borderMed}`, borderRadius: '0.5rem',
              fontSize: '0.85rem', backgroundColor: theme.inputBg, color: theme.text,
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Task list */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0.75rem 1rem' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: theme.textSub }}>
              <BriefcaseBusiness size={32} color={theme.textMuted} style={{ margin: '0 auto 0.75rem' }} />
              <p style={{ fontSize: '0.85rem' }}>{t('workplace_no_tasks')}</p>
              <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>{t('workplace_no_tasks_hint')}</p>
            </div>
          ) : (
            filtered.map(task => (
              <button
                key={task.id}
                onClick={() => !generating && onGenerate(task.id)}
                disabled={generating}
                style={{
                  width: '100%', textAlign: 'left',
                  padding: '0.875rem 1rem', borderRadius: '0.5rem',
                  border: `1px solid ${theme.border}`, marginBottom: '0.5rem',
                  backgroundColor: theme.cardBg, cursor: generating ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  opacity: generating ? 0.6 : 1,
                  transition: 'all 0.1s',
                }}
                onMouseEnter={e => { if (!generating) e.currentTarget.style.backgroundColor = theme.hoverBg; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = theme.cardBg; }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                    <span style={{
                      padding: '0.15rem 0.45rem', borderRadius: '9999px',
                      fontSize: '0.65rem', fontWeight: '600',
                      backgroundColor: theme.tagBg, color: theme.textMed,
                    }}>
                      {task.taskType}
                    </span>
                  </div>
                  <p style={{
                    fontSize: '0.85rem', fontWeight: '600', color: theme.text,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {task.title}
                  </p>
                </div>
                {generating ? (
                  <Loader2 size={16} color="#CC2027" style={{ animation: 'spin 1s linear infinite', flexShrink: 0, marginLeft: '0.75rem' }} />
                ) : (
                  <ChevronRight size={16} color={theme.textMuted} style={{ flexShrink: 0, marginLeft: '0.75rem' }} />
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem', borderTop: `1px solid ${theme.border}`,
          display: 'flex', justifyContent: 'flex-end',
        }}>
          <button onClick={onClose} style={{
            padding: '0.5rem 1.25rem', borderRadius: '0.5rem',
            border: `1px solid ${theme.borderMed}`, backgroundColor: theme.cardBg,
            color: theme.textMed, fontSize: '0.85rem', cursor: 'pointer',
          }}>
            {t('workplace_cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}

function Workplace() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const [workplaces, setWorkplaces] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [wps, tasks] = await Promise.all([
        workplaceService.getMyWorkplaces(),
        taskService.getMyTasks(),
      ]);
      setWorkplaces(wps);
      setMyTasks(tasks);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleGenerate = async (taskId) => {
    setGenerating(true);
    setGenError(null);
    try {
      const wp = await workplaceService.generate(taskId);
      setShowPicker(false);
      navigate(`/workplace/${wp.id}`);
    } catch (e) {
      setGenError(e.response?.data?.message || 'Failed to generate workplace');
      setGenerating(false);
    }
  };

  const stats = {
    total: workplaces.length,
    active: workplaces.filter(w => w.status === 'ACTIVE').length,
    completed: workplaces.filter(w => w.status === 'COMPLETED').length,
  };

  return (
    <PageWrapper title={t('workplace_title')} subtitle={t('workplace_subtitle')}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Action bar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem', gap: '0.75rem' }}>
        <button onClick={load} style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          padding: '0.5rem 1rem', borderRadius: '0.5rem',
          border: `1px solid ${theme.borderMed}`, backgroundColor: theme.cardBg,
          color: theme.textMed, fontSize: '0.82rem', cursor: 'pointer',
        }}>
          <RefreshCw size={14} /> {t('common_refresh')}
        </button>
        <button onClick={() => { setGenError(null); setShowPicker(true); }} style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          padding: '0.5rem 1.25rem', borderRadius: '0.5rem',
          backgroundColor: '#CC2027', border: 'none',
          color: 'white', fontSize: '0.82rem', fontWeight: '600',
          cursor: 'pointer',
        }}>
          <Plus size={16} /> {t('workplace_generate_btn')}
        </button>
      </div>

      {/* Stats row */}
      {!loading && workplaces.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          <StatCard icon={BriefcaseBusiness} label={t('workplace_total')} value={stats.total} accent="#CC2027" />
          <StatCard icon={Zap} label={t('workplace_active')} value={stats.active} accent="#16A34A" />
          <StatCard icon={CheckCircle2} label={t('workplace_completed')} value={stats.completed} accent="#2563EB" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.875rem 1rem', borderRadius: '0.5rem',
          backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
          color: '#DC2626', fontSize: '0.85rem', marginBottom: '1rem',
        }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: theme.textSub }}>
          <Loader2 size={32} color="#CC2027" style={{ margin: '0 auto 0.75rem', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontSize: '0.85rem' }}>{t('workplace_loading')}</p>
        </div>
      ) : workplaces.length === 0 ? (
        /* Empty state */
        <div style={{ backgroundColor: theme.cardBg, borderRadius: '0.75rem', border: `1px solid ${theme.border}` }}>
          <EmptyState
            variant="workplace"
            title={t('workplace_empty_title')}
            subtitle={t('workplace_empty_subtitle')}
            action={
              <button onClick={() => { setGenError(null); setShowPicker(true); }} style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.6rem 1.5rem', borderRadius: '0.5rem',
                backgroundColor: '#CC2027', border: 'none',
                color: 'white', fontSize: '0.85rem', fontWeight: '600',
                cursor: 'pointer',
              }}>
                <Plus size={16} /> {t('workplace_generate_btn')}
              </button>
            }
          />
        </div>
      ) : (
        /* Workplaces grid */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '1rem',
        }}>
          {workplaces.map(wp => (
            <WorkplaceCard key={wp.id} wp={wp} onOpen={id => navigate(`/workplace/${id}`)} />
          ))}
        </div>
      )}

      {/* Task picker modal */}
      {showPicker && (
        <TaskPickerModal
          tasks={myTasks}
          generating={generating}
          onGenerate={handleGenerate}
          onClose={() => { if (!generating) setShowPicker(false); }}
        />
      )}

      {/* Generation error toast */}
      {genError && (
        <div style={{
          position: 'fixed', bottom: '1.5rem', left: '50%',
          transform: 'translateX(-50%)', zIndex: 2000,
          backgroundColor: '#1F2937', color: 'white',
          padding: '0.75rem 1.25rem', borderRadius: '0.5rem',
          fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        }}>
          <AlertCircle size={16} color="#F87171" />
          {genError}
          <button onClick={() => setGenError(null)} style={{
            background: 'none', border: 'none', color: '#9CA3AF',
            cursor: 'pointer', padding: '0 0.25rem',
          }}>
            <X size={14} />
          </button>
        </div>
      )}
    </PageWrapper>
  );
}

export default Workplace;
