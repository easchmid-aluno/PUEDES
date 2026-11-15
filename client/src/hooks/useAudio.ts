export function useAudio() {
  const getContext = (): AudioContext | null => {
    try {
      return new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      return null;
    }
  };

  const playTone = (
    frequency: number,
    duration: number,
    type: OscillatorType = 'sine',
    gainValue = 0.3,
    startTime = 0,
    ctx?: AudioContext
  ) => {
    const context = ctx || getContext();
    if (!context) return;

    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, context.currentTime + startTime);
    gainNode.gain.setValueAtTime(gainValue, context.currentTime + startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + startTime + duration);

    oscillator.start(context.currentTime + startTime);
    oscillator.stop(context.currentTime + startTime + duration);
  };

  const playHintSubmit = () => {
    // Short blip: 880hz, 0.1s
    const ctx = getContext();
    if (!ctx) return;
    playTone(880, 0.1, 'sine', 0.25, 0, ctx);
  };

  const playCountdown = () => {
    // Tick: 440hz, 0.08s
    const ctx = getContext();
    if (!ctx) return;
    playTone(440, 0.08, 'square', 0.15, 0, ctx);
  };

  const playVoteStart = () => {
    // Rising tone: 220→660hz, 0.3s
    const ctx = getContext();
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(220, ctx.currentTime);
    oscillator.frequency.linearRampToValueAtTime(660, ctx.currentTime + 0.3);
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.35);
  };

  const playReveal = () => {
    // Fanfare: 3 ascending tones
    const ctx = getContext();
    if (!ctx) return;

    const tones = [
      { freq: 523.25, start: 0, dur: 0.18 },     // C5
      { freq: 659.25, start: 0.2, dur: 0.18 },   // E5
      { freq: 783.99, start: 0.4, dur: 0.35 },   // G5
    ];

    tones.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      gain.gain.setValueAtTime(0.3, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.05);
    });
  };

  return { playHintSubmit, playCountdown, playVoteStart, playReveal };
}
