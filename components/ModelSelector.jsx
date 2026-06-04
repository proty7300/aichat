'use client'
import { useState, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { PROVIDERS, MODES, getModelsByMode } from '@/lib/models'

export default function ModelSelector({ model, setModel, mode, setMode, serverProviders }) {
  const [openModel, setOpenModel] = useState(false)
  const [openMode, setOpenMode] = useState(false)

  const availableModels = getModelsByMode(mode)
  
  // Reset model when mode changes
  useEffect(() => {
    const firstModel = availableModels[0]
    if (firstModel && model !== firstModel.id) {
      setModel(firstModel.id)
    }
  }, [mode, availableModels, model, setModel])
  
  const currentModel = availableModels.find((m) => m.id === model) || availableModels[0]
  const currentMode = MODES[mode]

  const providerHasKey = (providerId) => {
    const provider = Object.values(PROVIDERS).find(p => p.id === providerId)
    // Provider yang tidak butuh key (free) dianggap selalu "punya key"
    if (provider?.noKeyRequired) return true
    const override = typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('ai_chat_override_keys') || '{}')[providerId]
      : null
    const serverKey = serverProviders?.find((p) => p.id === providerId)?.hasKey
    return !!(override || serverKey)
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      {/* Mode selector */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => { setOpenMode(!openMode); setOpenModel(false) }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', background: 'var(--bg-secondary)',
            border: '1px solid var(--border)', borderRadius: 8,
            cursor: 'pointer', color: 'var(--text)', fontSize: 13, fontWeight: 500,
          }}
        >
          <span>{currentMode?.icon}</span>
          <span>{currentMode?.name}</span>
          <ChevronDown size={13} style={{ color: 'var(--text-muted)' }} />
        </button>

        {openMode && (
          <div style={{
            position: 'fixed', left: 12, right: 12, bottom: 100, zIndex: 9999,
            background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 12, overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            maxHeight: '60vh', overflowY: 'auto',
          }}>
            {Object.values(MODES).map((m) => (
              <button
                key={m.id}
                onClick={() => { setMode(m.id); setOpenMode(false) }}
                style={{
                  width: '100%', padding: '12px 16px',
                  background: m.id === mode ? 'var(--bg-secondary)' : 'none',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: 12,
                  color: 'var(--text)', fontSize: 14,
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <span style={{ fontSize: 18 }}>{m.icon}</span>
                <div>
                  <div style={{ fontWeight: 500 }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.description}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Model selector */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => { setOpenModel(!openModel); setOpenMode(false) }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', background: 'var(--bg-secondary)',
            border: '1px solid var(--border)', borderRadius: 8,
            cursor: 'pointer', color: 'var(--text)', fontSize: 13,
          }}
        >
          <span>{currentModel?.providerName} — {currentModel?.name}</span>
          <ChevronDown size={13} style={{ color: 'var(--text-muted)' }} />
        </button>

        {openModel && (
          <div style={{
            position: 'fixed', left: 12, right: 12, bottom: 100, zIndex: 9999,
            background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 12, overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            maxHeight: '60vh', overflowY: 'auto',
          }}>
            {Object.values(PROVIDERS).map((provider) => {
              const models = availableModels.filter((m) => m.provider === provider.id)
              if (models.length === 0) return null
              const hasKey = providerHasKey(provider.id)
              return (
                <div key={provider.id}>
                  <div style={{
                    padding: '12px 16px 8px',
                    fontSize: 12, fontWeight: 600,
                    color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    {provider.name}
                    {!hasKey && (
                      <span style={{ color: '#f59e0b', fontSize: 11 }}>• No key</span>
                    )}
                  </div>
                  {models.map((m) => (
                    <button
                      key={m.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        setModel(m.id)
                        setTimeout(() => setOpenModel(false), 50)
                      }}
                      style={{
                        width: '100%', padding: '10px 16px',
                        background: m.id === model ? 'var(--bg-secondary)' : 'none',
                        border: 'none', cursor: 'pointer', textAlign: 'left',
                        color: hasKey ? 'var(--text)' : 'var(--text-muted)',
                        fontSize: 14, opacity: hasKey ? 1 : 0.6,
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Click outside to close */}
      {(openModel || openMode) && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.4)' }}
          onClick={() => { setOpenModel(false); setOpenMode(false) }}
        />
      )}
    </div>
  )
}
