// Hoodoo Hike — boot, game state, rendering loop.
import { initSprites, SPR, buildPerson, buildBaby, PEOPLE_OPTIONS, drawSprite } from './sprites.js';
import { buildWorld, groundY, WORLD_W, YTOP, YBOT, zoneAt, makeBristlecone } from './world.js';
import { sky, drawSky, drawLight, CYCLE_SECONDS } from './timeofday.js';
import * as audio from './audio.js';
import { UI, addPhoto, openAlbum } from './ui.js';
import { Player } from './player.js';
import { Baby } from './baby.js';
import { setupInput } from './input.js';
import {
  Deer, Pronghorn, PrairieDog, Raven, Jay, Owl, NPC, Runner, Family,
  Sign, Bench, Flowers, Pinecone, Landmark, Bristlecone,
} from './entities.js';

const H = 164, MIN_W = 220, MAX_W = 380;
const params = new URLSearchParams(location.search);
const $ = id => document.getElementById(id);

const canvas = $('screen');
const ctx = canvas.getContext('2d');
const wcan = document.createElement('canvas'), wctx = wcan.getContext('2d');
const lcan = document.createElement('canvas'), lctx = lcan.getContext('2d');

const game = {
  W: 320, H,
  camX: 0, camY: 0,
  time: parseFloat(params.get('t') ?? '0.06'),
  timeSpeed: 1,
  debugSpeed: parseFloat(params.get('speed') ?? '1'),
  now: 0,
  started: false,
  entities: [],
  sprites: SPR,
  zone: null,
  sky: null,
  canvasRect: null,
  audio: { ...audio.sfxs, unlock: audio.unlock },

  toScreen(wx, wy) {
    const r = this.canvasRect;
    return {
      x: r.left + (wx - Math.round(this.camX)) / this.W * r.width,
      y: r.top + (wy - Math.round(this.camY)) / this.H * r.height,
    };
  },
  babyPos() { const p = this.player; return { x: p.x + p.dir * 9, y: p.y - 27 + (p.state === 'sit' ? 3 : 0) }; },
  parentHead() { return { x: this.player.x - this.player.dir * 8, y: this.player.y - 28 + (this.player.state === 'sit' ? 3 : 0) }; },

  playerBox() { const p = this.player; return { x: p.x - 9, y: p.y - 27, w: 18, h: 27 }; },

  tap(wx, wy) {
    if (!this.started) return;
    if (this.ui.dlg) { this.ui.advance(); return; }
    this.ui.closeMenu();
    const inBox = (b, pad) => wx >= b.x - pad && wx <= b.x + b.w + pad && wy >= b.y - pad && wy <= b.y + b.h + pad;
    if (inBox(this.playerBox(), 2)) { this.player.stop(); this.openBabyMenu(); return; }
    const hits = this.entities.filter(e => e.visible(this) && inBox(e.box(), 5));
    if (hits.length) {
      hits.sort((a, b) => a.box().w * a.box().h - b.box().w * b.box().h);
      this.goInteract(hits[0]);
      return;
    }
    this.player.walkTo(wx);
  },

  goInteract(e) {
    const p = this.player;
    const ax = e.approachX(p.x);
    const arrive = () => {
      p.dir = e.x >= p.x ? 1 : -1;
      if (e === this.runnerRef) e.paused = 12;
      this.ui.openMenu(e.name, e.actions(this));
    };
    if (Math.abs(ax - p.x) < 3 || (e.reach > 0 && Math.abs(e.x - p.x) <= e.reach + 2)) {
      if (p.state === 'sit' && e !== p.seat) p.stand();
      arrive();
    } else p.walkTo(ax, arrive);
  },

  interactNearest() {
    let best = null, bd = 45;
    for (const e of this.entities) {
      if (!e.visible(this)) continue;
      const d = Math.abs(e.x - this.player.x);
      if (d < bd) { bd = d; best = e; }
    }
    if (best) this.goInteract(best); else this.openBabyMenu();
  },

  openBabyMenu() {
    if (!this.started) return;
    this.ui.closeDialogue(false);
    this.ui.openMenu(`${this.baby.name} · ${this.baby.icon[1]}`, this.baby.menuActions());
  },

  sitOn(bench) {
    this.player.sit(bench);
    this.ui.openMenu('Resting on the bench', [
      { label: '⏩ Watch the time pass', run: () => { this.timeSpeed = 12; this.ui.toast('Time flies…', 'tap anywhere to get up'); } },
      { label: '🤱 Baby', run: () => this.openBabyMenu() },
      { label: '🚶 Get up', run: () => this.player.stand() },
    ]);
  },
  onStand() { this.timeSpeed = 1; },

  takePhoto() {
    if (!this.started) return;
    this.audio.unlock();
    this.audio.shutter();
    try { addPhoto(canvas.toDataURL('image/png')); } catch (err) { console.warn('photo failed', err); }
    this.ui.flash();
    this.ui.toast('Snap! 📸', 'saved to your album');
    if (this.baby.mood !== 'napping') setTimeout(() => this.baby.say('*cheese!*'), 500);
  },

  toggleMute() {
    audio.setMuted(!audio.isMuted());
    $('btnMute').textContent = audio.isMuted() ? '🔇' : '🔊';
  },
};
window.__game = game; // handy for debugging in the console

