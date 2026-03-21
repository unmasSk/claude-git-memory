/**
 * useMentionAutocomplete tests.
 *
 * We test the pure helper functions (getMentionQuery, replaceMention)
 * and the hook via renderHook from @testing-library/react.
 */
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMentionAutocomplete, replaceMention } from '../../hooks/useMentionAutocomplete';
import { AGENT_REGISTRY } from '@agent-chatroom/shared';

// Derived from the hook's source so tests stay in sync with production values
const INVOKABLE_NAMES = AGENT_REGISTRY
  .filter((a) => a.invokable)
  .map((a) => a.name);

// -------------------------------------------------------------------------
// replaceMention — pure function unit tests
// -------------------------------------------------------------------------
describe('replaceMention', () => {
  it('replaces a trailing @query with @agentName and a trailing space', () => {
    const { newText } = replaceMention('hello @bi', 9, 'bilbo');
    expect(newText).toBe('hello @bilbo ');
  });

  it('newCursor points to the character after the inserted space', () => {
    const { newCursor } = replaceMention('hello @bi', 9, 'bilbo');
    expect(newCursor).toBe('hello @bilbo '.length);
  });

  it('preserves text after the cursor position', () => {
    const { newText } = replaceMention('say @da world', 7, 'dante');
    expect(newText).toBe('say @dante  world');
  });

  it('replaces an empty @ (bare @) with @agentName space', () => {
    const { newText } = replaceMention('@', 1, 'claude');
    expect(newText).toBe('@claude ');
  });
});

// -------------------------------------------------------------------------
// useMentionAutocomplete hook
// -------------------------------------------------------------------------
describe('useMentionAutocomplete — @mention detection', () => {
  it('showDropdown is false initially', () => {
    const { result } = renderHook(() => useMentionAutocomplete());
    expect(result.current.showDropdown).toBe(false);
  });

  it('showDropdown becomes true when @ is typed', () => {
    const { result } = renderHook(() => useMentionAutocomplete());
    act(() => result.current.onInputChange('@', 1));
    expect(result.current.showDropdown).toBe(true);
  });

  it('query is set to the text after @', () => {
    const { result } = renderHook(() => useMentionAutocomplete());
    act(() => result.current.onInputChange('@bi', 3));
    expect(result.current.query).toBe('bi');
  });

  it('showDropdown is false when there is no @ before the cursor', () => {
    const { result } = renderHook(() => useMentionAutocomplete());
    act(() => result.current.onInputChange('@bi', 3));
    act(() => result.current.onInputChange('hello world', 11));
    expect(result.current.showDropdown).toBe(false);
  });
});

describe('useMentionAutocomplete — filtering', () => {
  it('empty query returns all autocomplete entries (invokable + everyone)', () => {
    const { result } = renderHook(() => useMentionAutocomplete());
    act(() => result.current.onInputChange('@', 1));
    // invokable agents + 1 everyone entry
    expect(result.current.filteredAgents.length).toBe(INVOKABLE_NAMES.length + 1);
  });

  it('filters agents whose name starts with the query', () => {
    const { result } = renderHook(() => useMentionAutocomplete());
    act(() => result.current.onInputChange('@bil', 4));
    const names = result.current.filteredAgents.map((a) => a.name);
    expect(names).toContain('bilbo');
    expect(names.every((n) => n.startsWith('bil') || n.toLowerCase().startsWith('bil'))).toBe(true);
  });

  it('filters "everyone" entry when query matches "every"', () => {
    const { result } = renderHook(() => useMentionAutocomplete());
    act(() => result.current.onInputChange('@every', 6));
    const names = result.current.filteredAgents.map((a) => a.name);
    expect(names).toContain('everyone');
  });

  it('returns empty filteredAgents for a non-matching query', () => {
    const { result } = renderHook(() => useMentionAutocomplete());
    act(() => result.current.onInputChange('@zzznomatch', 10));
    expect(result.current.filteredAgents).toHaveLength(0);
    // showDropdown must be false when filteredAgents is empty
    expect(result.current.showDropdown).toBe(false);
  });
});

