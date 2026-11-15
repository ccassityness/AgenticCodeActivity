// The trail: ground profile, place names, and procedurally drawn pixel-art
// terrain baked into parallax layers at load time.
import { mix, shade, hexToRgb } from './sprites.js';

export const WORLD_W = 4900;
export const YTOP = -170;   // world y of the top of the near layer
export const YBOT = 380;    // world y of the bottom of the near layer

// Trail profile (x, ground y). Rim -> Queen's Garden -> Navajo Loop -> back up to the rim.
const PTS = [
  [0, 100], [760, 102], [820, 112], [880, 126], [940, 136], [1000, 150], [1060, 164], [1120, 174],
  [1180, 188], [1240, 196], [1300, 208], [1380, 218], [1500, 226], [1700, 223], [1900, 228],
  [2100, 225], [2300, 229], [2500, 226], [2700, 230], [2950, 228], [3050, 222], [3120, 208],
  [3200, 196], [3280, 182], [3360, 172], [3440, 156], [3520, 142], [3600, 126], [3680, 112],
  [3760, 102], [WORLD_W, 100],
];

export function groundY(x) {
  if (x <= PTS[0][0]) return PTS[0][1];
  for (let i = 1; i < PTS.length; i++) {
    const [x1, y1] = PTS[i];
    if (x <= x1) {
      const [x0, y0] = PTS[i - 1];
      const t = (x - x0) / (x1 - x0);
      const s = (1 - Math.cos(t * Math.PI)) / 2;
      return y0 + (y1 - y0) * s;
    }
  }
  return PTS[PTS.length - 1][1];
}

export const ZONES = [
  { x0: 0, x1: 300, name: 'Rim Trail', sub: 'Bryce Canyon National Park' },
  { x0: 300, x1: 500, name: 'Sunrise Point', sub: 'elev. about 8,000 ft' },
  { x0: 780, x1: 1550, name: "Queen's Garden Trail", sub: 'down into the amphitheater' },
  { x0: 1550, x1: 2150, name: "Queen's Garden", sub: '' },
  { x0: 2150, x1: 2540, name: 'Navajo Loop', sub: '' },
  { x0: 2540, x1: 2980, name: 'Wall Street', sub: 'a narrow slot canyon' },
  { x0: 2980, x1: 3700, name: "Thor's Hammer", sub: 'the climb back up' },
  { x0: 3700, x1: 4000, name: 'Sunset Point', sub: '' },
  { x0: 4000, x1: WORLD_W, name: 'Rim Trail', sub: 'toward Inspiration Point' },
];
export const zoneAt = x => ZONES.find(z => x >= z.x0 && x < z.x1);

// ---------- helpers ----------
export function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w); c.height = Math.ceil(h);
  return c;
}

// Claron Formation strata colours (pinks, oranges, creamy limestone whites)
const STRATA = ['#f3dcc4', '#e9a27a', '#d9764f', '#efc3a0', '#c8604a', '#e7a98c', '#f6e6d2', '#d88a63', '#e39572'];
const CAP = '#f1e6d4';

function bandColor(bands, y, jitter) {
  const i = Math.floor((y + 1000 + jitter) / 10) % bands.length;
  return bands[i];
}

/** A single hoodoo: stacked bulges and necks with a pale cap rock. */
function drawHoodoo(g, cx, baseY, w, h, r, bands, opts = {}) {
  const k = 2.2 + r() * 3.2, ph = r() * 6.28;
  const capH = Math.max(3, Math.round(h * (opts.capFrac ?? 0.1)));
  const neckH = Math.max(2, Math.round(h * 0.05));
  const capCol = opts.cap ?? CAP;
  const capShade = shade(capCol, -0.18);
  for (let y = 0; y < h; y++) {
    const ty = y / h;
    let half, col;
    if (y >= h - capH) {
      const cy = (y - (h - capH)) / capH;
      half = w * (opts.capW ?? 0.42) * Math.sqrt(Math.max(0.05, 1 - cy * cy * 0.85));
      col = capCol;
    } else if (y >= h - capH - neckH) {
      half = w * 0.2;
      col = bandColor(bands.base, baseY - y, 0);
    } else {
      half = w * 0.5 * (1 - 0.45 * ty) * (0.74 + 0.26 * Math.sin(ty * k * Math.PI + ph));
      col = bandColor(bands.base, baseY - y, 0);
    }
    half = Math.max(1, half);
    const wy = Math.round(baseY - y);
    const x0 = Math.round(cx - half), ww = Math.max(1, Math.round(half * 2));
    g.fillStyle = col;
    g.fillRect(x0, wy, ww, 1);
    // shadow side
    g.fillStyle = y >= h - capH ? capShade : bands.dark[STRATA_INDEX(bands, col)];
    const sw = Math.max(1, Math.round(ww * 0.32));
    g.fillRect(x0 + ww - sw, wy, sw, 1);
    // lit edge
    if (ww > 3) { g.fillStyle = bands.light[STRATA_INDEX(bands, col)] ?? capCol; g.fillRect(x0, wy, 1, 1); }
  }
}
function STRATA_INDEX(bands, col) {
  const i = bands.base.indexOf(col);
  return i < 0 ? 0 : i;
}
function makeBands(haze = 0, hazeCol = '#c9b8d8') {
  // soften the stripes a little toward a warm mid-tone so hoodoos don't look like candy canes
  const base = STRATA.map(c => mix(mix(c, '#e09a7a', 0.3), hazeCol, haze));
  return { base, dark: base.map(c => shade(c, -0.2)), light: base.map(c => shade(c, 0.18)) };
}

