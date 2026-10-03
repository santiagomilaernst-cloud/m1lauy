let ctx: AudioContext | null = null;
let muted = false;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function setWheelMuted(value: boolean) {
  muted = value;
}

export function isWheelMuted() {
  return muted;
}

function tone(freq: number, start: number, duration: number, type: OscillatorType, volume: number, endFreq?: number) {
  const c = audio();
  if (!c || muted) return;
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t0 + duration);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

export function playTick() {
  tone(1500, 0, 0.04, "square", 0.05, 700);
}

/** Plays decelerating ticks that follow the wheel's ease-out spin. Returns a cancel function. */
export function playSpinTicks(totalDegrees: number, durationMs: number, step: number) {
  const count = Math.max(1, Math.floor(totalDegrees / step));
  const timers: number[] = [];
  for (let k = 1; k <= count; k++) {
    const p = k / count;
    const t = durationMs * (1 - Math.pow(1 - p, 0.28));
    timers.push(window.setTimeout(playTick, Math.min(t, durationMs)));
  }
  return () => timers.forEach((id) => window.clearTimeout(id));
}

export function playWin(big = false) {
  const notes = big ? [523, 659, 784, 1047, 1319, 1568] : [523, 659, 784, 1047];
  notes.forEach((f, i) => {
    tone(f, i * 0.11, 0.35, "triangle", 0.16);
    tone(f * 2, i * 0.11, 0.25, "sine", 0.05);
  });
  if (big) tone(1568, notes.length * 0.11, 0.9, "triangle", 0.14);
}

export function playFunEnd() {
  tone(660, 0, 0.14, "sine", 0.12);
  tone(880, 0.12, 0.2, "sine", 0.12);
}
