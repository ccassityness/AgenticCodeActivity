// Blue Spring State Park, painted procedurally: live oaks draped in Spanish moss, sabal palms,
// bald cypress, the boardwalk along the clear spring run, the Thursby House on its shell mound,
// and the dark St. Johns River. Static scenery is baked into cached high-res tiles; water,
// mist and light are drawn every frame.
import { mix, shade, rgba, rng, fbm, canvas, grain, ellipse, circle, lin, rad } from './color.js?v=20261115b';

export const WORLD_W = 3600;
export const YTOP = -60;
export const YBOT = 210;
export const DECK_Y = 92;
export const WATER_Y = 104;
const TILE_W = 256;

// ------------------------------------------------------------------ geography
export function groundY(x) {
  if (x < 380) return 90;
  if (x < 560) return 90 - 6 * (1 - Math.cos((x - 380) / 180 * Math.PI)) / 2;
  if (x < 720) return 84;
  if (x < 900) return 84 + (1 - Math.cos((x - 720) / 180 * Math.PI)) / 2 * (DECK_Y - 84);
  return DECK_Y;
}
export const onBoardwalk = x => x >= 900;
export function bottomY(x) {
  if (x < 640) return 150;
  let y = 132 + Math.sin(x / 170) * 5 + Math.sin(x / 53) * 2;
  if (x < 760) y = mix2(150, y, (x - 640) / 120);
  const boil = Math.exp(-Math.pow((x - 3340) / 70, 2));
  return y + boil * 48;
}
const mix2 = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));
/** 0 = dark St. Johns River water, 1 = clear spring water */
export const clarity = x => Math.max(0, Math.min(1, (x - 560) / 200));

export const ZONES = [
  { x0: 0, x1: 420, name: 'St. Johns River', sub: 'boat dock and kayak launch' },
  { x0: 420, x1: 900, name: 'Thursby House', sub: 'built in 1872 atop an ancient shell mound' },
  { x0: 900, x1: 3180, name: 'Spring Run Boardwalk', sub: 'winter home of the manatees' },
  { x0: 3180, x1: WORLD_W, name: 'The Spring Boil', sub: 'where the water rises from the aquifer' },
];
export const zoneAt = x => ZONES.find(z => x >= z.x0 && x < z.x1);

// ------------------------------------------------------------------ foliage primitives
const OAK_GREENS = ['#2c3d22', '#3a4e2a', '#4a5e32', '#5c6e3c', '#6e7e48'];
const PALM_GREENS = ['#3e5a2e', '#4e6e36', '#6a8442', '#829a52'];
const HAZE = '#a9b8b0';

function leafMass(g, cx, cy, rx, ry, cols, density, r, haze = 0) {
  const C = haze ? cols.map(c => mix(c, HAZE, haze)) : cols;
  // soft dark core so the mass never looks hollow
  g.fillStyle = rad(g, cx, cy + ry * 0.2, 0, Math.max(rx, ry), [[0, C[0]], [0.75, rgba(C[0], 0.85)], [1, rgba(C[0], 0)]]);
  g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); g.fill();
  const n = Math.round(rx * ry * density);
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r());
    const x = cx + Math.cos(a) * rx * d, y = cy + Math.sin(a) * ry * d;
    // lighter toward the upper-left, darker underneath
    const light = (cx - x) / rx * 0.35 + (cy - y) / ry * 0.65;
    const idx = Math.max(0, Math.min(C.length - 1, Math.round(1.6 + light * 1.8 + (r() - 0.5) * 1.2)));
    g.fillStyle = C[idx];
    const s = 0.35 + r() * 0.55;
    g.beginPath(); g.ellipse(x, y, s * 1.4, s * 0.7, r() * 3.14, 0, Math.PI * 2); g.fill();
  }
}

function branch(g, x0, y0, x1, y1, w0, w1, col) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  const mx = (x0 + x1) / 2 + nx * L * 0.08, my = (y0 + y1) / 2 + ny * L * 0.08;
  g.fillStyle = col;
  g.beginPath();
  g.moveTo(x0 + nx * w0 / 2, y0 + ny * w0 / 2);
  g.quadraticCurveTo(mx + nx * (w0 + w1) / 4, my + ny * (w0 + w1) / 4, x1 + nx * w1 / 2, y1 + ny * w1 / 2);
  g.lineTo(x1 - nx * w1 / 2, y1 - ny * w1 / 2);
  g.quadraticCurveTo(mx - nx * (w0 + w1) / 4, my - ny * (w0 + w1) / 4, x0 - nx * w0 / 2, y0 - ny * w0 / 2);
  g.fill();
}

function spanishMoss(g, x, y, len, r, haze = 0) {
  const cols = ['#9aa48a', '#b4bca2', '#7e8a70', '#c8ccb8'].map(c => (haze ? mix(c, HAZE, haze) : c));
  const n = 5 + (r() * 8 | 0);
  for (let i = 0; i < n; i++) {
    const sx = x + (r() - 0.5) * 2.4, L = len * (0.4 + r() * 0.8);
    g.strokeStyle = rgba(cols[(r() * 4) | 0], 0.75); g.lineWidth = 0.12 + r() * 0.2;
    g.beginPath(); g.moveTo(sx, y);
    let px = sx, py = y;
    for (let k = 1; k <= 6; k++) { const nx = sx + Math.sin(k * 1.3 + i) * 0.6 + (r() - 0.5) * 0.4, ny = y + L * k / 6; g.quadraticCurveTo(px + (r() - 0.5) * 0.8, (py + ny) / 2, nx, ny); px = nx; py = ny; }
    g.stroke();
  }
  g.fillStyle = rgba(cols[0], 0.5); g.beginPath(); g.ellipse(x, y + len * 0.2, 1.1, len * 0.25, 0, 0, Math.PI * 2); g.fill();
}

