// Day cycle: morning -> midday -> golden hour -> sunset -> starry night -> dawn, plus clouds,
// sun rays, rainbow and storm darkening. All drawing is in world units (resolution independent).
import { hexToRgb } from './color.js?v=20261117a';
import { rng, canvas } from './color.js?v=20261117a';

export const CYCLE_SECONDS = 600;

const KEYS = [
  { t: 0.00, top: '#5f72ad', bot: '#f2b49e', tint: '#e6d0d8', stars: 0.25, label: 'Dawn' },
  { t: 0.08, top: '#8ab8dc', bot: '#f2e6d4', tint: '#fbf3e8', stars: 0, label: 'Morning' },
  { t: 0.38, top: '#5a9fd6', bot: '#d6e8ee', tint: '#fffdf8', stars: 0, label: 'Midday' },
  { t: 0.52, top: '#7a9fd2', bot: '#ffd195', tint: '#ffdcb4', stars: 0, label: 'Golden hour' },
  { t: 0.61, top: '#525aa0', bot: '#ff8a66', tint: '#efa890', stars: 0.05, label: 'Sunset' },
  { t: 0.68, top: '#252b5e', bot: '#80507f', tint: '#8a80b4', stars: 0.6, label: 'Dusk' },
  { t: 0.75, top: '#070b26', bot: '#1a2450', tint: '#535d92', stars: 1, label: 'Night' },
  { t: 0.93, top: '#0a0f30', bot: '#273064', tint: '#5a6496', stars: 1, label: 'Night' },
  { t: 1.00, top: '#5f72ad', bot: '#f2b49e', tint: '#e6d0d8', stars: 0.25, label: 'Dawn' },
];
const lerp = (a, b, t) => a + (b - a) * t;
const lerpRgb = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const K = KEYS.map(k => ({ ...k, topC: hexToRgb(k.top), botC: hexToRgb(k.bot), tintC: hexToRgb(k.tint) }));

export function sky(t, storm = 0) {
  t = ((t % 1) + 1) % 1;
  let i = 0;
  while (i < K.length - 2 && t >= K[i + 1].t) i++;
  const a = K[i], b = K[i + 1];
  const f = (t - a.t) / (b.t - a.t);
  const s = {
    top: lerpRgb(a.topC, b.topC, f), bot: lerpRgb(a.botC, b.botC, f), tint: lerpRgb(a.tintC, b.tintC, f),
    stars: lerp(a.stars, b.stars, f), label: f < 0.5 ? a.label : b.label,
    night: t > 0.69 && t < 0.97, dusk: (t > 0.58 && t < 0.75) || t > 0.95 || t < 0.05,
    storm,
  };
  if (storm > 0) {
    const grey = [92, 100, 116];
    s.top = lerpRgb(s.top, grey, storm * 0.75); s.bot = lerpRgb(s.bot, [150, 156, 166], storm * 0.7);
    s.tint = lerpRgb(s.tint, [150, 156, 176], storm * 0.6);
    s.stars *= 1 - storm;
  }
  return s;
}

const STARS = (() => {
  const r = rng(99), out = [];
  for (let i = 0; i < 240; i++) out.push({ x: r(), y: r() * 0.8, b: 0.35 + r() * 0.65, tw: r() * 6.28, big: r() < 0.07, warm: r() < 0.2 });
  for (let i = 0; i < 500; i++) { const u = r(); out.push({ x: u, y: 0.02 + u * 0.5 + (r() - 0.5) * 0.14, b: 0.1 + r() * 0.25, tw: 0, dust: true }); }
  return out;
})();

