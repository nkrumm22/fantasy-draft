import React, { useState, useEffect, useRef, useCallback } from 'react';

const s = {
  wrapper: { padding: '1.25rem 0' },
  tabRow: { display: 'flex', gap: '0', marginBottom: '1.25rem', borderBottom: '1px solid #2d3748' },
  tab: {
    padding: '0.5rem 1.25rem', background: 'transparent', border: 'none',
    color: '#718096', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer',
    borderBottom: '2px solid transparent', marginBottom: '-1px',
  },
  tabActive: { color: '#e2e8f0', borderBottom: '2px solid #63b3ed' },
  card: {
    background: '#141824', border: '1px solid #2d3748', borderRadius: '10px',
    padding: '1rem 1.25rem', marginBottom: '0.75rem',
  },
  pinnedCard: {
    background: '#141824', border: '1px solid #2d3748', borderLeft: '3px solid #d69e2e',
    borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '0.75rem',
  },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' },
  teamName: { fontSize: '0.75rem', fontWeight: '700', color: '#a0aec0' },
  timestamp: { fontSize: '0.7rem', color: '#4a5568' },
  message: { fontSize: '0.875rem', color: '#e2e8f0', lineHeight: '1.5' },
  deleteBtn: {
    background: 'transparent', border: 'none', color: '#4a5568', fontSize: '0.9rem',
    cursor: 'pointer', padding: '0 0.25rem', lineHeight: '1',
  },
  postBtn: {
    padding: '0.4rem 1rem', background: '#2c4a6e', border: 'none', borderRadius: '8px',
    color: '#63b3ed', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer',
    marginBottom: '1rem',
  },
  formCard: {
    background: '#0f1420', border: '1px solid #2d3748', borderRadius: '10px',
    padding: '1rem 1.25rem', marginBottom: '1rem',
  },
  textarea: {
    width: '100%', background: '#141824', border: '1px solid #2d3748', borderRadius: '8px',
    color: '#e2e8f0', fontSize: '0.875rem', padding: '0.6rem 0.75rem', resize: 'vertical',
    minHeight: '80px', boxSizing: 'border-box', fontFamily: 'inherit',
  },
  checkRow: { display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.6rem 0' },
  checkLabel: { fontSize: '0.82rem', color: '#a0aec0' },
  formBtns: { display: 'flex', gap: '0.5rem', marginTop: '0.6rem' },
  btnPrimary: {
    padding: '0.4rem 0.9rem', background: '#276749', border: 'none', borderRadius: '8px',
    color: '#fff', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer',
  },
  btnGhost: {
    padding: '0.4rem 0.9rem', background: 'transparent', border: '1px solid #2d3748',
    borderRadius: '8px', color: '#718096', fontSize: '0.8rem', cursor: 'pointer',
  },
  empty: { color: '#4a5568', fontSize: '0.85rem', padding: '1.5rem 0', textAlign: 'center' },
  // Chat
  chatWrapper: { display: 'flex', flexDirection: 'column', height: '520px' },
  chatList: { flex: 1, overflowY: 'auto', padding: '0.5rem 0', display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  msgLeft: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', maxWidth: '75%' },
  msgRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', maxWidth: '75%', alignSelf: 'flex-end' },
  bubbleLeft: {
    background: '#141824', border: '1px solid #2d3748', borderRadius: '0 10px 10px 10px',
    padding: '0.5rem 0.75rem', color: '#e2e8f0', fontSize: '0.875rem', lineHeight: '1.45',
  },
  bubbleRight: {
    background: '#1a2d48', border: '1px solid #2a4060', borderRadius: '10px 0 10px 10px',
    padding: '0.5rem 0.75rem', color: '#e2e8f0', fontSize: '0.875rem', lineHeight: '1.45',
  },
  chatMeta: { fontSize: '0.7rem', color: '#718096', marginBottom: '0.2rem' },
  chatInputRow: {
    display: 'flex', gap: '0.5rem', borderTop: '1px solid #2d3748', paddingTop: '0.75rem', marginTop: '0.25rem',
  },
  chatInput: {
    flex: 1, background: '#0f1420', border: '1px solid #2d3748', borderRadius: '8px',
    color: '#e2e8f0', fontSize: '0.875rem', padding: '0.5rem 0.75rem', fontFamily: 'inherit',
  },
  sendBtn: {
    padding: '0.5rem 1rem', background: '#2c4a6e', border: 'none', borderRadius: '8px',
    color: '#63b3ed', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer',
  },
};

function relativeTime(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ---- Announcements Tab ----
function AnnouncementsTab({ leagueId, token, isCommissioner }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState('');
  const [pinned, setPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const auth = { Authorization: `Bearer ${token}` };

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/leagues/${leagueId}/announcements`, { headers: auth })
      .then(r => r.json())
      .then(d => { setItems(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [leagueId, token]);

  useEffect(() => { load(); }, [load]);

  const post = async () => {
    if (!msg.trim()) return;
    setSubmitting(true);
    try {
      const r = await fetch(`/api/leagues/${leagueId}/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...auth },
        body: JSON.stringify({ message: msg, pinned }),
      });
      if (r.ok) { setMsg(''); setPinned(false); setShowForm(false); load(); }
    } finally { setSubmitting(false); }
  };

  const del = async (id) => {
    await fetch(`/api/leagues/${leagueId}/announcements/${id}`, { method: 'DELETE', headers: auth });
    load();
  };

  const sorted = [...items].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  if (loading) return <div style={s.empty}>Loading...</div>;

  return (
    <div>
      {isCommissioner && (
        <>
          {!showForm
            ? <button style={s.postBtn} onClick={() => setShowForm(true)}>+ Post Announcement</button>
            : (
              <div style={s.formCard}>
                <textarea
                  style={s.textarea}
                  placeholder="Write an announcement..."
                  value={msg}
                  onChange={e => setMsg(e.target.value)}
                />
                <div style={s.checkRow}>
                  <input
                    type="checkbox"
                    id="pinCheck"
                    checked={pinned}
                    onChange={e => setPinned(e.target.checked)}
                    style={{ accentColor: '#d69e2e' }}
                  />
                  <label htmlFor="pinCheck" style={s.checkLabel}>Pin this announcement</label>
                </div>
                <div style={s.formBtns}>
                  <button style={s.btnGhost} onClick={() => { setShowForm(false); setMsg(''); setPinned(false); }}>Cancel</button>
                  <button style={s.btnPrimary} onClick={post} disabled={submitting || !msg.trim()}>
                    {submitting ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </div>
            )
          }
        </>
      )}

      {sorted.length === 0
        ? <div style={s.empty}>No announcements yet</div>
        : sorted.map(item => (
          <div key={item.id} style={item.pinned ? s.pinnedCard : s.card}>
            <div style={s.cardHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {item.pinned && <span style={{ fontSize: '0.85rem', color: '#d69e2e' }}>📌</span>}
                <span style={s.teamName}>{item.team_name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={s.timestamp}>{relativeTime(item.created_at)}</span>
                {isCommissioner && (
                  <button style={s.deleteBtn} onClick={() => del(item.id)} title="Delete">✕</button>
                )}
              </div>
            </div>
            <div style={s.message}>{item.message}</div>
          </div>
        ))
      }
    </div>
  );
}

// ---- Chat Tab ----
function ChatTab({ leagueId, token, user }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const lastTsRef = useRef(null);
  const pollRef = useRef(null);
  const auth = { Authorization: `Bearer ${token}` };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = useCallback(async (since) => {
    const url = since
      ? `/api/leagues/${leagueId}/chat?since=${encodeURIComponent(since)}`
      : `/api/leagues/${leagueId}/chat`;
    const r = await fetch(url, { headers: auth });
    if (!r.ok) return [];
    const data = await r.json();
    return Array.isArray(data) ? data : [];
  }, [leagueId, token]);

  // Initial load
  useEffect(() => {
    fetchMessages(null).then(msgs => {
      setMessages(msgs);
      if (msgs.length > 0) {
        lastTsRef.current = msgs[msgs.length - 1].created_at;
      }
    });
  }, [leagueId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Poll every 5 seconds for new messages
  useEffect(() => {
    pollRef.current = setInterval(async () => {
      const since = lastTsRef.current;
      if (!since) return;
      const newMsgs = await fetchMessages(since);
      if (newMsgs.length > 0) {
        setMessages(prev => [...prev, ...newMsgs]);
        lastTsRef.current = newMsgs[newMsgs.length - 1].created_at;
      }
    }, 5000);
    return () => clearInterval(pollRef.current);
  }, [fetchMessages]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const r = await fetch(`/api/leagues/${leagueId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...auth },
        body: JSON.stringify({ message: text }),
      });
      if (r.ok) {
        const newMsg = await r.json();
        setInput('');
        setMessages(prev => [...prev, newMsg]);
        lastTsRef.current = newMsg.created_at;
      }
    } finally { setSending(false); }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div style={s.chatWrapper}>
      <div style={s.chatList}>
        {messages.length === 0 && (
          <div style={s.empty}>No messages yet. Say hello!</div>
        )}
        {messages.map(msg => {
          const isOwn = msg.user_id === user?.id;
          return (
            <div key={msg.id} style={isOwn ? { alignSelf: 'flex-end', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', maxWidth: '75%' } : { alignSelf: 'flex-start', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', maxWidth: '75%' }}>
              <div style={s.chatMeta}>{msg.team_name}</div>
              <div style={isOwn ? s.bubbleRight : s.bubbleLeft}>{msg.message}</div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div style={s.chatInputRow}>
        <input
          style={s.chatInput}
          placeholder="Type a message..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          maxLength={500}
        />
        <button style={s.sendBtn} onClick={send} disabled={sending || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}

// ---- Main Export ----
export default function Announcements({ leagueId, token, isCommissioner, user }) {
  const [tab, setTab] = useState('announcements');

  return (
    <div style={s.wrapper}>
      <div style={s.tabRow}>
        {['announcements', 'chat'].map(t => (
          <button
            key={t}
            style={{ ...s.tab, ...(tab === t ? s.tabActive : {}) }}
            onClick={() => setTab(t)}
          >
            {t === 'announcements' ? 'Announcements' : 'Chat'}
          </button>
        ))}
      </div>

      {tab === 'announcements'
        ? <AnnouncementsTab leagueId={leagueId} token={token} isCommissioner={isCommissioner} />
        : <ChatTab leagueId={leagueId} token={token} user={user} />
      }
    </div>
  );
}
