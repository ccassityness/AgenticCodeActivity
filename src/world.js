// Painted, high-resolution world. Each Area (the main trail plus hidden side areas) has a
// ground profile, obstacles/ledges for platforming, and decor painted into cached tiles.
import { mix, shade, rgba, rng, fbm, noise1, canvas, grain, ellipse, circle, lin, rad } from './color.js';

export const YTOP = -170;
export const YBOT = 380;
const TILE_W = 256;

// Claron Formation palette — peachy pinks, oranges, creams and a few deep reds.
const STRATA = ['#ecb495', '#e09a76', '#d47a50', '#f0d2b4', '#c6643f', '#e8ab8c', '#f4e3cc', '#d98d66', '#cf7656', '#e9c0a0'];
const CAP = '#f2e6d6';
// hoodoo bands: mostly close warm tones, an occasional pale limestone layer
const HBANDS = ['#e3a07c', '#dc9070', '#e6a888', '#d8865f', '#d27e58', '#e9b08f', '#ecc7aa', '#dd946e', '#cf7a55', '#e4a482', '#d98a64', '#f0d8c2'];
const SHADOW = '#6e4058';   // cool violet shadow multiplied into rock
const HAZE = '#b7c0db';

// ------------------------------------------------------------------ painting primitives
function hoodooEdges(o) {
  const r = rng(o.seed);
  const k = 2.2 + r() * 3, ph = r() * 6.28;
  const capFrac = o.capFrac ?? (0.08 + r() * 0.07);
  const n = Math.max(8, Math.ceil(o.h / 1.4));
  const L = [], R = [];
  for (let i = 0; i <= n; i++) {
    const ty = i / n;
    let half;
    if (ty > 1 - capFrac) {
      const cy = (ty - (1 - capFrac)) / capFrac;
      half = o.w * (o.capW ?? 0.42) * Math.sqrt(Math.max(0.03, 1 - cy * cy * 0.92));
    } else if (ty > 1 - capFrac - 0.05) half = o.w * 0.22;
    else half = o.w * 0.5 * (1 - 0.42 * ty) * (0.72 + 0.28 * Math.sin(ty * k * Math.PI + ph));
    const y = o.base - o.h * ty;
    L.push([o.x - half * (1 + 0.09 * fbm(ty * 7, o.seed)), y]);
    R.push([o.x + half * (1 + 0.09 * fbm(ty * 7, o.seed + 9)), y]);
  }
  return { L, R, capY: o.base - o.h * (1 - capFrac), top: o.base - o.h };
}

function paintHoodoo(g, o) {
  const { L, R, capY, top } = hoodooEdges(o);
  const detail = o.detail ?? 2;
  g.save();
  g.beginPath();
  g.moveTo(L[0][0], L[0][1]);
  for (const p of L) g.lineTo(p[0], p[1]);
  g.quadraticCurveTo(o.x, top - o.h * 0.02, R[R.length - 1][0], R[R.length - 1][1]);
  for (let i = R.length - 1; i >= 0; i--) g.lineTo(R[i][0], R[i][1]);
  g.closePath();
  g.clip();
  const x0 = o.x - o.w, x1 = o.x + o.w;
  // horizontal strata bands with soft variation
  const r = rng(o.seed * 7 + 1);
  let y = o.base + 2;
  while (y > top - 2) {
    const bh = 3 + r() * 8;
    const idx = Math.abs(Math.floor((y + 1000) / 9.1)) % HBANDS.length;
    let col = HBANDS[idx];
    if (o.haze) col = mix(col, HAZE, o.haze);
    g.fillStyle = col;
    g.fillRect(x0, y - bh, x1 - x0, bh + 0.6);
    y -= bh;
  }
  // caprock
  g.fillStyle = lin(g, 0, top, 0, capY + 2, [[0, mix(CAP, HAZE, o.haze || 0)], [1, mix(shade(CAP, -0.08), HAZE, o.haze || 0)]]);
  g.fillRect(x0, top - 2, x1 - x0, capY - top + 2.5);
  // form shading: light from upper left, cool violet shadow on the right
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = lin(g, o.x - o.w * 0.5, 0, o.x + o.w * 0.5, 0, [[0, '#ffffff'], [0.45, '#f6ece8'], [1, mix(SHADOW, '#ffffff', 0.15 + (o.haze || 0) * 0.6)]]);
  g.fillRect(x0, top - 2, x1 - x0, o.base - top + 4);
  if (detail >= 2) {
    // vertical rills / gullies
    g.strokeStyle = 'rgba(90,40,50,0.18)'; g.lineWidth = 0.5;
    for (let i = 0; i < 4 + o.w / 3; i++) {
      const rx = o.x + (r() - 0.5) * o.w * 0.8, ry = o.base - r() * o.h * 0.8;
      g.beginPath(); g.moveTo(rx, ry);
      g.quadraticCurveTo(rx + (r() - 0.5) * 2, ry - 6, rx + (r() - 0.5) * 1.5, ry - 6 - r() * 10); g.stroke();
    }
    // pits
    g.fillStyle = 'rgba(80,30,40,0.22)';
    for (let i = 0; i < o.h / 10; i++) { ellipse(g, o.x + (r() - 0.5) * o.w * 0.6, o.base - r() * o.h * 0.85, 0.4 + r() * 1.2, 0.3 + r() * 0.7); g.fill(); }
    // grit
    g.globalAlpha = 0.28;
    g.fillStyle = g.createPattern(grain(), 'repeat');
    g.save(); g.scale(0.12, 0.12); g.fillRect(x0 / 0.12, (top - 2) / 0.12, (x1 - x0) / 0.12, (o.base - top + 4) / 0.12); g.restore();
    g.globalAlpha = 1;
  }
  // base occlusion
  g.fillStyle = lin(g, 0, o.base, 0, o.base - 14, [[0, 'rgba(60,25,30,0.45)'], [1, 'rgba(60,25,30,0)']]);
  g.fillRect(x0, o.base - 14, x1 - x0, 15);
  g.globalCompositeOperation = 'screen';
  // warm rim light on the lit edge
  g.fillStyle = lin(g, o.x - o.w * 0.55, 0, o.x - o.w * 0.15, 0, [[0, `rgba(255,214,170,${o.haze ? 0.1 : 0.35})`], [1, 'rgba(255,214,170,0)']]);
  g.fillRect(x0, top - 2, x1 - x0, o.base - top + 4);
  g.globalCompositeOperation = 'source-over';
  g.restore();
}

