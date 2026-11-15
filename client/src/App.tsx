import React, { useEffect, useState } from 'react';
import { GameState, RoomSettings } from './types';
import { useSocket } from './hooks/useSocket';
import LandingScreen from './screens/LandingScreen';
import LobbyScreen from './screens/LobbyScreen';
import GameScreen from './screens/GameScreen';

type Screen = 'landing' | 'lobby' | 'game';

const DEFAULT_SETTINGS: RoomSettings = {
  rounds: 5,
  impostors: 'auto',
  hintTime: 30,
  discussTime: 90,
  isPublic: true,
  categories: [
    'Cultura Pop',
    'Palavras Comuns & Objetos',
    'Comidas & Bebidas',
    'Lugares',
    'Animais',
    'Profissões',
    'Esportes',
  ],
};

export default function App() {
  const { socket, connected } = useSocket();
  const [screen, setScreen] = useState<Screen>('landing');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string>('');
  const [myWord, setMyWord] = useState<string>('');

  // Auto-read ?room= from URL
  const urlRoomCode = new URLSearchParams(window.location.search).get('room') || '';

  const handleLeaveRoom = () => {
    if (socket) {
      socket.emit('leave-room');
    }
    setGameState(null);
    setMyPlayerId('');
    setMyWord('');
    setScreen('landing');
    const url = new URL(window.location.href);
    url.searchParams.delete('room');
    window.history.replaceState({}, '', url.pathname);
  };

  useEffect(() => {
    if (!socket) return;

    socket.on('room-created', (data: { roomCode: string; playerId: string; gameState: GameState }) => {
      setMyPlayerId(data.playerId);
      setGameState(data.gameState);
      setScreen('lobby');
      const url = new URL(window.location.href);
      url.searchParams.set('room', data.roomCode);
      window.history.replaceState({}, '', url.toString());
    });

    socket.on('room-joined', (data: { playerId: string; gameState: GameState }) => {
      setMyPlayerId(data.playerId);
      setGameState(data.gameState);
      setScreen(data.gameState.phase === 'lobby' ? 'lobby' : 'game');
    });

    socket.on('game-state', (gs: GameState) => {
      // Proteção rigorosa: se o jogador não estiver na sala ou estiver desconectado,
      // ele não pode ser arrastado de volta para a sala.
      const me = gs.players.find(p => p.id === socket.id);
      if (!me || !me.isConnected) {
        setGameState(null);
        setScreen('landing');
        return;
      }

      setGameState(gs);
      if (gs.phase === 'lobby') {
        setScreen('lobby');
      } else {
        setScreen('game');
      }
    });

    socket.on('your-word', (data: { word: string }) => {
      setMyWord(data.word);
    });

    socket.on('left-room-success', () => {
      setGameState(null);
      setMyPlayerId('');
      setMyWord('');
      setScreen('landing');
      const url = new URL(window.location.href);
      url.searchParams.delete('room');
      window.history.replaceState({}, '', url.pathname);
    });

    socket.on('kicked-from-room', () => {
      handleLeaveRoom();
    });

    return () => {
      socket.off('room-created');
      socket.off('room-joined');
      socket.off('game-state');
      socket.off('your-word');
      socket.off('left-room-success');
      socket.off('kicked-from-room');
    };
  }, [socket]);

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100">
      {screen === 'landing' && (
        <LandingScreen
          socket={socket}
          connected={connected}
          defaultSettings={DEFAULT_SETTINGS}
          initialRoomCode={urlRoomCode}
        />
      )}
      {screen === 'lobby' && gameState && (
        <LobbyScreen
          socket={socket}
          gameState={gameState}
          myPlayerId={myPlayerId}
          onLeaveRoom={handleLeaveRoom}
        />
      )}
      {screen === 'game' && gameState && (
        <GameScreen
          socket={socket}
          gameState={gameState}
          myPlayerId={myPlayerId}
          myWord={myWord}
          onLeaveRoom={handleLeaveRoom}
        />
      )}
    </div>
  );
}
