import type { ServerMessage } from '../types';

interface Props {
  message: ServerMessage;
  isOwn: boolean;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function MessageItem({ message, isOwn }: Props) {
  if (message.type === 'system') {
    const text =
      message.event === 'user_joined'
        ? `${message.callsign} joined`
        : `${message.callsign} left`;
    return (
      <div className="system-message">
        <span className="system-message__text">[system] {text}</span>
      </div>
    );
  }

  return (
    <div className={`message message--${isOwn ? 'own' : 'other'}`}>
      <div className="message__meta">
        <span className="message__callsign">{message.callsign}</span>
        <span className="message__time">{formatTime(message.timestamp)}</span>
      </div>
      <div className="message__bubble">{message.text}</div>
    </div>
  );
}
