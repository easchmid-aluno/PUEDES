import React from 'react';

export const AVATAR_LIST: string[] = [
  // Animais
  '🦊', '🐺', '🦁', '🐯', '🐻', '🐼', '🐨', '🐸',
  '🐙', '🦉', '🦅', '🦄', '🐲', '🦈', '🐝', '🦋',
  // Personagens e Símbolos
  '🎭', '🃏', '🎪', '🎨', '🚀', '🛸', '🛰️', '⚡',
  '🔥', '🌊', '⭐', '💎', '👑', '🔮', '🎲', '🧩',
  // Comidas e Bebidas
  '🍕', '🍔', '🍣', '🌮', '🍩', '🥑', '☕', '🍿',
  // Objetos e Esportes
  '🥊', '🎸', '🎯', '🧭', '🗝️', '🏹', '🎧', '📷'
];

interface AvatarProps {
  emoji: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  isHost?: boolean;
}

export default function Avatar({
  emoji,
  size = 'md',
  selected = false,
  onClick,
  className = '',
}: AvatarProps) {
  const sizeClasses = {
    sm: 'w-7 h-7 text-sm',
    md: 'w-10 h-10 text-xl',
    lg: 'w-12 h-12 text-2xl',
    xl: 'w-16 h-16 text-3xl',
  }[size];

  const borderClass = selected
    ? 'border-[#EC4899] ring-2 ring-[#EC4899]/30 bg-zinc-800'
    : 'border-zinc-700 hover:border-zinc-500 bg-zinc-900';

  const clickableClass = onClick ? 'cursor-pointer hover:scale-105 active:scale-95' : '';

  return (
    <div
      onClick={onClick}
      className={`aspect-square shrink-0 overflow-hidden flex items-center justify-center rounded-full border select-none leading-none transition-all duration-150 ${sizeClasses} ${borderClass} ${clickableClass} ${className}`}
      aria-label={`Avatar ${emoji}`}
    >
      <span className="flex items-center justify-center transform -translate-y-[0.5px]">
        {emoji || '👤'}
      </span>
    </div>
  );
}
