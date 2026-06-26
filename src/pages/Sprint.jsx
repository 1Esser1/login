import { useState, useEffect, useRef, useMemo } from 'react';
import {
  RefreshCw, Filter, GitCommit, Link2,
  Clock, ChevronDown, AlertCircle, Layers, ListTodo,
} from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import sprintService from '../services/sprintService';
import workplaceService from '../services/workplaceService';
import taskService from '../services/taskService';
import useAuthStore from '../store/authStore';
import { useAutoT, useDynamicTranslation } from '../i18n/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

// ── Translatable strings ───────────────────────────────────────────────────────

const STRINGS = {
  page_title:      'Sprint Board',
  page_subtitle:   'Drag cards between columns to update status',
  tab_tasks:       'Tasks',
  tab_subtasks:    'Subtasks',
  col_todo:        'To Do',
  col_in_progress: 'In Progress',
  col_done:        'Done',
  col_backlog:     'Backlog',
  col_active:      'Active',
  col_completed:   'Completed',
  cx_low:          'Low',
  cx_medium:       'Medium',
  cx_high:         'High',
  ms_must:         'Must',
  ms_should:       'Should',
  ms_could:        'Could',
  ms_wont:         "Won't",
  stat_total:      'Total',
  stat_backlog:    'Backlog',
  stat_active:     'Active',
  stat_completed:  'Completed',
  all_members:     'All Members',
  refresh:         'Refresh',
  no_items:        'No items',
  drop_here:       'Drop here',
  committed:       'Committed',
  est:             'est.',
  subtasks_label:  'subtasks',
  drag_hint:       'Drag tasks between Active and Completed to update their pipeline stage. Backlog tasks require a workplace to be generated first.',
  no_sub_title:    'No active subtasks',
  no_sub_body:     'Generate a workplace from the Backlog to start tracking subtasks here.',
  no_task_title:   'No tasks found',
  no_task_body:    'Submit tasks from the Tasks page to see them here.',
};

const extractSprintStrings = (items) => [
  ...new Set(items.flatMap(i => [i.title, i.taskTitle, i.taskType].filter(Boolean)))
];

// ── Column shape builders (depend on tx) ───────────────────────────────────────