function paintPine(g, o) {
  const r = rng(o.seed);
  const fir = o.kind === 'fir';
  const hz = c => (o.haze ? mix(c, HAZE, o.haze) : c);
  const { x, base, h } = o;
  // trunk
  const tw = Math.max(0.8, h * (fir ? 0.028 : 0.035));
  g.fillStyle = lin(g, x - tw, 0, x + tw, 0, [[0, hz(fir ? '#7a5038' : '#b66a3c')], [1, hz(fir ? '#3e2618' : '#6a3420')]]);
  g.beginPath(); g.moveTo(x - tw, base); g.lineTo(x - tw * 0.3, base - h); g.lineTo(x + tw * 0.3, base - h); g.lineTo(x + tw, base); g.fill();
  if (!fir && !o.haze) { // bark plates
    g.strokeStyle = 'rgba(60,25,15,0.35)'; g.lineWidth = 0.25;
    for (let i = 0; i < h / 3; i++) { const yy = base - r() * h * 0.6; g.beginPath(); g.moveTo(x - tw * 0.7, yy); g.lineTo(x + tw * 0.4, yy - 0.6); g.stroke(); }
  }
  const dark = hz(fir ? '#1d3a2c' : '#22402a'), mid = hz(fir ? '#2c5a40' : '#365f3a'), light = hz(fir ? '#4a7e58' : '#5f8a4c');
  if (fir) {
    const clumps = 9 + (h / 12 | 0);
    for (let i = 0; i < clumps; i++) {
      const ty = 0.12 + (i / clumps) * 0.88;
      const cy = base - h * ty;
      const cr = (1 - ty) * h * 0.22 + 1.2;
      const cx = x + (r() - 0.5) * cr * 0.3;
      const cry = Math.max(1.2, cr * 0.35);
      g.fillStyle = rad(g, cx - cr * 0.3, cy - cry * 0.5, 0, cr * 1.2, [[0, light], [0.45, mid], [1, dark]]);
      g.beginPath(); g.moveTo(cx - cr, cy + cry * 0.6); g.quadraticCurveTo(cx, cy - cry * 1.6, cx + cr, cy + cry * 0.6); g.quadraticCurveTo(cx, cy + cry * 0.2, cx - cr, cy + cry * 0.6); g.fill();
    }
    return;
  }
  // Ponderosa: upswept branches ending in tufts of long needles
  const tufts = [];
  const nb = 9 + (h / 6 | 0);
  for (let i = 0; i < nb; i++) {
    const ty = 0.36 + Math.pow(r(), 0.8) * 0.64;
    const by = base - h * ty;
    const side = r() < 0.5 ? -1 : 1;
    const len = h * (0.06 + 0.2 * Math.sin(Math.min(1, (1 - ty) * 1.6 + 0.15) * Math.PI * 0.9)) * (0.6 + r() * 0.6);
    const ex = x + side * len, ey = by - len * (0.15 + r() * 0.35);
    g.strokeStyle = hz('#5a3422'); g.lineWidth = Math.max(0.25, tw * 0.45);
    g.beginPath(); g.moveTo(x, by); g.quadraticCurveTo(x + side * len * 0.5, by + 0.5, ex, ey); g.stroke();
    tufts.push([ex, ey, 1.6 + r() * 2.4 + h * 0.02]);
    if (r() < 0.6) tufts.push([x + side * len * 0.55, by - len * 0.12, 1.2 + r() * 1.6 + h * 0.015]);
  }
  tufts.push([x, base - h, 1.8 + h * 0.02]);
  for (const [tx, ty, tr] of tufts) {
    // shadowed underside, then lit top, then needle strokes
    g.fillStyle = dark; ellipse(g, tx, ty + tr * 0.15, tr * 1.15, tr * 0.7); g.fill();
    g.fillStyle = mid; ellipse(g, tx - tr * 0.15, ty - tr * 0.1, tr * 0.9, tr * 0.5); g.fill();
    if (!o.haze || o.haze < 0.3) {
      g.strokeStyle = light; g.lineWidth = 0.16;
      for (let k = 0; k < 9; k++) {
        const a = -Math.PI + (k / 8) * Math.PI + (r() - 0.5) * 0.3;
        g.beginPath(); g.moveTo(tx, ty); g.lineTo(tx + Math.cos(a) * tr * 1.25, ty + Math.sin(a) * tr * 0.9); g.stroke();
      }
    }
  }
}

