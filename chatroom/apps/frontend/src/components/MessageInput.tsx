import '../styles/components/ChatInput.css';
import { useState, useRef, useCallback } from 'react';
import { Paperclip, Image, ArrowUp, Zap, Brain, Square, X, FileText } from 'lucide-react';
import { useWsStore } from '../stores/ws-store';
import { useAgentStore } from '../stores/agent-store';
import { AgentState } from '@agent-chatroom/shared';
import { useMentionAutocomplete, replaceMention } from '../hooks/useMentionAutocomplete';
import { MentionDropdown } from './MentionDropdown';
import type { AgentDefinition } from '@agent-chatroom/shared';
import { formatBytes } from '../lib/format';

type InputMode = 'execute' | 'brainstorm';

const MAX_FILES = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

const ACCEPTED_DOC_TYPES = '.md,.txt,.pdf,.ts,.tsx,.js,.jsx,.py,.json,.yaml,.yml';
const ACCEPTED_IMAGE_TYPES = 'image/png,image/jpeg,image/gif,image/webp';

const USER_NAME: string = import.meta.env.VITE_USER_NAME ?? 'Bex';

async function getUploadToken(): Promise<string | null> {
  try {
    const res = await fetch('/api/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: USER_NAME }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { token: string };
    return data.token;
  } catch {
    return null;
  }
}


function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

interface PendingFile {
  id: string;
  file: File;
  /** Object URL for image previews — null for docs. Revoked after send/remove. */
  previewUrl: string | null;
}

export function MessageInput() {
  const [value, setValue] = useState('');
  const [mode, setMode] = useState<InputMode>('execute');
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  // Synchronous guard against double-submit (useState is async, two Enter presses can race)
  const isSubmittingRef = useRef(false);

  const send = useWsStore((s) => s.send);
  const status = useWsStore((s) => s.status);
  const room = useAgentStore((s) => s.room);

  const {
    showDropdown,
    filteredAgents,
    selectedIndex,
    onInputChange,
    selectAgent,
    handleKeyDown,
    closeDropdown,
  } = useMentionAutocomplete();

  const _roomName = room?.name ?? 'room';

  /** Auto-resize textarea to content */
  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = '20px';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    setValue(newVal);
    autoResize(e.target);
    const pos = e.target.selectionStart ?? newVal.length;
    onInputChange(newVal, pos);
  }, [onInputChange]);

  /** Validate and merge new files into pending list. */
  const addFiles = useCallback((incoming: File[]) => {
    setFileError(null);
    const oversized = incoming.filter((f) => f.size > MAX_FILE_BYTES);
    if (oversized.length > 0) {
      setFileError(`Files must be under 10 MB. Too large: ${oversized.map((f) => f.name).join(', ')}`);
      return;
    }
    setPendingFiles((prev) => {
      const combined = [...prev, ...incoming.map((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: isImageFile(file) ? URL.createObjectURL(file) : null,
      }))];
      if (combined.length > MAX_FILES) {
        setFileError(`Maximum ${MAX_FILES} files per message.`);
        // Revoke object URLs for the rejected extras
        combined.slice(MAX_FILES).forEach((pf) => {
          if (pf.previewUrl) URL.revokeObjectURL(pf.previewUrl);
        });
        return combined.slice(0, MAX_FILES);
      }
      return combined;
    });
  }, []);

  const removeFile = useCallback((index: number) => {
    setPendingFiles((prev) => {
      const pf = prev[index];
      if (pf?.previewUrl) URL.revokeObjectURL(pf.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
    setFileError(null);
  }, []);

  /** Upload a single file and return its attachment ID, or null on failure. */
  const uploadFile = useCallback(async (pf: PendingFile, roomId: string, token: string): Promise<string | null> => {
    try {
      const body = new FormData();
      body.append('file', pf.file);
      const res = await fetch(`/api/rooms/${roomId}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { attachment: { id: string } };
      return data.attachment.id;
    } catch {
      return null;
    }
  }, []);

  const submit = useCallback(async () => {
    const trimmed = value.trim();
    if ((!trimmed && pendingFiles.length === 0) || status !== 'connected') return;
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    try {
      let attachmentIds: string[] | undefined;

      if (pendingFiles.length > 0) {
        const roomId = room?.id;
        if (!roomId) {
          setFileError('No active room — cannot upload files.');
          return;
        }
        setIsUploading(true);
        try {
          const results: (string | null)[] = [];
          for (const pf of pendingFiles) {
            const token = await getUploadToken();
            if (!token) {
              setFileError('Could not obtain upload token. Try again.');
              pendingFiles.forEach((p) => { if (p.previewUrl) URL.revokeObjectURL(p.previewUrl); });
              setPendingFiles([]);
              return;
            }
            results.push(await uploadFile(pf, roomId, token));
          }
          const failed = results.filter((id) => id === null).length;
          if (failed > 0) {
            setFileError(`${failed} file(s) failed to upload. Message not sent.`);
            pendingFiles.forEach((p) => { if (p.previewUrl) URL.revokeObjectURL(p.previewUrl); });
            setPendingFiles([]);
            return;
          }
          attachmentIds = results as string[];
        } finally {
          setIsUploading(false);
        }
      }

      // Build and send the WS message
      send({
        type: 'send_message',
        content: trimmed || ' ',
        ...(attachmentIds && attachmentIds.length > 0 ? { attachmentIds } : {}),
      });

      // Cleanup
      pendingFiles.forEach((pf) => {
        if (pf.previewUrl) URL.revokeObjectURL(pf.previewUrl);
      });
      setPendingFiles([]);
      setFileError(null);
      setValue('');
      closeDropdown();
      if (textareaRef.current) {
        textareaRef.current.style.height = '20px';
      }
    } finally {
      isSubmittingRef.current = false;
    }
  }, [value, pendingFiles, status, room, send, closeDropdown, uploadFile]);

  // T1-01 fix: submit must be declared before this callback to avoid TDZ
  const handleKeyDownWrapper = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => { // HTMLTextAreaElement extends HTMLElement — no cast needed
    const currentValue = textareaRef.current?.value ?? '';
    const pos = textareaRef.current?.selectionStart ?? currentValue.length;
    const result = handleKeyDown(e, currentValue, pos);
    if (result.handled) {
      if (result.newValue !== undefined) {
        setValue(result.newValue);
      }
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  }, [handleKeyDown, submit]);

  const handleSelectAgent = useCallback((agent: AgentDefinition) => {
    selectAgent(agent);
    const pos = textareaRef.current?.selectionStart ?? value.length;
    const { newText, newCursor } = replaceMention(value, pos, agent.name);
    setValue(newText);
    // Restore cursor after state update
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = newCursor;
        textareaRef.current.selectionEnd = newCursor;
        textareaRef.current.focus();
      }
    });
  }, [value, selectAgent]);

  function toggleMode() {
    setMode((m) => (m === 'execute' ? 'brainstorm' : 'execute'));
  }

  const stopAll = useCallback(() => {
    const agents = useAgentStore.getState().agents;
    const ACTIVE = new Set<AgentState>([AgentState.Thinking, AgentState.ToolUse, AgentState.Paused]);
    for (const [name, agent] of agents) {
      if (ACTIVE.has(agent.status)) {
        send({ type: 'kill_agent', agentName: name });
      }
    }
  }, [send]);

  // --- Paste handler ---
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = e.clipboardData.files;
    if (files.length === 0) return;
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;
    e.preventDefault();
    addFiles(imageFiles);
  }, [addFiles]);

  // --- Drag & drop handlers ---
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    // Only clear if leaving the container, not a child element
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    addFiles(files);
  }, [addFiles]);

  // --- File input handlers ---
  const handleDocInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) addFiles(files);
    // Reset so same file can be re-selected
    e.target.value = '';
  }, [addFiles]);

  const handleImageInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) addFiles(files);
    e.target.value = '';
  }, [addFiles]);

  const canSend = (value.trim().length > 0 || pendingFiles.length > 0) && status === 'connected' && !isUploading;

  return (
    <div className="chat-input">
      {showDropdown && (
        <MentionDropdown
          agents={filteredAgents}
          selectedIndex={selectedIndex}
          onSelect={handleSelectAgent}
        />
      )}

      {/* Hidden file inputs */}
      <input
        ref={docInputRef}
        type="file"
        accept={ACCEPTED_DOC_TYPES}
        multiple
        style={{ display: 'none' }}
        onChange={handleDocInputChange}
        aria-hidden="true"
      />
      <input
        ref={imageInputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        multiple
        style={{ display: 'none' }}
        onChange={handleImageInputChange}
        aria-hidden="true"
      />

      <div
        className={`input-box${isDragOver ? ' input-box-dragover' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Attachment preview area */}
        {pendingFiles.length > 0 && (
          <div className="attach-preview">
            {pendingFiles.map((pf, i) => (
              pf.previewUrl ? (
                <div key={pf.id} className="attach-thumb">
                  <img src={pf.previewUrl} alt={pf.file.name} className="attach-thumb-img" />
                  <button
                    type="button"
                    className="attach-remove"
                    onClick={() => removeFile(i)}
                    aria-label={`Remove ${pf.file.name}`}
                  >
                    <X size={10} />
                  </button>
                </div>
              ) : (
                <div key={pf.id} className="attach-chip">
                  <FileText size={12} className="attach-chip-icon" />
                  <span className="attach-chip-name">{pf.file.name}</span>
                  <span className="attach-chip-size">{formatBytes(pf.file.size)}</span>
                  <button
                    type="button"
                    className="attach-remove"
                    onClick={() => removeFile(i)}
                    aria-label={`Remove ${pf.file.name}`}
                  >
                    <X size={10} />
                  </button>
                </div>
              )
            ))}
          </div>
        )}

        {fileError && (
          <div className="attach-error">{fileError}</div>
        )}

        <textarea
          ref={textareaRef}
          placeholder="Message... @ for agents, @everyone for all active agents"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDownWrapper}
          onBlur={closeDropdown}
          onPaste={handlePaste}
          disabled={status !== 'connected'}
          autoComplete="off"
          spellCheck={false}
          rows={1}
        />

        <div className="input-bottom">
          <div className="input-controls">
            <button
              className={`mode-badge ${mode === 'execute' ? 'mode-execute' : 'mode-brainstorm'}`}
              onClick={toggleMode}
              type="button"
              aria-label="Toggle input mode"
            >
              {mode === 'execute' ? <Zap size={14} /> : <Brain size={14} />}
              <span className="mode-label">{mode === 'execute' ? 'Execute' : 'Brainstorm'}</span>
            </button>
            <button
              className="input-icon-btn stop-btn"
              type="button"
              onClick={stopAll}
              disabled={status !== 'connected'}
              aria-label="Stop all agents"
              title="Stop all active agents"
            >
              <Square size={13} />
            </button>
          </div>

          <div className="input-icons">
            <button
              className="input-icon-btn"
              type="button"
              aria-label="Attach file"
              style={{ marginRight: '-6px' }}
              onClick={() => docInputRef.current?.click()}
              disabled={status !== 'connected'}
              title="Attach document"
            >
              <Paperclip size={14} />
            </button>
            <button
              className="input-icon-btn"
              type="button"
              aria-label="Attach image"
              onClick={() => imageInputRef.current?.click()}
              disabled={status !== 'connected'}
              title="Attach image"
            >
              <Image size={14} />
            </button>
            <button
              className={`input-icon-btn send-btn ${mode === 'brainstorm' ? 'send-brainstorm' : ''}`}
              type="button"
              onClick={() => void submit()}
              disabled={!canSend}
              aria-label="Send message"
            >
              <ArrowUp size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
