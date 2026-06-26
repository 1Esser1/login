import { useState, useEffect, useRef } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, ListOrdered,
  Brain, FileBarChart, Settings, LogOut, ShieldCheck, Scale,
  BriefcaseBusiness, ClipboardCheck, Link2, Activity, Kanban, Users, Timer, GitMerge,
  Moon, Sun, PanelLeft, PanelTop, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  User, Keyboard, ListChecks,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { useLanguage } from '../../i18n/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLayout } from '../../contexts/LayoutContext';
import SkeletonText from '../ui/SkeletonText';

/* ── NEXUS brand icon — stylised N mark (maroon → gold) ── */
function NexusIconSVG({ size = 36 }) {
  const h = Math.round(size * 40 / 36);
  return (
    <svg width={size} height={h} viewBox="0 0 36 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="nxig" x1="0.1" y1="0" x2="0.3" y2="1">
          <stop offset="0%"   stopColor="#D92535"/>
          <stop offset="100%" stopColor="#8B1520"/>
        </linearGradient>
      </defs>
      {/* N — left bar */}
      <rect x="2" y="2" width="8" height="36" rx="1.5" fill="url(#nxig)"/>
      {/* N — diagonal cross-stroke */}
      <path d="M10,2 L16,2 L34,38 L28,38 Z" fill="url(#nxig)"/>
      {/* N — right bar */}
      <rect x="26" y="2" width="8" height="36" rx="1.5" fill="url(#nxig)"/>
      {/* Gold circuit strip */}
      <path d="M12.5,2 L15.5,2 L33,38 L30,38 Z" fill="#C8960C" opacity="0.92"/>
      {/* Circuit dot */}
      <circle cx="21" cy="20" r="3" fill="#F0D050"/>
    </svg>
  );
}

const NAV_ITEMS = [
  { path: '/dashboard',      icon: LayoutDashboard,  labelKey: 'nav_dashboard'      },
  { path: '/tasks',          icon: ClipboardList,     labelKey: 'nav_tasks'          },
  { path: '/backlog',        icon: ListOrdered,       labelKey: 'nav_backlog'        },
  { path: '/scoring',        icon: Brain,             labelKey: 'nav_scoring'        },
  { path: '/compare',        icon: Scale,             labelKey: 'nav_compare'        },
  { path: '/workplace',      icon: BriefcaseBusiness, labelKey: 'nav_workplace'      },
  { path: '/task-relations', icon: GitMerge,          labelKey: 'nav_task_relations' },
  { path: '/sprint',         icon: Kanban,            labelKey: 'nav_sprint'         },
  { path: '/sla',            icon: Timer,             labelKey: 'nav_sla'            },
  { path: '/teams',          icon: Users,             labelKey: 'nav_teams'          },
  { path: '/reports',        icon: FileBarChart,      labelKey: 'nav_reports'        },
  { path: '/dora',           icon: Activity,          labelKey: 'nav_dora'           },
  { path: '/jira',           icon: Link2,             labelKey: 'nav_jira'           },
  { path: '/settings',       icon: Settings,          labelKey: 'nav_settings'       },
];

const MGMT_ITEMS = [
  { path: '/workload', icon: Users,         labelKey: 'nav_workload' },
  { path: '/cab',      icon: ListChecks,    labelKey: 'nav_cab'      },
  { path: '/audit',    icon: ClipboardCheck, labelKey: 'nav_audit'  },
];

const ADMIN_ITEMS = [
  { path: '/admin', icon: ShieldCheck, labelKey: 'nav_admin' },
];

const ROLE_COLORS = {
  ADMIN:        { bg: '#FEF2F2', color: '#DC2626' },
  IT_MANAGER:   { bg: '#F5F3FF', color: '#7C3AED' },
  PRODUCT_TEAM: { bg: '#FFF7ED', color: '#D97706' },
  DEVELOPER:    { bg: '#EFF6FF', color: '#2563EB' },
};

