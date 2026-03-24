import React, { memo, useCallback, Children, isValidElement } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, FileText } from 'lucide-react';
import { useState } from 'react';
import type { Message, Attachment } from '@agent-chatroom/shared';
import { mentionClass } from '../lib/colors';
import { formatBytes } from '../lib/format';

// SEC-XSS-001: Allowed URL schemes for markdown links.
// javascript:, data:, and vbscript: are blocked to prevent XSS.
const ALLOWED_SCHEMES = /^(https?:|mailto:)/i;

function sanitizeHref(href: string | undefined): string | undefined {
  if (!href) return undefined;
  const trimmed = href.trim();
  // Allow relative paths from the same server (e.g. /api/uploads/...) — cannot be javascript: or data:
  if (trimmed.startsWith('/api/uploads/')) return trimmed;
  if (!ALLOWED_SCHEMES.test(trimmed)) return undefined;
  return trimmed;
}

interface MessageLineProps {
  message: Message;
}

function formatModelName(model: string): string {
  // "claude-sonnet-4-6" → "sonnet 4.6", "claude-haiku-4-5-20251001" → "haiku 4.5"
  const m = model.replace(/^claude-/, '').replace(/-(\d{8})$/, '');
  const parts = m.split('-');
  const name = parts[0];
  const version = parts.slice(1).join('.');
  return `${name} ${version}`;
}

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function formatMetrics(metadata: Message['metadata']): string | null {
  if (!metadata.model || !metadata.durationMs) return null;
  const model = formatModelName(metadata.model);
  const dur = `${(metadata.durationMs / 1000).toFixed(1)}s`;
  const turns = `${metadata.numTurns ?? 0} turns`;
  const tok = `${formatTokens(metadata.inputTokens ?? 0)}/${formatTokens(metadata.outputTokens ?? 0)} tok`;
  const ctx = metadata.contextWindow && metadata.inputTokens
    ? `ctx ${Math.round((metadata.inputTokens / metadata.contextWindow) * 100)}%`
    : null;
  const sess = metadata.sessionId ? `sess ${metadata.sessionId.slice(-4)}` : null;
  return [model, dur, turns, tok, ctx, sess].filter(Boolean).join(' | ');
}

function formatTime(createdAt: string): string {
  try {
    const d = new Date(createdAt);
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  } catch {
    return '--:--';
  }
}

/**
 * Parse a text string and highlight @mentions and bare Bex name variants.
 * Catches: @bex @Bex @BEX (via @\w+) and bare bex/Bex/BEX (via \bbex\b, case-insensitive).
 */
function splitMentions(text: string): React.ReactNode[] {
  const parts = text.split(/(@\w+|\bbex\b)/gi);
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      const name = part.slice(1).toLowerCase();
      return (
        <span key={i} className={`mention ${mentionClass(name)}`}>
          {part}
        </span>
      );
    }
    if (/^bex$/i.test(part)) {
      return (
        <span key={i} className="mention mention-bex">
          {part}
        </span>
      );
    }
    return part;
  });
}

/**
 * Walk a React node tree and highlight @mentions in string leaves.
 * Skips elements that already have the `mention` class to avoid double-processing
 * tight list items where both the `li` and `p` renderers apply this walk.
 */
function highlightMentionsInNode(node: React.ReactNode, keyPrefix: string): React.ReactNode {
  if (typeof node === 'string') {
    return (node.includes('@') || /\bbex\b/i.test(node)) ? splitMentions(node) : node;
  }
  if (Array.isArray(node)) {
    return node.map((child, i) => highlightMentionsInNode(child, `${keyPrefix}-${i}`));
  }
  if (isValidElement(node)) {
    const el = node as React.ReactElement<{ children?: React.ReactNode; className?: string }>;
    // Skip already-highlighted mention spans to prevent double-wrapping in loose lists
    if (typeof el.props.className === 'string' && el.props.className.includes('mention')) {
      return node;
    }
    const newChildren = highlightMentionsInNode(el.props.children, keyPrefix);
    if (newChildren === el.props.children) return node;
    return React.cloneElement(el, {}, newChildren);
  }
  return node;
}

/**
 * Paragraph renderer — inline layout with @mention highlighting.
 */
function MdParagraph({ children }: { children?: React.ReactNode }): React.ReactElement {
  const highlighted = Children.map(children, (child, i) =>
    highlightMentionsInNode(child, `mp-${i}`)
  );
  return <span className="md-para">{highlighted}</span>;
}

/**
 * Code block renderer with copy button.
 */