function paintShrub(g, o) {
  const r = rng(o.seed);
  const cols = o.kind === 'sage' ? ['#9aa88a', '#7b8c70', '#b9c4a6'] : ['#5e7a4a', '#3f5a36', '#86a062'];
  for (let i = 0; i < 6; i++) {
    const cx = o.x + (r() - 0.5) * o.w, cy = o.base - r() * o.w * 0.35, cr = o.w * (0.18 + r() * 0.18);
    g.fillStyle = rad(g, cx - cr * 0.3, cy - cr * 0.4, 0, cr, [[0, cols[2]], [0.5, cols[0]], [1, cols[1]]]);
    ellipse(g, cx, cy, cr, cr * 0.75); g.fill();
  }
  if (o.kind === 'manzanita') { g.strokeStyle = '#8a2a1e'; g.lineWidth = 0.35; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(o.x + (r() - 0.5) * 2, o.base); g.lineTo(o.x + (r() - 0.5) * o.w * 0.6, o.base - o.w * 0.3); g.stroke(); } }
  if (o.flowers) { for (let i = 0; i < 6; i++) { g.fillStyle = o.flowers; circle(g, o.x + (r() - 0.5) * o.w, o.base - r() * o.w * 0.4, 0.45); g.fill(); } }
}

function paintBoulder(g, o, surface) {
  const r = rng(o.seed);
  const top = surface - o.h;
  g.save();
  g.beginPath();
  const pts = 14;
  for (let i = 0; i <= pts; i++) {
    const a = Math.PI + (i / pts) * Math.PI;
    const rr = 1 + (r() - 0.5) * 0.18;
    g.lineTo(o.x + Math.cos(a) * o.w / 2 * rr, surface + 1 + Math.sin(a) * (o.h + 1) * rr);
  }
  g.closePath();
  if (o.kind === 'log') {
    g.restore(); g.save();
    g.fillStyle = lin(g, 0, top, 0, surface, [[0, '#9a7452'], [1, '#5a3c26']]);
    g.beginPath(); g.roundRect(o.x - o.w / 2, top, o.w, o.h + 0.5, o.h / 2); g.fill();
    g.fillStyle = '#c9a27a'; ellipse(g, o.x + o.w / 2 - 0.5, top + o.h / 2, o.h * 0.35, o.h / 2); g.fill();
    g.strokeStyle = '#8a6a48'; g.lineWidth = 0.25; ellipse(g, o.x + o.w / 2 - 0.5, top + o.h / 2, o.h * 0.18, o.h * 0.26); g.stroke();
    g.strokeStyle = 'rgba(40,20,10,0.35)'; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(o.x - o.w / 2 + 1, top + 1 + i * o.h / 4); g.lineTo(o.x + o.w / 2 - 2, top + 1.3 + i * o.h / 4); g.stroke(); }
    g.restore();
    return;
  }
  g.fillStyle = lin(g, o.x - o.w / 2, top, o.x + o.w / 2, surface, [[0, '#f2c6a4'], [0.5, '#d98a64'], [1, '#8a4a44']]);
  g.fill();
  g.clip();
  g.globalAlpha = 0.3; g.fillStyle = g.createPattern(grain(), 'repeat');
  g.save(); g.scale(0.12, 0.12); g.fillRect((o.x - o.w) / 0.12, (top - 2) / 0.12, (o.w * 2) / 0.12, (o.h + 4) / 0.12); g.restore();
  g.globalAlpha = 1;
  g.fillStyle = 'rgba(255,240,220,0.35)'; ellipse(g, o.x - o.w * 0.18, top + o.h * 0.2, o.w * 0.25, o.h * 0.12); g.fill();
  g.restore();
}

