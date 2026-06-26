import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Trash2, AlertCircle, RotateCcw, Sparkles, ListTodo, Check, Loader2 } from 'lucide-react';
import EmptyState from '../components/ui/EmptyState';
import PageWrapper from '../components/layout/PageWrapper';
import compareService from '../services/compareService';
import taskService from '../services/taskService';
import { useLanguage, useTranslatedCompareResults } from '../i18n/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

// ── Constants ──────────────────────────────────────────────────────────────────

const CATEGORIES = [
  'Feature', 'Bug Fix', 'Infrastructure', 'Security',
  'Regulatory', 'API', 'Mobile', 'Core Banking',
  'Integration', 'Analytics', 'UX / UI', 'Performance',
];

const KANO_COLORS = {
  Basic:       { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
  Performance: { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' },
  Delighter:   { bg: '#F5F3FF', text: '#7C3AED', border: '#DDD6FE' },
  Indifferent: { bg: '#F9FAFB', text: '#6B7280', border: '#E5E7EB' },
  Reverse:     { bg: '#FFF7ED', text: '#D97706', border: '#FED7AA' },
};

const MOSCOW_COLORS = {
  Must:   { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
  Should: { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' },
  Could:  { bg: '#F0FDF4', text: '#16A34A', border: '#BBF7D0' },
  Wont:   { bg: '#F9FAFB', text: '#6B7280', border: '#E5E7EB' },
};

const MOSCOW_TASK_COLORS = {
  MUST:   { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
  SHOULD: { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' },
  COULD:  { bg: '#F0FDF4', text: '#16A34A', border: '#BBF7D0' },
  WONT:   { bg: '#F9FAFB', text: '#6B7280', border: '#E5E7EB' },
};

const RANK_META = [
  { medal: '🥇', color: '#D97706', lightBg: '#FEF3C7', border: '#FDE68A' },
  { medal: '🥈', color: '#6B7280', lightBg: '#F3F4F6', border: '#D1D5DB' },
  { medal: '🥉', color: '#B45309', lightBg: '#FEF3C7', border: '#FCD34D' },
];

const DEFAULT_RANK = { medal: null, color: '#374151', lightBg: '#F9FAFB', border: '#E5E7EB' };

const MAX_ITEMS = 6;

// ── Shared styles ──────────────────────────────────────────────────────────────

const BASE_INPUT_STYLE = {
  width: '100%', padding: '0.75rem 1rem',
  borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none',
  boxSizing: 'border-box', fontFamily: 'Inter, sans-serif',
};

const emptyItem = () => ({ title: '', description: '', category: '' });

// ── Badge helper ───────────────────────────────────────────────────────────────

function Badge({ label, colors }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '0.2rem 0.6rem', borderRadius: '9999px',
      fontSize: '0.72rem', fontWeight: '600',
      backgroundColor: colors?.bg || '#F9FAFB',
      color: colors?.text || '#374151',
      border: `1px solid ${colors?.border || '#E5E7EB'}`,
    }}>
      {label}
    </span>
  );
}

// ── Mode selector ──────────────────────────────────────────────────────────────

function ModeSelector({ mode, onChange }) {
  const { t } = useLanguage();
  const { theme } = useTheme();

  const modes = [
    { id: 'features', icon: Sparkles, labelKey: 'compare_mode_features', descKey: 'compare_mode_features_desc' },
    { id: 'tasks',    icon: ListTodo, labelKey: 'compare_mode_tasks',    descKey: 'compare_mode_tasks_desc'    },
  ];

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem',
      marginBottom: '1.75rem',
    }}>
      {modes.map(({ id, icon: Icon, labelKey, descKey }) => {
        const active = mode === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            style={{
              textAlign: 'left', padding: '1rem 1.25rem',
              borderRadius: '0.75rem', cursor: 'pointer',
              border: `2px solid ${active ? '#CC2027' : theme.borderMed}`,
              backgroundColor: active ? '#FEF2F2' : theme.cardBg,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = '#FECACA'; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = theme.borderMed; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '0.4rem',
                backgroundColor: active ? '#CC2027' : theme.tagBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={14} color={active ? 'white' : theme.textSub} />
              </div>
              <span style={{ fontSize: '0.875rem', fontWeight: '700', color: active ? '#CC2027' : theme.text }}>
                {t(labelKey)}
              </span>
              {active && (
                <div style={{
                  marginLeft: 'auto', width: '18px', height: '18px', borderRadius: '50%',
                  backgroundColor: '#CC2027', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Check size={11} color="white" />
                </div>
              )}
            </div>
            <p style={{ fontSize: '0.75rem', color: theme.textSub, lineHeight: 1.5, margin: 0 }}>
              {t(descKey)}
            </p>
          </button>
        );
      })}
    </div>
  );
}

// ── Features input step ────────────────────────────────────────────────────────

function FeaturesInputStep({ items, setItems, additionalContext, setAdditionalContext, onCompare, onReset, error, setError }) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const inputStyle = { ...BASE_INPUT_STYLE, border: `1.5px solid ${theme.borderMed}`, backgroundColor: theme.inputBg, color: theme.text };
  const labelStyle = { display: 'block', fontSize: '0.78rem', fontWeight: '600', color: theme.textMed, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' };

  const addItem = () => {
    if (items.length < MAX_ITEMS) setItems([...items, emptyItem()]);
  };

  const removeItem = (idx) => {
    if (items.length > 2) setItems(items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx, field, value) => {
    setError('');
    const copy = [...items];
    copy[idx] = { ...copy[idx], [field]: value };
    setItems(copy);
  };

  const spotsLeft = MAX_ITEMS - items.length;

  return (
    <>
      {/* Counter + Add button */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{
            fontSize: '0.75rem', fontWeight: '700', color: '#CC2027',
            backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
            padding: '0.25rem 0.625rem', borderRadius: '9999px',
          }}>
            {items.length} / {MAX_ITEMS}
          </span>
          <span style={{ fontSize: '0.78rem', color: theme.textMuted }}>
            {items.length === MAX_ITEMS ? t('compare_max_reached') : `${spotsLeft} ${t('compare_spots')}`}
          </span>
        </div>
        <button
          onClick={addItem}
          disabled={items.length >= MAX_ITEMS}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.5rem 1rem', backgroundColor: theme.cardBg,
            border: `1.5px solid ${items.length >= MAX_ITEMS ? theme.borderMed : '#CC2027'}`,
            borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: '600',
            color: items.length >= MAX_ITEMS ? theme.textMuted : '#CC2027',
            cursor: items.length >= MAX_ITEMS ? 'not-allowed' : 'pointer',
          }}
        >
          <Plus size={14} /> {t('compare_add_feature')}
        </button>
      </div>

      {/* Item cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem' }}>
        {items.map((item, idx) => (
          <div key={idx} style={{
            backgroundColor: theme.cardBg, borderRadius: '0.875rem',
            border: `1px solid ${theme.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            overflow: 'hidden',
          }}>
            {/* Card header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.8rem 1.25rem',
              backgroundColor: theme.hoverBg, borderBottom: `1px solid ${theme.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{
                  width: '26px', height: '26px', borderRadius: '50%',
                  backgroundColor: '#1A1A2E',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <span style={{ color: 'white', fontSize: '0.7rem', fontWeight: '700' }}>{idx + 1}</span>
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: theme.textMed }}>
                  {t('compare_feature')} {idx + 1}
                </span>
              </div>

              {items.length > 2 && (
                <button
                  onClick={() => removeItem(idx)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.3rem',
                    padding: '0.28rem 0.6rem',
                    border: '1px solid #FECACA', backgroundColor: '#FEF2F2',
                    borderRadius: '0.375rem', color: '#DC2626',
                    fontSize: '0.72rem', fontWeight: '600', cursor: 'pointer',
                  }}
                >
                  <Trash2 size={12} /> {t('compare_remove')}
                </button>
              )}
            </div>

            {/* Card body */}
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              {/* Category pills */}
              <div>
                <label style={labelStyle}>
                  {t('compare_category')}{' '}
                  <span style={{ color: theme.textMuted, fontWeight: '400', textTransform: 'none', fontSize: '0.7rem' }}>
                    {t('compare_optional')}
                  </span>
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {CATEGORIES.map((cat) => {
                    const selected = item.category === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => updateItem(idx, 'category', selected ? '' : cat)}
                        style={{
                          padding: '0.28rem 0.65rem', borderRadius: '9999px',
                          fontSize: '0.74rem', fontWeight: selected ? '600' : '400',
                          border: `1.5px solid ${selected ? '#CC2027' : theme.borderMed}`,
                          backgroundColor: selected ? '#FEF2F2' : 'transparent',
                          color: selected ? '#CC2027' : theme.textSub,
                          cursor: 'pointer', transition: 'all 0.12s',
                        }}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title */}
              <div>
                <label style={labelStyle}>{t('compare_feature_name')}</label>
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => updateItem(idx, 'title', e.target.value)}
                  placeholder="e.g. Virement bancaire instantané, Paiement mobile NFC, Biometric login…"
                  maxLength={200}
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = '#CC2027')}
                  onBlur={(e) => (e.target.style.borderColor = theme.borderMed)}
                />
              </div>

              {/* Description */}
              <div>
                <label style={labelStyle}>{t('compare_description')}</label>
                <textarea
                  value={item.description}
                  onChange={(e) => updateItem(idx, 'description', e.target.value)}
                  placeholder="Describe the feature — who uses it, what problem it solves, regulatory constraints, target user base, expected adoption…"
                  rows={3}
                  maxLength={2000}
                  style={{ ...inputStyle, resize: 'vertical', minHeight: '88px', lineHeight: '1.6' }}
                  onFocus={(e) => (e.target.style.borderColor = '#CC2027')}
                  onBlur={(e) => (e.target.style.borderColor = theme.borderMed)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Optional context */}
      <ContextBox value={additionalContext} onChange={setAdditionalContext} setError={setError} />

      {/* AI note */}
      <AiNote count={items.length} mode="features" />

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
        <button
          type="button"
          onClick={onReset}
          style={{
            padding: '0.7rem 1.5rem', backgroundColor: theme.cardBg,
            border: `1.5px solid ${theme.borderMed}`, borderRadius: '0.5rem',
            fontSize: '0.875rem', fontWeight: '500', color: theme.textSub, cursor: 'pointer',
          }}
        >
          {t('compare_clear_all')}
        </button>

        <button
          onClick={onCompare}
          disabled={items.length < 2}
          style={{
            padding: '0.7rem 2rem',
            backgroundColor: items.length >= 2 ? '#CC2027' : '#9CA3AF',
            color: 'white', fontWeight: '600',
            borderRadius: '0.5rem', border: 'none',
            cursor: items.length >= 2 ? 'pointer' : 'not-allowed',
            fontSize: '0.875rem',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}
        >
          🤖 {t('compare_btn')} {items.length} {t('compare_features_word')}
        </button>
      </div>
    </>
  );
}

// ── Tasks input step ───────────────────────────────────────────────────────────

function TasksInputStep({ initialSelected, additionalContext, setAdditionalContext, onCompare, onReset, error, setError }) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [tasks, setTasks]       = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [selected, setSelected] = useState(initialSelected || new Set());

  useEffect(() => {
    taskService.getAllTasks()
      .then(all => {
        const scored = all.filter(t => t.finalScore != null || t.status === 'AI_SCORED' || t.status === 'APPROVED' || t.status === 'OVERRIDE_REQUESTED');
        setTasks(scored);
      })
      .catch(() => setTasks([]))
      .finally(() => setLoadingTasks(false));
  }, []);

  const toggle = (id) => {
    setError('');
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < MAX_ITEMS) {
        next.add(id);
      }
      return next;
    });
  };

  const selectedTasks = tasks.filter(t => selected.has(t.id));
  const canCompare    = selected.size >= 2;

  const handleCompare = () => {
    if (!canCompare) return;
    const items = selectedTasks.map(t => ({
      title:       t.title,
      description: t.description || t.title,
      category:    t.taskType || '',
    }));
    onCompare(items);
  };

  if (loadingTasks) return (
    <div style={{ textAlign: 'center', padding: '3rem', color: theme.textSub }}>
      <Loader2 size={28} color="#CC2027" style={{ margin: '0 auto 0.75rem', animation: '_cmpSpin 0.9s linear infinite' }} />
      <p style={{ fontSize: '0.85rem' }}>{t('compare_loading_tasks_msg')}</p>
    </div>
  );

  if (tasks.length === 0) return (
    <div style={{ backgroundColor: theme.cardBg, borderRadius: '0.875rem', border: `1px solid ${theme.border}` }}>
      <EmptyState
        variant="compare"
        title={t('compare_no_tasks_title')}
        subtitle={t('compare_no_tasks_hint')}
      />
    </div>
  );

  return (
    <>
      {/* Selection counter */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{
            fontSize: '0.75rem', fontWeight: '700',
            color: selected.size >= 2 ? '#CC2027' : theme.textSub,
            backgroundColor: selected.size >= 2 ? '#FEF2F2' : theme.hoverBg,
            border: `1px solid ${selected.size >= 2 ? '#FECACA' : theme.borderMed}`,
            padding: '0.25rem 0.625rem', borderRadius: '9999px',
          }}>
            {selected.size} / {MAX_ITEMS} {t('compare_selected')}
          </span>
          <span style={{ fontSize: '0.78rem', color: theme.textMuted }}>
            {selected.size < 2
              ? `${t('compare_select_min')} ${2 - selected.size}`
              : selected.size === MAX_ITEMS
                ? t('compare_max_reached')
                : `${t('compare_select_max_text')} ${MAX_ITEMS - selected.size} ${t('compare_more')}`}
          </span>
        </div>
        {selected.size > 0 && (
          <button
            onClick={() => setSelected(new Set())}
            style={{
              fontSize: '0.75rem', color: theme.textSub, background: 'none',
              border: 'none', cursor: 'pointer', textDecoration: 'underline',
            }}
          >
            {t('compare_clear_selection')}
          </button>
        )}
      </div>

      {/* Task grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '0.75rem', marginBottom: '1.25rem',
      }}>
        {tasks.map(task => {
          const isSelected = selected.has(task.id);
          const isDisabled = !isSelected && selected.size >= MAX_ITEMS;
          const moscow = MOSCOW_TASK_COLORS[task.moscowLabel] || MOSCOW_TASK_COLORS.SHOULD;

          return (
            <div
              key={task.id}
              onClick={() => !isDisabled && toggle(task.id)}
              style={{
                backgroundColor: theme.cardBg, borderRadius: '0.75rem',
                border: `2px solid ${isSelected ? '#CC2027' : theme.border}`,
                padding: '1rem', cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isDisabled ? 0.45 : 1,
                position: 'relative', transition: 'all 0.12s',
                boxShadow: isSelected ? '0 0 0 3px rgba(204,32,39,0.1)' : '0 1px 3px rgba(0,0,0,0.04)',
              }}
              onMouseEnter={e => { if (!isDisabled && !isSelected) e.currentTarget.style.borderColor = '#FECACA'; }}
              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = theme.border; }}
            >
              {isSelected && (
                <div style={{
                  position: 'absolute', top: '0.6rem', right: '0.6rem',
                  width: '20px', height: '20px', borderRadius: '50%',
                  backgroundColor: '#CC2027',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Check size={12} color="white" />
                </div>
              )}

              <p style={{ fontSize: '0.68rem', color: theme.textMuted, marginBottom: '0.3rem' }}>
                {task.taskType}
              </p>

              <h4 style={{
                fontSize: '0.85rem', fontWeight: '700', color: theme.text,
                marginBottom: '0.6rem', lineHeight: 1.4,
                overflow: 'hidden', textOverflow: 'ellipsis',
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              }}>
                {task.title}
              </h4>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                {task.moscowLabel && (
                  <span style={{
                    padding: '0.15rem 0.5rem', borderRadius: '9999px',
                    fontSize: '0.65rem', fontWeight: '700',
                    backgroundColor: moscow.bg, color: moscow.text,
                    border: `1px solid ${moscow.border}`,
                  }}>
                    {task.moscowLabel}
                  </span>
                )}
                {task.finalScore != null && (
                  <span style={{
                    padding: '0.15rem 0.5rem', borderRadius: '9999px',
                    fontSize: '0.65rem', fontWeight: '700',
                    backgroundColor: theme.tagBg, color: theme.textMed,
                    border: `1px solid ${theme.borderMed}`,
                  }}>
                    ⚡ {task.finalScore?.toFixed(1)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Optional context */}
      <ContextBox value={additionalContext} onChange={setAdditionalContext} setError={setError} />

      {/* AI note */}
      <AiNote count={selected.size} mode="tasks" />

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
        <button
          type="button"
          onClick={onReset}
          style={{
            padding: '0.7rem 1.5rem', backgroundColor: theme.cardBg,
            border: `1.5px solid ${theme.borderMed}`, borderRadius: '0.5rem',
            fontSize: '0.875rem', fontWeight: '500', color: theme.textSub, cursor: 'pointer',
          }}
        >
          {t('compare_clear')}
        </button>

        <button
          onClick={handleCompare}
          disabled={!canCompare}
          style={{
            padding: '0.7rem 2rem',
            backgroundColor: canCompare ? '#CC2027' : '#9CA3AF',
            color: 'white', fontWeight: '600',
            borderRadius: '0.5rem', border: 'none',
            cursor: canCompare ? 'pointer' : 'not-allowed',
            fontSize: '0.875rem',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}
        >
          🤖 {t('compare_btn')} {selected.size > 0 ? selected.size : ''} {t('compare_tasks_word')}
        </button>
      </div>
    </>
  );
}

