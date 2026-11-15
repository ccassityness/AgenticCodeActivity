// Hoodoo Hike — boot, game state, rendering loop.
import { initSprites, SPR, buildPerson, buildBaby, PEOPLE_OPTIONS, drawSprite, toDataURL } from './sprites.js';
import { buildWorld, groundY, WORLD_W, YTOP, YBOT, zoneAt, makeBristlecone } from './world.js';
import { sky, drawSky, drawLight, CYCLE_SECONDS } from './timeofday.js';
import * as audio from './audio.js';
import { UI, addPhoto, openAlbum } from './ui.js';
import { Player } from './player.js';
import { Baby } from './baby.js';
import { setupInput } from './input.js';
import { Bag, ITEMS, STARTING_BAG } from './items.js';
import { Journal } from './journal.js';
import { Director } from './events.js';
import { FX } from './fx.js';
import {
  Deer, Pronghorn, PrairieDog, Raven, Jay, Owl, NPC, Runner, Family,
  Sign, Bench, Flowers, Landmark, Bristlecone, Restroom, Fountain, TrashCan,
} from './entities.js';

const H = 150, MIN_W = 220, MAX_W = 360, CAM_Y = 108;
const params = new URLSearchParams(location.search);
const $ = id => document.getElementById(id);
const pick = a => a[(Math.random() * a.length) | 0];

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
  fx: new FX(),
  audio: { ...audio.sfxs, unlock: audio.unlock },

  toScreen(wx, wy) {
    const r = this.canvasRect;
    return {
      x: r.left + (wx - Math.round(this.camX)) / this.W * r.width,
      y: r.top + (wy - Math.round(this.camY)) / this.H * r.height,
    };
  },
  babyPos() { const p = this.player; return { x: p.x + p.dir * 9, y: p.y - 31 + (p.state === 'sit' ? 3 : 0) }; },
  parentHead() { return { x: this.player.x - this.player.dir * 8, y: this.player.y - 33 + (this.player.state === 'sit' ? 3 : 0) }; },
  playerBox() { const p = this.player; return { x: p.x - 10, y: p.y - 31, w: 20, h: 31 }; },
  babyPortrait() {
    const face = this.baby.face;
    this._bp = this._bp || {};
    if (!this._bp[face]) this._bp[face] = toDataURL(this.player.babyFrames[face].r, 3);
    return this._bp[face];
  },

  tap(wx, wy) {
    if (!this.started) return;
    if (this.ui.dlg) { this.ui.advance(); return; }
    this.ui.closeMenu();
    const inBox = (b, pad) => wx >= b.x - pad && wx <= b.x + b.w + pad && wy >= b.y - pad && wy <= b.y + b.h + pad;
    if (inBox(this.playerBox(), 2)) { this.player.stop(); this.openBabyMenu(); return; }
    const hits = this.entities.filter(e => e.visible(this) && inBox(e.box(), e.kind === 'pickup' ? 7 : 5));
    if (hits.length) {
      const area = e => { const b = e.box(); return b.w * b.h; };
      hits.sort((a, b) => area(a) - area(b));
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
      if (e.kind === 'pickup') this.pickUp(e);
      else this.openEntity(e);
    };
    if (Math.abs(ax - p.x) < 3 || (e.reach > 0 && Math.abs(e.x - p.x) <= e.reach + 2)) {
      if (p.state === 'sit' && e !== p.seat) p.stand();
      arrive();
    } else p.walkTo(ax, arrive);
  },
  openEntity(e) {
    const acts = e.actions(this);
    if (!acts) return;
    this.ui.openMenu(e.name, acts, { portrait: e.portrait ? e.portrait() : null });
  },

  pickUp(e) {
    if (!this.entities.includes(e)) return;
    if (!this.bag.canAdd(e.item, e.owner ?? null)) { this.ui.notify('🎒 Your bag is full! Use or drop something first.'); return; }
    this.bag.add(e.item, 1, e.owner ?? null);
    this.entities.splice(this.entities.indexOf(e), 1);
    this.audio.pickup();
    this.fx.sparkles(e.x, e.y - 6, 4);
    const def = ITEMS[e.item];
    let msg = `+ ${def.name}`;
    if (['nature', 'lost', 'keepsake', 'toy'].includes(def.cat)) this.journal.find(e.item);
    if (def.cat === 'litter') msg += ' — pack it out to a trash can 🗑️';
    if (def.cat === 'nature') { msg += ' — show baby, then leave it be 🌿'; setTimeout(() => this.baby.react('thing'), 600); }
    if (e.owner) { const o = this.entities.find(x => x.id === e.owner); if (o) msg += ` — this must be ${o.name}'s!`; }
    if (e.babyItem && this.baby.need?.id === 'lost' && this.baby.need.item === e.item) msg += ` — give it back to ${this.baby.name}!`;
    this.ui.notify(msg);
    this.ui.needChanged();
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
    this.baby.openMenu();
  },

  sitOn(bench) {
    this.player.sit(bench);
    this.ui.openMenu('Resting on the bench', [
      { label: '⏩ Watch the time pass', run: () => { this.timeSpeed = 12; this.ui.toast('Time flies…', 'tap anywhere to get up'); } },
      { label: '👶 Baby', run: () => this.openBabyMenu() },
      { label: '🚶 Get up', run: () => this.player.stand() },
    ]);
  },
  onStand() { this.timeSpeed = 1; },

  flashPhoto() {
    this.audio.unlock();
    this.audio.shutter();
    this.ui.flash();
  },
  takePhoto() {
    if (!this.started) return;
    this.flashPhoto();
    try { addPhoto(canvas.toDataURL('image/png')); } catch (err) { console.warn('photo failed', err); }
    this.journal.inc('photos');
    this.ui.toast('Snap! 📸', 'saved to your album');
    if (!this.baby.napping) setTimeout(() => this.baby.say('*cheese!*'), 500);
  },

  toggleMute() {
    audio.setMuted(!audio.isMuted());
    $('btnMute').textContent = audio.isMuted() ? '🔇' : '🔊';
  },

  friendList() {
    return [
      { id: 'ranger', name: 'Ranger Rosa', icon: '🎖️', hint: 'Near Sunrise Point' },
      { id: 'family', name: 'The Okafor family', icon: '👨‍👧', hint: "Down in Queen's Garden" },
      { id: 'photographer', name: 'Wren the photographer', icon: '📷', hint: "Near Thor's Hammer" },
      { id: 'walt', name: 'Walt', icon: '🪑', hint: 'On a bench at Sunset Point' },
      { id: 'runner', name: 'Dash the trail runner', icon: '👟', hint: 'Always on the move' },
    ];
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
  Object.assign(canvas.style, { width: `${W * s}px`, height: `${H * s}px`, position: 'absolute', left: `${(vw - W * s) / 2}px`, top: `${(vh - H * s) / 2}px` });
  game.canvasRect = canvas.getBoundingClientRect();
  if (game.bag && game.ui) game.ui.renderHotbar();
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));