function paintLedge(g, p) {
  const t = p.y;
  g.fillStyle = lin(g, 0, t - 1, 0, t + 5, [[0, '#f0caa8'], [0.4, '#d48a62'], [1, 'rgba(120,60,50,0)']]);
  g.beginPath(); g.moveTo(p.x0 - 1, t); g.lineTo(p.x1 + 1, t); g.quadraticCurveTo(p.x1 - 2, t + 6, (p.x0 + p.x1) / 2, t + 7); g.quadraticCurveTo(p.x0 + 2, t + 6, p.x0 - 1, t); g.fill();
  g.fillStyle = '#b5d07a'; for (let x = p.x0; x < p.x1; x += 2.2) { g.fillRect(x, t - 0.6, 0.35, 0.8); }
}

function paintArch(g, o) {
  // a natural rock bridge/window: thick fin with an opening
  const { x, base, w, h, hole } = o;
  g.save();
  g.beginPath();
  g.moveTo(x - w / 2, base);
  g.bezierCurveTo(x - w / 2 - 3, base - h * 0.6, x - w * 0.3, base - h, x, base - h);
  g.bezierCurveTo(x + w * 0.3, base - h, x + w / 2 + 3, base - h * 0.6, x + w / 2, base);
  g.closePath();
  g.moveTo(x - hole.w / 2, base);
  g.bezierCurveTo(x - hole.w / 2, base - hole.h, x + hole.w / 2, base - hole.h, x + hole.w / 2, base);
  g.closePath();
  g.clip('evenodd');
  paintHoodoo(g, { x, base, w: w * 1.25, h: h * 1.02, seed: o.seed, capFrac: 0.02, detail: 2 });
  g.restore();
  // inner shadow of opening
  g.strokeStyle = 'rgba(70,30,40,0.35)'; g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(x - hole.w / 2, base); g.bezierCurveTo(x - hole.w / 2, base - hole.h, x + hole.w / 2, base - hole.h, x + hole.w / 2, base); g.stroke();
}

function paintWall(g, o) {
  // towering canyon wall (Wall Street / grotto)
  const r = rng(o.seed);
  g.save();
  g.beginPath();
  g.moveTo(o.x0, YBOT);
  for (let x = o.x0; x <= o.x1; x += 3) {
    const edge = Math.min(x - o.x0, o.x1 - x);
    const yy = o.top + Math.max(0, (o.taper ?? 40) - edge) * 2.2 + fbm(x / 30, o.seed) * 8;
    g.lineTo(x, yy);
  }
  g.lineTo(o.x1, YBOT);
  g.closePath();
  g.clip();
  const base = o.color || '#b8603e';
  g.fillStyle = lin(g, 0, o.top, 0, o.bottom, [[0, shade(base, 0.12)], [0.5, base], [1, shade(base, -0.35)]]);
  g.fillRect(o.x0, YTOP, o.x1 - o.x0, YBOT - YTOP);
  // horizontal bedding
  for (let y = YTOP; y < o.bottom; y += 4 + r() * 6) { g.fillStyle = r() < 0.5 ? 'rgba(255,220,190,0.08)' : 'rgba(60,20,20,0.1)'; g.fillRect(o.x0, y, o.x1 - o.x0, 1 + r() * 3); }
  // vertical streaks (desert varnish / seeps)
  for (let i = 0; i < (o.x1 - o.x0) / 6; i++) {
    const sx = o.x0 + r() * (o.x1 - o.x0), sw = 0.5 + r() * 2.5;
    g.fillStyle = lin(g, 0, YTOP, 0, o.bottom, [[0, 'rgba(40,15,20,0)'], [0.4, `rgba(40,15,20,${0.12 + r() * 0.18})`], [1, 'rgba(40,15,20,0.02)']]);
    g.fillRect(sx, YTOP, sw, o.bottom - YTOP);
  }
  if (o.wet) for (let i = 0; i < 18; i++) { const sx = o.x0 + 60 + r() * (o.x1 - o.x0 - 120); g.fillStyle = 'rgba(30,20,30,0.25)'; g.fillRect(sx, o.bottom - 60 - r() * 40, 0.8 + r(), 50 + r() * 40); }
  g.globalAlpha = 0.25; g.fillStyle = g.createPattern(grain(), 'repeat');
  g.save(); g.scale(0.15, 0.15); g.fillRect(o.x0 / 0.15, YTOP / 0.15, (o.x1 - o.x0) / 0.15, (YBOT - YTOP) / 0.15); g.restore();
  g.globalAlpha = 1;
  g.restore();
}

