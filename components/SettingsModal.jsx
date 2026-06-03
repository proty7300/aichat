'use client'
import { useState, useEffect } from 'react'
import { X, Eye, EyeOff, Save, RotateCcw } from 'lucide-react'
import { PROVIDERS } from '@/lib/models'

const STORAGE_KEY = 'ai_chat_override_keys'

export function loadOverrideKeys() {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

export function saveOverrideKeys(keys) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys))
}

export default function SettingsModal({ isOpen, onClose, serverProviders }) {
  const [keys, setKeys] = useState({})
  const [visible, setVisible] = useState({})
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (isOpen) setKeys(loadOverrideKeys())
  }, [isOpen])

  const handleSave = () => {
    // Hapus key kosong
    const cleaned = Object.fromEntries(Object.entries(keys).filter(([, v]) => v.trim()))
    saveOverrideKeys(cleaned)
    setSaved(true)
    setTimeout(() => { setSaved(false); onClose() }, 800)
  }

  const handleClear = (id) => {
    setKeys((prev) => { const n = { ...prev }; delete n[id]; return n })
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          width: '100%', maxWidth: 520,
          maxHeight: '85vh', overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>API Keys</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
              Override key default dari server. Tersimpan di browser kamu.
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {/* Provider list */}
        <div style={{ padding: '16px 24px' }}>
          {Object.values(PROVIDERS).map((provider) => {
            const serverHasKey = serverProviders?.find((p) => p.id === provider.id)?.hasKey
            const overrideVal = keys[provider.id] || ''
            const isVisible = visible[provider.id]

            return (
              <div key={provider.id} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{provider.name}</span>
                  {serverHasKey && (
                    <span style={{
                      fontSize: 11, padding: '1px 7px', borderRadius: 20,
                      background: 'rgba(74,222,128,0.15)', color: '#4ade80',
                      border: '1px solid rgba(74,222,128,0.3)',
                    }}>
                      Server key aktif
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input
                      type={isVisible ? 'text' : 'password'}
                      value={overrideVal}
                      onChange={(e) => setKeys((prev) => ({ ...prev, [provider.id]: e.target.value }))}
                      placeholder={serverHasKey ? 'Gunakan server key (opsional override)' : 'Masukkan API key...'}
                      style={{
                        width: '100%', padding: '8px 36px 8px 12px',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: 8, color: 'var(--text)',
                        fontSize: 13, fontFamily: 'monospace',
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={() => setVisible((prev) => ({ ...prev, [provider.id]: !isVisible }))}
                      style={{
                        position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                      }}
                    >
                      {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {overrideVal && (
                    <button
                      onClick={() => handleClear(provider.id)}
                      title="Hapus override key"
                      style={{
                        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                        borderRadius: 8, cursor: 'pointer', color: 'var(--text-muted)',
                        padding: '0 10px', display: 'flex', alignItems: 'center',
                      }}
                    >
                      <RotateCcw size={14} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 24px 20px',
          borderTop: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
            Key disimpan di localStorage browser kamu, tidak dikirim ke mana pun selain provider.
          </p>
          <button
            onClick={handleSave}
            style={{
              background: 'var(--accent)', color: 'var(--user-text)',
              border: 'none', borderRadius: 8, padding: '8px 20px',
              cursor: 'pointer', fontWeight: 500, fontSize: 14,
              display: 'flex', alignItems: 'center', gap: 6,
              marginLeft: 12, flexShrink: 0,
            }}
          >
            <Save size={14} />
            {saved ? 'Tersimpan!' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}
