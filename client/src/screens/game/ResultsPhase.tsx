import React from 'react';
import { Socket } from 'socket.io-client';
import { AlertCircle, CheckCircle2, Clock, LogOut, Award } from 'lucide-react';
import { GameState } from '../../types';
import { useSyncedTimer } from '../../hooks/useSyncedTimer';
import Avatar from '../../components/Avatar';

interface ResultsPhaseProps {
  socket: Socket | null;
  gameState: GameState;
  myPlayerId: string;
  onLeaveRoom?: () => void;
}

export default function ResultsPhase({
  socket,
  gameState,
  myPlayerId,
  onLeaveRoom,
}: ResultsPhaseProps) {
  const { roundResults, players, currentRound, totalRounds } = gameState;
  const secondsLeft = useSyncedTimer(gameState.phaseEndsAt, gameState.serverNow);

  if (!roundResults) {
    return (
      <div className="p-8 text-center font-mono text-xs text-zinc-500">
        Aguardando resultados da rodada...
      </div>
    );
  }

  const { impostorIds, wordA, wordB, category, scoreGained, isGameOver } = roundResults;
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  const handleLeave = () => {
    if (onLeaveRoom) {
      onLeaveRoom();
    } else {
      window.location.href = window.location.pathname;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-2">
      {/* 10-Second Countdown Banner + Leave Room Button */}
      <div className="bg-[#121215] border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Clock size={16} className="text-[#EC4899] shrink-0" />
          <div>
            <span className="text-xs font-semibold text-zinc-200 block">
              {isGameOver
                ? 'Partida finalizada! Indo para o ranking final...'
                : `Avançando para Rodada ${currentRound + 1} em:`}
            </span>
            <span className="text-lg font-mono font-bold text-[#EC4899] tabular-nums">
              {secondsLeft}s
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

      {/* Impostor Reveal */}
      <div className="bg-[#121215] border border-zinc-800 rounded-2xl p-6 text-center space-y-4">
        <span className="text-xs font-mono uppercase tracking-widest text-zinc-500 block">
          Identidade Revelada
        </span>

        <div className="flex flex-wrap justify-center gap-4">
          {impostorIds.map(id => {
            const p = players.find(x => x.id === id);
            if (!p) return null;
            return (
              <div
                key={id}
                className="flex items-center gap-3 px-5 py-3 rounded-xl border border-red-500/50 bg-red-950/20"
              >
                <Avatar emoji={p.avatar} size="md" />
                <div className="text-left">
                  <span className="font-bold text-sm text-zinc-100 block">{p.nickname}</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono text-red-400 uppercase tracking-wider">
                    <AlertCircle size={12} /> Impostor da Rodada
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Secret Words Reveal (Civilians vs Impostors) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[#121215] border border-emerald-500/30 rounded-xl p-5 text-center">
          <span className="inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider text-emerald-400 mb-1">
            <CheckCircle2 size={12} /> Palavra dos Civis
          </span>
          <p className="text-2xl font-black text-white font-mono mt-1">{wordA}</p>
        </div>

        <div className="bg-[#121215] border border-red-500/30 rounded-xl p-5 text-center">
          <span className="inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider text-red-400 mb-1">
            <AlertCircle size={12} /> Palavra do(s) Impostor(es)
          </span>
          <p className="text-2xl font-black text-white font-mono mt-1">{wordB}</p>
        </div>

        <div className="sm:col-span-2 text-center text-xs font-mono text-zinc-500">
          Categoria: <strong className="text-zinc-300">{category}</strong>
        </div>
      </div>

      {/* Points Scored This Round */}
      <div className="bg-[#121215] border border-zinc-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono flex items-center gap-1.5">
            <Award size={14} className="text-[#EC4899]" />
            Pontuação da Rodada {currentRound} de {totalRounds}
          </span>
        </div>

        <div className="space-y-2">
          {sortedPlayers.map(player => {
            const gained = scoreGained[player.id] || 0;
            const isImp = impostorIds.includes(player.id);
            return (
              <div
                key={player.id}
                className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border border-zinc-800/80 bg-zinc-900/40"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar emoji={player.avatar} size="sm" />
                  <span className="text-sm font-medium text-zinc-200 truncate">{player.nickname}</span>
                  {isImp ? (
                    <span className="text-[10px] font-mono text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded bg-red-950/30">
                      Impostor
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded bg-emerald-950/30">
                      Civil
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 font-mono shrink-0">
                  <span className={`text-xs font-bold ${gained > 0 ? 'text-emerald-400' : 'text-zinc-600'}`}>
                    {gained > 0 ? `+${gained}` : '0'}
                  </span>
                  <span className="text-xs text-zinc-400 w-16 text-right">
                    {player.score} pts
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
