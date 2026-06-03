'use client'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { PROVIDERS, MODES, getModelsByMode } from '@/lib/models'

export default function ModelSelector({ model, setModel, mode, setMode, serverProviders }) {
  const [openModel, setOpenModel] = useState(false)
  const [openMode, setOpenMode] = useState(false)

  const availableModels = getModelsByMode(mode)
  const currentModel = availableModels.find((m) => m.id === model) || availableModels[0]
  const currentMode = MODES[mode]

  const providerHasKey = (providerId) => {
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
            position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 50,
            background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 10, overflow: 'hidden', minWidth: 180,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          }}>
            {Object.values(MODES).map((m) => (
              <button
                key={m.id}
                onClick={() => { setMode(m.id); setOpenMode(false) }}
                style={{
                  width: '100%', padding: '9px 14px',
                  background: m.id === mode ? 'var(--bg-secondary)' : 'none',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: 10,
                  color: 'var(--text)', fontSize: 13,
                }}
              >
                <span style={{ fontSize: 16 }}>{m.icon}</span>
                <div>
                  <div style={{ fontWeight: 500 }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.description}</div>
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
            position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 50,
            background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 10, overflow: 'hidden', minWidth: 260,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            maxHeight: 360, overflowY: 'auto',
          }}>
            {Object.values(PROVIDERS).map((provider) => {
              const models = availableModels.filter((m) => m.provider === provider.id)
              if (models.length === 0) return null
              const hasKey = providerHasKey(provider.id)
              return (
                <div key={provider.id}>
                  <div style={{
                    padding: '8px 14px 4px',
                    fontSize: 11, fontWeight: 600,
                    color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    {provider.name}
                    {!hasKey && (
                      <span style={{ color: '#f59e0b', fontSize: 10 }}>• No key</span>
                    )}
                  </div>
                  {models.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => { setModel(m.id); setOpenModel(false) }}
                      style={{
                        width: '100%', padding: '8px 14px',
                        background: m.id === model ? 'var(--bg-secondary)' : 'none',
                        border: 'none', cursor: 'pointer', textAlign: 'left',
                        color: hasKey ? 'var(--text)' : 'var(--text-muted)',
                        fontSize: 13, opacity: hasKey ? 1 : 0.6,
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
          style={{ position: 'fixed', inset: 0, zIndex: 40 }}
          onClick={() => { setOpenModel(false); setOpenMode(false) }}
        />
      )}
    </div>
  )
}
