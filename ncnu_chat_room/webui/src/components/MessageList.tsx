import { useEffect, useRef } from 'react';
import type { ServerMessage } from '../types';
import { MessageItem } from './MessageItem';

interface Props {
  messages: ServerMessage[];
  ownCallsign: string;
}

export function MessageList({ messages, ownCallsign }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div
      className="message-list"
      aria-live="polite"
      aria-label="Chat messages"
    >
      {messages.length === 0 && (
        <p className="message-list__empty">No messages yet. Say hello! 👋</p>
      )}
      {messages.map((msg, idx) => (
        <MessageItem
          key={idx}
          message={msg}
          isOwn={msg.type === 'message' && msg.callsign === ownCallsign}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
