import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Upload, User, Mail, Lock, Briefcase, CheckCircle, Shield, Sun, Moon, ArrowRight } from 'lucide-react';
import authService from '../services/authService';
import { useAutoT } from '../i18n/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

const getStrength = (pw) => {
  if (!pw) return { label: '', color: '', score: 0 };
  let s = 0;
  if (pw.length >= 8)  s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[!@#$%^&*()_+\-=[\]{}|;':",./<>?]/.test(pw)) s++;
  if (s <= 2) return { label: 'Weak',   color: '#EF4444', score: s };
  if (s <= 3) return { label: 'Medium', color: '#F59E0B', score: s };
  return             { label: 'Strong', color: '#10B981', score: s };
};

const ROLES = [
  { value: 'DEVELOPER',    label: 'IT Developer'          },
  { value: 'PRODUCT_TEAM', label: 'Product / Mobile Team' },
  { value: 'IT_MANAGER',   label: 'IT Manager'            },
];

const FEATURES = [
  'Smart task prioritization — Kano, MoSCoW & RICE',
  'Sprint planning & backlog management',
  'DORA metrics, SLA tracking & workload visibility',
  'JIRA integration & full audit trail',
];

const STRINGS = {
  join_title:   'Join your team on NEXUS.',
  join_sub:     'Submit your details and an admin will activate your account — usually within a day.',
  create:       'Create your account',
  all_required: 'All fields marked * are required',
  photo_label:  'Profile photo',
  photo_hint:   'Optional · JPG or PNG · Max 5MB',
  upload:       'Upload photo',
  change:       'Change',
  full_name:    'Full name *',
  email:        'Email *',
  role:         'Role *',
  select_role:  'Select your role',
  password:     'Password *',
  pw_min:       'Min. 8 characters',
  confirm_pw:   'Confirm password *',
  repeat_pw:    'Repeat password',
  pw_mismatch:  'Passwords do not match',
  submitting:   'Submitting…',
  request:      'Request access',
  have_account: 'Already have an account?',
  sign_in:      'Sign in',
  secured:      'Secured · Attijari IT Division',
};

function NetworkCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);
    const ctx = canvas.getContext('2d');
    const nodes = Array.from({ length: 18 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.26, vy: (Math.random() - 0.5) * 0.26,
      r: Math.random() * 1.5 + 0.8,
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
          if (d < 110) {
            ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(204,32,39,${(1 - d / 110) * 0.13})`; ctx.lineWidth = 0.6; ctx.stroke();
          }
        }
      }
      nodes.forEach(n => { ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.11)'; ctx.fill(); });
      raf = requestAnimationFrame(tick);
    }
    tick();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />;
}

/* ── NEXUS full mark — N with circuit trace, arrow & sparkle ── */
function NexusMark({ size = 80 }) {
  const h = Math.round(size * 168 / 205);
  return (
    <svg width={size} height={h} viewBox="0 0 205 168" fill="none">
      <defs>
        <linearGradient id="rnrg" x1="0.15" y1="0" x2="0.3" y2="1">
          <stop offset="0%"   stopColor="#CC2027"/>
          <stop offset="55%"  stopColor="#A01825"/>
          <stop offset="100%" stopColor="#720F18"/>
        </linearGradient>
        <linearGradient id="rngg" x1="0" y1="0" x2="0.5" y2="1">
          <stop offset="0%"   stopColor="#F2C840"/>
          <stop offset="100%" stopColor="#B07808"/>
        </linearGradient>
        <filter id="rnsf" x="-8%" y="-5%" width="120%" height="118%">
          <feDropShadow dx="2" dy="4" stdDeviation="5" floodColor="rgba(0,0,0,0.38)"/>
        </filter>
      </defs>
      <g filter="url(#rnsf)">
        <rect x="22"  y="8" width="37" height="148" rx="3.5" fill="url(#rnrg)"/>
        <path d="M59,8 L92,8 L160,156 L127,156 Z"            fill="url(#rnrg)"/>
        <rect x="127" y="8" width="37" height="148" rx="3.5" fill="url(#rnrg)"/>
      </g>
      <rect x="22"  y="8" width="37" height="10" rx="3.5" fill="#D84060"/>
      <path d="M59,8 L92,8 L93,18 L60,18 Z"                 fill="#D84060"/>
      <rect x="127" y="8" width="37" height="10" rx="3.5" fill="#D84060"/>
      <path d="M70,8 L84,8 L152,156 L138,156 Z" fill="url(#rngg)"/>
      <circle cx="90"  cy="50"  r="5.5" fill="#F4D458"/>
      <circle cx="112" cy="94"  r="5"   fill="#E8C040"/>
      <circle cx="131" cy="130" r="5.5" fill="#F4D458"/>
      <line x1="59" y1="50"  x2="84"  y2="50"  stroke="#D4A818" strokeWidth="1.8" strokeOpacity="0.75"/>
      <line x1="59" y1="94"  x2="106" y2="94"  stroke="#D4A818" strokeWidth="1.8" strokeOpacity="0.75"/>
      <line x1="59" y1="44"  x2="59"  y2="56"  stroke="#D4A818" strokeWidth="1.8" strokeOpacity="0.5"/>
      <line x1="72" y1="44"  x2="72"  y2="56"  stroke="#D4A818" strokeWidth="1.8" strokeOpacity="0.5"/>
      <path d="M164,36 Q183,4 192,8"  stroke="#C8960C" strokeWidth="5" fill="none" strokeLinecap="round"/>
      <path d="M185,2 L200,8 L184,17 Z" fill="#C8960C"/>
      <path d="M159,52 A 42,42 0 0,1 199,18"
        stroke="#C8960C" strokeWidth="2.5" fill="none"
        strokeLinecap="round" strokeDasharray="5 3.5"/>
      <path d="M197,0 L199,8 L205,10 L199,12 L197,20 L195,12 L188,10 L195,8 Z" fill="#F4D458"/>
    </svg>
  );
}

function Register() {
  const navigate = useNavigate();
  const { isDark, toggleDark } = useTheme();
  const tx = useAutoT(STRINGS);

  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', role: '' });
  const [photo,        setPhoto]        = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isLoading,    setIsLoading]    = useState(false);
  const [error,        setError]        = useState('');
  const [showPass,     setShowPass]     = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);

  const [fName,    setFName]    = useState(false);
  const [fEmail,   setFEmail]   = useState(false);
  const [fRole,    setFRole]    = useState(false);
  const [fPass,    setFPass]    = useState(false);
  const [fConfirm, setFConfirm] = useState(false);
  const [btnHover, setBtnHover] = useState(false);

  const strength   = getStrength(form.password);
  const pwMismatch = form.confirmPassword && form.password !== form.confirmPassword;

  const c = {
    panelBg:         isDark ? 'linear-gradient(160deg,#0F0F22 0%,#0A0A18 100%)' : '#F4F6FA',
    text:            isDark ? '#F1F1F1'                  : '#111827',
    textSub:         isDark ? 'rgba(255,255,255,0.32)'   : '#6B7280',
    textLabel:       isDark ? 'rgba(255,255,255,0.42)'   : '#4B5563',
    inputBg:         isDark ? '#080818'                  : '#FFFFFF',
    inputBorder:     isDark ? 'rgba(255,255,255,0.1)'    : '#D8DCE8',
    iconCol:         isDark ? 'rgba(255,255,255,0.22)'   : '#9CA3AF',
    divider:         isDark ? 'rgba(255,255,255,0.07)'   : '#E0E5EF',
    photoAreaBg:     isDark ? 'rgba(255,255,255,0.025)'  : '#F8FAFF',
    photoAreaBorder: isDark ? 'rgba(255,255,255,0.09)'   : '#C8D2E8',
    avatarBg:        isDark ? 'rgba(255,255,255,0.06)'   : '#EEF2FA',
    avatarBorder:    isDark ? 'rgba(255,255,255,0.1)'    : '#D0D8EE',
    uploadBtnBg:     isDark ? 'rgba(255,255,255,0.06)'   : '#FFFFFF',
    uploadBtnBorder: isDark ? 'rgba(255,255,255,0.1)'    : '#D0D8EE',
    uploadBtnText:   isDark ? 'rgba(255,255,255,0.55)'   : '#374151',
    strengthEmpty:   isDark ? 'rgba(255,255,255,0.09)'   : '#E2E8F4',
    hintBg:          isDark ? 'rgba(255,255,255,0.04)'   : '#F4F6FB',
    hintBorder:      isDark ? 'rgba(255,255,255,0.08)'   : '#D8DCE8',
    hintText:        isDark ? 'rgba(255,255,255,0.32)'   : '#6B7280',
    mutedText:       isDark ? 'rgba(255,255,255,0.2)'    : '#9CA3AF',
    toggleBg:        isDark ? 'rgba(255,255,255,0.06)'   : 'rgba(0,0,0,0.04)',
    toggleBorder:    isDark ? 'rgba(255,255,255,0.1)'    : 'rgba(0,0,0,0.08)',
    toggleColor:     isDark ? 'rgba(255,255,255,0.5)'    : '#6B7280',
    errorBg:         isDark ? 'rgba(239,68,68,0.09)'     : '#FEF2F2',
    errorBorder:     isDark ? 'rgba(239,68,68,0.22)'     : '#FECACA',
  };

  const inputWrap = (focused, hasError) => ({
    display: 'flex', alignItems: 'center',
    border: `1.5px solid ${hasError ? '#EF4444' : focused ? '#CC2027' : c.inputBorder}`,
    borderRadius: '0.55rem', backgroundColor: c.inputBg,
    boxShadow: hasError ? '0 0 0 3px rgba(239,68,68,0.08)' : focused ? '0 0 0 3px rgba(204,32,39,0.08)' : 'none',
    transition: 'border-color 0.18s, box-shadow 0.18s, background-color 0.2s',
  });
  const baseInput = { flex: 1, padding: '0.82rem 0.75rem', background: 'none', border: 'none', outline: 'none', fontSize: '0.875rem', boxSizing: 'border-box' };
  const labelSt   = { display: 'block', fontSize: '0.7rem', fontWeight: '600', color: c.textLabel, marginBottom: '0.42rem', textTransform: 'uppercase', letterSpacing: '0.08em', transition: 'color 0.2s' };

  const handleChange = (e) => { setError(''); setForm({ ...form, [e.target.name]: e.target.value }); };

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024)    { setError('Image must be less than 5MB');  return; }
    setPhoto(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 8)              { setError('Password must be at least 8 characters'); return; }
    if (form.password !== form.confirmPassword) { setError(tx.pw_mismatch); return; }
    if (!form.role)                             { setError('Please select your role'); return; }
    setIsLoading(true);
    try {
      await authService.register({ name: form.name, email: form.email, password: form.password, role: form.role }, photo);
      navigate(`/verify-email?email=${encodeURIComponent(form.email)}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes rxGlow   { 0%,100%{filter:drop-shadow(0 0 7px rgba(200,150,12,0.28))} 50%{filter:drop-shadow(0 0 18px rgba(200,150,12,0.52))} }
        @keyframes rxSlideL { from{opacity:0;transform:translateX(-18px)} to{opacity:1;transform:translateX(0)} }
        @keyframes rxSlideR { from{opacity:0;transform:translateX(22px)}  to{opacity:1;transform:translateX(0)} }
      `}</style>

      <div style={{ minHeight: '100vh', display: 'flex', fontFamily: 'Inter, system-ui, sans-serif' }}>

        {/* ── LEFT: brand panel (always dark) ── */}
        <div style={{
          width: '34%', minHeight: '100vh',
          background: 'radial-gradient(ellipse at 30% 25%, #191632 0%, #0C0C1C 65%, #080812 100%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '2.5rem 2rem', position: 'relative', overflow: 'hidden',
        }}>
          <NetworkCanvas />
          <div style={{ position: 'absolute', top: '8%', left: '8%', width: '240px', height: '240px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(204,32,39,0.05) 0%,transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1, maxWidth: '20rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', animation: 'rxSlideL 0.5s ease both' }}>

            <div style={{ animation: 'rxGlow 3.5s ease-in-out infinite', marginBottom: '1.5rem' }}>
              <NexusMark size={80} />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h1 style={{ fontSize: '2.5rem', fontWeight: '900', color: 'white', letterSpacing: '0.18em', margin: '0 0 0.25rem', lineHeight: 1 }}>
                NE<span style={{ color: '#D4521A' }}>X</span>US
              </h1>
              <p style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.2em', textTransform: 'uppercase', margin: 0 }}>
                Attijari Bank · IT Division
              </p>
            </div>

            <div style={{ width: '32px', height: '2px', backgroundColor: '#CC2027', marginBottom: '1.5rem', borderRadius: '2px', opacity: 0.8 }} />

            <h2 style={{ fontSize: '1rem', fontWeight: '600', color: 'rgba(255,255,255,0.82)', margin: '0 0 0.5rem', lineHeight: 1.5 }}>
              {tx.join_title}
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.75, margin: '0 0 1.75rem' }}>
              {tx.join_sub}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {FEATURES.map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem' }}>
                  <span style={{ color: '#CC2027', fontSize: '0.5rem', flexShrink: 0 }}>●</span>
                  <span style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.42)', lineHeight: 1.5 }}>{f}</span>
                </div>
              ))}
            </div>
          </div>

          <p style={{ position: 'absolute', bottom: '1.25rem', left: 0, right: 0, textAlign: 'center', fontSize: '0.56rem', color: 'rgba(255,255,255,0.13)', letterSpacing: '0.1em', textTransform: 'uppercase', zIndex: 1 }}>
            © {new Date().getFullYear()} Attijari Bank Tunisia
          </p>
        </div>

        {/* ── RIGHT: form panel (themed) ── */}
        <div style={{
          width: '66%', minHeight: '100vh',
          background: c.panelBg,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '2rem', overflowY: 'auto', position: 'relative', transition: 'background 0.25s',
        }}>
          <div style={{ position: 'absolute', top: 0, right: 0, width: '200px', height: '200px', background: isDark ? 'radial-gradient(circle at top right,rgba(204,32,39,0.04),transparent 70%)' : 'radial-gradient(circle at top right,rgba(204,32,39,0.03),transparent 70%)', pointerEvents: 'none' }} />

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

          <div style={{ width: '100%', maxWidth: '34rem', paddingTop: '4rem', paddingBottom: '2rem', animation: 'rxSlideR 0.5s ease both' }}>

            {/* Mini brand */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '1.75rem' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '7px', backgroundColor: '#1A1A2E', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="18" viewBox="0 0 36 40" fill="none">
                  <rect x="2" y="2" width="8" height="36" rx="1.5" fill="#CC2027"/>
                  <path d="M10,2 L16,2 L34,38 L28,38 Z" fill="#CC2027"/>
                  <rect x="26" y="2" width="8" height="36" rx="1.5" fill="#CC2027"/>
                  <path d="M12.5,2 L15.5,2 L33,38 L30,38 Z" fill="#C8960C" opacity="0.92"/>
                  <circle cx="21" cy="20" r="3" fill="#F0D050"/>
                </svg>
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: '800', letterSpacing: '0.16em', color: c.textSub }}>
                NE<span style={{ color: '#D4521A' }}>X</span>US
              </span>
            </div>

            {/* Heading */}
            <h2 style={{ fontSize: '1.7rem', fontWeight: '800', color: c.text, margin: '0 0 0.3rem', lineHeight: 1.2, transition: 'color 0.2s' }}>{tx.create}</h2>
            <p style={{ color: c.textSub, fontSize: '0.8rem', margin: '0 0 1.6rem', transition: 'color 0.2s' }}>{tx.all_required}</p>

            {/* Error */}
            {error && (
              <div style={{ marginBottom: '1.1rem', padding: '0.7rem 0.9rem', backgroundColor: c.errorBg, border: `1px solid ${c.errorBorder}`, borderRadius: '0.55rem' }}>
                <span style={{ color: '#F87171', fontSize: '0.8rem' }}>⚠ {error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              {/* Photo */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                padding: '0.85rem 1rem',
                backgroundColor: c.photoAreaBg,
                border: `1.5px dashed ${c.photoAreaBorder}`,
                borderRadius: '0.65rem',
                transition: 'background-color 0.2s',
              }}>
                <div onClick={() => document.getElementById('photo-input').click()}
                  style={{
                    width: '54px', height: '54px', borderRadius: '50%',
                    backgroundColor: c.avatarBg, border: `2px solid ${c.avatarBorder}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden', flexShrink: 0, cursor: 'pointer',
                  }}>
                  {photoPreview
                    ? <img src={photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <User size={20} style={{ color: c.iconCol }} />
                  }
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.8rem', fontWeight: '600', color: c.text, margin: '0 0 0.18rem', transition: 'color 0.2s' }}>{tx.photo_label}</p>
                  <p style={{ fontSize: '0.7rem', color: c.textSub, margin: '0 0 0.45rem' }}>{tx.photo_hint}</p>
                  <button type="button" onClick={() => document.getElementById('photo-input').click()}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                      padding: '0.3rem 0.65rem',
                      backgroundColor: c.uploadBtnBg, border: `1px solid ${c.uploadBtnBorder}`,
                      borderRadius: '0.4rem', fontSize: '0.72rem', cursor: 'pointer',
                      color: c.uploadBtnText, fontWeight: '500',
                    }}>
                    <Upload size={10} />{photo ? tx.change : tx.upload}
                  </button>
                  <input id="photo-input" type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} />
                </div>
              </div>

              {/* Name + Email */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <div>
                  <label style={labelSt}>{tx.full_name}</label>
                  <div style={inputWrap(fName, false)}>
                    <User size={13} style={{ marginLeft: '0.75rem', flexShrink: 0, color: fName ? '#CC2027' : c.iconCol, transition: 'color 0.18s' }} />
                    <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="Your name" required
                      onFocus={() => setFName(true)} onBlur={() => setFName(false)}
                      style={{ ...baseInput, color: c.text }} />
                  </div>
                </div>
                <div>
                  <label style={labelSt}>{tx.email}</label>
                  <div style={inputWrap(fEmail, false)}>
                    <Mail size={13} style={{ marginLeft: '0.75rem', flexShrink: 0, color: fEmail ? '#CC2027' : c.iconCol, transition: 'color 0.18s' }} />
                    <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="you@attijari.com" required
                      onFocus={() => setFEmail(true)} onBlur={() => setFEmail(false)}
                      style={{ ...baseInput, color: c.text }} />
                  </div>
                </div>
              </div>

              {/* Role */}
              <div>
                <label style={labelSt}>{tx.role}</label>
                <div style={inputWrap(fRole, false)}>
                  <Briefcase size={13} style={{ marginLeft: '0.75rem', flexShrink: 0, color: fRole ? '#CC2027' : c.iconCol, transition: 'color 0.18s' }} />
                  <select name="role" value={form.role} onChange={handleChange} required
                    onFocus={() => setFRole(true)} onBlur={() => setFRole(false)}
                    style={{ ...baseInput, color: form.role ? c.text : c.iconCol, appearance: 'none', cursor: 'pointer', colorScheme: isDark ? 'dark' : 'light', paddingRight: '0.75rem' }}>
                    <option value="">{tx.select_role}</option>
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Password */}
              <div>
                <label style={labelSt}>{tx.password}</label>
                <div style={inputWrap(fPass, false)}>
                  <Lock size={13} style={{ marginLeft: '0.75rem', flexShrink: 0, color: fPass ? '#CC2027' : c.iconCol, transition: 'color 0.18s' }} />
                  <input type={showPass ? 'text' : 'password'} name="password" value={form.password} onChange={handleChange} placeholder={tx.pw_min} required
                    onFocus={() => setFPass(true)} onBlur={() => setFPass(false)}
                    style={{ ...baseInput, color: c.text }} />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.iconCol, padding: '0 0.75rem', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
                {form.password && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '3px', marginBottom: '0.3rem' }}>
                      {[1,2,3,4,5].map(i => (
                        <div key={i} style={{ flex: 1, height: '3px', borderRadius: '2px', backgroundColor: i <= strength.score ? strength.color : c.strengthEmpty, transition: 'background-color 0.2s' }} />
                      ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.68rem', color: strength.color, fontWeight: '700' }}>{strength.label}</span>
                      <div style={{ display: 'flex', gap: '0.3rem' }}>
                        {[
                          { ok: /[A-Z]/.test(form.password), label: 'A–Z' },
                          { ok: /[0-9]/.test(form.password), label: '0–9' },
                          { ok: /[!@#$%^&*]/.test(form.password), label: '#!' },
                        ].map(h => (
                          <span key={h.label} style={{
                            fontSize: '0.62rem', padding: '0.08rem 0.32rem', borderRadius: '4px',
                            backgroundColor: h.ok ? (isDark ? 'rgba(16,185,129,0.12)' : '#ECFDF5') : c.hintBg,
                            color: h.ok ? '#10B981' : c.hintText,
                            border: `1px solid ${h.ok ? (isDark ? 'rgba(16,185,129,0.25)' : '#A7F3D0') : c.hintBorder}`,
                          }}>
                            {h.ok ? '✓' : '·'} {h.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm */}
              <div>
                <label style={labelSt}>{tx.confirm_pw}</label>
                <div style={inputWrap(fConfirm, pwMismatch)}>
                  <Lock size={13} style={{ marginLeft: '0.75rem', flexShrink: 0, color: pwMismatch ? '#EF4444' : fConfirm ? '#CC2027' : c.iconCol, transition: 'color 0.18s' }} />
                  <input type={showConfirm ? 'text' : 'password'} name="confirmPassword" value={form.confirmPassword} onChange={handleChange} placeholder={tx.repeat_pw} required
                    onFocus={() => setFConfirm(true)} onBlur={() => setFConfirm(false)}
                    style={{ ...baseInput, color: c.text }} />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.iconCol, padding: '0 0.75rem', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    {showConfirm ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
                {pwMismatch && (
                  <p style={{ fontSize: '0.7rem', color: '#EF4444', marginTop: '0.3rem' }}>⚠ {tx.pw_mismatch}</p>
                )}
                {form.confirmPassword && !pwMismatch && (
                  <p style={{ fontSize: '0.7rem', color: '#10B981', marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <CheckCircle size={11} /> Passwords match
                  </p>
                )}
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
                {isLoading ? tx.submitting : <>{tx.request} <ArrowRight size={14} /></>}
              </button>
            </form>

            <div style={{ marginTop: '1.5rem', paddingTop: '1.4rem', borderTop: `1px solid ${c.divider}`, textAlign: 'center', transition: 'border-color 0.2s' }}>
              <p style={{ fontSize: '0.82rem', color: c.textSub, margin: 0 }}>
                {tx.have_account}{' '}
                <Link to="/login" style={{ color: '#CC2027', fontWeight: '700', textDecoration: 'none' }}>{tx.sign_in}</Link>
              </p>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
              <Shield size={10} style={{ color: c.mutedText }} />
              <span style={{ fontSize: '0.65rem', color: c.mutedText, letterSpacing: '0.05em' }}>{tx.secured}</span>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}

export default Register;