function paintOak(g, o) {
  const r = rng(o.seed);
  const hz = c => (o.haze ? mix(c, HAZE, o.haze) : c);
  const bark = hz('#4a4036'), barkD = hz('#2e2820');
  const { x, base, h } = o;
  const tw = h * 0.09;
  // trunk with flared base
  g.fillStyle = lin(g, x - tw, 0, x + tw, 0, [[0, hz('#6a5e50')], [0.4, bark], [1, barkD]]);
  g.beginPath(); g.moveTo(x - tw * 1.6, base); g.quadraticCurveTo(x - tw * 0.8, base - h * 0.08, x - tw * 0.7, base - h * 0.35); g.lineTo(x + tw * 0.7, base - h * 0.35); g.quadraticCurveTo(x + tw * 0.8, base - h * 0.08, x + tw * 1.6, base); g.fill();
  if (!o.haze) { g.strokeStyle = 'rgba(25,20,15,0.35)'; g.lineWidth = 0.18; for (let i = 0; i < 6; i++) { const bx = x - tw * 0.6 + r() * tw * 1.2; g.beginPath(); g.moveTo(bx, base); g.quadraticCurveTo(bx + (r() - 0.5), base - h * 0.15, bx + (r() - 0.5) * 0.6, base - h * 0.32); g.stroke(); } }
  // great sprawling limbs
  const masses = [];
  const limbs = 3 + (r() * 3 | 0);
  for (let i = 0; i < limbs; i++) {
    const side = i % 2 ? 1 : -1;
    const sx = x + (r() - 0.5) * tw, sy = base - h * (0.3 + r() * 0.08);
    const len = h * (0.35 + r() * 0.35);
    const ang = -Math.PI / 2 + side * (0.35 + r() * 0.55);
    const ex = sx + Math.cos(ang) * len, ey = sy + Math.sin(ang) * len * 0.75;
    branch(g, sx, sy, ex, ey, tw * 1.1, tw * 0.35, lin(g, sx, sy - 2, sx, sy + 2, [[0, hz('#5e5244')], [1, barkD]]));
    // sub-branches
    for (let k = 0; k < 2; k++) {
      const t = 0.5 + r() * 0.4;
      const bx = sx + (ex - sx) * t, by = sy + (ey - sy) * t;
      const a2 = ang + (r() - 0.5) * 1.2 - 0.3;
      const l2 = len * (0.3 + r() * 0.3);
      const fx = bx + Math.cos(a2) * l2, fy = by + Math.sin(a2) * l2 * 0.7;
      branch(g, bx, by, fx, fy, tw * 0.4, tw * 0.15, barkD);
      masses.push([fx, fy, l2 * 0.75]);
      if (!o.haze && r() < 0.8) spanishMoss(g, (bx + fx) / 2, (by + fy) / 2 + 0.5, 5 + r() * 9, r);
    }
    for (let k = 0; k < 3; k++) masses.push([ex + (r() - 0.5) * len * 0.6, ey - r() * len * 0.3, len * (0.28 + r() * 0.18)]);
    // resurrection fern along the top of the limb
    if (!o.haze) { g.fillStyle = 'rgba(110,140,70,0.75)'; for (let k = 0; k < 10; k++) { const t = r(); g.beginPath(); g.ellipse(sx + (ex - sx) * t, sy + (ey - sy) * t - tw * 0.35, 0.5, 0.22, r(), 0, Math.PI * 2); g.fill(); } }
  }
  for (let k = 0; k < 4; k++) masses.push([x + (r() - 0.5) * h * 0.5, base - h * (0.78 + r() * 0.2), h * (0.16 + r() * 0.1)]);
  for (const [mx, my, s] of masses) leafMass(g, mx, my, s * (0.9 + r() * 0.3), s * (0.5 + r() * 0.25), OAK_GREENS, o.haze ? 1.2 : 3.6, r, o.haze);
  // moss hanging from the canopy edges
  if (!o.haze) for (const [mx, my, s] of masses) for (let k = 0; k < 3; k++) spanishMoss(g, mx + (r() - 0.5) * s * 1.4, my + s * 0.35, 6 + r() * 12, r);
  else for (const [mx, my, s] of masses) spanishMoss(g, mx, my + s * 0.4, 6 + r() * 6, r, o.haze);
}

