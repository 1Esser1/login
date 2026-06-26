import { useState, useEffect, useRef } from 'react';
import { Bell, Brain, ShieldAlert, CheckCheck, X, Clock, UserPlus, Link2 } from 'lucide-react';
import notificationService from '../../services/notificationService';
import wsService from '../../services/websocketService';

const TYPE_META = {
  TASK_SCORED:      { icon: Brain,       color: '#7C3AED', bg: '#F5F3FF' },
  OVERRIDE_APPLIED: { icon: ShieldAlert, color: '#D97706', bg: '#FFF7ED' },
  DEADLINE_ALERT:   { icon: Clock,       color: '#CC2027', bg: '#FFF1F2' },
  NEW_USER_PENDING: { icon: UserPlus,    color: '#1A1A2E', bg: '#EFF6FF' },
  TASK_LINKED:      { icon: Link2,       color: '#7C3AED', bg: '#F5F3FF' },
};

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Poll unread count every 60s as fallback
  useEffect(() => {
    const fetchCount = () => {
      notificationService.getUnreadCount()
        .then(count => setUnreadCount(count))
        .catch(() => {});
    };
    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, []);

  // Real-time: subscribe to WebSocket push notifications
  useEffect(() => {
    const unsub = wsService.subscribe((notification) => {
      setUnreadCount(prev => prev + 1);
      // If the dropdown is open, prepend the new notification immediately
      setNotifications(prev => {
        if (prev.length === 0) return prev; // not loaded yet, let re-open fetch it
        return [notification, ...prev];
      });
    });
    return unsub;
  }, []);

  // Load notifications when dropdown opens
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    notificationService.getAll()
      .then(data => setNotifications(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleMarkRead = async (id) => {
    await notificationService.markAsRead(id).catch(() => {});
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    await notificationService.markAllAsRead().catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(prev => !prev)}
        style={{
          position: 'relative', width: '36px', height: '36px',
          borderRadius: '0.5rem', border: '1.5px solid #E5E7EB',
          backgroundColor: open ? '#FEF2F2' : 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.15s',
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.backgroundColor = '#F9FAFB'; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.backgroundColor = 'white'; }}
      >
        <Bell size={16} color={open ? '#CC2027' : '#6B7280'} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: '-6px', right: '-6px',
            backgroundColor: '#CC2027', color: 'white',
            borderRadius: '50%', minWidth: '18px', height: '18px',
            fontSize: '0.6rem', fontWeight: '700',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px', border: '2px solid white',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: '360px', backgroundColor: 'white',
          border: '1px solid #E5E7EB', borderRadius: '0.75rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          zIndex: 1000, overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '0.875rem 1.25rem',
            borderBottom: '1px solid #F0F0F0',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: '700', color: '#111827' }}>
                Notifications
              </p>
              {unreadCount > 0 && (
                <span style={{
                  fontSize: '0.65rem', fontWeight: '700',
                  backgroundColor: '#FEF2F2', color: '#CC2027',
                  border: '1px solid #FECACA',
                  padding: '0.1rem 0.4rem', borderRadius: '9999px',
                }}>
                  {unreadCount} unread
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.3rem',
                    padding: '0.3rem 0.6rem', borderRadius: '0.35rem',
                    border: '1px solid #E5E7EB', backgroundColor: 'white',
                    fontSize: '0.72rem', color: '#6B7280', cursor: 'pointer',
                  }}
                >
                  <CheckCheck size={12} />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: 'none', border: 'none',
                  cursor: 'pointer', color: '#9CA3AF', padding: '0.2rem',
                }}
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#9CA3AF' }}>
                <p style={{ fontSize: '0.825rem' }}>Loading…</p>
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
                <Bell size={24} color="#E5E7EB" style={{ marginBottom: '0.5rem' }} />
                <p style={{ fontSize: '0.825rem', fontWeight: '500', color: '#374151' }}>
                  No notifications yet
                </p>
                <p style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '0.25rem' }}>
                  You'll be notified when your tasks are scored or updated.
                </p>
              </div>
            ) : (
              notifications.map((n, index) => {
                const meta = TYPE_META[n.type] || { icon: Bell, color: '#6B7280', bg: '#F9FAFB' };
                const Icon = meta.icon;
                return (
                  <div
                    key={n.id}
                    onClick={() => !n.read && handleMarkRead(n.id)}
                    style={{
                      display: 'flex', gap: '0.875rem',
                      padding: '0.875rem 1.25rem',
                      borderBottom: index < notifications.length - 1
                        ? '1px solid #F9FAFB' : 'none',
                      backgroundColor: n.read ? 'white' : '#FAFBFF',
                      cursor: n.read ? 'default' : 'pointer',
                      transition: 'background-color 0.15s',
                    }}
                    onMouseEnter={e => {
                      if (!n.read) e.currentTarget.style.backgroundColor = '#F0F4FF';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = n.read ? 'white' : '#FAFBFF';
                    }}
                  >
                    {/* Icon */}
                    <div style={{
                      width: '34px', height: '34px', borderRadius: '0.5rem',
                      backgroundColor: meta.bg, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={16} color={meta.color} />
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <p style={{
                          fontSize: '0.8rem', fontWeight: n.read ? '500' : '600',
                          color: '#111827', lineHeight: '1.3',
                        }}>
                          {n.title}
                        </p>
                        <span style={{ fontSize: '0.68rem', color: '#9CA3AF', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {timeAgo(n.createdAt)}
                        </span>
                      </div>
                      <p style={{
                        fontSize: '0.75rem', color: '#6B7280',
                        marginTop: '0.2rem', lineHeight: '1.4',
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        display: '-webkit-box', WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}>
                        {n.message}
                      </p>
                    </div>

                    {/* Unread dot */}
                    {!n.read && (
                      <div style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        backgroundColor: '#CC2027', flexShrink: 0, marginTop: '4px',
                      }} />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div style={{
              padding: '0.6rem 1.25rem',
              borderTop: '1px solid #F0F0F0',
              backgroundColor: '#F8F9FB',
              textAlign: 'center',
            }}>
              <p style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>
                Showing last {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
