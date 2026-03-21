/**
 * Unit tests for useRoomStore — room management Zustand store.
 *
 * Fetch is mocked globally. Each test resets store state via act().
 *
 * NOTE: createRoom and confirmDelete call getAuthToken() first (POST /api/auth/token)
 * before the main operation. Every fetch spy must mock TWO sequential responses:
 *   1. Token response: { token: 'test-token' } 200
 *   2. The actual operation response
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import { useRoomStore } from '../../stores/room-store';
import type { Room } from '@agent-chatroom/shared';

function makeRoom(id: string, name = id): Room {
  return { id, name, topic: '', createdAt: new Date().toISOString() };
}

function resetStore() {
  useRoomStore.setState({ rooms: [], activeRoomId: 'default', pendingDeleteId: null });
}

/** Mock a successful token response followed by an operation response. */
function mockTokenThen(operationResponse: Response): void {
  const fetchSpy = vi.spyOn(globalThis, 'fetch');
  fetchSpy.mockResolvedValueOnce(
    new Response(JSON.stringify({ token: 'test-token' }), { status: 200 }),
  );
  fetchSpy.mockResolvedValueOnce(operationResponse);
}

beforeEach(() => {
  vi.restoreAllMocks();
  resetStore();
});

// ---------------------------------------------------------------------------
// loadRooms — no auth required, single fetch
// ---------------------------------------------------------------------------

describe('loadRooms', () => {
  it('populates rooms from API response', async () => {
    const mockRooms = [makeRoom('default'), makeRoom('swift-falcon')];
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockRooms), { status: 200 }),
    );

    await act(() => useRoomStore.getState().loadRooms());

    expect(useRoomStore.getState().rooms).toHaveLength(2);
    expect(useRoomStore.getState().rooms[1]!.id).toBe('swift-falcon');
  });

  it('leaves rooms unchanged when fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('network'));

    await act(() => useRoomStore.getState().loadRooms());

    expect(useRoomStore.getState().rooms).toHaveLength(0);
  });

  it('leaves rooms unchanged on non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Internal Server Error', { status: 500 }),
    );

    await act(() => useRoomStore.getState().loadRooms());

    expect(useRoomStore.getState().rooms).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// createRoom — calls getAuthToken() first, then POST /api/rooms
// ---------------------------------------------------------------------------

