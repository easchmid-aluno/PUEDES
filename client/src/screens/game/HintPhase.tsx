import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { Eye, EyeOff, Send, CheckCircle2, Lock, ArrowRight, User } from 'lucide-react';
import { GameState } from '../../types';
import { useSyncedTimer } from '../../hooks/useSyncedTimer';
import { useAudio } from '../../hooks/useAudio';
import Timer from '../../components/Timer';
import PlayerCard from '../../components/PlayerCard';
import Avatar from '../../components/Avatar';

interface HintPhaseProps {
  socket: Socket | null;
  gameState: GameState;
  myPlayerId: string;
  myWord: string;
}

export default function HintPhase({
  socket,
  gameState,
  myPlayerId,
  myWord,
}: HintPhaseProps) {
  const [showWord, setShowWord] = useState(false);
  const [hint, setHint] = useState('');
  const [hintError, setHintError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { playHintSubmit } = useAudio();

  const secondsLeft = useSyncedTimer(gameState.phaseEndsAt, gameState.serverNow);
  const me = gameState.players.find(p => p.id === myPlayerId);
  const { settings, currentTurn, currentPlayerIndex, turnOrder, players } = gameState;

  // Current speaker from turnOrder
  const curSpeakerId = turnOrder && turnOrder.length > 0 ? turnOrder[currentPlayerIndex] : null;
  const currentSpeaker = players.find(p => p.id === curSpeakerId);
  const isMyTurn = curSpeakerId === myPlayerId;

  // Listen for hint-error from server
  useEffect(() => {
    if (!socket) return;
    const onHintError = (data: { message: string }) => {
      setHintError(data.message);
      setSubmitted(false);
    };
    socket.on('hint-error', onHintError);
    return () => {
      socket.off('hint-error', onHintError);
    };
  }, [socket]);

  // When my turn starts, auto-focus input
  useEffect(() => {
    if (isMyTurn && !submitted) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isMyTurn, submitted]);

  // Sync submission state on turn changes
  useEffect(() => {
    setSubmitted(me?.hasSubmittedHint ?? false);
  }, [me?.hasSubmittedHint]);

  // Reset local hint state on each sequence step
  useEffect(() => {
    setHint('');
    setHintError('');
    setSubmitted(false);
  }, [currentTurn, currentPlayerIndex]);

  const submitHint = () => {
    const raw = hint.trim();
    if (!raw) {
      setHintError('Digite uma palavra.');
      return;
    }
    if (raw.length < 2) {
      setHintError('A dica deve ter pelo menos 2 letras.');
      return;
    }
    if (raw.includes(' ') || raw.includes('-')) {
      setHintError('A dica deve ser estritamente uma única palavra.');
      return;
    }
    if (raw.length > 24) {
      setHintError('A dica pode ter no máximo 24 caracteres.');
      return;
    }
    if (!socket) return;

    socket.emit('submit-hint', { hint: raw }, (res?: { success: boolean; error?: string }) => {
      if (res && !res.success) {
        setHintError(res.error || 'Dica recusada pelo servidor.');
        setSubmitted(false);
      } else {
        playHintSubmit();
        setSubmitted(true);
        setHintError('');
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitHint();
    }
  };

  return (
    <div className="space-y-5">
      {/* Turn Progress & Active Speaker Header */}
      <div className="bg-[#121215] border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono">
            {[0, 1, 2].map(step => (
              <div
                key={step}
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold border transition-colors ${
                  step < currentTurn
                    ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-400'
                    : step === currentTurn
                    ? 'border-[#EC4899] bg-[#EC4899]/10 text-[#EC4899]'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-600'
                }`}
              >
                {step + 1}
              </div>
            ))}
          </div>
          <div>
            <span className="text-xs font-semibold text-zinc-200 block">
              Dica {currentTurn + 1} de 3
            </span>
            <span className="text-[11px] font-mono text-zinc-400 flex items-center gap-1.5 mt-0.5">
              <span>Vez atual:</span>
              <strong className={isMyTurn ? 'text-[#EC4899]' : 'text-zinc-200'}>
                {isMyTurn ? 'Você' : currentSpeaker?.nickname || '...'}
              </strong>
            </span>
          </div>
        </div>

        <div className="w-full sm:w-44">
          <Timer secondsLeft={secondsLeft} totalSeconds={settings.hintTime} />
        </div>
      </div>

      {/* Sequential Turn Order Sequence Strip */}
      <div className="bg-[#121215] border border-zinc-800 rounded-xl p-3.5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
            Ordem de Fala da Rodada
          </span>
          <span className="text-[10px] font-mono text-zinc-600">
            Passo {currentPlayerIndex + 1} de {turnOrder.length}
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin pb-1">
          {turnOrder.map((playerId, idx) => {
            const p = players.find(x => x.id === playerId);
            if (!p) return null;
            const isSpeakingNow = idx === currentPlayerIndex;
            const alreadySpoke = idx < currentPlayerIndex;
            const isMe = playerId === myPlayerId;

            return (
              <React.Fragment key={playerId}>
                <div
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs shrink-0 transition-colors ${
                    isSpeakingNow
                      ? 'border-[#EC4899] bg-[#EC4899]/10 text-[#EC4899] font-bold ring-1 ring-[#EC4899]/30'
                      : alreadySpoke
                      ? 'border-emerald-500/30 bg-emerald-950/10 text-emerald-400'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-400'
                  }`}
                >
                  <span className="text-[10px] font-mono opacity-60">#{idx + 1}</span>
                  <Avatar emoji={p.avatar} size="sm" />
                  <span className="truncate max-w-[90px]">
                    {p.nickname} {isMe && '(Você)'}
                  </span>
                </div>
                {idx < turnOrder.length - 1 && (
                  <ArrowRight size={12} className="text-zinc-700 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Secret Word Card with Eye Privacy Toggle */}
      <div className="bg-[#121215] border border-zinc-800 rounded-xl p-5 flex flex-col items-center text-center relative overflow-hidden">
        <div className="w-full flex items-center justify-between text-xs text-zinc-500 font-mono mb-2">
          <span className="flex items-center gap-1.5">
            <Lock size={12} className="text-[#EC4899]" />
            Sua Palavra Secreta
          </span>
          <button
            type="button"
            onClick={() => setShowWord(v => !v)}
            className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 transition-colors px-2 py-1 rounded bg-zinc-900 border border-zinc-800"
          >
            {showWord ? <EyeOff size={13} /> : <Eye size={13} />}
            <span>{showWord ? 'Ocultar' : 'Revelar'}</span>
          </button>
        </div>

        <div className="py-3">
          {showWord ? (
            <span className="text-3xl font-black tracking-tight text-white font-mono select-none">
              {myWord || '...'}
            </span>
          ) : (
            <span className="text-3xl font-mono tracking-widest text-zinc-700 select-none">
              &bull;&bull;&bull;&bull;&bull;&bull;
            </span>
          )}
        </div>

        <p className="text-[11px] text-zinc-500 max-w-sm">
          {showWord
            ? 'Atenção! Ninguém sabe se é Civil ou Impostor nesta rodada.'
            : 'Clique no botão acima para ver sua palavra.'}
        </p>
      </div>

      {/* Input Action Card (Guaranteed no freeze on rejection) */}
      <div className="bg-[#121215] border border-zinc-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono">
            {isMyTurn ? `Sua Vez: Enviar Dica #${currentTurn + 1}` : `Aguardando ${currentSpeaker?.nickname || 'outro jogador'}`}
          </span>
          <span className="text-[11px] text-zinc-500 font-mono">
            1 palavra &middot; Mínimo 2 letras &middot; Sem plural direto
          </span>
        </div>

        {submitted ? (
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 flex items-center gap-3">
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
            <div className="text-xs">
              <span className="font-semibold text-emerald-400 block">Dica enviada com sucesso!</span>
              <span className="text-zinc-400 text-[11px]">
                Aguardando a vez dos próximos jogadores...
              </span>
            </div>
          </div>
        ) : !isMyTurn ? (
          <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 flex items-center gap-3">
            <User size={16} className="text-[#EC4899] shrink-0" />
            <div className="text-xs text-zinc-300">
              Vez de <strong className="text-white font-semibold">{currentSpeaker?.nickname}</strong> enviar a dica. Fique atento!
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={hint}
                onChange={e => {
                  setHint(e.target.value.replace(/\s+/g, ''));
                  setHintError('');
                }}
                onKeyDown={handleKeyDown}
                placeholder="Digite exatamente 1 palavra..."
                maxLength={24}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#EC4899] transition-colors font-mono"
              />
              <button
                type="button"
                onClick={submitHint}
                disabled={!hint.trim()}
                className="px-5 py-3 bg-[#EC4899] hover:bg-[#db2777] disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-colors flex items-center gap-1.5 shrink-0"
              >
                <Send size={14} />
                <span>Enviar</span>
              </button>
            </div>
            {hintError && (
              <p className="text-xs text-red-400 font-mono">{hintError}</p>
            )}
          </div>
        )}
      </div>

      {/* Players Cards Grid with hints accumulated */}
      <div className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 font-mono">
          Jogadores na Partida
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {players.map(player => (
            <PlayerCard
              key={player.id}
              player={player}
              showHints={true}
              isCurrentTurnPlayer={player.id === curSpeakerId}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