// ── Shared sub-components ──────────────────────────────────────────────────────

function ContextBox({ value, onChange, setError }) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const inputStyle = { ...BASE_INPUT_STYLE, border: `1.5px solid ${theme.borderMed}`, backgroundColor: theme.inputBg, color: theme.text };
  const labelStyle = { display: 'block', fontSize: '0.78rem', fontWeight: '600', color: theme.textMed, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' };
  return (
    <div style={{
      backgroundColor: theme.cardBg, borderRadius: '0.875rem',
      border: `1px solid ${theme.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      padding: '1.25rem', marginBottom: '1.25rem',
    }}>
      <label style={{ ...labelStyle, marginBottom: '0.6rem' }}>
        {t('compare_context_label')}{' '}
        <span style={{ color: theme.textMuted, fontWeight: '400', textTransform: 'none', fontSize: '0.7rem' }}>
          {t('compare_optional')}
        </span>
      </label>
      <textarea
        value={value}
        onChange={(e) => { setError(''); onChange(e.target.value); }}
        placeholder="e.g. Q3 budget constrained · BCT audit in September · limited to 2 dev squads · mobile-first strategy…"
        rows={2}
        style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.6' }}
        onFocus={(e) => (e.target.style.borderColor = '#CC2027')}
        onBlur={(e) => (e.target.style.borderColor = theme.borderMed)}
      />
      <p style={{ fontSize: '0.72rem', color: theme.textMuted, marginTop: '0.35rem' }}>
        {t('compare_context_hint')}
      </p>
    </div>
  );
}

function AiNote({ count, mode }) {
  const { t } = useLanguage();
  return (
    <div style={{
      backgroundColor: '#1A1A2E', borderRadius: '0.875rem',
      padding: '1.25rem 1.5rem', marginBottom: '1.5rem',
      display: 'flex', alignItems: 'center', gap: '1rem',
    }}>
      <div style={{
        width: '36px', height: '36px', borderRadius: '50%',
        backgroundColor: 'rgba(204,32,39,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <span style={{ fontSize: '1.1rem' }}>🤖</span>
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ color: 'white', fontSize: '0.85rem', fontWeight: '600', margin: '0 0 0.2rem' }}>
          {t('compare_ai_title')}
        </p>
        <p style={{ color: '#6B7280', fontSize: '0.78rem', lineHeight: '1.55', margin: 0 }}>
          {mode === 'tasks'
            ? `${count >= 2 ? count : '—'} ${t('compare_ai_note_tasks')}`
            : `${t('compare_ai_note_features_pre')} ${count} ${t('compare_ai_note_features')}`}
        </p>
      </div>
    </div>
  );
}

// ── Loading screen ─────────────────────────────────────────────────────────────

function LoadingStep({ items }) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  return (
    <PageWrapper title={t('compare_title')} subtitle={t('compare_analyzing_subtitle')}>
      <style>{`
        @keyframes _cmpSpin { to { transform: rotate(360deg); } }
        @keyframes _cmpFadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        ._cmp-spinner { animation: _cmpSpin 0.9s linear infinite; }
        ._cmp-row { animation: _cmpFadeUp 0.35s ease both; }
      `}</style>

      <div style={{ maxWidth: '520px' }}>
        <div style={{
          backgroundColor: theme.cardBg, borderRadius: '1rem',
          padding: '3rem 2rem', textAlign: 'center',
          border: `1px solid ${theme.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{
            width: '60px', height: '60px', borderRadius: '50%',
            border: `4px solid ${theme.border}`, borderTopColor: '#CC2027',
            margin: '0 auto 1.5rem',
          }} className="_cmp-spinner" />

          <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: theme.text, marginBottom: '0.4rem' }}>
            {t('compare_analyzing')} {items.length} {t('compare_items')}
          </h3>
          <p style={{ fontSize: '0.82rem', color: theme.textMuted, marginBottom: '2rem', lineHeight: '1.7' }}>
            {t('compare_applying')}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', textAlign: 'left' }}>
            {items.map((item, i) => (
              <div
                key={i}
                className="_cmp-row"
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.55rem 0.875rem', borderRadius: '0.5rem',
                  backgroundColor: theme.hoverBg, border: `1px solid ${theme.border}`,
                  animationDelay: `${i * 0.07}s`,
                }}
              >
                <div style={{
                  width: '22px', height: '22px', borderRadius: '50%',
                  backgroundColor: '#CC2027', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <span style={{ color: 'white', fontSize: '0.65rem', fontWeight: '700' }}>{i + 1}</span>
                </div>
                <span style={{ fontSize: '0.84rem', color: theme.textMed, fontWeight: '500' }}>
                  {item.title || `${t('compare_feature')} ${i + 1}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

// ── Results screen ─────────────────────────────────────────────────────────────

function ResultsStep({ results, onReset, mode }) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const displayResults = useTranslatedCompareResults(results);
  const maxScore = Math.max(...displayResults.rankedItems.map(r => r.finalScore), 1);

  return (
    <PageWrapper
      title={t('compare_title')}
      subtitle={`${displayResults.rankedItems.length} ${mode === 'tasks' ? t('compare_tasks_word') : t('compare_features_word')} ${t('compare_ranked')} · ${displayResults.modelUsed}`}
    >
      <div style={{ maxWidth: '860px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Top action */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onReset}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.45rem',
              padding: '0.6rem 1.2rem',
              backgroundColor: theme.cardBg, border: `1.5px solid ${theme.borderMed}`,
              borderRadius: '0.5rem', fontSize: '0.85rem',
              fontWeight: '500', color: theme.textMed, cursor: 'pointer',
            }}
          >
            <RotateCcw size={14} /> {t('compare_new_comparison')}
          </button>
        </div>

        {/* Summary row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{
            backgroundColor: '#1A1A2E', borderRadius: '0.875rem',
            padding: '1.5rem', border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '1rem' }}>🎯</span>
              <span style={{
                color: '#F9FAFB', fontSize: '0.72rem', fontWeight: '700',
                textTransform: 'uppercase', letterSpacing: '0.07em',
              }}>{t('compare_recommendation')}</span>
            </div>
            <p style={{ color: '#D1D5DB', fontSize: '0.875rem', lineHeight: '1.75' }}>
              {displayResults.recommendation}
            </p>
          </div>

          <div style={{
            backgroundColor: theme.cardBg, borderRadius: '0.875rem',
            padding: '1.5rem', border: `1px solid ${theme.border}`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '1rem' }}>📊</span>
              <span style={{
                color: theme.textMed, fontSize: '0.72rem', fontWeight: '700',
                textTransform: 'uppercase', letterSpacing: '0.07em',
              }}>{t('compare_overall_analysis')}</span>
            </div>
            <p style={{ color: theme.textSub, fontSize: '0.875rem', lineHeight: '1.75' }}>
              {displayResults.overallAnalysis}
            </p>
          </div>
        </div>

        {/* Ranked items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {displayResults.rankedItems.map((item) => {
            const meta = RANK_META[item.rank - 1] || DEFAULT_RANK;
            const kano = KANO_COLORS[item.kanoCategory] || KANO_COLORS.Performance;
            const moscow = MOSCOW_COLORS[item.moscowLabel] || MOSCOW_COLORS.Should;
            const barPct = ((item.finalScore / maxScore) * 100).toFixed(1);
            const multiplier = (item.kanoMultiplier * item.moscowMultiplier).toFixed(2);

            return (
              <div key={item.rank} style={{
                backgroundColor: theme.cardBg, borderRadius: '0.875rem',
                border: `1.5px solid ${item.rank <= 3 ? meta.border : theme.border}`,
                boxShadow: item.rank === 1
                  ? `0 0 0 1px ${meta.border}, 0 4px 12px rgba(0,0,0,0.06)`
                  : '0 1px 3px rgba(0,0,0,0.04)',
                overflow: 'hidden',
              }}>

                {/* Header */}
                <div style={{
                  padding: '1.25rem 1.5rem',
                  borderBottom: `1px solid ${theme.border}`,
                  backgroundColor: item.rank === 1 ? `${meta.lightBg}80` : theme.cardBg,
                  display: 'flex', alignItems: 'flex-start',
                  justifyContent: 'space-between', gap: '1rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                    {/* Rank circle */}
                    <div style={{
                      width: '46px', height: '46px', borderRadius: '50%',
                      backgroundColor: meta.lightBg,
                      border: `2px solid ${meta.border}`,
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      {meta.medal ? (
                        <span style={{ fontSize: '1.15rem', lineHeight: 1 }}>{meta.medal}</span>
                      ) : (
                        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: meta.color }}>
                          #{item.rank}
                        </span>
                      )}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.3rem' }}>
                        <span style={{
                          fontSize: '0.68rem', fontWeight: '700', color: meta.color,
                          textTransform: 'uppercase', letterSpacing: '0.07em',
                        }}>
                          {t('compare_rank_label')}{item.rank}
                        </span>
                        {item.category && (
                          <span style={{
                            fontSize: '0.68rem', fontWeight: '600',
                            color: theme.textSub, backgroundColor: theme.tagBg,
                            padding: '0.1rem 0.45rem', borderRadius: '9999px',
                            border: `1px solid ${theme.borderMed}`,
                          }}>
                            {item.category}
                          </span>
                        )}
                        {/* Mode indicator */}
                        <span style={{
                          fontSize: '0.65rem', fontWeight: '600',
                          color: mode === 'tasks' ? '#7C3AED' : '#16A34A',
                          backgroundColor: mode === 'tasks' ? '#F5F3FF' : '#F0FDF4',
                          padding: '0.1rem 0.45rem', borderRadius: '9999px',
                          border: `1px solid ${mode === 'tasks' ? '#DDD6FE' : '#BBF7D0'}`,
                        }}>
                          {mode === 'tasks' ? t('compare_task_pill') : t('compare_feature_pill')}
                        </span>
                      </div>
                      <h3 style={{ fontSize: '1rem', fontWeight: '700', color: theme.text, lineHeight: 1.3 }}>
                        {item.title}
                      </h3>
                    </div>
                  </div>

                  {/* Score pill */}
                  <div style={{
                    flexShrink: 0, backgroundColor: meta.lightBg,
                    border: `1.5px solid ${meta.border}`,
                    borderRadius: '0.5rem', padding: '0.4rem 0.875rem', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: '800', color: meta.color, lineHeight: 1 }}>
                      {item.finalScore.toFixed(1)}
                    </div>
                    <div style={{
                      fontSize: '0.6rem', color: theme.textMuted, fontWeight: '600',
                      textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px',
                    }}>{t('compare_score_label')}</div>
                  </div>
                </div>

                {/* Badges */}
                <div style={{
                  padding: '0.6rem 1.5rem',
                  borderBottom: `1px solid ${theme.border}`,
                  display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center',
                }}>
                  <Badge label={`Kano: ${item.kanoCategory}`} colors={kano} />
                  <Badge label={`MoSCoW: ${item.moscowLabel}`} colors={moscow} />
                </div>

                {/* RICE breakdown */}
                <div style={{ padding: '1rem 1.5rem', borderBottom: `1px solid ${theme.border}` }}>
                  <p style={{
                    fontSize: '0.68rem', fontWeight: '700', color: theme.textMuted,
                    textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.75rem',
                  }}>
                    {t('compare_rice_breakdown')}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                    {[
                      { label: t('reach'),      value: item.reach.toFixed(1) },
                      { label: t('impact'),     value: item.impact.toFixed(1) },
                      { label: t('confidence'), value: item.confidence.toFixed(2) },
                      { label: t('effort'),     value: item.effort.toFixed(1) },
                    ].map((m) => (
                      <div key={m.label} style={{
                        backgroundColor: theme.hoverBg, border: `1px solid ${theme.border}`,
                        borderRadius: '0.5rem', padding: '0.4rem 0.7rem',
                        textAlign: 'center', minWidth: '68px',
                      }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: '700', color: theme.text }}>{m.value}</div>
                        <div style={{
                          fontSize: '0.58rem', color: theme.textMuted, fontWeight: '600',
                          textTransform: 'uppercase', letterSpacing: '0.04em',
                        }}>{m.label}</div>
                      </div>
                    ))}

                    <span style={{ color: '#D1D5DB', fontSize: '1rem', padding: '0 0.1rem' }}>→</span>

                    <div style={{
                      backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE',
                      borderRadius: '0.5rem', padding: '0.4rem 0.7rem',
                      textAlign: 'center', minWidth: '68px',
                    }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#2563EB' }}>
                        {item.riceScore.toFixed(1)}
                      </div>
                      <div style={{
                        fontSize: '0.58rem', color: '#60A5FA', fontWeight: '600',
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                      }}>RICE</div>
                    </div>

                    <span style={{ color: theme.textMuted, fontSize: '0.78rem' }}>× {multiplier}</span>
                    <span style={{ color: theme.borderMed, fontSize: '1rem' }}>=</span>

                    <div style={{
                      backgroundColor: meta.lightBg, border: `1px solid ${meta.border}`,
                      borderRadius: '0.5rem', padding: '0.4rem 0.7rem',
                      textAlign: 'center', minWidth: '68px',
                    }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: '700', color: meta.color }}>
                        {item.finalScore.toFixed(1)}
                      </div>
                      <div style={{
                        fontSize: '0.58rem', color: theme.textMuted, fontWeight: '600',
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                      }}>{t('compare_final_label')}</div>
                    </div>
                  </div>

                  {/* Score bar */}
                  <div style={{ marginTop: '0.875rem' }}>
                    <div style={{
                      height: '5px', backgroundColor: theme.tagBg,
                      borderRadius: '9999px', overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%', width: `${barPct}%`,
                        backgroundColor: item.rank === 1 ? meta.color : '#CC2027',
                        borderRadius: '9999px',
                      }} />
                    </div>
                  </div>
                </div>

                {/* Reasoning */}
                <div style={{ padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <div style={{ display: 'flex', gap: '0.6rem' }}>
                    <span style={{ fontSize: '0.85rem', flexShrink: 0, marginTop: '1px' }}>📐</span>
                    <p style={{ fontSize: '0.83rem', color: theme.textSub, lineHeight: '1.65', margin: 0 }}>
                      <span style={{ fontWeight: '700', color: kano.text }}>Kano · </span>
                      {item.kanoReasoning}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '0.6rem' }}>
                    <span style={{ fontSize: '0.85rem', flexShrink: 0, marginTop: '1px' }}>📋</span>
                    <p style={{ fontSize: '0.83rem', color: theme.textSub, lineHeight: '1.65', margin: 0 }}>
                      <span style={{ fontWeight: '700', color: moscow.text }}>MoSCoW · </span>
                      {item.moscowReasoning}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '0.6rem' }}>
                    <span style={{ fontSize: '0.85rem', flexShrink: 0, marginTop: '1px' }}>💡</span>
                    <p style={{ fontSize: '0.83rem', color: theme.textSub, lineHeight: '1.65', margin: 0 }}>
                      <span style={{ fontWeight: '700', color: theme.textMed }}>{t('compare_why_rank')} · </span>
                      {item.reasoning}
                    </p>
                  </div>

                  {item.versusNext && (
                    <div style={{
                      marginTop: '0.2rem', padding: '0.625rem 0.875rem',
                      backgroundColor: theme.hoverBg, border: `1px solid ${theme.border}`,
                      borderRadius: '0.5rem', display: 'flex', gap: '0.6rem', alignItems: 'flex-start',
                    }}>
                      <span style={{ fontSize: '0.85rem', flexShrink: 0, marginTop: '1px' }}>↓</span>
                      <p style={{ fontSize: '0.83rem', color: theme.textSub, lineHeight: '1.65', margin: 0 }}>
                        <span style={{ fontWeight: '700', color: theme.textMuted }}>
                          {t('compare_outranks')}{item.rank + 1} ·{' '}
                        </span>
                        {item.versusNext}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom reset */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: '1rem' }}>
          <button
            onClick={onReset}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.75rem 2rem',
              backgroundColor: '#1A1A2E', color: 'white',
              borderRadius: '0.5rem', border: 'none',
              fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer',
            }}
          >
            <RotateCcw size={15} />
            {t('compare_start_new')}
          </button>
        </div>
      </div>
    </PageWrapper>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

function Compare() {
  const { t } = useLanguage();
  const location = useLocation();
  const [mode, setMode]                 = useState(() => location.state?.mode || 'features');
  const [initialSelectedIds]            = useState(() => new Set(location.state?.preSelectedIds || []));
  const [step, setStep]                 = useState('input');
  const [items, setItems]               = useState([emptyItem(), emptyItem()]);
  const [additionalContext, setAdditionalContext] = useState('');
  const [results, setResults]           = useState(null);
  const [error, setError]               = useState('');
  const [submittedItems, setSubmittedItems] = useState([]);

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setError('');
    if (newMode === 'features') setItems([emptyItem(), emptyItem()]);
  };

  const runComparison = async (itemsToCompare) => {
    for (let i = 0; i < itemsToCompare.length; i++) {
      if (!itemsToCompare[i].title?.trim()) {
        setError(`Item ${i + 1} is missing a title.`);
        return;
      }
      if (!itemsToCompare[i].description?.trim()) {
        setError(`Item ${i + 1} is missing a description.`);
        return;
      }
    }
    setSubmittedItems(itemsToCompare);
    setStep('loading');
    setError('');
    try {
      const data = await compareService.compare(itemsToCompare, additionalContext);
      setResults(data);
      setStep('results');
    } catch (err) {
      setError(err.response?.data?.message || 'Comparison failed. Please try again.');
      setStep('input');
    }
  };

  const reset = () => {
    setStep('input');
    setItems([emptyItem(), emptyItem()]);
    setAdditionalContext('');
    setResults(null);
    setError('');
    setSubmittedItems([]);
  };

  if (step === 'loading') return <LoadingStep items={submittedItems} />;
  if (step === 'results') return <ResultsStep results={results} onReset={reset} mode={mode} />;

  return (
    <PageWrapper
      title={t('compare_title')}
      subtitle={t('compare_subtitle')}
    >
      <style>{`@keyframes _cmpSpin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ maxWidth: '820px' }}>

        {/* Mode selector */}
        <ModeSelector mode={mode} onChange={handleModeChange} />

        {/* Error */}
        {error && (
          <div style={{
            marginBottom: '1.5rem', padding: '1rem 1.25rem',
            backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
            borderRadius: '0.75rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
          }}>
            <AlertCircle size={18} color="#DC2626" style={{ flexShrink: 0, marginTop: '1px' }} />
            <p style={{ color: '#DC2626', fontSize: '0.875rem', fontWeight: '500', margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Mode content */}
        {mode === 'features' ? (
          <FeaturesInputStep
            items={items}
            setItems={setItems}
            additionalContext={additionalContext}
            setAdditionalContext={setAdditionalContext}
            onCompare={() => runComparison(items)}
            onReset={reset}
            error={error}
            setError={setError}
          />
        ) : (
          <TasksInputStep
            initialSelected={initialSelectedIds}
            additionalContext={additionalContext}
            setAdditionalContext={setAdditionalContext}
            onCompare={runComparison}
            onReset={reset}
            error={error}
            setError={setError}
          />
        )}
      </div>
    </PageWrapper>
  );
}

export default Compare;
