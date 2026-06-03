'use client'
import { Plus, MessageSquare, Trash2, Settings } from 'lucide-react'
import { MODES } from '@/lib/models'

export default function Sidebar({ chats, activeChatId, onNewChat, onSelectChat, onDeleteChat, onOpenSettings, isMobile, onClose }) {
  return (
    <div style={{
      width: isMobile ? '100%' : 260,
      height: '100%',
      background: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Logo + New Chat */}
      <div style={{ padding: '16px 12px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '0 4px' }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'var(--user-text)', fontSize: 14, fontWeight: 700 }}>AI</span>
          </div>
          <span style={{ fontWeight: 600, fontSize: 15 }}>AI Chat</span>
        </div>

        <button
          onClick={() => { onNewChat(); isMobile && onClose?.() }}
          style={{
            width: '100%', padding: '8px 12px',
            background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 8, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
            color: 'var(--text)', fontSize: 13, fontWeight: 500,
          }}
        >
          <Plus size={15} />
          Chat baru
        </button>
      </div>

      {/* Mode Pills */}
      <div style={{ padding: '4px 12px 8px' }}>
        <p style={{ margin: '0 0 6px', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500, padding: '0 4px' }}>Mode</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {Object.values(MODES).map((mode) => (
            <span key={mode.id} style={{
              fontSize: 11, padding: '3px 8px', borderRadius: 20,
              background: 'var(--bg)', border: '1px solid var(--border)',
              color: 'var(--text-secondary)', cursor: 'default',
            }}>
              {mode.icon} {mode.name}
            </span>
          ))}
        </div>
      </div>

      {/* Chat History */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
        {chats.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 12, padding: '8px 8px', margin: 0 }}>Belum ada chat</p>
        ) : (
          chats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => { onSelectChat(chat.id); isMobile && onClose?.() }}
              style={{
                padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                background: chat.id === activeChatId ? 'var(--bg)' : 'transparent',
                border: chat.id === activeChatId ? '1px solid var(--border)' : '1px solid transparent',
                display: 'flex', alignItems: 'center', gap: 8,
                marginBottom: 2,
                transition: 'background 0.1s',
              }}
            >
              <MessageSquare size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <span style={{
                fontSize: 13, color: 'var(--text)', flex: 1,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {chat.title || 'Chat baru'}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteChat(chat.id) }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', padding: 2, borderRadius: 4,
                  opacity: 0, transition: 'opacity 0.1s',
                }}
                className="delete-btn"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Settings button */}
      <div style={{ padding: '8px 12px 16px', borderTop: '1px solid var(--border)' }}>
        <button
          onClick={onOpenSettings}
          style={{
            width: '100%', padding: '8px 12px',
            background: 'none', border: '1px solid var(--border)',
            borderRadius: 8, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
            color: 'var(--text-secondary)', fontSize: 13,
          }}
        >
          <Settings size={15} />
          API Keys & Settings
        </button>
      </div>

      <style>{`.delete-btn { opacity: 0 !important } div:hover > .delete-btn { opacity: 1 !important }`}</style>
    </div>
  )
}
