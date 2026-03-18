import { useEffect, useRef, useState, memo } from 'react';
import { useChatStore } from '../stores/chat-store';
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
    const msg = msgs[i];
    if (isQueueMsg(msg)) {
      const group: Message[] = [msg];
      while (i + 1 < msgs.length && isQueueMsg(msgs[i + 1])) {
        i++;
        group.push(msgs[i]);
      }
      if (group.length === 1) {
        result.push({ kind: 'single', msg: group[0] });
      } else {
        result.push({ kind: 'queue-group', messages: group, id: `qg-${group[0].id}` });
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

export const MessageList = memo(function MessageList() {
  const messages = useChatStore((s) => s.messages);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScrollLocked, setIsScrollLocked] = useState(false);
  const prevLengthRef = useRef(messages.length);

  // Scroll to bottom on new messages — unless user scrolled up
  useEffect(() => {
    const didGrow = messages.length > prevLengthRef.current;
    prevLengthRef.current = messages.length;

    if (didGrow && !isScrollLocked) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, isScrollLocked]);

  // Detect when user scrolls up to lock auto-scroll
  function handleScroll() {
    const el = containerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setIsScrollLocked(distanceFromBottom > 50);
  }

  const grouped = groupMessages(messages.filter((m) => m.authorType !== 'human'));

  return (
    <div
      className="messages"
      ref={containerRef}
      onScroll={handleScroll}
    >
      {grouped.map(renderItem)}
      <div ref={bottomRef} />
    </div>
  );
});