function buildSubCols(tx) {
  return [
    { key: 'TODO',        label: tx.col_todo,        color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB', headerBg: '#F3F4F6', dot: '#9CA3AF', droppable: true },
    { key: 'IN_PROGRESS', label: tx.col_in_progress, color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', headerBg: '#DBEAFE', dot: '#3B82F6', droppable: true },
    { key: 'DONE',        label: tx.col_done,        color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0', headerBg: '#DCFCE7', dot: '#22C55E', droppable: true },
  ];
}

function buildTaskCols(tx) {
  return [
    { key: 'BACKLOG',    label: tx.col_backlog,   color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB', headerBg: '#F3F4F6', dot: '#9CA3AF', droppable: false },
    { key: 'ACTIVE',     label: tx.col_active,    color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', headerBg: '#DBEAFE', dot: '#3B82F6', droppable: true  },
    { key: 'COMPLETED',  label: tx.col_completed, color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0', headerBg: '#DCFCE7', dot: '#22C55E', droppable: true  },
  ];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Avatar({ name, size = 28 }) {
  const colors = ['#CC2027', '#1A1A2E', '#2563EB', '#7C3AED', '#D97706', '#16A34A'];
  const idx = (name?.charCodeAt(0) ?? 0) % colors.length;
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', backgroundColor: colors[idx], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ color: 'white', fontSize: size * 0.4, fontWeight: '700' }}>{name?.charAt(0)?.toUpperCase() ?? '?'}</span>
    </div>
  );
}

function ProgressBar({ pct, height = 5 }) {
  const { theme } = useTheme();
  const color = pct >= 70 ? '#16A34A' : pct >= 35 ? '#D97706' : '#3B82F6';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
      <div style={{ flex: 1, height, backgroundColor: theme.borderMed, borderRadius: '9999px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: '9999px', transition: 'width 0.4s ease' }} />
      </div>
      <span style={{ fontSize: '0.65rem', fontWeight: '700', color, minWidth: '2.2rem' }}>{pct}%</span>
    </div>
  );
}

// ── Subtask card ──────────────────────────────────────────────────────────────

function SubtaskCard({ subtask, isManager, onDragStart, tx, txData }) {
  const { theme } = useTheme();
  const CX_MAP = {
    LOW:    { label: tx.cx_low,    bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0' },
    MEDIUM: { label: tx.cx_medium, bg: '#FFF7ED', color: '#D97706', border: '#FDE68A' },
    HIGH:   { label: tx.cx_high,   bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
  };
  const cx = CX_MAP[subtask.complexity] || null;

  return (
    <div draggable onDragStart={() => onDragStart(subtask.id)}
      style={{ backgroundColor: theme.cardBg, border: `1px solid ${theme.borderMed}`, borderRadius: '0.625rem', padding: '0.875rem', cursor: 'grab', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'box-shadow 0.15s, transform 0.1s', userSelect: 'none' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; e.currentTarget.style.transform = 'translateY(0)'; }}>

      <div style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: theme.tagBg, borderRadius: '4px', padding: '0.1rem 0.5rem', marginBottom: '0.5rem', maxWidth: '100%' }}>
        <span style={{ fontSize: '0.65rem', color: theme.textSub, fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{txData?.[subtask.taskTitle] || subtask.taskTitle}</span>
      </div>

      <p style={{ fontSize: '0.825rem', fontWeight: '600', color: theme.text, lineHeight: '1.4', marginBottom: '0.625rem' }}>{txData?.[subtask.title] || subtask.title}</p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.625rem' }}>
        {cx && (
          <span style={{ fontSize: '0.62rem', fontWeight: '700', padding: '0.15rem 0.45rem', borderRadius: '9999px', border: `1px solid ${cx.border}`, backgroundColor: cx.bg, color: cx.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{cx.label}</span>
        )}
        {subtask.jiraIssueKey && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.62rem', fontWeight: '700', padding: '0.15rem 0.45rem', borderRadius: '4px', backgroundColor: '#EFF6FF', color: '#0052CC', border: '1px solid #BFDBFE' }}>
            <Link2 size={8} /> {subtask.jiraIssueKey}
          </span>
        )}
        {subtask.codeCommitted && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.62rem', padding: '0.15rem 0.45rem', fontWeight: '600', borderRadius: '4px', backgroundColor: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0' }}>
            <GitCommit size={8} /> {tx.committed}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {subtask.estimatedHours != null ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: theme.textMuted }}>
            <Clock size={11} />{subtask.estimatedHours}h {tx.est}
          </span>
        ) : <span />}
        {isManager && subtask.submittedByName && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.68rem', color: theme.textMuted }}>{subtask.submittedByName.split(' ')[0]}</span>
            <Avatar name={subtask.submittedByName} size={22} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Task card ─────────────────────────────────────────────────────────────────

function TaskCard({ task, workplace, isManager, isDraggable, onDragStart, tx, txData }) {
  const { theme } = useTheme();
  const MOSCOW_MAP = {
    MUST:   { label: tx.ms_must,   bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
    SHOULD: { label: tx.ms_should, bg: '#FFF7ED', color: '#D97706', border: '#FDE68A' },
    COULD:  { label: tx.ms_could,  bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
    WONT:   { label: tx.ms_wont,   bg: '#F9FAFB', color: '#6B7280', border: '#E5E7EB' },
  };
  const moscow = MOSCOW_MAP[task.moscowLabel] || null;
  const pct = workplace?.progressPercent ?? 0;
  const doneCount  = workplace?.subtasks?.filter(s => s.status === 'DONE').length ?? 0;
  const totalCount = workplace?.subtasks?.length ?? 0;

  return (
    <div draggable={isDraggable} onDragStart={() => isDraggable && onDragStart(task.id)}
      style={{ backgroundColor: theme.cardBg, border: `1px solid ${theme.borderMed}`, borderRadius: '0.625rem', padding: '0.875rem', cursor: isDraggable ? 'grab' : 'default', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'box-shadow 0.15s, transform 0.1s', userSelect: 'none', opacity: isDraggable ? 1 : 0.85 }}
      onMouseEnter={e => { if (isDraggable) { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; e.currentTarget.style.transform = 'translateY(0)'; }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        {task.taskType && (
          <span style={{ fontSize: '0.62rem', fontWeight: '600', padding: '0.15rem 0.5rem', borderRadius: '9999px', backgroundColor: task.taskTypeColor ? `${task.taskTypeColor}18` : theme.tagBg, color: task.taskTypeColor || theme.textSub, border: `1px solid ${task.taskTypeColor ? `${task.taskTypeColor}30` : theme.borderMed}` }}>{txData?.[task.taskType] || task.taskType}</span>
        )}
        {task.finalScore != null && (
          <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#CC2027', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>{task.finalScore.toFixed(1)}</span>
        )}
      </div>

      <p style={{ fontSize: '0.825rem', fontWeight: '600', color: theme.text, lineHeight: '1.4', marginBottom: '0.5rem' }}>{txData?.[task.title] || task.title}</p>

      {moscow && (
        <div style={{ marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.62rem', fontWeight: '700', padding: '0.15rem 0.45rem', borderRadius: '9999px', border: `1px solid ${moscow.border}`, backgroundColor: moscow.bg, color: moscow.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{moscow.label}</span>
        </div>
      )}

      {workplace && totalCount > 0 && (
        <div style={{ marginBottom: '0.625rem' }}>
          <ProgressBar pct={pct} />
          <span style={{ fontSize: '0.65rem', color: theme.textMuted, marginTop: '0.2rem', display: 'block' }}>
            {doneCount}/{totalCount} {tx.subtasks_label}
          </span>
        </div>
      )}

      {isManager && task.submittedBy && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem', marginTop: '0.25rem' }}>
          <span style={{ fontSize: '0.68rem', color: theme.textMuted }}>{task.submittedBy.split(' ')[0]}</span>
          <Avatar name={task.submittedBy} size={22} />
        </div>
      )}
    </div>
  );
}

// ── Generic Kanban column ─────────────────────────────────────────────────────

function KanbanColumn({ col, children, cardCount, isDragOver, onDragOver, onDragLeave, onDrop, tx }) {
  const { theme } = useTheme();
  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', backgroundColor: col.bg, border: `1px solid ${isDragOver ? col.color : col.border}`, borderRadius: '0.875rem', overflow: 'hidden', transition: 'border-color 0.15s, box-shadow 0.15s', boxShadow: isDragOver ? `0 0 0 2px ${col.color}30` : 'none' }}>
      <div style={{ padding: '0.875rem 1rem', backgroundColor: col.headerBg, borderBottom: `1px solid ${col.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: col.dot }} />
          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#374151' }}>{col.label}</span>
        </div>
        <span style={{ fontSize: '0.72rem', fontWeight: '700', backgroundColor: theme.cardBg, color: col.color, border: `1px solid ${col.border}`, padding: '0.1rem 0.5rem', borderRadius: '9999px' }}>{cardCount}</span>
      </div>

      <div onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
        style={{ flex: 1, padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', minHeight: '120px', transition: 'background-color 0.15s', backgroundColor: isDragOver ? `${col.color}08` : 'transparent' }}>
        {cardCount === 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: '80px', border: `2px dashed ${col.border}`, borderRadius: '0.5rem', color: '#D1D5DB', fontSize: '0.75rem' }}>
            {col.droppable === false ? tx.no_items : tx.drop_here}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SprintPage() {
  const { user } = useAuthStore();
  const tx = useAutoT(STRINGS);
  const { theme } = useTheme();
  const isManager = user?.role === 'IT_MANAGER' || user?.role === 'ADMIN';

  const SUBTASK_COLS = useMemo(() => buildSubCols(tx), [tx.col_todo, tx.col_in_progress, tx.col_done]);
  const TASK_COLS    = useMemo(() => buildTaskCols(tx), [tx.col_backlog, tx.col_active, tx.col_completed]);

  const [activeTab, setActiveTab] = useState('subtasks');
  const [subtasks, setSubtasks]   = useState([]);
  const [members, setMembers]     = useState([]);
  const [tasks, setTasks]         = useState([]);
  const [workplaces, setWorkplaces] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [filterMember, setFilterMember] = useState('ALL');
  const [refreshing, setRefreshing] = useState(false);

  const draggedSubId  = useRef(null);
  const draggedTaskId = useRef(null);
  const [dragOverSub,  setDragOverSub]  = useState(null);
  const [dragOverTask, setDragOverTask] = useState(null);

  const sprintAllData = useMemo(() => [...subtasks, ...tasks], [subtasks, tasks]);
  const txData = useDynamicTranslation(sprintAllData, extractSprintStrings, 'sprint');

  const load = async () => {
    try {
      const [boardData, tasksData, workplacesData] = await Promise.all([
        sprintService.getBoard(),
        isManager ? taskService.getAllTasks()           : taskService.getMyTasks(),
        isManager ? workplaceService.getAllWorkplaces() : workplaceService.getMyWorkplaces(),
      ]);
      setSubtasks(boardData.subtasks || []);
      setMembers(boardData.members   || []);
      setTasks(tasksData             || []);
      setWorkplaces(workplacesData   || []);
      setError('');
    } catch {
      setError('Failed to load sprint data. Make sure the backend is running.');
    }
  };

  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, []);
  const handleRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const workplaceByTaskId = useMemo(() => {
    const m = {};
    workplaces.forEach(w => { m[w.taskId] = w; });
    return m;
  }, [workplaces]);

  const getTaskCol = (task) => {
    const wp = workplaceByTaskId[task.id];
    return wp ? wp.status : 'BACKLOG';
  };

  const allMemberNames = useMemo(() => {
    const names = new Set();
    subtasks.forEach(s => s.submittedByName && names.add(s.submittedByName));
    tasks.forEach(t => t.submittedBy && names.add(t.submittedBy));
    return [...names].sort();
  }, [subtasks, tasks]);

  const visibleSubtasks = filterMember === 'ALL' ? subtasks : subtasks.filter(s => s.submittedByName === filterMember);
  const visibleTasks    = filterMember === 'ALL' ? tasks    : tasks.filter(t => t.submittedBy === filterMember);

  const subByStatus = (key) => visibleSubtasks.filter(s => s.status === key);
  const tasksByCol  = (key) => visibleTasks.filter(t => getTaskCol(t) === key).sort((a, b) => (b.finalScore ?? -1) - (a.finalScore ?? -1));

  const subTotal  = visibleSubtasks.length;
  const subDone   = subByStatus('DONE').length;
  const subPct    = subTotal > 0 ? Math.round((subDone / subTotal) * 100) : 0;

  const taskTotal     = visibleTasks.length;
  const taskActive    = tasksByCol('ACTIVE').length;
  const taskCompleted = tasksByCol('COMPLETED').length;
  const taskPct       = taskTotal > 0 ? Math.round((taskCompleted / taskTotal) * 100) : 0;

  const handleSubDragStart = (id) => { draggedSubId.current = id; };
  const handleSubDrop = async (e, targetStatus) => {
    e.preventDefault(); setDragOverSub(null);
    const id = draggedSubId.current;
    if (!id) return;
    const card = subtasks.find(s => s.id === id);
    if (!card || card.status === targetStatus) return;
    setSubtasks(prev => prev.map(s => s.id === id ? { ...s, status: targetStatus } : s));
    try { await sprintService.updateStatus(id, targetStatus); }
    catch { setSubtasks(prev => prev.map(s => s.id === id ? { ...s, status: card.status } : s)); }
    draggedSubId.current = null;
  };

  const handleTaskDragStart = (taskId) => { draggedTaskId.current = taskId; };
  const handleTaskDrop = async (e, targetColKey) => {
    e.preventDefault(); setDragOverTask(null);
    if (targetColKey === 'BACKLOG') return;
    const taskId = draggedTaskId.current;
    if (!taskId) return;
    const wp = workplaceByTaskId[taskId];
    if (!wp || wp.status === targetColKey) return;
    const prevStatus = wp.status;
    setWorkplaces(prev => prev.map(w => w.id === wp.id ? { ...w, status: targetColKey } : w));
    try { await sprintService.updateWorkplaceStatus(wp.id, targetColKey); }
    catch { setWorkplaces(prev => prev.map(w => w.id === wp.id ? { ...w, status: prevStatus } : w)); }
    draggedTaskId.current = null;
  };

  return (
    <PageWrapper title={tx.page_title} subtitle={tx.page_subtitle}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', backgroundColor: theme.tagBg, borderRadius: '0.625rem', padding: '0.25rem', marginBottom: '1.25rem', width: 'fit-content' }}>
        {[
          { key: 'tasks',    icon: Layers,   label: tx.tab_tasks },
          { key: 'subtasks', icon: ListTodo, label: tx.tab_subtasks },
        ].map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => { setActiveTab(tab.key); setFilterMember('ALL'); }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 1rem', borderRadius: '0.4rem', border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600', backgroundColor: active ? theme.cardBg : 'transparent', color: active ? theme.text : theme.textSub, boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}>
              <Icon size={14} />{tab.label}
            </button>
          );
        })}
      </div>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {activeTab === 'subtasks' ? (
            <>
              {[
                { label: tx.stat_total,       value: subTotal,                     color: theme.textMed },
                { label: tx.col_todo,         value: subByStatus('TODO').length,   color: '#6B7280' },
                { label: tx.col_in_progress,  value: subByStatus('IN_PROGRESS').length, color: '#2563EB' },
                { label: tx.col_done,         value: subDone,                      color: '#16A34A' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: '800', color: s.color }}>{s.value}</span>
                  <span style={{ fontSize: '0.72rem', color: theme.textMuted, fontWeight: '500' }}>{s.label}</span>
                </div>
              ))}
              {subTotal > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '100px', height: '6px', backgroundColor: theme.borderMed, borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${subPct}%`, backgroundColor: '#16A34A', borderRadius: '9999px', transition: 'width 0.4s ease' }} />
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#16A34A' }}>{subPct}%</span>
                </div>
              )}
            </>
          ) : (
            <>
              {[
                { label: tx.stat_total,     value: taskTotal,                   color: theme.textMed },
                { label: tx.col_backlog,    value: tasksByCol('BACKLOG').length, color: '#6B7280' },
                { label: tx.stat_active,    value: taskActive,                  color: '#2563EB' },
                { label: tx.stat_completed, value: taskCompleted,               color: '#16A34A' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: '800', color: s.color }}>{s.value}</span>
                  <span style={{ fontSize: '0.72rem', color: theme.textMuted, fontWeight: '500' }}>{s.label}</span>
                </div>
              ))}
              {taskTotal > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '100px', height: '6px', backgroundColor: theme.borderMed, borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${taskPct}%`, backgroundColor: '#16A34A', borderRadius: '9999px', transition: 'width 0.4s ease' }} />
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#16A34A' }}>{taskPct}%</span>
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isManager && allMemberNames.length > 0 && (
            <div style={{ position: 'relative' }}>
              <select value={filterMember} onChange={e => setFilterMember(e.target.value)}
                style={{ padding: '0.45rem 2rem 0.45rem 0.75rem', border: `1.5px solid ${theme.borderMed}`, borderRadius: '0.5rem', backgroundColor: filterMember !== 'ALL' ? '#EFF6FF' : theme.cardBg, color: filterMember !== 'ALL' ? '#2563EB' : theme.textMed, fontSize: '0.8rem', fontWeight: '500', appearance: 'none', cursor: 'pointer', outline: 'none', borderColor: filterMember !== 'ALL' ? '#93C5FD' : theme.borderMed }}>
                <option value="ALL">{tx.all_members}</option>
                {allMemberNames.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
              <ChevronDown size={13} color="#9CA3AF" style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            </div>
          )}
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

      {/* ── SUBTASKS TAB ───────────────────────────────────────────────────────── */}
      {!loading && activeTab === 'subtasks' && (
        <>
          {subtasks.length === 0 && !error && (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', backgroundColor: theme.cardBg, borderRadius: '0.875rem', border: `1px solid ${theme.border}` }}>
              <Filter size={36} color={theme.borderMed} style={{ marginBottom: '0.75rem' }} />
              <p style={{ fontWeight: '700', color: theme.textMed, marginBottom: '0.35rem' }}>{tx.no_sub_title}</p>
              <p style={{ color: theme.textMuted, fontSize: '0.875rem' }}>{tx.no_sub_body}</p>
            </div>
          )}
          {subtasks.length > 0 && (
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', minHeight: '60vh' }}>
              {SUBTASK_COLS.map(col => (
                <KanbanColumn key={col.key} col={col} cardCount={subByStatus(col.key).length} isDragOver={dragOverSub === col.key} tx={tx}
                  onDragOver={e => { e.preventDefault(); setDragOverSub(col.key); }}
                  onDragLeave={() => setDragOverSub(null)}
                  onDrop={e => handleSubDrop(e, col.key)}>
                  {subByStatus(col.key).map(s => (
                    <SubtaskCard key={s.id} subtask={s} isManager={isManager} onDragStart={handleSubDragStart} tx={tx} txData={txData} />
                  ))}
                </KanbanColumn>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── TASKS TAB ──────────────────────────────────────────────────────────── */}
      {!loading && activeTab === 'tasks' && (
        <>
          {tasks.length === 0 && !error && (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', backgroundColor: theme.cardBg, borderRadius: '0.875rem', border: `1px solid ${theme.border}` }}>
              <Filter size={36} color={theme.borderMed} style={{ marginBottom: '0.75rem' }} />
              <p style={{ fontWeight: '700', color: theme.textMed, marginBottom: '0.35rem' }}>{tx.no_task_title}</p>
              <p style={{ color: theme.textMuted, fontSize: '0.875rem' }}>{tx.no_task_body}</p>
            </div>
          )}
          {tasks.length > 0 && (
            <>
              <p style={{ fontSize: '0.75rem', color: theme.textMuted, marginBottom: '0.75rem' }}>{tx.drag_hint}</p>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', minHeight: '60vh' }}>
                {TASK_COLS.map(col => (
                  <KanbanColumn key={col.key} col={col} cardCount={tasksByCol(col.key).length} isDragOver={dragOverTask === col.key && col.droppable !== false} tx={tx}
                    onDragOver={e => { e.preventDefault(); if (col.droppable !== false) setDragOverTask(col.key); }}
                    onDragLeave={() => setDragOverTask(null)}
                    onDrop={e => handleTaskDrop(e, col.key)}>
                    {tasksByCol(col.key).map(task => (
                      <TaskCard key={task.id} task={task} workplace={workplaceByTaskId[task.id]} isManager={isManager} isDraggable={col.key !== 'BACKLOG'} onDragStart={handleTaskDragStart} tx={tx} txData={txData} />
                    ))}
                  </KanbanColumn>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </PageWrapper>
  );
}
