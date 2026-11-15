import React, { useState, useRef, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { Send, MessageSquare } from 'lucide-react';
import { ChatMessage } from '../types';
import Avatar from './Avatar';

interface ChatPanelProps {
  messages: ChatMessage[];
  socket: Socket | null;
  myPlayerId: string;
}

export default function ChatPanel({ messages, socket, myPlayerId }: ChatPanelProps) {
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const clean = text.trim();
    if (!clean || !socket) return;
    socket.emit('send-message', { text: clean });
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full rounded-xl border border-zinc-800 bg-[#121215] overflow-hidden">
      {/* Header */}
      <div className="px-3.5 py-2.5 border-b border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-950/40">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          <MessageSquare size={13} className="text-[#EC4899]" />
          Chat ao Vivo
        </div>
        <span className="text-[10px] font-mono text-zinc-500">
          {messages.length} {messages.length === 1 ? 'msg' : 'msgs'}
        </span>
      </div>

      {/* Message List */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2.5 scrollbar-thin min-h-[220px] max-h-[360px] lg:max-h-none">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-zinc-600 text-xs py-10">
            <MessageSquare size={20} className="mb-2 text-zinc-700" />
            <p>Nenhuma mensagem ainda.</p>
            <p className="text-[11px] text-zinc-700">Debatam quem pode ser o impostor!</p>
          </div>
        ) : (
          messages.map(msg => {
            const isMe = msg.playerId === myPlayerId;
            if (msg.system) {
              return (
                <div key={msg.id} className="text-center text-[11px] font-mono text-zinc-500 py-1">
                  {msg.text}
                </div>
              );
            }
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-2 text-xs ${isMe ? 'flex-row-reverse' : ''}`}
              >
                <Avatar emoji={msg.avatar} size="sm" />
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-1.5 border ${
                    isMe
                      ? 'bg-zinc-800 border-zinc-700 text-zinc-100'
                      : 'bg-zinc-900 border-zinc-800/80 text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="font-semibold text-[11px] text-zinc-400 truncate">
                      {isMe ? 'Você' : msg.nickname}
                    </span>
                  </div>
                  <p className="break-words leading-relaxed text-xs">{msg.text}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Box */}
      <div className="p-2.5 border-t border-zinc-800 bg-zinc-950/40 shrink-0">
        <div className="flex gap-1.5">
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escreva sua mensagem..."
            maxLength={140}
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#EC4899] transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className="px-3 py-2 bg-[#EC4899] hover:bg-[#db2777] disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors shrink-0"
            aria-label="Enviar mensagem"
          >
            <Send size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
