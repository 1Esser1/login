import { useState } from 'react';
import { X, AlertTriangle, CheckCircle } from 'lucide-react';
import overrideService from '../../services/overrideService';

const FIELD_OPTIONS = [
  { value: 'KANO_CATEGORY', label: 'Kano Category' },
  { value: 'MOSCOW_LABEL', label: 'MoSCoW Label' },
  { value: 'REACH', label: 'Reach (1-10)' },
  { value: 'IMPACT', label: 'Impact (1-10)' },
  { value: 'CONFIDENCE', label: 'Confidence (0.1-1.0)' },
  { value: 'EFFORT', label: 'Effort (0.5-10)' },
];

const KANO_OPTIONS = ['BASIC', 'PERFORMANCE', 'DELIGHTER', 'INDIFFERENT', 'REVERSE'];
const MOSCOW_OPTIONS = ['MUST', 'SHOULD', 'COULD', 'WONT'];

function OverrideModal({ task, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    fieldChanged: '',
    newValue: '',
    justification: '',
    confirmed: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.confirmed) {
      setError('Please confirm that this override reflects a business decision.');
      return;
    }

    if (formData.justification.length < 20) {
      setError('Justification must be at least 20 characters.');
      return;
    }

    setIsLoading(true);
    try {
      await overrideService.createOverride({
        taskId: task.id,
        fieldChanged: formData.fieldChanged,
        newValue: formData.newValue,
        justification: formData.justification,
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Override failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderValueInput = () => {
    if (!formData.fieldChanged) return null;

    if (formData.fieldChanged === 'KANO_CATEGORY') {
      return (
        <select
          value={formData.newValue}
          onChange={(e) => setFormData({ ...formData, newValue: e.target.value })}
          required
          style={selectStyle}
        >
          <option value="">Select Kano category</option>
          {KANO_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }

    if (formData.fieldChanged === 'MOSCOW_LABEL') {
      return (
        <select
          value={formData.newValue}
          onChange={(e) => setFormData({ ...formData, newValue: e.target.value })}
          required
          style={selectStyle}
        >
          <option value="">Select MoSCoW label</option>
          {MOSCOW_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }

    return (
      <input
        type="number"
        value={formData.newValue}
        onChange={(e) => setFormData({ ...formData, newValue: e.target.value })}
        placeholder={
          formData.fieldChanged === 'CONFIDENCE'
            ? '0.1 — 1.0'
            : formData.fieldChanged === 'EFFORT'
            ? '0.5 — 10'
            : '1 — 10'
        }
        step="0.1"
        required
        style={inputStyle}
      />
    );
  };

  return (
    // Backdrop
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Modal */}
      <div style={{
        backgroundColor: 'white', borderRadius: '1rem',
        width: '100%', maxWidth: '540px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #F0F0F0',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: '700', color: '#111827' }}>
              Override AI Score
            </h2>
            <p style={{ fontSize: '0.78rem', color: '#9CA3AF', marginTop: '0.15rem' }}>
              {task.title}
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#9CA3AF', display: 'flex', alignItems: 'center',
          }}>
            <X size={20} />
          </button>
        </div>

        {/* Warning banner */}
        <div style={{
          padding: '0.75rem 1.5rem',
          backgroundColor: '#FFF7ED',
          borderBottom: '1px solid #FDE68A',
          display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
        }}>
          <AlertTriangle size={16} color="#D97706" style={{ flexShrink: 0, marginTop: '1px' }} />
          <p style={{ fontSize: '0.78rem', color: '#92400E', lineHeight: '1.5' }}>
            All overrides are permanently logged in the audit trail with your name,
            timestamp, and justification. This action cannot be undone.
          </p>
        </div>

        {/* Current AI score summary */}
        <div style={{
          padding: '1rem 1.5rem',
          backgroundColor: '#F8F9FB',
          borderBottom: '1px solid #F0F0F0',
          display: 'flex', gap: '1.5rem',
        }}>
          {[
            { label: 'Kano', value: task.kanoCategory },
            { label: 'MoSCoW', value: task.moscowLabel },
            { label: 'Final Score', value: task.finalScore?.toFixed(1) },
            { label: 'Model', value: task.modelUsed?.split('-').slice(0, 2).join('-') },
          ].map(({ label, value }) => value && (
            <div key={label}>
              <p style={{ fontSize: '0.68rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {label}
              </p>
              <p style={{ fontSize: '0.85rem', fontWeight: '600', color: '#111827' }}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

            {/* Error */}
            {error && (
              <div style={{
                padding: '0.75rem', backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA', borderRadius: '0.5rem',
              }}>
                <p style={{ color: '#DC2626', fontSize: '0.8rem' }}>⚠ {error}</p>
              </div>
            )}

            {/* Field to override */}
            <div>
              <label style={labelStyle}>Field to override *</label>
              <select
                value={formData.fieldChanged}
                onChange={(e) => setFormData({
                  ...formData, fieldChanged: e.target.value, newValue: ''
                })}
                required
                style={selectStyle}
              >
                <option value="">Select field</option>
                {FIELD_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Current value (read only) */}
            {formData.fieldChanged && (
              <div>
                <label style={labelStyle}>Current AI value</label>
                <div style={{
                  padding: '0.65rem 1rem',
                  backgroundColor: '#F3F4F6',
                  border: '1.5px solid #E5E7EB',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  color: '#6B7280',
                }}>
                  {formData.fieldChanged === 'KANO_CATEGORY' && task.kanoCategory}
                  {formData.fieldChanged === 'MOSCOW_LABEL' && task.moscowLabel}
                  {formData.fieldChanged === 'REACH' && task.reach}
                  {formData.fieldChanged === 'IMPACT' && task.impact}
                  {formData.fieldChanged === 'CONFIDENCE' && task.confidence}
                  {formData.fieldChanged === 'EFFORT' && task.effort}
                  {formData.fieldChanged === 'RICE_SCORE' && task.riceScore?.toFixed(2)}
                </div>
              </div>
            )}

            {/* New value */}
            {formData.fieldChanged && (
              <div>
                <label style={labelStyle}>New value *</label>
                {renderValueInput()}
              </div>
            )}

            {/* Justification */}
            <div>
              <label style={labelStyle}>
                Justification *
                <span style={{ color: '#9CA3AF', fontWeight: '400', marginLeft: '0.5rem' }}>
                  ({formData.justification.length}/20 min)
                </span>
              </label>
              <textarea
                value={formData.justification}
                onChange={(e) => setFormData({
                  ...formData, justification: e.target.value
                })}
                placeholder="Explain why this override is necessary. Include the business context or regulatory requirement that informed this decision."
                required
                rows={4}
                style={{
                  ...inputStyle,
                  resize: 'vertical',
                  minHeight: '90px',
                  lineHeight: '1.6',
                }}
              />
            </div>

            {/* Confirmation checkbox */}
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
              padding: '0.875rem',
              backgroundColor: '#F8F9FB',
              borderRadius: '0.5rem',
              border: '1px solid #E5E7EB',
              cursor: 'pointer',
            }}
              onClick={() => setFormData({
                ...formData, confirmed: !formData.confirmed
              })}
            >
              <div style={{
                width: '18px', height: '18px', borderRadius: '4px', flexShrink: 0,
                border: `2px solid ${formData.confirmed ? '#CC2027' : '#D1D5DB'}`,
                backgroundColor: formData.confirmed ? '#CC2027' : 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginTop: '1px',
              }}>
                {formData.confirmed && (
                  <CheckCircle size={12} color="white" />
                )}
              </div>
              <p style={{ fontSize: '0.78rem', color: '#374151', lineHeight: '1.5' }}>
                I confirm this override reflects a business decision not captured by the AI,
                and I accept responsibility for this change.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid #F0F0F0',
            display: 'flex', justifyContent: 'flex-end', gap: '0.75rem',
          }}>
            <button
              type="button" onClick={onClose}
              style={{
                padding: '0.6rem 1.25rem',
                backgroundColor: 'white',
                border: '1.5px solid #E5E7EB',
                borderRadius: '0.5rem',
                fontSize: '0.875rem', fontWeight: '500',
                color: '#6B7280', cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !formData.confirmed}
              style={{
                padding: '0.6rem 1.5rem',
                backgroundColor: isLoading || !formData.confirmed
                  ? '#9CA3AF' : '#CC2027',
                color: 'white', border: 'none',
                borderRadius: '0.5rem',
                fontSize: '0.875rem', fontWeight: '600',
                cursor: isLoading || !formData.confirmed
                  ? 'not-allowed' : 'pointer',
              }}
            >
              {isLoading ? 'Applying...' : 'Confirm Override'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '0.65rem 1rem',
  border: '1.5px solid #E5E7EB',
  borderRadius: '0.5rem',
  fontSize: '0.875rem',
  outline: 'none',
  boxSizing: 'border-box',
  backgroundColor: '#FAFAFA',
  color: '#111827',
  fontFamily: 'Inter, sans-serif',
};

const selectStyle = {
  ...inputStyle,
  backgroundColor: 'white',
};

const labelStyle = {
  display: 'block',
  fontSize: '0.78rem',
  fontWeight: '600',
  color: '#374151',
  marginBottom: '0.4rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

export default OverrideModal;