// ---------- ranger quiz ----------
const QUIZ = [
  ['What mostly carves the hoodoos?', ['Frost wedging', 'Wind', 'Giant beavers'], 'Water seeps into cracks, freezes, expands and pries the rock apart — on around 200 nights a year!'],
  ['Bryce Canyon is actually a series of…', ['Natural amphitheaters', 'Volcano craters', 'Dried-up rivers'], 'They\'re carved into the edge of the Paunsaugunt Plateau.'],
  ['Which rock layer makes Bryce\'s colorful hoodoos?', ['The Claron Formation', 'Navajo Sandstone', 'Granite'], 'Layers of ancient lake and stream sediments!'],
  ['What gives the rocks their reds and oranges?', ['Iron', 'Copper', 'Algae'], 'Iron oxides — basically rust! Manganese adds the lavenders.'],
  ['Which threatened animal lives only in southern Utah?', ['Utah prairie dog', 'Mule deer', 'Common raven'], 'Bryce Canyon helps protect them.'],
  ['About how many stars can you see here on a moonless night?', ['About 7,500', 'About 200', 'About 50'], 'Bryce is an International Dark Sky Park!'],
  ['Who is the park named after?', ['Ebenezer Bryce, a pioneer', 'A famous geologist', 'A Paiute leader named Bryce'], 'He lived nearby in the 1870s.'],
  ['Which tree here can live more than 1,600 years?', ['Great Basin bristlecone pine', 'Ponderosa pine', 'Quaking aspen'], 'Slow growth in harsh places = very long lives.'],
  ['What\'s the fastest land animal in North America?', ['Pronghorn', 'Mule deer', 'Coyote'], 'Around 55 miles per hour!'],
  ['You find a beautiful rock. What should you do?', ['Leave it where it is', 'Take it home', 'Toss it into the canyon'], 'Leave No Trace — let the next hiker discover it too.'],
  ['Which people have lived in this region for centuries and tell the story of the Legend People?', ['The Southern Paiute', 'The Vikings', 'The Aztecs'], 'Their stories are part of this place.'],
  ['What should you do if a squirrel begs for food?', ['Just watch it', 'Share your granola', 'Give it your cookie'], 'People food makes wildlife sick and teaches them to beg.'],
];
function rangerQuiz(g) {
  const [q, answers, why] = pick(QUIZ);
  const right = answers[0];
  const shuffled = answers.slice().sort(() => Math.random() - 0.5);
  const ranger = this;
  g.ui.choice(ranger.name, `Pop quiz! ${q}`, shuffled.map(a => ({
    label: a,
    run: () => {
      if (a === right) {
        g.audio.fanfare();
        g.journal.inc('quiz');
        ranger.talk(g, [`That's right! ${why}`]);
        ranger.gainHearts(g, 0.5);
      } else {
        ranger.talk(g, [`Good guess, but it's "${right}." ${why}`]);
      }
    },
  })), ranger.portrait());
}

