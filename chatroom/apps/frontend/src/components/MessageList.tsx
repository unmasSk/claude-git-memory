import { useEffect, useRef, useState, memo } from 'react';
import { useChatStore } from '../stores/chat-store';
import { MessageLine } from './MessageLine';
import { ToolLine } from './ToolLine';
import { SystemMessage } from './SystemMessage';
import type { Message } from '@agent-chatroom/shared';

function renderMessage(msg: Message) {
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
    // Lock if more than 50px from bottom; unlock when scrolled back down
    setIsScrollLocked(distanceFromBottom > 50);
  }

  return (
    <div
      className="messages"
      ref={containerRef}
      onScroll={handleScroll}
    >
      {messages.map(renderMessage)}
      <div ref={bottomRef} />
    </div>
  );
});
