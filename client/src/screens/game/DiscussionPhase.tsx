import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { Vote, Users, MessageSquare } from 'lucide-react';
import { GameState } from '../../types';
import { useSyncedTimer } from '../../hooks/useSyncedTimer';
import Timer from '../../components/Timer';
import PlayerCard from '../../components/PlayerCard';
import ChatPanel from '../../components/ChatPanel';

interface DiscussionPhaseProps {
  socket: Socket | null;
  gameState: GameState;
  myPlayerId: string;
}

export default function DiscussionPhase({
  socket,
  gameState,
  myPlayerId,
}: DiscussionPhaseProps) {
  const { players, settings, chat } = gameState;
  const me = players.find(p => p.id === myPlayerId);
  const [myVotes, setMyVotes] = useState<string[]>(me?.votes || []);

  const secondsLeft = useSyncedTimer(gameState.phaseEndsAt, gameState.serverNow);

  const maxPossibleImpostors = Math.max(1, Math.floor((players.length - 1) / 2));
  const impostorCount =
    gameState.impostorCount ||
    (settings.impostors === 'auto'
      ? (players.length <= 4 ? 1 : players.length <= 8 ? 2 : 3)
      : Math.max(1, Math.min(Number(settings.impostors), maxPossibleImpostors)));

  const canVote = myVotes.length < impostorCount;

  useEffect(() => {
    if (me?.votes) {
      setMyVotes(me.votes);
    }
  }, [me?.votes]);

  // Vote tally per player
  const voteCountMap: Record<string, number> = {};
  players.forEach(p => {
    (p.votes || []).forEach(targetId => {
      voteCountMap[targetId] = (voteCountMap[targetId] || 0) + 1;
    });
  });

  const handleVote = (targetId: string) => {
    if (targetId === myPlayerId || !socket) return;

    if (myVotes.includes(targetId)) {
      // Unvote
      const next = myVotes.filter(id => id !== targetId);
      setMyVotes(next);
      socket.emit('submit-vote', { targetId, action: 'unvote' });
    } else if (canVote) {
      // Vote
      const next = [...myVotes, targetId];
      setMyVotes(next);
      socket.emit('submit-vote', { targetId, action: 'vote' });
    }
  };

  return (
    <div className="space-y-5">
      {/* Discussion Header & Timer */}
      <div className="bg-[#121215] border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm text-zinc-100 flex items-center gap-1.5">
              <Vote size={15} className="text-[#EC4899]" />
              Fase de Discussão e Votação
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded border border-zinc-700 bg-zinc-900 text-zinc-300">
              3 Dicas Concluídas
            </span>
          </div>
          <p className="text-xs text-zinc-500 font-mono">
            Vote em até {impostorCount} suspeito{impostorCount > 1 ? 's' : ''} &middot; Seus votos: {myVotes.length}/{impostorCount}
          </p>
        </div>

        <div className="w-full sm:w-44">
          <Timer secondsLeft={secondsLeft} totalSeconds={settings.discussTime} />
        </div>
      </div>

      {/* Main Grid: Player Cards with 3 Hints (Left) + Chat (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Player Cards (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 font-mono flex items-center gap-1.5">
              <Users size={13} />
              Cartões de Jogadores &amp; 3 Dicas
            </span>
            <span className="text-[11px] font-mono text-zinc-500">
              Clique em "Votar" no suspeito
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {players.map(player => (
              <PlayerCard
                key={player.id}
                player={player}
                showHints={true}
                showVoteButton={player.id !== myPlayerId}
                voteCount={voteCountMap[player.id] || 0}
                hasVotedFor={myVotes.includes(player.id)}
                canVote={canVote}
                onVote={handleVote}
              />
            ))}
          </div>
        </div>

        {/* Right: Live Chat (5 cols) */}
        <div className="lg:col-span-5 h-[520px] sticky top-20">
          <ChatPanel
            messages={chat}
            socket={socket}
            myPlayerId={myPlayerId}
          />
        </div>
      </div>
    </div>
  );
}
