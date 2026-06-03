'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Menu, X, Moon, Sun, Download, Image as ImageIcon, LogIn, LogOut, User } from 'lucide-react'
import MessageRenderer from '@/components/MessageRenderer'
import ModelSelector from '@/components/ModelSelector'
import Sidebar from '@/components/Sidebar'
import SettingsModal, { loadOverrideKeys } from '@/components/SettingsModal'
import { getAllModels } from '@/lib/models'
import { supabase, signInWithGoogle, signOut, onAuthChange, saveChat, updateChat, deleteChat, loadChats, uploadImageToR2 } from '@/lib/supabase'

const DEFAULT_MODEL = 'deepseek-v3.2'
const DEFAULT_MODE = 'chat'

function genId() { return Math.random().toString(36).slice(2, 10) }
function genTitle(text) { return text.slice(0, 40) + (text.length > 40 ? '...' : '') }

export default function ChatPage() {
  const [chats, setChats] = useState([])
  const [activeChatId, setActiveChatId] = useState(null)
  const [model, setModel] = useState(DEFAULT_MODEL)
  const [mode, setMode] = useState(DEFAULT_MODE)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [dark, setDark] = useState(false)
  const [serverProviders, setServerProviders] = useState([])
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [hasLoadedChats, setHasLoadedChats] = useState(false)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)
  const abortRef = useRef(null)

  const activeChat = chats.find((c) => c.id === activeChatId) || null
  
  // Debug logging
  useEffect(() => {
    console.log('Current state:', { 
      activeChatId, 
      chatsCount: chats.length, 
      activeChatExists: !!activeChat,
      allChatIds: chats.map(c => ({ id: c.id, title: c.title }))
    })
  }, [activeChatId, chats])

  // Load chats from localStorage on mount
  useEffect(() => {
    // Try ai_chats_backup first, then ai_chats (for backwards compatibility)
    let savedChats = JSON.parse(localStorage.getItem('ai_chats_backup') || '[]')
    if (!savedChats || savedChats.length === 0) {
      savedChats = JSON.parse(localStorage.getItem('ai_chats') || '[]')
    }
    if (savedChats.length > 0) {
      setChats(savedChats)
      setActiveChatId(savedChats[0].id)
    }
  }, [])

  // Auth state listener
  useEffect(() => {
    const { data: { subscription } } = onAuthChange(async (user) => {
      setUser(user)
      setAuthLoading(false)
      
      if (user && !hasLoadedChats) {
        await loadUserChats(user.id)
        setHasLoadedChats(true)
      }
    })
    
    return () => subscription.unsubscribe()
  }, [])

  // Load chats from Supabase
  const loadUserChats = async (userId) => {
    try {
      console.log('Loading chats for user:', userId)
      const userChats = await loadChats(userId)
      console.log('Loaded chats from Supabase:', userChats)
      setChats(userChats)
      if (userChats.length > 0) {
        console.log('Setting activeChatId to:', userChats[0].id)
        setActiveChatId(userChats[0].id)
      }
    } catch (error) {
      console.error('Error loading chats:', error)
    }
  }

  // Save chats to localStorage as backup
  useEffect(() => {
    localStorage.setItem('ai_chats_backup', JSON.stringify(chats))
  }, [chats])

  useEffect(() => {
    const savedDark = localStorage.getItem('ai_dark') === 'true'
    setDark(savedDark)
    document.documentElement.classList.toggle('dark', savedDark)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeChat?.messages, isLoading])

  useEffect(() => {
    fetch('/api/models').then((r) => r.json()).then(setServerProviders).catch(() => {})
  }, [])

  const toggleDark = () => {
    const next = !dark
    setDark(next)
    localStorage.setItem('ai_dark', String(next))
    document.documentElement.classList.toggle('dark', next)
  }

  const newChat = useCallback(async () => {
    const localId = genId()
    const chat = { id: localId, title: 'Chat baru', messages: [], model, mode, isLocal: true }
    setChats((prev) => [chat, ...prev])
    setActiveChatId(localId)
    setInput('')
    
    // Save to Supabase if logged in
    if (user) {
      try {
        const savedChat = await saveChat(user.id, { title: 'Chat baru', messages: [], model, mode })
        // Update local chat with Supabase UUID AND update activeChatId
        setChats((prev) => prev.map((c) => 
          c.id === localId ? { ...savedChat, isLocal: false } : c
        ))
        setActiveChatId(savedChat.id) // ← Update to UUID
      } catch (error) {
        console.error('Error saving chat:', error)
        // Keep local ID if save fails
      }
    }
  }, [model, mode, user])

  const deleteChatFromDb = async (id) => {
    try {
      await deleteChat(id)
      setChats((prev) => prev.filter((c) => c.id !== id))
      if (activeChatId === id) {
        setActiveChatId(chats.find((c) => c.id !== id)?.id || null)
      }
    } catch (error) {
      console.error('Error deleting chat:', error)
      alert('Gagal hapus chat: ' + error.message)
    }
  }

  const updateChatInDb = async (chatId, updater) => {
    // Get latest chat from state using functional update
    let chatToUpdate = null
    setChats((prev) => {
      chatToUpdate = prev.find((c) => c.id === chatId)
      if (!chatToUpdate) return prev
      const updatedChat = updater(chatToUpdate)
      return prev.map((c) => (c.id === chatId ? updatedChat : c))
    })
    
    // Sync to Supabase (always try if user is logged in)
    if (user && chatToUpdate && chatId && typeof chatId === 'string' && chatId.includes('-')) {
      // UUID format check - only sync if it's a Supabase UUID
      try {
        console.log('Syncing chat to Supabase:', chatId)
        const result = await updateChat(chatId, {
          messages: chatToUpdate.messages,
          title: chatToUpdate.title,
          model: chatToUpdate.model,
          mode: chatToUpdate.mode,
        })
        console.log('Chat synced successfully:', result)
      } catch (error) {
        console.error('Error syncing chat:', error.message)
      }
    }
  }

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || isLoading) return

    let chatId = activeChatId
    let chat = chats.find((c) => c.id === chatId)
    
    console.log('sendMessage start:', { chatId, chatExists: !!chat, hasUser: !!user })
    
    if (!chatId || !chat) {
      const localId = genId()
      chat = { id: localId, title: genTitle(text), messages: [], model, mode, isLocal: true }
      setChats((prev) => [chat, ...prev])
      setActiveChatId(localId)
      chatId = localId
      
      // Save to Supabase if logged in
      if (user) {
        try {
          console.log('Saving new chat to Supabase...')
          const savedChat = await saveChat(user.id, { title: genTitle(text), messages: [], model, mode })
          console.log('Chat saved to Supabase:', savedChat.id)
          setChats((prev) => prev.map((c) => 
            c.id === localId ? { ...savedChat, isLocal: false } : c
          ))
          // Update chatId and chat to use UUID
          chatId = savedChat.id
          chat = savedChat
          setActiveChatId(savedChat.id)
        } catch (error) {
          console.error('Error saving chat:', error)
        }
      }
    } else {
      console.log('Using existing chat:', chat.id, chat.isLocal)
    }

    const userMsg = { id: genId(), role: 'user', content: text }
    const assistantMsg = { id: genId(), role: 'assistant', content: '', isStreaming: true }

    updateChatInDb(chatId, (c) => ({
      ...c,
      title: c.messages.length === 0 ? genTitle(text) : c.title,
      messages: [...c.messages, userMsg, assistantMsg],
      model, mode,
    }))

    setInput('')
    setIsLoading(true)

    const overrideKeys = loadOverrideKeys()
    const allModels = getAllModels()
    const modelInfo = allModels.find((m) => m.id === model)
    const providerId = modelInfo?.provider || 'generalcompute'
    const overrideKey = overrideKeys[providerId] || ''

    const currentChat = chats.find((c) => c.id === chatId)
    const history = (currentChat?.messages || [])
      .filter((m) => !m.isStreaming)
      .map((m) => ({ role: m.role, content: m.content }))

    try {
      const controller = new AbortController()
      abortRef.current = controller

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          messages: [...history, { role: 'user', content: text }],
          providerId, model, modeId: mode, overrideKey,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Request gagal')
      }

      const contentType = res.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        const data = await res.json()
        if (data.type === 'image') {
          let imgContent
          if (data.url) {
            // Upload to R2
            try {
              const response = await fetch(data.url)
              const blob = await response.blob()
              const r2Url = await uploadImageToR2(blob, chatId, `image-${Date.now()}.png`)
              imgContent = `![Generated image](${r2Url})\n\n*Prompt: ${data.revisedPrompt || data.prompt}*`
            } catch (error) {
              console.error('R2 upload error:', error)
              imgContent = `![Generated image](${data.url})\n\n*Prompt: ${data.revisedPrompt || data.prompt}*`
            }
          } else if (data.b64) {
            imgContent = `![Generated image](data:image/png;base64,${data.b64})\n\n*Prompt: ${data.prompt}*`
          }
          
          updateChatInDb(chatId, (c) => ({
            ...c,
            messages: c.messages.map((m) =>
              m.id === assistantMsg.id ? { ...m, content: imgContent, isStreaming: false } : m
            ),
          }))
          setIsLoading(false)
          return
        }
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') continue
          try {
            const parsed = JSON.parse(data)
            if (parsed.error) throw new Error(parsed.error)
            if (parsed.text) {
              accumulated += parsed.text
              updateChatInDb(chatId, (c) => ({
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMsg.id ? { ...m, content: accumulated } : m
                ),
              }))
            }
          } catch (e) {
            if (e.message !== 'Unexpected end of JSON input') throw e
          }
        }
      }

      updateChatInDb(chatId, (c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m.id === assistantMsg.id ? { ...m, isStreaming: false } : m
        ),
      }))
    } catch (err) {
      if (err.name === 'AbortError') return
      updateChatInDb(chatId, (c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m.id === assistantMsg.id
            ? { ...m, content: `❌ Error: ${err.message}`, isStreaming: false }
            : m
        ),
      }))
    } finally {
      setIsLoading(false)
      abortRef.current = null
      textareaRef.current?.focus()
    }
  }

  const handleSignIn = async () => {
    try {
      await signInWithGoogle()
    } catch (error) {
      console.error('Sign in error:', error)
      alert('Login gagal: ' + error.message)
    }
  }

  const handleLogout = async () => {
    try {
      await signOut()
      setChats([])
      setActiveChatId(null)
      setHasLoadedChats(false)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const stopGeneration = () => {
    abortRef.current?.abort()
  }

  const exportChat = () => {
    if (!activeChat) return
    const text = activeChat.messages
      .map((m) => `[${m.role.toUpperCase()}]\n${m.content}`)
      .join('\n\n---\n\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${activeChat.title}.txt`; a.click()
    URL.revokeObjectURL(url)
  }

  if (authLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', height: '100%' }} className="sidebar-desktop">
        <Sidebar
          chats={chats}
          activeChatId={activeChatId}
          onNewChat={newChat}
          onSelectChat={setActiveChatId}
          onDeleteChat={deleteChatFromDb}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      </div>

      {sidebarOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex' }}>
          <div style={{ flex: 1, background: 'rgba(0,0,0,0.4)' }} onClick={() => setSidebarOpen(false)} />
          <div style={{ width: 280, height: '100%', flexShrink: 0 }}>
            <Sidebar
              chats={chats}
              activeChatId={activeChatId}
              onNewChat={newChat}
              onSelectChat={setActiveChatId}
              onDeleteChat={deleteChatFromDb}
              onOpenSettings={() => { setSettingsOpen(true); setSidebarOpen(false) }}
              isMobile
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <div className="header-title" style={{
          padding: '10px 14px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--bg)',
          justifyContent: 'space-between',
        }}>
          <button
            onClick={() => setSidebarOpen(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'none' }}
            className="mobile-menu-btn"
          >
            <Menu size={20} />
          </button>

          <span style={{ fontWeight: 600, fontSize: 16, color: 'var(--text)' }}>AI Chat</span>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text)' }}>
                  <User size={14} />
                  <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.email?.split('@')[0]}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  title="Logout"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    padding: '6px 10px',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 12,
                  }}
                >
                  <LogOut size={14} />
                  <span className="desktop-only">Logout</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleSignIn}
                title="Login dengan Google"
                style={{
                  background: '#4285f4',
                  border: 'none',
                  borderRadius: 6,
                  padding: '6px 14px',
                  cursor: 'pointer',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                <LogIn size={14} />
                <span className="desktop-only">Login</span>
              </button>
            )}
            <button onClick={exportChat} title="Export chat" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 6, borderRadius: 6 }}>
              <Download size={16} />
            </button>
            <button onClick={toggleDark} title="Toggle dark mode" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 6, borderRadius: 6 }}>
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 0' }}>
          {!activeChat || activeChat.messages.length === 0 ? (
            <EmptyState mode={mode} onSuggestion={(s) => { setInput(s); textareaRef.current?.focus() }} />
          ) : (
            <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 16px' }}>
              {activeChat.messages.map((msg) => (
                <Message key={msg.id} msg={msg} />
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className="chat-input-container" style={{
          padding: '10px 14px 14px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg)',
        }}>
          <div style={{ maxWidth: 760, margin: '0 auto' }}>
            {/* Model Selector - Like ChatGPT/Claude */}
            <div style={{ marginBottom: 10 }}>
              <ModelSelector
                model={model} setModel={setModel}
                mode={mode} setMode={setMode}
                serverProviders={serverProviders}
              />
            </div>
            
            <div className="chat-input-box" style={{
              display: 'flex', gap: 8, alignItems: 'flex-end',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 12, padding: '8px 8px 8px 12px',
            }}>
              {mode === 'image' && (
                <ImageIcon size={16} style={{ color: 'var(--text-muted)', marginBottom: 10, flexShrink: 0 }} />
              )}
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                  e.target.style.height = 'auto'
                  e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'
                }}
                onKeyDown={handleKeyDown}
                placeholder={
                  mode === 'image' ? 'Deskripsikan gambar yang ingin kamu buat...' :
                  mode === 'coding' ? 'Tanya tentang kode, minta review, atau jelaskan bug...' :
                  mode === 'reasoning' ? 'Ajukan masalah untuk dianalisis mendalam...' :
                  'Ketik pesan... (Enter kirim, Shift+Enter baris baru)'
                }
                rows={1}
                style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none',
                  color: 'var(--text)', fontSize: 14, lineHeight: 1.6,
                  resize: 'none', fontFamily: 'inherit', padding: '4px 0',
                  maxHeight: 200,
                }}
              />
              <button
                onClick={isLoading ? stopGeneration : sendMessage}
                disabled={!input.trim() && !isLoading}
                style={{
                  background: isLoading ? '#ef4444' : 'var(--accent)',
                  border: 'none', borderRadius: 8,
                  width: 36, height: 36, flexShrink: 0,
                  cursor: (!input.trim() && !isLoading) ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--user-text)',
                  opacity: (!input.trim() && !isLoading) ? 0.4 : 1,
                }}
              >
                {isLoading ? <X size={16} /> : <Send size={15} />}
              </button>
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
              AI bisa membuat kesalahan. Periksa informasi penting.
            </p>
            {!user && (
              <p style={{ margin: '8px 0 0', fontSize: 11, color: '#f59e0b', textAlign: 'center' }}>
                💡 Login untuk menyimpan chat secara permanen di cloud
              </p>
            )}
          </div>
        </div>
      </div>

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} serverProviders={serverProviders} />

      <style>{`
        @media (max-width: 640px) {
          .sidebar-desktop { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
          .desktop-only { display: none; }
          
          /* Mobile optimizations */
          .empty-state-suggestions { gap: 10px !important; }
          .empty-state-suggestions button {
            padding: 12px 14px !important;
            font-size: 13px !important;
            border-radius: 8px !important;
          }
          .chat-input-container {
            padding: 8px !important;
          }
          .chat-input-box {
            padding: 6px 6px 6px 10px !important;
          }
          .message-container {
            padding: 16px 12px !important;
          }
          .header-title {
            font-size: 16px !important;
          }
          /* Model selector compact on mobile */
          .model-selector {
            font-size: 12px !important;
            padding: 6px 10px !important;
          }
        }
      `}</style>
    </div>
  )
}

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{
      display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 20,
    }}>
      {!isUser && (
        <div style={{
          width: 28, height: 28, borderRadius: 8, background: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, marginRight: 10, marginTop: 2,
        }}>
          <span style={{ color: 'var(--user-text)', fontSize: 12, fontWeight: 700 }}>AI</span>
        </div>
      )}
      <div style={{
        maxWidth: isUser ? '80%' : '100%',
        padding: isUser ? '10px 14px' : '4px 0',
        background: isUser ? 'var(--user-bubble)' : 'transparent',
        color: isUser ? 'var(--user-text)' : 'var(--text)',
        borderRadius: isUser ? 12 : 0,
        fontSize: 14,
      }}>
        {isUser ? (
          <span style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{msg.content}</span>
        ) : (
          <MessageRenderer content={msg.content} isStreaming={msg.isStreaming} />
        )}
      </div>
    </div>
  )
}