function MdCodeBlock({ children }: { children: React.ReactNode }): React.ReactElement {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    const text = extractText(children);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [children]);

  return (
    <div className="msg-code-block">
      <button
        type="button"
        className="msg-code-copy"
        onClick={handleCopy}
        aria-label="Copy code"
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
      </button>
      <pre>{children}</pre>
    </div>
  );
}


/**
 * Renders file attachments linked to a message.
 * Images display inline; documents render as download chips.
 */
function AttachmentList({ attachments }: { attachments: Attachment[] }): React.ReactElement | null {
  if (attachments.length === 0) return null;
  return (
    <div className="msg-attachments">
      {attachments.map((att) => {
        const isImage = att.mimeType.startsWith('image/');
        if (isImage) {
          return (
            <a
              key={att.id}
              href={sanitizeHref(att.url)}
              target="_blank"
              rel="noopener noreferrer"
              className="msg-attach-img-wrap"
              aria-label={att.filename}
            >
              <img
                src={sanitizeHref(att.url)}
                alt={att.filename}
                className="msg-attach-img"
              />
            </a>
          );
        }
        return (
          <a
            key={att.id}
            href={sanitizeHref(att.url)}
            target="_blank"
            rel="noopener noreferrer"
            download={att.filename}
            className="msg-attach-chip"
            aria-label={`Download ${att.filename}`}
          >
            <FileText size={13} className="msg-attach-chip-icon" />
            <span className="msg-attach-chip-name">{att.filename}</span>
            <span className="msg-attach-chip-size">{formatBytes(att.sizeBytes)}</span>
          </a>
        );
      })}
    </div>
  );
}

function extractText(node: React.ReactNode): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (isValidElement(node)) {
    const el = node as React.ReactElement<{ children?: React.ReactNode }>;
    return extractText(el.props.children);
  }
  return '';
}

export const MessageLine = memo(function MessageLine({ message }: MessageLineProps) {
  const safeAuthor = message.author || 'unknown';
  const authorName = safeAuthor.charAt(0).toUpperCase() + safeAuthor.slice(1);
  const isHuman = message.authorType === 'human';
  const colorClass = `c-${safeAuthor.toLowerCase()}`;

  const metrics = message.authorType === 'agent' ? formatMetrics(message.metadata) : null;

  return (
    <div className={`msg${isHuman ? ' human' : ''}`}>
      <div className="msg-head">
        <span className={`msg-name ${colorClass}`}>{authorName}</span>
        <span className="msg-time">{formatTime(message.createdAt)}</span>
      </div>
      <div className="msg-text">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            // SEC-XSS-001: Block dangerous URI schemes in links
            a: ({ href, children }) => {
              const safeHref = sanitizeHref(href);
              if (!safeHref) return <span>{children}</span>;
              return (
                <a href={safeHref} target="_blank" rel="noopener noreferrer">
                  {children}
                </a>
              );
            },
            // Paragraphs inline with @mention highlighting
            p: MdParagraph,
            // Inline code
            code: ({ children, className }) => {
              const isBlock = !!className;
              if (isBlock) {
                return <code className={`md-code-block ${className ?? ''}`}>{children}</code>;
              }
              return <code className="md-code-inline">{children}</code>;
            },
            // Code blocks with copy button
            pre: ({ children }) => <MdCodeBlock>{children}</MdCodeBlock>,
            // Lists indented 30px
            ul: ({ children }) => <ul className="md-ul">{children}</ul>,
            ol: ({ children }) => <ol className="md-ol">{children}</ol>,
            // Tight list items don't go through the `p` renderer, so @mentions
            // inside list items would render as plain text. Apply highlighting here.
            li: ({ children }) => (
              <li className="md-li">{highlightMentionsInNode(children, 'li')}</li>
            ),
            // Blockquote with agent-colored left border (inherits from .msg-text)
            blockquote: ({ children }) => (
              <blockquote className="md-blockquote">{children}</blockquote>
            ),
            // Tables
            table: ({ children }) => (
              <div className="md-table-wrap">
                <table className="md-table">{children}</table>
              </div>
            ),
            th: ({ children }) => <th className="md-th">{children}</th>,
            td: ({ children }) => <td className="md-td">{children}</td>,
            hr: () => null,
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>
      {message.metadata.attachments && message.metadata.attachments.length > 0 && (
        <AttachmentList attachments={message.metadata.attachments} />
      )}
      {metrics && (
        <span className="msg-metrics">{metrics}</span>
      )}
    </div>
  );
});
