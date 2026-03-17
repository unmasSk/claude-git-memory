import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';

export function ChatArea() {
  return (
    <div className="chat">
      <MessageList />
      <MessageInput />
    </div>
  );
}
