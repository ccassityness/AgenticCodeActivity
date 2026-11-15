// Hi-res illustrated characters and animals, drawn with shaded vector shapes in world units.
// Light comes from the upper left; every figure faces right and is mirrored for left.
import { shade, mix, rgba, ellipse, circle, lin, rad } from './color.js';

const TAU = Math.PI * 2;
const INK = '#2a1a16';

export const PEOPLE_OPTIONS = {
  skin: ['#f6d6bf', '#e6b08a', '#c68a60', '#9a6644', '#68432e'],
  hair: ['#2e1d14', '#6e4325', '#b8742f', '#e6c27a', '#a8402a', '#a8a29e'],
  style: ['short', 'long', 'bun', 'curly'],
  shirt: ['#3e6596', '#c9504b', '#e8a23a', '#5b9468', '#8f6bb4', '#ece4cc'],
  carrier: ['#3a8783', '#d9774f', '#7caa62', '#e8bb5e', '#9474b8'],
};

function limb(ctx, x0, y0, x1, y1, w, col) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = shade(col, -0.22);
  ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.strokeStyle = col;
  ctx.lineWidth = w * 0.72;
  ctx.beginPath(); ctx.moveTo(x0 - w * 0.12, y0 - w * 0.08); ctx.lineTo(x1 - w * 0.12, y1 - w * 0.08); ctx.stroke();
}
function shadowBlob(ctx, x, y, rx, a = 0.28) {
  ctx.fillStyle = rad(ctx, x, y, 0, rx, [[0, `rgba(40,20,15,${a})`], [1, 'rgba(40,20,15,0)']]);
  ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.28); circle(ctx, 0, 0, rx); ctx.restore(); ctx.fill();
}
export { shadowBlob };

// ------------------------------------------------------------------ BABY
/**
 * Baby head (3/4 view). face: content | giggle | wow | sleepy | napping | fussy | crying
 */
export function drawBabyHead(ctx, cx, cy, r, face, o = {}) {
  const dir = o.dir ?? 1;
  const skin = o.skin || '#f3cdb0';
  const bonnet = o.bonnet || '#9fd3cf';
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(dir, 1);
  // head
  ctx.fillStyle = rad(ctx, -r * 0.35, -r * 0.4, r * 0.1, r * 1.2, [[0, shade(skin, 0.18)], [0.7, skin], [1, shade(skin, -0.12)]]);
  circle(ctx, 0, 0, r); ctx.fill();
  // bonnet / knit cap
  if (!o.hat) {
    ctx.fillStyle = lin(ctx, 0, -r, 0, 0, [[0, shade(bonnet, 0.25)], [1, bonnet]]);
    ctx.beginPath(); ctx.arc(-r * 0.08, 0, r * 1.04, Math.PI * 0.98, Math.PI * 2.02); ctx.quadraticCurveTo(r * 0.4, -r * 0.55, -r * 0.2, -r * 0.42); ctx.quadraticCurveTo(-r * 0.75, -r * 0.3, -r * 1.05, r * 0.1); ctx.fill();
    ctx.fillStyle = shade(bonnet, 0.35); circle(ctx, -r * 0.3, -r * 1.05, r * 0.28); ctx.fill();
  }
  // ear
  ctx.fillStyle = shade(skin, -0.08); ellipse(ctx, -r * 0.62, r * 0.12, r * 0.18, r * 0.24); ctx.fill();
  // cheeks
  ctx.fillStyle = 'rgba(240,120,110,0.35)';
  circle(ctx, r * 0.02, r * 0.38, r * 0.2); ctx.fill();
  circle(ctx, r * 0.72, r * 0.36, r * 0.16); ctx.fill();
  // eyes
  const ex1 = r * 0.18, ex2 = r * 0.66, ey = r * 0.08;
  ctx.strokeStyle = INK; ctx.fillStyle = INK; ctx.lineWidth = r * 0.1; ctx.lineCap = 'round';
  const dotEyes = (s = 0.11) => { for (const ex of [ex1, ex2]) { ellipse(ctx, ex, ey, r * s, r * s * 1.25); ctx.fill(); ctx.fillStyle = '#fff'; circle(ctx, ex + r * 0.04, ey - r * 0.05, r * 0.035); ctx.fill(); ctx.fillStyle = INK; } };
  const arcEyes = (up) => { for (const ex of [ex1, ex2]) { ctx.beginPath(); ctx.arc(ex, ey + (up ? r * 0.05 : -r * 0.06), r * 0.11, up ? Math.PI * 1.1 : Math.PI * 0.1, up ? Math.PI * 1.9 : Math.PI * 0.9); ctx.stroke(); } };
  const mouth = (kind) => {
    const mx = r * 0.44, my = r * 0.5;
    if (kind === 'smile') { ctx.beginPath(); ctx.arc(mx, my - r * 0.08, r * 0.14, 0.2, Math.PI - 0.2); ctx.stroke(); }
    if (kind === 'open') { ctx.fillStyle = '#7a2a2a'; ellipse(ctx, mx, my, r * 0.16, r * 0.14); ctx.fill(); ctx.fillStyle = '#e07070'; ellipse(ctx, mx, my + r * 0.06, r * 0.09, r * 0.05); ctx.fill(); ctx.fillStyle = INK; }
    if (kind === 'o') { ctx.fillStyle = '#7a2a2a'; ellipse(ctx, mx, my, r * 0.07, r * 0.09); ctx.fill(); ctx.fillStyle = INK; }
    if (kind === 'frown') { ctx.beginPath(); ctx.arc(mx, my + r * 0.1, r * 0.12, Math.PI + 0.3, -0.3); ctx.stroke(); }
    if (kind === 'wail') { ctx.fillStyle = '#7a2a2a'; ellipse(ctx, mx, my + r * 0.02, r * 0.2, r * 0.18); ctx.fill(); ctx.fillStyle = INK; }
    if (kind === 'tiny') { ctx.beginPath(); ctx.moveTo(mx - r * 0.06, my); ctx.lineTo(mx + r * 0.06, my); ctx.stroke(); }
  };
  switch (face) {
    case 'giggle': arcEyes(true); mouth('open'); break;
    case 'wow': dotEyes(0.14); mouth('o'); break;
    case 'sleepy': ctx.lineWidth = r * 0.12; for (const ex of [ex1, ex2]) { ctx.beginPath(); ctx.moveTo(ex - r * 0.12, ey); ctx.lineTo(ex + r * 0.12, ey); ctx.stroke(); } mouth('o'); break;
    case 'napping': arcEyes(false); if (!o.pacifier) mouth('tiny'); break;
    case 'fussy':
      dotEyes(0.1); mouth('frown');
      ctx.beginPath(); ctx.moveTo(ex1 - r * 0.14, ey - r * 0.2); ctx.lineTo(ex1 + r * 0.1, ey - r * 0.27); ctx.moveTo(ex2 - r * 0.1, ey - r * 0.27); ctx.lineTo(ex2 + r * 0.14, ey - r * 0.2); ctx.stroke();
      ctx.fillStyle = '#7fc8f8'; ellipse(ctx, ex1 - r * 0.05, ey + r * 0.22, r * 0.05, r * 0.09); ctx.fill();
      break;
    case 'crying':
      ctx.lineWidth = r * 0.11;
      for (const ex of [ex1, ex2]) { ctx.beginPath(); ctx.moveTo(ex - r * 0.13, ey - r * 0.04); ctx.lineTo(ex, ey + r * 0.04); ctx.lineTo(ex + r * 0.13, ey - r * 0.04); ctx.stroke(); }
      mouth('wail');
      ctx.fillStyle = '#7fc8f8';
      for (const ex of [ex1, ex2]) { ellipse(ctx, ex, ey + r * 0.3, r * 0.06, r * 0.13); ctx.fill(); }
      break;
    default: dotEyes(); mouth('smile');
  }
  if (o.pacifier && (face === 'napping' || face === 'content' || face === 'sleepy')) {
    ctx.fillStyle = '#7aa6d8'; ellipse(ctx, r * 0.46, r * 0.5, r * 0.2, r * 0.13); ctx.fill();
    ctx.fillStyle = '#f2c14e'; circle(ctx, r * 0.46, r * 0.5, r * 0.06); ctx.fill();
  }
  // tiny nose
  ctx.fillStyle = shade(skin, -0.1); circle(ctx, r * 0.48, r * 0.26, r * 0.07); ctx.fill();
  if (o.hat) {
    ctx.fillStyle = lin(ctx, 0, -r * 1.4, 0, -r * 0.4, [[0, '#f6dc96'], [1, '#d9b462']]);
    ellipse(ctx, r * 0.05, -r * 0.55, r * 1.55, r * 0.32); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -r * 0.6, r * 0.82, Math.PI, TAU); ctx.fill();
    ctx.fillStyle = '#e07a7a'; ctx.fillRect(-r * 0.82, -r * 0.82, r * 1.64, r * 0.2);
  }
  ctx.restore();
}