function EmptyState({ mode, onSuggestion }) {
  const suggestions = {
    chat: ['Apa itu quantum computing?', 'Jelaskan cara kerja DNS', 'Bedanya REST vs GraphQL?'],
    coding: ['Review kode Python ini', 'Buatkan fungsi sorting di JavaScript', 'Jelaskan algoritma binary search'],
    reasoning: ['Analisis trade-off monolith vs microservices', 'Apa risiko terbesar AI generatif?', 'Bantu evaluasi keputusan bisnis ini'],
    image: ['Sunset di pantai tropis, gaya digital art', 'Logo minimalis untuk startup teknologi', 'Karakter robot yang ramah dan berwarna-warni'],
  }

  return (
    <div style={{ textAlign: 'center', padding: '40px 20px', maxWidth: 560, margin: '0 auto' }}>
      <div style={{ fontSize: 36, marginBottom: 10 }}>
        {mode === 'chat' ? '💬' : mode === 'coding' ? '💻' : mode === 'reasoning' ? '🧠' : '🎨'}
      </div>
      <h2 style={{ fontWeight: 600, fontSize: 20, margin: '0 0 6px' }}>
        {mode === 'chat' ? 'Mulai ngobrol' : mode === 'coding' ? 'Coding assistant' : mode === 'reasoning' ? 'Penalaran mendalam' : 'Generate gambar'}
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '0 0 24px' }}>
        {mode === 'chat' ? 'Tanya apa saja' : mode === 'coding' ? 'Bantu debug, review, atau tulis kode' : mode === 'reasoning' ? 'Analisis masalah kompleks langkah demi langkah' : 'Deskripsikan gambar yang ingin dibuat'}
      </p>
      <div className="empty-state-suggestions" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(suggestions[mode] || []).map((s) => (
          <button
            key={s}
            onClick={() => onSuggestion(s)}
            style={{
              padding: '10px 14px', background: 'var(--bg-secondary)',
              border: '1px solid var(--border)', borderRadius: 10,
              cursor: 'pointer', color: 'var(--text)', fontSize: 13,
              textAlign: 'left', transition: 'border-color 0.15s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--text-muted)'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}