function paintSabal(g, o) {
  const r = rng(o.seed);
  const hz = c => (o.haze ? mix(c, HAZE, o.haze) : c);
  const { x, base, h } = o;
  const lean = (r() - 0.5) * 0.18;
  const topX = x + lean * h, topY = base - h;
  // trunk with leaf-base "boots" near the top, smooth grey lower down
  const tw = 1.5 + h * 0.012;
  g.fillStyle = lin(g, x - tw, 0, x + tw, 0, [[0, hz('#8a8070')], [0.5, hz('#6a6254')], [1, hz('#4a4438')]]);
  g.beginPath(); g.moveTo(x - tw, base); g.quadraticCurveTo(x + lean * h * 0.5 - tw, base - h * 0.5, topX - tw * 0.9, topY); g.lineTo(topX + tw * 0.9, topY); g.quadraticCurveTo(x + lean * h * 0.5 + tw, base - h * 0.5, x + tw, base); g.fill();
  if (!o.haze) {
    g.strokeStyle = 'rgba(40,32,24,0.45)'; g.lineWidth = 0.22;
    for (let y = 0; y < h * 0.45; y += 1.1) {
      const t = 1 - y / h, cx = x + lean * h * (1 - t), cy = topY + y;
      g.beginPath(); g.moveTo(cx - tw, cy); g.lineTo(cx + tw, cy + 1.0); g.moveTo(cx + tw, cy); g.lineTo(cx - tw, cy + 1.0); g.stroke();
    }
  }
  // dead fronds hanging
  for (let i = 0; i < 4; i++) {
    g.strokeStyle = hz(r() < 0.5 ? '#8a7448' : '#a08a58'); g.lineWidth = 0.45;
    const a = Math.PI / 2 + (r() - 0.5) * 0.8;
    g.beginPath(); g.moveTo(topX, topY + 1); g.quadraticCurveTo(topX + Math.cos(a) * 4, topY + 4, topX + Math.cos(a) * 3, topY + 8 + r() * 4); g.stroke();
  }
  // fan fronds
  const fronds = 13 + (r() * 6 | 0);
  for (let i = 0; i < fronds; i++) {
    const a = -Math.PI * (0.05 + r() * 0.9);
    const L = 6 + r() * 6 + h * 0.08;
    const fx = topX + Math.cos(a) * L * 0.55, fy = topY + Math.sin(a) * L * 0.4;
    g.strokeStyle = hz('#5a6a3a'); g.lineWidth = 0.3;
    g.beginPath(); g.moveTo(topX, topY); g.quadraticCurveTo((topX + fx) / 2, fy - 1, fx, fy); g.stroke();
    // costapalmate fan: leaflets radiating from the frond tip and drooping
    const fan = 11;
    for (let k = 0; k < fan; k++) {
      const aa = a + (k / (fan - 1) - 0.5) * 1.7;
      const ll = L * (0.45 + r() * 0.25);
      const ex = fx + Math.cos(aa) * ll, ey = fy + Math.sin(aa) * ll * 0.6 + ll * 0.25;
      g.strokeStyle = hz(PALM_GREENS[(r() * PALM_GREENS.length) | 0]); g.lineWidth = 0.35 + r() * 0.25;
      g.beginPath(); g.moveTo(fx, fy); g.quadraticCurveTo(fx + Math.cos(aa) * ll * 0.6, fy + Math.sin(aa) * ll * 0.45 - 0.5, ex, ey); g.stroke();
    }
  }
}

function paintCypress(g, o) {
  const r = rng(o.seed);
  const hz = c => (o.haze ? mix(c, HAZE, o.haze) : c);
  const { x, base, h } = o;
  const tw = 1.4 + h * 0.018;
  g.fillStyle = lin(g, x - tw * 2, 0, x + tw * 2, 0, [[0, hz('#8a6a54')], [0.5, hz('#6a4e3c')], [1, hz('#3e2c22')]]);
  g.beginPath(); g.moveTo(x - tw * 2.6, base); g.quadraticCurveTo(x - tw * 0.9, base - h * 0.12, x - tw * 0.6, base - h * 0.3); g.lineTo(x - tw * 0.2, base - h); g.lineTo(x + tw * 0.2, base - h); g.lineTo(x + tw * 0.6, base - h * 0.3); g.quadraticCurveTo(x + tw * 0.9, base - h * 0.12, x + tw * 2.6, base); g.fill();
  if (!o.haze) { g.strokeStyle = 'rgba(40,25,18,0.4)'; g.lineWidth = 0.15; for (let i = 0; i < 8; i++) { const bx = x + (r() - 0.5) * tw; g.beginPath(); g.moveTo(bx, base); g.lineTo(bx + (r() - 0.5) * 0.4, base - h * (0.3 + r() * 0.5)); g.stroke(); } }
  // feathery foliage sprays
  for (let i = 0; i < 14; i++) {
    const ty = 0.35 + r() * 0.65, cy = base - h * ty;
    const side = r() < 0.5 ? -1 : 1;
    const len = (1 - ty) * h * 0.25 + 3;
    const ex = x + side * len, ey = cy - len * 0.2;
    g.strokeStyle = hz('#5a4434'); g.lineWidth = 0.25; g.beginPath(); g.moveTo(x, cy); g.lineTo(ex, ey); g.stroke();
    for (let k = 0; k < 18; k++) {
      const t = r(), px = x + (ex - x) * t, py = cy + (ey - cy) * t;
      g.strokeStyle = hz(['#5a7a3a', '#6e8e48', '#4a6a30', '#86a058'][(r() * 4) | 0]); g.lineWidth = 0.2;
      g.beginPath(); g.moveTo(px, py); g.lineTo(px + (r() - 0.5) * 2.4, py + 0.6 + r() * 2); g.stroke();
    }
  }
  if (o.knees && !o.haze) for (let i = 0; i < 4; i++) { const kx = x + (r() - 0.5) * 16, kh = 1.5 + r() * 2.5; g.fillStyle = lin(g, kx - 1, 0, kx + 1, 0, [[0, '#8a6a54'], [1, '#4a3428']]); g.beginPath(); g.moveTo(kx - 1, base + 1); g.quadraticCurveTo(kx, base - kh * 2, kx + 1, base + 1); g.fill(); }
}

function paintPalmetto(g, o) {
  const r = rng(o.seed);
  for (let f = 0; f < 4 + (r() * 3 | 0); f++) {
    const fx = o.x + (r() - 0.5) * o.w, fy = o.base - 2 - r() * o.w * 0.3;
    g.strokeStyle = '#6a7a42'; g.lineWidth = 0.25; g.beginPath(); g.moveTo(fx, o.base); g.lineTo(fx, fy); g.stroke();
    for (let k = 0; k < 13; k++) {
      const a = -Math.PI * (0.05 + k / 12 * 0.9);
      const L = o.w * (0.35 + r() * 0.15);
      g.strokeStyle = ['#7a8a4a', '#8e9c58', '#6a7e40', '#a0a868'][(r() * 4) | 0]; g.lineWidth = 0.32;
      g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx + Math.cos(a) * L, fy + Math.sin(a) * L * 0.7); g.stroke();
    }
  }
}