function paintSpecial(g, o) {
  if (o.kind === 'queen') {
    paintHoodoo(g, { x: o.x, base: o.base, w: 22, h: 72, seed: 3, capFrac: 0.04 });
    g.fillStyle = lin(g, o.x - 6, 0, o.x + 6, 0, [[0, '#fbf3e8'], [1, '#c9b8a8']]);
    g.beginPath(); g.ellipse(o.x, o.base - 76, 5, 4, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(o.x + 0.5, o.base - 83, 2.6, 3.2, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(o.x, o.base - 86.5, 1.8, 1.2, 0, 0, Math.PI * 2); g.fill();
  } else if (o.kind === 'thor') {
    paintHoodoo(g, { x: o.x, base: o.base, w: 13, h: 118, seed: 11, capFrac: 0.01, capW: 0.3 });
    g.fillStyle = lin(g, o.x - 10, 0, o.x + 10, 0, [[0, '#fbf3e8'], [0.6, '#e6d6c4'], [1, '#a8908a']]);
    g.beginPath(); g.roundRect(o.x - 10, o.base - 129, 20, 11, 2); g.fill();
    g.fillStyle = 'rgba(80,40,40,0.3)'; g.fillRect(o.x - 10, o.base - 119.5, 20, 1.5);
  } else if (o.kind === 'seep') {
    // pool + dripping ferns
    g.fillStyle = lin(g, 0, o.base - 1, 0, o.base + 3, [[0, '#5a8aa0'], [1, '#2a4a5a']]);
    ellipse(g, o.x, o.base + 0.6, 26, 2.4); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.35)'; ellipse(g, o.x - 6, o.base, 8, 0.5); g.fill();
    const r = rng(19);
    for (let i = 0; i < 24; i++) {
      const fx = o.x - 40 + r() * 80, fy = o.base - 40 - r() * 30;
      g.strokeStyle = r() < 0.5 ? '#4f7a3a' : '#6aa04a'; g.lineWidth = 0.4;
      for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(fx, fy); g.quadraticCurveTo(fx + (k - 2) * 1.5, fy + 2, fx + (k - 2) * 2.4, fy + 5 + r() * 3); g.stroke(); }
      if (r() < 0.4) { g.fillStyle = '#e0405a'; circle(g, fx + (r() - 0.5) * 3, fy + 3 + r() * 2, 0.6); g.fill(); }
    }
  } else if (o.kind === 'telescope') {
    g.strokeStyle = '#3a3a44'; g.lineWidth = 0.6;
    g.beginPath(); g.moveTo(o.x, o.base); g.lineTo(o.x - 3, o.base - 9); g.moveTo(o.x, o.base); g.lineTo(o.x + 3, o.base - 9); g.moveTo(o.x, o.base); g.lineTo(o.x, o.base - 9); g.stroke();
    g.fillStyle = '#e8e2d6'; g.save(); g.translate(o.x, o.base - 10); g.rotate(-0.5); g.beginPath(); g.roundRect(-5, -1.3, 10, 2.6, 1); g.fill(); g.restore();
  }
}

function paintFence(g, a, b, groundY) {
  for (let x = a; x <= b; x += 0.8) {
    const gy = groundY(x);
    g.fillStyle = '#9a6a42'; g.fillRect(x, gy - 9.5, 0.9, 0.9); g.fillRect(x, gy - 5.5, 0.9, 0.8);
    g.fillStyle = '#c99a6a'; g.fillRect(x, gy - 9.5, 0.9, 0.3);
  }
  for (let x = a; x <= b; x += 20) {
    const gy = groundY(x);
    g.fillStyle = lin(g, x - 1, 0, x + 1.5, 0, [[0, '#c99a6a'], [1, '#6e4a2c']]);
    g.fillRect(x - 0.8, gy - 12, 2, 12.5);
  }
}