/* ─────────────────────── UserMenu dropdown ─────────────────────── */
function UserMenu({ user, isDark, toggleDark, logout, onClose, pos }) {
  const { theme } = useTheme();
  const navigate  = useNavigate();
  const ref       = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    // delay so the opening click doesn't immediately close it
    const t = setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handler); };
  }, [onClose]);

  const roleMeta = ROLE_COLORS[user?.role] || ROLE_COLORS.DEVELOPER;

  const go = (path) => { navigate(path); onClose(); };

  const MenuItem = ({ icon: Icon, label, sub, onClick, red }) => (
    <button
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: '0.65rem',
        padding: '0.5rem 0.75rem', borderRadius: '0.45rem',
        border: 'none', backgroundColor: 'transparent',
        color: red ? '#EF4444' : theme.textMed,
        cursor: 'pointer', fontSize: '0.82rem', fontWeight: '500', textAlign: 'left',
        transition: 'background-color 0.12s',
      }}
      onMouseEnter={e => e.currentTarget.style.backgroundColor = red ? 'rgba(239,68,68,0.08)' : theme.hoverBg}
      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
    >
      <Icon size={15} style={{ color: red ? '#EF4444' : theme.textSub, flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{label}</span>
      {sub && (
        <kbd style={{
          fontSize: '0.65rem', color: theme.textMuted,
          backgroundColor: theme.tagBg, border: `1px solid ${theme.borderMed}`,
          borderRadius: '4px', padding: '0.05rem 0.35rem', flexShrink: 0,
        }}>{sub}</kbd>
      )}
    </button>
  );

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: pos.top, right: pos.right,
        width: '248px',
        backgroundColor: theme.cardBg,
        border: `1px solid ${theme.border}`,
        borderRadius: '0.75rem',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.1)',
        zIndex: 1000,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '1rem',
        borderBottom: `1px solid ${theme.border}`,
        display: 'flex', alignItems: 'center', gap: '0.75rem',
      }}>
        <div style={{
          width: '42px', height: '42px', borderRadius: '50%',
          backgroundColor: '#CC2027', overflow: 'hidden', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 0 2.5px rgba(204,32,39,0.35)',
        }}>
          {user?.photoPath
            ? <img src={`http://localhost:8080/${user.photoPath}`} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ color: 'white', fontSize: '1.05rem', fontWeight: '700' }}>{user?.name?.charAt(0)?.toUpperCase()}</span>
          }
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.15rem' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: '700', color: theme.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name}
            </p>
            {user?.emailVerified && <span style={{ color: '#3B82F6', fontSize: '0.68rem', flexShrink: 0 }}>✓</span>}
          </div>
          <p style={{ fontSize: '0.7rem', color: theme.textSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '0.3rem' }}>
            {user?.email}
          </p>
          <span style={{
            display: 'inline-block',
            fontSize: '0.62rem', fontWeight: '600',
            backgroundColor: roleMeta.bg, color: roleMeta.color,
            padding: '0.1rem 0.45rem', borderRadius: '9999px',
          }}>
            {user?.role?.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* Navigation items */}
      <div style={{ padding: '0.4rem' }}>
        <MenuItem icon={User}     label="My Profile"          onClick={() => go('/settings')} />
        <MenuItem icon={Settings} label="Settings"            onClick={() => go('/settings')} />
        <MenuItem icon={Keyboard} label="Command palette"     onClick={() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })); onClose(); }} sub="Ctrl K" />
      </div>

      {/* Dark mode toggle */}
      <div style={{ padding: '0.4rem', borderTop: `1px solid ${theme.border}` }}>
        <button
          onClick={toggleDark}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: '0.65rem',
            padding: '0.5rem 0.75rem', borderRadius: '0.45rem',
            border: 'none', backgroundColor: 'transparent',
            color: theme.textMed, cursor: 'pointer', fontSize: '0.82rem', fontWeight: '500',
            transition: 'background-color 0.12s',
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = theme.hoverBg}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          {isDark ? <Sun size={15} style={{ color: theme.textSub }} /> : <Moon size={15} style={{ color: theme.textSub }} />}
          <span style={{ flex: 1 }}>{isDark ? 'Light mode' : 'Dark mode'}</span>
          <div style={{
            width: '30px', height: '16px', borderRadius: '8px', flexShrink: 0,
            backgroundColor: isDark ? '#CC2027' : theme.borderMed,
            position: 'relative',
          }}>
            <div style={{
              width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'white',
              position: 'absolute', top: '2px',
              left: isDark ? '16px' : '2px', transition: 'left 0.2s',
            }} />
          </div>
        </button>
      </div>

      {/* Logout */}
      <div style={{ padding: '0.4rem', borderTop: `1px solid ${theme.border}` }}>
        <MenuItem icon={LogOut} label="Sign out" onClick={() => { logout(); onClose(); }} red />
      </div>
    </div>
  );
}

