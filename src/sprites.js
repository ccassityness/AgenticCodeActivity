// Pixel-art sprites defined as text grids. Each character maps to a palette colour;
// '.' is transparent. Grids are "baked" into small canvases once at load time.

// ---------- colour helpers ----------
export function hexToRgb(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}
export function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex(A.map((v, i) => v + (B[i] - v) * t));
}
/** t < 0 darkens, t > 0 lightens */
export const shade = (c, t) => (t < 0 ? mix(c, '#000000', -t) : mix(c, '#ffffff', t));

// ---------- baking ----------
export function bake(rows, pal) {
  const h = rows.length;
  const w = Math.max(...rows.map(r => r.length));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  for (let j = 0; j < h; j++) {
    const row = rows[j];
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === '.' || ch === ' ') continue;
      const col = pal[ch];
      if (!col) continue;
      x.fillStyle = col;
      x.fillRect(i, j, 1, 1);
    }
  }
  return c;
}
function flipCanvas(c) {
  const f = document.createElement('canvas');
  f.width = c.width; f.height = c.height;
  const x = f.getContext('2d');
  x.translate(c.width, 0);
  x.scale(-1, 1);
  x.drawImage(c, 0, 0);
  return f;
}
/** A sprite has a right-facing (r) and left-facing (l) canvas. */
export function makeSprite(rows, pal) {
  const r = bake(rows, pal);
  return { r, l: flipCanvas(r), w: r.width, h: r.height };
}
/** Draw with (x, y) = bottom-centre of the sprite. */
export function drawSprite(ctx, spr, x, y, facing = 1) {
  ctx.drawImage(facing >= 0 ? spr.r : spr.l, Math.round(x - spr.w / 2), Math.round(y - spr.h));
}

function overlay(rows, pts, ch, force = false) {
  const out = rows.slice();
  for (const [x, y] of pts) {
    const row = out[y];
    if (!row || x >= row.length) continue;
    if (!force && row[x] !== '.') continue;
    out[y] = row.slice(0, x) + ch + row.slice(x + 1);
  }
  return out;
}
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

// ---------- people (14 x 25, facing right) ----------
const FACE = [
  '..hhhssssss...',
  '..hhsssssess..',
  '..hhsssssssss.',
  '...hssssssrs..',
  '....sssssss...',
  '.....SSSS.....',
];
const HEADS = {
  short: ['....hhhhhh....', '...hhhhhhhh...', '..hhhhhhhhhh..', ...FACE],
  long: ['....hhhhhh....', '...hhhhhhhh...', '..hhhhhhhhhh..', ...FACE],
  bun: ['.hhh..hhhh....', '.hhhhhhhhhh...', '..hhhhhhhhhh..', ...FACE],
  curly: ['..h.hh.hh.h...', '.hhhhhhhhhhh..', 'hhhhhhhhhhhhh.', '.hhhhsssssss..', '.hhhsssssess..',
    '..hhsssssssss.', '...hssssssrs..', '....sssssss...', '.....SSSS.....'],
  ranger: ['.....TTTT.....', '....TnnnnT....', '.TTTTTTTTTTTT.', ...FACE],
  cap: ['....TTTTT.....', '...TTTTTTT....', '..TTTTTTTTTTT.', ...FACE],
  bald: ['..............', '....ssssss....', '...hssssssss..', ...FACE],
};
const TORSO = [
  '....kccccck...',
  '...kcccccccc..',
  '...kcccCcccc..',
  '...kcccCcccc..',
  '...kcccCcccc..',
  '...KcccCsscc..',
  '....cccccc....',
  '....pppppp....',
];
const LEGS = {
  idle: ['....ppp.ppp...', '....ppp.ppp...', '....ppp.ppp...', '....PPP.PPP...',
    '....ppp.ppp...', '....ppp.ppp...', '....bbb.bbbb..', '....bbbb.bbbb.'],
  walkA: ['....pppppp....', '...ppp..ppp...', '...ppp...ppp..', '..PPP.....PPP.',
    '..ppp.....ppp.', '.ppp.......pp.', '.bbb.......bbb', 'bbbb......bbbb'],
  walkB: ['....pppppp....', '....pppppp....', '.....pppp.....', '.....PPPP.....',
    '.....pppp.....', '.....pppp.....', '....bbbbbb....', '....bbbb......'],
  sit: ['....pppppppp..', '....pppppppp..', '....PPPPPPpp..', '..........pp..',
    '..........pp..', '..........bbb.', '..........bbbb', '..............'],
};

