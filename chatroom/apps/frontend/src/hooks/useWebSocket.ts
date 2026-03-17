import { useEffect, useRef } from 'react';
import { useWsStore } from '../stores/ws-store';

interface UseWebSocketResult {
  connected: boolean;
  send: (msg: import('@agent-chatroom/shared').ClientMessage) => void;
}

/**
 * Connects to the WebSocket on mount, disconnects on unmount.
 * Returns connection status and send function.
 *
 * StrictMode double-mount protection: React dev mode mounts, unmounts, then
 * remounts every component. Without protection the cleanup fires disconnect()
 * while the WebSocket is still opening, producing "WebSocket is closed before
 * the connection is established". We delay the disconnect by 100ms so that if
 * a remount arrives within that window (StrictMode only) the pending timeout
 * is cancelled and the connection survives. On true unmount (no remount) the
 * timeout runs normally and the socket is closed.
 */
export function useWebSocket(roomId: string): UseWebSocketResult {
  const connect = useWsStore((s) => s.connect);
  const disconnect = useWsStore((s) => s.disconnect);
  const status = useWsStore((s) => s.status);
  const send = useWsStore((s) => s.send);
  const cleanupRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    // Cancel any pending disconnect that was scheduled by the previous
    // cleanup (i.e. the StrictMode unmount that immediately precedes this
    // remount). If we let it run it would close the socket we just opened.
    if (cleanupRef.current !== undefined) {
      clearTimeout(cleanupRef.current);
      cleanupRef.current = undefined;
    }

    connect(roomId);

    return () => {
      // Schedule disconnect. If the component remounts within 100ms (StrictMode
      // dev double-mount) the effect above will cancel this timeout. On a real
      // unmount no remount follows and the socket is closed after the delay.
      cleanupRef.current = setTimeout(() => {
        cleanupRef.current = undefined;
        disconnect();
      }, 100);
    };
  }, [roomId, connect, disconnect]);

  return {
    connected: status === 'connected',
    send,
  };
}
