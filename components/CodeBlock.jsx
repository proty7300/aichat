'use client'
import { useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, Check } from 'lucide-react'

export default function CodeBlock({ language, children }) {
  const [copied, setCopied] = useState(false)
  const code = String(children).replace(/\n$/, '')

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      style={{
        borderRadius: 8,
        overflow: 'hidden',
        margin: '12px 0',
        border: '1px solid #2a2a2a',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: 'var(--code-header)',
          padding: '6px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ color: '#888', fontSize: 12, fontFamily: 'monospace' }}>
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: copied ? '#4ade80' : '#888',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 12,
            padding: '2px 6px',
            borderRadius: 4,
          }}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Tersalin!' : 'Salin'}
        </button>
      </div>

      {/* Code */}
      <SyntaxHighlighter
        language={language || 'text'}
        style={oneDark}
        customStyle={{
          margin: 0,
          borderRadius: 0,
          fontSize: 13,
          padding: '16px',
          background: 'var(--code-bg)',
        }}
        wrapLongLines={false}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  )
}
