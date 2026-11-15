// Naturalistic figures drawn with layered, softly shaded shapes (no outlines), in world units.
// Light comes from the upper left. Figures face right (+x) and are mirrored for left.
import { shade, mix, rgba, ellipse, circle, lin, rad, canvas, rng } from './color.js';

const TAU = Math.PI * 2;

// ------------------------------------------------------------------ customization options
export const OPTIONS = {
  parent: {
    height: [['Short', 0.93], ['Average', 1], ['Tall', 1.07]],
    build: [['Slim', 0.88], ['Average', 1], ['Sturdy', 1.14]],
    skin: ['#f7dcc8', '#efc6a6', '#dca784', '#c48a62', '#a56d47', '#8a5634', '#6a4129', '#4a2e1e'],
    eyes: ['#4a3426', '#6a4a2a', '#3f6a8a', '#5a7a4a', '#7a6a5a'],
    hairStyle: [['Buzz', 'buzz'], ['Short', 'short'], ['Side part', 'sidepart'], ['Long', 'long'], ['Ponytail', 'ponytail'], ['Bun', 'bun'], ['Curly', 'curly'], ['Afro', 'afro'], ['Braids', 'braids'], ['Bald', 'bald']],
    hair: ['#1e1612', '#3a2618', '#6a4428', '#9a6a3a', '#c99a5a', '#e6c886', '#a8462a', '#8a8a88', '#d8d4ce'],
    facial: [['None', 'none'], ['Stubble', 'stubble'], ['Mustache', 'mustache'], ['Beard', 'beard']],
    glasses: [['None', 'none'], ['Round', 'round'], ['Square', 'square'], ['Sunglasses', 'sun']],
    freckles: [['No', false], ['Yes', true]],
    top: [['T-shirt', 'tee'], ['Tank top', 'tank'], ['Button shirt', 'button'], ['Hoodie', 'hoodie']],
    topColor: ['#3e6a96', '#c9584b', '#e8b04a', '#5e8f62', '#8a6ab0', '#f2ede2', '#2f3a44', '#d98aa0', '#4aa0a8'],
    bottom: [['Shorts', 'shorts'], ['Pants', 'pants'], ['Hiking skirt', 'skirt']],
    bottomColor: ['#5a6878', '#8a7454', '#3e4a3a', '#2b2f38', '#b8a888', '#6a4a3a'],
    shoes: [['Sneakers', 'sneakers'], ['Sandals', 'sandals'], ['Boots', 'boots']],
    shoeColor: ['#f2f0ea', '#5a3a24', '#2b2b30', '#4a7ab0', '#c9584b'],
    hat: [['None', 'none'], ['Cap', 'cap'], ['Sun hat', 'sun'], ['Visor', 'visor']],
    hatColor: ['#e8dcc0', '#3e6a96', '#c9584b', '#5e8f62', '#2f3a44'],
    pack: [['None', false], ['Daypack', true]],
    packColor: ['#a0522d', '#3e6a96', '#5e8f62', '#c9584b', '#4a4a50'],
  },
  baby: {
    skin: ['#f8e0cf', '#f0cbb0', '#ddab8a', '#c6906a', '#a6714e', '#87573a', '#6a432c', '#4e3222'],
    eyes: ['#4a3426', '#3f6a8a', '#5a7a4a', '#6a4a2a'],
    hairStyle: [['None', 'none'], ['Wisps', 'wisps'], ['Curls', 'curls'], ['Tuft', 'tuft']],
    hair: ['#2a1c14', '#5a3a22', '#9a6a3a', '#e0c07a', '#a8462a'],
    outfit: ['#f4c6d0', '#a8d0e8', '#f2e4a8', '#b8dcb0', '#d8c8ec', '#f6f0e6', '#f0b080'],
    pattern: [['Plain', 'plain'], ['Stripes', 'stripes'], ['Dots', 'dots'], ['Stars', 'stars']],
    hat: [['None', 'none'], ['Sun hat', 'sun'], ['Bucket', 'bucket'], ['Knit cap', 'knit']],
    hatColor: ['#f2e4b8', '#a8d0e8', '#f4c6d0', '#b8dcb0', '#f6f0e6'],
    paci: ['#7aa6d8', '#f08aa0', '#8ac88a', '#f2c14e', '#b08ad8'],
  },
  carrier: {
    type: [['Structured', 'structured'], ['Wrap', 'wrap'], ['Back frame', 'frame']],
    color: ['#3a7a78', '#c96a4a', '#6a8a5a', '#3a4a6a', '#d8b46a', '#8a5a8a', '#5a5a5e', '#e8d8c0'],
    pattern: [['Solid', 'solid'], ['Stripes', 'stripes'], ['Dots', 'dots'], ['Floral', 'floral'], ['Plaid', 'plaid']],
  },
};

const pick = a => a[(Math.random() * a.length) | 0];
const val = o => (Array.isArray(o) ? o[1] : o);
export function randomLook() {
  const P = OPTIONS.parent, B = OPTIONS.baby, C = OPTIONS.carrier;
  const p = {};
  for (const [k, list] of Object.entries(P)) p[k] = val(pick(list));
  if (Math.random() < 0.6) p.facial = 'none';
  if (Math.random() < 0.6) p.glasses = 'none';
  if (Math.random() < 0.5) p.hat = 'none';
  const b = {};
  for (const [k, list] of Object.entries(B)) b[k] = val(pick(list));
  const c = {};
  for (const [k, list] of Object.entries(C)) c[k] = val(pick(list));
  return { parent: p, baby: b, carrier: c };
}
export function defaultLook() {
  return {
    parent: { height: 1, build: 1, skin: '#dca784', eyes: '#4a3426', hairStyle: 'short', hair: '#3a2618', facial: 'none', glasses: 'none', freckles: false, top: 'tee', topColor: '#3e6a96', bottom: 'shorts', bottomColor: '#5a6878', shoes: 'sneakers', shoeColor: '#f2f0ea', hat: 'none', hatColor: '#e8dcc0', pack: false, packColor: '#a0522d' },
    baby: { skin: '#f0cbb0', eyes: '#4a3426', hairStyle: 'wisps', hair: '#5a3a22', outfit: '#a8d0e8', pattern: 'stripes', hat: 'sun', hatColor: '#f2e4b8', paci: '#7aa6d8' },
    carrier: { type: 'structured', color: '#3a7a78', pattern: 'solid' },
  };
}

// ------------------------------------------------------------------ fabric patterns
const _pat = {};
export function fabric(ctx, color, pattern, scale = 0.06) {
  if (!pattern || pattern === 'solid' || pattern === 'plain') return color;
  const key = color + pattern;
  if (!_pat[key]) {
    const c = canvas(40, 40), g = c.getContext('2d');
    g.fillStyle = color; g.fillRect(0, 0, 40, 40);
    const light = shade(color, 0.45), dark = shade(color, -0.3);
    if (pattern === 'stripes') { g.fillStyle = light; for (let y = 0; y < 40; y += 10) g.fillRect(0, y, 40, 4); }
    if (pattern === 'dots') { g.fillStyle = light; for (const [x, y] of [[8, 8], [28, 18], [12, 30], [32, 36]]) { g.beginPath(); g.arc(x, y, 3.2, 0, TAU); g.fill(); } }
    if (pattern === 'stars') { g.fillStyle = light; for (const [x, y] of [[10, 10], [30, 26]]) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? 2 : 5; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.fill(); } }
    if (pattern === 'floral') { for (const [x, y, col] of [[10, 10, light], [30, 28, '#f6e6c8'], [28, 6, shade(color, 0.25)], [8, 32, '#f6e6c8']]) { g.fillStyle = col; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(x + Math.cos(k * 1.256) * 3, y + Math.sin(k * 1.256) * 3, 2.4, 0, TAU); g.fill(); } g.fillStyle = '#e8b84a'; g.beginPath(); g.arc(x, y, 1.6, 0, TAU); g.fill(); } }
    if (pattern === 'plaid') { g.globalAlpha = 0.45; g.fillStyle = dark; g.fillRect(0, 12, 40, 8); g.fillRect(12, 0, 8, 40); g.fillStyle = light; g.fillRect(0, 32, 40, 2); g.fillRect(32, 0, 2, 40); g.globalAlpha = 1; }
    _pat[key] = c;
  }
  const p = ctx.createPattern(_pat[key], 'repeat');
  if (p.setTransform) p.setTransform(new DOMMatrix().scale(scale, scale));
  return p;
}

// ------------------------------------------------------------------ helpers
/** Tapered limb segment with a soft cylindrical shade. */
function seg(ctx, ax, ay, bx, by, wa, wb, col, lightAmt = 0.14, darkAmt = 0.22) {
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 0.001;
  const nx = -dy / L, ny = dx / L;
  if (typeof col === 'string') {
    const g = ctx.createLinearGradient(ax + nx * wa / 2, ay + ny * wa / 2, ax - nx * wa / 2, ay - ny * wa / 2);
    // the side facing up/left gets the light
    const litFirst = (nx * -0.6 + ny * -0.8) > 0;
    g.addColorStop(0, litFirst ? shade(col, lightAmt) : shade(col, -darkAmt));
    g.addColorStop(0.5, col);
    g.addColorStop(1, litFirst ? shade(col, -darkAmt) : shade(col, lightAmt));
    ctx.fillStyle = g;
  } else ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(ax + nx * wa / 2, ay + ny * wa / 2);
  ctx.lineTo(bx + nx * wb / 2, by + ny * wb / 2);
  ctx.arc(bx, by, wb / 2, Math.atan2(ny, nx), Math.atan2(ny, nx) + Math.PI, true);
  ctx.lineTo(ax - nx * wa / 2, ay - ny * wa / 2);
  ctx.arc(ax, ay, wa / 2, Math.atan2(-ny, -nx), Math.atan2(-ny, -nx) + Math.PI, true);
  ctx.fill();
}
export function shadowBlob(ctx, x, y, rx, a = 0.3) {
  ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.22);
  ctx.fillStyle = rad(ctx, 0, 0, 0, rx, [[0, `rgba(30,25,15,${a})`], [1, 'rgba(30,25,15,0)']]);
  circle(ctx, 0, 0, rx); ctx.fill(); ctx.restore();
}

