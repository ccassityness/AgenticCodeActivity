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
  startAmbience();
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
  const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  s.connect(f); f.connect(g); g.connect(sfx);
  s.start(start); s.stop(start + dur + 0.02);
}

export const sfxs = {
  step(wood) {
    if (!ctx) return;
    if (wood) { tone(140 + Math.random() * 30, ctx.currentTime, 0.09, { type: 'triangle', vol: 0.08, slideTo: 110 }); noise(ctx.currentTime, 0.04, { freq: 900, q: 1, vol: 0.05 }); }
    else noise(ctx.currentTime, 0.07, { freq: 500 + Math.random() * 300, q: 0.8, vol: 0.12 });
  },
  manatee() { if (ctx) { const t = ctx.currentTime; noise(t, 0.5, { freq: 700, q: 0.5, vol: 0.22 }); noise(t + 0.6, 0.6, { freq: 400, q: 0.5, vol: 0.12, type: 'lowpass' }); } },
  splash() { if (ctx) { const t = ctx.currentTime; noise(t, 0.35, { freq: 1400, q: 0.6, vol: 0.2 }); tone(500, t, 0.08, { vol: 0.06, slideTo: 900 }); } },
  gator() { if (ctx) tone(70, ctx.currentTime, 0.9, { type: 'sawtooth', vol: 0.05, slideTo: 55, attack: 0.1 }); },
  heron() { if (ctx) { const t = ctx.currentTime; tone(260, t, 0.25, { type: 'sawtooth', vol: 0.05, slideTo: 180 }); } },
  osprey() { if (!ctx) return; const t = ctx.currentTime; for (let i = 0; i < 5; i++) tone(2200, t + i * 0.12, 0.07, { vol: 0.06, slideTo: 2600 }); },
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
  jump() { if (ctx) tone(320, ctx.currentTime, 0.14, { type: 'triangle', vol: 0.08, slideTo: 620 }); },
  land() { if (ctx) noise(ctx.currentTime, 0.1, { freq: 300, vol: 0.18, type: 'lowpass' }); },
  wren() { if (!ctx) return; const t = ctx.currentTime; for (let i = 0; i < 9; i++) tone(3200 - i * 170, t + i * 0.09, 0.08, { vol: 0.06, slideTo: 3000 - i * 170 }); },
  thunder() { if (!ctx) return; const t = ctx.currentTime; noise(t, 1.8, { freq: 120, q: 0.4, vol: 0.5, type: 'lowpass' }); noise(t + 0.2, 1.4, { freq: 80, q: 0.4, vol: 0.4, type: 'lowpass' }); },
  note(f, d = 0.4, type = 'triangle') { if (ctx) tone(f, ctx.currentTime, d, { type, vol: 0.18, attack: 0.01 }); },
  miss() { if (ctx) tone(180, ctx.currentTime, 0.18, { type: 'sawtooth', vol: 0.05, slideTo: 140 }); },
  star() { if (!ctx) return; const t = ctx.currentTime; tone(1320, t, 0.25, { vol: 0.12 }); tone(1760, t + 0.08, 0.3, { vol: 0.1 }); },
  huff() { if (ctx) noise(ctx.currentTime, 0.25, { freq: 400, vol: 0.15, type: 'lowpass' }); },
};

