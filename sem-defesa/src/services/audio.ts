/**
 * Efeitos sonoros sintetizados com Web Audio API — sem arquivos externos.
 * O AudioContext só é criado dentro de uma interação do usuário (política de autoplay).
 */
export type Sfx = 'tap' | 'select' | 'flip' | 'confirm' | 'reveal' | 'tick' | 'winner' | 'tie' | 'whoosh';

let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(value: boolean) {
  enabled = value;
}

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(
  ac: AudioContext,
  opts: { freq: number; to?: number; start?: number; dur: number; type?: OscillatorType; gain?: number },
) {
  const t0 = ac.currentTime + (opts.start ?? 0);
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(opts.freq, t0);
  if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, t0 + opts.dur);
  const peak = opts.gain ?? 0.12;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + opts.dur + 0.05);
}

function noise(ac: AudioContext, opts: { start?: number; dur: number; from: number; to: number; gain?: number }) {
  const t0 = ac.currentTime + (opts.start ?? 0);
  const len = Math.max(1, Math.floor(ac.sampleRate * opts.dur));
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 1.2;
  filter.frequency.setValueAtTime(opts.from, t0);
  filter.frequency.exponentialRampToValueAtTime(opts.to, t0 + opts.dur);
  const g = ac.createGain();
  g.gain.value = opts.gain ?? 0.25;
  src.connect(filter).connect(g).connect(ac.destination);
  src.start(t0);
}

export function playSfx(name: Sfx) {
  if (!enabled) return;
  const ac = getCtx();
  if (!ac) return;
  try {
    switch (name) {
      case 'tap':
        tone(ac, { freq: 520, to: 380, dur: 0.06, type: 'triangle', gain: 0.06 });
        break;
      case 'select':
        tone(ac, { freq: 660, to: 990, dur: 0.09, type: 'triangle', gain: 0.08 });
        break;
      case 'flip':
        noise(ac, { dur: 0.16, from: 900, to: 4200, gain: 0.3 });
        break;
      case 'whoosh':
        noise(ac, { dur: 0.28, from: 400, to: 2400, gain: 0.18 });
        break;
      case 'confirm':
        tone(ac, { freq: 440, dur: 0.08, type: 'square', gain: 0.05 });
        tone(ac, { freq: 880, start: 0.07, dur: 0.14, type: 'square', gain: 0.05 });
        break;
      case 'tick':
        tone(ac, { freq: 1200, dur: 0.035, type: 'square', gain: 0.035 });
        break;
      case 'reveal':
        tone(ac, { freq: 180, to: 720, dur: 0.6, type: 'sawtooth', gain: 0.05 });
        noise(ac, { dur: 0.6, from: 300, to: 3000, gain: 0.12 });
        break;
      case 'winner':
        [523, 659, 784, 1046].forEach((f, i) =>
          tone(ac, { freq: f, start: i * 0.07, dur: 0.35, type: 'triangle', gain: 0.09 }),
        );
        noise(ac, { start: 0.0, dur: 0.12, from: 2000, to: 200, gain: 0.35 });
        break;
      case 'tie':
        tone(ac, { freq: 392, to: 370, dur: 0.25, type: 'sawtooth', gain: 0.05 });
        tone(ac, { freq: 392, to: 300, start: 0.22, dur: 0.45, type: 'sawtooth', gain: 0.05 });
        break;
    }
  } catch {
    // áudio é opcional: qualquer falha é ignorada
  }
}