// ---------- sizing ----------
function resize() {
  const vw = window.innerWidth, vh = window.innerHeight;
  const W = Math.max(MIN_W, Math.min(MAX_W, Math.round(H * vw / vh)));
  game.W = W;
  for (const c of [canvas, wcan, lcan]) { c.width = W; c.height = H; }
  ctx.imageSmoothingEnabled = false;
  wctx.imageSmoothingEnabled = false;
  const s = Math.min(vw / W, vh / H);
  canvas.style.width = `${W * s}px`;
  canvas.style.height = `${H * s}px`;
  canvas.style.position = 'absolute';
  canvas.style.left = `${(vw - W * s) / 2}px`;
  canvas.style.top = `${(vh - H * s) / 2}px`;
  game.canvasRect = canvas.getBoundingClientRect();
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));

// ---------- world population ----------
function populate() {
  const E = [];
  const signs = [
    [60, 'Rim Trail', ['RIM TRAIL → Sunrise Point · Queen\'s Garden · Navajo Loop · Sunset Point',
      'Stay on the trail, carry plenty of water, and leave what you find for others to enjoy.']],
    [430, 'Sunrise Point', ['SUNRISE POINT — elevation about 8,000 feet.',
      'Below you is the Bryce Amphitheater, the largest of the park\'s natural amphitheaters, filled with thousands of hoodoos.'], true],
    [795, "Queen's Garden Trail", ['QUEEN\'S GARDEN TRAIL ↓',
      'The gentlest trail into the canyon. Remember: every step down is a step you\'ll climb back up!']],
    [1670, "Queen's Garden", ['QUEEN\'S GARDEN',
      'Look for the pale hoodoo just ahead. People say it looks like Queen Victoria sitting on her throne.']],
    [2505, 'Wall Street', ['NAVAJO LOOP — WALL STREET',
      'A narrow slot between towering rock walls. Douglas firs here stretch over 100 feet up toward a thin ribbon of sky.']],
    [3790, 'Sunset Point', ['SUNSET POINT',
      'From here you can see Thor\'s Hammer and the whole amphitheater glowing at the end of the day.'], true],
    [4850, 'Rim Trail', ['RIM TRAIL → Inspiration Point',
      'The rim trail keeps going — but this looks like a lovely place to turn around and enjoy the walk back.']],
  ];
  for (const [x, title, text, view] of signs) E.push(new Sign({ x, title, text, view, name: title }));

  for (const x of [520, 1950, 3350, 4010]) E.push(new Bench({ x }));
  const elderBench = new Bench({ x: 3880, occupied: true });
  E.push(elderBench);

  E.push(new Flowers({ x: 600, variety: 'paintbrush', name: 'Indian paintbrush', facts: ['Those bright red "petals" are actually bracts — colorful leaves wrapped around tiny green flowers.', 'Hummingbirds love them!'] }));
  E.push(new Flowers({ x: 1210, variety: 'penstemon', name: 'Penstemon', facts: ['Penstemons have tube-shaped flowers, perfect for bees and hummingbirds to reach inside.'] }));
  E.push(new Flowers({ x: 2310, variety: 'sego', name: 'Sego lily', facts: ['The sego lily is Utah\'s state flower.', 'Native peoples ate its bulbs for generations, and they helped Mormon pioneers survive hungry years.'] }));
  E.push(new Flowers({ x: 4660, variety: 'paintbrush', name: 'Indian paintbrush', facts: ['Indian paintbrush is partly a parasite — its roots tap into neighboring plants to borrow nutrients.'] }));
  E.push(new Pinecone({ x: 1010 }));

  E.push(new Landmark({ x: 1730, y: groundY(1730), w: 26, h: 84, yOff: 0, name: 'Queen Victoria hoodoo', text: [
    'A pale hoodoo topped with a rounded figure. With a little imagination it looks like Queen Victoria, seated and regal.',
    'That\'s how Queen\'s Garden got its name.'] }));
  E.push(new Landmark({ x: 3565, y: groundY(3565) - 20, w: 22, h: 110, name: "Thor's Hammer", text: [
    'Thor\'s Hammer: a tall, slender column with a block of harder rock balanced on top.',
    'The hard cap protects the softer rock underneath from rain. Someday it will fall — but probably not for a long, long time.'] }));
  E.push(new Landmark({ x: 2700, y: groundY(2700), w: 14, h: 90, name: 'Douglas fir', react: 'thing', text: [
    'These Douglas firs grow tall and straight in Wall Street\'s shade, reaching for sunlight far above.',
    'Some of the trees in this slot are thought to be around 750 years old!'] }));
  const bc = new Bristlecone({ x: 4430, w: 30, h: 44, name: 'Bristlecone pine', react: 'thing', img: makeBristlecone(), text: [
    'Great Basin bristlecone pines grow slowly in harsh, windy places.',
    'Some bristlecones in Bryce Canyon are over 1,600 years old — they were seedlings when the Roman Empire was falling!'] });
  E.push(bc);

  // Animals
  for (const x of [190, 245, 300]) E.push(new PrairieDog({ x }));
  E.push(new Jay({ x: 640, x0: 560, x1: 730 }));
  E.push(new Jay({ x: 3030, x0: 2990, x1: 3110 }));
  E.push(new Raven({ x: 1250 }));
  E.push(new Raven({ x: 4250 }));
  E.push(new Deer({ x: 2080 }));
  E.push(new Deer({ x: 2260 }));
  E.push(new Pronghorn({ x: 4300, x0: 4120, x1: 4780 }));
  E.push(new Owl({ x: 4434, y: groundY(4430) - 34 }));

  // People
  E.push(new NPC({
    x: 395, name: 'Ranger Rosa', style: 'ranger', greet: 'Welcome to Bryce!',
    look: { skin: '#c98d63', hair: '#2b1d16', shirt: '#b8a77a', pants: '#4a5d3a', hat: '#8a6a3a', band: '#4a3420' },
    lines: [
      ['Welcome to Bryce Canyon! Ask me anything — I love talking about this place.'],
      ['We\'re about 8,000 feet up, so the air is thin. Take it slow, sip water, and remember the hike back up is the hard part!'],
      ['Keep an eye out for Utah prairie dogs right around here. They\'re a threatened species, and this is one of the places they\'re protected.'],
    ],
    topics: [
      { label: '🪨 Hoodoos?', pages: [
        'Those rock spires are called hoodoos. Bryce Canyon has more of them than anywhere else on Earth!',
        'They\'re carved mostly by frost wedging: snowmelt seeps into cracks, freezes overnight, expands, and pries the rock apart. Here that happens on around 200 nights a year.',
        'Rain finishes the job. It\'s slightly acidic, so it slowly dissolves the limestone and rounds the hoodoos into these lumpy shapes.'] },
      { label: '🎨 Why so colorful?', pages: [
        'The rock is the Claron Formation: layers of mud, sand and limestone that settled in ancient lakes and streams tens of millions of years ago.',
        'Iron gives the reds, oranges and yellows. Manganese adds the soft lavenders.',
        'Harder layers on top act like caps that protect the softer rock below. That\'s why so many hoodoos look like they\'re wearing hats!'] },
      { label: '📜 A story', pages: [
        'Long before this was a park, it was home to the Southern Paiute people, who still live in this region today.',
        'In one Paiute story, the hoodoos were once the Legend People. Coyote turned them to stone, and you can still see them standing in rows, some with paint on their faces.',
        'Stories like that remind us people have known and loved this place for a very, very long time.'] },
      { label: '🏷️ The name', pages: [
        'Fun fact: Bryce isn\'t really a canyon! It\'s a series of natural amphitheaters carved into the edge of the Paunsaugunt Plateau.',
        'It\'s named for Ebenezer Bryce, a pioneer who lived nearby in the 1870s. He supposedly called it "a hell of a place to lose a cow!"'] },
      { label: '✨ Night sky', pages: [
        'Bryce is an International Dark Sky Park. On a clear, moonless night you can see around 7,500 stars.',
        'Stay out until dark and look up — the Milky Way stretches right over the hoodoos.'] },
    ],
  }));
  E.push(new Family({
    x: 1820, name: 'The Okafor family', greet: 'Aww, a tiny hiker!',
    look: { skin: '#6b4530', hair: '#2b1d16', shirt: '#edae49', pants: '#3d5a80' }, style: 'curly', extras: ['pack'],
    kidLook: { skin: '#6b4530', hair: '#2b1d16', shirt: '#d1495b', pants: '#5b6a7a' },
    lines: [
      ['Hi! Is this your little one\'s first hike? Ours slept through her first one, ha!'],
      ['Our kid says she\'s counted seven hoodoos that look like people. I only found four!'],
      ['Did you spot Queen Victoria? She\'s right there, sitting on her throne.'],
    ],
  }));
  E.push(new NPC({
    x: 3500, name: 'Photographer', greet: 'Shh… waiting for the light.', extras: ['camera', 'pack'], style: 'bun',
    look: { skin: '#f6d5bc', hair: '#a33b24', shirt: '#66a182', pants: '#5b4a3a', pack: '#3d5a80' },
    lines: [
      ['I\'m waiting for the light to hit Thor\'s Hammer. Golden hour makes the hoodoos glow like embers.'],
      ['Photo tip: crouch down low and frame the hoodoos against the sky. And photograph your kid too — they grow up fast!'],
      ['At night I come back for the stars. No light pollution out here at all.'],
    ],
  }));
  const elder = new NPC({
    x: 3880, name: 'Walt', greet: 'Afternoon!', seated: true, style: 'bald', extras: [],
    look: { skin: '#e8b48f', hair: '#d8d8d8', shirt: '#9b7bb8', pants: '#5b6a7a' },
    lines: [
      ['I\'ve been sitting on this bench every summer for forty years.'],
      ['My kids were about your little one\'s size the first time we brought them here. Now they bring their own kids.'],
      ['Take your time. The hoodoos aren\'t going anywhere — well, not for a few thousand years, anyway.'],
    ],
  });
  elder.dir = 1;
  E.push(elder);
  const runner = new Runner({
    x: 900, x0: 60, x1: 4800, name: 'Trail runner', greet: 'On your left!', style: 'cap', extras: [],
    look: { skin: '#9a6644', hair: '#2b1d16', shirt: '#d1495b', pants: '#2b2b33', hat: '#3d5a80' },
    lines: [
      ['*panting* Oh, hi! Cute baby!'],
      ['Doing the loop twice before breakfast. The climb out of Wall Street is brutal!'],
      ['Stay hydrated! The thin air up here sneaks up on you.'],
    ],
  });
  E.push(runner);
  game.runnerRef = runner;

  // draw order: scenery first, then animals/people
  const order = { landmark: 0, sign: 1, bench: 1, flower: 1, thing: 1, animal: 2, person: 3 };
  E.sort((a, b) => (order[a.kind] ?? 2) - (order[b.kind] ?? 2));
  return E;
}

