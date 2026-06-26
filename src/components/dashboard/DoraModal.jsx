import { useState } from 'react';
import { X, CheckCircle } from 'lucide-react';
import doraService from '../../services/doraService';

const DEPLOYMENT_OPTIONS = [
  { value: 'MULTIPLE_PER_DAY', label: 'Multiple per day', color: '#16A34A' },
  { value: 'DAILY', label: 'Daily', color: '#2563EB' },
  { value: 'WEEKLY', label: 'Weekly', color: '#D97706' },
  { value: 'MONTHLY', label: 'Monthly', color: '#EA580C' },
  { value: 'LESS_THAN_MONTHLY', label: 'Less than monthly', color: '#DC2626' },
];

const RISK_OPTIONS = [
  { value: 'LOW', label: 'Low', color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
  { value: 'MEDIUM', label: 'Medium', color: '#D97706', bg: '#FFF7ED', border: '#FDE68A' },
  { value: 'HIGH', label: 'High', color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA' },
  { value: 'CRITICAL', label: 'Critical', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
];

const inputStyle = {
  width: '100%', padding: '0.65rem 1rem',
  border: '1.5px solid #E5E7EB', borderRadius: '0.5rem',
  fontSize: '0.875rem', outline: 'none',
  boxSizing: 'border-box', backgroundColor: '#FAFAFA',
  color: '#111827', fontFamily: 'Inter, sans-serif',
};

const labelStyle = {
  display: 'block', fontSize: '0.78rem', fontWeight: '600',
  color: '#374151', marginBottom: '0.4rem',
  textTransform: 'uppercase', letterSpacing: '0.05em',
};

function DoraModal({ task, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    estimatedLeadTimeDays: '',
    deploymentFreq: '',
    changeFailureRisk: '',
    recoveryPlan: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await doraService.saveDora({
        taskId: task.id,
        estimatedLeadTimeDays: formData.estimatedLeadTimeDays
          ? parseFloat(formData.estimatedLeadTimeDays) : null,
        deploymentFreq: formData.deploymentFreq || null,
        changeFailureRisk: formData.changeFailureRisk || null,
        recoveryPlan: formData.recoveryPlan || null,
      });
      onSuccess();
    } catch (err) {
      setError('Failed to save DORA indicators. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
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
              DORA Indicators
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

        {/* Info banner */}
        <div style={{
          padding: '0.75rem 1.5rem',
          backgroundColor: '#1A1A2E',
          display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
        }}>
          <span style={{ fontSize: '1rem' }}>📊</span>
          <p style={{ fontSize: '0.78rem', color: '#9CA3AF', lineHeight: '1.5' }}>
            DORA metrics are manually estimated for this task.
            These indicators help track delivery performance and risk.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {error && (
              <div style={{
                padding: '0.75rem', backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA', borderRadius: '0.5rem',
              }}>
                <p style={{ color: '#DC2626', fontSize: '0.8rem' }}>⚠ {error}</p>
              </div>
            )}

            {/* Lead time */}
            <div>
              <label style={labelStyle}>
                Estimated Lead Time (days)
              </label>
              <input
                type="number" step="0.5" min="0"
                value={formData.estimatedLeadTimeDays}
                onChange={(e) => setFormData({
                  ...formData, estimatedLeadTimeDays: e.target.value
                })}
                placeholder="e.g. 5.5"
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = '#CC2027'}
                onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
              />
              <p style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: '0.25rem' }}>
                Time from task approval to deployment
              </p>
            </div>

            {/* Deployment frequency */}
            <div>
              <label style={labelStyle}>Deployment Frequency</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {DEPLOYMENT_OPTIONS.map((opt) => {
                  const isSelected = formData.deploymentFreq === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormData({
                        ...formData, deploymentFreq: opt.value
                      })}
                      style={{
                        padding: '0.4rem 0.85rem',
                        borderRadius: '9999px',
                        border: `1.5px solid ${isSelected ? opt.color : '#E5E7EB'}`,
                        backgroundColor: isSelected ? `${opt.color}15` : 'white',
                        color: isSelected ? opt.color : '#6B7280',
                        fontSize: '0.78rem', fontWeight: isSelected ? '600' : '400',
                        cursor: 'pointer',
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Change failure risk */}
            <div>
              <label style={labelStyle}>Change Failure Risk</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                {RISK_OPTIONS.map((opt) => {
                  const isSelected = formData.changeFailureRisk === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormData({
                        ...formData, changeFailureRisk: opt.value
                      })}
                      style={{
                        padding: '0.6rem',
                        borderRadius: '0.5rem',
                        border: `1.5px solid ${isSelected ? opt.color : '#E5E7EB'}`,
                        backgroundColor: isSelected ? opt.bg : 'white',
                        color: isSelected ? opt.color : '#6B7280',
                        fontSize: '0.78rem', fontWeight: isSelected ? '700' : '400',
                        cursor: 'pointer', textAlign: 'center',
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recovery plan */}
            <div>
              <label style={labelStyle}>Recovery Plan</label>
              <textarea
                value={formData.recoveryPlan}
                onChange={(e) => setFormData({
                  ...formData, recoveryPlan: e.target.value
                })}
                placeholder="Describe the recovery plan if this change fails..."
                rows={3}
                style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.6' }}
                onFocus={(e) => e.target.style.borderColor = '#CC2027'}
                onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
              />
            </div>
          </div>

          {/* Footer */}
          <div style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid #F0F0F0',
            display: 'flex', justifyContent: 'flex-end', gap: '0.75rem',
          }}>
            <button type="button" onClick={onClose} style={{
              padding: '0.6rem 1.25rem', backgroundColor: 'white',
              border: '1.5px solid #E5E7EB', borderRadius: '0.5rem',
              fontSize: '0.875rem', fontWeight: '500',
              color: '#6B7280', cursor: 'pointer',
            }}>
              Cancel
            </button>
            <button type="submit" disabled={isLoading} style={{
              padding: '0.6rem 1.5rem',
              backgroundColor: isLoading ? '#9CA3AF' : '#CC2027',
              color: 'white', border: 'none', borderRadius: '0.5rem',
              fontSize: '0.875rem', fontWeight: '600',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
            }}>
              <CheckCircle size={15} />
              {isLoading ? 'Saving...' : 'Save DORA Indicators'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DoraModal;