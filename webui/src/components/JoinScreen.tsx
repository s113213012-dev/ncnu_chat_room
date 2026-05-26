import { useState, FormEvent } from 'react';
import type { ConnectionStatus } from '../types';

interface Props {
  onJoin: (callsign: string) => void;
  connectionStatus: ConnectionStatus;
  error: string;
}

const CALLSIGN_RE = /^[a-zA-Z0-9_]{1,20}$/;

function validate(value: string): string {
  if (!value) return 'Callsign is required';
  if (!CALLSIGN_RE.test(value))
    return 'Letters, numbers, and underscores only (1–20 characters)';
  return '';
}

export function JoinScreen({ onJoin, connectionStatus, error }: Props) {
  const [callsign, setCallsign] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const err = validate(callsign);
    if (err) {
      setLocalError(err);
      return;
    }
    setLocalError('');
    onJoin(callsign);
  };

  const isConnecting = connectionStatus === 'connecting';
  const displayError = localError || error;

  return (
    <div className="join-container">
      <div className="join-card">
        <h1 className="join-title">💬 Anonymous Chat</h1>
        <p className="join-subtitle">Join the conversation</p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="input-group">
            <label htmlFor="callsign" className="input-label">
              Your Callsign
            </label>
            <input
              id="callsign"
              type="text"
              className={`text-input${displayError ? ' text-input--error' : ''}`}
              value={callsign}
              onChange={(e) => {
                setCallsign(e.target.value);
                setLocalError('');
              }}
              placeholder="Enter a nickname…"
              maxLength={20}
              disabled={isConnecting}
              autoFocus
              autoComplete="off"
              aria-describedby="callsign-hint"
              aria-invalid={!!displayError}
            />
            {displayError && (
              <p className="error-message" role="alert">
                {displayError}
              </p>
            )}
            <p id="callsign-hint" className="input-hint">
              1–20 characters · letters, numbers, underscores
            </p>
          </div>

          <button type="submit" className="btn-primary" disabled={isConnecting}>
            {isConnecting ? 'Connecting…' : 'Join Chat'}
          </button>
        </form>
      </div>
    </div>
  );
}