// ---------- title / customizer ----------
const defaults = { skin: PEOPLE_OPTIONS.skin[1], hair: PEOPLE_OPTIONS.hair[1], style: 'short', shirt: PEOPLE_OPTIONS.shirt[0], carrier: PEOPLE_OPTIONS.carrier[0], name: 'Bean' };
let look = { ...defaults };
try { look = { ...defaults, ...JSON.parse(localStorage.getItem('hh_custom') || '{}') }; } catch { /* ignore */ }

function drawPreview() {
  const pc = $('preview'), p = pc.getContext('2d');
  p.clearRect(0, 0, pc.width, pc.height);
  const frames = buildPerson(look, { style: look.style, carrier: true });
  const bf = buildBaby(look);
  p.fillStyle = '#e6c9a0'; p.fillRect(0, 31, 48, 5);
  p.fillStyle = '#c9a27a'; p.fillRect(0, 33, 48, 3);
  drawSprite(p, frames.idle, 24, 32, 1);
  p.drawImage(bf.content.r, 24 - 7 + 7, 32 - 25 + 9);
}

function setupTitle() {
  const labels = { short: 'Short', long: 'Long', bun: 'Bun', curly: 'Curly' };
  document.querySelectorAll('.swatches').forEach(box => {
    const key = box.dataset.key;
    for (const v of PEOPLE_OPTIONS[key]) {
      const b = document.createElement('button');
      if (key === 'style') { b.textContent = labels[v]; b.style.width = 'auto'; b.style.padding = '0 7px'; }
      else b.style.background = v;
      b.setAttribute('aria-label', `${key} ${labels[v] || v}`);
      if (look[key] === v) b.classList.add('sel');
      b.addEventListener('click', () => {
        look[key] = v;
        box.querySelectorAll('button').forEach(x => x.classList.remove('sel'));
        b.classList.add('sel');
        drawPreview();
      });
      box.appendChild(b);
    }
  });
  $('babyName').value = look.name;
  $('startBtn').addEventListener('click', start);
  drawPreview();
}

