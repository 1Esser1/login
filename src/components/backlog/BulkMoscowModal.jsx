import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

const OPTIONS = [
  { value: 'MUST',   color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', desc: 'Critical — must be delivered' },
  { value: 'SHOULD', color: '#D97706', bg: '#FFF7ED', border: '#FDE68A', desc: 'Important but not vital' },
  { value: 'COULD',  color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', desc: 'Nice to have if time allows' },
  { value: 'WONT',   color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB', desc: 'Not this release cycle' },
];

const LABEL = {
  display: 'block', fontSize: '0.75rem', fontWeight: '600',
  color: '#374151', marginBottom: '0.4rem',
  textTransform: 'uppercase', letterSpacing: '0.05em',
};

export default function BulkMoscowModal({ count, loading, onClose, onConfirm }) {
  const [picked, setPicked]               = useState('');
  const [justification, setJustification] = useState('');
  const [err, setErr]                     = useState('');

  function submit() {
    if (!picked)                       { setErr('Select a MoSCoW label.');                        return; }
    if (justification.trim().length < 20) { setErr('Justification must be at least 20 characters.'); return; }
    setErr('');
    onConfirm(picked, justification.trim());
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div style={{
        backgroundColor: 'white', borderRadius: '1rem',
        width: '100%', maxWidth: '520px', overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem', borderBottom: '1px solid #F0F0F0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: '700', color: '#111827' }}>
              Bulk MoSCoW Override
            </h2>
            <p style={{ fontSize: '0.78rem', color: '#9CA3AF', marginTop: '0.15rem' }}>
              {count} task{count !== 1 ? 's' : ''} selected
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
            <X size={20} />
          </button>
        </div>

        {/* Warning */}
        <div style={{
          padding: '0.75rem 1.5rem', backgroundColor: '#FFF7ED',
          borderBottom: '1px solid #FDE68A',
          display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
        }}>
          <AlertTriangle size={16} color="#D97706" style={{ flexShrink: 0, marginTop: '1px' }} />
          <p style={{ fontSize: '0.78rem', color: '#92400E', lineHeight: 1.5 }}>
            This overrides the AI MoSCoW classification for all {count} selected tasks.
            Every change is permanently logged in the audit trail.
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {err && (
            <div style={{ padding: '0.75rem', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '0.5rem' }}>
              <p style={{ color: '#DC2626', fontSize: '0.8rem' }}>⚠ {err}</p>
            </div>
          )}

          {/* MoSCoW picker */}
          <div>
            <label style={LABEL}>New MoSCoW label *</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {OPTIONS.map(o => (
                <button
                  key={o.value}
                  onClick={() => setPicked(o.value)}
                  style={{
                    padding: '0.75rem 1rem', borderRadius: '0.5rem',
                    cursor: 'pointer', textAlign: 'left',
                    border: `2px solid ${picked === o.value ? o.color : o.border}`,
                    backgroundColor: picked === o.value ? o.bg : 'white',
                    transition: 'all 0.15s',
                  }}
                >
                  <p style={{ fontWeight: '700', fontSize: '0.8rem', color: o.color }}>{o.value}</p>
                  <p style={{ fontSize: '0.7rem', color: '#6B7280', marginTop: '0.15rem' }}>{o.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Justification */}
          <div>
            <label style={LABEL}>
              Justification *
              <span style={{ color: '#9CA3AF', fontWeight: '400', marginLeft: '0.5rem' }}>
                ({justification.length}/20 min)
              </span>
            </label>
            <textarea
              value={justification}
              onChange={e => setJustification(e.target.value)}
              placeholder="Explain the business reason for this bulk reclassification…"
              rows={3}
              style={{
                width: '100%', padding: '0.65rem 1rem',
                border: '1.5px solid #E5E7EB', borderRadius: '0.5rem',
                fontSize: '0.875rem', outline: 'none', resize: 'vertical',
                boxSizing: 'border-box', backgroundColor: '#FAFAFA',
                color: '#111827', lineHeight: 1.6,
              }}
              onFocus={e  => (e.target.style.borderColor = '#CC2027')}
              onBlur={e   => (e.target.style.borderColor = '#E5E7EB')}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem', borderTop: '1px solid #F0F0F0',
          display: 'flex', justifyContent: 'flex-end', gap: '0.75rem',
        }}>
          <button onClick={onClose} style={{
            padding: '0.6rem 1.25rem', backgroundColor: 'white',
            border: '1.5px solid #E5E7EB', borderRadius: '0.5rem',
            fontSize: '0.875rem', fontWeight: '500', color: '#6B7280', cursor: 'pointer',
          }}>
            Cancel
          </button>
          <button onClick={submit} disabled={loading} style={{
            padding: '0.6rem 1.5rem',
            backgroundColor: loading ? '#9CA3AF' : '#CC2027',
            color: 'white', border: 'none', borderRadius: '0.5rem',
            fontSize: '0.875rem', fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}>
            {loading ? 'Applying…' : `Apply to ${count} task${count !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
