import { useRef, useState, useCallback, useEffect } from 'react';
import type { ServerMessage, ConnectionStatus } from '../types';
import { WS_ENDPOINT } from '../config';

interface UseWebSocketReturn {
  connectionStatus: ConnectionStatus;
  messages: ServerMessage[];
  sendMessage: (text: string) => void;
  connect: (callsign: string) => void;
  disconnect: () => void;
  connectionLost: boolean;
  manualReconnect: () => void;
  connectError: string;
}

export function useWebSocket(): UseWebSocketReturn {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [messages, setMessages] = useState<ServerMessage[]>([]);
  const [connectionLost, setConnectionLost] = useState(false);
  const [connectError, setConnectError] = useState('');

  const wsRef = useRef<WebSocket | null>(null);
  const callsignRef = useRef('');
  const reconnectCount = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasEverConnected = useRef(false);
  const intentionalClose = useRef(false);

  const clearTimer = () => {
    if (reconnectTimer.current !== null) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
  };

  // openSocket is stable (refs only, no state in deps)
  const openSocket = useCallback((callsign: string) => {
    intentionalClose.current = false;
    const url = `${WS_ENDPOINT}?callsign=${encodeURIComponent(callsign)}`;
    const socket = new WebSocket(url);
    wsRef.current = socket;
    setConnectionStatus('connecting');

    socket.onopen = () => {
      wasEverConnected.current = true;
      reconnectCount.current = 0;
      setConnectionStatus('connected');
      setConnectError('');
      setConnectionLost(false);
    };

    socket.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string) as ServerMessage;
        setMessages(prev => [...prev, msg]);
      } catch {
        console.error('Failed to parse WebSocket message');
      }
    };

    socket.onclose = () => {
      if (intentionalClose.current) return;
      setConnectionStatus('disconnected');

      if (!wasEverConnected.current) {
        // Initial connection attempt failed — don't auto-reconnect
        setConnectError('Connection failed. Check your network and try again.');
        return;
      }

      // Auto-reconnect with exponential backoff
      const attempt = ++reconnectCount.current;
      if (attempt > 5) {
        setConnectionLost(true);
        return;
      }

      // Delays: 2s, 4s, 8s, 16s, 30s (capped)
      const delay = Math.min(2000 * Math.pow(2, attempt - 1), 30000);
      setConnectionStatus('reconnecting');
      reconnectTimer.current = setTimeout(() => {
        openSocket(callsignRef.current);
      }, delay);
    };

    socket.onerror = () => {
      console.error('WebSocket error');
    };
  }, []); // stable: all state access is via refs

  const connect = useCallback((callsign: string) => {
    // Close any existing connection first
    intentionalClose.current = true;
    wsRef.current?.close();
    clearTimer();

    // Reset state for fresh connection attempt
    wasEverConnected.current = false;
    reconnectCount.current = 0;
    callsignRef.current = callsign;
    setMessages([]);
    setConnectionLost(false);
    setConnectError('');

    openSocket(callsign);
  }, [openSocket]);

  const disconnect = useCallback(() => {
    intentionalClose.current = true;
    clearTimer();
    wsRef.current?.close();
    setConnectionStatus('disconnected');
  }, []);

  const manualReconnect = useCallback(() => {
    reconnectCount.current = 0;
    setConnectionLost(false);
    openSocket(callsignRef.current);
  }, [openSocket]);

  const sendMessage = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'sendMessage', text }));
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      intentionalClose.current = true;
      clearTimer();
      wsRef.current?.close();
    };
  }, []);

  return {
    connectionStatus,
    messages,
    sendMessage,
    connect,
    disconnect,
    connectionLost,
    manualReconnect,
    connectError,
  };
}