function paintFernBank(g, x0, x1, top, r) {
  for (let x = x0; x < x1; x += 1.2 + r() * 2.2) {
    const y = top + r() * 6;
    const L = 2.5 + r() * 4;
    g.strokeStyle = ['#4a6a30', '#5e7e3a', '#6e8a46', '#3e5a2a'][(r() * 4) | 0]; g.lineWidth = 0.22;
    for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(x, y + 1); g.quadraticCurveTo(x + k * 0.6, y - L * 0.6, x + k * L * 0.35, y - L * 0.5 + Math.abs(k) * 0.6); g.stroke(); }
  }
}

// ------------------------------------------------------------------ built structures
function paintHouse(g, x, base) {
  // Thursby House: two-story frame house with double porches and a tin roof
  const w = 64, h1 = 22, h2 = 20, L = x - w / 2;
  const wall = lin(g, L, 0, L + w, 0, [[0, '#f2ece0'], [1, '#c8c0b0']]);
  g.fillStyle = 'rgba(40,30,20,0.25)'; g.fillRect(L - 2, base - 1, w + 4, 2);
  // brick piers & chimney
  g.fillStyle = '#9a5a44'; for (let i = 0; i < 6; i++) g.fillRect(L + 2 + i * 12, base - 3, 2.4, 3);
  g.fillStyle = lin(g, x + 18, 0, x + 23, 0, [[0, '#b06a50'], [1, '#7a4234']]); g.fillRect(x + 18, base - h1 - h2 - 16, 5, 16);
  // walls with clapboard
  g.fillStyle = wall; g.fillRect(L, base - h1 - h2 - 3, w, h1 + h2);
  g.strokeStyle = 'rgba(120,110,95,0.35)'; g.lineWidth = 0.18;
  for (let y = base - h1 - h2 - 2; y < base - 3; y += 1.3) { g.beginPath(); g.moveTo(L, y); g.lineTo(L + w, y); g.stroke(); }
  // windows with green shutters
  for (const fl of [0, 1]) for (let i = 0; i < 4; i++) {
    const wx = L + 7 + i * 15, wy = base - 3 - (fl ? h1 + h2 - 5 : h1 - 5);
    g.fillStyle = '#3e5a46'; g.fillRect(wx - 2.2, wy - 9, 1.8, 9); g.fillRect(wx + 5.4, wy - 9, 1.8, 9);
    g.fillStyle = lin(g, 0, wy - 9, 0, wy, [[0, '#a8c0c8'], [1, '#4a5a62']]); g.fillRect(wx - 0.2, wy - 9, 5.4, 9);
    g.strokeStyle = '#f2ece0'; g.lineWidth = 0.3; g.beginPath(); g.moveTo(wx + 2.5, wy - 9); g.lineTo(wx + 2.5, wy); g.moveTo(wx - 0.2, wy - 4.5); g.lineTo(wx + 5.2, wy - 4.5); g.stroke();
  }
  // metal roof
  g.fillStyle = lin(g, 0, base - h1 - h2 - 18, 0, base - h1 - h2 - 2, [[0, '#a8aaa8'], [1, '#6e706e']]);
  g.beginPath(); g.moveTo(L - 4, base - h1 - h2 - 2); g.lineTo(x - 10, base - h1 - h2 - 17); g.lineTo(x + 10, base - h1 - h2 - 17); g.lineTo(L + w + 4, base - h1 - h2 - 2); g.fill();
  g.strokeStyle = 'rgba(60,60,60,0.35)'; g.lineWidth = 0.2; for (let i = 0; i < 26; i++) { const t = i / 25; g.beginPath(); g.moveTo(L - 4 + (w + 8) * t, base - h1 - h2 - 2); g.lineTo(x - 10 + 20 * t, base - h1 - h2 - 17); g.stroke(); }
  // double porch along the front
  for (const fl of [0, 1]) {
    const py = base - 3 - fl * h1;
    g.fillStyle = 'rgba(30,25,20,0.18)'; g.fillRect(L - 3, py - h1 + 2, w + 6, h1 - 2);
    g.fillStyle = '#e8e2d4'; g.fillRect(L - 4, py - h1 + 1, w + 8, 1.3);
    for (let i = 0; i <= 8; i++) { g.fillStyle = lin(g, L - 3 + i * (w + 6) / 8, 0, L - 2 + i * (w + 6) / 8, 0, [[0, '#f6f2ea'], [1, '#b8b0a0']]); g.fillRect(L - 3.5 + i * (w + 6) / 8, py - h1 + 2, 1.1, h1 - 2); }
    g.strokeStyle = '#e8e2d4'; g.lineWidth = 0.25;
    for (let xx = L - 3; xx < L + w + 3; xx += 1.2) { g.beginPath(); g.moveTo(xx, py - 5); g.lineTo(xx, py); g.stroke(); }
    g.fillStyle = '#e8e2d4'; g.fillRect(L - 4, py - 5.6, w + 8, 0.8);
    g.fillStyle = '#7a6a58'; g.fillRect(L - 4, py, w + 8, 0.9);
  }
  // steps
  g.fillStyle = '#c8bcaa'; for (let i = 0; i < 3; i++) g.fillRect(x - 5 + i * 0.6, base - 3 + i * 1, 10 - i * 1.2, 1);
}

function paintDock(g, x0, x1, y) {
  g.fillStyle = lin(g, 0, y, 0, y + 2, [[0, '#a8988a'], [1, '#6a5a4c']]); g.fillRect(x0, y, x1 - x0, 2);
  for (let x = x0 + 2; x < x1; x += 14) { g.fillStyle = lin(g, x, 0, x + 1.6, 0, [[0, '#8a7a6a'], [1, '#4a3e34']]); g.fillRect(x, y + 1.5, 1.6, 30); }
}