// ---------- world population ----------
function populate() {
  const E = [];
  const signs = [
    [60, 'Rim Trail', ['RIM TRAIL → Sunrise Point · Queen\'s Garden · Navajo Loop · Sunset Point',
      'Stay on the trail, carry plenty of water, and pack out what you pack in.']],
    [430, 'Sunrise Point', ['SUNRISE POINT — elevation about 8,000 feet.',
      'Below you is the Bryce Amphitheater, the largest of the park\'s natural amphitheaters, filled with thousands of hoodoos.'], true],
    [795, "Queen's Garden Trail", ['QUEEN\'S GARDEN TRAIL ↓',
      'The gentlest trail into the canyon. Remember: every step down is a step you\'ll climb back up!']],
    [1670, "Queen's Garden", ['QUEEN\'S GARDEN',
      'Look for the pale hoodoo just ahead. People say it looks like Queen Victoria sitting on her throne.']],
    [2505, 'Wall Street', ['NAVAJO LOOP — WALL STREET',
      'A narrow slot between towering rock walls. Douglas firs here stretch over 100 feet up toward a thin ribbon of sky.', 'Try calling out — the walls love an echo.'], false, true],
    [3790, 'Sunset Point', ['SUNSET POINT',
      'From here you can see Thor\'s Hammer and the whole amphitheater glowing at the end of the day.'], true],
    [4850, 'Rim Trail', ['RIM TRAIL → Inspiration Point',
      'The rim trail keeps going — but this looks like a lovely place to turn around and enjoy the walk back.']],
  ];
  for (const [x, title, text, view, echo] of signs) E.push(new Sign({ x, title, text, view, echo, name: title }));

  E.push(new Restroom({ x: 32 }), new Fountain({ x: 82 }), new TrashCan({ x: 140 }));
  E.push(new TrashCan({ x: 2480 }), new Fountain({ x: 2455 }));
  E.push(new Restroom({ x: 4090 }), new Fountain({ x: 4125 }), new TrashCan({ x: 3720 }));

  for (const x of [520, 1950, 3350, 4010]) E.push(new Bench({ x }));
  E.push(new Bench({ x: 3880, occupied: true }));

  E.push(new Flowers({ x: 600, variety: 'paintbrush', name: 'Indian paintbrush', facts: ['Those bright red "petals" are actually bracts — colorful leaves wrapped around tiny green flowers.', 'Hummingbirds love them!'] }));
  E.push(new Flowers({ x: 1210, variety: 'penstemon', name: 'Penstemon', facts: ['Penstemons have tube-shaped flowers, perfect for bees and hummingbirds to reach inside.'] }));
  E.push(new Flowers({ x: 2310, variety: 'sego', name: 'Sego lily', facts: ['The sego lily is Utah\'s state flower.', 'Native peoples ate its bulbs for generations, and they helped Mormon pioneers survive hungry years.'] }));
  E.push(new Flowers({ x: 4660, variety: 'paintbrush', name: 'Indian paintbrush', facts: ['Indian paintbrush is partly a parasite — its roots tap into neighboring plants to borrow nutrients.'] }));

  E.push(new Landmark({ x: 1730, y: groundY(1730), w: 26, h: 84, name: 'Queen Victoria hoodoo', text: [
    'A pale hoodoo topped with a rounded figure. With a little imagination it looks like Queen Victoria, seated and regal.',
    'That\'s how Queen\'s Garden got its name.'] }));
  E.push(new Landmark({ x: 3565, y: groundY(3565) - 20, w: 22, h: 110, name: "Thor's Hammer", text: [
    'Thor\'s Hammer: a tall, slender column with a block of harder rock balanced on top.',
    'The hard cap protects the softer rock underneath from rain. Someday it will fall — but probably not for a long, long time.'] }));
  E.push(new Landmark({ x: 2700, y: groundY(2700), w: 14, h: 90, name: 'Douglas fir', react: 'thing', text: [
    'These Douglas firs grow tall and straight in Wall Street\'s shade, reaching for sunlight far above.',
    'Some of the trees in this slot are thought to be around 750 years old!'] }));
  E.push(new Bristlecone({ x: 4430, w: 30, h: 44, name: 'Bristlecone pine', react: 'thing', img: makeBristlecone(), text: [
    'Great Basin bristlecone pines grow slowly in harsh, windy places.',
    'Some bristlecones in Bryce Canyon are over 1,600 years old — they were seedlings when the Roman Empire was falling!'] }));

  // Animals (positions nudged randomly each hike)
  const jit = n => n + (Math.random() - 0.5) * 40;
  for (const x of [190, 245, 300]) E.push(new PrairieDog({ x: jit(x) }));
  E.push(new Jay({ x: 640, x0: 560, x1: 730 }));
  E.push(new Jay({ x: 3030, x0: 2990, x1: 3110 }));
  E.push(new Raven({ x: jit(1250) }));
  E.push(new Raven({ x: jit(4250) }));
  const deerCount = 1 + Math.floor(Math.random() * 3);
  for (let i = 0; i < deerCount; i++) E.push(new Deer({ x: 1980 + Math.random() * 450 }));
  E.push(new Pronghorn({ x: jit(4300), x0: 4120, x1: 4780 }));
  E.push(new Owl({ x: 4434, y: groundY(4430) - 34 }));

  // People
  E.push(new NPC({
    id: 'ranger', x: 395, name: 'Ranger Rosa', style: 'ranger', greet: 'Welcome to Bryce!', lostItem: 'whistle',
    look: { skin: '#c98d63', hair: '#3a2418', shirt: '#c2b07c', pants: '#4a5d3a', hat: '#8a6a3a', band: '#4a3420' },
    loves: ['cookie'], likes: ['granola', 'water'],
    gifts: { 2: ['diaper', 2, 'We keep spare diapers at the station for families. Here — take a couple!'], 4: ['badge', 1, 'You\'ve really taken care of this place. I\'d like you to have this.'] },
    lines: {
      0: ['Welcome to Bryce Canyon! Ask me anything — I love talking about this place.',
        'We\'re about 8,000 feet up, so the air is thin. Take it slow and sip water!',
        'Keep an eye out for Utah prairie dogs right around here. They\'re a threatened species.',
        'If you find litter, pack it out! There are trash cans at the trailheads.'],
      2: ['Your little one is a natural hiker. Must be all those hoodoos to look at!',
        'I started as a seasonal ranger fifteen summers ago. Never left.'],
      4: ['You know, my favorite spot is the bristlecone past Sunset Point. Go see it after dark… someone lives there.',
        'Thanks for treating this place with such care. It means a lot.'],
    },
    topics: [
      { label: '🪨 Hoodoos?', pages: [
        'Those rock spires are called hoodoos. Bryce Canyon has more of them than anywhere else on Earth!',
        'They\'re carved mostly by frost wedging: snowmelt seeps into cracks, freezes overnight, expands, and pries the rock apart. Here that happens on around 200 nights a year.',
        'Rain finishes the job. It\'s slightly acidic, so it slowly dissolves the limestone and rounds the hoodoos into these lumpy shapes.'] },
      { label: '📜 A story', pages: [
        'Long before this was a park, it was home to the Southern Paiute people, who still live in this region today.',
        'In one Paiute story, the hoodoos were once the Legend People. Coyote turned them to stone, and you can still see them standing in rows, some with paint on their faces.',
        'Stories like that remind us people have known and loved this place for a very, very long time.'] },
    ],
    quiz: rangerQuiz,
  }));
  E.push(new Family({
    id: 'family', x: 1820, name: 'The Okafor family', greet: 'Aww, a tiny hiker!', lostItem: 'dino',
    look: { skin: '#6b4530', hair: '#3a2418', shirt: '#f0a93c', pants: '#3f6aa0' }, style: 'curly', extras: ['pack'],
    kidLook: { skin: '#6b4530', hair: '#3a2418', shirt: '#d4504f', pants: '#55667a' },
    loves: ['cookie', 'granola'], likes: ['water'],
    gifts: { 2: ['cookie', 2, 'Ada baked these this morning. She insists you take some!'], 4: ['flowercrown', 1, 'Ada made this for your baby. Paper flowers — real ones stay in the ground, she says!'] },
    lines: {
      0: ['Hi! Is this your little one\'s first hike? Ours slept through her first one, ha!',
        'Our daughter Ada says she\'s counted seven hoodoos that look like people.',
        'Did you spot Queen Victoria? She\'s right there, sitting on her throne.'],
      2: ['Ada wants to know your baby\'s name. She\'s naming every hoodoo after people she\'s met!',
        'We do this hike every year. It\'s a family tradition now.'],
      4: ['Ada says your baby is her best friend now. No arguments allowed.'],
    },
  }));
  E.push(new NPC({
    id: 'photographer', x: 3500, name: 'Wren the photographer', greet: 'Shh… waiting for the light.', extras: ['camera', 'pack'], style: 'bun', lostItem: 'lenscap',
    look: { skin: '#f8d8bf', hair: '#b0422a', shirt: '#5f9f6a', pants: '#5a4a3a', pack: '#3f6aa0' },
    loves: ['water'], likes: ['granola', 'cookie'],
    gifts: { 2: ['postcard', 1, 'I snapped you two earlier when you weren\'t looking. Printed it at the lodge — it\'s yours!'], 4: ['granola', 3, 'Trail fuel for the climb out. Photographer\'s secret stash.'] },
    lines: {
      0: ['I\'m waiting for the light to hit Thor\'s Hammer. Golden hour makes the hoodoos glow like embers.',
        'Photo tip: crouch down low and frame the hoodoos against the sky.',
        'At night I come back for the stars. No light pollution out here at all.'],
      2: ['You\'ve got a good eye. I\'ve seen you stopping to look at things.', 'My first camera was a hand-me-down from my grandmother.'],
      4: ['If you ever want to learn photography, find me. You\'d be a natural.'],
    },
  }));
  const walt = new NPC({
    id: 'walt', x: 3880, name: 'Walt', greet: 'Afternoon!', seated: true, style: 'bald', extras: ['glasses'], lostItem: 'watch',
    look: { skin: '#eab38c', hair: '#d8d8d8', shirt: '#9d74c0', pants: '#55667a' },
    loves: ['cookie'], likes: ['water', 'granola'],
    gifts: { 2: ['carving', 1, 'I whittled this little deer years ago for my grandkids. They\'re grown now. Your baby should have it.'], 4: ['cookie', 2, 'My late wife\'s recipe. Don\'t tell anyone I gave away the secret.'] },
    lines: {
      0: ['I\'ve been sitting on this bench every summer for forty years.',
        'My kids were about your little one\'s size the first time we brought them here.',
        'Take your time. The hoodoos aren\'t going anywhere — well, not for a few thousand years, anyway.'],
      2: ['My wife and I used to race to this bench. She always won.', 'You remind me of us, back then. Tired and happy.'],
      4: ['Come sit any time. This bench has room for three.'],
    },
  });
  walt.dir = 1;
  E.push(walt);
  E.push(new Runner({
    id: 'runner', x: 900, x0: 60, x1: 4800, name: 'Dash the trail runner', greet: 'On your left!', style: 'cap', extras: [], lostItem: 'sunglasses',
    look: { skin: '#9a6644', hair: '#3a2418', shirt: '#d4504f', pants: '#2b2b33', hat: '#3f6aa0' },
    loves: ['water', 'granola'], likes: ['cookie'],
    gifts: { 2: ['water', 2, 'Hydration is love. Have some of mine!'], 4: ['granola', 2, 'My race-day bars. Don\'t tell my coach.'] },
    lines: {
      0: ['*panting* Oh, hi! Cute baby!', 'Doing the loop twice before breakfast. The climb out of Wall Street is brutal!', 'Stay hydrated! The thin air up here sneaks up on you.'],
      2: ['Training for a race in the fall. Bryce is my favorite practice course.'],
      4: ['When your kid\'s bigger, bring them running with me. Deal?'],
    },
  }));

  const order = { landmark: 0, facility: 0, sign: 1, bench: 1, flower: 1, pickup: 2, animal: 3, person: 4 };
  E.sort((a, b) => (order[a.kind] ?? 2) - (order[b.kind] ?? 2));
  return E;
}

