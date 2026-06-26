import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link2, Loader2, X, GitMerge, RefreshCw, Users, User, Brain, LayoutTemplate, Zap } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import taskService from '../services/taskService';
import taskLinkService from '../services/taskLinkService';
import useAuthStore from '../store/authStore';
import { useTheme } from '../contexts/ThemeContext';

const MOSCOW_COLOR = { MUST: '#DC2626', SHOULD: '#D97706', COULD: '#2563EB', WONT: '#6B7280' };
const NODE_W = 200;
const NODE_H = 72;

function getCenter(pos) {
  return { x: pos.x + NODE_W / 2, y: pos.y + NODE_H / 2 };
}

function computeTopologicalLayout(tasks, links) {
  if (!tasks.length) return {};
  const taskIds = new Set(tasks.map(t => t.id));
  const inDegree = new Map(tasks.map(t => [t.id, 0]));
  const adj = new Map(tasks.map(t => [t.id, []]));
  links.forEach(l => {
    if (taskIds.has(l.fromTaskId) && taskIds.has(l.toTaskId)) {
      adj.get(l.fromTaskId).push(l.toTaskId);
      inDegree.set(l.toTaskId, (inDegree.get(l.toTaskId) || 0) + 1);
    }
  });
  const level = new Map(tasks.map(t => [t.id, -1]));
  const tempIn = new Map(inDegree);
  let queue = tasks.map(t => t.id).filter(id => tempIn.get(id) === 0);
  let col = 0;
  while (queue.length > 0) {
    queue.forEach(id => { if (level.get(id) === -1) level.set(id, col); });
    const next = [];
    queue.forEach(id => {
      (adj.get(id) || []).forEach(nextId => {
        tempIn.set(nextId, tempIn.get(nextId) - 1);
        if (tempIn.get(nextId) === 0) next.push(nextId);
      });
    });
    queue = [...new Set(next)];
    col++;
  }
  tasks.forEach(t => { if (level.get(t.id) === -1) level.set(t.id, col++); });
  const columns = new Map();
  tasks.forEach(t => {
    const c = level.get(t.id);
    if (!columns.has(c)) columns.set(c, []);
    columns.get(c).push(t.id);
  });
  const COL_W = 260;
  const ROW_H = 110;
  const positions = {};
  columns.forEach((ids, colIdx) => {
    ids.forEach((id, rowIdx) => {
      positions[id] = { x: 40 + colIdx * COL_W, y: 40 + rowIdx * ROW_H };
    });
  });
  return positions;
}

function computeCriticalPath(tasks, links) {
  if (!tasks.length || !links.length) return { criticalNodes: new Set(), criticalEdges: new Set() };
  const taskIds = new Set(tasks.map(t => t.id));
  const adj = new Map(tasks.map(t => [t.id, []]));
  const inDeg = new Map(tasks.map(t => [t.id, 0]));
  links.forEach(l => {
    if (taskIds.has(l.fromTaskId) && taskIds.has(l.toTaskId)) {
      adj.get(l.fromTaskId).push(l.toTaskId);
      inDeg.set(l.toTaskId, inDeg.get(l.toTaskId) + 1);
    }
  });

  // Topological sort
  const topoOrder = [];
  const tempIn = new Map(inDeg);
  const q = tasks.map(t => t.id).filter(id => tempIn.get(id) === 0);
  const queue = [...q];
  while (queue.length) {
    const id = queue.shift();
    topoOrder.push(id);
    (adj.get(id) || []).forEach(next => {
      tempIn.set(next, tempIn.get(next) - 1);
      if (tempIn.get(next) === 0) queue.push(next);
    });
  }

  // Forward pass — weighted by finalScore (higher-priority tasks have more "weight")
  const weight = new Map(tasks.map(t => [t.id, t.finalScore || 1]));
  const dist = new Map(tasks.map(t => [t.id, weight.get(t.id)]));
  const prev = new Map(tasks.map(t => [t.id, null]));
  topoOrder.forEach(id => {
    (adj.get(id) || []).forEach(next => {
      const candidate = dist.get(id) + weight.get(next);
      if (candidate > dist.get(next)) {
        dist.set(next, candidate);
        prev.set(next, id);
      }
    });
  });

  // Trace back from sink nodes (no outgoing edges) with max distance
  const sinks = tasks.map(t => t.id).filter(id => (adj.get(id) || []).length === 0);
  const endpoints = sinks.length > 0 ? sinks : [...dist.keys()];
  const maxDist = Math.max(...endpoints.map(id => dist.get(id)));

  const criticalNodes = new Set();
  const criticalEdges = new Set();
  endpoints
    .filter(id => Math.abs(dist.get(id) - maxDist) < 0.001)
    .forEach(endId => {
      let cur = endId;
      while (cur !== null) {
        criticalNodes.add(cur);
        const p = prev.get(cur);
        if (p !== null) criticalEdges.add(`${p}-${cur}`);
        cur = p;
      }
    });

  return { criticalNodes, criticalEdges };
}

