import React from 'react';
import { Socket } from 'socket.io-client';
import { LogOut, Trophy, Users } from 'lucide-react';
import { GameState } from '../types';
import HintPhase from './game/HintPhase';
import DiscussionPhase from './game/DiscussionPhase';
import ResultsPhase from './game/ResultsPhase';
import GameOver from './game/GameOver';
import Avatar from '../components/Avatar';
import AdBanner from '../components/AdBanner';

interface GameScreenProps {
  socket: Socket | null;
  gameState: GameState;
  myPlayerId: string;
  myWord: string;
  onLeaveRoom?: () => void;
}

export default function GameScreen({
  socket,
  gameState,
  myPlayerId,
  myWord,
  onLeaveRoom,
}: GameScreenProps) {
  const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);

  const handleLeave = () => {
    if (onLeaveRoom) {
      onLeaveRoom();
    } else {
      window.location.href = window.location.pathname;
    }
  };

  const renderPhase = () => {
    switch (gameState.phase) {
      case 'hint-phase':
        return (
          <HintPhase
            socket={socket}
            gameState={gameState}
            myPlayerId={myPlayerId}
            myWord={myWord}
          />
        );
      case 'discussion':
        return (
          <DiscussionPhase
            socket={socket}
            gameState={gameState}
            myPlayerId={myPlayerId}
          />
        );
      case 'results':
        return (
          <ResultsPhase
            socket={socket}
            gameState={gameState}
            myPlayerId={myPlayerId}
            onLeaveRoom={handleLeave}
          />
        );
      case 'game-over':
        return (
          <GameOver
            socket={socket}
            gameState={gameState}
            myPlayerId={myPlayerId}
            onLeaveRoom={handleLeave}
          />
        );
      default:
        return (
          <div className="text-zinc-500 font-mono text-xs text-center py-20">
            Carregando estado do jogo...
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 flex flex-col justify-between">
      {/* Top Bar */}
      <header className="border-b border-zinc-800 bg-[#09090B]/90 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-black text-lg tracking-tight text-white font-mono">
              PUEDES<span className="text-[#EC4899]">?</span>
            </span>

            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1">
              <span className="text-xs text-zinc-500 font-mono uppercase">Rodada</span>
              <span className="text-xs font-mono font-bold text-zinc-100">
                {gameState.currentRound}/{gameState.totalRounds}
              </span>
            </div>
          </div>

          {/* Quick Mobile Player Strip */}
          <div className="flex lg:hidden items-center gap-1.5 overflow-x-auto max-w-[180px] scrollbar-thin">
            {sortedPlayers.slice(0, 4).map(p => (
              <div
                key={p.id}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[11px] font-mono shrink-0"
              >
                <Avatar emoji={p.avatar} size="sm" />
                <span className="text-zinc-300 font-bold">{p.score}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLeave}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-950/20 hover:bg-red-950/40 text-xs font-medium text-red-400 transition-colors"
              title="Sair da sala"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Ad Slot 1 */}
      <AdBanner slot="mobile-slot-1" />

      {/* 3-Ad Layout Main Grid */}
      <div className="flex-1 flex max-w-7xl mx-auto w-full px-4 py-4 gap-5">
        {/* Desktop Ad 1: Left Skyscraper */}
        <AdBanner slot="left-skyscraper" />

        {/* Center Stage & Sub-phases */}
        <main className="flex-1 min-w-0">
          {renderPhase()}
        </main>

        {/* Desktop Scoreboard Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 shrink-0 rounded-2xl border border-zinc-800 bg-[#121215] p-4 h-[calc(100vh-140px)] sticky top-16 justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono flex items-center gap-1.5">
                <Trophy size={13} className="text-[#EC4899]" />
                Placar da Sala
              </span>
              <span className="text-[10px] font-mono text-zinc-500">
                {gameState.players.length} jog.
              </span>
            </div>

            <div className="space-y-1.5 overflow-y-auto max-h-[380px] scrollbar-thin pr-1">
              {sortedPlayers.map((player, idx) => {
                const isMe = player.id === myPlayerId;
                return (
                  <div
                    key={player.id}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
                      isMe
                        ? 'bg-zinc-800 border-zinc-700 text-zinc-100'
                        : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-300'
                    }`}
                  >
                    <span className="text-zinc-500 text-[11px] w-4 shrink-0 font-bold">
                      #{idx + 1}
                    </span>
                    <Avatar emoji={player.avatar} size="sm" />
                    <span className="flex-1 truncate font-sans text-xs">
                      {player.nickname} {isMe && '(Você)'}
                    </span>
                    <span className="font-bold text-zinc-200 shrink-0">
                      {player.score}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-800/80 text-center">
            <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
              PUEDES &middot; Multiplayer
            </span>
          </div>
        </aside>

        {/* Desktop Ad 2: Right Skyscraper */}
        <AdBanner slot="right-skyscraper" />
      </div>

      {/* Desktop Ad 3 / Mobile Ad 2 & 3 */}
      <footer className="border-t border-zinc-800 py-3 bg-[#09090B]">
        <div className="max-w-6xl mx-auto px-4 flex flex-col items-center">
          <AdBanner slot="bottom-leaderboard" />
          <AdBanner slot="mobile-slot-2" />
        </div>
      </footer>
    </div>
  );
}