/** Ponderosa pine / fir */
function drawPine(g, x, baseY, h, r, kind = 'pine', haze = 0) {
  const hz = c => mix(c, '#c9b8d8', haze);
  const trunk = hz(kind === 'fir' ? '#5e3d2a' : '#8a4b2a');
  const dark = hz(kind === 'fir' ? '#23402f' : '#2f5d3a');
  const mid = hz(kind === 'fir' ? '#2f5a3e' : '#3f7a4a');
  g.fillStyle = trunk;
  g.fillRect(Math.round(x) - 1, Math.round(baseY - h), 2, Math.round(h));
  const crownStart = kind === 'fir' ? 0.18 : 0.38;
  for (let y = Math.round(h * crownStart); y < h; y++) {
    const ty = (y - h * crownStart) / (h * (1 - crownStart));
    let half = kind === 'fir'
      ? (1 - ty) * h * 0.2 + 1
      : (Math.sin(ty * Math.PI) * 0.6 + (1 - ty) * 0.4) * h * 0.17 + 1;
    half *= 0.8 + 0.4 * r();
    if (kind !== 'fir' && r() < 0.18) continue; // gaps between tufts
    const wy = Math.round(baseY - y);
    g.fillStyle = dark;
    g.fillRect(Math.round(x - half), wy, Math.round(half * 2), 1);
    g.fillStyle = mid;
    g.fillRect(Math.round(x - half), wy, Math.round(half * 0.8), 1);
  }
}

/** Twisted bristlecone pine, baked as its own little canvas (interactive object). */
export function makeBristlecone() {
  const c = canvas(34, 44), g = c.getContext('2d');
  const r = rng(77);
  // gnarled trunk
  const bark = ['#c9a27a', '#8a5a32', '#e3c9a0'];
  let x = 17;
  for (let y = 43; y > 14; y--) {
    x += Math.sin(y * 0.35) * 0.7;
    const w = 3 + Math.round((43 - y) < 6 ? 2 : 0) + (y % 7 === 0 ? 1 : 0);
    g.fillStyle = bark[0]; g.fillRect(Math.round(x - w / 2), y, w, 1);
    g.fillStyle = bark[1]; g.fillRect(Math.round(x + w / 2) - 1, y, 1, 1);
    if (y % 3 === 0) { g.fillStyle = bark[2]; g.fillRect(Math.round(x - w / 2), y, 1, 1); }
  }
  // branches
  const branches = [[17, 26, -1], [17, 20, 1], [18, 16, -1], [16, 32, 1]];
  for (const [bx, by, d] of branches) {
    for (let i = 0; i < 10; i++) {
      g.fillStyle = bark[1];
      g.fillRect(bx + d * i, by - Math.round(i * 0.6), 1, 1);
    }
    // bottlebrush tufts
    for (let t = 0; t < 14; t++) {
      g.fillStyle = r() < 0.5 ? '#2f5d3a' : '#4a7a50';
      g.fillRect(bx + d * (5 + Math.round(r() * 7)), by - 8 + Math.round(r() * 6), 2, 1);
    }
  }
  for (let t = 0; t < 22; t++) {
    g.fillStyle = r() < 0.5 ? '#2f5d3a' : '#4a7a50';
    g.fillRect(12 + Math.round(r() * 10), 6 + Math.round(r() * 10), 2, 1);
  }
  return c;
}

// ---------- background layers ----------
export const LAYERS = [
  // p = parallax factor, base = screen y of the layer's baseline when camY == 0
  { name: 'plateau', p: 0.06, base: 70 },
  { name: 'far', p: 0.22, base: 104 },
  { name: 'mid', p: 0.48, base: 140 },
];
const LAYER_H = 380, LAYER_BASE = 230;