function paintBoat(g, x, y) {
  // pontoon tour boat moored at the dock
  g.fillStyle = lin(g, 0, y - 3, 0, y + 2, [[0, '#d8dcd8'], [1, '#8a9090']]);
  g.beginPath(); g.roundRect(x - 26, y - 2.5, 52, 4, 2); g.fill();
  g.fillStyle = '#f2f0ea'; g.fillRect(x - 24, y - 6, 48, 3.6);
  g.fillStyle = '#2f6a7a'; g.fillRect(x - 24, y - 5.2, 48, 1);
  for (let i = 0; i < 7; i++) { g.fillStyle = '#c8ccc8'; g.fillRect(x - 23 + i * 7.6, y - 18, 0.6, 12); }
  g.fillStyle = lin(g, 0, y - 21, 0, y - 17, [[0, '#4a8a8a'], [1, '#2f6a6a']]); g.fillRect(x - 25, y - 20, 50, 2.6);
}

// ------------------------------------------------------------------ scene layout
function decor() {
  const D = [];
  const r = rng(2024);
  // forest behind the trail
  for (let x = -20; x < WORLD_W + 40; x += 60 + r() * 90) {
    if (x > 560 && x < 730) continue; // house clearing
    D.push({ type: 'oak', x, base: groundY(x) + 6, h: 46 + r() * 30, seed: (r() * 1e6) | 0, z: 1 });
  }
  for (let x = 0; x < WORLD_W; x += 30 + r() * 70) {
    if (x > 590 && x < 700) continue;
    D.push({ type: 'palm', x, base: groundY(x) + 5, h: 42 + r() * 34, seed: (r() * 1e6) | 0, z: r() < 0.5 ? 0 : 2 });
  }
  for (let x = 980; x < 3200; x += 140 + r() * 220) D.push({ type: 'cypress', x, base: groundY(x) + 8, h: 70 + r() * 30, seed: (r() * 1e6) | 0, knees: true, z: 0 });
  for (let x = 0; x < WORLD_W; x += 22 + r() * 30) D.push({ type: 'palmetto', x, base: groundY(x) + 6, w: 8 + r() * 6, seed: (r() * 1e6) | 0, z: 3 });
  D.push({ type: 'house', x: 640, base: 84, z: 4 });
  D.push({ type: 'boat', x: 190, base: WATER_Y - 1, z: 5 });
  D.push({ type: 'dock', x0: 90, x1: 300, y: 92, x: 195, w: 210, z: 5 });
  D.push({ type: 'snag', x: 1720, base: WATER_Y + 2, z: 5 });
  D.push({ type: 'log', x: 1260, y: WATER_Y + 0.5, w: 30, z: 6 });
  return D.sort((a, b) => a.z - b.z);
}