// ------------------------------------------------------------------ terrain (ground surface + cliff face)
function paintTerrain(g, area, tx0, tx1) {
  const theme = area.theme;
  const top = [];
  for (let x = tx0 - 2; x <= tx1 + 2; x += 1) top.push([x, area.groundY(x)]);
  g.save();
  g.beginPath();
  g.moveTo(tx0 - 2, YBOT);
  for (const [x, y] of top) g.lineTo(x, y);
  g.lineTo(tx1 + 2, YBOT);
  g.closePath();
  g.clip();
  // soil / rock body with soft strata
  const rimLike = x => area.isRim(x);
  const r = rng(Math.floor(tx0) + 7);
  for (let y = YTOP; y < YBOT; y += 3) {
    const idx = Math.abs(Math.floor((y + 1000) / 9)) % STRATA.length;
    g.fillStyle = theme === 'seep' ? mix(STRATA[idx], '#5a4a48', 0.45) : STRATA[idx];
    g.fillRect(tx0 - 2, y, tx1 - tx0 + 4, 3.4);
  }
  g.globalCompositeOperation = 'multiply';
  // shade by depth below the surface
  for (let x = tx0 - 2; x < tx1 + 2; x += 4) {
    const gy = area.groundY(x);
    g.fillStyle = lin(g, 0, gy, 0, gy + 120, [[0, '#ffffff'], [0.08, '#e8d4cc'], [1, mix(SHADOW, '#000000', 0.25)]]);
    g.fillRect(x, gy, 4.5, YBOT - gy);
  }
  g.globalAlpha = 0.35; g.fillStyle = g.createPattern(grain(), 'repeat');
  g.save(); g.scale(0.14, 0.14); g.fillRect((tx0 - 2) / 0.14, YTOP / 0.14, (tx1 - tx0 + 4) / 0.14, (YBOT - YTOP) / 0.14); g.restore();
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
  // embedded rocks
  for (let i = 0; i < (tx1 - tx0) / 9; i++) {
    const x = tx0 + r() * (tx1 - tx0), gy = area.groundY(x), y = gy + 6 + r() * 60;
    const rw = 2 + r() * 6;
    g.fillStyle = lin(g, x - rw, y - rw, x + rw, y + rw, [[0, 'rgba(255,230,210,0.35)'], [1, 'rgba(90,40,40,0.35)']]);
    ellipse(g, x, y, rw, rw * 0.55, (r() - 0.5) * 0.5); g.fill();
  }
  g.restore();
  // surface: trail dust + edge
  g.lineCap = 'round';
  for (let x = tx0 - 2; x < tx1 + 2; x += 1) {
    const gy = area.groundY(x);
    const rim = rimLike(x);
    g.fillStyle = theme === 'seep' ? '#7a6a52' : rim ? '#b8a878' : '#e2c29a';
    g.fillRect(x, gy - 0.2, 1.05, 1.6);
    g.fillStyle = theme === 'seep' ? '#5a7a3a' : rim ? '#8aa05a' : '#f2dcbc';
    g.fillRect(x, gy - 0.6, 1.05, 0.5);
  }
  // pebbles, grass & sage along the surface
  for (let x = tx0; x < tx1; x += 1.2 + r() * 3) {
    const gy = area.groundY(x);
    const rim = rimLike(x);
    if (rim || theme === 'seep') {
      g.strokeStyle = r() < 0.5 ? '#6a8a44' : '#9ab866'; g.lineWidth = 0.25;
      for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(x + k * 0.3, gy); g.quadraticCurveTo(x + k * 0.3 + (r() - 0.5), gy - 1.5, x + k * 0.6 + (r() - 0.5) * 1.5, gy - 2 - r() * 2); g.stroke(); }
      if (r() < 0.05) { g.fillStyle = r() < 0.5 ? '#f6e6a0' : '#e9a0c0'; circle(g, x, gy - 2.5, 0.45); g.fill(); }
    } else if (r() < 0.5) {
      g.fillStyle = lin(g, 0, gy - 1, 0, gy + 0.5, [[0, '#f6e2c8'], [1, '#b88a66']]);
      ellipse(g, x, gy - 0.2, 0.4 + r() * 0.8, 0.3 + r() * 0.4); g.fill();
    }
  }
}

