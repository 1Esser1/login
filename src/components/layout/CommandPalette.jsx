import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, ArrowRight,
  LayoutDashboard, ClipboardList, ListOrdered, Brain, Scale,
  BriefcaseBusiness, Kanban, Users, Timer, FileBarChart,
  Activity, Link2, Settings, ShieldCheck, ClipboardCheck,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import taskService from '../../services/taskService';

const NAV_PAGES = [
  { label: 'Dashboard',      path: '/dashboard', icon: LayoutDashboard },
  { label: 'Tasks',          path: '/tasks',      icon: ClipboardList },
  { label: 'Backlog',        path: '/backlog',    icon: ListOrdered },
  { label: 'AI Scoring',     path: '/scoring',    icon: Brain },
  { label: 'Compare',        path: '/compare',    icon: Scale },
  { label: 'Workplace',      path: '/workplace',  icon: BriefcaseBusiness },
  { label: 'Sprint Board',   path: '/sprint',     icon: Kanban },
  { label: 'Workload',       path: '/workload',   icon: Users,       privilegedOnly: true },
  { label: 'SLA & Deadlines',path: '/sla',        icon: Timer },
  { label: 'Teams',          path: '/teams',      icon: Users },
  { label: 'Reports',        path: '/reports',    icon: FileBarChart },
  { label: 'DORA Metrics',   path: '/dora',       icon: Activity },
  { label: 'Jira',           path: '/jira',       icon: Link2 },
  { label: 'Settings',       path: '/settings',   icon: Settings },
  { label: 'Audit Trail',    path: '/audit',      icon: ClipboardCheck, privilegedOnly: true },
  { label: 'Admin Panel',    path: '/admin',      icon: ShieldCheck,    adminOnly: true },
];

const MOSCOW_COLORS = {
  MUST:   '#CC2027',
  SHOULD: '#F59E0B',
  COULD:  '#3B82F6',
  WONT:   '#6B7280',
};

const KBD = {
  display: 'inline-block',
  fontSize: '0.68rem', color: '#9CA3AF',
  backgroundColor: '#F3F4F6',
  border: '1px solid #E5E7EB',
  borderRadius: '4px',
  padding: '0.1rem 0.35rem',
  marginRight: '0.25rem',
};

