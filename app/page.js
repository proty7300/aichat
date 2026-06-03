'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Menu, X, Moon, Sun, Download, Image as ImageIcon, LogIn, LogOut, User } from 'lucide-react'
import MessageRenderer from '@/components/MessageRenderer'
import ModelSelector from '@/components/ModelSelector'
import Sidebar from '@/components/Sidebar'
import SettingsModal, { loadOverrideKeys } from '@/components/SettingsModal'
import { getAllModels } from '@/lib/models'
import { signInWithGoogle, logout, onAuthChange, loadChats, saveChat, updateChat as updateChatInDb, deleteChat as deleteChatFromDb } from '@/lib/firebase'

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
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)
  const abortRef = useRef(null)
  const unsubscribeRef = useRef(null)

  const activeChat = chats.find((c) => c.id === activeChatId)

  // Auth state listener - load chats once on login
  useEffect(() => {
    const unsubscribe = onAuthChange(async (currentUser) => {
      setUser(currentUser)
      setAuthLoading(false)
      
      if (currentUser) {
        // Load chats from Firestore once (no real-time subscription)
        const userChats = await loadChats(currentUser.uid)
        setChats(userChats)
      } else {
        // No user - use localStorage (fallback)
        const savedChats = JSON.parse(localStorage.getItem('ai_chats') || '[]')
        setChats(savedChats)
      }
    })
    return () => unsubscribe()
  }, [])

  // Save chats to localStorage when not logged in
  useEffect(() => {
    if (authLoading || user) return
    localStorage.setItem('ai_chats', JSON.stringify(chats))
  }, [chats, user, authLoading])

  useEffect(() => {
    const savedDark = localStorage.getItem('ai_dark') === 'true'
    setDark(savedDark)
    document.documentElement.classList.toggle('dark', savedDark)

    // Fetch available server providers
    fetch('/api/models').then((r) => r.json()).then(setServerProviders).catch(() => {})
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeChat?.messages])

  const toggleDark = () => {
    const next = !dark
    setDark(next)
    localStorage.setItem('ai_dark', String(next))
    document.documentElement.classList.toggle('dark', next)
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
      await logout()
      // Chats will switch to localStorage mode
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const newChat = useCallback(async () => {
    const localId = genId()
    let chatId = localId
    let chat = { id: localId, title: 'Chat baru', messages: [], model, mode }
    
    // Save to Firestore first if logged in
    if (user) {
      try {
        console.log('Creating new chat for user:', user.uid)
        const firestoreId = await saveChat(user.uid, { ...chat, userId: user.uid })
        chatId = firestoreId // Use Firestore ID for everything
        chat = { ...chat, id: firestoreId }
        console.log('Chat created with Firestore ID:', firestoreId)
      } catch (error) {
        console.error('Create chat error:', error)
      }
    }
    
    setChats((prev) => [chat, ...prev])
    setActiveChatId(chatId) // Use the correct ID (Firestore or local)
    setInput('')
  }, [model, mode, user])

  const deleteChat = async (id) => {
    if (user) {
      try {
        await deleteChatFromDb(id)
        // Firestore will auto-sync via onSnapshot
      } catch (error) {
        console.error('Delete error:', error)
      }
    } else {
      setChats((prev) => prev.filter((c) => c.id !== id))
    }
    if (activeChatId === id) {
      setActiveChatId(chats.find((c) => c.id !== id)?.id || null)
    }
  }

  const updateChat = async (id, updater) => {
    const chatToUpdate = chats.find(c => c.id === id)
    const updatedChat = updater(chatToUpdate || {})
    
    setChats((prev) => prev.map((c) => (c.id === id ? updatedChat : c)))
    
    // Save to Firestore if logged in
    if (user && updatedChat.messages?.length > 0) {
      try {
        console.log('Updating chat:', { id, userId: user.uid, messages: updatedChat.messages.length })
        await updateChatInDb(id, updatedChat)
        console.log('Chat updated in Firestore')
      } catch (error) {
        console.error('Update chat error:', error.message)
      }
    }
  }

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || isLoading) return

    // Create chat if none active
    let chatId = activeChatId
    if (!chatId) {
      const id = genId()
      const chat = { id, title: genTitle(text), messages: [], model, mode }
      setChats((prev) => [chat, ...prev])
      setActiveChatId(id)
      chatId = id
    }

    const userMsg = { id: genId(), role: 'user', content: text }
    const assistantMsg = { id: genId(), role: 'assistant', content: '', isStreaming: true }

    updateChat(chatId, (c) => ({
      ...c,
      title: c.messages.length === 0 ? genTitle(text) : c.title,
      messages: [...c.messages, userMsg, assistantMsg],
      model, mode,
    }))

    setInput('')
    setIsLoading(true)

    const overrideKeys = loadOverrideKeys()
    // Find provider for current model
    const allModels = getAllModels()
    const modelInfo = allModels.find((m) => m.id === model)
    const providerId = modelInfo?.provider || 'generalcompute'
    const overrideKey = overrideKeys[providerId] || ''

    const history = (chats.find((c) => c.id === chatId)?.messages || [])
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

      // Image mode — non-streaming
      const contentType = res.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        const data = await res.json()
        if (data.type === 'image') {
          const imgContent = data.url
            ? `![Generated image](${data.url})\n\n*Prompt: ${data.revisedPrompt || data.prompt}*`
            : `![Generated image](data:image/png;base64,${data.b64})\n\n*Prompt: ${data.prompt}*`
          updateChat(chatId, (c) => ({
            ...c,
            messages: c.messages.map((m) =>
              m.id === assistantMsg.id ? { ...m, content: imgContent, isStreaming: false } : m
            ),
          }))
          setIsLoading(false)
          return
        }
      }

      // Streaming response
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
              updateChat(chatId, (c) => ({
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

      // Mark done
      updateChat(chatId, (c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m.id === assistantMsg.id ? { ...m, isStreaming: false } : m
        ),
      }))
    } catch (err) {
      if (err.name === 'AbortError') return
      updateChat(chatId, (c) => ({
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

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      {/* Sidebar — desktop */}
      <div style={{ display: 'flex', height: '100%' }} className="sidebar-desktop">
        <Sidebar
          chats={chats}
          activeChatId={activeChatId}
          onNewChat={newChat}
          onSelectChat={setActiveChatId}
          onDeleteChat={deleteChat}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      </div>

      {/* Sidebar — mobile overlay */}
      {sidebarOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex' }}>
          <div style={{ flex: 1, background: 'rgba(0,0,0,0.4)' }} onClick={() => setSidebarOpen(false)} />
          <div style={{ width: 280, height: '100%', flexShrink: 0 }}>
            <Sidebar
              chats={chats}
              activeChatId={activeChatId}
              onNewChat={newChat}
              onSelectChat={setActiveChatId}
              onDeleteChat={deleteChat}
              onOpenSettings={() => { setSettingsOpen(true); setSidebarOpen(false) }}
              isMobile
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Topbar */}
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'var(--bg)',
        }}>
          <button
            onClick={() => setSidebarOpen(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'none' }}
            className="mobile-menu-btn"
          >
            <Menu size={20} />
          </button>

          <ModelSelector
            model={model} setModel={setModel}
            mode={mode} setMode={setMode}
            serverProviders={serverProviders}
          />

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            {activeChat?.messages.length > 0 && (
              <button onClick={exportChat} title="Export chat" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 6, borderRadius: 6 }}>
                <Download size={16} />
              </button>
            )}
            <button onClick={toggleDark} title="Toggle dark mode" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 6, borderRadius: 6 }}>
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            
            {/* User Auth Button */}
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text)' }}>
                  <User size={14} />
                  <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.displayName || user.email}
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
          </div>
        </div>

        {/* Messages */}
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

        {/* Input area */}
        <div style={{
          padding: '12px 16px 16px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg)',
        }}>
          <div style={{ maxWidth: 760, margin: '0 auto' }}>
            <div style={{
              display: 'flex', gap: 8, alignItems: 'flex-end',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 12, padding: '8px 8px 8px 14px',
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
    <div style={{ textAlign: 'center', padding: '60px 24px', maxWidth: 560, margin: '0 auto' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>
        {mode === 'chat' ? '💬' : mode === 'coding' ? '💻' : mode === 'reasoning' ? '🧠' : '🎨'}
      </div>
      <h2 style={{ fontWeight: 600, fontSize: 22, margin: '0 0 8px' }}>
        {mode === 'chat' ? 'Mulai ngobrol' : mode === 'coding' ? 'Coding assistant' : mode === 'reasoning' ? 'Penalaran mendalam' : 'Generate gambar'}
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: '0 0 28px' }}>
        {mode === 'chat' ? 'Tanya apa saja' : mode === 'coding' ? 'Bantu debug, review, atau tulis kode' : mode === 'reasoning' ? 'Analisis masalah kompleks langkah demi langkah' : 'Deskripsikan gambar yang ingin dibuat'}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(suggestions[mode] || []).map((s) => (
          <button
            key={s}
            onClick={() => onSuggestion(s)}
            style={{
              padding: '10px 16px', background: 'var(--bg-secondary)',
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