describe('createRoom', () => {
  it('adds the new room to the list and activates it', async () => {
    const newRoom = makeRoom('brave-wolf');
    mockTokenThen(new Response(JSON.stringify({ room: newRoom }), { status: 201 }));

    const result = await act(() => useRoomStore.getState().createRoom());

    expect(result).toEqual(newRoom);
    expect(useRoomStore.getState().rooms).toContainEqual(newRoom);
    expect(useRoomStore.getState().activeRoomId).toBe('brave-wolf');
  });

  it('returns null when token fetch throws (network failure)', async () => {
    // Token fetch fails → catch → return null
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('network'));

    const result = await act(() => useRoomStore.getState().createRoom());

    expect(result).toBeNull();
    expect(useRoomStore.getState().rooms).toHaveLength(0);
    expect(useRoomStore.getState().activeRoomId).toBe('default');
  });

  it('returns null when token fetch returns non-ok', async () => {
    // Token endpoint returns 500 → getAuthToken returns null → createRoom returns null
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('error', { status: 500 }),
    );

    const result = await act(() => useRoomStore.getState().createRoom());

    expect(result).toBeNull();
  });

  it('returns null when room creation returns non-ok', async () => {
    // Token succeeds, room POST fails
    mockTokenThen(new Response('error', { status: 500 }));

    const result = await act(() => useRoomStore.getState().createRoom());

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// setActiveRoomId — no fetch
// ---------------------------------------------------------------------------

describe('setActiveRoomId', () => {
  it('changes active room', () => {
    useRoomStore.setState({ activeRoomId: 'default' });
    useRoomStore.getState().setActiveRoomId('brave-wolf');
    expect(useRoomStore.getState().activeRoomId).toBe('brave-wolf');
  });

  it('clears pendingDeleteId when switching rooms', () => {
    useRoomStore.setState({ pendingDeleteId: 'some-room' });
    useRoomStore.getState().setActiveRoomId('brave-wolf');
    expect(useRoomStore.getState().pendingDeleteId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// markForDelete / cancelDelete — no fetch
// ---------------------------------------------------------------------------

describe('markForDelete', () => {
  it('sets pendingDeleteId', () => {
    useRoomStore.getState().markForDelete('swift-falcon');
    expect(useRoomStore.getState().pendingDeleteId).toBe('swift-falcon');
  });

  it('does nothing for the default room', () => {
    useRoomStore.getState().markForDelete('default');
    expect(useRoomStore.getState().pendingDeleteId).toBeNull();
  });
});

describe('cancelDelete', () => {
  it('clears pendingDeleteId', () => {
    useRoomStore.setState({ pendingDeleteId: 'swift-falcon' });
    useRoomStore.getState().cancelDelete();
    expect(useRoomStore.getState().pendingDeleteId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// confirmDelete — calls getAuthToken() first, then DELETE /api/rooms/:id
// ---------------------------------------------------------------------------

describe('confirmDelete', () => {
  it('removes the room from the list on success', async () => {
    const room = makeRoom('silent-hawk');
    useRoomStore.setState({ rooms: [makeRoom('default'), room], activeRoomId: 'default' });
    mockTokenThen(new Response(JSON.stringify({ deleted: 'silent-hawk' }), { status: 200 }));

    await act(() => useRoomStore.getState().confirmDelete('silent-hawk'));

    expect(useRoomStore.getState().rooms.find((r) => r.id === 'silent-hawk')).toBeUndefined();
    expect(useRoomStore.getState().pendingDeleteId).toBeNull();
  });

  it('falls back to default when active room is deleted', async () => {
    const room = makeRoom('silent-hawk');
    useRoomStore.setState({ rooms: [makeRoom('default'), room], activeRoomId: 'silent-hawk' });
    mockTokenThen(new Response(JSON.stringify({ deleted: 'silent-hawk' }), { status: 200 }));

    await act(() => useRoomStore.getState().confirmDelete('silent-hawk'));

    expect(useRoomStore.getState().activeRoomId).toBe('default');
  });

  it('keeps active room if a different room is deleted', async () => {
    const roomA = makeRoom('room-a');
    const roomB = makeRoom('room-b');
    useRoomStore.setState({ rooms: [makeRoom('default'), roomA, roomB], activeRoomId: 'room-a' });
    mockTokenThen(new Response(JSON.stringify({ deleted: 'room-b' }), { status: 200 }));

    await act(() => useRoomStore.getState().confirmDelete('room-b'));

    expect(useRoomStore.getState().activeRoomId).toBe('room-a');
  });

  it('does nothing for the default room — no fetch called', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    await act(() => useRoomStore.getState().confirmDelete('default'));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('clears pendingDeleteId when DELETE fetch throws', async () => {
    // getAuthToken() catches internally and returns null on token failure — does NOT re-throw.
    // The only path to the catch in confirmDelete is: token succeeds, DELETE fetch throws.
    useRoomStore.setState({ pendingDeleteId: 'swift-falcon' });
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ token: 'test-token' }), { status: 200 }),
    );
    fetchSpy.mockRejectedValueOnce(new Error('network'));

    await act(() => useRoomStore.getState().confirmDelete('swift-falcon'));

    expect(useRoomStore.getState().pendingDeleteId).toBeNull();
  });

  it('does not remove room when DELETE returns non-ok', async () => {
    const room = makeRoom('silent-hawk');
    useRoomStore.setState({ rooms: [makeRoom('default'), room] });
    mockTokenThen(new Response('error', { status: 500 }));

    await act(() => useRoomStore.getState().confirmDelete('silent-hawk'));

    expect(useRoomStore.getState().rooms.find((r) => r.id === 'silent-hawk')).toBeDefined();
  });

  it('clears pendingDeleteId when DELETE returns non-ok (SUGG-001)', async () => {
    // Bug confirmed by Moriarty: if (!res.ok) return — pendingDeleteId is never cleared on HTTP errors
    // A 404 (already deleted) or 429 (rate limited) would leave the UI stuck in "pending delete" state permanently.
    useRoomStore.setState({ pendingDeleteId: 'silent-hawk', rooms: [makeRoom('silent-hawk')] });
    mockTokenThen(new Response('Not Found', { status: 404 }));

    await act(() => useRoomStore.getState().confirmDelete('silent-hawk'));

    expect(useRoomStore.getState().pendingDeleteId).toBeNull();
  });
});
