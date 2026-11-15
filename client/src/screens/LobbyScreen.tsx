import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { Copy, Check, Users, Settings as SettingsIcon, Play, LogOut, Crown, Globe, Lock } from 'lucide-react';
import { GameState, RoomSettings } from '../types';
import Avatar from '../components/Avatar';
import AdBanner from '../components/AdBanner';

const AVAILABLE_CATEGORIES = [
  'Cultura Pop',
  'Palavras Comuns & Objetos',
  'Comidas & Bebidas',
  'Lugares',
  'Animais',
  'Profissões',
  'Esportes',
];

interface LobbyScreenProps {
  socket: Socket | null;
  gameState: GameState;
  myPlayerId: string;
  onLeaveRoom?: () => void;
}

export default function LobbyScreen({
  socket,
  gameState,
  myPlayerId,
  onLeaveRoom,
}: LobbyScreenProps) {
  const [copied, setCopied] = useState(false);
  const [localSettings, setLocalSettings] = useState<RoomSettings>(gameState.settings);

  const me = gameState.players.find(p => p.id === myPlayerId);
  const isHost = me?.isHost ?? false;
  const canStart = gameState.players.length >= 3;

  useEffect(() => {
    setLocalSettings(gameState.settings);
  }, [gameState.settings]);

  const copyInviteLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('room', gameState.roomCode);
    navigator.clipboard.writeText(url.toString()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const updateSetting = (partial: Partial<RoomSettings>) => {
    if (!socket || !isHost) return;
    const next = { ...localSettings, ...partial };
    setLocalSettings(next);
    socket.emit('update-settings', next);
  };

  const toggleCategory = (cat: string) => {
    const active = localSettings.categories.includes(cat)
      ? localSettings.categories.filter(c => c !== cat)
      : [...localSettings.categories, cat];
    if (active.length === 0) return;
    updateSetting({ categories: active });
  };

  const handleStartGame = () => {
    if (!socket || !isHost || !canStart) return;
    socket.emit('start-game');
  };

  const handleLeave = () => {
    if (onLeaveRoom) {
      onLeaveRoom();
    } else {
      window.location.href = window.location.pathname;
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-zinc-800 bg-[#09090B]/90 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-black text-lg tracking-tight text-white font-mono">
              PUEDES<span className="text-[#EC4899]">?</span>
            </span>
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1">
              <span className="text-xs text-zinc-500 font-mono">SALA:</span>
              <span className="text-xs font-mono font-bold tracking-wider text-zinc-100">
                {gameState.roomCode}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-zinc-700 text-zinc-400">
                {localSettings.isPublic ? 'Pública' : 'Privada'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyInviteLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-zinc-200 transition-colors"
            >
              {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
              <span>{copied ? 'Link Copiado' : 'Copiar Link'}</span>
            </button>

            <button
              onClick={handleLeave}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-500/30 bg-red-950/20 hover:bg-red-950/40 text-xs font-medium text-red-400 transition-colors"
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

      {/* Main 3-Ad Grid */}
      <div className="flex-1 flex max-w-7xl mx-auto w-full px-4 py-5 gap-6">
        {/* Desktop Ad 1: Left Skyscraper */}
        <AdBanner slot="left-skyscraper" />

        {/* Center Main Stage */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Players Column (5 cols) */}
          <div className="lg:col-span-5 bg-[#121215] border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-800">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  <Users size={14} className="text-[#EC4899]" />
                  Jogadores Conectados
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                  {gameState.players.length} / 12
                </span>
              </div>

              {/* Player list */}
              <div className="space-y-2 max-h-[420px] overflow-y-auto scrollbar-thin pr-1">
                {gameState.players.map(player => (
                  <div
                    key={player.id}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border transition-colors ${
                      player.id === myPlayerId
                        ? 'bg-zinc-900 border-zinc-700'
                        : 'bg-zinc-950/40 border-zinc-800/80'
                    }`}
                  >
                    <Avatar emoji={player.avatar} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {player.isHost && (
                          <span title="Host da sala">
                            <Crown size={12} className="text-[#EC4899] shrink-0" />
                          </span>
                        )}
                        <span className="text-sm font-medium text-zinc-100 truncate">
                          {player.nickname}
                        </span>
                        {player.id === myPlayerId && (
                          <span className="text-[10px] font-mono text-zinc-500 uppercase">(Você)</span>
                        )}
                      </div>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  </div>
                ))}
              </div>
            </div>

            {/* Waiting Info or Start Button */}
            <div className="pt-4 mt-4 border-t border-zinc-800">
              {isHost ? (
                <div className="space-y-2">
                  <button
                    onClick={handleStartGame}
                    disabled={!canStart}
                    className="w-full py-3 bg-[#EC4899] hover:bg-[#db2777] disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <Play size={16} /> Iniciar Jogo ({gameState.players.length}/3 mín.)
                  </button>
                  {!canStart && (
                    <p className="text-[11px] font-mono text-zinc-500 text-center">
                      Aguardando pelo menos 3 jogadores para iniciar.
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-xs font-mono text-zinc-400 py-2">
                  <span className="w-2 h-2 rounded-full bg-[#EC4899] animate-pulse" />
                  <span>Aguardando o host iniciar a partida...</span>
                </div>
              )}
            </div>
          </div>

          {/* Settings Column (7 cols) */}
          <div className="lg:col-span-7 bg-[#121215] border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  <SettingsIcon size={14} className="text-[#EC4899]" />
                  Configurações da Sala
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                  Modo 100% Sequencial
                </span>
              </div>

              {/* Visibilidade da Sala (Pública / Privada) */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Visibilidade da Sala</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={!isHost}
                    onClick={() => updateSetting({ isPublic: true })}
                    className={`py-2 text-xs font-medium rounded-lg border transition-colors flex items-center justify-center gap-2 ${
                      localSettings.isPublic
                        ? 'border-[#EC4899] bg-[#EC4899]/10 text-[#EC4899] font-bold'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <Globe size={13} />
                    <span>Pública (Aparece na Lista)</span>
                  </button>
                  <button
                    type="button"
                    disabled={!isHost}
                    onClick={() => updateSetting({ isPublic: false })}
                    className={`py-2 text-xs font-medium rounded-lg border transition-colors flex items-center justify-center gap-2 ${
                      !localSettings.isPublic
                        ? 'border-[#EC4899] bg-[#EC4899]/10 text-[#EC4899] font-bold'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <Lock size={13} />
                    <span>Privada (Apenas com Link)</span>
                  </button>
                </div>
              </div>

              {/* Rounds */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Número de Rodadas</label>
                <div className="grid grid-cols-4 gap-2">
                  {[3, 5, 7, 10].map(r => (
                    <button
                      key={r}
                      disabled={!isHost}
                      onClick={() => updateSetting({ rounds: r })}
                      className={`py-2 text-xs font-mono rounded-lg border transition-colors ${
                        localSettings.rounds === r
                          ? 'border-[#EC4899] bg-[#EC4899]/10 text-[#EC4899] font-bold'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Impostors */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-400">Impostores por Rodada</label>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {gameState.players.length <= 4
                      ? 'Máx. 1 impostor (3-4 jogadores)'
                      : `Máx. ${Math.max(1, Math.floor((gameState.players.length - 1) / 2))} impostores`}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {(['auto', 1, 2, 3] as const).map(imp => {
                    const isDisabledByCount =
                      imp === 2 ? gameState.players.length < 5 :
                      imp === 3 ? gameState.players.length < 7 :
                      false;
                    const disabled = !isHost || isDisabledByCount;

                    return (
                      <button
                        key={imp}
                        type="button"
                        disabled={disabled}
                        onClick={() => updateSetting({ impostors: imp })}
                        title={
                          isDisabledByCount
                            ? `Requer pelo menos ${imp === 2 ? 5 : 7} jogadores na sala`
                            : undefined
                        }
                        className={`py-2 text-xs font-mono rounded-lg border transition-colors flex flex-col items-center justify-center ${
                          disabled && isDisabledByCount
                            ? 'border-zinc-800/40 bg-zinc-950/40 text-zinc-600 cursor-not-allowed opacity-60'
                            : localSettings.impostors === imp
                            ? 'border-[#EC4899] bg-[#EC4899]/10 text-[#EC4899] font-bold'
                            : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <span>{imp === 'auto' ? 'Automático' : `${imp} Impostor${imp > 1 ? 'es' : ''}`}</span>
                        {isDisabledByCount && (
                          <span className="text-[9px] text-zinc-600 font-normal">
                            ({imp === 2 ? '5+' : '7+'} jog.)
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Timers */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">Tempo por Dica</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[15, 20, 30, 45].map(t => (
                      <button
                        key={t}
                        disabled={!isHost}
                        onClick={() => updateSetting({ hintTime: t })}
                        className={`py-1.5 text-xs font-mono rounded-lg border transition-colors ${
                          localSettings.hintTime === t
                            ? 'border-[#EC4899] bg-[#EC4899]/10 text-[#EC4899] font-bold'
                            : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        {t}s
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">Tempo de Discussão/Voto</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[60, 90, 120, 180].map(t => (
                      <button
                        key={t}
                        disabled={!isHost}
                        onClick={() => updateSetting({ discussTime: t })}
                        className={`py-1.5 text-xs font-mono rounded-lg border transition-colors ${
                          localSettings.discussTime === t
                            ? 'border-[#EC4899] bg-[#EC4899]/10 text-[#EC4899] font-bold'
                            : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        {t}s
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Categories */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 flex items-center justify-between">
                  <span>Categorias Ativas ({localSettings.categories.length})</span>
                  <span className="text-[10px] text-zinc-500 font-mono">Ordem e palavras sorteadas</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {AVAILABLE_CATEGORIES.map(cat => {
                    const isChecked = localSettings.categories.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        disabled={!isHost}
                        onClick={() => toggleCategory(cat)}
                        className={`px-3 py-1.5 text-xs rounded-lg border text-left flex items-center justify-between transition-colors ${
                          isChecked
                            ? 'border-zinc-700 bg-zinc-900 text-zinc-200'
                            : 'border-zinc-800/80 bg-zinc-950/40 text-zinc-600'
                        }`}
                      >
                        <span className="truncate">{cat}</span>
                        <div
                          className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                            isChecked
                              ? 'bg-[#EC4899] border-[#EC4899] text-white'
                              : 'border-zinc-700 bg-zinc-800'
                          }`}
                        >
                          {isChecked && <Check size={10} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

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