function start() {
  audio.unlock();
  look.name = ($('babyName').value || '').trim().slice(0, 12) || 'Bean';
  try { localStorage.setItem('hh_custom', JSON.stringify(look)); } catch { /* ignore */ }
  game.baby.name = look.name;
  game.player.frames = buildPerson(look, { style: look.style, carrier: true });
  game.player.babyFrames = buildBaby(look);
  $('babyLabel').textContent = look.name;
  $('title').hidden = true;
  $('hud').hidden = false;
  $('btnMute').textContent = audio.isMuted() ? '🔇' : '🔊';
  game.started = true;
  game.zone = null;
  setTimeout(() => game.baby.say(`*${look.name} kicks happily*`), 1800);
}

// ---------- main loop ----------
function update(dt) {
  game.now += dt;
  game.time = (game.time + dt / CYCLE_SECONDS * game.timeSpeed * game.debugSpeed) % 1;
  game.sky = sky(game.time);
  audio.setNight(game.sky.night);

  if (game.started) {
    game.player.update(dt);
    game.baby.update(dt);
    const z = zoneAt(game.player.x);
    if (z && z !== game.zone) {
      if (!game.zone || z.name !== game.zone.name) game.ui.toast(z.name, z.sub);
      game.zone = z;
    }
    const ic = game.baby.icon;
    game.ui.setMood(ic[0], ic[1]);
  }
  for (const e of game.entities) {
    if (Math.abs(e.x - game.player.x) < 600 || e instanceof Runner) e.update(dt, game);
    // the baby notices animals that come close
    if (game.started && e.kind === 'animal' && e.visible(game)) {
      e.noticeT = (e.noticeT ?? 0) - dt;
      if (e.noticeT <= 0 && Math.abs(e.x - game.player.x) < 70) {
        e.noticeT = 45;
        setTimeout(() => game.baby.react('animal'), 400);
      }
    }
  }

  // camera
  const p = game.player;
  const tx = p.x - game.W * 0.45 + p.dir * 18;
  const ty = p.y - 122;
  game.camX += (tx - game.camX) * Math.min(1, dt * 3);
  game.camY += (ty - game.camY) * Math.min(1, dt * 3);
  game.camX = Math.max(0, Math.min(WORLD_W - game.W, game.camX));
  game.ui.update(dt);
  game.ui.tickDialogue(dt);
}