// ---------- ambient soundscape of the springs (no music) ----------
let night = false, scene = { water: 0.6, boil: 0, river: 0 };
export function setNight(n) { night = n; }
/** water: 0..1 flowing water level, boil: 0..1 near the spring boil, river: 0..1 near the open river */
export function setScene(sc) { scene = sc; if (!ctx || !amb) return; const t = ctx.currentTime;
  amb.water.gain.setTargetAtTime(0.05 + sc.water * 0.07 + sc.boil * 0.09, t, 1.5);
  amb.boil.gain.setTargetAtTime(sc.boil * 0.12, t, 1.5);
  amb.lap.gain.setTargetAtTime(sc.river * 0.06, t, 1.5);
  amb.night.gain.setTargetAtTime(night ? 0.05 : 0, t, 3);
}
let amb = null, birdTimer = null;
function loopNoise(filterType, freq, q) {
  const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
  const f = ctx.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); g.gain.value = 0;
  src.connect(f); f.connect(g); g.connect(ambBus); src.start();
  return { src, f, g, gain: g.gain };
}
let ambBus = null;
function startAmbience() {
  ambBus = ctx.createGain(); ambBus.gain.value = 0.9; ambBus.connect(master);
  const water = loopNoise('lowpass', 520, 0.4);           // the steady murmur of the spring run
  const boil = loopNoise('bandpass', 260, 0.7);           // deep welling at the boil
  const lap = loopNoise('bandpass', 900, 1.4);            // little lapping waves on the river
  const wind = loopNoise('bandpass', 700, 0.5);           // breeze in the palms
  const nightBed = loopNoise('highpass', 4200, 0.6);      // faint insect hiss at night
  amb = { water, boil, lap, wind, night: nightBed };
  for (const k of ['water', 'boil', 'lap', 'night']) amb[k].gain = amb[k].g.gain;
  setScene(scene);
  // slow swells for water and wind
  const swell = () => {
    if (!ctx) return;
    const t = ctx.currentTime;
    water.f.frequency.setTargetAtTime(420 + Math.random() * 260, t, 2);
    lap.f.frequency.setTargetAtTime(700 + Math.random() * 500, t, 0.8);
    wind.g.gain.setTargetAtTime(Math.random() < 0.35 ? 0.03 + Math.random() * 0.05 : 0.008, t, 2.5);
    wind.f.frequency.setTargetAtTime(500 + Math.random() * 600, t, 2);
    setTimeout(swell, 2500 + Math.random() * 3000);
  };
  swell();
  const birds = () => {
    if (!ctx) return;
    if (ctx.state === 'running') {
      if (!night) {
        const r = Math.random();
        if (r < 0.26) cardinal(); else if (r < 0.48) carolinaWren(); else if (r < 0.6) hawk(); else if (r < 0.74) fishCrow(); else if (r < 0.84) woodpecker(); else if (r < 0.92) sfxs.splash(); else gnatcatcher();
      } else {
        const r = Math.random();
        if (r < 0.5) chorusFrog(); else if (r < 0.8) crickets(); else pigFrog();
      }
    }
    birdTimer = setTimeout(birds, (night ? 1800 : 2600) + Math.random() * (night ? 2500 : 4500));
  };
  birds();
}
function pan(v) { const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null; if (p) { p.pan.value = v; p.connect(ambBus); return p; } return ambBus; }
function call(freq, start, dur, o) { const dest = pan(o.pan ?? (Math.random() * 1.6 - 0.8)); tone(freq, start, dur, { ...o, dest }); }
function cardinal() { // "cheer-cheer-cheer" then "birdie birdie"
  const t = ctx.currentTime, p = Math.random() * 1.6 - 0.8, v = 0.035 + Math.random() * 0.025;
  for (let i = 0; i < 3; i++) call(3300, t + i * 0.32, 0.22, { vol: v, slideTo: 1900, pan: p });
  for (let i = 0; i < 3; i++) { call(2100, t + 1.05 + i * 0.2, 0.08, { vol: v * 0.8, slideTo: 3000, pan: p }); call(3000, t + 1.13 + i * 0.2, 0.07, { vol: v * 0.7, slideTo: 2400, pan: p }); }
}
function carolinaWren() { // "tea-kettle, tea-kettle, tea-kettle"
  const t = ctx.currentTime, p = Math.random() * 1.6 - 0.8, v = 0.035 + Math.random() * 0.02;
  for (let i = 0; i < 4; i++) { const s = t + i * 0.36; call(3600, s, 0.07, { vol: v, slideTo: 3200, pan: p }); call(2800, s + 0.1, 0.07, { vol: v, slideTo: 3400, pan: p }); call(3000, s + 0.2, 0.1, { vol: v * 0.9, slideTo: 2500, pan: p }); }
}
function hawk() { // red-shouldered hawk "kee-ah, kee-ah"
  const t = ctx.currentTime, p = Math.random() * 1.6 - 0.8;
  for (let i = 0; i < 3; i++) { call(2100, t + i * 0.55, 0.32, { type: 'sawtooth', vol: 0.012, slideTo: 1500, pan: p, attack: 0.03 }); call(2050, t + i * 0.55, 0.32, { type: 'triangle', vol: 0.02, slideTo: 1450, pan: p, attack: 0.03 }); }
}
function fishCrow() { // nasal "uh-uh"
  const t = ctx.currentTime, p = Math.random() * 1.6 - 0.8;
  for (let i = 0; i < 2; i++) call(560, t + i * 0.28, 0.16, { type: 'sawtooth', vol: 0.014, slideTo: 470, pan: p });
}
function woodpecker() {
  const t = ctx.currentTime, d = pan(Math.random() * 1.6 - 0.8);
  for (let i = 0; i < 14; i++) { const s = ctx.createBufferSource(); s.buffer = noiseBuf; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1300; f.Q.value = 2; const g = ctx.createGain(); g.gain.setValueAtTime(0.05, t + i * 0.045); g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.045 + 0.03); s.connect(f); f.connect(g); g.connect(d); s.start(t + i * 0.045); s.stop(t + i * 0.045 + 0.04); }
}
function gnatcatcher() { const t = ctx.currentTime, p = Math.random() * 1.6 - 0.8; for (let i = 0; i < 5; i++) call(4800 + Math.random() * 600, t + i * 0.1, 0.05, { vol: 0.015, pan: p }); }
function chorusFrog() { // rising "crreeek" like running a finger along a comb
  const t = ctx.currentTime, p = Math.random() * 1.6 - 0.8;
  for (let k = 0; k < 3; k++) for (let i = 0; i < 9; i++) call(2200 + i * 70, t + k * 0.7 + i * 0.03, 0.025, { type: 'square', vol: 0.006, pan: p });
}
function pigFrog() { const t = ctx.currentTime, p = Math.random() * 1.6 - 0.8; for (let i = 0; i < 3; i++) call(160, t + i * 0.4, 0.18, { type: 'sawtooth', vol: 0.02, slideTo: 120, pan: p }); }
function crickets() { const t = ctx.currentTime, p = Math.random() * 1.6 - 0.8; for (let k = 0; k < 6; k++) for (let i = 0; i < 3; i++) call(4600, t + k * 0.35 + i * 0.04, 0.025, { vol: 0.008, pan: p }); }