// ------------------------------------------------------------------ Area
export class Area {
  constructor(def) {
    Object.assign(this, def);
    this.pts = def.points;
    this.tiles = new Map();
    this.obstacles = def.obstacles || [];
    this.platforms = def.platforms || [];
    for (const o of this.obstacles) o.top = this.groundY(o.x) - o.h;
    this.decor = def.decor(this);
    this.decor.sort((a, b) => (a.z || 0) - (b.z || 0));
  }
  groundY(x) {
    const P = this.pts;
    if (x <= P[0][0]) return P[0][1];
    for (let i = 1; i < P.length; i++) {
      const [x1, y1] = P[i];
      if (x <= x1) {
        const [x0, y0] = P[i - 1];
        const t = (x - x0) / (x1 - x0);
        return y0 + (y1 - y0) * (1 - Math.cos(t * Math.PI)) / 2;
      }
    }
    return P[P.length - 1][1];
  }
  isRim(x) { return this.rim ? this.rim(x) : false; }
  zoneAt(x) { return (this.zones || []).find(z => x >= z.x0 && x < z.x1); }

  /** Highest walkable surface at x that is at or below y (+tolerance). */
  supportAt(x, y, tol = 2) {
    let best = this.groundY(x);
    for (const o of this.obstacles) if (Math.abs(x - o.x) <= o.w / 2 && o.top >= y - tol && o.top < best) best = o.top;
    for (const p of this.platforms) if (x >= p.x0 && x <= p.x1 && p.y >= y - tol && p.y < best) best = p.y;
    return best;
  }
  /** Obstacle blocking horizontal movement into x at height y. */
  blockerAt(x, y) {
    for (const o of this.obstacles) if (Math.abs(x - o.x) <= o.w / 2 + 2.2 && y > o.top + 1.2) return o;
    return null;
  }

  tile(i, S) {
    const key = i + ':' + S;
    let t = this.tiles.get(key);
    if (t) { this.tiles.delete(key); this.tiles.set(key, t); return t; }
    const tx0 = i * TILE_W, tx1 = tx0 + TILE_W;
    const c = canvas(TILE_W * S, (YBOT - YTOP) * S), g = c.getContext('2d');
    g.scale(S, S); g.translate(-tx0, -YTOP);
    for (const o of this.decor) {
      if (o.x1 !== undefined ? (o.x1 < tx0 - 2 || o.x0 > tx1 + 2) : Math.abs(o.x - (tx0 + tx1) / 2) > TILE_W / 2 + (o.w || 10) + 4) continue;
      if (o.layer === 'front') continue;
      paint(g, o, this);
    }
    paintTerrain(g, this, tx0, tx1);
    for (const p of this.platforms) if (p.x1 > tx0 - 4 && p.x0 < tx1 + 4) paintLedge(g, p);
    for (const o of this.obstacles) if (Math.abs(o.x - (tx0 + tx1) / 2) < TILE_W / 2 + o.w) paintBoulder(g, o, this.groundY(o.x));
    for (const o of this.decor) {
      if (o.layer !== 'front') continue;
      if (Math.abs(o.x - (tx0 + tx1) / 2) > TILE_W / 2 + (o.w || 10) + 4) continue;
      paint(g, o, this);
    }
    t = c;
    this.tiles.set(key, t);
    while (this.tiles.size > 7) this.tiles.delete(this.tiles.keys().next().value);
    return t;
  }
  /** Bake tiles around x during idle time so walking stays smooth. */
  prewarm(x, S) {
    const i = Math.floor(x / TILE_W);
    for (const j of [i, i + 1, i - 1, i + 2, i - 2]) {
      if (j < 0 || j * TILE_W > this.width) continue;
      if (!this.tiles.has(j + ':' + S)) { this.tile(j, S); return; }
    }
  }
  drawNear(ctx, ox, oy, W, H, S) {
    const i0 = Math.floor(ox / TILE_W), i1 = Math.floor((ox + W) / TILE_W);
    for (let i = i0; i <= i1; i++) {
      if (i < 0 || i * TILE_W > this.width) continue;
      const t = this.tile(i, S);
      ctx.drawImage(t, i * TILE_W - ox, YTOP - oy, TILE_W + 0.02, YBOT - YTOP);
    }
  }
}

function paint(g, o, area) {
  switch (o.type) {
    case 'hoodoo': paintHoodoo(g, o); break;
    case 'pine': paintPine(g, o); break;
    case 'shrub': paintShrub(g, o); break;
    case 'wall': paintWall(g, o); break;
    case 'arch': paintArch(g, o); break;
    case 'special': paintSpecial(g, o); break;
    case 'fence': paintFence(g, o.x0, o.x1, x => area.groundY(x)); break;
  }
}

