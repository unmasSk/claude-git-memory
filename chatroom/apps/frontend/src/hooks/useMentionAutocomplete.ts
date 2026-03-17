import { useState, useCallback } from 'react';
import { AGENT_REGISTRY } from '@agent-chatroom/shared';
import type { AgentDefinition } from '@agent-chatroom/shared';

interface UseMentionAutocompleteResult {
  showDropdown: boolean;
  filteredAgents: AgentDefinition[];
  selectedIndex: number;
  query: string;
  onInputChange: (value: string, cursorPos: number) => void;
  selectAgent: (agent: AgentDefinition) => string;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, value: string, cursorPos: number) => { handled: boolean; newValue?: string };
  closeDropdown: () => void;
}

/** Find the @query at the cursor position in input text */
function getMentionQuery(text: string, cursorPos: number): string | null {
  const before = text.slice(0, cursorPos);
  const match = before.match(/@(\w*)$/);
  return match ? match[1] : null;
}

/**
 * Replaces the @query at cursor with the selected agent name.
 */
function replaceMention(text: string, cursorPos: number, agentName: string): { newText: string; newCursor: number } {
  const before = text.slice(0, cursorPos);
  const after = text.slice(cursorPos);
  const replaced = before.replace(/@(\w*)$/, `@${agentName} `);
  return {
    newText: replaced + after,
    newCursor: replaced.length,
  };
}

const INVOKABLE_AGENTS = AGENT_REGISTRY.filter((a) => a.invokable);

export function useMentionAutocomplete(): UseMentionAutocompleteResult {
  const [showDropdown, setShowDropdown] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredAgents = query === ''
    ? INVOKABLE_AGENTS
    : INVOKABLE_AGENTS.filter((a) =>
        a.name.startsWith(query.toLowerCase()) ||
        a.displayName.toLowerCase().startsWith(query.toLowerCase())
      );

  const onInputChange = useCallback((value: string, cursorPos: number) => {
    const q = getMentionQuery(value, cursorPos);
    if (q !== null) {
      setQuery(q);
      setShowDropdown(true);
      setSelectedIndex(0);
    } else {
      setShowDropdown(false);
      setQuery('');
    }
  }, []);

  const selectAgent = useCallback((agent: AgentDefinition): string => {
    // Returns the agent name for insertion — caller handles the actual replacement
    setShowDropdown(false);
    setQuery('');
    return agent.name;
  }, []);

  const closeDropdown = useCallback(() => {
    setShowDropdown(false);
    setQuery('');
  }, []);

  const handleKeyDown = useCallback((
    e: React.KeyboardEvent<HTMLInputElement>,
    value: string,
    cursorPos: number,
  ): { handled: boolean; newValue?: string } => {
    if (!showDropdown || filteredAgents.length === 0) {
      return { handled: false };
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % filteredAgents.length);
      return { handled: true };
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => (i - 1 + filteredAgents.length) % filteredAgents.length);
      return { handled: true };
    }

    if (e.key === 'Enter' || e.key === 'Tab') {
      const agent = filteredAgents[selectedIndex];
      if (agent) {
        e.preventDefault();
        const { newText } = replaceMention(value, cursorPos, agent.name);
        setShowDropdown(false);
        setQuery('');
        return { handled: true, newValue: newText };
      }
    }

    if (e.key === 'Escape') {
      setShowDropdown(false);
      return { handled: true };
    }

    return { handled: false };
  }, [showDropdown, filteredAgents, selectedIndex]);

  return {
    showDropdown: showDropdown && filteredAgents.length > 0,
    filteredAgents,
    selectedIndex,
    query,
    onInputChange,
    selectAgent,
    handleKeyDown,
    closeDropdown,
  };
}

export { replaceMention };