export const PEOPLE_OPTIONS = {
  skin: ['#f6d5bc', '#e8b48f', '#c98d63', '#9a6644', '#6b4530'],
  hair: ['#2b1d16', '#6b4226', '#b5762f', '#e8c57a', '#a33b24', '#9a9a9a'],
  style: ['short', 'long', 'bun', 'curly'],
  shirt: ['#3d5a80', '#d1495b', '#edae49', '#66a182', '#9b7bb8', '#f4f1de'],
  carrier: ['#4f8a8b', '#e07a5f', '#81b29a', '#f2cc8f', '#9b7bb8'],
};

export function personPalette(o) {
  const shirt = o.shirt;
  const carrier = o.carrier ?? shirt;
  return {
    h: o.hair, s: o.skin, S: shade(o.skin, -0.18), e: '#2a1f1d', r: shade(o.skin, -0.3),
    c: shirt, C: shade(shirt, -0.22),
    p: o.pants ?? '#5b6a7a', P: shade(o.pants ?? '#5b6a7a', -0.22),
    b: o.boots ?? '#5a3b2a',
    k: carrier, K: shade(carrier, -0.3),
    T: o.hat ?? '#8a6a3a', n: o.band ?? '#4a3420',
    x: '#2b2b33', W: '#7a5532', g: o.pack ?? '#a0522d',
  };
}

/**
 * Build a set of animation frames for a person.
 * opts: { style, carrier (bool), extras: ['camera','cane','pack'] }
 */
export function buildPerson(palOpts, opts = {}) {
  const pal = personPalette(palOpts);
  if (!opts.carrier) { pal.k = pal.c; pal.K = pal.C; }
  const head = HEADS[opts.style || 'short'] || HEADS.short;
  const frames = {};
  for (const [name, legs] of Object.entries(LEGS)) {
    let rows = [...head, ...TORSO, ...legs];
    if (opts.style === 'long') rows = overlay(rows, [[2, 8], [3, 8], [4, 8], [2, 9], [3, 9], [2, 10], [2, 11], [2, 12]], 'h');
    for (const ex of opts.extras || []) {
      if (ex === 'camera') rows = overlay(rows, [[11, 3], [12, 3], [11, 4], [12, 4], [13, 4], [12, 5], [10, 6], [11, 6]], 'x', true);
      if (ex === 'cane') rows = overlay(rows, range(13, 24).map(y => [12, y]), 'W');
      if (ex === 'pack') rows = overlay(rows, [...range(10, 15).map(y => [1, y]), ...range(9, 15).map(y => [2, y]), ...range(9, 15).map(y => [3, y])], 'g', true);
    }
    frames[name] = makeSprite(rows, pal);
  }
  return frames;
}

const KID = [
  '...hhhh...',
  '..hhhhhh..',
  '.hhhsssss.',
  '.hhsssess.',
  '..hssssrs.',
  '...sssss..',
  '..cccccc..',
  '.cccccccc.',
  '.cccccccs.',
  '..cccccc..',
  '..pppppp..',
  '..pp..pp..',
  '..pp..pp..',
  '..pp..pp..',
  '..bb..bbb.',
];
const KID_WALK = [
  ...KID.slice(0, 11),
  '.pp....pp.',
  '.pp....pp.',
  'pp......pp',
  'bb......bbb',
];
export function buildKid(palOpts) {
  const pal = personPalette(palOpts);
  return { idle: makeSprite(KID, pal), walkA: makeSprite(KID_WALK, pal), walkB: makeSprite(KID, pal) };
}