describe('useMentionAutocomplete — selection via selectAgent', () => {
  it('selectAgent closes the dropdown', () => {
    const { result } = renderHook(() => useMentionAutocomplete());
    act(() => result.current.onInputChange('@', 1));
    expect(result.current.showDropdown).toBe(true);
    act(() => result.current.selectAgent(result.current.filteredAgents[0]));
    expect(result.current.showDropdown).toBe(false);
  });

  it('selectAgent returns the agent name', () => {
    const { result } = renderHook(() => useMentionAutocomplete());
    act(() => result.current.onInputChange('@', 1));
    const agent = result.current.filteredAgents[0];
    let returned: string | undefined;
    act(() => { returned = result.current.selectAgent(agent); });
    expect(returned).toBe(agent.name);
  });

  it('closeDropdown hides the dropdown and clears query', () => {
    const { result } = renderHook(() => useMentionAutocomplete());
    act(() => result.current.onInputChange('@bi', 3));
    act(() => result.current.closeDropdown());
    expect(result.current.showDropdown).toBe(false);
    expect(result.current.query).toBe('');
  });
});

describe('useMentionAutocomplete — keyboard navigation', () => {
  function makeKeyEvent(key: string): React.KeyboardEvent<HTMLElement> {
    return {
      key,
      preventDefault: () => {},
    } as unknown as React.KeyboardEvent<HTMLElement>;
  }

  it('ArrowDown increments selectedIndex', () => {
    const { result } = renderHook(() => useMentionAutocomplete());
    act(() => result.current.onInputChange('@', 1));
    const initial = result.current.selectedIndex;
    act(() => result.current.handleKeyDown(makeKeyEvent('ArrowDown'), '@', 1));
    expect(result.current.selectedIndex).toBe((initial + 1) % result.current.filteredAgents.length);
  });

  it('ArrowUp wraps selectedIndex to the last item from 0', () => {
    const { result } = renderHook(() => useMentionAutocomplete());
    act(() => result.current.onInputChange('@', 1));
    const total = result.current.filteredAgents.length;
    act(() => result.current.handleKeyDown(makeKeyEvent('ArrowUp'), '@', 1));
    expect(result.current.selectedIndex).toBe(total - 1);
  });

  it('Enter returns handled:true and newValue with the replaced mention', () => {
    const { result } = renderHook(() => useMentionAutocomplete());
    act(() => result.current.onInputChange('@bil', 4));
    let res: { handled: boolean; newValue?: string } | undefined;
    act(() => {
      res = result.current.handleKeyDown(makeKeyEvent('Enter'), '@bil', 4);
    });
    expect(res?.handled).toBe(true);
    expect(res?.newValue).toContain('@bilbo');
  });

  it('Enter closes the dropdown', () => {
    const { result } = renderHook(() => useMentionAutocomplete());
    act(() => result.current.onInputChange('@bil', 4));
    act(() => result.current.handleKeyDown(makeKeyEvent('Enter'), '@bil', 4));
    expect(result.current.showDropdown).toBe(false);
  });

  it('Escape closes the dropdown and returns handled:true', () => {
    const { result } = renderHook(() => useMentionAutocomplete());
    act(() => result.current.onInputChange('@', 1));
    let res: { handled: boolean } | undefined;
    act(() => { res = result.current.handleKeyDown(makeKeyEvent('Escape'), '@', 1); });
    expect(res?.handled).toBe(true);
    expect(result.current.showDropdown).toBe(false);
  });

  it('handleKeyDown returns handled:false when dropdown is closed', () => {
    const { result } = renderHook(() => useMentionAutocomplete());
    // dropdown is not open
    const res = result.current.handleKeyDown(makeKeyEvent('ArrowDown'), 'hello', 5);
    expect(res.handled).toBe(false);
  });
});
