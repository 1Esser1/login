import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Shield, Sun, Moon } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { useAutoT } from '../i18n/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

const STRINGS = {
  tagline:    'Everything your IT team needs, in one place.',
  subtitle:   'Task prioritization, sprint planning, delivery tracking and more — built for Attijari IT.',
  welcome:    'Welcome back',
  form_sub:   'Sign in to continue',
  email:      'Email',
  password:   'Password',
  signing_in: 'Signing in…',
  sign_in:    'Sign in',
  no_account: "Don't have access?",
  request:    'Request access',
  secured:    'Secured · Attijari IT Division',
};

const FEATURES = [
  'Smart task prioritization — Kano, MoSCoW & RICE',
  'Sprint planning & backlog management',
  'DORA metrics, SLA tracking & workload visibility',
  'JIRA integration & full audit trail',
];

/* ── Floating network canvas ── */
function NetworkCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);
    const ctx = canvas.getContext('2d');
    const nodes = Array.from({ length: 24 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.28, vy: (Math.random() - 0.5) * 0.28,
      r: Math.random() * 1.6 + 0.8,
    }));
    let raf;
    function tick() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > canvas.width)  n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
      });
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 120) {
            ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(204,32,39,${(1 - d / 120) * 0.14})`; ctx.lineWidth = 0.6; ctx.stroke();
          }
        }
      }
      nodes.forEach(n => { ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fill(); });
      raf = requestAnimationFrame(tick);
    }
    tick();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />;
}

/* ── NEXUS full mark — stylised N with circuit trace, arrow & sparkle ── */
function NexusMark({ size = 115 }) {
  const h = Math.round(size * 168 / 205);
  return (
    <svg width={size} height={h} viewBox="0 0 205 168" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lnrg" x1="0.15" y1="0" x2="0.3" y2="1">
          <stop offset="0%"   stopColor="#CC2027"/>
          <stop offset="55%"  stopColor="#A01825"/>
          <stop offset="100%" stopColor="#720F18"/>
        </linearGradient>
        <linearGradient id="lngg" x1="0" y1="0" x2="0.5" y2="1">
          <stop offset="0%"   stopColor="#F2C840"/>
          <stop offset="100%" stopColor="#B07808"/>
        </linearGradient>
        <filter id="lnsf" x="-8%" y="-5%" width="120%" height="118%">
          <feDropShadow dx="2" dy="4" stdDeviation="5" floodColor="rgba(0,0,0,0.38)"/>
        </filter>
      </defs>

      {/* ── N letterform ── */}
      <g filter="url(#lnsf)">
        <rect x="22" y="8"  width="37" height="148" rx="3.5" fill="url(#lnrg)"/>
        <path d="M59,8 L92,8 L160,156 L127,156 Z"   fill="url(#lnrg)"/>
        <rect x="127" y="8" width="37" height="148" rx="3.5" fill="url(#lnrg)"/>
      </g>

      {/* Top-edge highlight for 3-D depth */}
      <rect x="22"  y="8" width="37" height="10" rx="3.5" fill="#D84060"/>
      <path d="M59,8 L92,8 L93,18 L60,18 Z"             fill="#D84060"/>
      <rect x="127" y="8" width="37" height="10" rx="3.5" fill="#D84060"/>

      {/* ── Gold circuit strip through diagonal ── */}
      <path d="M70,8 L84,8 L152,156 L138,156 Z" fill="url(#lngg)"/>

      {/* Circuit dots */}
      <circle cx="90"  cy="50"  r="5.5" fill="#F4D458"/>
      <circle cx="112" cy="94"  r="5"   fill="#E8C040"/>
      <circle cx="131" cy="130" r="5.5" fill="#F4D458"/>

      {/* Horizontal circuit traces going left */}
      <line x1="59" y1="50"  x2="84"  y2="50"  stroke="#D4A818" strokeWidth="1.8" strokeOpacity="0.75"/>
      <line x1="59" y1="94"  x2="106" y2="94"  stroke="#D4A818" strokeWidth="1.8" strokeOpacity="0.75"/>
      {/* PCB tick marks */}
      <line x1="59" y1="44"  x2="59"  y2="56"  stroke="#D4A818" strokeWidth="1.8" strokeOpacity="0.5"/>
      <line x1="72" y1="44"  x2="72"  y2="56"  stroke="#D4A818" strokeWidth="1.8" strokeOpacity="0.5"/>

      {/* ── Upward arrow swoosh ── */}
      <path d="M164,36 Q183,4 192,8" stroke="#C8960C" strokeWidth="5" fill="none" strokeLinecap="round"/>
      {/* Arrow head */}
      <path d="M185,2 L200,8 L184,17 Z" fill="#C8960C"/>

      {/* ── Dashed orbit arc ── */}
      <path d="M159,52 A 42,42 0 0,1 199,18"
        stroke="#C8960C" strokeWidth="2.5" fill="none"
        strokeLinecap="round" strokeDasharray="5 3.5"/>

      {/* ── 4-pointed sparkle ── */}
      <path d="M197,0 L199,8 L205,10 L199,12 L197,20 L195,12 L188,10 L195,8 Z" fill="#F4D458"/>
    </svg>
  );
}

function Login() {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuthStore();
  const { isDark, toggleDark } = useTheme();
  const tx = useAutoT(STRINGS);

  const [form,       setForm]       = useState({ email: '', password: '' });
  const [showPass,   setShowPass]   = useState(false);
  const [emailFocus, setEmailFocus] = useState(false);
  const [passFocus,  setPassFocus]  = useState(false);
  const [btnHover,   setBtnHover]   = useState(false);

  const c = {
    panelBg:      isDark ? 'linear-gradient(160deg,#0F0F22 0%,#0A0A18 100%)' : '#F4F6FA',
    text:         isDark ? '#F1F1F1'                 : '#111827',
    textSub:      isDark ? 'rgba(255,255,255,0.32)'  : '#6B7280',
    textLabel:    isDark ? 'rgba(255,255,255,0.42)'  : '#4B5563',
    inputBg:      isDark ? '#080818'                 : '#FFFFFF',
    inputBorder:  isDark ? 'rgba(255,255,255,0.1)'   : '#D8DCE8',
    iconCol:      isDark ? 'rgba(255,255,255,0.22)'  : '#9CA3AF',
    divider:      isDark ? 'rgba(255,255,255,0.07)'  : '#E0E5EF',
    errorBg:      isDark ? 'rgba(239,68,68,0.09)'    : '#FEF2F2',
    errorBorder:  isDark ? 'rgba(239,68,68,0.22)'    : '#FECACA',
    mutedText:    isDark ? 'rgba(255,255,255,0.2)'   : '#9CA3AF',
    toggleBg:     isDark ? 'rgba(255,255,255,0.06)'  : 'rgba(0,0,0,0.04)',
    toggleBorder: isDark ? 'rgba(255,255,255,0.1)'   : 'rgba(0,0,0,0.08)',
    toggleColor:  isDark ? 'rgba(255,255,255,0.5)'   : '#6B7280',
  };

  const handleChange = (e) => { clearError(); setForm({ ...form, [e.target.name]: e.target.value }); };
  const handleSubmit = async (e) => {
    e.preventDefault();
    try { await login(form.email, form.password); navigate('/dashboard'); } catch (_) {}
  };

  return (
    <>
      <style>{`
        @keyframes nxGlow   { 0%,100%{filter:drop-shadow(0 0 8px rgba(200,150,12,0.3))} 50%{filter:drop-shadow(0 0 22px rgba(200,150,12,0.55))} }
        @keyframes nxFadeUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes nxSlideR { from{opacity:0;transform:translateX(22px)} to{opacity:1;transform:translateX(0)} }
      `}</style>

      <div style={{ minHeight: '100vh', display: 'flex', fontFamily: 'Inter, system-ui, sans-serif' }}>

        {/* ── LEFT: brand panel (always dark) ── */}
        <div style={{
          width: '52%', minHeight: '100vh',
          background: 'radial-gradient(ellipse at 30% 20%, #191632 0%, #0C0C1C 65%, #080812 100%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '3rem 3.5rem', position: 'relative', overflow: 'hidden',
        }}>
          <NetworkCanvas />
          <div style={{ position: 'absolute', top: '5%', left: '10%', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(204,32,39,0.05) 0%,transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1, maxWidth: '28rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>

            {/* Logo */}
            <div style={{ animation: 'nxGlow 3.5s ease-in-out infinite, nxFadeUp 0.55s ease both', marginBottom: '2rem' }}>
              <NexusMark size={100} />
            </div>

            {/* Wordmark */}
            <div style={{ animation: 'nxFadeUp 0.55s 0.1s ease both', marginBottom: '1.75rem' }}>
              <h1 style={{ fontSize: '3.25rem', fontWeight: '900', color: 'white', letterSpacing: '0.18em', margin: '0 0 0.3rem', lineHeight: 1 }}>
                NE<span style={{ color: '#D4521A' }}>X</span>US
              </h1>
              <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.28)', letterSpacing: '0.22em', textTransform: 'uppercase', margin: 0 }}>
                Attijari Bank · IT Division
              </p>
            </div>

            <div style={{ width: '36px', height: '2px', backgroundColor: '#CC2027', marginBottom: '1.75rem', borderRadius: '2px', opacity: 0.8 }} />

            {/* Tagline */}
            <div style={{ animation: 'nxFadeUp 0.55s 0.18s ease both', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: '500', color: 'rgba(255,255,255,0.85)', margin: '0 0 0.6rem', lineHeight: 1.5 }}>
                {tx.tagline}
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.38)', lineHeight: 1.75, margin: 0 }}>
                {tx.subtitle}
              </p>
            </div>

            {/* Feature list */}
            <div style={{ animation: 'nxFadeUp 0.55s 0.26s ease both', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
              {FEATURES.map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'baseline', gap: '0.65rem' }}>
                  <span style={{ color: '#CC2027', fontSize: '0.55rem', flexShrink: 0, marginTop: '0.1rem' }}>●</span>
                  <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>{f}</span>
                </div>
              ))}
            </div>
          </div>

          <p style={{ position: 'absolute', bottom: '1.25rem', left: 0, right: 0, textAlign: 'center', fontSize: '0.58rem', color: 'rgba(255,255,255,0.13)', letterSpacing: '0.1em', textTransform: 'uppercase', zIndex: 1 }}>
            © {new Date().getFullYear()} Attijari Bank Tunisia
          </p>
        </div>

        {/* ── RIGHT: form panel (themed) ── */}
        <div style={{
          width: '48%', minHeight: '100vh',
          background: c.panelBg,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '2rem', position: 'relative', transition: 'background 0.25s',
        }}>
          {/* Theme toggle */}
          <button onClick={toggleDark}
            style={{
              position: 'absolute', top: '1.25rem', right: '1.25rem',
              display: 'flex', alignItems: 'center', gap: '0.38rem',
              padding: '0.38rem 0.75rem', borderRadius: '9999px',
              border: `1px solid ${c.toggleBorder}`, backgroundColor: c.toggleBg,
              color: c.toggleColor, cursor: 'pointer', fontSize: '0.72rem', fontWeight: '600',
              transition: 'all 0.2s',
            }}>
            {isDark ? <Sun size={12} /> : <Moon size={12} />}
            {isDark ? 'Light' : 'Dark'}
          </button>

          <div style={{ width: '100%', maxWidth: '21rem', animation: 'nxSlideR 0.5s 0.08s ease both' }}>

            {/* Mini brand */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '2.25rem' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '8px', backgroundColor: '#1A1A2E', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="20" viewBox="0 0 36 40" fill="none">
                  <rect x="2" y="2" width="8" height="36" rx="1.5" fill="#CC2027"/>
                  <path d="M10,2 L16,2 L34,38 L28,38 Z" fill="#CC2027"/>
                  <rect x="26" y="2" width="8" height="36" rx="1.5" fill="#CC2027"/>
                  <path d="M12.5,2 L15.5,2 L33,38 L30,38 Z" fill="#C8960C" opacity="0.92"/>
                  <circle cx="21" cy="20" r="3" fill="#F0D050"/>
                </svg>
              </div>
              <span style={{ fontSize: '0.78rem', fontWeight: '800', letterSpacing: '0.16em', color: c.textSub, transition: 'color 0.2s' }}>
                NE<span style={{ color: '#D4521A' }}>X</span>US
              </span>
            </div>

            {/* Heading */}
            <h2 style={{ fontSize: '1.8rem', fontWeight: '800', color: c.text, margin: '0 0 0.35rem', lineHeight: 1.2, transition: 'color 0.2s' }}>
              {tx.welcome}
            </h2>
            <p style={{ color: c.textSub, fontSize: '0.82rem', margin: '0 0 1.75rem', transition: 'color 0.2s' }}>
              {tx.form_sub}
            </p>

            {/* Error */}
            {error && (
              <div style={{ marginBottom: '1.25rem', padding: '0.7rem 0.9rem', backgroundColor: c.errorBg, border: `1px solid ${c.errorBorder}`, borderRadius: '0.55rem' }}>
                <span style={{ color: '#F87171', fontSize: '0.8rem' }}>⚠ {error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              {/* Email */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', color: c.textLabel, marginBottom: '0.45rem', letterSpacing: '0.08em', textTransform: 'uppercase', transition: 'color 0.2s' }}>
                  {tx.email}
                </label>
                <div style={{
                  display: 'flex', alignItems: 'center',
                  border: `1.5px solid ${emailFocus ? '#CC2027' : c.inputBorder}`,
                  borderRadius: '0.55rem', backgroundColor: c.inputBg,
                  boxShadow: emailFocus ? '0 0 0 3px rgba(204,32,39,0.09)' : 'none',
                  transition: 'border-color 0.18s, box-shadow 0.18s, background-color 0.2s',
                }}>
                  <Mail size={14} style={{ marginLeft: '0.8rem', flexShrink: 0, color: emailFocus ? '#CC2027' : c.iconCol, transition: 'color 0.18s' }} />
                  <input type="email" name="email" value={form.email} onChange={handleChange}
                    placeholder="you@attijari.com" required
                    onFocus={() => setEmailFocus(true)} onBlur={() => setEmailFocus(false)}
                    style={{ flex: 1, padding: '0.85rem 0.8rem', background: 'none', border: 'none', outline: 'none', color: c.text, fontSize: '0.875rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', color: c.textLabel, marginBottom: '0.45rem', letterSpacing: '0.08em', textTransform: 'uppercase', transition: 'color 0.2s' }}>
                  {tx.password}
                </label>
                <div style={{
                  display: 'flex', alignItems: 'center',
                  border: `1.5px solid ${passFocus ? '#CC2027' : c.inputBorder}`,
                  borderRadius: '0.55rem', backgroundColor: c.inputBg,
                  boxShadow: passFocus ? '0 0 0 3px rgba(204,32,39,0.09)' : 'none',
                  transition: 'border-color 0.18s, box-shadow 0.18s, background-color 0.2s',
                }}>
                  <Lock size={14} style={{ marginLeft: '0.8rem', flexShrink: 0, color: passFocus ? '#CC2027' : c.iconCol, transition: 'color 0.18s' }} />
                  <input type={showPass ? 'text' : 'password'} name="password" value={form.password} onChange={handleChange}
                    placeholder="••••••••" required
                    onFocus={() => setPassFocus(true)} onBlur={() => setPassFocus(false)}
                    style={{ flex: 1, padding: '0.85rem 0.7rem', background: 'none', border: 'none', outline: 'none', color: c.text, fontSize: '0.875rem', boxSizing: 'border-box' }}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.iconCol, padding: '0 0.8rem', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button type="submit" disabled={isLoading}
                onMouseEnter={() => setBtnHover(true)} onMouseLeave={() => setBtnHover(false)}
                style={{
                  width: '100%', padding: '0.9rem',
                  background: isLoading
                    ? (isDark ? 'rgba(255,255,255,0.07)' : '#E5E7EB')
                    : btnHover ? 'linear-gradient(135deg,#D91E25 0%,#F03540 100%)'
                    : 'linear-gradient(135deg,#CC2027 0%,#D91E25 100%)',
                  color: isLoading ? (isDark ? 'rgba(255,255,255,0.35)' : '#9CA3AF') : 'white',
                  fontWeight: '700', borderRadius: '0.55rem', border: 'none',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem', letterSpacing: '0.03em', marginTop: '0.25rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem',
                  boxShadow: isLoading ? 'none' : btnHover ? '0 6px 24px rgba(204,32,39,0.45)' : '0 3px 14px rgba(204,32,39,0.25)',
                  transition: 'background 0.18s, box-shadow 0.18s',
                }}>
                {isLoading ? tx.signing_in : <>{tx.sign_in} <ArrowRight size={14} /></>}
              </button>
            </form>

            <div style={{ marginTop: '1.6rem', paddingTop: '1.4rem', borderTop: `1px solid ${c.divider}`, textAlign: 'center', transition: 'border-color 0.2s' }}>
              <p style={{ fontSize: '0.82rem', color: c.textSub, margin: 0 }}>
                {tx.no_account}{' '}
                <Link to="/register" style={{ color: '#CC2027', fontWeight: '700', textDecoration: 'none' }}>{tx.request}</Link>
              </p>
            </div>

            <div style={{ marginTop: '1.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
              <Shield size={10} style={{ color: c.mutedText }} />
              <span style={{ fontSize: '0.65rem', color: c.mutedText, letterSpacing: '0.05em' }}>{tx.secured}</span>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}

export default Login;