// ---------- baby (8 x 8, in carrier) ----------
const BABY = {
  content: ['..bbbb..', '.bbbbbb.', 'bbssssbb', '.sesses.', '.rssssr.', '..smms..', 'kksssskk', 'kKkkkkKk'],
  giggle: ['..bbbb..', '.bbbbbb.', 'bbssssbb', '.eessee.', '.rssssr.', '..sMMs..', 'kksssskk', 'kKkkkkKk'],
  sleepy: ['..bbbb..', '.bbbbbb.', 'bbssssbb', '.eessee.', '.rssssr.', '...MM...', 'kksssskk', 'kKkkkkKk'],
  napping: ['..bbbb..', '.bbbbbb.', 'bbssssbb', '.eessee.', '.rssssr.', '...ms...', 'kksssskk', 'kKkkkkKk'],
  fussy: ['..bbbb..', '.bbbbbb.', 'bbssssbb', '.sesses.', '.tssssr.', '..sMMs..', 'kksssskk', 'kKkkkkKk'],
};
export function buildBaby(o) {
  const skin = shade(o.skin, 0.06);
  const pal = {
    b: shade(o.carrier, 0.45), s: skin, e: '#2a1f1d', r: '#f09a8a', m: '#b5524a', M: '#7a2a2a',
    t: '#7fc8f8', k: o.carrier, K: shade(o.carrier, -0.3),
  };
  const out = {};
  for (const [k, rows] of Object.entries(BABY)) out[k] = makeSprite(rows, pal);
  return out;
}


// ---------- animals ----------
const DEER_PAL = { d: '#9a7b5f', D: '#5e4634', w: '#efe6d8', e: '#1e1612', n: '#1e1612' };
const DEER_STAND = [
  '..............D...D.',
  '.............DdD.DdD',
  '..............DdddD.',
  '...............dded.',
  '...............ddddn',
  '..............wdddd.',
  '..............wdd...',
  '.dddddddddddddddd...',
  'wddddddddddddddd....',
  'wdddddddddddddddd...',
  '.dddddddddddddd.....',
  '..dD.dD.....dD.dD...',
  '..dd.dd.....dd.dd...',
  '..dd.d......d..dd...',
  '..dd.d......d..dd...',
  '..DD.D......D..DD...',
];
const DEER_WALK = [
  ...DEER_STAND.slice(0, 11),
  '..dD..dD...dD...dD..',
  '..dd...dd..dd....dd.',
  '.dd.....d.dd.....d..',
  '.dd.....d.d......d..',
  '.DD.....D.D......D..',
];
const DEER_GRAZE = [
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '.ddddddddddddddd.D.D',
  'wddddddddddddddddDdD',
  'wdddddddddddddddddd.',
  '.ddddddddddddddd.ded',
  '..dD.dD.....dD.dD.dd',
  '..dd.dd.....dd.dd..n',
  '..dd.d......d..dd...',
  '..dd.d......d..dd...',
  '..DD.D......D..DD...',
];

const PRONG_PAL = { t: '#c98a4b', w: '#f4ead8', k: '#2a1f1d', e: '#1e1612' };
const PRONG_STAND = [
  '..............k.k.',
  '..............k.k.',
  '.............tttt.',
  '.............tektk',
  '.............wttt.',
  '............wtt...',
  '.tttttttttttttt...',
  'wttttttttttttt....',
  'wwwwwwwwwwwwwt....',
  '.wwwwwwwwwwww.....',
  '..tt.tt....tt.tt..',
  '..tt.tt....tt.tt..',
  '..t..t......t..t..',
  '..k..k......k..k..',
];
const PRONG_RUN = [
  ...PRONG_STAND.slice(0, 10),
  '.tt...tt..tt...tt.',
  'tt.....tttt.....tt',
  't.......tt.......t',
  'k.......kk.......k',
];

const PD_PAL = { p: '#c9a174', P: '#8a6a48', w: '#efdcc0', e: '#1e1612', n: '#5a3b2a' };
const PD_UP = ['..ppp.', '.ppepn', '..ppp.', '.pwwp.', '.pwwp.', '.pwwp.', 'pppppp', 'PP..PP'];
const PD_DOWN = ['......', '......', '..ppp.', '.ppepn', '.ppppp', 'pppppp', 'pppppp', 'PP..PP'];

const RAVEN_PAL = { k: '#1d1b26', K: '#3a3650', b: '#4a4652', e: '#9aa0b8' };
const RAVEN_UP = ['...kk.....', '....kk....', '.....kk...', 'kkkkkkkkkb', '.kkkkkkk..', '..........'];
const RAVEN_DOWN = ['..........', '..........', 'kkkkkkkkkb', '.kkkkkkk..', '....kk....', '...kk.....'];
const RAVEN_PERCH = ['..kk..', '.kkekb', '.kkkk.', 'kkKkk.', 'kkKk..', '.k.k..', '.b.b..'];

