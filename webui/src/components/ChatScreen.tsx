import type { ServerMessage, ConnectionStatus } from '../types';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { StatusIndicator } from './StatusIndicator';

interface Props {
  callsign: string;
  messages: ServerMessage[];
  connectionStatus: ConnectionStatus;
  connectionLost: boolean;
  onSend: (text: string) => void;
  onReconnect: () => void;
  onLeave: () => void;
}

export function ChatScreen({
  callsign,
  messages,
  connectionStatus,
  connectionLost,
  onSend,
  onReconnect,
  onLeave,
}: Props) {
  const canSend = connectionStatus === 'connected';

  return (
    <div className="chat-container">
      <header className="chat-header">
        <h1 className="chat-title">💬 Chat</h1>
        <div className="chat-header-right">
          <StatusIndicator status={connectionStatus} />
          <button className="btn-ghost" onClick={onLeave}>
            Leave
          </button>
        </div>
      </header>

      {connectionLost && (
        <div className="banner banner--error" role="alert">
          Connection lost after multiple attempts.{' '}
          <button className="btn-link" onClick={onReconnect}>
            Try again
          </button>
        </div>
      )}

      <MessageList messages={messages} ownCallsign={callsign} />

      <MessageInput onSend={onSend} disabled={!canSend} />
    </div>
  );
}