function paintSnag(g, x, base) {
  g.fillStyle = lin(g, x - 2, 0, x + 2, 0, [[0, '#a89a8a'], [1, '#5a4e44']]);
  g.beginPath(); g.moveTo(x - 1.6, base); g.lineTo(x - 0.7, base - 34); g.lineTo(x + 0.7, base - 34); g.lineTo(x + 1.6, base); g.fill();
  branch(g, x, base - 24, x + 9, base - 27, 1.0, 0.4, '#8a7c6c');
  branch(g, x, base - 30, x - 6, base - 34, 0.8, 0.3, '#8a7c6c');
}
function paintLog(g, x, y, w) {
  g.fillStyle = lin(g, 0, y - 2, 0, y + 1.5, [[0, '#7a6a58'], [1, '#3a2e24']]);
  g.beginPath(); g.roundRect(x - w / 2, y - 1.8, w, 3.2, 1.6); g.fill();
  g.fillStyle = '#a8947a'; g.beginPath(); g.ellipse(x + w / 2 - 0.6, y - 0.2, 0.9, 1.5, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(30,20,15,0.4)'; g.lineWidth = 0.2; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(x - w / 2 + 2, y - 1 + i); g.lineTo(x + w / 2 - 2, y - 0.8 + i); g.stroke(); }
}

function paintTerrain(g, tx0, tx1) {
  const r = rng(Math.floor(tx0) + 11);
  // land / bank down to the water
  g.save();
  g.beginPath(); g.moveTo(tx0 - 2, WATER_Y + 3);
  for (let x = tx0 - 2; x <= tx1 + 2; x += 2) g.lineTo(x, onBoardwalk(x) ? 97 + Math.sin(x / 23) * 1.5 : groundY(x));
  g.lineTo(tx1 + 2, WATER_Y + 3); g.closePath();
  g.fillStyle = lin(g, 0, 84, 0, WATER_Y + 3, [[0, '#5a4a32'], [0.5, '#4a3a28'], [1, '#2e2418']]);
  g.fill(); g.clip();
  // shell midden layer under the house mound: bits of white shell in the soil
  for (let i = 0; i < (tx1 - tx0) * 1.2; i++) {
    const x = tx0 + r() * (tx1 - tx0); if (x < 430 || x > 860) continue;
    const y = groundY(x) + 1 + r() * (WATER_Y - groundY(x));
    g.fillStyle = r() < 0.7 ? 'rgba(235,228,212,0.75)' : 'rgba(200,190,170,0.7)';
    g.beginPath(); g.ellipse(x, y, 0.3 + r() * 0.5, 0.2 + r() * 0.3, r() * 3, 0, Math.PI * 2); g.fill();
  }
  g.globalAlpha = 0.25; g.fillStyle = g.createPattern(grain(), 'repeat');
  g.save(); g.scale(0.15, 0.15); g.fillRect((tx0 - 2) / 0.15, 80 / 0.15, (tx1 - tx0 + 4) / 0.15, 30 / 0.15); g.restore();
  g.globalAlpha = 1;
  g.restore();
  // leaf litter, grass and ferns along the top
  for (let x = tx0; x < tx1; x += 0.8 + r() * 1.5) {
    const y = onBoardwalk(x) ? 97 + Math.sin(x / 23) * 1.5 : groundY(x);
    g.strokeStyle = ['#6a7a3a', '#7e8a48', '#5a6a32', '#9a9a5a'][(r() * 4) | 0]; g.lineWidth = 0.18;
    g.beginPath(); g.moveTo(x, y + 0.5); g.quadraticCurveTo(x + (r() - 0.5), y - 1, x + (r() - 0.5) * 1.6, y - 1.5 - r() * 2); g.stroke();
    if (r() < 0.25) { g.fillStyle = ['#8a6a3a', '#a07a44', '#6a5030'][(r() * 3) | 0]; g.beginPath(); g.ellipse(x, y + 0.3, 0.5, 0.2, r(), 0, Math.PI * 2); g.fill(); }
  }
  paintFernBank(g, tx0, tx1, 96, r);
  // the land path (sand/shell) where there is no boardwalk
  for (let x = tx0; x < Math.min(tx1, 900); x += 1) {
    const y = groundY(x);
    g.fillStyle = '#d6c8a8'; g.fillRect(x, y - 0.3, 1.05, 1.4);
    g.fillStyle = '#e8dcc0'; g.fillRect(x, y - 0.5, 1.05, 0.35);
  }
  // muddy waterline with cypress knees roots shadows
  g.fillStyle = lin(g, 0, WATER_Y - 2, 0, WATER_Y + 2, [[0, 'rgba(40,30,20,0)'], [1, 'rgba(40,30,20,0.6)']]);
  g.fillRect(tx0 - 2, WATER_Y - 2, tx1 - tx0 + 4, 4);
}

function paintUnderwater(g, tx0, tx1) {
  const r = rng(Math.floor(tx0) + 3);
  // sandy, limestone bottom
  g.beginPath(); g.moveTo(tx0 - 2, YBOT);
  for (let x = tx0 - 2; x <= tx1 + 2; x += 2) g.lineTo(x, bottomY(x));
  g.lineTo(tx1 + 2, YBOT); g.closePath();
  g.fillStyle = lin(g, 0, 125, 0, 190, [[0, '#e8e0c8'], [0.4, '#c8c0a4'], [1, '#6a7064']]);
  g.fill();
  // the boil's vent: a dark limestone cave mouth
  if (tx1 > 3260 && tx0 < 3420) {
    g.fillStyle = rad(g, 3340, 186, 2, 34, [[0, '#06141c'], [0.6, '#0e2a34'], [1, 'rgba(30,60,70,0)']]);
    g.beginPath(); g.ellipse(3340, 184, 34, 16, 0, 0, Math.PI * 2); g.fill();
  }
  // limestone rocks and shells
  for (let i = 0; i < (tx1 - tx0) / 12; i++) {
    const x = tx0 + r() * (tx1 - tx0), y = bottomY(x) + 1 + r() * 4, s = 0.8 + r() * 3;
    g.fillStyle = lin(g, x - s, y - s, x + s, y + s, [[0, '#f2ecdc'], [1, '#9a9480']]);
    g.beginPath(); g.ellipse(x, y, s, s * 0.55, r() * 0.4, 0, Math.PI * 2); g.fill();
  }
  // eelgrass (tape grass) beds
  for (let x = tx0; x < tx1; x += 2 + r() * 10) {
    if (x < 700 || r() < 0.35) continue;
    const by = bottomY(x) + 1;
    for (let k = 0; k < 6; k++) {
      const bx = x + (r() - 0.5) * 4, L = 4 + r() * 10;
      g.strokeStyle = ['#6a8a3a', '#7e9a48', '#4e6e2e'][(r() * 3) | 0]; g.lineWidth = 0.35;
      g.beginPath(); g.moveTo(bx, by); g.bezierCurveTo(bx + 0.8, by - L * 0.4, bx + 2.2, by - L * 0.7, bx + 3.4, by - L); g.stroke();
    }
  }
}

function paintBackRail(g, tx0, tx1) {
  // boardwalk deck, posts and the back railing
  const a = Math.max(tx0 - 2, 900), b = tx1 + 2;
  if (b <= a) return;
  // posts into the water
  for (let x = Math.ceil(900 / 16) * 16; x < b; x += 16) {
    if (x < a - 16) continue;
    g.fillStyle = lin(g, x, 0, x + 1.8, 0, [[0, '#8a7c6c'], [1, '#4a4038']]); g.fillRect(x, DECK_Y + 1, 1.8, bottomY(x) - DECK_Y);
  }
  // deck fascia
  g.fillStyle = lin(g, 0, DECK_Y - 0.5, 0, DECK_Y + 2.6, [[0, '#b8aa96'], [0.3, '#9a8a76'], [1, '#5a4e42']]);
  g.fillRect(a, DECK_Y - 0.4, b - a, 3);
  g.fillStyle = 'rgba(30,25,20,0.3)'; g.fillRect(a, DECK_Y + 2.6, b - a, 1.6);
  g.strokeStyle = 'rgba(60,50,40,0.35)'; g.lineWidth = 0.15;
  for (let x = a; x < b; x += 3.1) { g.beginPath(); g.moveTo(x, DECK_Y - 0.4); g.lineTo(x, DECK_Y + 2.5); g.stroke(); }
  // back railing
  for (let x = Math.ceil(a / 16) * 16 + 8; x < b; x += 16) { g.fillStyle = lin(g, x, 0, x + 1.4, 0, [[0, '#a89a88'], [1, '#6a5e52']]); g.fillRect(x, DECK_Y - 11, 1.4, 11); }
  g.fillStyle = '#9a8c7a'; g.fillRect(a, DECK_Y - 11.5, b - a, 1.2); g.fillRect(a, DECK_Y - 6.2, b - a, 0.8);
}

export class World {
  constructor() {
    this.decor = decor();
    this.tiles = new Map();
    this.layers = null;
  }
  tile(i, S) {
    const key = i + ':' + S;
    let t = this.tiles.get(key);
    if (t) { this.tiles.delete(key); this.tiles.set(key, t); return t; }
    const tx0 = i * TILE_W, tx1 = tx0 + TILE_W;
    const c = canvas(TILE_W * S, (YBOT - YTOP) * S), g = c.getContext('2d');
    g.scale(S, S); g.translate(-tx0, -YTOP);
    paintUnderwater(g, tx0, tx1);
    for (const o of this.decor) {
      const ox0 = o.x0 ?? o.x - 60, ox1 = o.x1 ?? o.x + 60;
      if (ox1 < tx0 - 2 || ox0 > tx1 + 2) continue;
      if (o.type === 'oak' && o.z === 1) paintOak(g, o);
    }
    for (const o of this.decor) {
      const ox0 = o.x0 ?? o.x - 40, ox1 = o.x1 ?? o.x + 40;
      if (ox1 < tx0 - 2 || ox0 > tx1 + 2) continue;
      if (o.type === 'palm') paintSabal(g, o);
      else if (o.type === 'cypress') paintCypress(g, o);
    }
    paintTerrain(g, tx0, tx1);
    for (const o of this.decor) {
      const ox0 = o.x0 ?? o.x - 40, ox1 = o.x1 ?? o.x + 40;
      if (ox1 < tx0 - 2 || ox0 > tx1 + 2) continue;
      if (o.type === 'palmetto') paintPalmetto(g, o);
      else if (o.type === 'house') paintHouse(g, o.x, o.base);
      else if (o.type === 'snag') paintSnag(g, o.x, o.base);
    }
    paintBackRail(g, tx0, tx1);
    for (const o of this.decor) {
      const ox0 = o.x0 ?? o.x - 40, ox1 = o.x1 ?? o.x + 40;
      if (ox1 < tx0 - 2 || ox0 > tx1 + 2) continue;
      if (o.type === 'dock') paintDock(g, o.x0, o.x1, o.y);
      else if (o.type === 'boat') paintBoat(g, o.x, o.base);
      else if (o.type === 'log') paintLog(g, o.x, o.y, o.w);
    }
    this.tiles.set(key, c);
    while (this.tiles.size > 7) this.tiles.delete(this.tiles.keys().next().value);
    return c;
  }
  prewarm(x, S) {
    const i = Math.floor(x / TILE_W);
    for (const j of [i, i + 1, i - 1, i + 2, i - 2]) {
      if (j < 0 || j * TILE_W > WORLD_W) continue;
      if (!this.tiles.has(j + ':' + S)) { this.tile(j, S); return; }
    }
  }
  drawNear(ctx, ox, oy, W, S) {
    const i0 = Math.floor(ox / TILE_W), i1 = Math.floor((ox + W) / TILE_W);
    for (let i = i0; i <= i1; i++) {
      if (i < 0 || i * TILE_W > WORLD_W) continue;
      ctx.drawImage(this.tile(i, S), i * TILE_W - ox, YTOP - oy, TILE_W + 0.02, YBOT - YTOP);
    }
  }
  bakeLayers(viewW, S) {
    if (this.layers) return this.layers;
    const mk = (p, base, haze, dens, kinds) => {
      const w = WORLD_W * p + viewW + 80;
      const c = canvas(w * S, 200 * S), g = c.getContext('2d');
      g.scale(S, S);
      const r = rng(Math.round(p * 1000));
      g.fillStyle = mix('#3e5a3a', HAZE, haze); g.fillRect(0, base, w, 200 - base);
      for (let x = -20; x < w + 20; x += dens * (0.6 + r() * 0.8)) {
        if (kinds === 'far') {
          if (r() < 0.3) paintSabal(g, { x, base: base + 4, h: 26 + r() * 22, seed: (r() * 1e6) | 0, haze });
          else { const s = 9 + r() * 12; leafMass(g, x, base - s * 0.5, s, s * 0.6, OAK_GREENS, 0.9, r, haze); }
        } else {
          if (r() < 0.35) paintSabal(g, { x, base: base + 4, h: 32 + r() * 30, seed: (r() * 1e6) | 0, haze });
          else if (r() < 0.2) paintCypress(g, { x, base: base + 4, h: 50 + r() * 26, seed: (r() * 1e6) | 0, haze });
          else paintOak(g, { x, base: base + 4, h: 32 + r() * 24, seed: (r() * 1e6) | 0, haze });
        }
      }
      g.fillStyle = lin(g, 0, base - 40, 0, base + 10, [[0, rgba(HAZE, 0)], [1, rgba(HAZE, haze * 0.6)]]);
      g.fillRect(0, base - 40, w, 60);
      return { c, p, S };
    };
    this.layers = [mk(0.12, 74, 0.6, 9, 'far'), mk(0.42, 86, 0.32, 20, 'mid')];
    return this.layers;
  }
}

// ------------------------------------------------------------------ per-frame water, rail, mist
let _caustic = null;
function caustics() {
  if (_caustic) return _caustic;
  const c = canvas(160, 80), g = c.getContext('2d');
  const r = rng(9);
  g.strokeStyle = 'rgba(255,255,240,0.9)'; g.lineWidth = 1.2;
  for (let i = 0; i < 46; i++) {
    const x = r() * 160, y = r() * 80, s = 6 + r() * 12;
    g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 5; k++) g.quadraticCurveTo(x + (r() - 0.5) * s * 2, y + (r() - 0.5) * s, x + (r() - 0.5) * s * 2, y + (r() - 0.5) * s * 2);
    g.stroke();
  }
  _caustic = c;
  return c;
}

