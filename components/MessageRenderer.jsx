'use client'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import CodeBlock from './CodeBlock'

export default function MessageRenderer({ content, isStreaming }) {
  return (
    <div className={`prose-content prose-code ${isStreaming ? 'typing-cursor' : ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            if (!inline && match) {
              return <CodeBlock language={match[1]}>{children}</CodeBlock>
            }
            if (!inline && !match) {
              return <CodeBlock language="text">{children}</CodeBlock>
            }
            return (
              <code className={className} {...props}>
                {children}
              </code>
            )
          },
          // Open links in new tab
          a({ href, children }) {
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
                {children}
              </a>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