// ------------------------------------------------------------------ background layers (baked once)
export const LAYER_BASE = 230;
const LAYER_H = 380;
export function bakeBackground(kind, p, areaW, viewW, S) {
  const w = areaW * p + viewW + 60;
  const sc = S;
  const c = canvas(w * sc, LAYER_H * sc), g = c.getContext('2d');
  g.scale(sc, sc);
  const B = LAYER_BASE;
  const r = rng(kind.length * 31 + Math.round(p * 100));
  if (kind === 'plateau') {
    for (const [off, col, amp] of [[-38, '#aab0d4', 10], [-24, '#9aa2c8', 7]]) {
      g.fillStyle = col;
      g.beginPath(); g.moveTo(0, LAYER_H);
      for (let x = 0; x <= w; x += 4) g.lineTo(x, B + off + fbm(x / 120, off) * amp);
      g.lineTo(w, LAYER_H); g.fill();
    }
    return c;
  }
  if (kind === 'far' || kind === 'mid') {
    const far = kind === 'far';
    const haze = far ? 0.45 : 0.14;
    // slope behind
    g.fillStyle = lin(g, 0, B - 10, 0, B + 60, [[0, mix('#d99474', HAZE, haze)], [1, mix('#b8644a', HAZE, haze * 0.8)]]);
    g.fillRect(0, B, w, LAYER_H - B);
    let x = 0;
    while (x < w) {
      if (r() < 0.12) paintPine(g, { x, base: B + 4, h: far ? 9 + r() * 7 : 16 + r() * 16, seed: (r() * 1e6) | 0, haze: haze + 0.1 });
      else paintHoodoo(g, { x, base: B + 4 + r() * 6, w: far ? 3.5 + r() * 6 : 6 + r() * 12, h: far ? 12 + r() * 40 : 24 + r() * 80, seed: (r() * 1e6) | 0, haze, detail: far ? 1 : 2 });
      x += far ? 2.5 + r() * 6 : 6 + r() * 16;
    }
    // atmospheric fade at the base
    g.fillStyle = lin(g, 0, B - 20, 0, B + 40, [[0, rgba(HAZE, 0)], [1, rgba(HAZE, far ? 0.6 : 0.35)]]);
    g.fillRect(0, B - 20, w, LAYER_H - B + 20);
    return c;
  }
  if (kind === 'cliffs') { // close canyon walls for grottos / slots
    paintWall(g, { x0: 0, x1: w, top: B - 160, bottom: B + 40, seed: 5, color: '#a85638', taper: 0 });
    return c;
  }
  return c;
}

// soft foreground silhouettes (drawn after characters, slightly blurred)
const fgCache = {};
export function foregroundSprite(kind, seed) {
  const key = kind + seed;
  if (fgCache[key]) return fgCache[key];
  const r = rng(seed);
  const lw = 40, lh = 30, sc = 1.1;   // low resolution = natural blur when scaled up
  const c = canvas(lw * sc, lh * sc), g = c.getContext('2d');
  g.scale(sc, sc);
  if (kind === 'bush') {
    for (let i = 0; i < 9; i++) { g.fillStyle = r() < 0.5 ? '#2a3a26' : '#3a4a30'; ellipse(g, 20 + (r() - 0.5) * 26, 24 - r() * 12, 5 + r() * 6, 4 + r() * 4); g.fill(); }
  } else if (kind === 'grass') {
    g.strokeStyle = '#3a4a2a'; g.lineWidth = 0.9;
    for (let i = 0; i < 26; i++) { const x = 4 + r() * 32; g.beginPath(); g.moveTo(x, 30); g.quadraticCurveTo(x + (r() - 0.5) * 6, 18, x + (r() - 0.5) * 10, 6 + r() * 10); g.stroke(); }
  } else {
    g.fillStyle = '#4a2e2a'; g.beginPath(); g.moveTo(2, 30); g.quadraticCurveTo(6, 10, 20, 8 + r() * 6); g.quadraticCurveTo(34, 10, 38, 30); g.fill();
  }
  fgCache[key] = { c, w: lw, h: lh };
  return fgCache[key];
}

// ------------------------------------------------------------------ current area (for entities)
let CUR = null;
export function setArea(a) { CUR = a; }
export function currentArea() { return CUR; }
export const groundY = x => CUR.groundY(x);