let CLOUDS = null;
function makeClouds() {
  const r = rng(8);
  CLOUDS = [];
  for (let i = 0; i < 6; i++) {
    const w = 70 + r() * 70, h = 26 + r() * 14;
    const c = canvas(w * 0.6, h * 0.6), g = c.getContext('2d');
    g.scale(0.6, 0.6);
    for (let k = 0; k < 14; k++) {
      const cx = w * 0.15 + r() * w * 0.7, cy = h * 0.45 + (r() - 0.3) * h * 0.4, cr = 6 + r() * 12;
      const gr = g.createRadialGradient(cx, cy - cr * 0.3, 0, cx, cy, cr);
      gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.6, 'rgba(250,248,252,0.7)'); gr.addColorStop(1, 'rgba(240,240,250,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, cr, 0, Math.PI * 2); g.fill();
    }
    // flat-ish shaded base
    const gb = g.createLinearGradient(0, h * 0.4, 0, h);
    gb.addColorStop(0, 'rgba(180,180,200,0)'); gb.addColorStop(1, 'rgba(150,150,175,0.35)');
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = gb; g.fillRect(0, 0, w, h);
    CLOUDS.push({ c, w, h, x: r() * 900, y: 6 + r() * 40, speed: 1 + r() * 2.5, p: 0.03 + r() * 0.05 });
  }
}

function sunPos(t, W, H) {
  const tt = ((t % 1) + 1) % 1;
  const u = ((tt + 0.03) % 1) / 0.69;
  return { x: W * (0.08 + 0.84 * u), y: H * (0.66 - Math.sin(u * Math.PI) * 0.55), up: tt > 0.97 || tt < 0.66, u };
}

export function drawSky(ctx, W, H, t, s, now, camX = 0) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, css(s.top)); g.addColorStop(1, css(s.bot));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  if (s.stars > 0.01) {
    for (const st of STARS) {
      const tw = st.dust ? 1 : 0.65 + 0.35 * Math.sin(now * 2.2 + st.tw);
      ctx.globalAlpha = Math.min(1, s.stars * st.b * tw);
      ctx.fillStyle = st.dust ? '#cfcaff' : st.warm ? '#ffe2b8' : '#fffdf2';
      const x = st.x * W, y = st.y * H;
      ctx.beginPath(); ctx.arc(x, y, st.dust ? 0.32 : st.big ? 0.55 : 0.3, 0, Math.PI * 2); ctx.fill();
      if (st.big && s.stars > 0.6) { ctx.globalAlpha *= 0.4; ctx.fillRect(x - 1.4, y - 0.08, 2.8, 0.16); ctx.fillRect(x - 0.08, y - 1.4, 0.16, 2.8); }
    }
    ctx.globalAlpha = 1;
  }

  const sun = sunPos(t, W, H);
  if (sun.up) {
    const low = sun.u > 0.75 || sun.u < 0.12;
    const glow = ctx.createRadialGradient(sun.x, sun.y, 1, sun.x, sun.y, low ? 70 : 45);
    glow.addColorStop(0, low ? 'rgba(255,214,150,0.75)' : 'rgba(255,248,220,0.7)');
    glow.addColorStop(1, 'rgba(255,230,180,0)');
    ctx.fillStyle = glow; ctx.fillRect(sun.x - 80, sun.y - 80, 160, 160);
    ctx.fillStyle = low ? '#ffd98a' : '#fffbe8';
    ctx.globalAlpha = 1 - s.storm * 0.9;
    ctx.beginPath(); ctx.arc(sun.x, sun.y, 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  const tt = ((t % 1) + 1) % 1;
  if (tt > 0.66 && tt < 0.99) {
    const u = (tt - 0.66) / 0.33;
    const x = W * (0.15 + 0.7 * u), y = H * (0.5 - Math.sin(u * Math.PI) * 0.36);
    const glow = ctx.createRadialGradient(x, y, 2, x, y, 30);
    glow.addColorStop(0, 'rgba(220,228,255,0.35)'); glow.addColorStop(1, 'rgba(220,228,255,0)');
    ctx.fillStyle = glow; ctx.fillRect(x - 30, y - 30, 60, 60);
    ctx.fillStyle = '#eef0ff'; ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(200,205,230,0.5)'; ctx.beginPath(); ctx.arc(x - 1.2, y + 0.8, 1, 0, Math.PI * 2); ctx.arc(x + 1.5, y - 1.4, 0.7, 0, Math.PI * 2); ctx.fill();
  }

  // clouds
  if (!CLOUDS) makeClouds();
  const dayA = Math.max(0.15, 1 - s.stars) * (1 - s.storm * 0.3);
  for (const c of CLOUDS) {
    const span = W + c.w + 200;
    const x = ((c.x + now * c.speed - camX * c.p) % span + span) % span - c.w - 100;
    ctx.globalAlpha = dayA;
    ctx.drawImage(c.c, x, c.y, c.w, c.h);
    if (s.storm > 0) { ctx.globalAlpha = s.storm * 0.8; ctx.drawImage(c.c, x + 30, c.y + 6, c.w * 1.3, c.h * 1.2); }
  }
  ctx.globalAlpha = 1;
  if (s.storm > 0.05) { ctx.fillStyle = `rgba(70,76,90,${s.storm * 0.35})`; ctx.fillRect(0, 0, W, H); }
}

/** Golden god-rays from a low sun, drawn additively over the world. */
export function drawRays(ctx, W, H, t, s, now) {
  const sun = sunPos(t, W, H);
  if (!sun.up || s.storm > 0.3) return;
  const strength = sun.u < 0.2 ? 0.06 : sun.u > 0.7 ? 0.09 : 0.025;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 7; i++) {
    const a = 1.2 + i * 0.18 + Math.sin(now * 0.2 + i) * 0.03;
    const len = 260, wdt = 0.05 + (i % 3) * 0.025;
    const gr = ctx.createLinearGradient(sun.x, sun.y, sun.x + Math.cos(a) * len, sun.y + Math.sin(a) * len);
    gr.addColorStop(0, `rgba(255,220,160,${strength})`); gr.addColorStop(1, 'rgba(255,220,160,0)');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.moveTo(sun.x, sun.y);
    ctx.lineTo(sun.x + Math.cos(a - wdt) * len, sun.y + Math.sin(a - wdt) * len);
    ctx.lineTo(sun.x + Math.cos(a + wdt) * len, sun.y + Math.sin(a + wdt) * len);
    ctx.fill();
  }
  ctx.restore();
}

