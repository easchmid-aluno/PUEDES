import React from 'react';
import { Socket } from 'socket.io-client';
import { Trophy, Medal, Award, RotateCcw, Settings as SettingsIcon, LogOut, Clock } from 'lucide-react';
import { GameState } from '../../types';
import { useSyncedTimer } from '../../hooks/useSyncedTimer';
import Avatar from '../../components/Avatar';

interface GameOverProps {
  socket: Socket | null;
  gameState: GameState;
  myPlayerId: string;
  onLeaveRoom?: () => void;
}

export default function GameOver({
  socket,
  gameState,
  myPlayerId,
  onLeaveRoom,
}: GameOverProps) {
  const { players } = gameState;
  const me = players.find(p => p.id === myPlayerId);
  const isHost = me?.isHost ?? false;
  const sorted = [...players].sort((a, b) => b.score - a.score);

  const secondsLeft = useSyncedTimer(gameState.phaseEndsAt, gameState.serverNow);

  const handlePlayAgain = () => {
    if (!socket || !isHost) return;
    socket.emit('play-again');
  };

  const handleReturnToLobby = () => {
    if (!socket || !isHost) return;
    socket.emit('return-to-lobby');
  };

  const handleLeave = () => {
    if (onLeaveRoom) {
      onLeaveRoom();
    } else {
      window.location.href = window.location.pathname;
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-6">
      {/* 10-Second Countdown & Leave Button */}
      <div className="bg-[#121215] border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Clock size={16} className="text-[#EC4899] shrink-0" />
          <div className="text-xs">
            <span className="font-semibold text-zinc-200 block">Fim de Partida</span>
            <span className="text-zinc-500 font-mono text-[11px]">
              Tempo livre para decisão do Host
            </span>
          </div>
        </div>

        <button
          onClick={handleLeave}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-red-500/30 bg-red-950/20 hover:bg-red-950/40 text-xs font-medium text-red-400 transition-colors shrink-0"
        >
          <LogOut size={13} />
          <span>Sair da Sala</span>
        </button>
      </div>

      {/* Podium Header */}
      <div className="bg-[#121215] border border-zinc-800 rounded-2xl p-6 text-center space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#EC4899]/10 border border-[#EC4899]/30 text-[#EC4899] mb-1">
          <Trophy size={24} />
        </div>
        <div>
          <h2 className="text-xl font-black tracking-tight text-white font-mono">
            RANKING FINAL
          </h2>
          <p className="text-xs text-zinc-500 font-mono mt-0.5">
            Placar acumulado de todas as rodadas
          </p>
        </div>

        {/* Podium Top 3 */}
        <div className="grid grid-cols-3 gap-3 pt-4 max-w-md mx-auto items-end">
          {/* 2nd place */}
          {sorted[1] && (
            <div className="flex flex-col items-center bg-zinc-900/60 border border-zinc-800 rounded-xl p-3">
              <Medal size={16} className="text-zinc-400 mb-1" />
              <Avatar emoji={sorted[1].avatar} size="md" />
              <span className="text-xs font-semibold text-zinc-200 truncate max-w-[90px] mt-2">
                {sorted[1].nickname}
              </span>
              <span className="text-xs font-mono font-bold text-zinc-400">
                {sorted[1].score} pts
              </span>
              <span className="text-[10px] font-mono text-zinc-500 mt-1 uppercase">2º Lugar</span>
            </div>
          )}

          {/* 1st place */}
          {sorted[0] && (
            <div className="flex flex-col items-center bg-[#EC4899]/5 border border-[#EC4899]/40 rounded-xl p-4 scale-105 shadow-xl">
              <Trophy size={20} className="text-[#EC4899] mb-1" />
              <Avatar emoji={sorted[0].avatar} size="lg" />
              <span className="text-sm font-bold text-white truncate max-w-[100px] mt-2">
                {sorted[0].nickname}
              </span>
              <span className="text-sm font-mono font-black text-[#EC4899]">
                {sorted[0].score} pts
              </span>
              <span className="text-[10px] font-mono text-[#EC4899] mt-1 font-semibold uppercase">Vencedor</span>
            </div>
          )}

          {/* 3rd place */}
          {sorted[2] && (
            <div className="flex flex-col items-center bg-zinc-900/60 border border-zinc-800 rounded-xl p-3">
              <Award size={16} className="text-amber-600 mb-1" />
              <Avatar emoji={sorted[2].avatar} size="md" />
              <span className="text-xs font-semibold text-zinc-200 truncate max-w-[90px] mt-2">
                {sorted[2].nickname}
              </span>
              <span className="text-xs font-mono font-bold text-zinc-400">
                {sorted[2].score} pts
              </span>
              <span className="text-[10px] font-mono text-zinc-500 mt-1 uppercase">3º Lugar</span>
            </div>
          )}
        </div>
      </div>

      {/* Complete Scoreboard List */}
      <div className="bg-[#121215] border border-zinc-800 rounded-2xl p-5 space-y-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 font-mono block pb-2 border-b border-zinc-800">
          Tabela Completa
        </span>
        <div className="space-y-1.5">
          {sorted.map((p, idx) => (
            <div
              key={p.id}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-mono transition-colors ${
                p.id === myPlayerId
                  ? 'border-zinc-700 bg-zinc-900'
                  : 'border-zinc-800/80 bg-zinc-950/40'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-zinc-500 font-bold w-4 shrink-0">#{idx + 1}</span>
                <Avatar emoji={p.avatar} size="sm" />
                <span className="font-medium text-zinc-200 truncate font-sans">{p.nickname}</span>
              </div>
              <span className="font-bold text-zinc-300 shrink-0">{p.score} pts</span>
            </div>
          ))}
        </div>
      </div>

      {/* Host Decision Action Area */}
      <div className="bg-[#121215] border border-zinc-800 rounded-2xl p-5">
        {isHost ? (
          <div className="space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono block">
              Próximo Passo (Decisão do Host)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handlePlayAgain}
                className="py-3 px-4 bg-[#EC4899] hover:bg-[#db2777] text-white font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw size={14} />
                <span>Jogar Novamente (Mesmas Configurações)</span>
              </button>

              <button
                onClick={handleReturnToLobby}
                className="py-3 px-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-100 border border-zinc-700 hover:border-zinc-500 font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-2"
              >
                <SettingsIcon size={14} />
                <span>Alterar Configurações</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2.5 py-3 text-xs font-mono text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-[#EC4899] animate-pulse" />
            <span>Aguardando o host decidir o próximo jogo ou alterar configurações...</span>
          </div>
        )}
      </div>
    </div>
  );
}
