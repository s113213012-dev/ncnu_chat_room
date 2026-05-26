import type { ConnectionStatus } from '../types';

interface Props {
  status: ConnectionStatus;
}

const LABELS: Record<ConnectionStatus, string> = {
  connecting: 'Connecting…',
  connected: 'Connected',
  disconnected: 'Disconnected',
  reconnecting: 'Reconnecting…',
};

export function StatusIndicator({ status }: Props) {
  return (
    <div
      className={`status-indicator status-indicator--${status}`}
      aria-live="polite"
      aria-label={`Connection status: ${LABELS[status]}`}
    >
      <span className="status-indicator__dot" aria-hidden="true" />
      <span className="status-indicator__label">{LABELS[status]}</span>
    </div>
  );
}