function render() {
  const W = game.W;
  const ox = Math.round(game.camX), oy = Math.round(game.camY);
  const s = game.sky;
  drawSky(ctx, W, H, game.time, s, game.now);

  wctx.clearRect(0, 0, W, H);
  for (const L of game.world.layers) {
    wctx.drawImage(L.canvas, -Math.round(ox * L.p), Math.round(L.base - game.world.layerBase - oy * L.p));
  }
  const sy = Math.max(0, Math.min(YBOT - YTOP - H, oy - YTOP));
  wctx.drawImage(game.world.near, ox, sy, W, H, 0, (sy - (oy - YTOP)), W, H);

  for (const e of game.entities) {
    if (!e.visible(game) || e.x < ox - 60 || e.x > ox + W + 60) continue;
    e.draw(wctx, game, ox, oy);
  }
  if (game.started) game.player.draw(wctx, ox, oy);

  // lighting: tint + headlamp, masked to the world, multiplied over it
  const lamp = game.started ? { x: game.player.x - ox + game.player.dir * 8, y: game.player.y - oy - 16 } : null;
  drawLight(lctx, W, H, s, lamp);
  lctx.globalCompositeOperation = 'destination-in';
  lctx.drawImage(wcan, 0, 0);
  lctx.globalCompositeOperation = 'source-over';
  wctx.globalCompositeOperation = 'multiply';
  wctx.drawImage(lcan, 0, 0);
  wctx.globalCompositeOperation = 'source-over';

  ctx.drawImage(wcan, 0, 0);
}