/** Water tint, caustics, surface sheen and the spring boil. Draw after underwater things. */
export function drawWater(ctx, ox, oy, W, H, t, sky) {
  const top = WATER_Y - oy;
  if (top > H) return;
  const bottom = H + 2;
  // clear spring water
  ctx.fillStyle = lin(ctx, 0, top, 0, top + 70, [[0, 'rgba(110,200,205,0.14)'], [0.45, 'rgba(50,150,175,0.28)'], [1, 'rgba(10,70,100,0.7)']]);
  ctx.fillRect(0, top, W, bottom - top);
  // tannin-dark river water fading into the clear run
  const rx0 = 560 - ox, rx1 = 760 - ox;
  if (rx0 > -10 || rx1 > 0) {
    const g = ctx.createLinearGradient(rx0, 0, rx1, 0);
    g.addColorStop(0, 'rgba(46,36,20,0.95)'); g.addColorStop(1, 'rgba(46,36,20,0)');
    ctx.fillStyle = g; ctx.fillRect(Math.min(0, rx0 - 600), top, Math.max(0, rx1) - Math.min(0, rx0 - 600), bottom - top);
  }
  // dancing caustic light on the bottom (only in clear water, only in daylight)
  const day = Math.max(0, 1 - sky.stars * 1.2);
  if (day > 0.05 && ox + W > 640) {
    const c = caustics();
    ctx.save();
    ctx.beginPath(); ctx.moveTo(Math.max(0, 700 - ox), bottom);
    for (let x = Math.max(0, 700 - ox); x <= W + 4; x += 4) ctx.lineTo(x, bottomY(x + ox) - oy - 3);
    ctx.lineTo(W + 4, bottom); ctx.closePath();
    ctx.clip();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.09 * day;
    const sc = 0.5;
    for (const [sx, sy] of [[t * 4, t * 1.5], [-t * 3, t * 2.2]]) {
      const px = ((-ox * 1 + sx) % (160 * sc) + 160 * sc) % (160 * sc) - 160 * sc;
      for (let x = px; x < W; x += 160 * sc) for (let y = top + 14 + ((sy % (80 * sc)) - 80 * sc); y < bottom; y += 80 * sc) ctx.drawImage(c, x, y, 160 * sc, 80 * sc);
    }
    ctx.restore();
  }
  // reflection band + surface sheen + ripples
  ctx.fillStyle = lin(ctx, 0, top, 0, top + 7, [[0, 'rgba(30,50,30,0.35)'], [1, 'rgba(30,50,30,0)']]);
  ctx.fillRect(0, top, W, 7);
  ctx.fillStyle = 'rgba(235,245,240,0.55)'; ctx.fillRect(0, top - 0.15, W, 0.35);
  ctx.strokeStyle = `rgba(240,250,250,${0.25 + day * 0.25})`; ctx.lineWidth = 0.22;
  ctx.beginPath();
  for (let i = 0; i < 40; i++) {
    const wx = ((i * 97.3 + t * (6 + (i % 5))) % (W + 60)) - 30;
    const wy = top + 1 + (i * 37 % 11) * 0.5;
    const l = 2 + (i % 4);
    ctx.moveTo(wx, wy); ctx.quadraticCurveTo(wx + l / 2, wy - 0.3, wx + l, wy);
  }
  ctx.stroke();
  // spring boil: water welling up in rings
  const bx = 3340 - ox;
  if (bx > -80 && bx < W + 80) {
    for (let k = 0; k < 4; k++) {
      const ph = (t * 0.35 + k / 4) % 1;
      ctx.strokeStyle = `rgba(230,250,250,${0.45 * (1 - ph)})`; ctx.lineWidth = 0.3;
      ctx.beginPath(); ctx.ellipse(bx, top + 0.4, 6 + ph * 40, 0.8 + ph * 1.5, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(200,240,240,0.18)'; ctx.beginPath(); ctx.ellipse(bx, top + 0.6, 10, 1.2, 0, 0, Math.PI * 2); ctx.fill();
  }
}

/** Front railing of the boardwalk, drawn in front of the walkers. */
export function drawFrontRail(ctx, ox, oy, W) {
  const a = Math.max(900, ox - 4), b = ox + W + 4;
  if (b <= a) return;
  const y = DECK_Y - oy;
  for (let x = Math.ceil(a / 16) * 16; x < b; x += 16) {
    ctx.fillStyle = lin(ctx, x - ox, 0, x - ox + 1.6, 0, [[0, '#b8aa96'], [1, '#6e6256']]);
    ctx.fillRect(x - ox, y - 10.5, 1.6, 13);
  }
  ctx.fillStyle = lin(ctx, 0, y - 11.2, 0, y - 9.6, [[0, '#c8baa6'], [1, '#7a6e60']]);
  ctx.fillRect(a - ox, y - 11.2, b - a, 1.6);
  ctx.fillStyle = '#8a7c6c'; ctx.fillRect(a - ox, y - 5.6, b - a, 0.9);
  ctx.fillStyle = lin(ctx, 0, y + 0.4, 0, y + 3.2, [[0, '#a89a86'], [1, '#5a4e42']]);
  ctx.fillRect(a - ox, y + 0.4, b - a, 2.8);
}

/** Low mist drifting over the water on cool mornings. */
export function drawMist(ctx, ox, oy, W, t, amount) {
  if (amount <= 0) return;
  const y = WATER_Y - oy;
  for (let i = 0; i < 10; i++) {
    const x = ((i * 83 - ox * 0.9 + t * (2 + i % 3)) % (W + 160) + W + 160) % (W + 160) - 80;
    const g = ctx.createRadialGradient(x, y - 1, 0, x, y - 1, 40);
    g.addColorStop(0, `rgba(240,244,246,${0.32 * amount})`); g.addColorStop(1, 'rgba(240,244,246,0)');
    ctx.fillStyle = g;
    ctx.save(); ctx.translate(x, y - 1); ctx.scale(1, 0.18); ctx.translate(-x, -(y - 1));
    ctx.beginPath(); ctx.arc(x, y - 1, 40, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
}
