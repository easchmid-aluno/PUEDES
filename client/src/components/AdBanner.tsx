import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

interface AdBannerProps {
  slot:
    | 'top-leaderboard'
    | 'bottom-leaderboard'
    | 'left-skyscraper'
    | 'right-skyscraper'
    | 'mobile-slot-1'
    | 'mobile-slot-2'
    | 'mobile-slot-3';
  className?: string;
}

const AD_CLIENT_ID = 'ca-pub-7012680480559206';

export default function AdBanner({ slot, className = '' }: AdBannerProps) {
  const adRef = useRef<HTMLModElement | null>(null);
  const pushedRef = useRef(false);

  useEffect(() => {
    // Only push once per mount and if AdSense is loaded
    if (!pushedRef.current && typeof window !== 'undefined') {
      try {
        if (adRef.current && adRef.current.innerHTML === '') {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          pushedRef.current = true;
        }
      } catch {
        // Silently catch ad blocker or multiple push errors
      }
    }
  }, []);

  // Desktop Top or Bottom Leaderboard: 728x90 (hidden on mobile)
  if (slot === 'top-leaderboard' || slot === 'bottom-leaderboard') {
    return (
      <div className={`hidden lg:flex justify-center w-full my-2 ${className}`}>
        <div
          className="relative flex flex-col items-center justify-center border border-zinc-800 bg-[#0c0c0e] rounded-md select-none overflow-hidden"
          style={{ width: 728, height: 90 }}
          aria-label="Publicidade"
        >
          <ins
            ref={adRef}
            className="adsbygoogle"
            style={{ display: 'inline-block', width: 728, height: 90 }}
            data-ad-client={AD_CLIENT_ID}
            data-ad-format="horizontal"
            data-full-width-responsive="false"
          />
          <span className="absolute bottom-1 right-2 text-[9px] text-zinc-600 font-mono tracking-widest uppercase pointer-events-none">
            Publicidade
          </span>
        </div>
      </div>
    );
  }

  // Desktop Left or Right Skyscraper: 160x600 (hidden below xl)
  if (slot === 'left-skyscraper' || slot === 'right-skyscraper') {
    return (
      <aside className={`hidden xl:flex flex-col items-center justify-center shrink-0 ${className}`}>
        <div
          className="relative flex flex-col items-center justify-center border border-zinc-800 bg-[#0c0c0e] rounded-md select-none overflow-hidden"
          style={{ width: 160, height: 600 }}
          aria-label="Publicidade"
        >
          <ins
            ref={adRef}
            className="adsbygoogle"
            style={{ display: 'inline-block', width: 160, height: 600 }}
            data-ad-client={AD_CLIENT_ID}
            data-ad-format="vertical"
            data-full-width-responsive="false"
          />
          <span className="absolute bottom-2 text-[9px] text-zinc-600 font-mono tracking-widest uppercase [writing-mode:vertical-lr] rotate-180 pointer-events-none">
            Publicidade
          </span>
        </div>
      </aside>
    );
  }

  // Mobile horizontal slots: 320x50 / 320x100 (hidden on desktop)
  return (
    <div className={`flex lg:hidden justify-center w-full my-1.5 ${className}`}>
      <div
        className="relative flex items-center justify-center border border-zinc-800 bg-[#0c0c0e] rounded-md select-none overflow-hidden"
        style={{ width: 320, height: 50 }}
        aria-label="Publicidade"
      >
        <ins
          ref={adRef}
          className="adsbygoogle"
          style={{ display: 'inline-block', width: 320, height: 50 }}
          data-ad-client={AD_CLIENT_ID}
          data-ad-format="horizontal"
          data-full-width-responsive="true"
        />
        <span className="absolute bottom-0.5 right-1.5 text-[8px] text-zinc-600 font-mono tracking-widest uppercase pointer-events-none">
          Publicidade
        </span>
      </div>
    </div>
  );
}