export default function CommandPalette() {
  const [open, setOpen]           = useState(false);
  const [query, setQuery]         = useState('');
  const [tasks, setTasks]         = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading]     = useState(false);
  const inputRef  = useRef(null);
  const listRef   = useRef(null);
  const navigate  = useNavigate();
  const { isAuthenticated, user } = useAuthStore();

  // Ctrl+K / Cmd+K toggle + Escape
  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // N → open new task form (re-registers when palette opens/closes to avoid stale closure)
  useEffect(() => {
    function onNewTask(e) {
      if (open) return;
      if (e.key !== 'n') return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (document.activeElement?.contentEditable === 'true') return;
      e.preventDefault();
      navigate('/tasks', { state: { autoFocus: true } });
    }
    window.addEventListener('keydown', onNewTask);
    return () => window.removeEventListener('keydown', onNewTask);
  }, [open, navigate]);

  // On open: focus input + fetch tasks once
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIdx(0);
    setTimeout(() => inputRef.current?.focus(), 0);
    if (tasks.length === 0) {
      setLoading(true);
      const isPrivileged = user?.role === 'ADMIN' || user?.role === 'IT_MANAGER';
      const fetchTasks = isPrivileged ? taskService.getAllTasks() : taskService.getMyTasks();
      fetchTasks
        .then(setTasks)
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [open]);

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector('[data-active="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  if (!isAuthenticated || !open) return null;

  const q = query.toLowerCase();

  const filteredPages = NAV_PAGES.filter(p => {
    if (p.adminOnly    && user?.role !== 'ADMIN') return false;
    if (p.privilegedOnly && user?.role !== 'ADMIN' && user?.role !== 'IT_MANAGER') return false;
    return !q || p.label.toLowerCase().includes(q);
  });

  const filteredTasks = tasks
    .filter(t => !q || t.title?.toLowerCase().includes(q) || t.taskType?.toLowerCase().includes(q))
    .slice(0, 6);

  const total = filteredPages.length + filteredTasks.length;

  function select(item) {
    setOpen(false);
    navigate(item.type === 'page' ? item.path : `/tasks/${item.id}`);
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => (i + 1) % Math.max(total, 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => (i - 1 + Math.max(total, 1)) % Math.max(total, 1)); }
    if (e.key === 'Enter') {
      const pages = filteredPages.map(p => ({ type: 'page', ...p }));
      const tks   = filteredTasks.map(t => ({ type: 'task', ...t }));
      const all   = [...pages, ...tks];
      if (all[activeIdx]) select(all[activeIdx]);
    }
  }

  return (
    <div
      onClick={() => setOpen(false)}
      style={{
        position: 'fixed', inset: 0,
        backgroundColor: 'rgba(15,15,25,0.55)',
        zIndex: 2000,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '14vh',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: 'white',
          borderRadius: '0.85rem',
          width: '100%', maxWidth: '580px',
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
          margin: '0 1rem',
        }}
      >
        {/* Search bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.9rem 1.25rem',
          borderBottom: '1px solid #F0F0F0',
        }}>
          <Search size={18} color="#9CA3AF" style={{ flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveIdx(0); }}
            onKeyDown={onKeyDown}
            placeholder="Search pages and tasks…"
            style={{
              flex: 1, border: 'none', outline: 'none',
              fontSize: '1rem', color: '#111827',
              backgroundColor: 'transparent',
            }}
          />
          {loading && (
            <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Loading…</span>
          )}
          <kbd style={KBD}>ESC</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} style={{ maxHeight: '400px', overflowY: 'auto' }}>

          {/* Pages */}
          {filteredPages.length > 0 && (
            <>
              <SectionLabel>Pages</SectionLabel>
              {filteredPages.map((page, i) => {
                const Icon   = page.icon;
                const active = i === activeIdx;
                return (
                  <ResultRow
                    key={page.path}
                    active={active}
                    onClick={() => select({ type: 'page', ...page })}
                  >
                    <Icon size={15} color={active ? '#CC2027' : '#6B7280'} style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: '500', color: active ? '#CC2027' : '#374151' }}>
                      {page.label}
                    </span>
                    <ArrowRight size={14} color="#D1D5DB" style={{ flexShrink: 0 }} />
                  </ResultRow>
                );
              })}
            </>
          )}

          {/* Tasks */}
          {filteredTasks.length > 0 && (
            <>
              <SectionLabel>Tasks</SectionLabel>
              {filteredTasks.map((task, i) => {
                const idx    = filteredPages.length + i;
                const active = idx === activeIdx;
                const mc     = task.moscowClassification;
                return (
                  <ResultRow
                    key={task.id}
                    active={active}
                    onClick={() => select({ type: 'task', ...task })}
                  >
                    <div style={{
                      width: '22px', height: '22px', borderRadius: '5px',
                      backgroundColor: '#F3F4F6', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6B7280' }}>T</span>
                    </div>
                    <span style={{
                      flex: 1, fontSize: '0.875rem', fontWeight: '500',
                      color: active ? '#CC2027' : '#374151',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {task.title}
                    </span>
                    {task.taskType && (
                      <span style={{ fontSize: '0.68rem', color: '#9CA3AF', flexShrink: 0 }}>
                        {task.taskType}
                      </span>
                    )}
                    {mc && (
                      <span style={{
                        fontSize: '0.65rem', fontWeight: '700',
                        padding: '0.15rem 0.45rem', borderRadius: '4px',
                        backgroundColor: MOSCOW_COLORS[mc] || '#6B7280',
                        color: 'white', flexShrink: 0,
                      }}>
                        {mc}
                      </span>
                    )}
                    {task.finalScore != null && (
                      <span style={{ fontSize: '0.72rem', color: '#6B7280', flexShrink: 0 }}>
                        {Number(task.finalScore).toFixed(1)}
                      </span>
                    )}
                  </ResultRow>
                );
              })}
            </>
          )}

          {/* Empty */}
          {total === 0 && !loading && (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: '#9CA3AF', fontSize: '0.875rem' }}>
              {query ? `No results for "${query}"` : 'Type to search…'}
            </div>
          )}
        </div>

        {/* Footer hints */}
        <div style={{
          padding: '0.55rem 1.25rem',
          borderTop: '1px solid #F0F0F0',
          display: 'flex', gap: '1.25rem',
          fontSize: '0.72rem', color: '#9CA3AF',
        }}>
          <span><kbd style={KBD}>↑↓</kbd>navigate</span>
          <span><kbd style={KBD}>↵</kbd>select</span>
          <span><kbd style={KBD}>Esc</kbd>close</span>
          <span style={{ marginLeft: 'auto' }}><kbd style={KBD}>N</kbd>new task</span>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{
      padding: '0.55rem 1.25rem 0.2rem',
      fontSize: '0.65rem', fontWeight: '700',
      color: '#9CA3AF', letterSpacing: '0.09em',
      textTransform: 'uppercase',
    }}>
      {children}
    </div>
  );
}

function ResultRow({ active, onClick, children }) {
  return (
    <div
      data-active={active}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '0.6rem 1.25rem',
        cursor: 'pointer',
        backgroundColor: active ? 'rgba(204,32,39,0.06)' : 'transparent',
        borderLeft: active ? '3px solid #CC2027' : '3px solid transparent',
        transition: 'background-color 0.1s',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.backgroundColor = '#F9FAFB'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.backgroundColor = 'transparent'; }}
    >
      {children}
    </div>
  );
}
