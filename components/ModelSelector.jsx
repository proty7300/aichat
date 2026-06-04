'use client'
import { useState, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { PROVIDERS, MODES, getModelsByMode } from '@/lib/models'

export default function ModelSelector({ model, setModel, mode, setMode, serverProviders }) {
  const [openModel, setOpenModel] = useState(false)
  const [openMode, setOpenMode] = useState(false)

  const availableModels = getModelsByMode(mode)
  
  // Reset model HANYA ketika mode berubah, bukan ketika model berubah
  useEffect(() => {
    const ids = availableModels.map(m => m.id)
    // Kalau model yang dipilih tidak tersedia di mode ini, reset ke yang pertama
    if (!ids.includes(model) && availableModels.length > 0) {
      setModel(availableModels[0].id)
    }
  }, [mode]) // eslint-disable-line react-hooks/exhaustive-deps
  
  const currentModel = availableModels.find((m) => m.id === model) || availableModels[0]
  const currentMode = MODES[mode]

  const providerHasKey = (providerId) => {
    const provider = Object.values(PROVIDERS).find(p => p.id === providerId)
    if (provider?.noKeyRequired) return true
    const overrideKeys = typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('ai_chat_override_keys') || '{}')
      : {}
    const override = overrideKeys[providerId]
    const serverKey = serverProviders?.find((p) => p.id === providerId)?.hasKey
    return !!(override || serverKey)
  }

  // Determine if a model is the "best available" to show a star indicator
  const getBestModelId = () => {
    const overrideKeys = typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('ai_chat_override_keys') || '{}')
      : {}
    const priority = ['deepseek-v3.2', 'deepseek-v3.1', 'glm-4.7', 'gpt-oss']
    for (const id of priority) {
      const m = availableModels.find(m => m.id === id)
      if (m) {
        const hasKey = overrideKeys[m.provider] || serverProviders?.find(p => p.id === m.provider)?.hasKey
        if (hasKey) return id
      }
    }
    return null
  }
  const bestModelId = getBestModelId()

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
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}
                    >
                      <span>{m.name}</span>
                      <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        {m.vision && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>Vision</span>}
                        {m.id === bestModelId && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>Auto ✦</span>}
                      </span>
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
