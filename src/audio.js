// Tiny WebAudio synth: cozy music loop and sound effects. No audio files.
let ctx = null, master = null, music = null, sfx = null, noiseBuf = null;
let muted = false;
try { muted = localStorage.getItem('hh_muted') === '1'; } catch { /* storage unavailable */ }

export const isMuted = () => muted;

export function unlock() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = muted ? 0 : 0.8; master.connect(ctx.destination);
  music = ctx.createGain(); music.gain.value = 0.22; music.connect(master);
  sfx = ctx.createGain(); sfx.gain.value = 0.55; sfx.connect(master);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  startMusic();
}

export function setMuted(m) {
  muted = m;
  try { localStorage.setItem('hh_muted', m ? '1' : '0'); } catch { /* ignore */ }
  if (master) master.gain.setTargetAtTime(m ? 0 : 0.8, ctx.currentTime, 0.05);
}

function tone(freq, start, dur, { type = 'sine', vol = 0.3, attack = 0.01, dest = sfx, slideTo = null } = {}) {
  if (!ctx) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(vol, start + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g); g.connect(dest);
  o.start(start); o.stop(start + dur + 0.05);
}
function noise(start, dur, { freq = 800, q = 1, vol = 0.2, type = 'bandpass' } = {}) {
  if (!ctx) return;
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  s.connect(f); f.connect(g); g.connect(sfx);
  s.start(start); s.stop(start + dur + 0.02);
}

export const sfxs = {
  step() { if (ctx) noise(ctx.currentTime, 0.07, { freq: 500 + Math.random() * 300, q: 0.8, vol: 0.12 }); },
  chime() { if (!ctx) return; const t = ctx.currentTime; tone(880, t, 0.6, { vol: 0.18 }); tone(1320, t + 0.08, 0.7, { vol: 0.12 }); },
  pop() { if (ctx) tone(520, ctx.currentTime, 0.12, { vol: 0.15, slideTo: 780 }); },
  giggle() {
    if (!ctx) return;
    const t = ctx.currentTime;
    [700, 820, 760, 900, 840].forEach((f, i) => tone(f, t + i * 0.09, 0.08, { type: 'triangle', vol: 0.2, slideTo: f * 1.15 }));
  },
  babble() {
    if (!ctx) return;
    const t = ctx.currentTime, n = 2 + (Math.random() * 2 | 0);
    for (let i = 0; i < n; i++) { const f = 380 + Math.random() * 220; tone(f, t + i * 0.16, 0.12, { type: 'triangle', vol: 0.14, slideTo: f * 0.85 }); }
  },
  cry() { if (!ctx) return; const t = ctx.currentTime; tone(620, t, 0.5, { type: 'triangle', vol: 0.12, slideTo: 420 }); tone(600, t + 0.6, 0.45, { type: 'triangle', vol: 0.1, slideTo: 430 }); },
  coo() { if (ctx) tone(500, ctx.currentTime, 0.35, { type: 'sine', vol: 0.15, slideTo: 640 }); },
  yawn() { if (ctx) tone(420, ctx.currentTime, 0.8, { type: 'sine', vol: 0.12, slideTo: 260, attack: 0.15 }); },
  shush() { if (ctx) { const t = ctx.currentTime; noise(t, 0.4, { freq: 3500, q: 0.6, vol: 0.08 }); noise(t + 0.55, 0.4, { freq: 3500, q: 0.6, vol: 0.08 }); } },
  sip() { if (ctx) { const t = ctx.currentTime; for (let i = 0; i < 3; i++) tone(300, t + i * 0.25, 0.1, { vol: 0.1, slideTo: 200 }); } },
  shutter() { if (ctx) { const t = ctx.currentTime; noise(t, 0.05, { freq: 2000, vol: 0.3 }); noise(t + 0.07, 0.06, { freq: 1200, vol: 0.25 }); } },
  sneeze() { if (ctx) { const t = ctx.currentTime; tone(500, t, 0.15, { type: 'triangle', vol: 0.12, slideTo: 700 }); noise(t + 0.2, 0.15, { freq: 2500, vol: 0.2 }); } },
  chirp() { if (!ctx) return; const t = ctx.currentTime; tone(2400, t, 0.08, { vol: 0.08, slideTo: 3200 }); tone(2600, t + 0.12, 0.08, { vol: 0.08, slideTo: 3400 }); },
  jay() { if (ctx) { const t = ctx.currentTime; for (let i = 0; i < 3; i++) noise(t + i * 0.13, 0.09, { freq: 1800, q: 3, vol: 0.18 }); } },
  raven() { if (ctx) { const t = ctx.currentTime; tone(320, t, 0.3, { type: 'sawtooth', vol: 0.06, slideTo: 260 }); tone(300, t + 0.38, 0.28, { type: 'sawtooth', vol: 0.05, slideTo: 250 }); } },
  owl() { if (ctx) { const t = ctx.currentTime; tone(340, t, 0.35, { vol: 0.2, slideTo: 310, attack: 0.08 }); tone(330, t + 0.5, 0.5, { vol: 0.2, slideTo: 300, attack: 0.08 }); } },
  squeak() { if (ctx) { const t = ctx.currentTime; tone(1800, t, 0.06, { vol: 0.08, slideTo: 2400 }); tone(1900, t + 0.09, 0.06, { vol: 0.08, slideTo: 2500 }); } },
  blip() { if (ctx) tone(660 + Math.random() * 80, ctx.currentTime, 0.04, { type: 'square', vol: 0.025 }); },
  lullaby() {
    if (!ctx) return;
    const t = ctx.currentTime;
    [392, 330, 392, 330, 294, 330, 262].forEach((f, i) => tone(f, t + i * 0.32, 0.5, { type: 'triangle', vol: 0.12, attack: 0.04 }));
  },
  fanfare() {
    if (!ctx) return;
    const t = ctx.currentTime;
    [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.1, 0.35, { type: 'triangle', vol: 0.14 }));
  },
  pickup() { if (!ctx) return; const t = ctx.currentTime; tone(880, t, 0.08, { type: 'square', vol: 0.05 }); tone(1320, t + 0.07, 0.12, { type: 'square', vol: 0.05 }); },
  huff() { if (ctx) noise(ctx.currentTime, 0.25, { freq: 400, vol: 0.15, type: 'lowpass' }); },
};

