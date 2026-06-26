import { useState, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, Mail, RefreshCw, ArrowLeft, ShieldCheck } from 'lucide-react';

const API = 'http://localhost:8080';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const navigate = useNavigate();

  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');

  const refs = useRef([]);

  // Countdown timer for resend button
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Auto-focus first box on mount
  useEffect(() => { refs.current[0]?.focus(); }, []);

  // Redirect to login 3 seconds after success
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => navigate('/login'), 3000);
    return () => clearTimeout(t);
  }, [success, navigate]);

  const handleChange = (i, val) => {
    if (!/^[0-9]?$/.test(val)) return;
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    setError('');
    if (val && i < 5) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace') {
      if (digits[i]) {
        const next = [...digits];
        next[i] = '';
        setDigits(next);
      } else if (i > 0) {
        refs.current[i - 1]?.focus();
      }
    }
    if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < 5) refs.current[i + 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const next = ['', '', '', '', '', ''];
    pasted.split('').forEach((ch, i) => { next[i] = ch; });
    setDigits(next);
    const nextFocus = Math.min(pasted.length, 5);
    refs.current[nextFocus]?.focus();
  };

  const handleVerify = async () => {
    const code = digits.join('');
    if (code.length < 6) { setError('Please enter all 6 digits'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.message || 'Invalid code. Please try again.');
        setDigits(['', '', '', '', '', '']);
        refs.current[0]?.focus();
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setResendMsg('');
    setError('');
    try {
      const res = await fetch(`${API}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setResendMsg(data.message || 'New code sent!');
      setCooldown(60);
      setDigits(['', '', '', '', '', '']);
      refs.current[0]?.focus();
    } catch {
      setResendMsg('Failed to resend. Try again.');
    } finally {
      setResending(false);
    }
  };

  const filled = digits.filter(Boolean).length;

  // ── Success screen
  if (success) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 50%, #0F3460 100%)',
        fontFamily: 'Inter, Arial, sans-serif',
      }}>
        <div style={{
          background: 'white', borderRadius: '20px', padding: '56px 48px',
          width: '100%', maxWidth: '420px', textAlign: 'center',
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
        }}>
          {/* Animated checkmark */}
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #16A34A, #22C55E)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
            boxShadow: '0 8px 24px rgba(22,163,74,0.35)',
            animation: 'pop 0.4s ease-out',
          }}>
            <CheckCircle size={40} color="white" strokeWidth={2.5} />
          </div>

          <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#111827', margin: '0 0 10px' }}>
            Email Verified!
          </h1>
          <p style={{ fontSize: '14px', color: '#6B7280', lineHeight: '1.6', margin: '0 0 28px' }}>
            Your email has been confirmed. Your account is now pending admin approval —
            you'll receive an email once it's reviewed.
          </p>

          <div style={{
            background: '#F9FAFB', border: '1px solid #E5E7EB',
            borderRadius: '10px', padding: '14px 20px', marginBottom: '24px',
          }}>
            <p style={{ margin: 0, fontSize: '12px', color: '#9CA3AF' }}>
              Redirecting to login in <strong style={{ color: '#111827' }}>3 seconds</strong>…
            </p>
          </div>

          <Link to="/login" style={{
            display: 'inline-block', background: '#CC2027', color: 'white',
            textDecoration: 'none', padding: '12px 32px',
            borderRadius: '10px', fontWeight: '700', fontSize: '14px',
          }}>
            Go to Login
          </Link>
        </div>

        <style>{`
          @keyframes pop {
            0%   { transform: scale(0.5); opacity: 0; }
            70%  { transform: scale(1.1); }
            100% { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  // ── OTP entry screen
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 50%, #0F3460 100%)',
      fontFamily: 'Inter, Arial, sans-serif', padding: '24px 16px',
    }}>
      <div style={{
        background: 'white', borderRadius: '20px', padding: '48px 40px',
        width: '100%', maxWidth: '440px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
      }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #1A1A2E, #CC2027)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 8px 20px rgba(204,32,39,0.3)',
          }}>
            <ShieldCheck size={30} color="white" />
          </div>

          <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#111827', margin: '0 0 8px' }}>
            Check your inbox
          </h1>
          <p style={{ fontSize: '14px', color: '#6B7280', margin: 0, lineHeight: '1.6' }}>
            We sent a 6-digit code to
          </p>
          <p style={{
            fontSize: '14px', fontWeight: '700', color: '#1A1A2E',
            margin: '4px 0 0', wordBreak: 'break-all',
          }}>
            {email || 'your email address'}
          </p>
        </div>

        {/* OTP boxes */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '10px' }}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={el => refs.current[i] = el}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              onPaste={i === 0 ? handlePaste : undefined}
              style={{
                width: '52px', height: '64px',
                textAlign: 'center', fontSize: '26px', fontWeight: '800',
                border: `2px solid ${error ? '#FCA5A5' : d ? '#1A1A2E' : '#E5E7EB'}`,
                borderRadius: '12px', outline: 'none',
                background: error ? '#FFF5F5' : d ? '#F0F4FF' : 'white',
                color: '#111827',
                transition: 'all 0.15s',
                caretColor: 'transparent',
                fontFamily: 'monospace',
              }}
              onFocus={e => {
                e.target.style.borderColor = error ? '#EF4444' : '#CC2027';
                e.target.style.boxShadow = `0 0 0 3px ${error ? 'rgba(239,68,68,0.12)' : 'rgba(204,32,39,0.12)'}`;
              }}
              onBlur={e => {
                e.target.style.borderColor = error ? '#FCA5A5' : d ? '#1A1A2E' : '#E5E7EB';
                e.target.style.boxShadow = 'none';
              }}
            />
          ))}
        </div>

        {/* Progress indicator */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0 }}>
            {filled}/6 digits entered
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: '#FFF1F2', border: '1px solid #FECACA',
            borderRadius: '10px', padding: '12px 16px', marginBottom: '20px',
            textAlign: 'center',
          }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#CC2027', fontWeight: '600' }}>
              {error}
            </p>
          </div>
        )}

        {/* Resend success */}
        {resendMsg && !error && (
          <div style={{
            background: '#F0FDF4', border: '1px solid #BBF7D0',
            borderRadius: '10px', padding: '12px 16px', marginBottom: '20px',
            textAlign: 'center',
          }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#16A34A', fontWeight: '600' }}>
              {resendMsg}
            </p>
          </div>
        )}

        {/* Verify button */}
        <button
          onClick={handleVerify}
          disabled={loading || filled < 6}
          style={{
            width: '100%', padding: '14px',
            background: filled === 6 && !loading
              ? 'linear-gradient(135deg, #CC2027, #E53E3E)'
              : '#E5E7EB',
            color: filled === 6 && !loading ? 'white' : '#9CA3AF',
            border: 'none', borderRadius: '12px',
            fontSize: '15px', fontWeight: '700', cursor: filled === 6 && !loading ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
            boxShadow: filled === 6 && !loading ? '0 4px 16px rgba(204,32,39,0.3)' : 'none',
            marginBottom: '16px',
          }}
        >
          {loading ? 'Verifying…' : 'Verify Email'}
        </button>

        {/* Resend */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 8px' }}>
            Didn't receive the code?
          </p>
          {cooldown > 0 ? (
            <p style={{ fontSize: '13px', color: '#9CA3AF', margin: 0 }}>
              Resend available in{' '}
              <span style={{ fontWeight: '700', color: '#1A1A2E' }}>{cooldown}s</span>
            </p>
          ) : (
            <button
              onClick={handleResend}
              disabled={resending}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '13px', fontWeight: '700', color: '#CC2027',
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '4px 8px', borderRadius: '6px',
              }}
            >
              <RefreshCw size={13} style={{ animation: resending ? 'spin 1s linear infinite' : 'none' }} />
              {resending ? 'Sending…' : 'Resend code'}
            </button>
          )}
        </div>

        {/* Back to register */}
        <div style={{ textAlign: 'center', marginTop: '28px', paddingTop: '20px', borderTop: '1px solid #F3F4F6' }}>
          <Link to="/register" style={{
            fontSize: '13px', color: '#9CA3AF', textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: '4px',
          }}>
            <ArrowLeft size={13} />
            Back to register
          </Link>
        </div>

        {/* Branding */}
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <p style={{ fontSize: '11px', color: '#D1D5DB', margin: 0 }}>
            Prior<span style={{ color: '#CC2027', fontWeight: '700' }}>IT</span>
            {' '}· Attijari Bank
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input[type="text"]::-webkit-inner-spin-button { display: none; }
      `}</style>
    </div>
  );
}