function drawBabyBody(ctx, x, y, r, b, flail) {
  // little arms & legs poking out of the carrier
  const skin = b.skin;
  const wave = Math.sin(flail) * 0.6;
  limb(ctx, x - r * 0.5, y + r * 1.15, x - r * 1.05, y + r * 1.75 + wave * r * 0.4, r * 0.42, skin);
  limb(ctx, x + r * 0.6, y + r * 1.15, x + r * 1.15, y + r * 1.65 - wave * r * 0.4, r * 0.42, skin);
}

// ------------------------------------------------------------------ PEOPLE
/**
 * Draw a person standing at (x, y) = feet. look: {skin,hair,style,shirt,pants,boots,hat,hatColor,pack,packColor,extras[],kid,carrier}
 * pose: {dir, state: idle|walk|run|sit|jump|rock|bounce|crouch, phase, t, baby, babyFace, babyPos:'front'|'back'}
 */
export function drawPerson(ctx, x, y, look, pose = {}) {
  const dir = pose.dir ?? 1;
  const st = pose.state || 'idle';
  const t = pose.t || 0;
  const sc = look.kid ? 0.62 : 1;
  const L = 7.1;                      // thigh / shin length
  const skin = look.skin, pants = look.pants || '#55667a', shirt = look.shirt || '#3e6596';
  const boots = look.boots || '#5a3a24';

  // ---- legs ----
  let thA = 0, thB = 0, knA = 0.08, knB = 0.08, lean = 0, hipLift = 0;
  if (st === 'walk' || st === 'run') {
    const amp = st === 'run' ? 0.72 : 0.42, p = pose.phase || 0;
    thA = amp * Math.sin(p); thB = -thA;
    knA = 0.1 + (st === 'run' ? 1.0 : 0.65) * Math.max(0, Math.cos(p));
    knB = 0.1 + (st === 'run' ? 1.0 : 0.65) * Math.max(0, -Math.cos(p));
    lean = st === 'run' ? 0.13 : 0.03;
  } else if (st === 'sit') {
    thA = thB = Math.PI / 2 - 0.05; knA = knB = Math.PI / 2 - 0.1;
  } else if (st === 'jump') {
    thA = 0.65; thB = 0.25; knA = 1.1; knB = 0.9;
  } else if (st === 'crouch') {
    thA = 0.9; thB = 0.7; knA = 1.7; knB = 1.5;
  } else {
    thA = 0.05; thB = -0.06;
  }
  const leg = (th, kn) => {
    const kx = Math.sin(th) * L, ky = Math.cos(th) * L;
    const sh = th - kn;
    return { kx, ky, ax: kx + Math.sin(sh) * L, ay: ky + Math.cos(sh) * L };
  };
  const la = leg(thA, knA), lb = leg(thB, knB);
  // hip height so the lowest foot touches the ground
  let hipY = -Math.max(la.ay, lb.ay) - 1.0;
  if (st === 'sit') hipY = -7.6;
  if (st === 'jump') hipY = -15.2;
  if (st === 'bounce') hipLift = Math.abs(Math.sin(t * 9)) * 1.6;
  if (st === 'idle') hipLift = Math.sin(t * 2) * 0.15;

  ctx.save();
  ctx.translate(x, y);
  if (st !== 'jump') shadowBlob(ctx, 0, 0, 7 * sc);
  ctx.scale(dir * sc, sc);
  ctx.translate(0, hipY - hipLift);
  const sway = st === 'rock' ? Math.sin(t * 5) * 0.07 : 0;
  ctx.rotate(lean + sway);

  const shY = -9.6;                        // shoulders relative to hip
  const headR = look.kid ? 3.4 : 2.75;
  const headY = shY - 3.4 - (look.kid ? 0.8 : 0);
  const hx = 0.5;
  const babyFront = pose.baby && pose.babyPos === 'front';
  const babyBack = pose.baby && pose.babyPos === 'back';

  const drawLeg = (l, back) => {
    const col = back ? shade(pants, -0.12) : pants;
    limb(ctx, 0, 0, l.kx, l.ky, 3.0, col);
    limb(ctx, l.kx, l.ky, l.ax, l.ay, 2.5, col);
    // boot
    ctx.fillStyle = back ? shade(boots, -0.15) : boots;
    ctx.save(); ctx.translate(l.ax, l.ay); ctx.rotate(Math.min(0.5, Math.max(-0.5, (st === 'sit' ? 0 : (l.ax - l.kx) * 0.04))));
    ctx.beginPath(); ctx.moveTo(-1.3, -1.2); ctx.lineTo(1.4, -1.2); ctx.quadraticCurveTo(2.9, -0.6, 2.8, 0.7); ctx.lineTo(-1.4, 0.7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = shade(boots, -0.35); ctx.fillRect(-1.4, 0.3, 4.2, 0.45);
    ctx.restore();
  };

  // ---- arms (computed) ----
  const p = pose.phase || 0;
  let uaA = 0.1, faA = -0.35, uaB = -0.1, faB = -0.3;      // A = front arm
  if (st === 'walk' || st === 'run') { const a = st === 'run' ? 0.8 : 0.42; uaA = -a * Math.sin(p); uaB = a * Math.sin(p); faA = faB = st === 'run' ? -1.3 : -0.4; }
  if (st === 'jump') { uaA = -2.4; uaB = -2.1; faA = faB = -0.3; }
  if (babyFront) { uaA = 0.55; faA = -1.55; }
  if (st === 'rock') { uaA = 0.7; faA = -1.7; uaB = 0.55; faB = -1.6; }
  if (pose.holding === 'camera') { uaA = 1.1; faA = -2.2; }
  if (pose.holding === 'cane') { uaA = 0.35; faA = -0.2; }
  if (st === 'sit') { uaA = 0.5; faA = -0.6; uaB = 0.4; faB = -0.5; }
  const UA = 4.9, FA = 4.4;
  const arm = (ua, fa, back) => {
    const sx = 0.2 + (back ? -0.4 : 0.5), sy = shY + 1.2;
    const ex = sx + Math.sin(ua) * UA, ey = sy + Math.cos(ua) * UA;
    const fx = ex + Math.sin(ua - fa) * FA, fy = ey + Math.cos(ua - fa) * FA;
    const col = back ? shade(shirt, -0.15) : shirt;
    limb(ctx, sx, sy, ex, ey, 2.4, col);
    limb(ctx, ex, ey, fx, fy, 2.0, col);
    ctx.fillStyle = back ? shade(skin, -0.12) : skin; circle(ctx, fx, fy, 1.05); ctx.fill();
    return { fx, fy };
  };

  // ---- back things ----
  if (look.pack) {
    const pc = look.packColor || '#a0522d';
    ctx.fillStyle = lin(ctx, -6, 0, -1, 0, [[0, shade(pc, -0.15)], [1, pc]]);
    ctx.beginPath(); ctx.roundRect(-5.8, shY + 0.4, 4.4, 8.2, 1.6); ctx.fill();
    ctx.fillStyle = shade(pc, -0.3); ctx.fillRect(-5.6, shY + 4.2, 4, 0.5);
    ctx.fillStyle = shade(pc, 0.2); ctx.fillRect(-5.5, shY + 1, 0.7, 6.5);
  }
  if (babyBack) {
    const bc = look.carrier || '#3a8783';
    ctx.fillStyle = lin(ctx, -7, 0, -1, 0, [[0, shade(bc, -0.2)], [1, bc]]);
    ctx.beginPath(); ctx.roundRect(-6.8, shY + 0.2, 5.4, 7.4, 2); ctx.fill();
    drawBabyBody(ctx, -4.4, shY - 2.6, 2.2, pose.baby, t * 3);
    drawBabyHead(ctx, -4.3, shY - 2.6, 2.25, pose.babyFace, { ...pose.baby, dir: 1 });
  }

  arm(uaB, faB, true);
  drawLeg(lb, true);

  // ---- torso ----
  const torso = () => {
    ctx.fillStyle = lin(ctx, -3, shY, 3.5, 0, [[0, shade(shirt, 0.15)], [0.55, shirt], [1, shade(shirt, -0.22)]]);
    ctx.beginPath();
    ctx.moveTo(-2.5, shY + 0.2);
    ctx.quadraticCurveTo(0.4, shY - 0.9, 3.0, shY + 0.4);
    ctx.quadraticCurveTo(3.6, shY + 5, 2.7, 0.4);
    ctx.lineTo(-2.3, 0.4);
    ctx.quadraticCurveTo(-3.2, shY + 5, -2.5, shY + 0.2);
    ctx.fill();
    // belt / waist
    ctx.fillStyle = shade(pants, -0.1); ctx.beginPath(); ctx.roundRect(-2.6, -0.8, 5.4, 1.6, 0.7); ctx.fill();
    if (look.ranger) { ctx.fillStyle = '#e0b040'; circle(ctx, 1.9, shY + 2.4, 0.45); ctx.fill(); ctx.fillStyle = '#5a4a2a'; ctx.fillRect(-2.5, -0.7, 5.2, 0.6); }
  };
  torso();

  // ---- neck & head ----
  ctx.fillStyle = shade(skin, -0.1); ctx.fillRect(-0.4, shY - 1.6, 1.8, 2);
  const hy = headY;
  // long hair behind
  const hair = look.hair || '#2e1d14';
  if (look.style === 'long') {
    ctx.fillStyle = lin(ctx, 0, hy - 3, 0, shY + 4, [[0, hair], [1, shade(hair, -0.2)]]);
    ctx.beginPath(); ctx.moveTo(hx - 2.8, hy - 0.5); ctx.quadraticCurveTo(hx - 4.4, shY + 2, hx - 3.4, shY + 4.2); ctx.lineTo(hx - 0.6, shY + 2.4); ctx.quadraticCurveTo(hx - 0.6, hy + 2, hx + 0.4, hy - 1); ctx.fill();
  }
  // head
  ctx.fillStyle = rad(ctx, hx - 0.9, hy - 1.1, 0.3, headR * 1.3, [[0, shade(skin, 0.15)], [0.65, skin], [1, shade(skin, -0.15)]]);
  ctx.beginPath(); ctx.ellipse(hx, hy, headR, headR * 1.06, 0, 0, TAU); ctx.fill();
  // jaw / chin nudge forward
  ctx.beginPath(); ctx.ellipse(hx + headR * 0.45, hy + headR * 0.55, headR * 0.55, headR * 0.45, 0.3, 0, TAU); ctx.fill();
  // nose
  ctx.fillStyle = shade(skin, -0.05);
  ctx.beginPath(); ctx.moveTo(hx + headR * 0.92, hy - 0.2); ctx.quadraticCurveTo(hx + headR * 1.25, hy + 0.55, hx + headR * 0.9, hy + 0.75); ctx.fill();
  // ear
  ctx.fillStyle = shade(skin, -0.12); ellipse(ctx, hx - 0.5, hy + 0.3, 0.55, 0.8); ctx.fill();
  // eye, brow, mouth, blush
  ctx.fillStyle = INK; ellipse(ctx, hx + headR * 0.55, hy - 0.15, 0.32, 0.42); ctx.fill();
  ctx.fillStyle = '#fff'; circle(ctx, hx + headR * 0.6, hy - 0.3, 0.11); ctx.fill();
  ctx.strokeStyle = shade(hair, -0.1); ctx.lineWidth = 0.32; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(hx + headR * 0.3, hy - 1.05); ctx.lineTo(hx + headR * 0.8, hy - 1.0); ctx.stroke();
  ctx.strokeStyle = shade(skin, -0.4); ctx.lineWidth = 0.28;
  ctx.beginPath(); ctx.arc(hx + headR * 0.62, hy + 1.0, 0.55, 0.2, Math.PI * 0.8); ctx.stroke();
  ctx.fillStyle = 'rgba(230,110,100,0.25)'; circle(ctx, hx + headR * 0.35, hy + 0.7, 0.6); ctx.fill();
  if ((look.extras || []).includes('glasses')) {
    ctx.strokeStyle = '#3a3a44'; ctx.lineWidth = 0.25;
    circle(ctx, hx + headR * 0.6, hy - 0.1, 0.75); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(hx + headR * 0.6 - 0.75, hy - 0.2); ctx.lineTo(hx - 0.3, hy - 0.1); ctx.stroke();
  }
  if ((look.extras || []).includes('beard')) {
    ctx.fillStyle = hair; ctx.beginPath(); ctx.ellipse(hx + headR * 0.45, hy + headR * 0.75, headR * 0.6, headR * 0.45, 0.2, 0, Math.PI); ctx.fill();
  }
  // hair on top
  ctx.fillStyle = lin(ctx, hx - 2, hy - headR, hx + 2, hy, [[0, shade(hair, 0.15)], [1, shade(hair, -0.12)]]);
  const R = headR + 0.35;
  if (look.style === 'curly') {
    for (const [ax, ay, rr] of [[-0.9, -0.95, 1.5], [0.2, -1.3, 1.5], [1.3, -1.1, 1.2], [-1.7, -0.1, 1.3], [-1.6, 1.0, 1.1], [0.9, -0.6, 1.0]]) { circle(ctx, hx + ax * headR * 0.65, hy + ay * headR * 0.7, rr * headR * 0.42); ctx.fill(); }
  } else if (look.style !== 'bald') {
    ctx.beginPath();
    ctx.arc(hx, hy, R, Math.PI * 0.82, Math.PI * 1.93);
    ctx.quadraticCurveTo(hx + headR * 0.95, hy - headR * 0.25, hx + headR * 0.55, hy - headR * 0.32);
    ctx.quadraticCurveTo(hx - headR * 0.1, hy - headR * 0.2, hx - headR * 0.35, hy + headR * 0.15);
    ctx.quadraticCurveTo(hx - headR * 0.75, hy + headR * 0.55, hx - R * 0.95, hy + headR * 0.6);
    ctx.fill();
    if (look.style === 'bun') { circle(ctx, hx - headR * 0.75, hy - headR * 0.95, headR * 0.48); ctx.fill(); }
  } else {
    ctx.fillStyle = hair; ctx.beginPath(); ctx.ellipse(hx - headR * 0.55, hy + headR * 0.2, headR * 0.45, headR * 0.35, 0, 0, TAU); ctx.fill();
  }
  // hats
  const hc = look.hatColor || '#8a6a3a';
  if (look.hat === 'ranger') {
    ctx.fillStyle = shade(hc, -0.1); ellipse(ctx, hx, hy - headR * 0.75, headR * 1.75, headR * 0.28); ctx.fill();
    ctx.fillStyle = lin(ctx, hx - 2, 0, hx + 2, 0, [[0, shade(hc, 0.15)], [1, shade(hc, -0.15)]]);
    ctx.beginPath(); ctx.moveTo(hx - headR * 0.85, hy - headR * 0.78); ctx.lineTo(hx - headR * 0.55, hy - headR * 1.7); ctx.lineTo(hx, hy - headR * 1.45); ctx.lineTo(hx + headR * 0.55, hy - headR * 1.7); ctx.lineTo(hx + headR * 0.85, hy - headR * 0.78); ctx.fill();
    ctx.fillStyle = '#4a3420'; ctx.fillRect(hx - headR * 0.85, hy - headR * 1.0, headR * 1.7, headR * 0.22);
  } else if (look.hat === 'cap') {
    ctx.fillStyle = lin(ctx, 0, hy - R, 0, hy, [[0, shade(hc, 0.2)], [1, hc]]);
    ctx.beginPath(); ctx.arc(hx, hy - 0.2, R, Math.PI * 1.02, Math.PI * 1.98); ctx.fill();
    ctx.fillStyle = shade(hc, -0.15); ellipse(ctx, hx + headR * 1.05, hy - headR * 0.32, headR * 0.75, headR * 0.16, 0.1); ctx.fill();
  } else if (look.hat === 'sun') {
    ctx.fillStyle = '#e8cf8e'; ellipse(ctx, hx, hy - headR * 0.6, headR * 1.8, headR * 0.3); ctx.fill();
    ctx.beginPath(); ctx.arc(hx, hy - headR * 0.6, headR * 0.9, Math.PI, TAU); ctx.fill();
  }

  // ---- front leg & carrier & front arm ----
  drawLeg(la, false);
  if (babyFront) {
    const bc = look.carrier || '#3a8783';
    // straps
    ctx.strokeStyle = shade(bc, -0.2); ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(-1.2, shY + 0.2); ctx.quadraticCurveTo(1.5, shY + 2, 2.5, shY + 3.2); ctx.stroke();
    const bob = pose.babyBob || 0;
    const bx = 4.3, by = shY + 1.6 + bob;
    drawBabyBody(ctx, bx, by, 2.25, pose.baby, t * 3 + (pose.babyKick || 0));
    ctx.fillStyle = lin(ctx, 1.5, 0, 6.5, 0, [[0, shade(bc, 0.1)], [1, shade(bc, -0.25)]]);
    ctx.beginPath(); ctx.moveTo(1.6, shY + 3.0); ctx.quadraticCurveTo(4.3, shY + 1.8, 6.7, shY + 3.2); ctx.quadraticCurveTo(7.2, shY + 7.5, 4.6, shY + 8.6); ctx.quadraticCurveTo(2, shY + 8.4, 1.6, shY + 5.5); ctx.fill();
    ctx.fillStyle = shade(bc, 0.25); ctx.fillRect(2.4, shY + 3.2, 3.6, 0.45);
    if (pose.baby.blanket) {
      ctx.fillStyle = '#f4b6c2'; ctx.beginPath(); ctx.moveTo(1.4, shY + 3.2); ctx.quadraticCurveTo(4.3, shY + 2.0, 7, shY + 3.4); ctx.quadraticCurveTo(7.1, shY + 6, 4.4, shY + 6.6); ctx.quadraticCurveTo(1.6, shY + 6.4, 1.4, shY + 3.2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; for (let i = 0; i < 4; i++) { circle(ctx, 2.4 + i * 1.2, shY + 4 + (i % 2) * 1.2, 0.3); ctx.fill(); }
    }
    drawBabyHead(ctx, bx, by, 2.25, pose.babyFace, { ...pose.baby, dir: 1 });
    if (pose.feeding) { ctx.save(); ctx.translate(bx + 2.2, by + 1.6); ctx.rotate(-0.9); drawItemShape(ctx, 'bottle', 3.4); ctx.restore(); }
  }
  // camera / cane props
  if ((look.extras || []).includes('cane')) {
    ctx.strokeStyle = '#7a5032'; ctx.lineWidth = 0.7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(5.6, -1); ctx.lineTo(6.6, -hipY - 0.2); ctx.stroke();
  }
  const hand = arm(uaA, faA, false);
  if (pose.holding === 'camera' || (look.extras || []).includes('camera')) {
    const cx = (look.extras || []).includes('camera') && pose.holding !== 'camera' ? 1.6 : hand.fx, cy = (look.extras || []).includes('camera') && pose.holding !== 'camera' ? shY + 4.5 : hand.fy - 0.6;
    ctx.fillStyle = '#2b2b33'; ctx.beginPath(); ctx.roundRect(cx - 1.4, cy - 1, 2.8, 2, 0.4); ctx.fill();
    ctx.fillStyle = '#55555f'; circle(ctx, cx + 0.5, cy, 0.65); ctx.fill();
  }
  if (st === 'jump' && pose.baby) { /* baby giggles while airborne — face set by caller */ }
  ctx.restore();
}

// ------------------------------------------------------------------ ANIMALS
function quadruped(ctx, o) {
  // generic deer-like body. o: {len, sh(shoulder height), coat, belly, rump, phase, state, legW}
  const { len, sh } = o;
  const st = o.state || 'stand';
  const p = o.phase || 0;
  const hipX = -len * 0.36, shX = len * 0.34;
  const legL = sh * 0.62;
  const legs = [
    [shX, 0], [shX - 1.2, Math.PI], [hipX, Math.PI * 0.5], [hipX + 1.1, Math.PI * 1.5],
  ];
  const swing = st === 'walk' ? 0.35 : st === 'run' ? 0.75 : 0;
  const drawL = (lx, off, back) => {
    const a = swing * Math.sin(p + off);
    const k = swing ? Math.max(0, Math.cos(p + off)) * (st === 'run' ? 0.9 : 0.5) : 0;
    const top = -sh * 0.56;
    const kx = lx + Math.sin(a) * legL * 0.5, ky = top + Math.cos(a) * legL * 0.5;
    const fx = kx + Math.sin(a - k * (lx > 0 ? -1 : 1)) * legL * 0.52, fy = ky + Math.cos(a - k) * legL * 0.52;
    const col = back ? shade(o.coat, -0.2) : o.coat;
    limb(ctx, lx, top, kx, ky, o.legW * 1.3, col);
    limb(ctx, kx, ky, fx, Math.min(-0.2, fy), o.legW, col);
    ctx.fillStyle = '#2a1f1a'; ellipse(ctx, fx + 0.2, Math.min(-0.2, fy) + 0.1, o.legW * 0.6, 0.35); ctx.fill();
  };
  shadowBlob(ctx, 0, 0, len * 0.55);
  drawL(legs[1][0], legs[1][1], true); drawL(legs[3][0], legs[3][1], true);
  // body
  const by = -sh * 0.78;
  ctx.fillStyle = lin(ctx, 0, by - sh * 0.3, 0, by + sh * 0.3, [[0, shade(o.coat, 0.12)], [0.6, o.coat], [1, o.belly]]);
  ctx.beginPath(); ctx.ellipse(0, by, len * 0.48, sh * 0.27, -0.03, 0, TAU); ctx.fill();
  // rump patch & tail
  ctx.fillStyle = o.rump; ctx.beginPath(); ctx.ellipse(-len * 0.44, by - sh * 0.02, len * 0.1, sh * 0.18, 0, 0, TAU); ctx.fill();
  if (o.tail) { ctx.fillStyle = o.tail; ellipse(ctx, -len * 0.53, by - sh * 0.08, len * 0.05, sh * 0.1, 0.4); ctx.fill(); }
  drawL(legs[0][0], legs[0][1], false); drawL(legs[2][0], legs[2][1], false);
  return { by };
}

export function drawDeer(ctx, x, y, dir, s = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
  const coat = '#8d765f';
  const { by } = quadruped(ctx, { len: 20, sh: 15, coat, belly: '#cbb79c', rump: '#efe7da', tail: '#2a1f1a', phase: s.phase, state: s.state, legW: 1.1 });
  const graze = s.state === 'graze' ? Math.max(0, Math.sin((s.t || 0) * 0.8) + 0.3) : 0;
  const nx = 7.2, ny = by - 1.5;
  const hx = 11.5 - graze * 0.5, hy = by - 6.5 + graze * 12;
  ctx.strokeStyle = coat; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(nx, ny); ctx.quadraticCurveTo(nx + 2.5, (ny + hy) / 2 - 1, hx - 0.6, hy + 0.4); ctx.stroke();
  ctx.strokeStyle = '#d8ccb8'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(nx + 1.3, ny + 1.2); ctx.quadraticCurveTo(nx + 3, (ny + hy) / 2 + 0.6, hx, hy + 1.6); ctx.stroke();
  // head
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(0.35 + graze * 0.9);
  ctx.fillStyle = lin(ctx, 0, -1.5, 0, 1.5, [[0, shade(coat, 0.1)], [1, shade(coat, -0.1)]]);
  ctx.beginPath(); ctx.ellipse(1.2, 0, 2.7, 1.45, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#2a1f1a'; circle(ctx, 3.7, 0.2, 0.55); ctx.fill();
  ctx.fillStyle = '#d8ccb8'; ellipse(ctx, 2.6, 0.9, 1, 0.4); ctx.fill();
  ctx.fillStyle = INK; circle(ctx, 0.9, -0.4, 0.38); ctx.fill();
  // big mule ears
  const flick = Math.sin((s.t || 0) * 3) > 0.95 ? 0.3 : 0;
  ctx.fillStyle = shade(coat, -0.05);
  ellipse(ctx, -1.2, -1.9, 0.9, 2.1, -0.9 - flick); ctx.fill();
  ellipse(ctx, -0.4, -2.2, 0.85, 2.0, -0.4); ctx.fill();
  ctx.fillStyle = '#d7a99a'; ellipse(ctx, -0.4, -2.2, 0.4, 1.4, -0.4); ctx.fill();
  ctx.restore();
  ctx.restore();
}

export function drawPronghorn(ctx, x, y, dir, s = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
  const coat = '#c88b4f';
  const { by } = quadruped(ctx, { len: 17, sh: 13, coat, belly: '#f3e9d6', rump: '#f6efe2', tail: null, phase: s.phase, state: s.state, legW: 0.95 });
  // white belly band
  ctx.fillStyle = '#f3e9d6'; ctx.beginPath(); ctx.ellipse(0, by + 2.4, 7, 1.3, 0, 0, Math.PI); ctx.fill();
  const hx = 9.6, hy = by - 6;
  ctx.strokeStyle = coat; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(6, by - 1); ctx.lineTo(hx - 0.5, hy + 0.5); ctx.stroke();
  ctx.strokeStyle = '#f3e9d6'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(7.2, by - 2.2); ctx.lineTo(8, by - 2.8); ctx.stroke();
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(0.45);
  ctx.fillStyle = coat; ctx.beginPath(); ctx.ellipse(1, 0, 2.3, 1.2, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#2a1f1a'; ctx.beginPath(); ctx.ellipse(2.4, 0.2, 1, 0.8, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = INK; circle(ctx, 0.6, -0.3, 0.35); ctx.fill();
  ctx.strokeStyle = '#1e1612'; ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(0, -0.8); ctx.quadraticCurveTo(-0.5, -3.2, 0.6, -3.6); ctx.moveTo(0.6, -0.9); ctx.quadraticCurveTo(0.3, -2.8, 1.4, -3.1); ctx.stroke();
  ctx.fillStyle = coat; ellipse(ctx, -1, -1.2, 0.5, 1.1, -0.6); ctx.fill();
  ctx.restore();
  ctx.restore();
}

export function drawPrairieDog(ctx, x, y, dir, state = 'up') {
  ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
  // burrow mound
  ctx.fillStyle = lin(ctx, 0, -2, 0, 0.5, [[0, '#c9a07a'], [1, '#9a7452']]);
  ctx.beginPath(); ctx.ellipse(0, 0.2, 6, 1.8, 0, Math.PI, TAU); ctx.fill();
  ctx.fillStyle = '#3a2618'; ellipse(ctx, 0, -0.4, 2, 0.6); ctx.fill();
  if (state !== 'hidden') {
    const coat = '#c99e70';
    const up = state === 'up';
    ctx.fillStyle = lin(ctx, -2, 0, 2, 0, [[0, shade(coat, 0.1)], [1, shade(coat, -0.15)]]);
    if (up) {
      ellipse(ctx, 0, -3.8, 2.1, 3.4); ctx.fill();
      ctx.fillStyle = '#ecdcc0'; ellipse(ctx, 0.7, -3.4, 1.1, 2.4); ctx.fill();
      ctx.fillStyle = coat; circle(ctx, 0.5, -7.6, 1.7); ctx.fill();
      ctx.fillStyle = shade(coat, -0.2); circle(ctx, 2.0, -7.3, 0.35); ctx.fill();
      ctx.fillStyle = INK; circle(ctx, 1.1, -8.0, 0.32); ctx.fill();
      ctx.fillStyle = coat; ellipse(ctx, -0.4, -9, 0.4, 0.5); ctx.fill();
      ctx.fillStyle = shade(coat, -0.1); ellipse(ctx, 1.4, -5, 0.5, 0.8, 0.5); ctx.fill();
    } else {
      ellipse(ctx, 0, -1.3, 2.3, 1.4); ctx.fill();
      ctx.fillStyle = coat; circle(ctx, 1.3, -2.2, 1.4); ctx.fill();
      ctx.fillStyle = INK; circle(ctx, 1.9, -2.6, 0.3); ctx.fill();
    }
  }
  ctx.restore();
}

export function drawSquirrel(ctx, x, y, dir, beg = false, t = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
  shadowBlob(ctx, 0, 0, 3.5);
  const coat = '#b98a5a', mantle = '#d39a4c';
  // tail
  ctx.fillStyle = lin(ctx, -5, -6, -2, 0, [[0, '#8a6a4a'], [1, coat]]);
  ctx.beginPath(); ctx.moveTo(-1.8, -1.2); ctx.quadraticCurveTo(-6.5, -2 + Math.sin(t * 3) * 0.5, -4.5, -6.8); ctx.quadraticCurveTo(-2.6, -5.4, -1.2, -2.2); ctx.fill();
  if (beg) {
    ctx.fillStyle = coat; ellipse(ctx, 0, -3, 1.8, 2.8); ctx.fill();
    ctx.fillStyle = mantle; circle(ctx, 0.5, -6.3, 1.5); ctx.fill();
    ctx.fillStyle = '#f2e6d0'; ellipse(ctx, 0.6, -2.8, 0.8, 1.8); ctx.fill();
    ctx.fillStyle = INK; circle(ctx, 1.1, -6.6, 0.28); ctx.fill();
  } else {
    ctx.fillStyle = coat; ellipse(ctx, 0, -1.7, 3, 1.7); ctx.fill();
    ctx.fillStyle = '#f2e6d0'; ctx.fillRect(-2, -2.4, 3.6, 0.45);
    ctx.fillStyle = '#2a1f1a'; ctx.fillRect(-2, -2.85, 3.6, 0.35); ctx.fillRect(-2, -1.95, 3.6, 0.3);
    ctx.fillStyle = mantle; circle(ctx, 2.6, -2.6, 1.35); ctx.fill();
    ctx.fillStyle = INK; circle(ctx, 3.1, -2.9, 0.26); ctx.fill();
  }
  ctx.restore();
}

export function drawLizard(ctx, x, y, dir, t = 0, run = false) {
  ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
  const c = '#b9a07c';
  const w = run ? Math.sin(t * 30) * 0.6 : 0;
  ctx.strokeStyle = c; ctx.lineWidth = 0.6; ctx.lineCap = 'round';
  for (const [lx, s] of [[1.6, 1], [-1.6, -1]]) { ctx.beginPath(); ctx.moveTo(lx, -0.6); ctx.lineTo(lx + 0.9 * s + w, 0); ctx.stroke(); }
  ctx.fillStyle = lin(ctx, 0, -1.5, 0, 0, [[0, shade(c, 0.1)], [1, shade(c, -0.15)]]);
  ctx.beginPath(); ctx.ellipse(0, -0.8, 3, 1.3, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-2.6, -0.7); ctx.quadraticCurveTo(-5, -0.4, -6, -0.2); ctx.lineTo(-2.6, -0.2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(3.3, -0.8, 1.2, 0.8, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = shade(c, -0.35);
  for (let i = -2; i <= 2; i++) { circle(ctx, i * 0.9, -1.6, 0.22); ctx.fill(); }
  ctx.fillStyle = INK; circle(ctx, 3.6, -1.1, 0.2); ctx.fill();
  ctx.restore();
}

export function drawButterfly(ctx, x, y, dir, col, t) {
  ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
  const f = 0.25 + Math.abs(Math.sin(t * 14)) * 0.75;
  ctx.fillStyle = col;
  ctx.save(); ctx.scale(1, f);
  ellipse(ctx, -0.6, -1.4, 1.5, 1.9, -0.3); ctx.fill();
  ellipse(ctx, -0.4, 0.8, 1.1, 1.3, 0.3); ctx.fill();
  ctx.fillStyle = shade(col, -0.45);
  ellipse(ctx, -1.2, -2.4, 0.6, 0.6); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = '#2a1a16'; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.moveTo(-0.2, 1); ctx.lineTo(0.3, -1.2); ctx.stroke();
  ctx.restore();
}

function bird(ctx, x, y, dir, o) {
  ctx.save(); ctx.translate(x, y); ctx.scale(dir * (o.size || 1), o.size || 1);
  if (o.fly) {
    const f = Math.sin(o.t * (o.flapSpeed || 10));
    ctx.fillStyle = shade(o.body, -0.15);
    ctx.beginPath(); ctx.moveTo(-0.5, -0.3); ctx.quadraticCurveTo(-2, -4 * f, -4.5 * (o.wing || 1), -5 * f); ctx.quadraticCurveTo(-1, -1.5 * f, 1, 0); ctx.fill();
    ctx.fillStyle = o.body; ellipse(ctx, 0, 0, 3.4, 1.15); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(-5.5, -0.9); ctx.lineTo(-5.5, 0.9); ctx.fill();
    circle(ctx, 3.1, -0.4, 1.0); ctx.fill();
    ctx.fillStyle = o.beak || '#3a3a3a'; ctx.beginPath(); ctx.moveTo(3.9, -0.6); ctx.lineTo(5.4, -0.2); ctx.lineTo(3.9, 0.1); ctx.fill();
    ctx.fillStyle = o.body;
    ctx.beginPath(); ctx.moveTo(-0.5, -0.2); ctx.quadraticCurveTo(-1.5, -4 * f + 1, -3.8 * (o.wing || 1), -4.6 * f + 1.5); ctx.quadraticCurveTo(-0.4, -1 * f, 1.5, 0); ctx.fill();
  } else {
    shadowBlob(ctx, 0, 0, 2.5, 0.2);
    ctx.strokeStyle = '#4a3a30'; ctx.lineWidth = 0.35; ctx.beginPath(); ctx.moveTo(-0.3, -1); ctx.lineTo(-0.4, 0); ctx.moveTo(0.5, -1); ctx.lineTo(0.6, 0); ctx.stroke();
    ctx.fillStyle = shade(o.body, -0.1); ctx.beginPath(); ctx.moveTo(-1.5, -2.2); ctx.lineTo(-4.5 * (o.tailLen || 1), -3.2 - (o.cock || 0)); ctx.lineTo(-4.2 * (o.tailLen || 1), -2.4 - (o.cock || 0) * 0.6); ctx.lineTo(-1.2, -1.6); ctx.fill();
    ctx.fillStyle = lin(ctx, 0, -4, 0, -1, [[0, shade(o.body, 0.15)], [1, o.belly || o.body]]);
    ellipse(ctx, 0, -2.4, 2.4, 1.6, -0.25); ctx.fill();
    ctx.fillStyle = o.head || o.body; circle(ctx, 1.9, -4.0, 1.25); ctx.fill();
    if (o.crest) { ctx.beginPath(); ctx.moveTo(1.2, -4.8); ctx.lineTo(0.6, -7.2); ctx.lineTo(2.4, -4.9); ctx.fill(); }
    ctx.fillStyle = o.beak || '#3a3a3a'; ctx.beginPath(); ctx.moveTo(2.9, -4.3); ctx.lineTo(3.9 + (o.longBill || 0), -3.9 + (o.longBill ? 0.4 : 0)); ctx.lineTo(2.9, -3.7); ctx.fill();
    ctx.fillStyle = '#111'; circle(ctx, 2.3, -4.3, 0.28); ctx.fill();
    if (o.throat) { ctx.fillStyle = o.throat; ellipse(ctx, 2, -3.1, 0.8, 0.6); ctx.fill(); }
    ctx.fillStyle = shade(o.body, -0.2); ellipse(ctx, -0.5, -2.6, 1.5, 0.9, -0.3); ctx.fill();
  }
  ctx.restore();
}
export const drawRaven = (ctx, x, y, dir, t, fly = true) => bird(ctx, x, y, dir, { fly, t, body: '#1f1d2a', beak: '#2a2830', wing: 1.2, size: 1.15, flapSpeed: 6 });
export const drawJay = (ctx, x, y, dir, t, fly = false) => bird(ctx, x, y, dir, { fly, t, body: '#3d6fc2', head: '#1e2333', crest: true, belly: '#4a7ccc', tailLen: 1.2, size: 0.85 });
export const drawWren = (ctx, x, y, dir, t) => bird(ctx, x, y, dir, { fly: false, t, body: '#8a5a3a', belly: '#a06a42', throat: '#f6f0e4', longBill: 0.8, cock: 2.2, tailLen: 0.7, size: 0.7, beak: '#5a4a3a' });
export const drawBluebird = (ctx, x, y, dir, t, fly = false) => bird(ctx, x, y, dir, { fly, t, body: '#6fb6e8', belly: '#b8dcf2', size: 0.75, beak: '#2a2a2a', flapSpeed: 14 });
export const drawFalcon = (ctx, x, y, dir, t) => bird(ctx, x, y, dir, { fly: true, t, body: '#5d6676', beak: '#e0b040', wing: 1.6, size: 1.0, flapSpeed: 4 });

export function drawOwl(ctx, x, y, t) {
  ctx.save(); ctx.translate(x, y);
  const body = '#8a6a4a';
  ctx.fillStyle = lin(ctx, 0, -9, 0, 0, [[0, shade(body, 0.1)], [1, shade(body, -0.15)]]);
  ctx.beginPath(); ctx.ellipse(0, -4.5, 3.3, 4.5, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-2.6, -7.2); ctx.lineTo(-2.2, -10.2); ctx.lineTo(-0.9, -7.8); ctx.fill();
  ctx.beginPath(); ctx.moveTo(2.6, -7.2); ctx.lineTo(2.2, -10.2); ctx.lineTo(0.9, -7.8); ctx.fill();
  ctx.fillStyle = '#c9a77c'; ellipse(ctx, 0, -6.6, 2.6, 1.9); ctx.fill();
  ctx.fillStyle = '#efe4cc'; ellipse(ctx, 0, -3, 1.7, 2.3); ctx.fill();
  ctx.strokeStyle = 'rgba(90,60,40,0.6)'; ctx.lineWidth = 0.25;
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-1.2, -4.4 + i * 0.9); ctx.lineTo(1.2, -4.2 + i * 0.9); ctx.stroke(); }
  const blink = (t % 4) < 0.15;
  for (const ex of [-1.05, 1.05]) {
    if (blink) { ctx.strokeStyle = INK; ctx.lineWidth = 0.3; ctx.beginPath(); ctx.moveTo(ex - 0.6, -6.8); ctx.lineTo(ex + 0.6, -6.8); ctx.stroke(); }
    else { ctx.fillStyle = '#f2c14e'; circle(ctx, ex, -6.8, 0.75); ctx.fill(); ctx.fillStyle = INK; circle(ctx, ex, -6.8, 0.38); ctx.fill(); }
  }
  ctx.fillStyle = '#4a3a2a'; ctx.beginPath(); ctx.moveTo(-0.3, -6.2); ctx.lineTo(0.3, -6.2); ctx.lineTo(0, -5.4); ctx.fill();
  ctx.restore();
}

export function drawFox(ctx, x, y, dir, s = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
  const coat = '#8a8a8e';
  // bushy tail
  ctx.fillStyle = lin(ctx, -12, 0, -5, 0, [[0, '#222'], [0.25, '#6a6a6e'], [1, coat]]);
  ctx.beginPath(); ctx.moveTo(-5, -6); ctx.quadraticCurveTo(-11, -6 + Math.sin((s.t || 0) * 2), -12.5, -3); ctx.quadraticCurveTo(-9, -3.4, -5, -4.4); ctx.fill();
  const { by } = quadruped(ctx, { len: 12, sh: 8.5, coat, belly: '#f0e6d8', rump: '#c9783a', tail: null, phase: s.phase, state: s.state, legW: 0.75 });
  const hx = 7.2, hy = by - 2.2;
  ctx.fillStyle = '#c9783a'; ellipse(ctx, 4.5, by, 2, 1.5); ctx.fill();
  ctx.fillStyle = coat; ctx.beginPath(); ctx.ellipse(hx, hy, 1.9, 1.5, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(hx + 1, hy - 0.6); ctx.lineTo(hx + 3.4, hy + 0.3); ctx.lineTo(hx + 1, hy + 0.9); ctx.fill();
  ctx.fillStyle = '#f0e6d8'; ctx.beginPath(); ctx.moveTo(hx + 0.4, hy + 0.5); ctx.lineTo(hx + 3.2, hy + 0.4); ctx.lineTo(hx + 0.8, hy + 1.3); ctx.fill();
  ctx.fillStyle = coat; ctx.beginPath(); ctx.moveTo(hx - 1.2, hy - 0.8); ctx.lineTo(hx - 0.8, hy - 3.2); ctx.lineTo(hx + 0.4, hy - 1); ctx.fill();
  ctx.fillStyle = '#111'; circle(ctx, hx + 3.3, hy + 0.35, 0.3); ctx.fill();
  ctx.fillStyle = '#f2c14e'; circle(ctx, hx + 0.6, hy - 0.4, 0.3); ctx.fill();
  ctx.restore();
}

// ------------------------------------------------------------------ ITEMS
/** Draw an item centred at (0,0) fitting a box of size s. */
export function drawItemShape(ctx, id, s) {
  const u = s / 10;
  ctx.save(); ctx.scale(u, u);
  const R = (x, y, w, h, r, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); };
  const E = (x, y, rx, ry, c, rot = 0) => { ctx.fillStyle = c; ellipse(ctx, x, y, rx, ry, rot); ctx.fill(); };
  const G = (x0, y0, x1, y1, a, b) => lin(ctx, x0, y0, x1, y1, [[0, a], [1, b]]);
  switch (id) {
    case 'bottle': R(-1, -5, 2, 1.6, 0.6, '#d9a066'); R(-2.2, -3.6, 4.4, 1, 0.3, '#7aa6d8'); R(-2.4, -2.8, 4.8, 7.4, 1.4, G(-2, 0, 2, 0, '#ffffff', '#dfe6ee')); R(-1.8, -0.6, 3.6, 4.6, 0.8, '#fffaf0'); break;
    case 'diaper': ctx.fillStyle = G(0, -3, 0, 3, '#ffffff', '#dfe8f5'); ctx.beginPath(); ctx.moveTo(-4.5, -3); ctx.lineTo(4.5, -3); ctx.quadraticCurveTo(3.8, 3.5, 0, 3.6); ctx.quadraticCurveTo(-3.8, 3.5, -4.5, -3); ctx.fill(); R(-4.5, -3.4, 2, 1.4, 0.4, '#9ac8f0'); R(2.5, -3.4, 2, 1.4, 0.4, '#9ac8f0'); break;
    case 'blanket': R(-4.5, -3.5, 9, 7, 1, G(-4, -4, 4, 4, '#f7c4cf', '#e99aac')); ctx.fillStyle = 'rgba(255,255,255,0.55)'; for (let i = -3; i <= 3; i += 2) for (let j = -2; j <= 2; j += 2) { circle(ctx, i, j, 0.5); ctx.fill(); } break;
    case 'sunhat': E(0, 1.5, 4.8, 1.4, '#e8cf8e'); ctx.fillStyle = G(0, -3, 0, 1, '#f6dc96', '#d9b462'); ctx.beginPath(); ctx.arc(0, 1, 2.8, Math.PI, 0); ctx.fill(); R(-2.8, -0.2, 5.6, 0.9, 0.2, '#e07a7a'); break;
    case 'rattle': ctx.strokeStyle = '#7aa6d8'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(-3.5, 4); ctx.lineTo(0, 0); ctx.stroke(); E(1.6, -1.8, 2.8, 2.8, G(0, -4, 3, 1, '#ffe08a', '#f2a93c')); E(1.6, -1.8, 1.2, 1.2, '#e86a6a'); break;
    case 'teether': ctx.strokeStyle = '#7fd1b9'; ctx.lineWidth = 1.6; circle(ctx, -0.8, -0.8, 2.6); ctx.stroke(); E(2.6, 2.6, 1.6, 1.2, '#f4b6c2', 0.8); break;
    case 'pacifier': E(0, 0, 3.6, 2.4, '#7aa6d8'); E(0, 0, 2.2, 1.4, '#bfe0ff'); E(0, 2.6, 0.9, 1.3, '#f2c14e'); ctx.strokeStyle = '#7aa6d8'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.arc(0, -2.6, 1.4, Math.PI, 0); ctx.stroke(); break;
    case 'sock': ctx.fillStyle = '#fbd3dc'; ctx.beginPath(); ctx.moveTo(-1.8, -4.5); ctx.lineTo(1.6, -4.5); ctx.lineTo(1.6, 1.2); ctx.quadraticCurveTo(4.4, 1.6, 4, 3.8); ctx.lineTo(-1.2, 3.8); ctx.quadraticCurveTo(-2.4, 2, -1.8, -4.5); ctx.fill(); R(-1.8, -4.5, 3.4, 1.2, 0.3, '#e86a6a'); break;
    case 'granola': R(-4.5, -1.8, 9, 3.6, 0.8, G(0, -2, 0, 2, '#d6a060', '#a06a32')); ctx.fillStyle = '#6a3a1a'; for (let i = -3; i <= 3; i += 1.5) { circle(ctx, i, -0.3 + (i % 3 ? 0.6 : -0.2), 0.4); ctx.fill(); } R(-4.6, -0.5, 1.2, 1, 0.2, '#d4504f'); R(3.4, -0.5, 1.2, 1, 0.2, '#d4504f'); break;
    case 'cookie': E(0, 0, 4, 3.8, G(-3, -3, 3, 3, '#e6b070', '#b8763a')); ctx.fillStyle = '#4a2a1a'; for (const [a, b] of [[-1.5, -1], [1.2, -1.8], [0.4, 1.2], [-1.8, 1.6], [2, 0.8]]) { circle(ctx, a, b, 0.55); ctx.fill(); } break;
    case 'water': R(-1, -5, 2, 1.4, 0.4, '#d8d8d8'); R(-2.2, -3.8, 4.4, 8.6, 1.2, G(-2, 0, 2, 0, '#7ab8e8', '#3e88c8')); R(-1.6, -1, 1, 4.4, 0.4, 'rgba(255,255,255,0.45)'); break;
    case 'wrapper': ctx.fillStyle = '#d4504f'; ctx.beginPath(); ctx.moveTo(-4.8, -1.6); ctx.lineTo(-2.4, -0.8); ctx.lineTo(2.4, -1.2); ctx.lineTo(4.8, -2.2); ctx.lineTo(4, 0.2); ctx.lineTo(4.8, 2.2); ctx.lineTo(2.4, 1.2); ctx.lineTo(-2.4, 1.4); ctx.lineTo(-4.8, 2.2); ctx.lineTo(-4, 0); ctx.fill(); R(-1.6, -0.6, 3.2, 1.3, 0.3, '#f2c14e'); break;
    case 'can': R(-2.4, -4.2, 4.8, 8.4, 1, G(-2.4, 0, 2.4, 0, '#7cc08a', '#3f8a52')); R(-2.4, -4.2, 4.8, 0.9, 0.4, '#c8c8d0'); R(-2.4, 3.3, 4.8, 0.9, 0.4, '#c8c8d0'); R(-1.6, -1.5, 3.2, 2.2, 0.4, '#f2ead2'); break;
    case 'plastic': R(-0.8, -5, 1.6, 1.2, 0.3, '#3e88c8'); ctx.fillStyle = 'rgba(200,230,250,0.85)'; ctx.beginPath(); ctx.roundRect(-2.2, -3.8, 4.4, 8.6, 1.4); ctx.fill(); R(-2.2, -0.6, 4.4, 1.8, 0, '#5aa0d8'); break;
    case 'pinecone': for (let i = 0; i < 6; i++) { const yy = -4 + i * 1.4, w = 1.6 + Math.sin(i / 5 * Math.PI) * 2; E(0, yy, w, 1.1, i % 2 ? '#8a5a32' : '#a8703e'); } E(0, -4.6, 0.7, 0.6, '#5e3d22'); break;
    case 'bluefeather': case 'blackfeather': {
      const c = id === 'bluefeather' ? '#3d6fc2' : '#24212f', c2 = id === 'bluefeather' ? '#9ec2f0' : '#5a5670';
      ctx.save(); ctx.rotate(-0.7); ctx.fillStyle = G(-1.5, 0, 1.5, 0, c2, c); ctx.beginPath(); ctx.ellipse(0, -0.5, 1.6, 4.6, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#e8e2d8'; ctx.lineWidth = 0.35; ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(0, -5); ctx.stroke(); ctx.restore(); break;
    }
    case 'stone': E(0, 0.5, 4.2, 3.1, G(-3, -3, 3, 3, '#f0a888', '#c8604a')); E(-1.3, -0.8, 1.2, 0.6, 'rgba(255,255,255,0.35)', -0.3); break;
    case 'whitestone': E(0, 0.5, 4, 3, G(-3, -3, 3, 3, '#ffffff', '#cfc2b0')); E(1, 1, 0.5, 0.4, '#b8a898'); break;
    case 'mitten': ctx.fillStyle = G(0, -4, 0, 4, '#e86a6a', '#b83a3a'); ctx.beginPath(); ctx.moveTo(-2.6, 4); ctx.lineTo(-2.8, -2); ctx.quadraticCurveTo(-2.4, -4.6, 0.4, -4.4); ctx.quadraticCurveTo(2.8, -4, 2.6, -1); ctx.lineTo(3.8, -1.6); ctx.quadraticCurveTo(4.6, 0, 2.6, 1.2); ctx.lineTo(2.6, 4); ctx.fill(); R(-2.8, 2.6, 5.6, 1.8, 0.4, '#f2ead2'); break;
    case 'sunglasses': ctx.strokeStyle = '#2b2b33'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(-1, -0.6); ctx.lineTo(1, -0.6); ctx.stroke(); E(-2.4, 0, 2, 1.6, G(0, -2, 0, 2, '#3a4a6a', '#1a2030')); E(2.4, 0, 2, 1.6, G(0, -2, 0, 2, '#3a4a6a', '#1a2030')); break;
    case 'map': R(-4.5, -3.5, 9, 7, 0.5, '#f2e2b0'); ctx.strokeStyle = '#d4504f'; ctx.lineWidth = 0.5; ctx.setLineDash([0.8, 0.6]); ctx.beginPath(); ctx.moveTo(-3.5, 2); ctx.quadraticCurveTo(0, -3, 3.5, 1); ctx.stroke(); ctx.setLineDash([]); E(-1.5, 1.5, 1.2, 0.8, '#86b66f'); E(2.2, -1.6, 1, 0.7, '#7aa6d8'); break;
    case 'dino': ctx.fillStyle = G(0, -4, 0, 4, '#9ad07a', '#5f9f4a'); ctx.beginPath(); ctx.ellipse(0, 0.8, 3, 2, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.moveTo(1.8, 0); ctx.quadraticCurveTo(3, -4, 4.2, -4); ctx.lineTo(4.4, -2.8); ctx.quadraticCurveTo(3.4, -2.6, 3, 0.6); ctx.fill(); ctx.beginPath(); ctx.moveTo(-2.6, 0.4); ctx.lineTo(-4.8, 1.4); ctx.lineTo(-2.4, 2); ctx.fill(); R(-2, 2.2, 1, 2, 0.3, '#5f9f4a'); R(1, 2.2, 1, 2, 0.3, '#5f9f4a'); break;
    case 'lenscap': E(0, 0, 4.2, 4.2, '#2b2b33'); E(0, 0, 3.2, 3.2, '#3e3e48'); ctx.fillStyle = '#ddd'; ctx.font = '1.8px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('LENS', 0, 0.6); break;
    case 'watch': E(0, -4.4, 0.9, 0.8, '#e0b040'); E(0, 0.4, 4, 4, G(-3, -3, 3, 3, '#f2d070', '#b8902a')); E(0, 0.4, 3.1, 3.1, '#fbf6e8'); ctx.strokeStyle = '#2b2b33'; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.moveTo(0, 0.4); ctx.lineTo(0, -1.8); ctx.moveTo(0, 0.4); ctx.lineTo(1.4, 1.2); ctx.stroke(); break;
    case 'whistle': ctx.fillStyle = G(0, -2, 0, 2, '#e0e0e8', '#9a9aa4'); ctx.beginPath(); ctx.roundRect(-4, -1.6, 6, 3.2, 1.4); ctx.fill(); E(2.2, 0.4, 2.2, 2.2, '#b8b8c0'); E(-2.6, -0.4, 0.7, 0.7, '#3a3a44'); break;
    case 'postcard': R(-4.8, -3.4, 9.6, 6.8, 0.4, '#fbf6e8'); R(-4.2, -2.8, 5.4, 5.6, 0.2, G(0, -3, 0, 3, '#7ec3ef', '#f2b07a')); ctx.fillStyle = '#d9764f'; ctx.beginPath(); ctx.moveTo(-4.2, 2.8); ctx.lineTo(-3, -0.6); ctx.lineTo(-2, 1); ctx.lineTo(-1, -1.5); ctx.lineTo(0.4, 2.8); ctx.fill(); ctx.fillStyle = '#b0a090'; for (let i = 0; i < 3; i++) ctx.fillRect(2, -1.8 + i * 1.4, 2.2, 0.35); break;
    case 'badge': E(0, -0.5, 4, 4, G(-3, -4, 3, 3, '#f2d070', '#b8902a')); E(0, -0.5, 2.8, 2.8, '#3f6f4a'); ctx.fillStyle = '#f6ecda'; ctx.beginPath(); ctx.moveTo(0, -2.6); ctx.lineTo(1.6, 0.8); ctx.lineTo(-1.6, 0.8); ctx.fill(); R(-2.4, 3, 1.4, 2, 0.2, '#d4504f'); R(1, 3, 1.4, 2, 0.2, '#d4504f'); break;
    case 'flowercrown': ctx.strokeStyle = '#5f9f6a'; ctx.lineWidth = 0.9; ellipse(ctx, 0, 0.8, 4.4, 2.2); ctx.stroke(); for (const [a, c] of [[-3.4, '#f4b6c2'], [-1.2, '#9d74c0'], [1.2, '#f2c14e'], [3.4, '#f4b6c2']]) E(a, -0.6 + Math.abs(a) * 0.25, 1.1, 1.1, c); break;
    case 'carving': ctx.fillStyle = G(0, -4, 0, 4, '#d6a060', '#9a6232'); ctx.beginPath(); ctx.ellipse(-0.5, 0.6, 3, 1.6, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.moveTo(1.8, 0); ctx.lineTo(3.4, -3); ctx.lineTo(4.4, -2.6); ctx.lineTo(3.2, 0.4); ctx.fill(); ctx.fillRect(-3, 1.4, 0.8, 3); ctx.fillRect(1.4, 1.4, 0.8, 3); ellipse(ctx, 3.2, -3.6, 0.5, 1.2, -0.5); ctx.fill(); break;
    case 'diary': R(-3.8, -4.4, 7.6, 8.8, 0.4, G(0, -4, 0, 4, '#f6ecd0', '#e2cf9e')); ctx.fillStyle = '#7a6a5a'; for (let i = 0; i < 5; i++) ctx.fillRect(-2.8, -3 + i * 1.5, 5.4 - (i === 4 ? 2 : 0), 0.3); ctx.fillStyle = 'rgba(160,110,60,0.25)'; circle(ctx, 2.4, 2.6, 1.2); ctx.fill(); break;
    default: E(0, 0, 3, 3, '#ccc');
  }
  ctx.restore();
}
