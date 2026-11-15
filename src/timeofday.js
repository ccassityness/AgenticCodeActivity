// Day cycle: morning -> midday -> golden hour -> sunset -> starry night -> dawn.
import { hexToRgb } from './sprites.js';
import { rng } from './world.js';

export const CYCLE_SECONDS = 540;

// t in [0,1). top/bottom = sky gradient, tint = light multiplied over the world, stars = 0..1
const KEYS = [
  { t: 0.00, top: '#6d7fb8', bot: '#f7b7a3', tint: '#e6cfd6', stars: 0.25, label: 'Dawn' },
  { t: 0.08, top: '#7ec3ef', bot: '#fde6c8', tint: '#fff6ee', stars: 0, label: 'Morning' },
  { t: 0.38, top: '#5fb3ee', bot: '#d4ecf7', tint: '#ffffff', stars: 0, label: 'Midday' },
  { t: 0.52, top: '#86aee0', bot: '#ffd59a', tint: '#ffe2bf', stars: 0, label: 'Golden hour' },
  { t: 0.61, top: '#5b5ca8', bot: '#ff8f6b', tint: '#f2b49a', stars: 0.05, label: 'Sunset' },
  { t: 0.68, top: '#2a2f63', bot: '#8a5a8c', tint: '#8f86b8', stars: 0.6, label: 'Dusk' },
  { t: 0.75, top: '#0b1030', bot: '#1f2a55', tint: '#5a6496', stars: 1, label: 'Night' },
  { t: 0.93, top: '#0d1236', bot: '#2c3466', tint: '#5f6898', stars: 1, label: 'Night' },
  { t: 1.00, top: '#6d7fb8', bot: '#f7b7a3', tint: '#e6cfd6', stars: 0.25, label: 'Dawn' },
];

const lerp = (a, b, t) => a + (b - a) * t;
const lerpRgb = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const css = c => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
const K = KEYS.map(k => ({ ...k, topC: hexToRgb(k.top), botC: hexToRgb(k.bot), tintC: hexToRgb(k.tint) }));

export function sky(t) {
  t = ((t % 1) + 1) % 1;
  let i = 0;
  while (i < K.length - 2 && t >= K[i + 1].t) i++;
  const a = K[i], b = K[i + 1];
  const f = (t - a.t) / (b.t - a.t);
  return {
    top: lerpRgb(a.topC, b.topC, f),
    bot: lerpRgb(a.botC, b.botC, f),
    tint: lerpRgb(a.tintC, b.tintC, f),
    stars: lerp(a.stars, b.stars, f),
    label: f < 0.5 ? a.label : b.label,
    night: t > 0.69 && t < 0.97,
    dusk: (t > 0.58 && t < 0.75) || t > 0.95 || t < 0.05,
  };
}

const STARS = (() => {
  const r = rng(99), out = [];
  for (let i = 0; i < 160; i++) out.push({ x: r(), y: r() * 0.75, b: 0.4 + r() * 0.6, tw: r() * 6.28, big: r() < 0.08 });
  // Milky Way: a diagonal band of faint dust
  for (let i = 0; i < 260; i++) {
    const u = r();
    out.push({ x: u, y: 0.05 + u * 0.45 + (r() - 0.5) * 0.12, b: 0.15 + r() * 0.3, tw: r() * 6.28, dust: true });
  }
  return out;
})();

export function drawSky(ctx, W, H, t, s, now) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, css(s.top));
  g.addColorStop(1, css(s.bot));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  if (s.stars > 0.01) {
    for (const st of STARS) {
      const tw = st.dust ? 1 : 0.7 + 0.3 * Math.sin(now * 2 + st.tw);
      ctx.globalAlpha = Math.min(1, s.stars * st.b * tw);
      ctx.fillStyle = st.dust ? '#c9c6ff' : '#fffbe8';
      const x = Math.round(st.x * W), y = Math.round(st.y * H);
      ctx.fillRect(x, y, 1, 1);
      if (st.big && s.stars > 0.6) { ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); }
    }
    ctx.globalAlpha = 1;
  }

  // Sun (day) and moon (night) travel across the sky
  const tt = ((t % 1) + 1) % 1;
  if (tt > 0.97 || tt < 0.66) {
    const u = ((tt + 0.03) % 1) / 0.69; // 0..1 across the day
    const x = W * (0.08 + 0.84 * u), y = H * (0.62 - Math.sin(u * Math.PI) * 0.5);
    const glow = ctx.createRadialGradient(x, y, 2, x, y, 26);
    glow.addColorStop(0, 'rgba(255,240,200,0.55)');
    glow.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 26, y - 26, 52, 52);
    ctx.fillStyle = u > 0.75 || u < 0.1 ? '#ffd27a' : '#fff4c9';
    disc(ctx, x, y, 6);
  }
  if (tt > 0.66 && tt < 0.99) {
    const u = (tt - 0.66) / 0.33;
    const x = W * (0.15 + 0.7 * u), y = H * (0.5 - Math.sin(u * Math.PI) * 0.35);
    ctx.fillStyle = 'rgba(230,235,255,0.15)';
    disc(ctx, x, y, 9);
    ctx.fillStyle = '#eef0ff';
    disc(ctx, x, y, 5);
    ctx.fillStyle = css(s.top); // crescent shadow
    disc(ctx, x + 2, y - 1, 4);
  }
}

function disc(ctx, cx, cy, r) {
  cx = Math.round(cx); cy = Math.round(cy);
  for (let y = -r; y <= r; y++) {
    const w = Math.round(Math.sqrt(r * r - y * y));
    ctx.fillRect(cx - w, cy + y, w * 2 + 1, 1);
  }
}

/** Build the light map: global tint plus a warm headlamp glow at night. */
export function drawLight(lctx, W, H, s, lamp) {
  lctx.globalCompositeOperation = 'source-over';
  lctx.fillStyle = css(s.tint);
  lctx.fillRect(0, 0, W, H);
  const dark = 1 - (s.tint[0] + s.tint[1] + s.tint[2]) / 765;
  if (lamp && dark > 0.25) {
    lctx.globalCompositeOperation = 'lighter';
    const a = Math.min(0.75, (dark - 0.25) * 1.6);
    const g = lctx.createRadialGradient(lamp.x, lamp.y, 2, lamp.x, lamp.y, 46);
    g.addColorStop(0, `rgba(255,214,150,${a})`);
    g.addColorStop(1, 'rgba(255,214,150,0)');
    lctx.fillStyle = g;
    lctx.fillRect(lamp.x - 46, lamp.y - 46, 92, 92);
    lctx.globalCompositeOperation = 'source-over';
  }
}
