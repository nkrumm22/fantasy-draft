import React, { useState, useEffect, useRef } from 'react';

const TYPE_ICON = {
  trade_proposed: '🔄',
  trade_accepted: '✅',
  trade_rejected: '❌',
  waiver_result: '📋',
};

const s = {
  wrap: { position: 'relative' },
  btn: { background: 'none', border: 'none', cursor: 'pointer', padding: '0.35rem', color: '#a0aec0', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', borderRadius: '8px', transition: 'color 0.15s' },
  badge: { position: 'absolute', top: '-2px', right: '-2px', background: '#e53e3e', color: '#fff', borderRadius: '50%', fontSize: '0.6rem', fontWeight: '800', minWidth: '15px', height: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', lineHeight: 1, pointerEvents: 'none' },
  panel: { position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: '300px', background: '#141824', border: '1px solid #2d3748', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.6)', zIndex: 999, overflow: 'hidden' },
  panelHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 1rem', borderBottom: '1px solid #2d3748' },
  panelTitle: { fontSize: '0.78rem', fontWeight: '700', color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.06em' },
  markRead: { background: 'none', border: 'none', cursor: 'pointer', color: '#68d391', fontSize: '0.72rem', fontWeight: '600', padding: 0 },
  list: { maxHeight: '340px', overflowY: 'auto' },
  item: { padding: '0.7rem 1rem', borderBottom: '1px solid #1a2035', display: 'flex', gap: '0.6rem', alignItems: 'flex-start' },
  itemUnread: { background: '#0c1a10' },
  itemIcon: { fontSize: '1rem', flexShrink: 0, marginTop: '0.05rem' },
  itemBody: { flex: 1, minWidth: 0 },
  itemMsg: { fontSize: '0.82rem', color: '#e2e8f0', lineHeight: 1.45 },
  itemTime: { fontSize: '0.7rem', color: '#4a5568', marginTop: '0.2rem' },
  empty: { padding: '1.75rem 1rem', textAlign: 'center', color: '#4a5568', fontSize: '0.85rem' },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationBell({ token }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);

  const load = async () => {
    try {
      const r = await fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) {
        const d = await r.json();
        setNotifications(d.notifications || []);
        setUnread(d.unreadCount || 0);
      }
    } catch {}
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [token]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      fetch('/api/notifications/read', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnread(0);
    }
  };

  const markAllRead = () => {
    fetch('/api/notifications/read', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnread(0);
  };

  return (
    <div style={s.wrap} ref={ref}>
      <button style={s.btn} onClick={toggle} title="Notifications">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && <span style={s.badge}>{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div style={s.panel}>
          <div style={s.panelHeader}>
            <span style={s.panelTitle}>Notifications</span>
            {notifications.some(n => !n.read) && (
              <button style={s.markRead} onClick={markAllRead}>Mark all read</button>
            )}
          </div>
          <div style={s.list}>
            {notifications.length === 0
              ? <div style={s.empty}>No notifications yet</div>
              : notifications.map(n => (
                <div key={n.id} style={{ ...s.item, ...(n.read ? {} : s.itemUnread) }}>
                  <span style={s.itemIcon}>{TYPE_ICON[n.type] || '📢'}</span>
                  <div style={s.itemBody}>
                    <div style={s.itemMsg}>{n.message}</div>
                    <div style={s.itemTime}>{timeAgo(n.created_at)}</div>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}
