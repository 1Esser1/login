const ILLUSTRATIONS = {

  tasks: (
    <svg width="88" height="96" viewBox="0 0 88 96" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Clipboard body */}
      <rect x="10" y="16" width="68" height="74" rx="9" fill="#F9FAFB" stroke="#E5E7EB" strokeWidth="2"/>
      {/* Clip at top */}
      <rect x="28" y="8" width="32" height="18" rx="6" fill="white" stroke="#E5E7EB" strokeWidth="2"/>
      <rect x="34" y="12" width="20" height="8" rx="3" fill="#F3F4F6"/>
      {/* Empty content rows */}
      <rect x="20" y="40" width="14" height="5" rx="2.5" fill="#E5E7EB"/>
      <rect x="38" y="40" width="30" height="5" rx="2.5" fill="#F3F4F6"/>
      <rect x="20" y="53" width="48" height="5" rx="2.5" fill="#E5E7EB"/>
      <rect x="20" y="66" width="34" height="5" rx="2.5" fill="#F3F4F6"/>
      <rect x="20" y="79" width="22" height="5" rx="2.5" fill="#E5E7EB"/>
      {/* Red + badge — hints at the N shortcut */}
      <circle cx="70" cy="79" r="13" fill="#CC2027"/>
      <line x1="70" y1="73" x2="70" y2="85" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="64" y1="79" x2="76" y2="79" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),

  scoring: (
    <svg width="88" height="80" viewBox="0 0 88 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Three empty ranking bars */}
      <rect x="12" y="12" width="64" height="14" rx="7" fill="#F3F4F6" stroke="#E5E7EB" strokeWidth="1.5"/>
      <rect x="12" y="33" width="64" height="14" rx="7" fill="#F3F4F6" stroke="#E5E7EB" strokeWidth="1.5"/>
      <rect x="12" y="54" width="64" height="14" rx="7" fill="#F3F4F6" stroke="#E5E7EB" strokeWidth="1.5"/>
      {/* Number badges */}
      <circle cx="24" cy="19" r="7" fill="white" stroke="#E5E7EB" strokeWidth="1.5"/>
      <circle cx="24" cy="40" r="7" fill="white" stroke="#E5E7EB" strokeWidth="1.5"/>
      <circle cx="24" cy="61" r="7" fill="white" stroke="#E5E7EB" strokeWidth="1.5"/>
      {/* Sparkle top-right */}
      <line x1="78" y1="4"  x2="78" y2="12" stroke="#CC2027" strokeWidth="2"   strokeLinecap="round" opacity="0.35"/>
      <line x1="74" y1="8"  x2="82" y2="8"  stroke="#CC2027" strokeWidth="2"   strokeLinecap="round" opacity="0.35"/>
      <line x1="82" y1="14" x2="86" y2="14" stroke="#CC2027" strokeWidth="1.5" strokeLinecap="round" opacity="0.2"/>
      <line x1="84" y1="12" x2="84" y2="16" stroke="#CC2027" strokeWidth="1.5" strokeLinecap="round" opacity="0.2"/>
    </svg>
  ),

  workplace: (
    <svg width="88" height="80" viewBox="0 0 88 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Briefcase body */}
      <rect x="8" y="28" width="72" height="46" rx="9" fill="#F9FAFB" stroke="#E5E7EB" strokeWidth="2"/>
      {/* Handle */}
      <path d="M30 28V20a10 10 0 0 1 10-10h8a10 10 0 0 1 10 10v8" stroke="#E5E7EB" strokeWidth="2" fill="none" strokeLinecap="round"/>
      {/* Horizontal strap */}
      <line x1="8" y1="51" x2="80" y2="51" stroke="#E5E7EB" strokeWidth="1.5"/>
      {/* Clasp */}
      <rect x="36" y="44" width="16" height="14" rx="4" fill="white" stroke="#E5E7EB" strokeWidth="1.5"/>
      {/* Sparkle inside — "generate something" hint */}
      <circle cx="44" cy="65" r="5" fill="#CC2027" opacity="0.12"/>
      <line x1="44" y1="60" x2="44" y2="70" stroke="#CC2027" strokeWidth="2" strokeLinecap="round" opacity="0.45"/>
      <line x1="39" y1="65" x2="49" y2="65" stroke="#CC2027" strokeWidth="2" strokeLinecap="round" opacity="0.45"/>
    </svg>
  ),

  compare: (
    <svg width="96" height="72" viewBox="0 0 96 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Left card */}
      <rect x="4"  y="10" width="36" height="52" rx="7" fill="#F9FAFB" stroke="#E5E7EB" strokeWidth="2"/>
      <rect x="12" y="22" width="20" height="5"  rx="2.5" fill="#E5E7EB"/>
      <rect x="12" y="34" width="14" height="4"  rx="2" fill="#F3F4F6"/>
      <rect x="12" y="44" width="18" height="4"  rx="2" fill="#F3F4F6"/>
      {/* Right card */}
      <rect x="56" y="10" width="36" height="52" rx="7" fill="#F9FAFB" stroke="#E5E7EB" strokeWidth="2"/>
      <rect x="64" y="22" width="20" height="5"  rx="2.5" fill="#E5E7EB"/>
      <rect x="64" y="34" width="16" height="4"  rx="2" fill="#F3F4F6"/>
      <rect x="64" y="44" width="12" height="4"  rx="2" fill="#F3F4F6"/>
      {/* VS badge in gap */}
      <circle cx="48" cy="36" r="10" fill="#1A1A2E" opacity="0.06"/>
      <text x="48" y="40" textAnchor="middle" fontSize="9" fill="#9CA3AF" fontFamily="system-ui,sans-serif" fontWeight="700">VS</text>
    </svg>
  ),

  dependency: (
    <svg width="96" height="56" viewBox="0 0 96 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Left task node */}
      <rect x="2"  y="14" width="34" height="28" rx="6" fill="#F9FAFB" stroke="#E5E7EB" strokeWidth="2"/>
      <rect x="9"  y="22" width="20" height="4" rx="2" fill="#E5E7EB"/>
      <rect x="9"  y="31" width="14" height="3" rx="1.5" fill="#F3F4F6"/>
      {/* Right task node */}
      <rect x="60" y="14" width="34" height="28" rx="6" fill="#F9FAFB" stroke="#E5E7EB" strokeWidth="2"/>
      <rect x="67" y="22" width="20" height="4" rx="2" fill="#E5E7EB"/>
      <rect x="67" y="31" width="14" height="3" rx="1.5" fill="#F3F4F6"/>
      {/* Dashed connector with gap */}
      <line x1="36" y1="28" x2="46" y2="28" stroke="#E5E7EB" strokeWidth="2" strokeDasharray="4,3" strokeLinecap="round"/>
      <line x1="50" y1="28" x2="60" y2="28" stroke="#E5E7EB" strokeWidth="2" strokeDasharray="4,3" strokeLinecap="round"/>
      {/* Link icon in gap */}
      <circle cx="48" cy="28" r="7" fill="white" stroke="#E5E7EB" strokeWidth="1.5"/>
      <text x="48" y="32" textAnchor="middle" fontSize="9" fill="#D1D5DB" fontFamily="system-ui,sans-serif">+</text>
    </svg>
  ),

  search: (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Magnifying glass circle */}
      <circle cx="34" cy="34" r="22" fill="#F9FAFB" stroke="#E5E7EB" strokeWidth="2.5"/>
      {/* Inner content stubs */}
      <rect x="22" y="28" width="24" height="4" rx="2" fill="#E5E7EB"/>
      <rect x="22" y="38" width="16" height="3" rx="1.5" fill="#F3F4F6"/>
      {/* Handle */}
      <line x1="50" y1="50" x2="68" y2="68" stroke="#E5E7EB" strokeWidth="5" strokeLinecap="round"/>
    </svg>
  ),
};

export default function EmptyState({ variant = 'tasks', title, subtitle, action, compact = false }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      textAlign: 'center',
      padding: compact ? '2rem 1rem' : '3rem 2rem',
    }}>
      <div style={{ marginBottom: '1.1rem', opacity: 0.9 }}>
        {ILLUSTRATIONS[variant]}
      </div>
      {title && (
        <p style={{
          fontSize: compact ? '0.825rem' : '0.9rem',
          fontWeight: '600', color: '#374151',
          marginBottom: subtitle ? '0.3rem' : 0,
        }}>
          {title}
        </p>
      )}
      {subtitle && (
        <p style={{
          fontSize: compact ? '0.75rem' : '0.8rem',
          color: '#9CA3AF', maxWidth: '280px', lineHeight: '1.5',
        }}>
          {subtitle}
        </p>
      )}
      {action && <div style={{ marginTop: '1.25rem' }}>{action}</div>}
    </div>
  );
}