const JAY_PAL = { K: '#1d2233', j: '#3f6fc0', J: '#2a4a8a', w: '#dfe8f5', b: '#2a2a2a' };
const JAY_PERCH = ['..K....', '..KK...', '.KKwKb.', '.KKKK..', 'jjjjj..', 'jJjjjj.', 'JJ.jj..', '...bb..'];
const JAY_HOP = ['.......', '..K....', '..KK...', '.KKwKb.', '.KKKK..', 'jjjjj..', 'jJjjjj.', 'JJ.bb..'];
const JAY_FLY = ['..jj...', '...jj..', 'KKjjjjb', '.jJjj..', '..jj...', '.jj....'];

const OWL_PAL = { o: '#8a6a48', O: '#4a3420', y: '#f2c14e', w: '#e8dcc6', b: '#5a3b2a' };
const OWL = ['o....o', 'oooooo', 'oyooyo', 'ooOOoo', '.owwo.', '.owwo.', '.oooo.', '..bb..'];
const OWL_BLINK = ['o....o', 'oooooo', 'oOooOo', 'ooOOoo', '.owwo.', '.owwo.', '.oooo.', '..bb..'];

// ---------- objects ----------
const BENCH = [
  'wwwwwwwwwwwwwwww',
  'WWWWWWWWWWWWWWWW',
  '.W............W.',
  'wwwwwwwwwwwwwwww',
  'WWWWWWWWWWWWWWWW',
  '.W............W.',
  '.W............W.',
  '.W............W.',
];
const SIGN = [
  'WWWWWWWWWWWWWW',
  'WwwwwwwwwwwwwW',
  'WwllllllllwwwW',
  'WwwwwwwwwwwwwW',
  'WwllllllllllwW',
  'WwllllllwwwwwW',
  'WwwwwwwwwwwwwW',
  'WWWWWWWWWWWWWW',
  '......WW......',
  '......WW......',
  '......WW......',
  '......WW......',
  '......WW......',
  '.....WWWW.....',
];
const FLOWERS = [
  '.f...f..',
  'fFf.fFf.',
  '.f..ff.f',
  '.g...g.F',
  '.g.f.g.g',
  'gg.g.ggg',
];
const PINECONE = ['.w.', 'bWb', 'WbW', 'bWb', '.W.'];

export const SPR = {};
export function initSprites() {
  SPR.bottle = makeSprite(['.n.', 'www', 'wmw', 'wmw', 'www'], { n: '#d9a066', w: '#f4f1ea', m: '#fffdf5' });
  SPR.deer = { stand: makeSprite(DEER_STAND, DEER_PAL), walk: makeSprite(DEER_WALK, DEER_PAL), graze: makeSprite(DEER_GRAZE, DEER_PAL) };
  SPR.pronghorn = { stand: makeSprite(PRONG_STAND, PRONG_PAL), run: makeSprite(PRONG_RUN, PRONG_PAL) };
  SPR.prairieDog = { up: makeSprite(PD_UP, PD_PAL), down: makeSprite(PD_DOWN, PD_PAL) };
  SPR.raven = { up: makeSprite(RAVEN_UP, RAVEN_PAL), down: makeSprite(RAVEN_DOWN, RAVEN_PAL), perch: makeSprite(RAVEN_PERCH, RAVEN_PAL) };
  SPR.jay = { perch: makeSprite(JAY_PERCH, JAY_PAL), hop: makeSprite(JAY_HOP, JAY_PAL), fly: makeSprite(JAY_FLY, JAY_PAL) };
  SPR.owl = { idle: makeSprite(OWL, OWL_PAL), blink: makeSprite(OWL_BLINK, OWL_PAL) };
  SPR.bench = makeSprite(BENCH, { w: '#b07a4a', W: '#6e4a2c' });
  SPR.sign = makeSprite(SIGN, { w: '#a8743f', W: '#5e3d22', l: '#f0d9b5' });
  SPR.flowers = {
    paintbrush: makeSprite(FLOWERS, { f: '#e2453c', F: '#ff8a5c', g: '#5f8a4a' }),
    penstemon: makeSprite(FLOWERS, { f: '#6a6fd1', F: '#b39ddb', g: '#5f8a4a' }),
    sego: makeSprite(FLOWERS, { f: '#f7f1e6', F: '#e9c46a', g: '#6f9a55' }),
  };
  SPR.pinecone = makeSprite(PINECONE, { w: '#d9b98a', b: '#8a5a32', W: '#5e3d22' });
}
