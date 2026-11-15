import React from 'react';
import { Crown, Wifi, WifiOff, Check, AlertCircle } from 'lucide-react';
import { Player } from '../types';
import Avatar from './Avatar';

interface PlayerCardProps {
  player: Player;
  showHints?: boolean;
  showVoteButton?: boolean;
  voteCount?: number;
  hasVotedFor?: boolean;
  canVote?: boolean;
  onVote?: (playerId: string) => void;
  highlight?: 'impostor' | 'civilian' | null;
  compact?: boolean;
  isCurrentTurnPlayer?: boolean;
}

export default function PlayerCard({
  player,
  showHints = false,
  showVoteButton = false,
  voteCount,
  hasVotedFor = false,
  canVote = false,
  onVote,
  highlight = null,
  compact = false,
  isCurrentTurnPlayer = false,
}: PlayerCardProps) {
  // Border & background based on role reveal or current turn
  let borderStyle = 'border-zinc-800 bg-[#121215]';
  if (highlight === 'impostor') {
    borderStyle = 'border-red-500/80 bg-red-950/20';
  } else if (highlight === 'civilian') {
    borderStyle = 'border-emerald-500/80 bg-emerald-950/20';
  } else if (isCurrentTurnPlayer) {
    borderStyle = 'border-[#EC4899] bg-zinc-900/60 ring-1 ring-[#EC4899]/30';
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border ${borderStyle} transition-colors min-w-0`}>
        <Avatar emoji={player.avatar} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {player.isHost && <Crown size={11} className="text-[#EC4899] shrink-0" />}
            <span className="text-xs font-medium text-zinc-100 truncate">{player.nickname}</span>
          </div>
          <span className="text-[11px] font-mono text-zinc-400">{player.score} pts</span>
        </div>
        <div className="shrink-0">
          {player.isConnected ? (
            <Wifi size={12} className="text-emerald-500" />
          ) : (
            <WifiOff size={12} className="text-zinc-600" />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border ${borderStyle} p-4 flex flex-col justify-between h-full transition-all duration-200`}>
      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <Avatar emoji={player.avatar} size="md" />
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-zinc-950 ${
                  player.isConnected ? 'bg-emerald-500' : 'bg-zinc-600'
                }`}
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                {player.isHost && (
                  <span title="Host da sala">
                    <Crown size={12} className="text-[#EC4899] shrink-0" />
                  </span>
                )}
                <span className="font-semibold text-sm text-zinc-100 truncate">{player.nickname}</span>
              </div>
              <span className="text-xs font-mono text-zinc-400">{player.score} pts</span>
            </div>
          </div>

          {highlight === 'impostor' && (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border border-red-500/40 text-red-400 bg-red-950/40 shrink-0">
              <AlertCircle size={11} /> Impostor
            </span>
          )}
          {highlight === 'civilian' && (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border border-emerald-500/40 text-emerald-400 bg-emerald-950/40 shrink-0">
              <Check size={11} /> Civil
            </span>
          )}
        </div>

        {/* 3 Hints Slots */}
        {showHints && (
          <div className="space-y-1.5 mt-2 pt-2 border-t border-zinc-800/80">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block mb-1">
              Dicas da rodada
            </span>
            {[0, 1, 2].map(turnIdx => {
              const hintText = player.hints ? player.hints[turnIdx] : null;
              return (
                <div
                  key={turnIdx}
                  className="flex items-center gap-2 text-xs font-mono px-2 py-1 rounded bg-zinc-900 border border-zinc-800/60"
                >
                  <span className="text-zinc-500 text-[10px] w-5 shrink-0">
                    #{turnIdx + 1}
                  </span>
                  {hintText ? (
                    <span className="text-zinc-200 font-sans truncate">{hintText}</span>
                  ) : (
                    <span className="text-zinc-600 italic text-[11px]">aguardando...</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Voting Button & Count */}
      {showVoteButton && onVote && (
        <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between gap-2">
          <div className="text-xs font-mono text-zinc-500">
            {voteCount !== undefined && (
              <span>
                {voteCount} {voteCount === 1 ? 'voto' : 'votos'}
              </span>
            )}
          </div>
          <button
            onClick={() => onVote(player.id)}
            disabled={!canVote && !hasVotedFor}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
              hasVotedFor
                ? 'bg-red-500/10 border-red-500/40 text-red-400 hover:bg-red-500/20'
                : canVote
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-zinc-700 hover:border-zinc-500'
                : 'bg-zinc-900 text-zinc-600 border-zinc-800 cursor-not-allowed'
            }`}
          >
            {hasVotedFor ? 'Votado' : 'Votar'}
          </button>
        </div>
      )}
    </div>
  );
}