function bakeLayer(def, viewW) {
  const w = WORLD_W * def.p + viewW + 40;
  const c = canvas(w, LAYER_H), g = c.getContext('2d');
  const B = LAYER_BASE;
  if (def.name === 'plateau') {
    const r = rng(11);
    // distant blue plateau with soft ridges
    const col = '#9aa0c8', col2 = '#b3b3d6';
    let y = B - 22;
    for (let x = 0; x < w; x++) {
      y += (r() - 0.5) * 1.2 + Math.sin(x / 90) * 0.15;
      y = Math.max(B - 40, Math.min(B - 8, y));
      g.fillStyle = col2; g.fillRect(x, Math.round(y) - 6, 1, 6);
      g.fillStyle = col; g.fillRect(x, Math.round(y), 1, LAYER_H);
    }
    return c;
  }
  const far = def.name === 'far';
  const bands = makeBands(far ? 0.5 : 0.22);
  const r = rng(far ? 21 : 33);
  const baseCol = mix('#d98a63', '#c9b8d8', far ? 0.55 : 0.28);
  // hoodoo forest
  let x = 0;
  while (x < w) {
    const hw = far ? 4 + r() * 7 : 7 + r() * 12;
    const hh = far ? 14 + r() * 46 : 26 + r() * 90;
    const bY = B + r() * 6;
    if (r() < 0.12) drawPine(g, x, bY - 2, far ? 10 + r() * 8 : 16 + r() * 18, r, 'pine', far ? 0.55 : 0.25);
    else drawHoodoo(g, x, bY, hw, hh, r, bands, { cap: mix(CAP, '#c9b8d8', far ? 0.5 : 0.2) });
    x += far ? 4 + r() * 9 : 9 + r() * 20;
  }
  // slope beneath the hoodoos
  for (let xx = 0; xx < w; xx++) {
    const top = Math.round(B + 2 + Math.sin(xx / 37) * 2 + Math.sin(xx / 13) * 1.2);
    for (let y = top; y < LAYER_H; y += 1) {
      g.fillStyle = bandColor(bands.base, y, Math.sin(xx / 23) * 2);
      g.fillRect(xx, y, 1, 1);
      if (y > top + 30) { g.fillStyle = baseCol; g.fillRect(xx, y, 1, LAYER_H - y); break; }
    }
  }
  return c;
}

