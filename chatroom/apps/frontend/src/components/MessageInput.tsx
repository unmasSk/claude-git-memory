import '../styles/components/ChatInput.css';
import { useState, useRef, useCallback } from 'react';
import { Paperclip, Image, ArrowRight, Zap, Brain } from 'lucide-react';
import { useWsStore } from '../stores/ws-store';
import { useAgentStore } from '../stores/agent-store';
import { useMentionAutocomplete, replaceMention } from '../hooks/useMentionAutocomplete';
import { MentionDropdown } from './MentionDropdown';
import type { AgentDefinition } from '@agent-chatroom/shared';

type InputMode = 'execute' | 'brainstorm';

export function MessageInput() {
  const [value, setValue] = useState('');
  const [mode, setMode] = useState<InputMode>('execute');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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

  const roomName = room?.name ?? 'room';

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

  const submit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || status !== 'connected') return;
    send({ type: 'send_message', content: trimmed });
    setValue('');
    closeDropdown();
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = '20px';
    }
  }, [value, status, send, closeDropdown]);

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
      submit();
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

  return (
    <div className="chat-input">
      {showDropdown && (
        <MentionDropdown
          agents={filteredAgents}
          selectedIndex={selectedIndex}
          onSelect={handleSelectAgent}
        />
      )}

      <div className="input-box">
        <textarea
          ref={textareaRef}
          placeholder="Message... @ for agents, @everyone for all active agents"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDownWrapper}
          onBlur={closeDropdown}
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
              {mode === 'execute' ? 'Execute' : 'Brainstorm'}
            </button>
          </div>

          <div className="input-icons">
            <button className="input-icon-btn" type="button" aria-label="Attach file" style={{ marginRight: '-6px' }}>
              <Paperclip size={14} />
            </button>
            <button className="input-icon-btn" type="button" aria-label="Attach image">
              <Image size={14} />
            </button>
            <button
              className="input-icon-btn send-btn"
              type="button"
              onClick={submit}
              disabled={!value.trim() || status !== 'connected'}
              aria-label="Send message"
            >
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