/* ── shared bottom button for vertical sidebar ── */
function SideBtn({ onClick, title, icon: Icon, label, isCollapsed, danger }) {
  return (
    <button
      onClick={onClick}
      title={isCollapsed ? label : title}
      style={{
        width: '100%', display: 'flex', alignItems: 'center',
        justifyContent: isCollapsed ? 'center' : 'flex-start',
        gap: '0.75rem', padding: isCollapsed ? '0.55rem 0' : '0.55rem 0.75rem',
        borderRadius: '0.5rem', border: 'none', backgroundColor: 'transparent',
        cursor: 'pointer', color: '#6B7280',
        fontSize: '0.875rem', transition: 'background-color 0.15s, color 0.15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.backgroundColor = danger ? 'rgba(220,38,38,0.1)' : 'rgba(255,255,255,0.05)';
        e.currentTarget.style.color = danger ? '#F87171' : '#9CA3AF';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.color = '#6B7280';
      }}
    >
      <Icon size={16} />
      {!isCollapsed && <span style={{ color: 'inherit', whiteSpace: 'nowrap' }}>{label}</span>}
    </button>
  );
}

/* ── Avatar button (shared between both modes) ── */
function AvatarBtn({ user, onClick, size = 33, ring = true }) {
  return (
    <button
      onClick={onClick}
      title="Account menu"
      style={{
        width: `${size}px`, height: `${size}px`, borderRadius: '50%',
        backgroundColor: '#CC2027', overflow: 'hidden', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: 'none', cursor: 'pointer', padding: 0,
        boxShadow: ring ? '0 0 0 2px rgba(204,32,39,0.4)' : 'none',
        transition: 'box-shadow 0.18s',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 0 3px rgba(204,32,39,0.65)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = ring ? '0 0 0 2px rgba(204,32,39,0.4)' : 'none'; }}
    >
      {user?.photoPath
        ? <img src={`http://localhost:8080/${user.photoPath}`} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ color: 'white', fontSize: `${size * 0.35}px`, fontWeight: '700' }}>{user?.name?.charAt(0)?.toUpperCase()}</span>
      }
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { t, isRTL } = useLanguage();
  const { isDark, toggleDark } = useTheme();
  const { isHorizontal, isCollapsed, toggleLayout, toggleCollapsed } = useLayout();

  const [showMenu, setShowMenu]   = useState(false);
  const [menuPos,  setMenuPos]    = useState({ top: 0, right: 0 });
  const userTriggerRef            = useRef(null);

  const isActive  = (path) => location.pathname === path;
  const isManager = user?.role === 'ADMIN' || user?.role === 'IT_MANAGER';
  const isAdmin   = user?.role === 'ADMIN';

  const openMenu = () => {
    if (userTriggerRef.current) {
      const r = userTriggerRef.current.getBoundingClientRect();
      if (isHorizontal) {
        setMenuPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
      } else {
        setMenuPos({ top: r.top, right: window.innerWidth - (isCollapsed ? 64 : 240) - 8 });
      }
    }
    setShowMenu(v => !v);
  };

  /* ─────────────────────────── HORIZONTAL TOPBAR ─────────────────────────── */
  if (isHorizontal) {
    const topH      = isCollapsed ? 40 : 64;
    const showLabel = !isCollapsed;

    const navSections = [
      { items: NAV_ITEMS },
      ...(isManager ? [{ items: MGMT_ITEMS }] : []),
      ...(isAdmin   ? [{ items: ADMIN_ITEMS }] : []),
    ];

    return (
      <>
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: `${topH}px`,
          backgroundColor: '#1A1A2E',
          display: 'flex', alignItems: 'stretch',
          zIndex: 200,
          borderBottom: '2px solid transparent',
          backgroundImage: 'linear-gradient(#1A1A2E,#1A1A2E), linear-gradient(90deg,#8B1520,#CC2027 35%,#C8960C 65%,#F4D458)',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          transition: 'height 0.22s ease',
        }}>

          {/* ── Logo ── */}
          <div style={{
            width: showLabel ? '200px' : '56px', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: showLabel ? '0 0.85rem' : '0',
            borderRight: '1px solid rgba(200,150,12,0.14)',
            transition: 'width 0.22s ease, padding 0.22s ease',
          }}>
            {showLabel ? (
              /* Expanded topbar — inline brand */
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'linear-gradient(135deg,rgba(28,12,20,0.9) 0%,rgba(20,20,40,0.9) 100%)',
                borderRadius: '8px', padding: '5px 10px',
                border: '1px solid rgba(204,32,39,0.28)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
                width: '100%',
              }}>
                <div style={{
                  width: showLabel ? 36 : 28, height: showLabel ? 36 : 28, flexShrink: 0,
                  background: 'linear-gradient(135deg,#1A1A2E,#0A0A18)',
                  borderRadius: '8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 18px rgba(204,32,39,0.55), 0 0 5px rgba(200,150,12,0.2)',
                  border: '1px solid rgba(204,32,39,0.35)',
                }}>
                  <NexusIconSVG size={26} />
                </div>
                <div>
                  <p style={{ margin: 0, color: 'white', fontSize: '1rem', fontWeight: '900', lineHeight: 1, whiteSpace: 'nowrap', letterSpacing: '0.08em' }}>
                    NE<span style={{ color: '#D4521A' }}>X</span>US
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.5rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.12em', textTransform: 'uppercase', lineHeight: 1, whiteSpace: 'nowrap' }}>
                    Attijari IT
                  </p>
                </div>
              </div>
            ) : (
              /* Collapsed topbar — icon only */
              <div style={{
                width: '34px', height: '34px',
                background: 'linear-gradient(135deg,#1A1A2E,#0A0A18)',
                borderRadius: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 20px rgba(204,32,39,0.6), 0 0 6px rgba(200,150,12,0.2)',
                border: '1px solid rgba(204,32,39,0.38)',
              }}>
                <NexusIconSVG size={25} />
              </div>
            )}
          </div>

          {/* ── Nav sections — scrollable ── */}
          <div style={{
            flex: 1, display: 'flex', alignItems: 'stretch',
            overflowX: 'auto', scrollbarWidth: 'none',
            padding: '0 0.25rem',
          }}>
            {navSections.map((section, sIdx) => (
              <div key={sIdx} style={{ display: 'flex', alignItems: 'stretch' }}>
                {sIdx > 0 && (
                  <div style={{ width: '1px', backgroundColor: 'rgba(200,150,12,0.22)', margin: `${topH * 0.25}px 6px`, flexShrink: 0 }} />
                )}
                {section.items.map(item => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      title={!showLabel ? t(item.labelKey) : undefined}
                      style={{
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        gap: showLabel ? '5px' : '0',
                        padding: showLabel ? '0 14px' : '0 10px',
                        flexShrink: 0, textDecoration: 'none', position: 'relative',
                        color: active ? '#FFFFFF' : '#8B9AB0',
                        borderBottom: `3px solid ${active ? '#CC2027' : 'transparent'}`,
                        backgroundColor: active ? 'rgba(204,32,39,0.13)' : 'transparent',
                        transition: 'color 0.18s, background-color 0.18s',
                        minWidth: showLabel ? undefined : '40px',
                      }}
                      onMouseEnter={e => {
                        if (!active) { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#C5D0E0'; }
                        const svg = e.currentTarget.querySelector('svg');
                        if (svg) svg.style.transform = 'scale(1.18) translateY(-2px)';
                      }}
                      onMouseLeave={e => {
                        if (!active) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#8B9AB0'; }
                        const svg = e.currentTarget.querySelector('svg');
                        if (svg) svg.style.transform = 'scale(1) translateY(0)';
                      }}
                    >
                      <Icon size={showLabel ? 18 : 16} style={{ transition: 'transform 0.18s ease', flexShrink: 0 }} />
                      {showLabel && (
                        <span style={{ fontSize: '0.63rem', fontWeight: active ? '600' : '400', whiteSpace: 'nowrap', color: 'inherit', letterSpacing: '0.01em' }}>
                          {t(item.labelKey)}
                        </span>
                      )}
                      {active && (
                        <span style={{
                          position: 'absolute', bottom: 0,
                          left: '18%', right: '18%',
                          height: '3px', backgroundColor: '#CC2027',
                          borderRadius: '3px 3px 0 0',
                        }} />
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>

          {/* ── Right controls ── */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.35rem',
            padding: '0 0.875rem', flexShrink: 0,
            borderLeft: '1px solid rgba(200,150,12,0.14)',
          }}>

            <div style={{ width: '1px', height: '22px', backgroundColor: 'rgba(200,150,12,0.2)', margin: '0 2px' }} />

            {/* Dark mode — label only when expanded */}
            <button
              onClick={toggleDark}
              title={isDark ? 'Light mode' : 'Dark mode'}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: showLabel ? '0.38rem 0.7rem' : '0.38rem',
                borderRadius: '0.5rem',
                border: '1px solid rgba(255,255,255,0.1)',
                backgroundColor: 'rgba(255,255,255,0.04)',
                color: '#8B9AB0', cursor: 'pointer',
                fontSize: '0.72rem', fontWeight: '500',
                transition: 'background-color 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#D1D5DB'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#8B9AB0'; }}
            >
              {isDark ? <Sun size={14} /> : <Moon size={14} />}
              {showLabel && <span>{isDark ? 'Light' : 'Dark'}</span>}
            </button>

            {/* Switch to sidebar */}
            <button
              onClick={toggleLayout}
              title="Switch to sidebar"
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: showLabel ? '0.38rem 0.7rem' : '0.38rem',
                borderRadius: '0.5rem',
                border: '1px solid rgba(204,32,39,0.4)',
                backgroundColor: 'rgba(204,32,39,0.12)',
                color: '#F87171', cursor: 'pointer',
                fontSize: '0.72rem', fontWeight: '600',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(204,32,39,0.22)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(204,32,39,0.12)'}
            >
              <PanelLeft size={14} />
              {showLabel && <span>Sidebar</span>}
            </button>

            {/* Collapse / expand topbar */}
            <button
              onClick={toggleCollapsed}
              title={isCollapsed ? 'Expand bar' : 'Collapse bar'}
              style={{
                width: '30px', height: '30px', borderRadius: '0.45rem',
                border: '1px solid rgba(255,255,255,0.1)',
                backgroundColor: 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#6B7280',
                transition: 'background-color 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#C5D0E0'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#6B7280'; }}
            >
              {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>

            <div style={{ width: '1px', height: '28px', backgroundColor: 'rgba(255,255,255,0.08)', margin: '0 2px' }} />

            {/* User area — avatar + name (clickable) */}
            <div
              ref={userTriggerRef}
              onClick={openMenu}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
            >
              <AvatarBtn user={user} onClick={() => {}} size={33} />
              {showLabel && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                  <span style={{ color: '#E5E7EB', fontSize: '0.75rem', fontWeight: '600', whiteSpace: 'nowrap', lineHeight: 1.2 }}>
                    {user?.name?.split(' ')[0]}
                  </span>
                  <span style={{ color: '#4B5563', fontSize: '0.6rem', whiteSpace: 'nowrap', lineHeight: 1 }}>
                    {user?.role?.replace(/_/g, ' ')}
                  </span>
                </div>
              )}
              <ChevronDown size={12} color={showMenu ? '#F87171' : '#4B5563'} style={{ transition: 'transform 0.2s', transform: showMenu ? 'rotate(180deg)' : 'rotate(0deg)' }} />
            </div>
          </div>
        </div>

        {showMenu && (
          <UserMenu
            user={user} isDark={isDark} toggleDark={toggleDark}
            logout={logout} onClose={() => setShowMenu(false)} pos={menuPos}
          />
        )}
      </>
    );
  }

  /* ─────────────────────────── VERTICAL SIDEBAR ───────────────────────────── */
  const sideW = isCollapsed ? 64 : 240;

  const renderNavItem = (item) => {
    const Icon = item.icon;
    const active = isActive(item.path);
    return (
      <Link
        key={item.path}
        to={item.path}
        title={isCollapsed ? t(item.labelKey) : undefined}
        style={{
          display: 'flex', alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          gap: '0.75rem',
          padding: isCollapsed ? '0.65rem 0' : '0.6rem 0.75rem',
          borderRadius: '0.5rem', marginBottom: '0.15rem', textDecoration: 'none',
          backgroundColor: active ? 'rgba(204,32,39,0.15)' : 'transparent',
          borderLeft:  !isRTL && !isCollapsed ? `3px solid ${active ? '#CC2027' : 'transparent'}` : 'none',
          borderRight:  isRTL && !isCollapsed ? `3px solid ${active ? '#CC2027' : 'transparent'}` : 'none',
          boxShadow: active && !isCollapsed ? 'inset 3px 0 0 0 #CC2027' : 'none',
          transition: 'background-color 0.15s',
        }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        <Icon size={isCollapsed ? 18 : 17} color={active ? '#F87171' : '#6B7280'} />
        {!isCollapsed && (
          <span style={{ fontSize: '0.875rem', fontWeight: active ? '600' : '400', color: active ? '#F9FAFB' : '#9CA3AF' }}>
            <SkeletonText width={72} height="0.875rem">{t(item.labelKey)}</SkeletonText>
          </span>
        )}
      </Link>
    );
  };

  const sectionLabel = (node) => !isCollapsed && (
    <p style={{ color: '#4B5563', fontSize: '0.68rem', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 0.5rem', marginBottom: '0.4rem' }}>
      {node}
    </p>
  );

  const divider = isCollapsed && (
    <div style={{ height: '1px', backgroundColor: 'rgba(200,150,12,0.15)', margin: '0.5rem 0.5rem 0.6rem' }} />
  );

  return (
    <>
      <div style={{
        width: `${sideW}px`, minHeight: '100vh',
        backgroundColor: '#1A1A2E',
        display: 'flex', flexDirection: 'column',
        position: 'fixed',
        left: isRTL ? 'auto' : 0,
        right: isRTL ? 0 : 'auto',
        top: 0, bottom: 0, zIndex: 100,
        transition: 'width 0.22s ease',
        overflow: 'hidden',
      }}>

        {/* ── Logo ── */}
        <div style={{
          flexShrink: 0,
          padding: isCollapsed ? '1rem 0' : '1rem 1rem 0.85rem',
          borderBottom: '1px solid rgba(200,150,12,0.14)',
          display: 'flex', flexDirection: 'column',
          alignItems: isCollapsed ? 'center' : 'stretch',
          gap: isCollapsed ? '0' : '0.65rem',
        }}>
          {isCollapsed ? (
            /* Collapsed — glowing N mark */
            <div style={{
              width: '34px', height: '34px',
              background: 'linear-gradient(135deg,#1A1A2E 0%,#0A0A18 100%)',
              borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 16px rgba(204,32,39,0.55), 0 0 5px rgba(200,150,12,0.18)',
              border: '1px solid rgba(204,32,39,0.35)',
            }}>
              <NexusIconSVG size={25} />
            </div>
          ) : (
            /* Expanded — compact brand row */
            <div style={{
              background: 'linear-gradient(135deg,#1C0C14 0%,#141428 100%)',
              borderRadius: '8px',
              padding: '7px 10px',
              border: '1px solid rgba(204,32,39,0.25)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.03)',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <div style={{
                width: '32px', height: '32px', flexShrink: 0,
                background: 'linear-gradient(135deg,#1A1A2E 0%,#0A0A18 100%)',
                borderRadius: '7px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 16px rgba(204,32,39,0.5), 0 0 4px rgba(200,150,12,0.2)',
                border: '1px solid rgba(204,32,39,0.32)',
              }}>
                <NexusIconSVG size={23} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: '900', letterSpacing: '0.08em', color: 'white', lineHeight: 1.1 }}>
                  NE<span style={{ color: '#D4521A' }}>X</span>US
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '0.5rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.14em', textTransform: 'uppercase', lineHeight: 1 }}>
                  Attijari IT · v1.0
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Navigation ── */}
        <nav style={{ flex: 1, padding: isCollapsed ? '0.75rem 0.5rem' : '1rem 0.75rem', overflowY: 'auto' }}>
          <div style={{ marginBottom: isCollapsed ? '0' : '1.5rem' }}>
            {sectionLabel(<SkeletonText width={36} height="0.68rem">{t('nav_main')}</SkeletonText>)}
            {NAV_ITEMS.map(renderNavItem)}
          </div>
          {isManager && (
            <div style={{ marginBottom: isCollapsed ? '0' : '1.5rem' }}>
              {divider}
              {sectionLabel(<SkeletonText width={76} height="0.68rem">{t('nav_management')}</SkeletonText>)}
              {MGMT_ITEMS.map(renderNavItem)}
            </div>
          )}
          {isAdmin && (
            <div style={{ marginBottom: isCollapsed ? '0' : '1.5rem' }}>
              {divider}
              {sectionLabel(<SkeletonText width={90} height="0.68rem">{t('nav_administration')}</SkeletonText>)}
              {ADMIN_ITEMS.map(renderNavItem)}
            </div>
          )}
        </nav>

        {/* ── Bottom controls ── */}
        <div style={{
          padding: isCollapsed ? '0.75rem 0.5rem' : '0.75rem',
          borderTop: '1px solid rgba(200,150,12,0.14)',
          display: 'flex', flexDirection: 'column',
          alignItems: isCollapsed ? 'center' : 'stretch',
          gap: '1px',
        }}>

          {/* User trigger — clickable */}
          {!isCollapsed ? (
            <button
              ref={userTriggerRef}
              onClick={openMenu}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.6rem 0.5rem', marginBottom: '0.25rem',
                borderRadius: '0.5rem', border: 'none',
                backgroundColor: 'transparent', cursor: 'pointer', width: '100%', textAlign: 'left',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <AvatarBtn user={user} onClick={() => {}} size={34} ring={false} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <p style={{ color: '#F9FAFB', fontSize: '0.8rem', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.name}
                  </p>
                  {user?.emailVerified && <span style={{ color: '#3B82F6', fontSize: '0.7rem' }}>✓</span>}
                </div>
                <p style={{ color: '#6B7280', fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.role?.replace(/_/g, ' ')}
                </p>
              </div>
              <ChevronDown size={13} color={showMenu ? '#F87171' : '#4B5563'} style={{ flexShrink: 0, transition: 'transform 0.2s', transform: showMenu ? 'rotate(180deg)' : 'rotate(0deg)' }} />
            </button>
          ) : (
            <div ref={userTriggerRef} style={{ marginBottom: '0.5rem' }}>
              <AvatarBtn user={user} onClick={openMenu} size={34} />
            </div>
          )}

          {/* Dark mode */}
          <button
            onClick={toggleDark}
            title={isDark ? 'Light mode' : 'Dark mode'}
            style={{
              width: '100%', display: 'flex', alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              gap: '0.75rem', padding: isCollapsed ? '0.55rem 0' : '0.6rem 0.75rem',
              borderRadius: '0.5rem', border: 'none', backgroundColor: 'transparent',
              cursor: 'pointer', transition: 'background-color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            {isDark ? <Sun size={16} color="#9CA3AF" /> : <Moon size={16} color="#9CA3AF" />}
            {!isCollapsed && (
              <>
                <span style={{ color: '#9CA3AF', fontSize: '0.875rem', flex: 1, textAlign: isRTL ? 'right' : 'left' }}>
                  {isDark ? 'Light mode' : 'Dark mode'}
                </span>
                <div style={{ width: '32px', height: '18px', borderRadius: '9px', flexShrink: 0, backgroundColor: isDark ? '#CC2027' : 'rgba(255,255,255,0.15)', position: 'relative', transition: 'background-color 0.2s' }}>
                  <div style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: 'white', position: 'absolute', top: '2px', left: isDark ? '16px' : '2px', transition: 'left 0.2s' }} />
                </div>
              </>
            )}
          </button>

          <SideBtn onClick={toggleLayout}    title="Switch to top bar"       icon={PanelTop}                                label="Top bar"  isCollapsed={isCollapsed} />
          <SideBtn onClick={toggleCollapsed} title={isCollapsed ? 'Expand' : 'Collapse'} icon={isCollapsed ? ChevronRight : ChevronLeft} label={isCollapsed ? 'Expand' : 'Collapse'} isCollapsed={isCollapsed} />
          <SideBtn onClick={logout}          title="Sign out"                icon={LogOut}                                  label={t('nav_signout')} isCollapsed={isCollapsed} danger />
        </div>
      </div>

      {showMenu && (
        <UserMenu
          user={user} isDark={isDark} toggleDark={toggleDark}
          logout={logout} onClose={() => setShowMenu(false)} pos={menuPos}
        />
      )}
    </>
  );
}

export default Sidebar;