export default function TaskRelations() {
  const { theme, isDark } = useTheme();
  const { user } = useAuthStore();
  const isPrivileged = user?.role === 'ADMIN' || user?.role === 'IT_MANAGER';

  const [tasks,            setTasks]            = useState([]);
  const [links,            setLinks]            = useState([]);
  const [positions,        setPositions]        = useState({});
  const [loading,          setLoading]          = useState(true);
  const [showCriticalPath, setShowCriticalPath] = useState(true);
  const [linkStart,        setLinkStart]        = useState(null);
  const [linkPending,      setLinkPending]      = useState(null);
  const [hovered,          setHovered]          = useState(null);
  const [linkTooltip,      setLinkTooltip]      = useState(null);
  const [tooltip,          setTooltip]          = useState(null);
  const [error,            setError]            = useState('');
  const [filterDev,        setFilterDev]        = useState(null);
  const [aiLinking,        setAiLinking]        = useState(false);
  const canvasRef = useRef(null);
  const dragging  = useRef(null); // { id, ox, oy, startX, startY, moved }

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [taskData, linkData] = await Promise.all([
        isPrivileged ? taskService.getAllTasks() : taskService.getMyTasks(),
        taskLinkService.getAllLinks(),
      ]);
      setTasks(taskData);
      setLinks(linkData);
      const savedPos = tryLoadPositions();
      const pos = {};
      taskData.forEach((t, i) => {
        pos[t.id] = savedPos[t.id] || {
          x: 40 + (i % 4) * (NODE_W + 48),
          y: 40 + Math.floor(i / 4) * (NODE_H + 56),
        };
      });
      setPositions(pos);
    } catch {
      setError('Failed to load tasks. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  }, [isPrivileged]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (Object.keys(positions).length) {
      try { localStorage.setItem('priorit_task_relations_pos', JSON.stringify(positions)); } catch {}
    }
  }, [positions]);

  function tryLoadPositions() {
    try { return JSON.parse(localStorage.getItem('priorit_task_relations_pos') || '{}'); } catch { return {}; }
  }

  // Filters
  const devList = [...new Set(tasks.map(t => t.submittedBy).filter(Boolean))].sort();
  const visibleTasks = filterDev ? tasks.filter(t => t.submittedBy === filterDev) : tasks;
  const visibleTaskIds = new Set(visibleTasks.map(t => t.id));
  const visibleLinks = links.filter(l => visibleTaskIds.has(l.fromTaskId) && visibleTaskIds.has(l.toTaskId));

  const { criticalNodes, criticalEdges } = useMemo(
    () => showCriticalPath
      ? computeCriticalPath(visibleTasks, visibleLinks)
      : { criticalNodes: new Set(), criticalEdges: new Set() },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibleTasks.map(t => t.id).join(), visibleLinks.map(l => `${l.fromTaskId}-${l.toTaskId}`).join(), showCriticalPath]
  );

  const visiblePositions = visibleTasks.map(t => positions[t.id]).filter(Boolean);
  const canvasWidth  = Math.max(1200, ...visiblePositions.map(p => p.x + NODE_W + 40), 1200);
  const canvasHeight = Math.max(700,  ...visiblePositions.map(p => p.y + NODE_H + 40), 700);

  const handleAutoLayout = () => {
    const newPos = computeTopologicalLayout(visibleTasks, visibleLinks);
    setPositions(prev => ({ ...prev, ...newPos }));
  };

  // ── Drag handlers — movement >4px = drag, otherwise = click ──────────────
  const onMouseDown = (e, id) => {
    e.preventDefault();
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    dragging.current = {
      id,
      ox: e.clientX - rect.left - (positions[id]?.x || 0),
      oy: e.clientY - rect.top  - (positions[id]?.y || 0),
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    };
  };

  const onMouseMove = (e) => {
    if (!dragging.current || !canvasRef.current) return;
    const dx = e.clientX - dragging.current.startX;
    const dy = e.clientY - dragging.current.startY;
    if (!dragging.current.moved && Math.sqrt(dx * dx + dy * dy) > 4) {
      dragging.current.moved = true;
    }
    if (!dragging.current.moved) return;
    const { id, ox, oy } = dragging.current;
    const rect = canvasRef.current.getBoundingClientRect();
    setPositions(prev => ({
      ...prev,
      [id]: { x: Math.max(0, e.clientX - rect.left - ox), y: Math.max(0, e.clientY - rect.top - oy) },
    }));
  };

  const onCanvasMouseUp = () => {
    if (dragging.current && !dragging.current.moved) {
      onNodeClick(dragging.current.id);
    }
    dragging.current = null;
  };

  // ── Link logic ─────────────────────────────────────────────────────────────
  const onNodeClick = (id) => {
    if (!linkStart) { setLinkStart(id); return; }
    if (linkStart === id) { setLinkStart(null); return; }
    if (!isPrivileged) {
      const a = tasks.find(t => t.id === linkStart);
      const b = tasks.find(t => t.id === id);
      if (a?.submittedBy !== user?.name || b?.submittedBy !== user?.name) {
        setError('You can only link your own tasks.');
        setLinkStart(null);
        return;
      }
    }
    setLinkPending({ fromId: linkStart, toId: id });
    setLinkStart(null);
  };

  const confirmLink = async (fromId, toId) => {
    try {
      await taskLinkService.linkTasks(fromId, toId, 'from');
      const updated = await taskLinkService.getAllLinks();
      setLinks(updated);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to link tasks');
    }
    setLinkPending(null);
  };

  const confirmLinkAi = async (taskAId, taskBId) => {
    setAiLinking(true);
    try {
      await taskLinkService.linkTasksWithAi(taskAId, taskBId);
      const updated = await taskLinkService.getAllLinks();
      setLinks(updated);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to link tasks');
    } finally {
      setAiLinking(false);
      setLinkPending(null);
    }
  };

  const handleUnlink = async (fromId, toId) => {
    try {
      await taskLinkService.unlinkTasks(fromId, toId);
      setLinks(prev => prev.filter(l => !(l.fromTaskId === fromId && l.toTaskId === toId)));
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to remove link');
    }
  };

  const pendingFromTask = linkPending ? tasks.find(t => t.id === linkPending.fromId) : null;
  const pendingToTask   = linkPending ? tasks.find(t => t.id === linkPending.toId)   : null;

  return (
    <PageWrapper title="Task Relations" subtitle="Drag nodes to reposition · Click a node to link it · Arrow = prerequisite → dependent">

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>

        <button
          onClick={() => setShowCriticalPath(p => !p)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '7px 14px', borderRadius: '8px',
            border: `1.5px solid ${showCriticalPath ? '#CC2027' : theme.borderMed}`,
            background: showCriticalPath ? '#CC2027' : theme.cardBg,
            color: showCriticalPath ? 'white' : theme.textMed,
            fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer',
          }}
        >
          <Zap size={14} /> Critical Path
        </button>

        <button
          onClick={handleAutoLayout}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '7px 14px', borderRadius: '8px',
            border: `1.5px solid ${theme.borderMed}`, background: theme.cardBg,
            color: theme.textMed, fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer',
          }}
        >
          <LayoutTemplate size={14} /> Auto Layout
        </button>

        <button
          onClick={loadData}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '7px 14px', borderRadius: '8px',
            border: `1.5px solid ${theme.borderMed}`, background: theme.cardBg,
            color: theme.textMed, fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer',
          }}
        >
          <RefreshCw size={14} /> Refresh
        </button>

        {/* Developer filter */}
        {isPrivileged && devList.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap',
            padding: '4px 8px', border: `1px solid ${theme.border}`,
            borderRadius: '10px', background: theme.hoverBg,
          }}>
            <span style={{ fontSize: '0.68rem', color: theme.textMuted, fontWeight: '600', marginRight: '2px' }}>Filter:</span>
            <button
              onClick={() => setFilterDev(null)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                padding: '4px 10px', borderRadius: '9999px',
                border: `1.5px solid ${filterDev === null ? '#1A1A2E' : theme.borderMed}`,
                background: filterDev === null ? '#1A1A2E' : theme.cardBg,
                color: filterDev === null ? 'white' : theme.textMed,
                fontSize: '0.72rem', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              <Users size={11} /> All Department
            </button>
            {devList.map(dev => (
              <button key={dev} onClick={() => setFilterDev(filterDev === dev ? null : dev)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  padding: '4px 10px', borderRadius: '9999px',
                  border: `1.5px solid ${filterDev === dev ? '#CC2027' : theme.borderMed}`,
                  background: filterDev === dev ? '#CC2027' : theme.cardBg,
                  color: filterDev === dev ? 'white' : theme.textMed,
                  fontSize: '0.72rem', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                <User size={11} /> {dev}
              </button>
            ))}
          </div>
        )}

        {/* Link-in-progress hint */}
        {linkStart && !linkPending && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '6px 14px', borderRadius: '8px',
            background: isDark ? 'rgba(124,58,237,0.15)' : '#F5F3FF',
            border: '1px solid #DDD6FE',
            fontSize: '0.78rem', color: '#7C3AED', fontWeight: '600',
          }}>
            <Link2 size={13} />
            {`"${tasks.find(t => t.id === linkStart)?.title?.slice(0, 28)}…" — click another task`}
            <button
              onClick={() => setLinkStart(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7C3AED', padding: 0, display: 'flex' }}
            >
              <X size={13} />
            </button>
          </div>
        )}

        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '6px 12px', borderRadius: '8px',
            background: '#FFF1F2', border: '1px solid #FECACA',
            fontSize: '0.78rem', color: '#CC2027', fontWeight: '600',
          }}>
            {error}
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CC2027', padding: 0 }}>
              <X size={13} />
            </button>
          </div>
        )}

        <div style={{ marginLeft: 'auto', fontSize: '0.75rem', color: theme.textMuted, whiteSpace: 'nowrap' }}>
          {filterDev
            ? `${visibleTasks.length}/${tasks.length} tasks · ${visibleLinks.length} links`
            : `${tasks.length} tasks · ${links.length} links`}
          {showCriticalPath && criticalNodes.size > 0 && (
            <span style={{ color: '#CC2027', marginLeft: '6px', fontWeight: '600' }}>
              · {criticalNodes.size} critical
            </span>
          )}
        </div>
      </div>

      {/* ── Direction picker ── */}
      {linkPending && (
        <div style={{
          marginBottom: '1rem', padding: '14px 18px', borderRadius: '10px',
          background: isDark ? 'rgba(124,58,237,0.12)' : '#F5F3FF',
          border: '1.5px solid #DDD6FE',
          display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#7C3AED' }}>
            Choose direction:
          </span>
          <button
            onClick={() => confirmLink(linkPending.fromId, linkPending.toId)}
            style={{
              padding: '7px 14px', borderRadius: '7px',
              border: '1.5px solid #FECACA', background: '#FEF2F2',
              color: '#DC2626', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              "{pendingFromTask?.title}"
            </span>
            →
            <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              "{pendingToTask?.title}"
            </span>
          </button>
          <button
            onClick={() => confirmLink(linkPending.toId, linkPending.fromId)}
            style={{
              padding: '7px 14px', borderRadius: '7px',
              border: '1.5px solid #BFDBFE', background: '#EFF6FF',
              color: '#2563EB', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              "{pendingToTask?.title}"
            </span>
            →
            <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              "{pendingFromTask?.title}"
            </span>
          </button>
          <button
            onClick={() => confirmLinkAi(linkPending.fromId, linkPending.toId)}
            disabled={aiLinking}
            style={{
              padding: '7px 14px', borderRadius: '7px',
              border: `1.5px solid ${theme.borderMed}`, background: theme.cardBg,
              color: theme.textMed, fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              opacity: aiLinking ? 0.6 : 1,
            }}
          >
            <Brain size={13} color={theme.textSub} />
            {aiLinking ? 'AI deciding…' : 'Let AI decide'}
          </button>
          <button
            onClick={() => setLinkPending(null)}
            style={{
              padding: '7px 14px', borderRadius: '7px',
              border: `1.5px solid ${theme.borderMed}`, background: theme.cardBg,
              color: theme.textMuted, fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* ── Canvas ── */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: theme.textMuted, padding: '3rem 0' }}>
          <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
          Loading task graph…
        </div>
      ) : (
        <div style={{
          border: `1px solid ${theme.border}`, borderRadius: '1rem',
          background: theme.hoverBg, overflow: 'auto',
          maxHeight: 'calc(100vh - 240px)',
        }}>
          <div
            ref={canvasRef}
            style={{ position: 'relative', width: canvasWidth, height: canvasHeight, userSelect: 'none' }}
            onMouseMove={onMouseMove}
            onMouseUp={onCanvasMouseUp}
            onMouseLeave={() => { dragging.current = null; setLinkTooltip(null); }}
          >
            {/* AI reason tooltip */}
            {linkTooltip && (
              <div style={{
                position: 'absolute', left: linkTooltip.x + 16, top: linkTooltip.y - 36,
                background: '#1A1A2E', color: 'white',
                padding: '8px 12px', borderRadius: '8px',
                fontSize: '0.72rem', maxWidth: '260px', lineHeight: '1.5',
                zIndex: 200, pointerEvents: 'none',
                boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px', color: '#86EFAC', fontWeight: '700', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  <Brain size={10} /> AI Reasoning
                </div>
                {linkTooltip.reason}
              </div>
            )}

            {/* ── SVG directed arrows ── */}
            <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} width={canvasWidth} height={canvasHeight}>
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#7C3AED" opacity="0.7" />
                </marker>
                <marker id="arrowhead-ai" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#059669" opacity="0.7" />
                </marker>
                <marker id="arrowhead-critical" markerWidth="11" markerHeight="8" refX="10" refY="4" orient="auto">
                  <polygon points="0 0, 11 4, 0 8" fill="#CC2027" />
                </marker>
              </defs>

              {visibleLinks.map(l => {
                const fromPos = positions[l.fromTaskId];
                const toPos   = positions[l.toTaskId];
                if (!fromPos || !toPos) return null;
                const from = getCenter(fromPos);
                const to   = getCenter(toPos);
                const dx = to.x - from.x;
                const dy = to.y - from.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const shrink = dist > 0 ? (NODE_W / 2 + 12) / dist : 0;
                const endX = to.x - dx * shrink;
                const endY = to.y - dy * shrink;
                const mx = (from.x + endX) / 2;
                const my = (from.y + endY) / 2;

                const edgeKey = `${l.fromTaskId}-${l.toTaskId}`;
                const isCritical = criticalEdges.has(edgeKey);
                const color = isCritical ? '#CC2027' : l.aiDefined ? '#059669' : '#7C3AED';
                const markerId = isCritical ? 'arrowhead-critical' : l.aiDefined ? 'arrowhead-ai' : 'arrowhead';

                return (
                  <g key={edgeKey}>
                    <line
                      x1={from.x} y1={from.y} x2={endX} y2={endY}
                      stroke={color}
                      strokeWidth={isCritical ? 3 : 2}
                      strokeDasharray={isCritical ? 'none' : '5,3'}
                      opacity={isCritical ? 0.9 : 0.6}
                      markerEnd={`url(#${markerId})`}
                    />
                    {l.sequenceOrder && (
                      <text x={mx} y={my - 6} textAnchor="middle" fontSize="9" fill={color} opacity="0.8">
                        #{l.sequenceOrder}
                      </text>
                    )}
                    {l.aiDefined && l.aiReason && (
                      <line
                        x1={from.x} y1={from.y} x2={endX} y2={endY}
                        stroke="transparent" strokeWidth="16"
                        style={{ pointerEvents: 'all', cursor: 'help' }}
                        onMouseEnter={() => setLinkTooltip({ x: mx, y: my, reason: l.aiReason })}
                        onMouseLeave={() => setLinkTooltip(null)}
                      />
                    )}
                    {/* Unlink button */}
                    <g
                      style={{ cursor: 'pointer', pointerEvents: 'all' }}
                      onClick={() => handleUnlink(l.fromTaskId, l.toTaskId)}
                      onMouseEnter={() => setHovered(edgeKey)}
                      onMouseLeave={() => setHovered(null)}
                    >
                      <circle cx={mx} cy={my} r={10} fill={theme.cardBg} stroke={isCritical ? '#FECACA' : '#DDD6FE'} strokeWidth="1.5" />
                      <text x={mx} y={my + 4} textAnchor="middle" fontSize="11" fill={color}>×</text>
                    </g>
                    {hovered === edgeKey && (
                      <text x={mx + 14} y={my + 4} fontSize="10" fill={color}>Remove</text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* ── Task nodes ── */}
            {visibleTasks.map(task => {
              const pos = positions[task.id] || { x: 0, y: 0 };
              const isSelected  = linkStart === task.id;
              const isPendingA  = linkPending?.fromId === task.id;
              const isPendingB  = linkPending?.toId   === task.id;
              const isLinked    = visibleLinks.some(l => l.fromTaskId === task.id || l.toTaskId === task.id);
              const isCritical  = criticalNodes.has(task.id);
              const mColor      = MOSCOW_COLOR[task.moscowLabel] || '#9CA3AF';

              const borderColor = isSelected || isPendingA || isPendingB
                ? '#7C3AED'
                : isCritical ? '#CC2027'
                : isLinked   ? '#DDD6FE'
                : theme.border;

              const borderWidth = isSelected || isPendingA || isPendingB || isCritical ? '2px' : '1.5px';

              const boxShadow = isSelected || isPendingA || isPendingB
                ? '0 0 0 3px rgba(124,58,237,0.15), 0 4px 12px rgba(0,0,0,0.08)'
                : isCritical
                ? '0 0 0 3px rgba(204,32,39,0.18), 0 4px 16px rgba(204,32,39,0.12)'
                : '0 2px 8px rgba(0,0,0,0.06)';

              const cursor = linkStart ? 'crosshair' : 'grab';

              return (
                <div
                  key={task.id}
                  onMouseDown={e => onMouseDown(e, task.id)}
                  onMouseEnter={() => setTooltip(task.id)}
                  onMouseLeave={() => setTooltip(null)}
                  style={{
                    position: 'absolute', left: pos.x, top: pos.y,
                    width: NODE_W, height: NODE_H,
                    background: isCritical
                      ? isDark ? 'rgba(204,32,39,0.08)' : '#FFF8F8'
                      : theme.cardBg,
                    borderRadius: '10px',
                    border: `${borderWidth} solid ${borderColor}`,
                    boxShadow,
                    cursor,
                    padding: '10px 12px', boxSizing: 'border-box',
                    borderLeft: `4px solid ${isCritical ? '#CC2027' : mColor}`,
                    display: 'flex', flexDirection: 'column', justifyContent: 'center',
                    transition: 'box-shadow 0.15s, border-color 0.15s',
                  }}
                >
                  <p style={{
                    fontSize: '0.75rem', fontWeight: '700', color: theme.text,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    margin: '0 0 4px',
                  }}>
                    {task.title}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {task.moscowLabel && (
                      <span style={{
                        fontSize: '0.6rem', fontWeight: '700', padding: '1px 5px',
                        borderRadius: '9999px', color: mColor,
                        background: mColor + '15', border: `1px solid ${mColor}30`,
                      }}>
                        {task.moscowLabel}
                      </span>
                    )}
                    {task.finalScore != null && (
                      <span style={{ fontSize: '0.65rem', color: theme.textMuted }}>
                        {task.finalScore.toFixed(1)}
                      </span>
                    )}
                    <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {isCritical && <Zap size={10} color="#CC2027" />}
                      {isLinked && !isCritical && <GitMerge size={10} color="#7C3AED" />}
                    </span>
                  </div>

                  {tooltip === task.id && (
                    <div style={{
                      position: 'absolute', bottom: NODE_H + 6, left: 0,
                      background: '#1A1A2E', color: 'white',
                      padding: '6px 10px', borderRadius: '6px',
                      fontSize: '0.7rem', whiteSpace: 'nowrap',
                      zIndex: 100, pointerEvents: 'none',
                    }}>
                      {task.submittedBy} · {task.taskType} · {task.status?.replace(/_/g, ' ')}
                      {isCritical && <span style={{ color: '#FCA5A5', marginLeft: '6px' }}>⚡ Critical</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Legend ── */}
      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem', fontSize: '0.72rem', color: theme.textMuted, flexWrap: 'wrap', alignItems: 'center' }}>
        {showCriticalPath && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '18px', borderTop: '3px solid #CC2027', display: 'inline-block' }} />
            <Zap size={9} color="#CC2027" /> Critical path
          </span>
        )}
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '18px', borderTop: '2px dashed #7C3AED', display: 'inline-block' }} />
          Manual dependency
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '18px', borderTop: '2px dashed #059669', display: 'inline-block' }} />
          AI dependency
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#DC2626', display: 'inline-block' }} /> MUST
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#D97706', display: 'inline-block' }} /> SHOULD
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#2563EB', display: 'inline-block' }} /> COULD
        </span>
        <span>· Drag = move · Click = link · × on line = remove</span>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </PageWrapper>
  );
}