// ---------- title / customizer ----------
const defaults = { skin: PEOPLE_OPTIONS.skin[1], hair: PEOPLE_OPTIONS.hair[1], style: 'short', shirt: PEOPLE_OPTIONS.shirt[0], carrier: PEOPLE_OPTIONS.carrier[0], name: 'Bean' };
let look = { ...defaults };
try { look = { ...defaults, ...JSON.parse(localStorage.getItem('hh_custom') || '{}') }; } catch { /* ignore */ }
for (const k of ['skin', 'hair', 'shirt', 'carrier', 'style']) if (!PEOPLE_OPTIONS[k].includes(look[k])) look[k] = defaults[k];

function drawPreview() {
  const pc = $('preview'), p = pc.getContext('2d');
  p.clearRect(0, 0, pc.width, pc.height);
  const frames = buildPerson(look, { style: look.style, carrier: true });
  const bf = buildBaby(look);
  p.fillStyle = '#8fc25a'; p.fillRect(0, 32, 48, 2);
  p.fillStyle = '#e39572'; p.fillRect(0, 34, 48, 2);
  const spr = frames.idle;
  drawSprite(p, spr, 24, 33, 1);
  const sx = 24 - Math.round(spr.w / 2), sy = 33 - spr.h + spr.pad;
  p.drawImage(bf.content.r, sx + 6, sy + 11);
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
  if (game.journal.hasSave) { $('startBtn').textContent = 'Continue hiking ▶'; $('saveNote').hidden = false; }
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
  game._bp = null;
  $('babyLabel').textContent = look.name;
  $('title').hidden = true;
  $('hud').hidden = false;
  $('btnMute').textContent = audio.isMuted() ? '🔇' : '🔊';
  game.journal.s.hikes = (game.journal.s.hikes || 0) + 1;
  game.journal.save();
  game.started = true;
  game.zone = null;
  game.ui.renderHotbar();
  game.ui.needChanged();
  game.events.populate();
  setTimeout(() => game.baby.say(`*${look.name} kicks happily*`), 1800);
  if (game.journal.s.hikes === 1) setTimeout(() => game.ui.notify('💡 Tap your baby (or the panel top-left) whenever they need you!', 5), 3500);
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
      game.journal.visit(z.name);
    }
    if (z && z.name === 'Sunset Point' && game.sky.label === 'Golden hour' && !game.journal.s.golden) {
      game.journal.set('golden', true);
      game.journal.first('saw golden hour at Sunset Point');
    }
    game.ui.setClock(game.time, game.sky);
    const face = game.baby.face;
    if (face !== game._lastFace) { game._lastFace = face; game.ui.refreshBaby(); }
    game.events.update(dt);
    game.journal.tick(dt);
  }
  for (const e of game.entities) {
    if (Math.abs(e.x - game.player.x) < 600 || e instanceof Runner) e.update(dt, game);
    // the baby notices animals that come close
    if (game.started && e.kind === 'animal' && e.visible(game)) {
      e.noticeT = (e.noticeT ?? 0) - dt;
      if (e.noticeT <= 0 && Math.abs(e.x - game.player.x) < 70) {
        e.noticeT = 45;
        game.journal.see(e.jid);
        setTimeout(() => game.baby.react('animal'), 400);
      }
    }
  }
  game.fx.update(dt);

  // camera
  const p = game.player;
  const tx = p.x - game.W * 0.45 + p.dir * 18;
  const ty = p.y - CAM_Y;
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

  const order = { landmark: 0, facility: 0, sign: 1, bench: 1, flower: 1, pickup: 2, animal: 3, person: 4 };
  const vis = game.entities.filter(e => e.visible(game) && e.x > ox - 60 && e.x < ox + W + 60);
  vis.sort((a, b) => (order[a.kind] ?? 2) - (order[b.kind] ?? 2));
  for (const e of vis) e.draw(wctx, game, ox, oy);
  if (game.started) game.player.draw(wctx, ox, oy);

  // lighting: tint + headlamp, masked to the world, multiplied over it
  const lamp = game.started ? { x: game.player.x - ox + game.player.dir * 8, y: game.player.y - oy - 18 } : null;
  drawLight(lctx, W, H, s, lamp);
  lctx.globalCompositeOperation = 'destination-in';
  lctx.drawImage(wcan, 0, 0);
  lctx.globalCompositeOperation = 'source-over';
  wctx.globalCompositeOperation = 'multiply';
  wctx.drawImage(lcan, 0, 0);
  wctx.globalCompositeOperation = 'source-over';

  ctx.drawImage(wcan, 0, 0);
  game.fx.draw(ctx, ox, oy);
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
  game.journal = new Journal(game);
  game.bag = new Bag(12);
  if (game.journal.s.bag) game.bag.load(game.journal.s.bag);
  else for (const [id, n] of STARTING_BAG) game.bag.add(id, n);
  game.bag.onChange(() => { game.ui.renderHotbar(); game.journal.mark(); });
  game.baby = new Baby(game, look.name);
  game.player = new Player(game, buildPerson(look, { style: look.style, carrier: true }), buildBaby(look));
  game.events = new Director(game);
  const sx = parseFloat(params.get('x'));
  if (!isNaN(sx)) { game.player.x = sx; game.player.y = groundY(sx); }
  game.camX = Math.max(0, game.player.x - game.W * 0.45);
  game.camY = game.player.y - CAM_Y;
  game.entities = populate();
  game.sky = sky(game.time);
  setupInput(game, canvas);
  setupTitle();

  $('babyPanel').addEventListener('click', () => { audio.unlock(); game.openBabyMenu(); });
  $('btnPhoto').addEventListener('click', () => game.takePhoto());
  $('btnMute').addEventListener('click', () => { audio.unlock(); game.toggleMute(); });
  $('btnAlbum').addEventListener('click', () => openAlbum());
  $('btnBag').addEventListener('click', () => { audio.unlock(); game.ui.openBag(); });
  $('btnJournal').addEventListener('click', () => { audio.unlock(); game.ui.openJournal(); });
  $('title').addEventListener('pointerdown', e => e.stopPropagation());
  document.addEventListener('visibilitychange', () => { if (document.hidden) game.journal.save(); });
  window.addEventListener('pagehide', () => game.journal.save());

  if (params.has('play')) start();
  requestAnimationFrame(frame);
}
boot();