// ---------- music: gentle pentatonic arpeggios over I–vi–IV–V ----------
let night = false;
export function setNight(n) { night = n; }

const CHORDS = [
  [261.63, 329.63, 392.0, 523.25],  // C
  [220.0, 261.63, 329.63, 440.0],   // Am
  [174.61, 220.0, 261.63, 349.23],  // F
  [196.0, 246.94, 293.66, 392.0],   // G
];
const PATTERN = [0, 2, 1, 3, 2, 1, 3, 2];
let nextTime = 0, step = 0, timer = null;

function startMusic() {
  nextTime = ctx.currentTime + 0.2;
  timer = setInterval(schedule, 120);
}
function schedule() {
  if (!ctx || ctx.state !== 'running') return;
  const beat = night ? 0.62 : 0.45;
  while (nextTime < ctx.currentTime + 0.5) {
    const bar = Math.floor(step / 8) % CHORDS.length;
    const chord = CHORDS[bar];
    const i = step % 8;
    const oct = night ? 0.5 : 1;
    if (i === 0) {
      tone(chord[0] / 2 * oct, nextTime, beat * 7, { dest: music, vol: 0.25, attack: 0.3 });
      tone(chord[1] * oct, nextTime, beat * 7, { dest: music, vol: 0.06, attack: 0.6, type: 'triangle' });
    }
    if (!(night && i % 2 === 1)) {
      const f = chord[PATTERN[i]] * (night ? 1 : 2) * (i === 7 && Math.random() < 0.3 ? 1.5 : 1);
      tone(f, nextTime, beat * 2.2, { dest: music, vol: 0.09, type: 'triangle', attack: 0.02 });
    }
    nextTime += beat;
    step++;
  }
}
