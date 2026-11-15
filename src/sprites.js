// Pixel-art sprites defined as text grids. Each character maps to a palette colour;
// '.' is transparent. Grids are "baked" into small canvases once at load time, with a
// warm dark outline added automatically for that cozy, chunky look.

export const OUTLINE = '#3a2420';

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
/** Bake a grid into a canvas. outline: colour string, or null for none. */
export function bake(rows, pal, outline = OUTLINE) {
  const h = rows.length;
  const w = Math.max(...rows.map(r => r.length));
  const p = outline ? 1 : 0;
  const c = document.createElement('canvas');
  c.width = w + p * 2; c.height = h + p * 2;
  const x = c.getContext('2d');
  const filled = (i, j) => {
    if (j < 0 || j >= h) return false;
    const ch = rows[j][i];
    return ch !== undefined && ch !== '.' && ch !== ' ' && !!pal[ch];
  };
  if (outline) {
    x.fillStyle = outline;
    for (let j = -1; j <= h; j++) {
      for (let i = -1; i <= w; i++) {
        if (filled(i, j)) continue;
        if (filled(i - 1, j) || filled(i + 1, j) || filled(i, j - 1) || filled(i, j + 1)) x.fillRect(i + p, j + p, 1, 1);
      }
    }
  }
  for (let j = 0; j < h; j++) {
    const row = rows[j];
    for (let i = 0; i < row.length; i++) {
      if (!filled(i, j)) continue;
      x.fillStyle = pal[row[i]];
      x.fillRect(i + p, j + p, 1, 1);
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
export function makeSprite(rows, pal, outline = OUTLINE) {
  const r = bake(rows, pal, outline);
  return { r, l: flipCanvas(r), w: r.width, h: r.height, pad: outline ? 1 : 0 };
}
/** Draw with (x, y) = bottom-centre of the sprite (feet on y). */
export function drawSprite(ctx, spr, x, y, facing = 1) {
  ctx.drawImage(facing >= 0 ? spr.r : spr.l, Math.round(x - spr.w / 2), Math.round(y - spr.h + spr.pad));
}
/** Canvas → data URL scaled up crisply (for DOM icons/portraits). */
export function toDataURL(canvas, scale = 4, bg = null) {
  const c = document.createElement('canvas');
  c.width = canvas.width * scale; c.height = canvas.height * scale;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  if (bg) { x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height); }
  x.drawImage(canvas, 0, 0, c.width, c.height);
  return c.toDataURL();
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

// ---------- people (16 x 28, 3/4 view facing right) ----------
const HAIR_TOP = {
  short: ['....hhhhhhh.....', '...hhhhhhhhhh...', '..hhhhhhhhhhhh..', '..hhhhhhhhhhhhh.', '..hhhhsshhshhhh.'],
  long: ['....hhhhhhh.....', '...hhhhhhhhhh...', '..hhhhhhhhhhhh..', '..hhhhhhhhhhhhh.', '..hhhhsshhshhhh.'],
  bun: ['.......hhhh.....', '...hhhhHHhhhh...', '..hhhhhhhhhhhh..', '..hhhhhhhhhhhhh.', '..hhhhsshhshhhh.'],
  curly: ['...hh.hhh.hh....', '..hhhhhhhhhhhh..', '.hhhhhhhhhhhhhh.', '.hhhhhhhhhhhhhhh', '.hhhhhsshhshhhhh'],
  ranger: ['......TTTT......', '.....TnnnnT.....', '..TTTTTTTTTTTT..', '..hhhhhhhhhhhhh.', '..hhhsssssssshh.'],
  cap: ['....TTTTTTT.....', '...TTTTTTTTT....', '..TTTTTTTTTTTTTT', '..hhhhhhhhhhhhh.', '..hhhhsshhshhhh.'],
  bald: ['................', '....ssssssss....', '...ssssssssss...', '..hsssssssssssh.', '..hsssssssssss..'],
};
const FACE = [
  '..hhhssssssssss.',
  '..hhsssesssess..',
  '..hSsssesssess..',
  '...ssrssssssrs..',
  '....sssssmsss...',
  '.....sssssss....',
  '.......SSS......',
];
const TORSO = [
  '....kcccccck....',
  '...kcccccccccc..',
  '..ckcccccccccc..',
  '..cKccccccccCc..',
  '..cKccccccccCc..',
  '..ssKccccccccss.',
  '....cccccccc....',
  '....zzzzzzzz....',
  '....pppppppp....',
];
const LEGS = {
  idle: ['....pppp.ppp....', '....pppp.ppp....', '....PPPP.PPP....', '....pppp.ppp....',
    '....pppp.ppp....', '...bbbbb.bbbb...', '...bbbbb.bbbbb..'],
  walkA: ['....pppppppp....', '...pppp..pppp...', '..PPPP....PPPP..', '..ppp......ppp..',
    '.ppp........ppp.', '.bbbb.......bbbb', 'bbbb........bbbb'],
  walkB: ['....pppppppp....', '.....pppppp.....', '.....PPPPPP.....', '......pppp......',
    '......pppp......', '.....bbbbbb.....', '.....bbbbbbb....'],
  sit: ['....pppppppppp..', '....pppppppppp..', '....PPPPPPPPpp..', '............pp..',
    '............pp..', '...........bbbb.', '...........bbbbb'],
};

export const PEOPLE_OPTIONS = {
  skin: ['#f8d8bf', '#eab38c', '#c98d63', '#9a6644', '#6b4530'],
  hair: ['#3a2418', '#7a4a26', '#c27c34', '#ecc66e', '#b0422a', '#a8a2a0'],
  style: ['short', 'long', 'bun', 'curly'],
  shirt: ['#3f6aa0', '#d4504f', '#f0a93c', '#5f9f6a', '#9d74c0', '#f2ead2'],
  carrier: ['#3f8f8c', '#e47c5a', '#86b66f', '#f2c56b', '#a07cc4'],
};

export function personPalette(o) {
  const shirt = o.shirt;
  const carrier = o.carrier ?? shirt;
  const pants = o.pants ?? '#55667a';
  return {
    h: o.hair, H: shade(o.hair, -0.25), s: o.skin, S: shade(o.skin, -0.15), e: '#2a1a1a', r: mix(o.skin, '#e86a6a', 0.35),
    m: shade(o.skin, -0.35),
    c: shirt, C: shade(shirt, -0.2),
    p: pants, P: shade(pants, -0.2),
    b: o.boots ?? '#6a4128', z: o.belt ?? '#5a3a22',
    k: carrier, K: shade(carrier, -0.28),
    T: o.hat ?? '#8a6a3a', n: o.band ?? '#4a3420',
    x: '#2b2b33', W: '#8a5a32', g: o.pack ?? '#a0522d', G: shade(o.pack ?? '#a0522d', -0.25),
  };
}

/**
 * Build animation frames for a person.
 * opts: { style, carrier (bool), extras: ['camera','cane','pack','glasses'] }
 */
export function buildPerson(palOpts, opts = {}) {
  const pal = personPalette(palOpts);
  if (!opts.carrier) { pal.k = pal.c; pal.K = pal.C; }
  const head = [...(HAIR_TOP[opts.style || 'short'] || HAIR_TOP.short), ...FACE];
  const frames = {};
  for (const [name, legs] of Object.entries(LEGS)) {
    let rows = [...head, ...TORSO, ...legs];
    if (opts.style === 'long') {
      rows = overlay(rows, [...range(6, 16).map(y => [2, y]), ...range(7, 16).map(y => [1, y]), ...range(9, 13).map(y => [14, y])], 'h');
      rows = overlay(rows, range(8, 16).map(y => [2, y]), 'H', true);
    }
    for (const ex of opts.extras || []) {
      if (ex === 'camera') rows = overlay(rows, [[10, 6], [11, 6], [12, 6], [13, 6], [10, 7], [11, 7], [12, 7], [13, 7], [14, 7], [12, 8]], 'x', true);
      if (ex === 'cane') rows = overlay(rows, range(17, 27).map(y => [15, y]), 'W');
      if (ex === 'glasses') rows = overlay(rows, [[6, 6], [7, 6], [8, 6], [10, 6], [11, 6], [12, 6], [9, 6]], 'x', true);
      if (ex === 'pack') rows = overlay(rows, [...range(12, 19).map(y => [0, y]), ...range(11, 19).map(y => [1, y]), ...range(11, 19).map(y => [2, y])], 'g', true),
        rows = overlay(rows, range(12, 19).map(y => [0, y]), 'G', true);
    }
    frames[name] = makeSprite(rows, pal);
  }
  frames.headRows = 12;
  return frames;
}

const KID = [
  '...hhhhhh...',
  '..hhhhhhhh..',
  '.hhhhhhhhhh.',
  '.hhsssssssh.',
  '.hsesssess..',
  '.hsesssess..',
  '..srssssr...',
  '...sssms....',
  '...cccccc...',
  '..cccccccc..',
  '..scccccccs.',
  '...cccccc...',
  '...pppppp...',
  '...pp..pp...',
  '...pp..pp...',
  '..bbb..bbb..',
];
const KID_WALK = [...KID.slice(0, 12), '...pppppp...', '..pp....pp..', '.pp......pp.', 'bbb......bbb'];
export function buildKid(palOpts) {
  const pal = personPalette(palOpts);
  return { idle: makeSprite(KID, pal), walkA: makeSprite(KID_WALK, pal), walkB: makeSprite(KID, pal) };
}

// ---------- baby (10 x 10, in carrier) ----------
const BABY_TOP = ['...bbbb...', '.bbbbbbbb.', 'bbbBbbbbbb', '.ssssssss.'];
const BABY_BOT = ['..ssssss..', 'kkkkkkkkkk', 'kKkkkkkkKk'];
const BABY = {
  content: [...BABY_TOP, '.sesssses.', '.sesssses.', '.rssmmssr.', ...BABY_BOT],
  giggle: [...BABY_TOP, '.seessees.', '.ssssssss.', '.rsMMMMsr.', ...BABY_BOT],
  sleepy: [...BABY_TOP, '.ssssssss.', '.seessees.', '.rsssMssr.', ...BABY_BOT],
  napping: [...BABY_TOP, '.ssssssss.', '.seessees.', '.rssmsssr.', ...BABY_BOT],
  fussy: [...BABY_TOP, '.sesssses.', '.tesssset.', '.rssMMssr.', ...BABY_BOT],
  crying: [...BABY_TOP, '.seessees.', 'tssssssst.', '.tsMMMMst.', ...BABY_BOT],
  wow: [...BABY_TOP, '.sesssses.', '.sesssses.', '.rsssMssr.', ...BABY_BOT],
};
export function buildBaby(o) {
  const skin = shade(o.skin, 0.06);
  const bonnet = shade(o.carrier, 0.45);
  const pal = {
    b: bonnet, B: shade(bonnet, 0.4), s: skin, e: '#2a1a1a', r: '#f3988a', m: '#b5524a', M: '#7a2a2a',
    t: '#7fc8f8', k: o.carrier, K: shade(o.carrier, -0.3),
  };
  const out = {};
  for (const [k, rows] of Object.entries(BABY)) out[k] = makeSprite(rows, pal);
  return out;
}

// ---------- animals ----------
const DEER_PAL = { d: '#a5825f', D: '#6a4e38', w: '#f1e8da', e: '#1e1612', n: '#1e1612', E: '#e0b0a0' };
const DEER_STAND = [
  '.............DD..DD.',
  '.............DED.DED',
  '..............DdddD.',
  '..............ddded.',
  '..............ddddn',
  '..............wdddd.',
  '..............wdd...',
  '.dddddddddddddddd...',
  'wddddddddddddddd....',
  'wdddddddddddddddd...',
  '.dddDDDDDDDDDDd.....',
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
  '.dddDDDDDDDDDDdd.ded',
  '..dD.dD.....dD.dD.dd',
  '..dd.dd.....dd.dd..n',
  '..dd.d......d..dd...',
  '..dd.d......d..dd...',
  '..DD.D......D..DD...',
];
const PRONG_PAL = { t: '#cf8f4f', w: '#f6ecda', k: '#2a1f1d', e: '#1e1612' };
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
const PRONG_RUN = [...PRONG_STAND.slice(0, 10), '.tt...tt..tt...tt.', 'tt.....tttt.....tt', 't.......tt.......t', 'k.......kk.......k'];

const PD_PAL = { p: '#cfa676', P: '#8a6a48', w: '#f2e0c4', e: '#1e1612', n: '#5a3b2a' };
const PD_UP = ['..ppp.', '.ppepn', '..ppp.', '.pwwp.', '.pwwp.', '.pwwp.', 'pppppp', 'PP..PP'];
const PD_DOWN = ['......', '......', '..ppp.', '.ppepn', '.ppppp', 'pppppp', 'pppppp', 'PP..PP'];

const RAVEN_PAL = { k: '#24212f', K: '#454060', b: '#5a5662', e: '#a0a6c0' };
const RAVEN_UP = ['...kk.....', '....kk....', '.....kk...', 'kkkkkkkkkb', '.kkKkkkk..', '..........'];
const RAVEN_DOWN = ['..........', '..........', 'kkkkkkkkkb', '.kkKkkkk..', '....kk....', '...kk.....'];

const JAY_PAL = { K: '#22283a', j: '#4a7ccc', J: '#2f5a9a', w: '#e4ecf8', b: '#2a2a2a' };
const JAY_PERCH = ['..K....', '..KK...', '.KKwKb.', '.KKKK..', 'jjjjj..', 'jJjjjj.', 'JJ.jj..', '...bb..'];
const JAY_HOP = ['.......', '..K....', '..KK...', '.KKwKb.', '.KKKK..', 'jjjjj..', 'jJjjjj.', 'JJ.bb..'];
const JAY_FLY = ['..jj...', '...jj..', 'KKjjjjb', '.jJjj..', '..jj...', '.jj....'];

const OWL_PAL = { o: '#8f6e4c', O: '#4a3420', y: '#f2c14e', w: '#ecdfc8', b: '#5a3b2a' };
const OWL = ['o....o', 'oooooo', 'oyooyo', 'ooOOoo', '.owwo.', '.owwo.', '.oooo.', '..bb..'];
const OWL_BLINK = ['o....o', 'oooooo', 'oOooOo', 'ooOOoo', '.owwo.', '.owwo.', '.oooo.', '..bb..'];

const SQUIRREL_PAL = { t: '#a07a52', o: '#d0904c', s: '#3a2a22', w: '#f6ecda', e: '#1e1612', n: '#5a3b2a' };
const SQUIRREL = ['.tt.......', 'ttt....oo.', 'tt....oooe', '.t..owswoon', '..ooowswoo.', '..oooooooo.', '..o.o..o.o.'];
const SQUIRREL_UP = ['.tt...oo..', 'ttt..oooe.', 'tt...ooon.', '.t...owo..', '..t.owswo.', '...oowswo.', '...oooooo.', '...o.o.o..'];
const LIZARD_PAL = { h: '#c2a57e', H: '#8a6f4e', e: '#1e1612', d: '#e8d4b0' };
const LIZARD = ['....HhHh...', 'hhhhhdhdhhe', '...h...h...'];
const LIZARD_B = ['....HhHh...', 'hhhhhdhdhhe', '....h.h....'];
const BUTTERFLY_A = ['pp.pp', 'pPbPp', '.pbp.', '..b..'];
const BUTTERFLY_B = ['.....', '.pbp.', '.PbP.', '..b..'];

// ---------- objects ----------
const BENCH = [
  'wwwwwwwwwwwwwwwwww',
  'WWWWWWWWWWWWWWWWWW',
  '.W..............W.',
  'wwwwwwwwwwwwwwwwww',
  'WWWWWWWWWWWWWWWWWW',
  '.W..............W.',
  '.W..............W.',
  '.W..............W.',
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
const FLOWERS = ['.f...f..', 'fFf.fFf.', '.f..ff.f', '.g...g.F', '.g.f.g.g', 'gg.g.ggg'];
const TRASHCAN = ['.gggggggg.', 'gGGGGGGGGg', '.gggggggg.', '.gGgGgGgg.', '.gGgGgGgg.', '.gGgGgGgg.', '.gGgGgGgg.', '.gGgGgGgg.', '.gggggggg.'];
const BUILDING = [
  '....RRRRRRRRRRRRRR....',
  '..RRRRRRRRRRRRRRRRRR..',
  'RRRRRRRRRRRRRRRRRRRRRR',
  '.wwwwwwwwwwwwwwwwwwww.',
  '.wWwwwwwwwwwwwwwwwWww.',
  '.wWwwddddwwwwwwwwwWww.',
  '.wWwwdDDdwwlllllwwWww.',
  '.wWwwddddwwlLLLlwwWww.',
  '.wWwwdDDdwwlllllwwWww.',
  '.wWwwddddwwwwwwwwwWww.',
  '.wWwwdddDwwwwwwwwwWww.',
  'ssssssssssssssssssssss',
];
const FOUNTAIN = ['..bb..', '.bWWb.', '..ss..', '..ss..', '..ss..', '..ss..', '.ssss.'];

// ---------- items (8x8 icons) ----------
export const ITEM_ART = {
  bottle: [['..nn....', '..nn....', '.wwww...', '.wmmw...', '.wmmw...', '.wmmw...', '.wwww...', '........'], { n: '#d9a066', w: '#f4f1ea', m: '#fffdf5' }],
  diaper: [['........', 'wwwwwwww', 'wWwwwwWw', '.wwwwww.', '..wwww..', '...ww...', '........', '........'], { w: '#f7f4ff', W: '#9ac8f0' }],
  blanket: [['qQqQqQq.', 'QqQqQqQq', 'qQqQqQqQ', 'QqQqQqQq', 'qQqQqQqQ', '.QqQqQqQ', '........', '........'], { q: '#f4b6c2', Q: '#fbe3e8' }],
  sunhat: [['..yyyy..', '.yyyyyy.', '.yrrrry.', 'yyyyyyyy', '........', '........', '........', '........'], { y: '#f3d38a', r: '#e07a7a' }],
  rattle: [['....yyy.', '...yrrry', '...yryry', '...yrrry', '..b.yyy.', '.b......', 'b.......', '........'], { y: '#f2c14e', r: '#e86a6a', b: '#7aa6d8' }],
  teether: [['.gggg...', 'gg..gg..', 'g....g..', 'gg..gg..', '.ggggb..', '.....bb.', '......bb', '........'], { g: '#7fd1b9', b: '#f4b6c2' }],
  pacifier: [['..bbbb..', '.bppppb.', '.bppppb.', '..bbbb..', '...yy...', '...yy...', '........', '........'], { b: '#7aa6d8', p: '#bfe0ff', y: '#f2c14e' }],
  sock: [['..www...', '..wrw...', '..www...', '..www...', '..wwwww.', '..wwwww.', '........', '........'], { w: '#fbe3e8', r: '#e86a6a' }],
  granola: [['........', 'oooooooo', 'oBoBoBoo', 'oooooooo', 'yyyyyyyy', '........', '........', '........'], { o: '#c98a4b', B: '#7a4a26', y: '#e86a6a' }],
  water: [['..ww....', '.bbbb...', '.bBBb...', '.bBBb...', '.bBBb...', '.bBBb...', '.bbbb...', '........'], { w: '#dddddd', b: '#5aa0d8', B: '#9ad0f8' }],
  wrapper: [['........', '.r.rrr.r', 'rrryyrrr', '.rrrrrr.', 'r.rrr.r.', '........', '........', '........'], { r: '#d4504f', y: '#f2c14e' }],
  can: [['..ssss..', '.gggggg.', '.gwwwwg.', '.gggggg.', '.gwwwwg.', '.gggggg.', '..ssss..', '........'], { s: '#c0c0c8', g: '#5f9f6a', w: '#f2ead2' }],
  plastic: [['...bb...', '...ww...', '..wwww..', '..wbbw..', '..wwww..', '..wbbw..', '..wwww..', '........'], { w: '#d8eef8', b: '#5aa0d8' }],
  pinecone: [['...w....', '..bWb...', '..WbW...', '.bWbWb..', '..WbW...', '..bWb...', '...W....', '........'], { w: '#d9b98a', b: '#8a5a32', W: '#5e3d22' }],
  bluefeather: [['......jj', '.....jJj', '....jJj.', '...jJj..', '..jJj...', '.jj.....', 'w.......', '........'], { j: '#4a7ccc', J: '#22283a', w: '#ddd' }],
  blackfeather: [['......kk', '.....kKk', '....kKk.', '...kKk..', '..kKk...', '.kk.....', 'w.......', '........'], { k: '#24212f', K: '#5a5670', w: '#ddd' }],
  stone: [['........', '..ssss..', '.sSsssW.', 'ssssssss', 'sssssSss', '.ssssss.', '........', '........'], { s: '#e39572', S: '#c8604a', W: '#fff0e0' }],
  whitestone: [['........', '..wwww..', '.wWwwwW.', 'wwwwwwww', 'wwwgwwww', '.wwwwww.', '........', '........'], { w: '#f3e6d4', W: '#ffffff', g: '#c8b8a8' }],
  mitten: [['.rr.....', 'rrr.rr..', 'rrrrrr..', 'rrrrrr..', '.rrrrr..', '.wwwww..', '.wwwww..', '........'], { r: '#d4504f', w: '#f2ead2' }],
  sunglasses: [['........', '........', 'kkkkkkkk', 'kbbkkbbk', '.kbk.kbk', '........', '........', '........'], { k: '#2b2b33', b: '#5a8ab8' }],
  map: [['yyyyyyyy', 'ygyyybyy', 'yggyybby', 'yyrrryyy', 'yybyyggy', 'ybbyyygy', 'yyyyyyyy', '........'], { y: '#f2e2b0', g: '#86b66f', b: '#7aa6d8', r: '#d4504f' }],
  dino: [['....gg..', '...gegg.', '...gggg.', 'g..ggg..', 'gggggg..', '.gggg...', '.g..g...', '........'], { g: '#86b66f', e: '#1e1612' }],
  lenscap: [['..kkkk..', '.kKKKKk.', 'kKkkkkKk', 'kKkwwkKk', 'kKkkkkKk', '.kKKKKk.', '..kkkk..', '........'], { k: '#2b2b33', K: '#55555f', w: '#dddddd' }],
  watch: [['...yy...', '..yyyy..', '.ywwwwy.', '.ywkwwy.', '.ywwkwy.', '.ywwwwy.', '..yyyy..', '........'], { y: '#e0b040', w: '#fbf6e8', k: '#2b2b33' }],
  whistle: [['........', '...yyyyy', '..yyyyyy', '.yyyKyy.', '.yyyyy..', '..y.....', '.y......', '........'], { y: '#c0c0c8', K: '#2b2b33' }],
  cookie: [['..oooo..', '.oBooBo.', 'oooooooo', 'oBoooBoo', 'oooooooo', '.ooBooo.', '..oooo..', '........'], { o: '#d9a066', B: '#5a3b2a' }],
  postcard: [['wwwwwwww', 'wsssssww', 'wsoooswW', 'wsrrrsww', 'wsssssww', 'wwwwwwww', '........', '........'], { w: '#fbf6e8', s: '#7ec3ef', o: '#f2c14e', r: '#d9764f', W: '#d4504f' }],
  carving: [['...ww...', '..wWWw..', '..wwww..', '.w.ww.w.', '...ww...', '..w..w..', '.ww..ww.', '........'], { w: '#c98a4b', W: '#5a3b2a' }],
  badge: [['.yyyyyy.', 'yyGGGGyy', 'yGgggGGy', 'yGgwwgGy', 'yGgggGGy', 'yyGGGGyy', '.yyyyyy.', '..r..r..'], { y: '#e0b040', G: '#3f6f4a', g: '#5f9f6a', w: '#f6ecda', r: '#d4504f' }],
  flowercrown: [['.f.p.f.p', 'gggggggg', 'g......g', 'g......g', 'gggggggg', '........', '........', '........'], { f: '#f4b6c2', p: '#9d74c0', g: '#5f9f6a' }],
};

// ---------- emotes & particles ----------
const HEART = ['.r.r.', 'rrrrr', 'rRrrr', '.rrr.', '..r..'];
const SPARKLE = ['..y..', '..y..', 'yyWyy', '..y..', '..y..'];
const NOTE = ['..kk', '..kK', '..k.', 'kkk.', 'kkk.'];
const EMOTE_ICONS = {
  heart: [HEART, { r: '#e8506a', R: '#ffb0c0' }],
  '!': [['.k.', '.k.', '.k.', '...', '.k.'], { k: '#d4504f' }],
  '?': [['kkk', '..k', '.kk', '...', '.k.'], { k: '#3f6aa0' }],
  note: [NOTE, { k: '#3a2420', K: '#3a2420' }],
  zz: [['kkk..', '..k..', '.k...', 'kkkkk', '.....'], { k: '#5a6496' }],
  dots: [['.....', '.....', 'k.k.k', '.....', '.....'], { k: '#3a2420' }],
  happy: [['k...k', '.....', 'k...k', '.kkk.', '.....'], { k: '#3a2420' }],
};

export const SPR = {};
export function initSprites() {
  SPR.bottle = makeSprite(['.n.', 'www', 'wmw', 'wmw', 'www'], { n: '#d9a066', w: '#f4f1ea', m: '#fffdf5' });
  SPR.deer = { stand: makeSprite(DEER_STAND, DEER_PAL), walk: makeSprite(DEER_WALK, DEER_PAL), graze: makeSprite(DEER_GRAZE, DEER_PAL) };
  SPR.pronghorn = { stand: makeSprite(PRONG_STAND, PRONG_PAL), run: makeSprite(PRONG_RUN, PRONG_PAL) };
  SPR.prairieDog = { up: makeSprite(PD_UP, PD_PAL), down: makeSprite(PD_DOWN, PD_PAL) };
  SPR.raven = { up: makeSprite(RAVEN_UP, RAVEN_PAL), down: makeSprite(RAVEN_DOWN, RAVEN_PAL) };
  SPR.jay = { perch: makeSprite(JAY_PERCH, JAY_PAL), hop: makeSprite(JAY_HOP, JAY_PAL), fly: makeSprite(JAY_FLY, JAY_PAL) };
  SPR.owl = { idle: makeSprite(OWL, OWL_PAL), blink: makeSprite(OWL_BLINK, OWL_PAL) };
  SPR.squirrel = { sit: makeSprite(SQUIRREL, SQUIRREL_PAL), up: makeSprite(SQUIRREL_UP, SQUIRREL_PAL) };
  SPR.lizard = { a: makeSprite(LIZARD, LIZARD_PAL), b: makeSprite(LIZARD_B, LIZARD_PAL) };
  SPR.butterflies = ['#f29e4c', '#7ab0f0', '#f6d860', '#f4a0c0'].map(c => ({
    a: makeSprite(BUTTERFLY_A, { p: c, P: shade(c, -0.25), b: '#3a2420' }),
    b: makeSprite(BUTTERFLY_B, { p: c, P: shade(c, -0.25), b: '#3a2420' }),
  }));
  SPR.bench = makeSprite(BENCH, { w: '#c08550', W: '#7a4f2c' });
  SPR.sign = makeSprite(SIGN, { w: '#b07a42', W: '#6a4426', l: '#f2dcb5' });
  SPR.flowers = {
    paintbrush: makeSprite(FLOWERS, { f: '#e2453c', F: '#ff8a5c', g: '#5f8a4a' }),
    penstemon: makeSprite(FLOWERS, { f: '#6a6fd1', F: '#b39ddb', g: '#5f8a4a' }),
    sego: makeSprite(FLOWERS, { f: '#f7f1e6', F: '#e9c46a', g: '#6f9a55' }),
  };
  SPR.trashcan = makeSprite(TRASHCAN, { g: '#5f7a5a', G: '#3f5a3e' });
  SPR.building = makeSprite(BUILDING, { R: '#7a4a32', w: '#c9a27a', W: '#8a5a32', d: '#6a4426', D: '#4a2e1a', l: '#9ad0f8', L: '#d8eef8', s: '#a08a72' });
  SPR.fountain = makeSprite(FOUNTAIN, { b: '#8aa0b0', W: '#9ad0f8', s: '#8a8a92' });
  SPR.items = {};
  for (const [id, [rows, pal]] of Object.entries(ITEM_ART)) SPR.items[id] = makeSprite(rows, pal);
  SPR.heart = makeSprite(HEART, { r: '#e8506a', R: '#ffb0c0' });
  SPR.sparkle = makeSprite(SPARKLE, { y: '#ffe680', W: '#ffffff' }, null);
  SPR.note = makeSprite(NOTE, { k: '#3a2420', K: '#3a2420' }, null);
  SPR.emote = {};
  for (const [k, [rows, pal]] of Object.entries(EMOTE_ICONS)) SPR.emote[k] = makeEmote(rows, pal);
  // baby accessories
  SPR.babyHat = makeSprite(['..yyyyyy..', '.yyrrrryy.', 'yyyyyyyyyy'], { y: '#f3d38a', r: '#e07a7a' });
  SPR.babyBlanket = makeSprite(['qQqQqQqQqQ', 'QqQqQqQqQq', 'qQqQqQqQqQ'], { q: '#f4b6c2', Q: '#fbe3e8' });
  SPR.babyPacifier = makeSprite(['bb', 'bb'], { b: '#7aa6d8' }, null);
}

/** Speech-bubble emote (13x13) with an icon inside. */
function makeEmote(iconRows, pal) {
  const c = document.createElement('canvas');
  c.width = 13; c.height = 14;
  const x = c.getContext('2d');
  x.fillStyle = OUTLINE;
  x.fillRect(1, 0, 11, 11); x.fillRect(0, 1, 13, 9); x.fillRect(5, 11, 3, 1); x.fillRect(6, 12, 1, 1);
  x.fillStyle = '#fff6e9';
  x.fillRect(1, 1, 11, 9); x.fillRect(2, 0, 9, 1); x.fillRect(6, 10, 1, 1);
  x.fillStyle = '#f2dcb5'; x.fillRect(1, 9, 11, 1);
  const icon = bake(iconRows, pal, null);
  x.drawImage(icon, Math.round((13 - icon.width) / 2), Math.round((10 - icon.height) / 2) + 0);
  return { r: c, l: c, w: 13, h: 14, pad: 0 };
}
