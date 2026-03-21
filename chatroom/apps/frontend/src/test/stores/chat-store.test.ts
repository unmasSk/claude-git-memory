import { describe, it, expect, beforeEach } from 'vitest';
import type { Message } from '@agent-chatroom/shared';

// Import the store after each reset to get a fresh seenIds set.
// Because chat-store uses a module-level seenIds Set, we reset it via
// clearMessages() between tests rather than re-importing the module.
import { useChatStore } from '../../stores/chat-store';

function makeMsg(id: string, content = 'hello'): Message {
  return {
    id,
    roomId: 'default',
    author: 'user',
    authorType: 'human',
    content,
    msgType: 'message',
    parentId: null,
    metadata: {},
    createdAt: new Date().toISOString(),
  };
}

describe('chat-store — dedup logic', () => {
  beforeEach(() => {
    // clearMessages resets both the zustand state and the module-level seenIds set
    useChatStore.getState().clearMessages();
  });

  it('appendMessage adds a new message to the list', () => {
    const msg = makeMsg('msg-1');
    useChatStore.getState().appendMessage(msg);
    expect(useChatStore.getState().messages).toHaveLength(1);
    expect(useChatStore.getState().messages[0].id).toBe('msg-1');
  });

  it('appendMessage silently drops a duplicate id', () => {
    const msg = makeMsg('msg-dup');
    useChatStore.getState().appendMessage(msg);
    useChatStore.getState().appendMessage(msg);
    expect(useChatStore.getState().messages).toHaveLength(1);
  });

  it('appendMessages adds only fresh messages from a batch', () => {
    useChatStore.getState().appendMessage(makeMsg('a'));
    useChatStore.getState().appendMessages([makeMsg('a'), makeMsg('b'), makeMsg('c')]);
    const ids = useChatStore.getState().messages.map((m) => m.id);
    expect(ids).toEqual(['a', 'b', 'c']);
  });

  it('appendMessages is a no-op when all ids have been seen', () => {
    useChatStore.getState().appendMessage(makeMsg('x'));
    const before = useChatStore.getState().messages.length;
    useChatStore.getState().appendMessages([makeMsg('x')]);
    expect(useChatStore.getState().messages.length).toBe(before);
  });

  it('appendMessages preserves order: existing messages come before new ones', () => {
    useChatStore.getState().appendMessages([makeMsg('first'), makeMsg('second')]);
    useChatStore.getState().appendMessages([makeMsg('third')]);
    const ids = useChatStore.getState().messages.map((m) => m.id);
    expect(ids).toEqual(['first', 'second', 'third']);
  });

  it('prependHistory inserts messages before existing ones', () => {
    useChatStore.getState().appendMessage(makeMsg('new'));
    useChatStore.getState().prependHistory([makeMsg('old-1'), makeMsg('old-2')], false);
    const ids = useChatStore.getState().messages.map((m) => m.id);
    expect(ids).toEqual(['old-1', 'old-2', 'new']);
  });

  it('prependHistory deduplicates against already-seen ids', () => {
    useChatStore.getState().appendMessage(makeMsg('shared'));
    useChatStore.getState().prependHistory([makeMsg('shared'), makeMsg('older')], true);
    const ids = useChatStore.getState().messages.map((m) => m.id);
    expect(ids).toEqual(['older', 'shared']);
  });

  it('prependHistory sets hasMoreHistory from the server flag', () => {
    useChatStore.getState().prependHistory([makeMsg('p1')], true);
    expect(useChatStore.getState().hasMoreHistory).toBe(true);
    useChatStore.getState().prependHistory([makeMsg('p2')], false);
    expect(useChatStore.getState().hasMoreHistory).toBe(false);
  });

  it('prependHistory sets isLoadingHistory to false', () => {
    useChatStore.getState().setLoadingHistory(true);
    useChatStore.getState().prependHistory([makeMsg('p3')], false);
    expect(useChatStore.getState().isLoadingHistory).toBe(false);
  });

  it('clearMessages empties the list and resets hasMoreHistory', () => {
    useChatStore.getState().appendMessages([makeMsg('a'), makeMsg('b')]);
    useChatStore.getState().clearMessages();
    expect(useChatStore.getState().messages).toHaveLength(0);
    expect(useChatStore.getState().hasMoreHistory).toBe(false);
  });

  it('clearMessages resets the seenIds set so the same id can be re-added', () => {
    useChatStore.getState().appendMessage(makeMsg('reusable'));
    useChatStore.getState().clearMessages();
    useChatStore.getState().appendMessage(makeMsg('reusable'));
    expect(useChatStore.getState().messages).toHaveLength(1);
  });

  it('setLoadingHistory updates isLoadingHistory', () => {
    useChatStore.getState().setLoadingHistory(true);
    expect(useChatStore.getState().isLoadingHistory).toBe(true);
    useChatStore.getState().setLoadingHistory(false);
    expect(useChatStore.getState().isLoadingHistory).toBe(false);
  });
});
