let audioContext: AudioContext | null = null;

function context() {
  if (typeof window === "undefined") return null;
  audioContext ??= new AudioContext();
  void audioContext.resume();
  return audioContext;
}

function tone(ctx: AudioContext, start: number, duration: number, frequency: number, volume: number) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.08, start + duration * .45);
  gain.gain.setValueAtTime(.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + .025);
  gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + .02);
}

export function isGoalSoundEvent(kind: string) {
  return kind === "goal" || kind === "penalty-goal";
}

export function prepareMatchGoalSound() {
  context();
}

export function playMatchGoalSound() {
  const ctx = context();
  if (!ctx) return;
  const now = ctx.currentTime + .02;
  tone(ctx, now, .15, 520, .04);
  tone(ctx, now + .11, .2, 780, .045);
  tone(ctx, now + .25, .24, 1040, .04);
}
