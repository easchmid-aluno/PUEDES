import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { Plus, LogIn, Users, Shield, Zap, Globe, Lock, RefreshCw, ArrowRight } from 'lucide-react';
import { RoomSettings, PublicRoomInfo } from '../types';
import Avatar, { AVATAR_LIST } from '../components/Avatar';
import AdBanner from '../components/AdBanner';

interface LandingScreenProps {
  socket: Socket | null;
  connected: boolean;
  defaultSettings: RoomSettings;
  initialRoomCode: string;
}

export default function LandingScreen({
  socket,
  connected,
  defaultSettings,
  initialRoomCode,
}: LandingScreenProps) {
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState(AVATAR_LIST[0]);
  const [roomCode, setRoomCode] = useState(initialRoomCode);
  const [activeTab, setActiveTab] = useState<'create' | 'join'>(initialRoomCode ? 'join' : 'create');
  const [isPublicRoom, setIsPublicRoom] = useState(true);
  const [publicRooms, setPublicRooms] = useState<PublicRoomInfo[]>([]);
  const [error, setError] = useState('');
  const [joinError, setJoinError] = useState('');
  const roomInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialRoomCode) {
      setActiveTab('join');
      setTimeout(() => roomInputRef.current?.focus(), 250);
    }
  }, [initialRoomCode]);

  useEffect(() => {
    if (!socket) return;

    const onPublicRooms = (rooms: PublicRoomInfo[]) => {
      setPublicRooms(rooms || []);
    };

    const errHandler = (data: { message: string }) => setJoinError(data.message);

    socket.on('public-rooms-list', onPublicRooms);
    socket.on('join-error', errHandler);

    // Request initial public rooms list
    socket.emit('get-public-rooms');

    return () => {
      socket.off('public-rooms-list', onPublicRooms);
      socket.off('join-error', errHandler);
    };
  }, [socket]);

  const refreshPublicRooms = () => {
    if (!socket) return;
    socket.emit('get-public-rooms');
  };

  const validate = (): boolean => {
    const nick = nickname.trim();
    if (nick.length < 2) {
      setError('Nickname deve ter pelo menos 2 caracteres.');
      return false;
    }
    if (nick.length > 16) {
      setError('Nickname pode ter no máximo 16 caracteres.');
      return false;
    }
    setError('');
    return true;
  };

  const handleCreate = () => {
    if (!validate() || !socket) return;
    socket.emit('create-room', {
      nickname: nickname.trim(),
      avatar,
      settings: {
        ...defaultSettings,
        isPublic: isPublicRoom,
      },
    });
  };

  const handleJoin = (targetCode?: string) => {
    if (!validate() || !socket) return;
    const cleanCode = (targetCode || roomCode).trim().toUpperCase();
    if (cleanCode.length < 4) {
      setError('Código de sala inválido.');
      return;
    }
    socket.emit('join-room', {
      roomCode: cleanCode,
      nickname: nickname.trim(),
      avatar,
    });
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-zinc-800 bg-[#09090B]/90 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="font-black text-lg tracking-tight text-white font-mono">
              PUEDES<span className="text-[#EC4899]">?</span>
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-red-500'}`} />
            <span className="hidden sm:inline">{connected ? 'Servidor Conectado' : 'Conectando...'}</span>
          </div>
        </div>
      </header>

      {/* Mobile Ad Slot 1 */}
      <AdBanner slot="mobile-slot-1" />

      {/* Main Container with 3-Ad Layout */}
      <div className="flex-1 flex max-w-7xl mx-auto w-full px-4 py-6 gap-6 items-start">
        {/* Desktop Ad 1: Left Skyscraper */}
        <AdBanner slot="left-skyscraper" />

        {/* Center Game Stage (Create/Join + Public Lobbies) */}
        <main className="flex-1 w-full max-w-2xl mx-auto space-y-6">
          {/* Card 1: Nickname, Avatar & Room Action */}
          <div className="bg-[#121215] border border-zinc-800 rounded-2xl p-6 sm:p-7 shadow-2xl">
            {/* Hero Brand */}
            <div className="text-center mb-6">
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white font-mono">
                PUEDES<span className="text-[#EC4899]">?</span>
              </h1>
            </div>

            {/* Nickname Input */}
            <div className="space-y-1.5 mb-5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
                Seu Nickname
              </label>
              <input
                type="text"
                value={nickname}
                onChange={e => {
                  setNickname(e.target.value.slice(0, 16));
                  setError('');
                }}
                placeholder="Como quer ser chamado?"
                maxLength={16}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#EC4899] transition-colors"
              />
            </div>

            {/* Avatar Selector (48 Emojis in Clean Grid) */}
            <div className="space-y-2 mb-6">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Escolha seu Avatar
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">Selecionado:</span>
                  <Avatar emoji={avatar} size="sm" selected />
                </div>
              </div>

              <div className="grid grid-cols-8 gap-2 p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl max-h-36 overflow-y-auto scrollbar-thin">
                {AVATAR_LIST.map((emoji, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAvatar(emoji)}
                    className={`aspect-square rounded-full flex items-center justify-center text-lg transition-transform hover:scale-110 active:scale-95 ${
                      avatar === emoji
                        ? 'border-2 border-[#EC4899] bg-zinc-800 ring-2 ring-[#EC4899]/20'
                        : 'border border-transparent hover:bg-zinc-800/80'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Mode Switch: Criar Sala / Entrar */}
            <div className="flex border-b border-zinc-800 mb-5">
              <button
                onClick={() => { setActiveTab('create'); setError(''); setJoinError(''); }}
                className={`flex-1 pb-3 text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
                  activeTab === 'create'
                    ? 'border-[#EC4899] text-[#EC4899]'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Plus size={14} /> Criar Sala
              </button>
              <button
                onClick={() => { setActiveTab('join'); setError(''); setJoinError(''); }}
                className={`flex-1 pb-3 text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
                  activeTab === 'join'
                    ? 'border-[#EC4899] text-[#EC4899]'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <LogIn size={14} /> Entrar com Código
              </button>
            </div>

            {/* Action Area */}
            <div className="space-y-3">
              {error && (
                <div className="px-3 py-2 bg-red-950/40 border border-red-500/30 rounded-lg text-xs text-red-400">
                  {error}
                </div>
              )}
              {joinError && (
                <div className="px-3 py-2 bg-red-950/40 border border-red-500/30 rounded-lg text-xs text-red-400">
                  {joinError}
                </div>
              )}

              {activeTab === 'create' ? (
                <div className="space-y-3">
                  {/* Public / Private Selector */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <button
                      type="button"
                      onClick={() => setIsPublicRoom(true)}
                      className={`py-2 rounded-lg border transition-colors flex items-center justify-center gap-1.5 ${
                        isPublicRoom
                          ? 'border-[#EC4899] bg-[#EC4899]/10 text-[#EC4899] font-bold'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <Globe size={13} />
                      <span>Sala Pública</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPublicRoom(false)}
                      className={`py-2 rounded-lg border transition-colors flex items-center justify-center gap-1.5 ${
                        !isPublicRoom
                          ? 'border-[#EC4899] bg-[#EC4899]/10 text-[#EC4899] font-bold'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <Lock size={13} />
                      <span>Sala Privada</span>
                    </button>
                  </div>

                  <button
                    onClick={handleCreate}
                    disabled={!connected}
                    className="w-full py-3 bg-[#EC4899] hover:bg-[#db2777] disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus size={16} /> Criar Nova Sala
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <input
                    ref={roomInputRef}
                    type="text"
                    value={roomCode}
                    onChange={e => {
                      setRoomCode(e.target.value.toUpperCase().slice(0, 8));
                      setJoinError('');
                    }}
                    placeholder="Código da Sala (Ex: ABC123)"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 text-center tracking-widest font-mono uppercase focus:outline-none focus:border-[#EC4899] transition-colors"
                  />
                  <button
                    onClick={() => handleJoin()}
                    disabled={!connected}
                    className="w-full py-3 bg-[#EC4899] hover:bg-[#db2777] disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <LogIn size={16} /> Entrar na Sala
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Salas Públicas Abertas (Gartic Style) */}
          <div className="bg-[#121215] border border-zinc-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Globe size={15} className="text-[#EC4899]" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-200 font-mono">
                  Salas Públicas Abertas
                </h2>
              </div>
              <button
                type="button"
                onClick={refreshPublicRooms}
                className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                title="Atualizar lista"
              >
                <RefreshCw size={12} />
              </button>
            </div>

            {publicRooms.length === 0 ? (
              <div className="py-8 text-center text-xs font-mono text-zinc-500 space-y-1">
                <p>Nenhuma sala pública aberta no momento.</p>
                <p className="text-[11px] text-zinc-600">Crie uma sala pública acima para que outros jogadores possam entrar!</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto scrollbar-thin pr-1">
                {publicRooms.map(r => (
                  <div
                    key={r.roomCode}
                    className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar emoji={r.hostAvatar} size="sm" />
                      <div className="min-w-0">
                        <span className="text-xs font-medium text-zinc-100 truncate block">
                          Sala de {r.hostNickname}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500">
                          Código: {r.roomCode} &middot; {r.rounds} rodadas
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-mono text-zinc-400">
                        {r.playerCount}/{r.maxPlayers} jog.
                      </span>
                      <button
                        type="button"
                        onClick={() => handleJoin(r.roomCode)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#EC4899] hover:bg-[#db2777] text-white text-xs font-medium transition-colors"
                      >
                        <span>Entrar</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Desktop Ad 2: Right Skyscraper */}
        <AdBanner slot="right-skyscraper" />
      </div>

      {/* Desktop Ad 3 / Mobile Ad 2 & 3 */}
      <footer className="border-t border-zinc-800 py-3 bg-[#09090B]">
        <div className="max-w-6xl mx-auto px-4 flex flex-col items-center">
          <AdBanner slot="bottom-leaderboard" />
          <AdBanner slot="mobile-slot-2" />
          <p className="text-[11px] font-mono text-zinc-600 mt-2">
            PUEDES? &copy; 2026
          </p>
        </div>
      </footer>
    </div>
  );
}