export function drawRainbow(ctx, W, H, alpha) {
  if (alpha <= 0) return;
  const cols = ['#ff5a5a', '#ffa64a', '#ffe45a', '#6ad46a', '#5aa6ff', '#7a6aff', '#c46aff'];
  ctx.save();
  ctx.globalAlpha = alpha * 0.45;
  ctx.lineWidth = 2.2;
  cols.forEach((c, i) => { ctx.strokeStyle = c; ctx.beginPath(); ctx.arc(W * 0.62, H * 1.05, 120 - i * 2.1, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke(); });
  ctx.restore();
}

/** Build the light map: global tint plus a warm headlamp glow at night. Coordinates in world units. */
export function drawLight(lctx, W, H, s, lamp, ambient = 1) {
  lctx.globalCompositeOperation = 'source-over';
  const t = s.tint.map(v => v * ambient);
  lctx.fillStyle = css(t);
  lctx.fillRect(0, 0, W, H);
  const dark = 1 - (t[0] + t[1] + t[2]) / 765;
  if (lamp && dark > 0.22) {
    lctx.globalCompositeOperation = 'lighter';
    const a = Math.min(0.75, (dark - 0.22) * 1.6);
    const g = lctx.createRadialGradient(lamp.x, lamp.y, 2, lamp.x, lamp.y, 48);
    g.addColorStop(0, `rgba(255,214,150,${a})`); g.addColorStop(1, 'rgba(255,214,150,0)');
    lctx.fillStyle = g;
    lctx.fillRect(lamp.x - 50, lamp.y - 50, 100, 100);
    lctx.globalCompositeOperation = 'source-over';
  }
}