// ---------- near layer (parallax 1) ----------
function bakeNear() {
  const H = YBOT - YTOP;
  const c = canvas(WORLD_W, H), g = c.getContext('2d');
  g.translate(0, -YTOP);
  const r = rng(5);
  const bands = makeBands(0);

  // Pines behind the trail on the rim (gaps at the viewpoints)
  const rimGap = x => (x > 320 && x < 490) || (x > 3740 && x < 3900);
  for (let x = 10; x < WORLD_W; x += 14 + r() * 30) {
    const onRim = x < 790 || x > 3720;
    if (onRim && !rimGap(x)) drawPine(g, x, groundY(x) + 2, 30 + r() * 34, r);
  }

  // Hoodoos behind the trail in the amphitheater
  for (let x = 800; x < 3720; x += 18 + r() * 34) {
    if (x > 2530 && x < 2990) continue; // Wall Street
    const depth = (groundY(x) - 100) / 130; // 0 at rim, 1 at floor
    if (depth < 0.08) continue;
    if (r() < 0.14) { drawPine(g, x, groundY(x) + 4, 24 + r() * 30, r); continue; }
    const h = 40 + depth * 90 + r() * 50;
    drawHoodoo(g, x, groundY(x) + 30, 9 + r() * 16, h, r, bands);
  }

  // Queen Victoria hoodoo (Queen's Garden)
  {
    const x = 1730, b = groundY(x) + 10;
    drawHoodoo(g, x, b, 22, 70, rng(1), bands, { capFrac: 0.05 });
    // the "queen": a pale rounded figure perched on top
    g.fillStyle = CAP;
    for (let y = 0; y < 14; y++) {
      const half = y < 6 ? 5 - y * 0.3 : 2.5 + Math.sin((y - 6) / 8 * Math.PI) * 1.8;
      g.fillRect(Math.round(x - half), b - 70 - y, Math.round(half * 2), 1);
    }
    g.fillStyle = shade(CAP, -0.18);
    for (let y = 0; y < 14; y++) g.fillRect(x + 1, b - 70 - y, 2, 1);
  }

  // Wall Street: towering back wall + Douglas firs reaching for light
  {
    const wallA = shade('#c8604a', -0.25), wallB = shade('#d9764f', -0.3), wallC = shade('#b8503c', -0.38);
    for (let x = 2530; x < 2990; x++) {
      const edge = Math.min(x - 2530, 2990 - x);
      const top = YTOP + Math.max(0, 40 - edge) * 2 + Math.round(Math.sin(x / 9) * 2);
      const gy = groundY(x) + 2;
      for (let y = top; y < gy; y++) {
        const n = Math.sin(x * 0.7 + y * 0.05) + Math.sin(x * 0.13);
        g.fillStyle = n > 1.1 ? wallC : (Math.floor((y + 1000) / 9) % 3 === 0 ? wallB : wallA);
        g.fillRect(x, y, 1, 1);
      }
    }
    for (const fx of [2610, 2700, 2790, 2880, 2945]) drawPine(g, fx, groundY(fx) + 2, 140 + r() * 40, r, 'fir');
  }

  // Thor's Hammer
  {
    const x = 3565, b = groundY(x) + 70;
    const colH = 118;
    for (let y = 0; y < colH; y++) {
      const half = 5 + Math.sin(y / 9) * 1.5 + (y < 20 ? (20 - y) * 0.4 : 0);
      g.fillStyle = bandColor(bands.base, b - y, 0);
      g.fillRect(Math.round(x - half), b - y, Math.round(half * 2), 1);
      g.fillStyle = bands.dark[STRATA_INDEX(bands, bandColor(bands.base, b - y, 0))];
      g.fillRect(Math.round(x + half * 0.3), b - y, Math.round(half * 0.7), 1);
    }
    // the hammer head
    g.fillStyle = CAP; g.fillRect(x - 9, b - colH - 9, 18, 9);
    g.fillStyle = shade(CAP, -0.2); g.fillRect(x + 3, b - colH - 9, 6, 9);
    g.fillStyle = shade(CAP, 0.2); g.fillRect(x - 9, b - colH - 9, 18, 1);
  }

  // Terrain cross-section (ImageData for speed)
  const tc = canvas(WORLD_W, H), tg = tc.getContext('2d');
  const img = tg.createImageData(WORLD_W, H);
  const d = img.data;
  const rgbStrata = bands.base.map(hexToRgb);
  const trail = hexToRgb('#e6c9a0'), trailD = hexToRgb('#c9a27a'), grass = hexToRgb('#8aa35a'), grassD = hexToRgb('#6b8a45');
  for (let x = 0; x < WORLD_W; x++) {
    const gy = Math.round(groundY(x));
    const onRim = x < 790 || x > 3720;
    const jitter = Math.sin(x / 31) * 3 + Math.sin(x / 7) * 0.8;
    for (let y = gy; y < YBOT; y++) {
      const idx = ((y - YTOP) * WORLD_W + x) * 4;
      let col;
      const dy = y - gy;
      if (dy < 2) col = onRim && (x * 7919) % 11 < 4 ? grass : trail;
      else if (dy < 3) col = onRim ? grassD : trailD;
      else {
        col = rgbStrata[Math.floor((y + 1000 + jitter) / 7) % rgbStrata.length];
        // darken with depth for a soft cross-section look
        const f = Math.max(0.55, 1 - (dy - 3) / 260);
        col = [col[0] * f, col[1] * f, col[2] * f];
        if (((x * 31 + y * 17) % 97) === 0) col = [col[0] * 0.8, col[1] * 0.8, col[2] * 0.8];
      }
      d[idx] = col[0]; d[idx + 1] = col[1]; d[idx + 2] = col[2]; d[idx + 3] = 255;
    }
  }
  tg.putImageData(img, 0, 0);
  g.drawImage(tc, 0, YTOP);

  // Pebbles and grass tufts on the surface
  for (let x = 0; x < WORLD_W; x += 3 + r() * 12) {
    const gy = Math.round(groundY(x));
    const onRim = x < 790 || x > 3720;
    if (onRim && r() < 0.6) {
      g.fillStyle = r() < 0.5 ? '#7a9a4a' : '#9ab86a';
      g.fillRect(Math.round(x), gy - 2, 1, 2); g.fillRect(Math.round(x) + 1, gy - 1, 1, 1);
    } else {
      g.fillStyle = r() < 0.5 ? '#b98a62' : '#f3dcc4';
      g.fillRect(Math.round(x), gy - 1, r() < 0.3 ? 2 : 1, 1);
    }
  }

  // Wooden rail fences at the viewpoints
  for (const [a, b] of [[330, 490], [3740, 3900]]) {
    for (let x = a; x <= b; x++) {
      const gy = Math.round(groundY(x));
      g.fillStyle = '#8a5a32';
      g.fillRect(x, gy - 9, 1, 1);
      g.fillRect(x, gy - 5, 1, 1);
      if ((x - a) % 20 === 0) { g.fillStyle = '#6e4a2c'; g.fillRect(x, gy - 11, 2, 11); }
    }
  }
  return c;
}

export function buildWorld(viewW) {
  return {
    near: bakeNear(),
    layers: LAYERS.map(def => ({ ...def, canvas: bakeLayer(def, viewW) })),
    layerBase: LAYER_BASE,
  };
}
