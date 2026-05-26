import { useState, useEffect } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { JoinScreen } from './components/JoinScreen';
import { ChatScreen } from './components/ChatScreen';

export default function App() {
  const [screen, setScreen] = useState<'join' | 'chat'>('join');
  const [callsign, setCallsign] = useState('');

  const {
    connectionStatus,
    messages,
    sendMessage,
    connect,
    disconnect,
    connectionLost,
    manualReconnect,
    connectError,
  } = useWebSocket();

  // Transition to chat as soon as the WebSocket is established
  useEffect(() => {
    if (connectionStatus === 'connected' && screen === 'join') {
      setScreen('chat');
    }
  }, [connectionStatus, screen]);

  const handleJoin = (cs: string) => {
    setCallsign(cs);
    connect(cs);
  };

  const handleLeave = () => {
    disconnect();
    setScreen('join');
    setCallsign('');
  };

  if (screen === 'join') {
    return (
      <JoinScreen
        onJoin={handleJoin}
        connectionStatus={connectionStatus}
        error={connectError}
      />
    );
  }

  return (
    <ChatScreen
      callsign={callsign}
      messages={messages}
      connectionStatus={connectionStatus}
      connectionLost={connectionLost}
      onSend={sendMessage}
      onReconnect={manualReconnect}
      onLeave={handleLeave}
    />
  );
}