// ------------------------------------------------------------------ BABY
/**
 * Infant head in 3/4 view. face: content | giggle | wow | sleepy | napping | fussy | crying
 * b: baby look ({skin, eyes, hairStyle, hair, hat, hatColor, paci}) plus state {hatOn, pacifier}
 */
export function drawBabyHead(ctx, cx, cy, r, face, b = {}, dir = 1) {
  const skin = b.skin || '#f0cbb0';
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(dir, 1);
  // head with chubby cheeks
  ctx.fillStyle = rad(ctx, -r * 0.3, -r * 0.35, r * 0.1, r * 1.25, [[0, shade(skin, 0.14)], [0.6, skin], [1, shade(skin, -0.14)]]);
  ctx.beginPath(); ctx.ellipse(0, 0, r, r * 1.02, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(r * 0.38, r * 0.42, r * 0.55, r * 0.45, 0, 0, TAU); ctx.fill();
  // ear
  ctx.fillStyle = shade(skin, -0.08); ctx.beginPath(); ctx.ellipse(-r * 0.55, r * 0.08, r * 0.17, r * 0.24, 0, 0, TAU); ctx.fill();
  // hair
  const hc = b.hair || '#5a3a22';
  if (b.hairStyle === 'wisps' || b.hairStyle === 'tuft') {
    ctx.strokeStyle = rgba(hc, 0.85); ctx.lineWidth = r * 0.06; ctx.lineCap = 'round';
    const n = b.hairStyle === 'tuft' ? 5 : 9;
    for (let i = 0; i < n; i++) {
      const a = Math.PI * (1.15 + i / n * 0.7);
      const sx = Math.cos(a) * r * 0.9, sy = Math.sin(a) * r * 0.95;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + r * 0.2, sy - r * (b.hairStyle === 'tuft' ? 0.5 : 0.25), sx + r * 0.32, sy - r * (b.hairStyle === 'tuft' ? 0.35 : 0.05)); ctx.stroke();
    }
    ctx.fillStyle = rgba(hc, 0.25); ctx.beginPath(); ctx.arc(0, 0, r * 0.98, Math.PI * 1.05, Math.PI * 1.95); ctx.quadraticCurveTo(0, -r * 0.55, -r * 0.95, -r * 0.1); ctx.fill();
  } else if (b.hairStyle === 'curls') {
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * (1.05 + i / 9 * 0.85);
      ctx.fillStyle = i % 2 ? hc : shade(hc, 0.15);
      circle(ctx, Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.86, r * 0.24); ctx.fill();
    }
  }
  // features (small and soft — a real baby face)
  const ex1 = r * 0.12, ex2 = r * 0.62, ey = r * 0.04;
  const eye = b.eyes || '#4a3426';
  const ink = '#2a1c16';
  ctx.lineCap = 'round';
  const openEyes = (s = 1) => {
    for (const ex of [ex1, ex2]) {
      ctx.fillStyle = '#fbf6f0'; ctx.beginPath(); ctx.ellipse(ex, ey, r * 0.13 * s, r * 0.1 * s, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = eye; circle(ctx, ex + r * 0.02, ey, r * 0.08 * s); ctx.fill();
      ctx.fillStyle = ink; circle(ctx, ex + r * 0.02, ey, r * 0.04 * s); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; circle(ctx, ex + r * 0.045, ey - r * 0.035, r * 0.02); ctx.fill();
    }
    ctx.strokeStyle = rgba(hc, 0.5); ctx.lineWidth = r * 0.035;
    for (const ex of [ex1, ex2]) { ctx.beginPath(); ctx.arc(ex, ey + r * 0.06, r * 0.17, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke(); }
  };
  const lids = (curveUp) => {
    ctx.strokeStyle = shade(skin, -0.45); ctx.lineWidth = r * 0.055;
    for (const ex of [ex1, ex2]) { ctx.beginPath(); ctx.arc(ex, ey + (curveUp ? r * 0.06 : -r * 0.04), r * 0.11, curveUp ? Math.PI * 1.15 : Math.PI * 0.15, curveUp ? Math.PI * 1.85 : Math.PI * 0.85); ctx.stroke(); }
  };
  const mx = r * 0.42, my = r * 0.52;
  const lip = shade(skin, -0.3);
  switch (face) {
    case 'giggle': lids(true); ctx.fillStyle = '#8a3a3a'; ctx.beginPath(); ctx.ellipse(mx, my, r * 0.15, r * 0.11, 0, 0, Math.PI); ctx.fill(); break;
    case 'wow': openEyes(1.15); ctx.fillStyle = '#8a3a3a'; ctx.beginPath(); ctx.ellipse(mx, my, r * 0.06, r * 0.08, 0, 0, TAU); ctx.fill(); break;
    case 'sleepy': ctx.strokeStyle = shade(skin, -0.45); ctx.lineWidth = r * 0.06; for (const ex of [ex1, ex2]) { ctx.beginPath(); ctx.moveTo(ex - r * 0.11, ey + r * 0.01); ctx.lineTo(ex + r * 0.11, ey + r * 0.01); ctx.stroke(); } ctx.fillStyle = '#8a3a3a'; ctx.beginPath(); ctx.ellipse(mx, my, r * 0.06, r * 0.07, 0, 0, TAU); ctx.fill(); break;
    case 'napping': lids(false); break;
    case 'fussy':
      openEyes(0.9);
      ctx.strokeStyle = lip; ctx.lineWidth = r * 0.05; ctx.beginPath(); ctx.arc(mx, my + r * 0.1, r * 0.1, Math.PI + 0.4, -0.4); ctx.stroke();
      ctx.fillStyle = 'rgba(160,210,240,0.85)'; ctx.beginPath(); ctx.ellipse(ex1, ey + r * 0.2, r * 0.035, r * 0.06, 0, 0, TAU); ctx.fill();
      break;
    case 'crying':
      ctx.strokeStyle = shade(skin, -0.45); ctx.lineWidth = r * 0.06;
      for (const ex of [ex1, ex2]) { ctx.beginPath(); ctx.moveTo(ex - r * 0.12, ey - r * 0.02); ctx.lineTo(ex, ey + r * 0.04); ctx.lineTo(ex + r * 0.12, ey - r * 0.02); ctx.stroke(); }
      ctx.fillStyle = '#7a2e2e'; ctx.beginPath(); ctx.ellipse(mx, my + r * 0.02, r * 0.17, r * 0.14, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(160,210,240,0.85)'; for (const ex of [ex1, ex2]) { ctx.beginPath(); ctx.ellipse(ex, ey + r * 0.24, r * 0.04, r * 0.09, 0, 0, TAU); ctx.fill(); }
      break;
    default:
      openEyes();
      ctx.strokeStyle = lip; ctx.lineWidth = r * 0.05; ctx.beginPath(); ctx.arc(mx, my - r * 0.06, r * 0.1, 0.3, Math.PI - 0.3); ctx.stroke();
  }
  // cheeks + nose
  ctx.fillStyle = 'rgba(235,130,120,0.18)'; circle(ctx, r * 0.02, r * 0.36, r * 0.2); ctx.fill(); circle(ctx, r * 0.74, r * 0.34, r * 0.15); ctx.fill();
  ctx.fillStyle = shade(skin, -0.08); ctx.beginPath(); ctx.ellipse(r * 0.47, r * 0.27, r * 0.08, r * 0.06, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; circle(ctx, r * 0.45, r * 0.24, r * 0.03); ctx.fill();
  if (b.pacifier && (face === 'napping' || face === 'content' || face === 'sleepy')) {
    ctx.fillStyle = b.paci || '#7aa6d8'; ctx.beginPath(); ctx.ellipse(mx, my, r * 0.2, r * 0.13, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = shade(b.paci || '#7aa6d8', 0.4); circle(ctx, mx, my, r * 0.06); ctx.fill();
  }
  // hats
  if (b.hatOn !== false && b.hat && b.hat !== 'none') {
    const c = b.hatColor || '#f2e4b8';
    if (b.hat === 'sun') {
      ctx.fillStyle = lin(ctx, 0, -r * 1.4, 0, -r * 0.3, [[0, shade(c, 0.15)], [1, shade(c, -0.1)]]);
      ctx.beginPath(); ctx.ellipse(r * 0.05, -r * 0.5, r * 1.6, r * 0.3, -0.05, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(-r * 0.02, -r * 0.55, r * 0.92, Math.PI, TAU); ctx.fill();
      ctx.fillStyle = shade(c, -0.2); ctx.fillRect(-r * 0.92, -r * 0.72, r * 1.84, r * 0.14);
    } else if (b.hat === 'bucket') {
      ctx.fillStyle = lin(ctx, 0, -r * 1.3, 0, -r * 0.2, [[0, shade(c, 0.12)], [1, shade(c, -0.12)]]);
      ctx.beginPath(); ctx.moveTo(-r * 1.25, -r * 0.25); ctx.lineTo(-r * 0.85, -r * 0.62); ctx.arc(0, -r * 0.58, r * 0.88, Math.PI, TAU); ctx.lineTo(r * 1.3, -r * 0.25); ctx.quadraticCurveTo(0, -r * 0.45, -r * 1.25, -r * 0.25); ctx.fill();
      ctx.strokeStyle = shade(c, -0.2); ctx.lineWidth = r * 0.04; ctx.beginPath(); ctx.moveTo(-r * 0.85, -r * 0.62); ctx.lineTo(r * 0.88, -r * 0.62); ctx.stroke();
    } else if (b.hat === 'knit') {
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, -r * 0.08, r * 1.04, Math.PI * 1.02, Math.PI * 1.98); ctx.fill();
      ctx.strokeStyle = shade(c, -0.15); ctx.lineWidth = r * 0.05;
      for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * r * 0.25, -r * 0.25); ctx.lineTo(i * r * 0.2, -r * 0.95); ctx.stroke(); }
      ctx.fillStyle = shade(c, -0.12); ctx.fillRect(-r * 1.0, -r * 0.32, r * 2.0, r * 0.2);
      ctx.fillStyle = shade(c, 0.3); circle(ctx, -r * 0.1, -r * 1.15, r * 0.24); ctx.fill();
    }
  }
  ctx.restore();
}

function babyLimbs(ctx, x, y, r, b, kick, posture = 'front') {
  const col = fabric(ctx, b.outfit || '#a8d0e8', b.pattern, 0.03);
  const skin = b.skin;
  const k = Math.sin(kick) * 0.5;
  // legs dangling below the carrier
  if (posture === 'front') {
    seg(ctx, x - r * 0.4, y + r * 3.0, x - r * 0.25 + k * 0.6, y + r * 4.1, r * 0.62, r * 0.5, col);
    seg(ctx, x + r * 0.4, y + r * 3.0, x + r * 0.65 - k * 0.6, y + r * 4.0, r * 0.62, r * 0.5, col);
    ctx.fillStyle = skin; circle(ctx, x - r * 0.25 + k * 0.6, y + r * 4.25, r * 0.28); ctx.fill(); circle(ctx, x + r * 0.65 - k * 0.6, y + r * 4.15, r * 0.28); ctx.fill();
  }
  // arms resting on the carrier edge
  seg(ctx, x - r * 0.6, y + r * 1.35, x - r * 0.95, y + r * 2.1 + k * 0.2, r * 0.5, r * 0.42, col);
  seg(ctx, x + r * 0.6, y + r * 1.35, x + r * 1.05, y + r * 2.0 - k * 0.2, r * 0.5, r * 0.42, col);
  ctx.fillStyle = skin; circle(ctx, x - r * 0.95, y + r * 2.2 + k * 0.2, r * 0.24); ctx.fill(); circle(ctx, x + r * 1.05, y + r * 2.1 - k * 0.2, r * 0.24); ctx.fill();
}

// ------------------------------------------------------------------ PEOPLE
/**
 * p: parent look (OPTIONS.parent keys). pose: {dir, state: idle|walk|sit|rock|bounce|feed, phase, t,
 *   baby: {look, face, hatOn, blanket, pacifier}, carrier: {type, color, pattern}, babyPos: 'front'|'back', holding}
 */
export function drawHuman(ctx, x, y, p, pose = {}) {
  const dir = pose.dir ?? 1, st = pose.state || 'idle', t = pose.t || 0;
  const H = p.height || 1, B = p.build || 1;
  const kid = p.kid ? 0.62 : 1;
  const T = 7.5 * H, C = 7.1 * H;
  const skin = p.skin;
  const topC = p.topColor || '#3e6a96', botC = p.bottomColor || '#5a6878';
  const shoe = p.shoeColor || '#f2f0ea';

  // legs
  let thA = 0.04, thB = -0.05, knA = 0.06, knB = 0.06, lean = 0.02;
  if (st === 'walk') {
    const ph = pose.phase || 0;
    thA = 0.4 * Math.sin(ph); thB = -thA;
    knA = 0.08 + 0.7 * Math.max(0, Math.cos(ph)); knB = 0.08 + 0.7 * Math.max(0, -Math.cos(ph));
    lean = 0.04;
  } else if (st === 'sit') { thA = thB = Math.PI / 2 - 0.05; knA = knB = Math.PI / 2 - 0.08; lean = -0.03; }
  const legPts = (th, kn) => {
    const kx = Math.sin(th) * T, ky = Math.cos(th) * T, sh = th - kn;
    return { kx, ky, ax: kx + Math.sin(sh) * C, ay: ky + Math.cos(sh) * C };
  };
  const la = legPts(thA, knA), lb = legPts(thB, knB);
  let hipY = -Math.max(la.ay, lb.ay) - 1.1 * H;
  if (st === 'sit') hipY = -8.2;
  let bob = 0;
  if (st === 'bounce') bob = Math.abs(Math.sin(t * 8)) * 1.3;
  if (st === 'idle') bob = Math.sin(t * 1.8) * 0.12;

  ctx.save();
  ctx.translate(x, y);
  shadowBlob(ctx, 0, 0, 7.5 * kid);
  ctx.scale(dir * kid, kid);
  ctx.translate(0, hipY - bob);
  const sway = st === 'rock' ? Math.sin(t * 4.5) * 0.06 : 0;
  ctx.rotate(lean + sway);

  const torsoL = 9.8 * H;
  const shY = -torsoL;
  const chest = 2.3 * B, back = 1.9 * B;
  const babyFront = pose.baby && pose.babyPos === 'front';
  const babyBack = pose.baby && pose.babyPos === 'back';

  // ---- leg drawing ----
  const drawLeg = (l, isBack) => {
    const dim = isBack ? -0.12 : 0;
    const legSkin = shade(skin, dim);
    const pants = shade(botC, dim);
    if (p.bottom === 'pants') {
      seg(ctx, 0, 0, l.kx, l.ky, 3.5 * B, 2.8 * B, pants);
      seg(ctx, l.kx, l.ky, l.ax, l.ay - 0.4, 2.8 * B, 2.3 * B, pants);
    } else {
      seg(ctx, 0, 0, l.kx, l.ky, 3.2 * B, 2.3 * B, legSkin);
      seg(ctx, l.kx, l.ky, l.ax, l.ay, 2.3 * B, 1.5 * B, legSkin);
      if (p.bottom === 'shorts') seg(ctx, 0, 0, l.kx * 0.62, l.ky * 0.62, 3.9 * B, 3.4 * B, pants);
    }
    // footwear
    ctx.save(); ctx.translate(l.ax, l.ay);
    const ang = st === 'sit' ? 0 : Math.max(-0.4, Math.min(0.45, (l.ax - l.kx) * 0.05));
    ctx.rotate(ang);
    const sc = shade(shoe, dim);
    if (p.shoes === 'sandals') {
      ctx.fillStyle = legSkin; ctx.beginPath(); ctx.ellipse(1.1, -0.4, 1.9, 0.75, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#6a4a32'; ctx.fillRect(-0.9, 0.2, 4.0, 0.5);
      ctx.fillStyle = sc; ctx.fillRect(0, -0.9, 0.5, 1.1); ctx.fillRect(1.6, -0.8, 0.5, 1.0);
    } else {
      const tall = p.shoes === 'boots' ? 2.4 : 1.2;
      ctx.fillStyle = lin(ctx, 0, -tall, 0, 0.6, [[0, shade(sc, 0.1)], [1, shade(sc, -0.15)]]);
      ctx.beginPath(); ctx.moveTo(-1.0, -tall); ctx.lineTo(0.9, -tall); ctx.lineTo(1.2, -0.9); ctx.quadraticCurveTo(3.3, -0.8, 3.2, 0.3); ctx.lineTo(-1.1, 0.3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = p.shoes === 'boots' ? '#3a2a1e' : '#e8e4dc'; ctx.fillRect(-1.1, 0.05, 4.35, 0.55);
      if (p.shoes === 'sneakers') { ctx.strokeStyle = shade(sc, -0.3); ctx.lineWidth = 0.15; ctx.beginPath(); ctx.moveTo(0.4, -1.0); ctx.lineTo(1.4, -0.7); ctx.stroke(); }
    }
    ctx.restore();
  };

  // ---- arms ----
  const ph = pose.phase || 0;
  let uaA = 0.12, faA = -0.25, uaB = -0.1, faB = -0.22;
  if (st === 'walk') { uaA = -0.38 * Math.sin(ph); uaB = 0.38 * Math.sin(ph); faA = faB = -0.35; }
  if (babyFront) { uaA = 0.5; faA = -1.65; }
  if (st === 'rock') { uaA = 0.62; faA = -1.75; uaB = 0.5; faB = -1.6; }
  if (st === 'feed') { uaA = 0.85; faA = -1.95; }
  if (pose.holding === 'camera' || pose.holding === 'binoculars') { uaA = 1.15; faA = -2.25; uaB = 1.0; faB = -2.2; }
  if (st === 'sit') { uaA = 0.45; faA = -0.7; uaB = 0.35; faB = -0.6; }
  const UA = 5.4 * H, FA = 4.9 * H;
  const sleeve = p.top === 'hoodie' ? 1 : p.top === 'button' ? 0.62 : p.top === 'tee' ? 0.48 : 0;
  const arm = (ua, fa, isBack) => {
    const dim = isBack ? -0.12 : 0;
    const sx = isBack ? -0.3 : 0.5, sy = shY + 1.3;
    const ex = sx + Math.sin(ua) * UA, ey = sy + Math.cos(ua) * UA;
    const hx = ex + Math.sin(ua - fa) * FA, hy = ey + Math.cos(ua - fa) * FA;
    const sk = shade(skin, dim), cl = shade(topC, dim);
    seg(ctx, sx, sy, ex, ey, 2.4 * B, 1.9 * B, sk);
    seg(ctx, ex, ey, hx, hy, 1.9 * B, 1.45 * B, sleeve >= 1 ? cl : sk);
    if (sleeve > 0) seg(ctx, sx, sy, sx + (ex - sx) * Math.min(1, sleeve * 1.6), sy + (ey - sy) * Math.min(1, sleeve * 1.6), 2.9 * B, 2.6 * B, cl);
    // hand
    ctx.fillStyle = sk; ctx.beginPath(); ctx.ellipse(hx, hy + 0.3, 0.85, 1.05, ua - fa, 0, TAU); ctx.fill();
    return { hx, hy };
  };

  // ---- behind the body ----
  if (p.pack && !babyBack) {
    const pc = p.packColor || '#a0522d';
    ctx.fillStyle = lin(ctx, -back - 3.6, 0, -back, 0, [[0, shade(pc, -0.2)], [1, shade(pc, 0.08)]]);
    ctx.beginPath(); ctx.roundRect(-back - 3.4, shY + 1.0, 3.8, 7.6, 1.4); ctx.fill();
    ctx.fillStyle = shade(pc, -0.3); ctx.fillRect(-back - 3.2, shY + 4.6, 3.4, 0.35);
  }
  const car = pose.carrier || {};
  if (babyBack) {
    const cc = fabric(ctx, car.color || '#3a7a78', car.pattern);
    if (car.type === 'frame') {
      ctx.strokeStyle = '#8a8a90'; ctx.lineWidth = 0.55;
      ctx.beginPath(); ctx.moveTo(-back + 0.2, -0.5); ctx.lineTo(-back - 4.6, -0.5); ctx.lineTo(-back - 4.4, shY - 3.6); ctx.stroke();
      ctx.fillStyle = cc; ctx.beginPath(); ctx.moveTo(-back - 4.8, shY - 5.6); ctx.quadraticCurveTo(-back - 2, shY - 7.4, -back + 0.6, shY - 4.6); ctx.lineTo(-back - 4.6, shY - 4.4); ctx.fill();
    }
    ctx.fillStyle = cc; ctx.beginPath(); ctx.roundRect(-back - 5.4, shY + 0.4, 5.8, 8.2, 2.2); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(-back - 5.4, shY + 6.5, 5.8, 1.2);
    babyLimbs(ctx, -back - 2.5, shY - 3.4, 1.0, pose.baby.look, t * 3, 'back');
    drawBabyHead(ctx, -back - 2.4, shY - 2.6, 2.3, pose.baby.face, { ...pose.baby.look, hatOn: pose.baby.hatOn, pacifier: pose.baby.pacifier }, 1);
  }

  arm(uaB, faB, true);
  drawLeg(lb, true);

  // ---- torso ----
  ctx.fillStyle = shade(skin, -0.08); ctx.beginPath(); ctx.roundRect(-0.6, shY - 1.9 * H, 1.9, 2.4 * H, 0.6); ctx.fill();   // neck
  const torsoPath = () => {
    ctx.beginPath();
    ctx.moveTo(-back, 0.3);
    ctx.bezierCurveTo(-back - 0.6, -torsoL * 0.4, -back - 0.4, -torsoL * 0.8, -back * 0.7, shY + 0.2);
    ctx.quadraticCurveTo(0.2, shY - 0.8, chest * 0.75, shY + 0.4);
    ctx.bezierCurveTo(chest + 0.4, shY + 2.5, chest + 0.2, -torsoL * 0.45, chest * 0.85, -torsoL * 0.2);
    ctx.quadraticCurveTo(chest * 0.95, 0, chest * 0.8, 0.3);
    ctx.closePath();
  };
  // skin under tank tops
  if (p.top === 'tank') { ctx.fillStyle = skin; torsoPath(); ctx.fill(); }
  const topFill = lin(ctx, -back, shY, chest, 0, [[0, shade(topC, 0.1)], [0.6, topC], [1, shade(topC, -0.2)]]);
  ctx.fillStyle = topFill;
  if (p.top === 'tank') { ctx.save(); torsoPath(); ctx.clip(); ctx.fillRect(-back - 2, shY + 1.4, back + chest + 4, torsoL); ctx.fillRect(-0.8, shY - 1, 1.2, 3); ctx.restore(); }
  else { torsoPath(); ctx.fill(); }
  // cloth folds
  ctx.strokeStyle = rgba(shade(topC, -0.35), 0.35); ctx.lineWidth = 0.18;
  ctx.beginPath(); ctx.moveTo(chest * 0.2, -torsoL * 0.45); ctx.quadraticCurveTo(chest * 0.6, -torsoL * 0.35, chest * 0.7, -torsoL * 0.2); ctx.stroke();
  if (p.top === 'button') {
    ctx.strokeStyle = rgba(shade(topC, -0.4), 0.6); ctx.beginPath(); ctx.moveTo(chest * 0.82, shY + 1); ctx.lineTo(chest * 0.86, -0.4); ctx.stroke();
    ctx.fillStyle = shade(topC, 0.2); ctx.beginPath(); ctx.moveTo(0, shY - 0.6); ctx.lineTo(1.6, shY + 0.8); ctx.lineTo(0.7, shY + 0.1); ctx.fill();
  }
  if (p.top === 'hoodie') { ctx.fillStyle = shade(topC, -0.08); ctx.beginPath(); ctx.ellipse(-back * 0.7, shY - 0.2, 1.9, 1.3, -0.4, 0, TAU); ctx.fill(); }
  // waistband / skirt
  if (p.bottom === 'skirt') {
    const kxF = Math.max(la.kx, lb.kx), kxB = Math.min(la.kx, lb.kx);
    ctx.fillStyle = lin(ctx, 0, 0, 0, T, [[0, botC], [1, shade(botC, -0.18)]]);
    ctx.beginPath(); ctx.moveTo(-back, -0.4); ctx.lineTo(chest * 0.85, -0.4); ctx.lineTo(Math.max(chest + 0.6, kxF + 1.6), T * 0.62); ctx.lineTo(Math.min(-back - 0.8, kxB - 1.6), T * 0.62); ctx.closePath(); ctx.fill();
  } else {
    ctx.fillStyle = shade(botC, -0.05); ctx.beginPath(); ctx.roundRect(-back - 0.1, -0.9, back + chest * 0.85 + 0.2, 1.8, 0.6); ctx.fill();
  }
  if (p.pack && !babyBack) { ctx.strokeStyle = shade(p.packColor || '#a0522d', -0.25); ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(-0.4, shY + 0.3); ctx.quadraticCurveTo(0.8, shY + 3, 0.2, shY + 6.5); ctx.stroke(); }
  if (p.ranger) { ctx.fillStyle = '#d8b040'; ctx.beginPath(); ctx.ellipse(chest * 0.5, shY + 2.4, 0.45, 0.55, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#5a4a2a'; ctx.fillRect(-back, -0.8, back + chest * 0.85, 0.7); }

  // ---- head ----
  const hR = 1.85 * H, hcx = 0.55, hcy = shY - 2.1 * H - hR * 0.95;
  const hair = p.hair || '#3a2618';
  const hairFill = (y0, y1) => lin(ctx, 0, y0, 0, y1, [[0, shade(hair, 0.15)], [1, shade(hair, -0.15)]]);
  const hairTexture = (n, len, spread) => {
    ctx.strokeStyle = rgba(shade(hair, 0.3), 0.35); ctx.lineWidth = 0.1;
    const r = rng(7);
    for (let i = 0; i < n; i++) { const a = Math.PI * (1.1 + r() * 0.8); const sx = hcx + Math.cos(a) * hR * 0.9, sy = hcy + Math.sin(a) * hR * 0.95; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx - spread, sy + len * 0.5, sx - spread * 1.4, sy + len); ctx.stroke(); }
  };
  const style = p.hairStyle;
  // hair behind the head
  if (style === 'long' || style === 'braids') {
    ctx.fillStyle = hairFill(hcy - hR, shY + 6);
    if (style === 'long') { ctx.beginPath(); ctx.moveTo(hcx - hR * 0.9, hcy - hR * 0.2); ctx.bezierCurveTo(hcx - hR * 1.6, hcy + hR * 1.5, hcx - hR * 1.9, shY + 4, hcx - hR * 1.3, shY + 6.2); ctx.lineTo(hcx - hR * 0.1, shY + 4.2); ctx.quadraticCurveTo(hcx + hR * 0.1, hcy + hR, hcx + hR * 0.2, hcy - hR * 0.6); ctx.fill(); }
    else for (let i = 0; i < 3; i++) { for (let k = 0; k < 6; k++) { ctx.fillStyle = k % 2 ? hair : shade(hair, 0.18); ctx.beginPath(); ctx.ellipse(hcx - hR * 0.8 - i * 0.55, hcy + hR * 0.4 + k * 1.15, 0.45, 0.7, 0.2, 0, TAU); ctx.fill(); } }
  }
  if (style === 'afro') { ctx.fillStyle = rad(ctx, hcx - 0.6, hcy - 1, 0.5, hR * 1.9, [[0, shade(hair, 0.12)], [1, shade(hair, -0.12)]]); circle(ctx, hcx - hR * 0.3, hcy - hR * 0.35, hR * 1.62); ctx.fill(); }
  // skull + face
  ctx.fillStyle = rad(ctx, hcx - hR * 0.35, hcy - hR * 0.45, hR * 0.15, hR * 1.45, [[0, shade(skin, 0.13)], [0.65, skin], [1, shade(skin, -0.16)]]);
  ctx.beginPath(); ctx.ellipse(hcx, hcy, hR * 0.95, hR, 0, 0, TAU); ctx.fill();
  // jaw + chin
  ctx.beginPath(); ctx.moveTo(hcx - hR * 0.5, hcy + hR * 0.4); ctx.quadraticCurveTo(hcx + hR * 0.2, hcy + hR * 1.25, hcx + hR * 0.82, hcy + hR * 0.95); ctx.quadraticCurveTo(hcx + hR * 1.0, hcy + hR * 0.55, hcx + hR * 0.9, hcy + hR * 0.2); ctx.fill();
  // nose
  ctx.fillStyle = shade(skin, -0.05);
  ctx.beginPath(); ctx.moveTo(hcx + hR * 0.86, hcy - hR * 0.15); ctx.quadraticCurveTo(hcx + hR * 1.22, hcy + hR * 0.32, hcx + hR * 0.95, hcy + hR * 0.42); ctx.lineTo(hcx + hR * 0.82, hcy + hR * 0.38); ctx.fill();
  // ear
  ctx.fillStyle = shade(skin, -0.1); ctx.beginPath(); ctx.ellipse(hcx - hR * 0.18, hcy + hR * 0.1, hR * 0.2, hR * 0.3, 0.15, 0, TAU); ctx.fill();
  // eye, brow, lips
  const ex = hcx + hR * 0.58, ey = hcy - hR * 0.05;
  if (p.glasses !== 'sun') {
    ctx.fillStyle = '#f6f0ea'; ctx.beginPath(); ctx.ellipse(ex, ey, hR * 0.17, hR * 0.1, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = p.eyes || '#4a3426'; circle(ctx, ex + hR * 0.06, ey, hR * 0.085); ctx.fill();
    ctx.fillStyle = '#1e1612'; circle(ctx, ex + hR * 0.07, ey, hR * 0.04); ctx.fill();
  }
  ctx.strokeStyle = rgba(shade(hair, -0.1), 0.85); ctx.lineWidth = hR * 0.09; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(ex - hR * 0.2, ey - hR * 0.25); ctx.quadraticCurveTo(ex, ey - hR * 0.33, ex + hR * 0.2, ey - hR * 0.26); ctx.stroke();
  ctx.strokeStyle = shade(skin, -0.32); ctx.lineWidth = hR * 0.07;
  ctx.beginPath(); ctx.moveTo(hcx + hR * 0.62, hcy + hR * 0.68); ctx.quadraticCurveTo(hcx + hR * 0.76, hcy + hR * 0.74, hcx + hR * 0.88, hcy + hR * 0.66); ctx.stroke();
  ctx.fillStyle = 'rgba(220,120,110,0.14)'; circle(ctx, hcx + hR * 0.42, hcy + hR * 0.38, hR * 0.28); ctx.fill();
  if (p.freckles) { ctx.fillStyle = rgba(shade(skin, -0.35), 0.6); const r = rng(3); for (let i = 0; i < 8; i++) { circle(ctx, hcx + hR * (0.3 + r() * 0.5), hcy + hR * (0.15 + r() * 0.3), hR * 0.035); ctx.fill(); } }
  // facial hair
  if (p.facial === 'stubble') { ctx.fillStyle = rgba(hair, 0.28); ctx.beginPath(); ctx.moveTo(hcx - hR * 0.3, hcy + hR * 0.35); ctx.quadraticCurveTo(hcx + hR * 0.2, hcy + hR * 1.25, hcx + hR * 0.85, hcy + hR * 0.95); ctx.lineTo(hcx + hR * 0.9, hcy + hR * 0.5); ctx.quadraticCurveTo(hcx + hR * 0.3, hcy + hR * 0.6, hcx - hR * 0.3, hcy + hR * 0.35); ctx.fill(); }
  if (p.facial === 'mustache' || p.facial === 'beard') { ctx.fillStyle = hair; ctx.beginPath(); ctx.ellipse(hcx + hR * 0.78, hcy + hR * 0.55, hR * 0.24, hR * 0.09, -0.15, 0, TAU); ctx.fill(); }
  if (p.facial === 'beard') { ctx.fillStyle = hairFill(hcy, hcy + hR * 1.4); ctx.beginPath(); ctx.moveTo(hcx - hR * 0.35, hcy + hR * 0.2); ctx.quadraticCurveTo(hcx - hR * 0.1, hcy + hR * 1.45, hcx + hR * 0.7, hcy + hR * 1.15); ctx.quadraticCurveTo(hcx + hR * 1.0, hcy + hR * 0.85, hcx + hR * 0.9, hcy + hR * 0.62); ctx.quadraticCurveTo(hcx + hR * 0.6, hcy + hR * 0.82, hcx + hR * 0.4, hcy + hR * 0.6); ctx.quadraticCurveTo(hcx + hR * 0.1, hcy + hR * 0.5, hcx - hR * 0.35, hcy + hR * 0.2); ctx.fill(); }
  // hair on top
  if (style !== 'bald' && style !== 'afro') {
    ctx.fillStyle = hairFill(hcy - hR * 1.2, hcy + hR * 0.4);
    const R = hR * (style === 'buzz' ? 1.0 : style === 'curly' ? 1.15 : 1.06);
    if (style === 'curly') {
      const r = rng(11);
      for (let i = 0; i < 14; i++) { const a = Math.PI * (0.85 + i / 14 * 1.15); ctx.fillStyle = i % 2 ? hair : shade(hair, 0.12); circle(ctx, hcx + Math.cos(a) * hR * 0.88, hcy + Math.sin(a) * hR * 0.9, hR * (0.32 + r() * 0.1)); ctx.fill(); }
    } else {
      ctx.beginPath();
      ctx.arc(hcx, hcy, R, Math.PI * (style === 'buzz' ? 0.92 : 0.8), Math.PI * 1.9);
      const fringe = style === 'sidepart' ? 0.42 : style === 'buzz' ? 0.15 : 0.3;
      ctx.quadraticCurveTo(hcx + hR * 0.9, hcy - hR * fringe, hcx + hR * 0.62, hcy - hR * (fringe + 0.08));
      ctx.quadraticCurveTo(hcx + hR * 0.1, hcy - hR * 0.45, hcx - hR * 0.2, hcy - hR * 0.1);
      ctx.quadraticCurveTo(hcx - hR * 0.5, hcy + hR * 0.3, hcx - R * 0.8, hcy + hR * (style === 'buzz' ? 0.3 : 0.55));
      ctx.fill();
      if (style === 'buzz') { ctx.fillStyle = 'rgba(0,0,0,0)'; }
      hairTexture(style === 'buzz' ? 0 : 16, hR * 0.6, 0.15);
    }
    if (style === 'ponytail') { const sw = Math.sin(t * 3) * 0.25; ctx.fillStyle = hairFill(hcy - hR, hcy + hR * 2.5); ctx.beginPath(); ctx.moveTo(hcx - hR * 0.85, hcy - hR * 0.45); ctx.quadraticCurveTo(hcx - hR * 2.0, hcy + hR * 0.3 + sw, hcx - hR * 1.4 + sw, hcy + hR * 2.4); ctx.quadraticCurveTo(hcx - hR * 1.3, hcy + hR * 0.4, hcx - hR * 0.7, hcy - hR * 0.1); ctx.fill(); ctx.fillStyle = shade(hair, -0.3); circle(ctx, hcx - hR * 0.95, hcy - hR * 0.32, hR * 0.15); ctx.fill(); }
    if (style === 'bun') { ctx.fillStyle = rad(ctx, hcx - hR * 0.8, hcy - hR * 1.05, 0, hR * 0.6, [[0, shade(hair, 0.15)], [1, shade(hair, -0.12)]]); circle(ctx, hcx - hR * 0.72, hcy - hR * 0.9, hR * 0.52); ctx.fill(); }
  }
  if (style === 'afro') { ctx.fillStyle = rgba(shade(hair, 0.2), 0.3); const r = rng(5); for (let i = 0; i < 30; i++) { circle(ctx, hcx - hR * 0.3 + (r() - 0.5) * hR * 2.8, hcy - hR * 0.35 + (r() - 0.6) * hR * 2.4, 0.18); ctx.fill(); } }
  // glasses
  if (p.glasses && p.glasses !== 'none') {
    ctx.strokeStyle = '#2a2a30'; ctx.lineWidth = 0.18;
    ctx.fillStyle = p.glasses === 'sun' ? 'rgba(25,30,40,0.88)' : 'rgba(220,235,245,0.18)';
    ctx.beginPath();
    if (p.glasses === 'square') ctx.roundRect(ex - hR * 0.26, ey - hR * 0.2, hR * 0.55, hR * 0.38, 0.15);
    else ctx.ellipse(ex + hR * 0.02, ey, hR * 0.28, hR * 0.22, 0, 0, TAU);
    ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ex - hR * 0.26, ey - hR * 0.05); ctx.lineTo(hcx - hR * 0.2, hcy - hR * 0.05); ctx.stroke();
  }
  // hats
  const hc = p.hatColor || '#e8dcc0';
  if (p.hat === 'cap' || p.hat === 'ranger') {
    if (p.hat === 'ranger') {
      ctx.fillStyle = shade('#8a6a3a', -0.1); ctx.beginPath(); ctx.ellipse(hcx, hcy - hR * 0.72, hR * 1.75, hR * 0.24, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = lin(ctx, hcx - hR, 0, hcx + hR, 0, [[0, '#a8844a'], [1, '#6e5228']]);
      ctx.beginPath(); ctx.moveTo(hcx - hR * 0.85, hcy - hR * 0.75); ctx.lineTo(hcx - hR * 0.55, hcy - hR * 1.65); ctx.lineTo(hcx, hcy - hR * 1.42); ctx.lineTo(hcx + hR * 0.55, hcy - hR * 1.65); ctx.lineTo(hcx + hR * 0.85, hcy - hR * 0.75); ctx.fill();
      ctx.fillStyle = '#3a2a1a'; ctx.fillRect(hcx - hR * 0.85, hcy - hR * 0.98, hR * 1.7, hR * 0.2);
    } else {
      ctx.fillStyle = lin(ctx, 0, hcy - hR * 1.2, 0, hcy, [[0, shade(hc, 0.15)], [1, shade(hc, -0.1)]]);
      ctx.beginPath(); ctx.arc(hcx, hcy - hR * 0.12, hR * 1.06, Math.PI * 1.02, Math.PI * 1.98); ctx.fill();
      ctx.fillStyle = shade(hc, -0.18); ctx.beginPath(); ctx.ellipse(hcx + hR * 1.08, hcy - hR * 0.28, hR * 0.72, hR * 0.13, 0.12, 0, TAU); ctx.fill();
    }
  } else if (p.hat === 'sun') {
    ctx.fillStyle = shade(hc, -0.08); ctx.beginPath(); ctx.ellipse(hcx, hcy - hR * 0.62, hR * 2.1, hR * 0.3, 0.03, 0, TAU); ctx.fill();
    ctx.fillStyle = lin(ctx, 0, hcy - hR * 1.6, 0, hcy - hR * 0.6, [[0, shade(hc, 0.12)], [1, shade(hc, -0.08)]]);
    ctx.beginPath(); ctx.arc(hcx, hcy - hR * 0.66, hR * 0.95, Math.PI, TAU); ctx.fill();
    ctx.fillStyle = shade(hc, -0.3); ctx.fillRect(hcx - hR * 0.95, hcy - hR * 0.85, hR * 1.9, hR * 0.2);
  } else if (p.hat === 'visor') {
    ctx.fillStyle = shade(hc, -0.1); ctx.fillRect(hcx - hR * 0.95, hcy - hR * 0.72, hR * 1.9, hR * 0.32);
    ctx.fillStyle = hc; ctx.beginPath(); ctx.ellipse(hcx + hR * 1.15, hcy - hR * 0.5, hR * 0.8, hR * 0.13, 0.12, 0, TAU); ctx.fill();
  }

  // ---- front leg, carrier, front arm ----
  drawLeg(la, false);
  let hand;
  if (babyFront) {
    const cc = car.color || '#3a7a78';
    const cf = fabric(ctx, cc, car.pattern);
    const bob = pose.babyBob || 0;
    const bx = chest + 1.7, by = shY + 1.4 + bob;
    if (car.type === 'wrap') {
      // fabric wraps crossing the chest and cocooning the baby
      ctx.fillStyle = cf;
      ctx.beginPath(); ctx.moveTo(-back * 0.6, shY - 0.2); ctx.quadraticCurveTo(chest + 1, shY + 2, chest + 3.6, shY + 3.4); ctx.lineTo(chest + 3.2, shY + 5); ctx.quadraticCurveTo(chest - 0.5, shY + 3.5, -back * 0.5, shY + 1.4); ctx.fill();
      babyLimbs(ctx, bx, by, 1, pose.baby.look, t * 3 + (pose.babyKick || 0));
      ctx.fillStyle = cf;
      ctx.beginPath(); ctx.moveTo(chest - 0.2, shY + 2.2); ctx.quadraticCurveTo(bx + 1, shY + 1.2, bx + 2.6, shY + 2.6); ctx.quadraticCurveTo(bx + 3.2, shY + 7, bx + 0.2, shY + 9.2); ctx.quadraticCurveTo(chest - 0.6, shY + 8.6, chest - 0.2, shY + 2.2); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.beginPath(); ctx.moveTo(bx + 2.6, shY + 2.6); ctx.quadraticCurveTo(bx + 3.2, shY + 7, bx + 0.2, shY + 9.2); ctx.lineTo(bx + 1.2, shY + 7); ctx.fill();
      ctx.fillStyle = shade(cc, -0.15); ctx.beginPath(); ctx.ellipse(chest * 0.5, -0.6, 1.4, 0.9, 0, 0, TAU); ctx.fill();
    } else {
      ctx.strokeStyle = shade(cc, -0.25); ctx.lineWidth = 0.9; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-back * 0.6, shY + 0.1); ctx.quadraticCurveTo(chest * 0.8, shY + 1.4, chest + 0.6, shY + 3.2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-back, -1.6); ctx.lineTo(chest + 1, -1.6); ctx.stroke();
      ctx.fillStyle = '#2a2a2e'; ctx.fillRect(chest * 0.2, -2.1, 0.9, 1.0);
      babyLimbs(ctx, bx, by, 1, pose.baby.look, t * 3 + (pose.babyKick || 0));
      ctx.fillStyle = lin(ctx, chest, 0, bx + 3, 0, [[0, shade(cc, 0.05)], [1, shade(cc, -0.25)]]);
      ctx.save(); ctx.beginPath(); ctx.moveTo(chest - 0.3, shY + 2.4); ctx.quadraticCurveTo(bx, shY + 1.6, bx + 2.7, shY + 2.6); ctx.quadraticCurveTo(bx + 3.1, shY + 6.6, bx + 0.6, shY + 8.4); ctx.quadraticCurveTo(chest - 0.4, shY + 8.2, chest - 0.3, shY + 2.4); ctx.fill(); ctx.clip();
      ctx.fillStyle = cf; ctx.globalAlpha = 0.85; ctx.fillRect(chest - 1, shY + 1, 8, 9); ctx.globalAlpha = 1;
      ctx.strokeStyle = rgba(shade(cc, -0.4), 0.5); ctx.lineWidth = 0.15; ctx.setLineDash([0.4, 0.3]); ctx.beginPath(); ctx.moveTo(chest + 0.3, shY + 3.2); ctx.quadraticCurveTo(bx, shY + 2.4, bx + 2.2, shY + 3.2); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
    }
    if (pose.baby.blanket) {
      ctx.fillStyle = fabric(ctx, '#f2d6c8', 'dots', 0.04);
      ctx.beginPath(); ctx.moveTo(chest - 0.4, shY + 2.4); ctx.quadraticCurveTo(bx, shY + 1.2, bx + 3, shY + 2.4); ctx.quadraticCurveTo(bx + 3.3, shY + 5.6, bx + 0.4, shY + 6.2); ctx.quadraticCurveTo(chest - 0.6, shY + 6, chest - 0.4, shY + 2.4); ctx.fill();
    }
    drawBabyHead(ctx, bx + 0.3, by - 0.3, 2.3, pose.baby.face, { ...pose.baby.look, hatOn: pose.baby.hatOn, pacifier: pose.baby.pacifier }, 1);
    if (pose.feeding) {
      ctx.save(); ctx.translate(bx + 2.4, by + 1.2); ctx.rotate(-0.8);
      ctx.fillStyle = 'rgba(250,250,245,0.92)'; ctx.beginPath(); ctx.roundRect(-0.8, -0.2, 1.6, 3.6, 0.5); ctx.fill();
      ctx.fillStyle = '#d9a066'; ctx.beginPath(); ctx.ellipse(0, -0.4, 0.45, 0.5, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }
  hand = arm(uaA, faA, false);
  if (pose.holding === 'camera') {
    ctx.fillStyle = '#26262c'; ctx.beginPath(); ctx.roundRect(hand.hx - 1.2, hand.hy - 1.6, 2.6, 1.8, 0.3); ctx.fill();
    ctx.fillStyle = '#3a3a44'; ctx.beginPath(); ctx.roundRect(hand.hx + 1.2, hand.hy - 1.3, 3.2, 1.3, 0.4); ctx.fill();
  } else if (pose.holding === 'binoculars') {
    ctx.fillStyle = '#2e3a2e'; ctx.beginPath(); ctx.roundRect(hand.hx - 0.4, hand.hy - 1.5, 2.4, 1.2, 0.4); ctx.fill();
  } else if (p.cane) {
    ctx.strokeStyle = '#6a4a32'; ctx.lineWidth = 0.55; ctx.beginPath(); ctx.moveTo(hand.hx, hand.hy); ctx.lineTo(hand.hx + 1.4, -hipY - 0.3); ctx.stroke();
  }
  ctx.restore();
}

// ------------------------------------------------------------------ ANIMALS
function wrinkles(ctx, x0, x1, y, h, col, n = 8) {
  ctx.strokeStyle = col; ctx.lineWidth = 0.12;
  const r = rng(Math.round(x0 * 7 + y));
  for (let i = 0; i < n; i++) { const x = x0 + r() * (x1 - x0); ctx.beginPath(); ctx.moveTo(x, y - h * r()); ctx.quadraticCurveTo(x + 0.5, y, x + (r() - 0.5), y + h * r()); ctx.stroke(); }
}

/** West Indian manatee, ~30 units long. */
export function drawManatee(ctx, x, y, dir, t, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(dir * (o.scale || 1), o.scale || 1);
  const swim = Math.sin(t * 0.9) * 0.18;
  const base = o.calf ? '#6e6c66' : '#5a5852';
  // paddle tail
  ctx.save(); ctx.translate(-12.5, 0); ctx.rotate(swim);
  ctx.fillStyle = lin(ctx, 0, -3, 0, 3, [[0, shade(base, 0.05)], [1, shade(base, -0.25)]]);
  ctx.beginPath(); ctx.moveTo(1, -1.4); ctx.bezierCurveTo(-3, -4.8, -8.2, -3.6, -8, 0); ctx.bezierCurveTo(-8.2, 3.6, -3, 4.8, 1, 1.4); ctx.fill();
  ctx.restore();
  // body
  ctx.fillStyle = lin(ctx, 0, -5, 0, 5, [[0, mix(base, '#6a7a52', 0.25)], [0.45, base], [1, shade(base, -0.3)]]);
  ctx.beginPath();
  ctx.moveTo(-12.5, -1.6);
  ctx.bezierCurveTo(-9, -5.2, 4, -5.6, 9.5, -2.8);
  ctx.bezierCurveTo(12.6, -1.4, 13.6, 0.6, 12.8, 2.2);
  ctx.bezierCurveTo(10, 4.8, -4, 5.4, -12.5, 1.6);
  ctx.closePath(); ctx.fill();
  // algae patches & scars on the back
  ctx.fillStyle = 'rgba(110,130,70,0.28)'; ellipse(ctx, -2, -3.6, 5, 1.2, 0.05); ctx.fill(); ellipse(ctx, 4, -3.4, 3, 0.9); ctx.fill();
  if (o.scars) { ctx.strokeStyle = 'rgba(235,235,225,0.7)'; ctx.lineWidth = 0.2; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-6 + i * 1.2, -4.2); ctx.lineTo(-4.6 + i * 1.2, -2.6); ctx.stroke(); } }
  wrinkles(ctx, -10, 10, -0.5, 3, 'rgba(50,50,45,0.18)', 14);
  // flipper
  ctx.save(); ctx.translate(7, 2.2); ctx.rotate(0.6 + Math.sin(t * 1.4) * 0.25);
  ctx.fillStyle = shade(base, -0.18); ctx.beginPath(); ctx.ellipse(1.6, 0, 2.6, 0.9, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(230,225,210,0.6)'; for (let i = 0; i < 3; i++) { circle(ctx, 3.4, -0.4 + i * 0.4, 0.15); ctx.fill(); }
  ctx.restore();
  // snout + whiskers + eye
  ctx.fillStyle = shade(base, -0.06); ctx.beginPath(); ctx.ellipse(12.4, 0.8, 1.9, 1.7, 0.2, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(40,35,30,0.55)'; for (let i = 0; i < 9; i++) { circle(ctx, 12.4 + (i % 3) * 0.5, 0.2 + Math.floor(i / 3) * 0.55, 0.09); ctx.fill(); }
  ctx.fillStyle = '#1e1c1a'; circle(ctx, 10.3, -0.9, 0.22); ctx.fill();
  ctx.fillStyle = '#2a2622'; ctx.beginPath(); ctx.ellipse(13.4, -0.4, 0.35, 0.18, -0.6, 0, TAU); ctx.fill();
  ctx.restore();
}

export function drawAlligator(ctx, x, y, dir, t, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
  const c = '#3e4232', belly = '#b8b490';
  const tail = Math.sin(t * 0.8) * 0.06;
  // tail
  ctx.fillStyle = lin(ctx, 0, -3, 0, 1, [[0, shade(c, 0.08)], [1, shade(c, -0.25)]]);
  ctx.beginPath(); ctx.moveTo(-6, -2.2); ctx.quadraticCurveTo(-14, -1.6 + tail * 20, -22, -0.4 + tail * 30); ctx.lineTo(-21.6, 0.2 + tail * 30); ctx.quadraticCurveTo(-14, 0.4, -6, 0); ctx.fill();
  // body
  ctx.beginPath(); ctx.moveTo(-7, -2.4); ctx.bezierCurveTo(-3, -3.8, 5, -3.6, 8, -2.0); ctx.lineTo(8.4, 0); ctx.bezierCurveTo(4, 0.6, -4, 0.6, -7, 0); ctx.fill();
  // head & long snout
  ctx.beginPath(); ctx.moveTo(7.6, -2.2); ctx.quadraticCurveTo(10, -2.6, 11.4, -2.2); ctx.lineTo(16.8, -1.3); ctx.quadraticCurveTo(17.6, -0.8, 16.8, -0.2); ctx.lineTo(8.2, 0); ctx.fill();
  ctx.strokeStyle = rgba(belly, 0.7); ctx.lineWidth = 0.18; ctx.beginPath(); ctx.moveTo(9, -0.6); ctx.lineTo(16.6, -0.6); ctx.stroke();
  ctx.fillStyle = '#d8d0a0'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(10.5 + i, -0.62); ctx.lineTo(10.75 + i, -0.3); ctx.lineTo(11 + i, -0.62); ctx.fill(); }
  // eye bumps & nostril
  ctx.fillStyle = shade(c, 0.1); ellipse(ctx, 10.2, -2.6, 0.7, 0.45); ctx.fill();
  ctx.fillStyle = '#c8b040'; circle(ctx, 10.3, -2.65, 0.22); ctx.fill(); ctx.fillStyle = '#111'; ctx.fillRect(10.27, -2.85, 0.07, 0.4);
  ctx.fillStyle = shade(c, 0.1); circle(ctx, 16.6, -1.4, 0.3); ctx.fill();
  // scutes
  ctx.fillStyle = shade(c, -0.25);
  for (let i = -14; i < 7; i += 1.1) { const yy = i < -6 ? -1.6 + (i + 14) * -0.02 : -3.2 + Math.abs(i) * 0.03; ctx.beginPath(); ctx.moveTo(i, yy + 0.3); ctx.lineTo(i + 0.45, yy - 0.45); ctx.lineTo(i + 0.9, yy + 0.3); ctx.fill(); }
  ctx.fillStyle = 'rgba(160,160,120,0.15)'; for (let i = 0; i < 30; i++) { circle(ctx, -6 + (i % 10) * 1.4, -2.6 + Math.floor(i / 10) * 0.8, 0.25); ctx.fill(); }
  // legs
  if (!o.submerged) { ctx.fillStyle = shade(c, -0.1); for (const lx of [-4.5, 5]) { ctx.beginPath(); ctx.ellipse(lx, 0.2, 1.4, 0.6, 0.4, 0, TAU); ctx.fill(); } }
  ctx.restore();
}

export function drawTurtle(ctx, x, y, dir, t) {
  ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
  const neck = Math.sin(t * 0.5) > 0.6 ? 1 : 0.5;
  ctx.fillStyle = '#4a4a2e'; ctx.beginPath(); ctx.ellipse(3.6 + neck, -0.9, 1.1, 0.6, 0.2, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#d8c050'; ctx.lineWidth = 0.15; ctx.beginPath(); ctx.moveTo(2.4, -0.8); ctx.lineTo(4 + neck, -0.9); ctx.stroke();
  ctx.fillStyle = lin(ctx, 0, -3, 0, 0, [[0, '#4e4a30'], [1, '#2a2618']]);
  ctx.beginPath(); ctx.ellipse(0, -0.6, 3.4, 2.2, 0, Math.PI, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(210,190,80,0.6)'; ctx.lineWidth = 0.14;
  for (const a of [-0.6, 0, 0.6]) { ctx.beginPath(); ctx.moveTo(a * 3, -0.6); ctx.quadraticCurveTo(a * 2, -2, a * 1.2, -2.6); ctx.stroke(); }
  ctx.fillStyle = '#c05a3a'; ctx.fillRect(-3.3, -0.65, 6.6, 0.35);
  ctx.restore();
}

function wader(ctx, x, y, dir, t, o) {
  // long-legged wading bird (heron, egret, ibis)
  ctx.save(); ctx.translate(x, y); ctx.scale(dir * o.size, o.size);
  const strike = o.state === 'strike' ? Math.min(1, Math.sin(t * 3) * 1.4) : 0;
  ctx.strokeStyle = o.legs; ctx.lineWidth = 0.38; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-0.3, -9); ctx.lineTo(-0.6, -4.5); ctx.lineTo(-0.3, 0); ctx.moveTo(0.4, -9); ctx.lineTo(0.9, -4.6); ctx.lineTo(0.8, 0); ctx.stroke();
  // body
  ctx.fillStyle = lin(ctx, 0, -14, 0, -8, [[0, shade(o.body, 0.12)], [1, shade(o.body, -0.15)]]);
  ctx.beginPath(); ctx.moveTo(-5.2, -10.6); ctx.quadraticCurveTo(-2, -14.4, 2.6, -13.2); ctx.quadraticCurveTo(3.4, -10.4, 1, -8.6); ctx.quadraticCurveTo(-2.6, -8.8, -5.2, -10.6); ctx.fill();
  if (o.wingtip) { ctx.fillStyle = o.wingtip; ctx.beginPath(); ctx.ellipse(-4.6, -10.4, 1.2, 0.5, 0.3, 0, TAU); ctx.fill(); }
  // neck (S-curve) and head
  const nx = 2.2, ny = -12.8;
  const hx = 3.4 + strike * 4, hy = -19.2 + (o.neckLen || 0) + strike * 4;
  ctx.strokeStyle = o.neck || o.body; ctx.lineWidth = 1.1;
  ctx.beginPath(); ctx.moveTo(nx, ny); ctx.bezierCurveTo(4.2 + strike * 2, -14.5, 1.2, -16.6, hx, hy); ctx.stroke();
  ctx.fillStyle = o.head || o.body; ctx.beginPath(); ctx.ellipse(hx + 0.3, hy - 0.2, 1.0, 0.75, 0.1, 0, TAU); ctx.fill();
  if (o.plume) { ctx.strokeStyle = '#1e1e24'; ctx.lineWidth = 0.25; ctx.beginPath(); ctx.moveTo(hx - 0.4, hy - 0.5); ctx.quadraticCurveTo(hx - 1.8, hy - 0.8, hx - 2.6, hy + 0.2); ctx.stroke(); }
  ctx.fillStyle = o.bill;
  ctx.beginPath();
  if (o.curved) { ctx.moveTo(hx + 1, hy - 0.4); ctx.quadraticCurveTo(hx + 3.4, hy - 0.2, hx + 4.0, hy + 2.0); ctx.quadraticCurveTo(hx + 3.0, hy + 0.4, hx + 1.0, hy + 0.2); }
  else { ctx.moveTo(hx + 1, hy - 0.45); ctx.lineTo(hx + 4.4, hy - 0.05); ctx.lineTo(hx + 1, hy + 0.3); }
  ctx.fill();
  ctx.fillStyle = o.eye || '#e8c040'; circle(ctx, hx + 0.6, hy - 0.35, 0.2); ctx.fill();
  ctx.restore();
}
export const drawHeron = (ctx, x, y, dir, t, state) => wader(ctx, x, y, dir, t, { size: 1.3, state, body: '#7a8898', neck: '#a8a8b0', head: '#e8e8ea', legs: '#6a5a40', bill: '#d8b040', plume: true });
export const drawEgret = (ctx, x, y, dir, t, state) => wader(ctx, x, y, dir, t, { size: 1.15, state, body: '#f6f6f2', legs: '#1e1e1e', bill: '#e8c030' });
export const drawIbis = (ctx, x, y, dir, t, state) => wader(ctx, x, y, dir, t, { size: 0.82, state, body: '#f4f4f0', head: '#f4f4f0', legs: '#e06a4a', bill: '#e06a4a', curved: true, neckLen: 2.4, wingtip: '#2a2a2e', eye: '#5a8ab0' });

export function drawAnhinga(ctx, x, y, dir, t, drying = true) {
  ctx.save(); ctx.translate(x, y); ctx.scale(dir * 1.1, 1.1);
  ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 0.3; ctx.beginPath(); ctx.moveTo(0, -1); ctx.lineTo(0, 0); ctx.stroke();
  if (drying) {
    const f = Math.sin(t * 0.7) * 0.15;
    for (const s of [-1, 1]) {
      ctx.fillStyle = lin(ctx, 0, -9, s * 7, -6, [[0, '#1e1e22'], [1, '#2e2e34']]);
      ctx.beginPath(); ctx.moveTo(0, -5.4); ctx.quadraticCurveTo(s * 4, -9.6 - f * 4, s * 7.6, -8.4 - f * 3); ctx.lineTo(s * 7.2, -6.4); ctx.quadraticCurveTo(s * 4, -5.8, 0, -3.6); ctx.fill();
      ctx.strokeStyle = 'rgba(230,230,225,0.55)'; ctx.lineWidth = 0.18;
      for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(s * i * 0.9, -6.2 - i * 0.2); ctx.lineTo(s * (i * 0.9 + 0.8), -7.4 - i * 0.25); ctx.stroke(); }
    }
  }
  ctx.fillStyle = '#1e1e22'; ctx.beginPath(); ctx.ellipse(0, -4.4, 1.3, 2.4, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-0.6, -2.4); ctx.lineTo(-1.6, 0.6); ctx.lineTo(0.8, 0.6); ctx.lineTo(0.6, -2.4); ctx.fill();
  ctx.strokeStyle = '#2a2622'; ctx.lineWidth = 0.55; ctx.beginPath(); ctx.moveTo(0.3, -6.4); ctx.bezierCurveTo(1.8, -7.6, 0.2, -9.2, 1.4, -10.2); ctx.stroke();
  ctx.fillStyle = '#c8a050'; ctx.beginPath(); ctx.moveTo(1.6, -10.4); ctx.lineTo(3.6, -10.1); ctx.lineTo(1.6, -9.8); ctx.fill();
  ctx.fillStyle = '#c84030'; circle(ctx, 1.5, -10.25, 0.12); ctx.fill();
  ctx.restore();
}

export function drawOsprey(ctx, x, y, dir, t) {
  ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
  const f = Math.sin(t * 3) * 0.5;
  for (const s of [-1, 1]) {
    ctx.fillStyle = lin(ctx, 0, 0, 0, -3, [[0, '#f2efe8'], [1, '#5a4a3a']]);
    ctx.beginPath(); ctx.moveTo(-0.5, 0); ctx.quadraticCurveTo(-2, s * (3 + f), -1.2, s * (5.5 + f)); ctx.lineTo(-4.6, s * (8.4 + f * 1.5)); ctx.lineTo(-2.4, s * (4 + f)); ctx.lineTo(1, 0); ctx.fill();
    ctx.fillStyle = '#3a2e24'; circle(ctx, -1.5, s * (5.2 + f), 0.55); ctx.fill();
  }
  ctx.fillStyle = '#f2efe8'; ctx.beginPath(); ctx.ellipse(0, 0, 3.4, 1.0, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#e8e4dc'; circle(ctx, 3.2, -0.2, 0.9); ctx.fill();
  ctx.fillStyle = '#3a2e24'; ctx.fillRect(2.6, -0.45, 1.2, 0.3);
  ctx.fillStyle = '#2a2a2a'; ctx.beginPath(); ctx.moveTo(3.9, -0.4); ctx.lineTo(4.7, 0); ctx.lineTo(3.9, 0.2); ctx.fill();
  ctx.fillStyle = '#d8d0c4'; ctx.beginPath(); ctx.moveTo(-3, -0.6); ctx.lineTo(-5.4, -0.9); ctx.lineTo(-5.4, 0.9); ctx.lineTo(-3, 0.6); ctx.fill();
  ctx.restore();
}

export function drawOtter(ctx, x, y, dir, t, swimming = true) {
  ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
  const c = '#5a4232';
  const bob = Math.sin(t * 2.4) * 0.3;
  ctx.fillStyle = lin(ctx, 0, -3, 0, 1, [[0, shade(c, 0.12)], [1, shade(c, -0.2)]]);
  if (swimming) {
    ctx.beginPath(); ctx.ellipse(-2.5, 0.4 + bob, 5.2, 1.0, 0, Math.PI, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(3.2, -0.6 + bob, 1.6, 1.25, 0, 0, TAU); ctx.fill();
  } else {
    ctx.beginPath(); ctx.ellipse(0, -1.8, 5, 1.6, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-4.6, -1.6); ctx.quadraticCurveTo(-8, -1.2, -9, -0.4); ctx.lineTo(-4.4, -1); ctx.fill();
    ctx.beginPath(); ctx.ellipse(5, -2.6, 1.6, 1.25, 0, 0, TAU); ctx.fill();
  }
  const hx = swimming ? 3.2 : 5, hy = swimming ? -0.6 + bob : -2.6;
  ctx.fillStyle = '#c8b8a0'; ctx.beginPath(); ctx.ellipse(hx + 0.8, hy + 0.5, 0.9, 0.55, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#141210'; circle(ctx, hx + 0.6, hy - 0.4, 0.2); ctx.fill(); circle(ctx, hx + 1.55, hy + 0.15, 0.22); ctx.fill();
  ctx.strokeStyle = 'rgba(240,240,230,0.6)'; ctx.lineWidth = 0.06; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(hx + 1.3, hy + 0.5); ctx.lineTo(hx + 2.6, hy + 0.2 + i * 0.35); ctx.stroke(); }
  ctx.restore();
}

export function drawArmadillo(ctx, x, y, dir, t, walking) {
  ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
  shadowBlob(ctx, 0, 0, 4.5, 0.25);
  const k = walking ? Math.sin(t * 12) * 0.4 : 0;
  ctx.fillStyle = '#7a6a5a';
  for (const [lx, o] of [[-2.2, k], [2, -k]]) { ctx.fillRect(lx + o, -1.2, 0.6, 1.2); }
  ctx.fillStyle = lin(ctx, 0, -4, 0, -0.5, [[0, '#b8a690'], [1, '#7a6a58']]);
  ctx.beginPath(); ctx.ellipse(0, -1.4, 3.8, 2.6, 0, Math.PI, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(80,65,50,0.6)'; ctx.lineWidth = 0.14;
  for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * 0.75, -1.4); ctx.lineTo(i * 0.7, -3.9 + Math.abs(i) * 0.25); ctx.stroke(); }
  ctx.fillStyle = '#9a8670'; ctx.beginPath(); ctx.moveTo(3.4, -2.2); ctx.lineTo(6.4, -1.0); ctx.lineTo(3.6, -0.8); ctx.fill();
  ctx.beginPath(); ctx.ellipse(4, -2.6, 0.4, 0.7, -0.3, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-3.6, -1.6); ctx.quadraticCurveTo(-6, -1.4, -7, -0.6); ctx.lineTo(-3.6, -1.0); ctx.fill();
  ctx.restore();
}

export function drawGar(ctx, x, y, dir, t) {
  ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
  const w = Math.sin(t * 4) * 0.4;
  ctx.fillStyle = lin(ctx, 0, -1.2, 0, 1.2, [[0, '#5a6a4a'], [1, '#c8c4a0']]);
  ctx.beginPath(); ctx.moveTo(-7, w); ctx.quadraticCurveTo(-2, -1.2, 4, -0.7); ctx.lineTo(9.5, -0.15); ctx.lineTo(9.5, 0.15); ctx.lineTo(4, 0.7); ctx.quadraticCurveTo(-2, 1.2, -7, w); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-6.6, w); ctx.lineTo(-8.6, w - 1.2); ctx.lineTo(-8.4, w + 1.2); ctx.fill();
  ctx.fillStyle = 'rgba(40,40,30,0.5)'; for (let i = 0; i < 8; i++) { circle(ctx, -5 + i * 1.2, -0.2 + (i % 2) * 0.3, 0.18); ctx.fill(); }
  ctx.fillStyle = '#111'; circle(ctx, 4.2, -0.3, 0.16); ctx.fill();
  ctx.restore();
}
export function drawFish(ctx, x, y, dir, t, col = '#a8b0b0', len = 3.4) {
  ctx.save(); ctx.translate(x, y); ctx.scale(dir * len / 3.4, len / 3.4);
  const w = Math.sin(t * 8) * 0.35;
  ctx.fillStyle = lin(ctx, 0, -1, 0, 1, [[0, shade(col, -0.25)], [1, shade(col, 0.3)]]);
  ctx.beginPath(); ctx.moveTo(-2.4, w); ctx.quadraticCurveTo(0, -1.1, 2.2, 0); ctx.quadraticCurveTo(0, 1.0, -2.4, w); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-2.2, w); ctx.lineTo(-3.4, w - 0.8); ctx.lineTo(-3.3, w + 0.8); ctx.fill();
  ctx.restore();
}

export function drawBarredOwl(ctx, x, y, t) {
  ctx.save(); ctx.translate(x, y);
  const c = '#8a7a66';
  ctx.fillStyle = lin(ctx, 0, -9, 0, 0, [[0, shade(c, 0.1)], [1, shade(c, -0.12)]]);
  ctx.beginPath(); ctx.ellipse(0, -4.2, 3.0, 4.3, 0, 0, TAU); ctx.fill();
  circle(ctx, 0, -7.6, 2.4); ctx.fill();
  ctx.fillStyle = '#c8bca8'; circle(ctx, -0.9, -7.5, 1.0); ctx.fill(); circle(ctx, 0.9, -7.5, 1.0); ctx.fill();
  ctx.strokeStyle = 'rgba(90,70,50,0.6)'; ctx.lineWidth = 0.16;
  for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-1.4 + (i % 2) * 0.4, -5 + i * 0.9); ctx.lineTo(-1.2, -4.3 + i * 0.9); ctx.moveTo(1.0 + (i % 2) * 0.3, -5 + i * 0.9); ctx.lineTo(1.2, -4.3 + i * 0.9); ctx.stroke(); }
  const blink = (t % 5) < 0.15;
  ctx.fillStyle = '#1a1410';
  for (const ex of [-0.9, 0.9]) { if (blink) ctx.fillRect(ex - 0.4, -7.5, 0.8, 0.12); else { circle(ctx, ex, -7.5, 0.4); ctx.fill(); } }
  ctx.fillStyle = '#e0c060'; ctx.beginPath(); ctx.moveTo(-0.2, -7.1); ctx.lineTo(0.2, -7.1); ctx.lineTo(0, -6.5); ctx.fill();
  ctx.restore();
}
