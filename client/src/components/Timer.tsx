import React from 'react';
import { Clock } from 'lucide-react';

interface TimerProps {
  secondsLeft: number;
  totalSeconds?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function Timer({
  secondsLeft,
  totalSeconds = 30,
  className = '',
  size = 'md',
}: TimerProps) {
  const isUrgent = secondsLeft <= 5 && secondsLeft > 0;
  const pct = Math.min(100, Math.max(0, (secondsLeft / Math.max(1, totalSeconds)) * 100));

  if (size === 'sm') {
    return (
      <div className={`inline-flex items-center gap-1.5 font-mono text-xs font-semibold px-2 py-0.5 rounded border ${
        isUrgent
          ? 'bg-red-500/10 border-red-500/30 text-red-400 animate-pulse'
          : 'bg-zinc-900 border-zinc-800 text-zinc-300'
      } ${className}`}>
        <Clock size={12} className={isUrgent ? 'text-red-400' : 'text-zinc-500'} />
        <span>{secondsLeft}s</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center justify-between font-mono text-xs">
        <span className="text-zinc-500 uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
          <Clock size={13} className={isUrgent ? 'text-red-400' : 'text-zinc-500'} />
          Tempo Restante
        </span>
        <span className={`font-bold tabular-nums ${isUrgent ? 'text-red-400' : 'text-[#EC4899]'}`}>
          {secondsLeft}s
        </span>
      </div>
      <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            isUrgent ? 'bg-red-500' : 'bg-[#EC4899]'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
