import { useEffect, useRef, useState, memo, useCallback } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { useChatStore } from '../stores/chat-store';
import { useAgentStore } from '../stores/agent-store';
import { useWsStore } from '../stores/ws-store';
import { AgentState } from '@agent-chatroom/shared';
import { MessageLine } from './MessageLine';
import { ToolLine } from './ToolLine';
import { SystemMessage, QueueGroup } from './SystemMessage';
import type { Message } from '@agent-chatroom/shared';

type GroupedItem =
  | { kind: 'single'; msg: Message }
  | { kind: 'queue-group'; messages: Message[]; id: string };

function isQueueMsg(msg: Message): boolean {
  return msg.msgType === 'system' && /queued|queue/i.test(msg.content);
}

function groupMessages(msgs: Message[]): GroupedItem[] {
  const result: GroupedItem[] = [];
  let i = 0;
  while (i < msgs.length) {
    const msg = msgs[i]!;
    if (isQueueMsg(msg)) {
      const group: Message[] = [msg];
      while (i + 1 < msgs.length && isQueueMsg(msgs[i + 1]!)) {
        i++;
        group.push(msgs[i]!);
      }
      if (group.length === 1) {
        result.push({ kind: 'single', msg: group[0]! });
      } else {
        result.push({ kind: 'queue-group', messages: group, id: `qg-${group[0]!.id}` });
      }
    } else {
      result.push({ kind: 'single', msg });
    }
    i++;
  }
  return result;
}

function renderItem(item: GroupedItem) {
  if (item.kind === 'queue-group') {
    return <QueueGroup key={item.id} messages={item.messages} />;
  }
  const msg = item.msg;
  switch (msg.msgType) {
    case 'tool_use':
      return <ToolLine key={msg.id} message={msg} />;
    case 'system':
      return <SystemMessage key={msg.id} message={msg} />;
    default:
      return <MessageLine key={msg.id} message={msg} />;
  }
}

/** Animated thinking dots for an agent that is currently processing */
function ThinkingDots({ agentName }: { agentName: string }) {
  const colorClass = `c-${agentName.toLowerCase()}`;
  const label = agentName.charAt(0).toUpperCase() + agentName.slice(1);
  return (
    <div className="thinking">
      <span className={`t-name ${colorClass}`}>{label}</span>
      <div className="t-dots">
        <span className={colorClass} style={{ backgroundColor: 'currentColor' }} />
        <span className={colorClass} style={{ backgroundColor: 'currentColor' }} />
        <span className={colorClass} style={{ backgroundColor: 'currentColor' }} />
      </div>
    </div>
  );
}

export const MessageList = memo(function MessageList() {
  const messages = useChatStore((s) => s.messages);
  const hasMoreHistory = useChatStore((s) => s.hasMoreHistory);
  const isLoadingHistory = useChatStore((s) => s.isLoadingHistory);
  const setLoadingHistory = useChatStore((s) => s.setLoadingHistory);
  const agents = useAgentStore((s) => s.agents);
  const send = useWsStore((s) => s.send);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isScrollLocked, setIsScrollLocked] = useState(false);
  const prevLengthRef = useRef(messages.length);
  // Captured scrollHeight before prepend — used to restore scroll position
  const prevScrollHeightRef = useRef<number | null>(null);
  // True while a history prepend is in flight — gates scroll-restore vs auto-scroll-to-bottom
  const isPrependingRef = useRef(false);
  // Timeout ID for the history-loading guard (F-001)
  const historyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Timestamp of the last load_history send — enforces a 1000ms minimum interval (SEC-LOW-001)
  const lastHistoryRequestRef = useRef<number>(0);

  // Agents currently thinking
  const thinkingAgents = Array.from(agents.values()).filter(
    (a) => a.status === AgentState.Thinking
  );

  // Scroll to bottom on new messages — unless user scrolled up or a prepend is in progress
  useEffect(() => {
    const didGrow = messages.length > prevLengthRef.current;

    if (isPrependingRef.current) {
      // Messages were prepended — restore scroll position so the user stays
      // at the same message they were reading, not snapped to the top.
      // Also clear the timeout guard since history arrived successfully.
      if (historyTimeoutRef.current !== null) {
        clearTimeout(historyTimeoutRef.current);
        historyTimeoutRef.current = null;
      }
      const el = containerRef.current;
      if (el && prevScrollHeightRef.current !== null) {
        const delta = el.scrollHeight - prevScrollHeightRef.current;
        el.scrollTop = el.scrollTop + delta;
      }
      prevScrollHeightRef.current = null;
      isPrependingRef.current = false;
    } else if (didGrow && !isScrollLocked) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }

    prevLengthRef.current = messages.length;
  }, [messages.length, isScrollLocked]);

  // T3: extract stable scalar so the IntersectionObserver does not disconnect/reconnect
  // on every incoming message (which changes the array reference but not the cursor ID).
  const firstMessageId = messages[0]?.id;

  // Load history when sentinel scrolls into view
  const loadHistory = useCallback(() => {
    if (!hasMoreHistory || isLoadingHistory) return;
    if (!firstMessageId) return;

    // SEC-LOW-001: enforce a minimum 1000ms interval between successive history requests
    const now = Date.now();
    if (now - lastHistoryRequestRef.current < 1000) return;
    lastHistoryRequestRef.current = now;

    // Capture current scroll height before prepend so we can restore position
    const el = containerRef.current;
    if (el) {
      prevScrollHeightRef.current = el.scrollHeight;
    }

    isPrependingRef.current = true;
    setLoadingHistory(true);
    send({ type: 'load_history', before: firstMessageId, limit: 50 });

    // F-001: safety timeout — if history_page never arrives (WS drop, server error),
    // reset the loading flag after 10 seconds so infinite scroll is not permanently broken.
    historyTimeoutRef.current = setTimeout(() => {
      historyTimeoutRef.current = null;
      isPrependingRef.current = false;
      setLoadingHistory(false);
    }, 10000);
  }, [hasMoreHistory, isLoadingHistory, firstMessageId, send, setLoadingHistory]);

  // IntersectionObserver on the top sentinel — fires when user scrolls to top
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          loadHistory();
        }
      },
      {
        root: containerRef.current,
        // Trigger 100px before the sentinel fully enters view so history loads
        // slightly before the user reaches the literal top of the list.
        rootMargin: '100px 0px 0px 0px',
        threshold: 0,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadHistory]);

  // Detect when user scrolls up to lock auto-scroll
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setIsScrollLocked(distanceFromBottom > 50);
  }, []);

  const handleScrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setIsScrollLocked(false);
  }, []);

  const grouped = groupMessages(messages);

  return (
    <>
      <div
        className="messages"
        ref={containerRef}
        onScroll={handleScroll}
      >
        {/* Sentinel at top — observed by IntersectionObserver to trigger history load */}
        <div ref={sentinelRef} aria-hidden="true" />
        {isLoadingHistory && (
          <div className="history-loader" aria-label="Loading older messages">
            <Loader2 size={16} className="history-loader-icon" />
          </div>
        )}
        {grouped.map(renderItem)}
        {thinkingAgents.map((a) => (
          <ThinkingDots key={a.agentName} agentName={a.agentName} />
        ))}
        <div ref={bottomRef} />
      </div>
      {isScrollLocked && (
        <button
          type="button"
          className="scroll-bottom"
          onClick={handleScrollToBottom}
          aria-label="Scroll to bottom"
        >
          <ChevronDown size={16} />
        </button>
      )}
    </>
  );
});