let last = performance.now();
function frame(t) {
  const dt = Math.min(0.05, (t - last) / 1000);
  last = t;
  update(dt);
  render();
  requestAnimationFrame(frame);
}

// ---------- boot ----------
function boot() {
  initSprites();
  resize();
  game.world = buildWorld(MAX_W + 40);
  game.ui = new UI(game);
  game.baby = new Baby(game, look.name);
  game.player = new Player(game, buildPerson(look, { style: look.style, carrier: true }), buildBaby(look));
  const sx = parseFloat(params.get('x'));
  if (!isNaN(sx)) { game.player.x = sx; game.player.y = groundY(sx); }
  game.camX = Math.max(0, game.player.x - game.W * 0.45);
  game.camY = game.player.y - 122;
  game.entities = populate();
  game.sky = sky(game.time);
  setupInput(game, canvas);
  setupTitle();

  $('btnBaby').addEventListener('click', () => game.openBabyMenu());
  $('btnPhoto').addEventListener('click', () => game.takePhoto());
  $('btnMute').addEventListener('click', () => { audio.unlock(); game.toggleMute(); });
  $('btnAlbum').addEventListener('click', () => openAlbum());
  $('title').addEventListener('pointerdown', e => e.stopPropagation());

  if (params.has('play')) start();
  requestAnimationFrame(frame);
}
boot();
