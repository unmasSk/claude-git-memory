import { useState, useRef, useCallback } from 'react';
import { Send } from 'lucide-react';
import { useWsStore } from '../stores/ws-store';
import { useAgentStore } from '../stores/agent-store';
import { useMentionAutocomplete, replaceMention } from '../hooks/useMentionAutocomplete';
import { MentionDropdown } from './MentionDropdown';
import type { AgentDefinition } from '@agent-chatroom/shared';

export function MessageInput() {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
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

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setValue(newVal);
    const pos = e.target.selectionStart ?? newVal.length;
    onInputChange(newVal, pos);
  }, [onInputChange]);

  const submit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || status !== 'connected') return;
    send({ type: 'send_message', content: trimmed });
    setValue('');
    closeDropdown();
  }, [value, status, send, closeDropdown]);

  // T1-01 fix: submit must be declared before this callback to avoid TDZ
  const handleKeyDownWrapper = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    const currentValue = inputRef.current?.value ?? '';
    const pos = inputRef.current?.selectionStart ?? currentValue.length;
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
    const pos = inputRef.current?.selectionStart ?? value.length;
    const { newText, newCursor } = replaceMention(value, pos, agent.name);
    setValue(newText);
    // Restore cursor after state update
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.selectionStart = newCursor;
        inputRef.current.selectionEnd = newCursor;
        inputRef.current.focus();
      }
    });
  }, [value, selectAgent]);

  return (
    <div className="input-area">
      {showDropdown && (
        <MentionDropdown
          agents={filteredAgents}
          selectedIndex={selectedIndex}
          onSelect={handleSelectAgent}
        />
      )}
      <input
        ref={inputRef}
        type="text"
        className="input-field"
        placeholder={`Message #${roomName} — use @agent to mention`}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDownWrapper}
        onBlur={closeDropdown}
        disabled={status !== 'connected'}
        autoComplete="off"
        spellCheck={false}
      />
      <button
        className="send-btn"
        onClick={submit}
        disabled={!value.trim() || status !== 'connected'}
        aria-label="Send message"
      >
        <Send size={16} />
      </button>
    </div>
  );
}
