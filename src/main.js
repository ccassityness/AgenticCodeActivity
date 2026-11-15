// Hoodoo Hike — boot, game state, rendering loop.
import { PEOPLE_OPTIONS, drawPerson, drawBabyHead } from './figures.js';
import { shade, snapshot, canvas as mkCanvas } from './color.js';
import { YTOP, YBOT, LAYER_BASE, bakeBackground, foregroundSprite, setArea, groundY } from './world.js';
import { makeAreas, PORTALS } from './areas.js';
import { sky, drawSky, drawLight, drawRays, drawRainbow, CYCLE_SECONDS } from './timeofday.js';
import * as audio from './audio.js';
import { UI, addPhoto, openAlbum } from './ui.js';
import { Player } from './player.js';
import { Baby } from './baby.js';
import { setupInput } from './input.js';
import { Bag, ITEMS, STARTING_BAG, itemIcon } from './items.js';
import { Journal, SECRET_AREAS } from './journal.js';
import { Director } from './events.js';
import { FX } from './fx.js';
import { MiniGames } from './minigames.js';
import { PAGES } from './story.js';
import {
  Deer, Pronghorn, PrairieDog, Raven, Jay, Owl, NPC, Runner, Family, Wren, Bluebird, Falcon, Fox, Butterfly, Lizard,
  Sign, Bench, Flowers, Landmark, Bristlecone, Restroom, Fountain, TrashCan, Portal, Pickup,
} from './entities.js';

const H = 150, MIN_W = 220, MAX_W = 360, CAM_Y = 108;
const params = new URLSearchParams(location.search);
const $ = id => document.getElementById(id);
const pick = a => a[(Math.random() * a.length) | 0];

const canvas = $('screen');
const ctx = canvas.getContext('2d');
const wcan = document.createElement('canvas'), wctx = wcan.getContext('2d');
const lcan = document.createElement('canvas'), lctx = lcan.getContext('2d');
const DPR = Math.min(3, window.devicePixelRatio || 1);
const BS = Math.max(1.5, Math.min(3, Math.round(window.innerHeight * DPR / H * 2) / 2));   // tile bake scale
const BGS = Math.min(2, BS * 0.75);                                                       // background bake scale

const game = {
  W: 320, H, S: 3,
  camX: 0, camY: 0,
  time: parseFloat(params.get('t') ?? '0.06'),
  timeSpeed: 1,
  debugSpeed: parseFloat(params.get('speed') ?? '1'),
  now: 0, hikeTime: 0,
  started: false,
  areaEnts: {},
  zone: null,
  sky: null,
  canvasRect: null,
  fx: new FX(),
  audio: { ...audio.sfxs, unlock: audio.unlock },
  flashA: 0,

  get entities() { return this.areaEnts[this.area.id]; },
  set entities(v) { this.areaEnts[this.area.id] = v; },

  toScreen(wx, wy) {
    const r = this.canvasRect;
    return { x: r.left + (wx - this.camX) / this.W * r.width, y: r.top + (wy - this.camY) / this.H * r.height };
  },
  babyPos() { const a = this.player.babyAnchor(); return { x: a.x, y: a.y - 3 }; },
  parentHead() { return { x: this.player.x - this.player.dir * 6, y: this.player.y - 34 + (this.player.state === 'sit' ? 3 : 0) }; },
  playerBox() { const p = this.player; return { x: p.x - 9, y: p.y - 32, w: 18, h: 32 }; },
  babyPortrait() {
    const face = this.baby.face;
    this._bp = this._bp || {};
    if (!this._bp[face]) this._bp[face] = snapshot(12, 12, c => drawBabyHead(c, 6, 6.6, 4.6, face, { dir: 1, skin: this.player.look.babySkin, bonnet: this.player.look.bonnet }), 6);
    return this._bp[face];
  },
  snapshotCanvas() { return canvas; },
  flashScreen(a = 0.8) { this.flashA = a; },

  tap(wx, wy) {
    if (!this.started || this.minigames.on) return;
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
    if (e.kind === 'pickup') {
      if (e.y < this.area.groundY(e.x) - 6 && p.y > e.y + 8) this.ui.notify('⤴ It\'s up on a ledge — jump up to reach it!');
      p.walkTo(e.x);
      return;
    }
    const ax = e.approachX(p.x);
    const arrive = () => { p.dir = e.x >= p.x ? 1 : -1; this.openEntity(e); };
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
    if (e.item === 'diary') { this.entities.splice(this.entities.indexOf(e), 1); this.findPage(e.pageId); return; }
    if (!this.bag.canAdd(e.item, e.owner ?? null)) {
      if (!e._fullWarn || this.now - e._fullWarn > 6) { e._fullWarn = this.now; this.ui.notify('🎒 Your bag is full! Use or drop something first.'); }
      return;
    }
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

  findPage(id) {
    const page = PAGES.find(p => p.id === id);
    const j = this.journal;
    j.s.pages[id] = true; j.mark();
    this.audio.fanfare();
    this.fx.sparkles(this.player.x, this.player.y - 20, 8);
    const n = PAGES.filter(p => j.s.pages[p.id]).length;
    const tail = n === PAGES.length ? 'That\'s every page! Walt at Sunset Point will want to see these.' : n === 1 ? 'A page from an old hiking diary… someone must be missing this. (Check your journal 📔)' : `${n} of ${PAGES.length} pages found.`;
    this.ui.dialogue(`Diary page — ${page.title}`, [`"${page.text}"`, tail], null, itemIcon('diary'));
    if (n === 1) this.journal.first('found a page from an old diary');
  },

  interactNearest() {
    let best = null, bd = 45;
    for (const e of this.entities) {
      if (!e.visible(this) || e.kind === 'pickup') continue;
      const d = Math.abs(e.x - this.player.x);
      if (d < bd) { bd = d; best = e; }
    }
    if (best) this.goInteract(best); else this.openBabyMenu();
  },
  openBabyMenu() {
    if (!this.started || this.minigames.on) return;
    this.ui.closeDialogue(false);
    this.baby.openMenu();
  },
  sitOn(bench) {
    this.player.sit(bench);
    const acts = [
      { label: '⏩ Watch the time pass', run: () => { this.timeSpeed = 12; this.ui.toast('Time flies…', 'tap anywhere to get up'); } },
      { label: '👶 Baby', run: () => this.openBabyMenu() },
      { label: '🚶 Get up', run: () => this.player.stand() },
    ];
    if (this.sky.night) acts.unshift({ label: '✨ Stargaze', primary: true, run: () => this.minigames.stars() });
    this.ui.openMenu('Resting on the bench', acts);
  },
  onStand() { this.timeSpeed = 1; },

  travel(portal) {
    const fade = $('fade');
    fade.classList.add('on');
    this.player.stop();
    setTimeout(() => {
      this.enterArea(portal.to, portal.toX);
      fade.classList.remove('on');
    }, 450);
  },
  enterArea(id, x) {
    this.area = this.areas[id];
    setArea(this.area);
    this.ensureBackground(this.area);
    this.player.place(x);
    this.player.dir = 1;
    this.camX = Math.max(0, Math.min(this.area.width - this.W, x - this.W * 0.45));
    this.camY = this.player.y - CAM_Y;
    this.zone = null;
    if (SECRET_AREAS[id] && !this.journal.s.areas[id]) {
      this.journal.s.areas[id] = true; this.journal.mark(); this.journal.check();
      this.audio.fanfare();
      this.ui.notify(`🧭 Secret discovered: ${SECRET_AREAS[id]}!`, 4);
    }
  },
  ensureBackground(area) {
    if (area.bg) return;
    area.bg = area.layers.map(([kind, p, base]) => ({ p, base, c: bakeBackground(kind, p, area.width, MAX_W + 60, BGS) }));
    const r = Math.random;
    area.fg = [];
    for (let x = 0; x < area.width * 1.3; x += 60 + r() * 140) area.fg.push({ x, kind: pick(['bush', 'grass', 'grass', 'rock']), seed: (r() * 1e6) | 0, s: 0.9 + r() * 0.8 });
  },

  takePhoto() {
    if (!this.started) return;
    this.flashPhoto();
    try { addPhoto(canvas.toDataURL('image/jpeg', 0.85)); } catch (err) { console.warn('photo failed', err); }
    this.journal.inc('photos');
    this.ui.toast('Snap! 📸', 'saved to your album');
    if (!this.baby.napping) setTimeout(() => this.baby.say('*cheese!*'), 500);
    if (this.director?.storm.rainbow > 0) this.journal.first('posed with a rainbow');
  },
  flashPhoto() { this.audio.unlock(); this.audio.shutter(); this.ui.flash(); },
  toggleMute() { audio.setMuted(!audio.isMuted()); $('btnMute').textContent = audio.isMuted() ? '🔇' : '🔊'; },

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
window.__game = game;

// ---------- sizing ----------
function resize() {
  const vw = window.innerWidth, vh = window.innerHeight;
  const W = Math.max(MIN_W, Math.min(MAX_W, Math.round(H * vw / vh)));
  game.W = W;
  const s = Math.min(vw / W, vh / H);
  game.S = Math.min(3, s * DPR);
  for (const c of [canvas, wcan, lcan]) { c.width = Math.round(W * game.S); c.height = Math.round(H * game.S); }
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
  ['What makes a "seep" in the canyon?', ['Water trickling out where rock layers meet', 'A broken pipe', 'Melted glaciers'], 'Seeps feed tiny hanging gardens of ferns and monkeyflowers.'],
  ['Where should you go when a thunderstorm rolls in?', ['Down off exposed rims, into shelter', 'Up to the highest point', 'Under the tallest tree'], 'Lightning strikes high, exposed places — head for shelter.'],
];
function rangerQuiz(g) {
  const [q, answers, why] = pick(QUIZ);
  const right = answers[0];
  const shuffled = answers.slice().sort(() => Math.random() - 0.5);
  const ranger = this;
  g.ui.choice(ranger.name, `Pop quiz! ${q}`, shuffled.map(a => ({
    label: a,
    run: () => {
      if (a === right) { g.audio.fanfare(); g.journal.inc('quiz'); ranger.talk(g, [`That's right! ${why}`]); ranger.gainHearts(g, 0.5); }
      else ranger.talk(g, [`Good guess, but it's "${right}." ${why}`]);
    },
  })), ranger.portrait());
}

// ---------- world population ----------
function pageEntity(p) {
  if (game.journal.s.pages[p.id]) return null;
  const A = game.areas[p.area];
  const plat = p.platform ? A.platforms.find(q => q.id === p.platform) : null;
  return new Pickup({ x: p.x, y: plat ? plat.y : A.groundY(p.x), item: 'diary', pageId: p.id });
}

function populateTrail() {
  const E = [];
  const signs = [
    [60, 'Rim Trail', ['RIM TRAIL → Sunrise Point · Queen\'s Garden · Navajo Loop · Sunset Point', 'Stay on the trail, carry plenty of water, and pack out what you pack in.']],
    [430, 'Sunrise Point', ['SUNRISE POINT — elevation about 8,000 feet.', 'Below you is the Bryce Amphitheater, the largest of the park\'s natural amphitheaters, filled with thousands of hoodoos.'], true],
    [795, "Queen's Garden Trail", ['QUEEN\'S GARDEN TRAIL ↓', 'The gentlest trail into the canyon. Remember: every step down is a step you\'ll climb back up!']],
    [1670, "Queen's Garden", ['QUEEN\'S GARDEN', 'Look for the pale hoodoo just ahead. People say it looks like Queen Victoria sitting on her throne.']],
    [2505, 'Wall Street', ['NAVAJO LOOP — WALL STREET', 'A narrow slot between towering rock walls. Douglas firs here stretch over 100 feet up toward a thin ribbon of sky.', 'Try calling out — the walls love an echo.'], false, true],
    [3790, 'Sunset Point', ['SUNSET POINT', 'From here you can see Thor\'s Hammer and the whole amphitheater glowing at the end of the day.'], true],
    [4850, 'Rim Trail', ['RIM TRAIL → Inspiration Point', 'The rim trail keeps going — but this looks like a lovely place to turn around and enjoy the walk back.']],
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
  E.push(new Landmark({ x: 1730, w: 26, h: 90, name: 'Queen Victoria hoodoo', text: ['A pale hoodoo topped with a rounded figure. With a little imagination it looks like Queen Victoria, seated and regal.', 'That\'s how Queen\'s Garden got its name.'] }));
  E.push(new Landmark({ x: 3565, y: groundY(3565) - 20, w: 22, h: 110, name: "Thor's Hammer", text: ['Thor\'s Hammer: a tall, slender column with a block of harder rock balanced on top.', 'The hard cap protects the softer rock underneath from rain. Someday it will fall — but probably not for a long, long time.'] }));
  E.push(new Landmark({ x: 2700, w: 14, h: 90, name: 'Douglas fir', react: 'thing', text: ['These Douglas firs grow tall and straight in Wall Street\'s shade, reaching for sunlight far above.', 'Some of the trees in this slot are thought to be around 750 years old!'] }));
  E.push(new Bristlecone({ x: 4430, w: 30, h: 44, name: 'Bristlecone pine', react: 'thing', text: ['Great Basin bristlecone pines grow slowly in harsh, windy places.', 'Some bristlecones in Bryce Canyon are over 1,600 years old — they were seedlings when the Roman Empire was falling!'] }));

  const jit = n => n + (Math.random() - 0.5) * 40;
  for (const x of [190, 245, 300]) E.push(new PrairieDog({ x: jit(x) }));
  E.push(new Jay({ x: 640, x0: 560, x1: 730 }), new Jay({ x: 3030, x0: 2990, x1: 3110 }));
  E.push(new Raven({ x: jit(1250) }), new Raven({ x: jit(4250) }));
  const deerCount = 1 + Math.floor(Math.random() * 3);
  for (let i = 0; i < deerCount; i++) E.push(new Deer({ x: 1980 + Math.random() * 450 }));
  E.push(new Pronghorn({ x: jit(4300), x0: 4120, x1: 4780 }));
  E.push(new Owl({ x: 4434, y: groundY(4430) - 30 }));
  E.push(new Fox({ x: 4200 }));
  E.push(new Falcon({ x: 2760 }));

  E.push(new NPC({
    id: 'ranger', x: 395, name: 'Ranger Rosa', greet: 'Welcome to Bryce!', lostItem: 'whistle',
    look: { skin: '#c68a60', hair: '#2e1d14', style: 'bun', shirt: '#c2b07c', pants: '#4a5d3a', hat: 'ranger', hatColor: '#8a6a3a', ranger: true },
    loves: ['cookie'], likes: ['granola', 'water'],
    gifts: { 2: ['diaper', 2, 'We keep spare diapers at the station for families. Here — take a couple!'], 4: ['badge', 1, 'You\'ve really taken care of this place. I\'d like you to have this.'] },
    lines: {
      0: ['Welcome to Bryce Canyon! Ask me anything — I love talking about this place.', 'We\'re about 8,000 feet up, so the air is thin. Take it slow and sip water!', 'Keep an eye out for Utah prairie dogs right around here. They\'re a threatened species.', 'If you find litter, pack it out! There are trash cans at the trailheads.', 'Afternoon thunderstorms build fast up here. If you hear thunder, get off the exposed rim.'],
      2: ['Your little one is a natural hiker. Must be all those hoodoos to look at!', 'Rumor has it there\'s a hidden spring behind the hoodoos in Queen\'s Garden. Keep your ears open for dripping water.'],
      4: ['My favorite spot is a faint path past the old bristlecone. Go after dark… the stars there are unreal.', 'Thanks for treating this place with such care. It means a lot.'],
    },
    topics: [
      { label: '🪨 Hoodoos?', pages: ['Those rock spires are called hoodoos. Bryce Canyon has more of them than anywhere else on Earth!', 'They\'re carved mostly by frost wedging: snowmelt seeps into cracks, freezes overnight, expands, and pries the rock apart. Here that happens on around 200 nights a year.', 'Rain finishes the job. It\'s slightly acidic, so it slowly dissolves the limestone and rounds the hoodoos into these lumpy shapes.'] },
      { label: '📜 A story', pages: ['Long before this was a park, it was home to the Southern Paiute people, who still live in this region today.', 'In one Paiute story, the hoodoos were once the Legend People. Coyote turned them to stone, and you can still see them standing in rows, some with paint on their faces.', 'Stories like that remind us people have known and loved this place for a very, very long time.'] },
    ],
    quiz: rangerQuiz,
  }));
  E.push(new Family({
    id: 'family', x: 1820, name: 'The Okafor family', greet: 'Aww, a tiny hiker!', lostItem: 'dino',
    look: { skin: '#68432e', hair: '#2e1d14', style: 'curly', shirt: '#e8a23a', pants: '#3e6596', pack: true, packColor: '#5b9468' },
    kidLook: { kid: true, skin: '#68432e', hair: '#2e1d14', style: 'curly', shirt: '#c9504b', pants: '#55667a' },
    loves: ['cookie', 'granola'], likes: ['water'],
    gifts: { 2: ['cookie', 2, 'Ada baked these this morning. She insists you take some!'], 4: ['flowercrown', 1, 'Ada made this for your baby. Paper flowers — real ones stay in the ground, she says!'] },
    lines: {
      0: ['Hi! Is this your little one\'s first hike? Ours slept through her first one, ha!', 'Our daughter Ada says she\'s counted seven hoodoos that look like people.', 'Did you spot Queen Victoria? She\'s right there, sitting on her throne.'],
      2: ['Ada swears she heard water dripping behind the hoodoos just past here. A secret spring?', 'We do this hike every year. It\'s a family tradition now.'],
      4: ['Ada says your baby is her best friend now. No arguments allowed.'],
    },
  }));
  E.push(new NPC({
    id: 'photographer', x: 3500, name: 'Wren the photographer', greet: 'Shh… waiting for the light.', lostItem: 'lenscap', holding: 'camera',
    look: { skin: '#f6d6bf', hair: '#a8402a', style: 'long', shirt: '#5b9468', pants: '#5a4a3a', pack: true, packColor: '#3e6596', hat: 'sun', extras: ['camera'] },
    loves: ['water'], likes: ['granola', 'cookie'],
    gifts: { 2: ['postcard', 1, 'I snapped you two earlier when you weren\'t looking. Printed it at the lodge — it\'s yours!'], 4: ['granola', 3, 'Trail fuel for the climb out. Photographer\'s secret stash.'] },
    lines: {
      0: ['I\'m waiting for the light to hit Thor\'s Hammer. Golden hour makes the hoodoos glow like embers.', 'Photo tip: wait until the animal looks at you, and press the shutter when it\'s sharp.', 'At night I come back for the stars. No light pollution out here at all.'],
      2: ['There\'s a peregrine nesting up by Wall Street. Look way, way up.', 'My first camera was a hand-me-down from my grandmother.'],
      4: ['Have you found the Two Bridges spur? Climb to the top for the best shot in the park.'],
    },
  }));
  const walt = new NPC({
    id: 'walt', x: 3880, name: 'Walt', greet: 'Afternoon!', seated: true, lostItem: 'watch',
    look: { skin: '#e6b08a', hair: '#e2e0dc', style: 'bald', shirt: '#8f6bb4', pants: '#55667a', extras: ['glasses', 'beard'] },
    loves: ['cookie'], likes: ['water', 'granola'],
    gifts: { 2: ['carving', 1, 'I whittled this little deer years ago for my grandkids. They\'re grown now. Your baby should have it.'], 4: ['cookie', 2, 'My late wife\'s recipe. Don\'t tell anyone I gave away the secret.'] },
    lines: {
      0: ['I\'ve been sitting on this bench every summer for forty years.', 'My kids were about your little one\'s size the first time we brought them here.', 'Take your time. The hoodoos aren\'t going anywhere — well, not for a few thousand years, anyway.'],
      2: ['My wife and I used to race to this bench. She always won.', 'You remind me of us, back then. Tired and happy.'],
      4: ['Come sit any time. This bench has room for three.'],
    },
  });
  walt.dir = 1;
  walt.extraChat = g => {
    const s = g.journal.s;
    if (s.storyDone) return null;
    const found = PAGES.filter(p => s.pages[p.id]).length;
    if (!s.waltAsked) { s.waltAsked = true; g.journal.mark(); return ['Oh, hello there. You wouldn\'t believe my morning.', 'I brought my mother\'s old hiking diary to read here — she wrote it in 1957, the summer she carried me down this very trail. I was about your baby\'s age.', 'A gust of wind tore the pages right out of my hands. Six of them, scattered all over the canyon. Some of them blew way up onto ledges…', 'My knees aren\'t what they were. If you happen to find any, I\'d be so grateful.']; }
    return [found ? `You found ${found}? Bring them by whenever you like.` : 'If you spot any of those diary pages, they\'re probably caught on ledges or tucked away somewhere secret. The wind was wild.'];
  };
  walt.special = g => {
    const s = g.journal.s;
    const found = PAGES.filter(p => s.pages[p.id]).length;
    const given = s.pagesGiven || 0;
    if (s.storyDone || found <= given) return [];
    return [{ label: `📜 Give diary pages (${found - given})`, primary: true, run: () => {
      const k = found - given;
      s.pagesGiven = found; g.journal.mark();
      if (found >= PAGES.length) {
        walt.talk(g, ['All of them… every single page.', '*He reads quietly for a long while, smiling.*', '"Someday I\'ll bring Walter back here. And maybe someday he\'ll bring little ones of his own."', 'Well. I did, Mom. And now here you are, carrying yours.', 'Thank you, friend. Truly. Here — she\'d want your little one to have this.'], () => {
          s.storyDone = true; g.journal.check(); g.journal.mark();
          g.bag.add('postcard'); g.ui.notify('Received: an old photo of Peggy and baby Walter, 1957 🖼️', 5);
          g.journal.first('helped Walt get his mother\'s diary back');
          g.fx.hearts(walt.x, walt.y - 30, 10);
        });
        walt.gainHearts(g, 2);
      } else {
        walt.talk(g, [`${k > 1 ? k + ' pages' : 'A page'}! Mother\'s handwriting… thank you.`, `That makes ${found} of ${PAGES.length}. The rest must still be out there somewhere.`]);
        walt.gainHearts(g, 0.5 * k);
      }
    } }];
  };
  E.push(walt);
  E.push(new Runner({
    id: 'runner', x: 900, x0: 60, x1: 4800, name: 'Dash the trail runner', greet: 'On your left!', lostItem: 'sunglasses',
    look: { skin: '#9a6644', hair: '#2e1d14', style: 'short', shirt: '#c9504b', pants: '#2b2b33', hat: 'cap', hatColor: '#3e6596' },
    loves: ['water', 'granola'], likes: ['cookie'],
    gifts: { 2: ['water', 2, 'Hydration is love. Have some of mine!'], 4: ['granola', 2, 'My race-day bars. Don\'t tell my coach.'] },
    lines: {
      0: ['*panting* Oh, hi! Cute baby!', 'Doing the loop twice before breakfast. The climb out of Wall Street is brutal!', 'Stay hydrated! The thin air up here sneaks up on you.'],
      2: ['Pro tip: hold the run button on flat ground, walk the climbs. Save your legs!'],
      4: ['When your kid\'s bigger, bring them running with me. Deal?'],
    },
  }));
  for (const p of PAGES.filter(q => q.area === 'trail')) { const e = pageEntity(p); if (e) E.push(e); }
  for (const pt of PORTALS.filter(q => q.area === 'trail')) E.push(new Portal(pt));
  game.director.populateTrail(E);
  return E;
}

function populateSide(id) {
  const E = [];
  if (id === 'seep') {
    E.push(new Sign({ x: 120, name: 'Hidden Seep', title: 'Hidden Seep', text: ['A secret spring! Rain and snowmelt soak into the porous rock above, then trickle out here where they hit a harder layer.', 'Seeps like this feed tiny "hanging gardens" of ferns, moss, columbines and monkeyflowers — oases in the dry canyon.'] }));
    E.push(new Flowers({ x: 500, variety: 'monkey', name: 'Scarlet monkeyflower', facts: ['Scarlet monkeyflowers only grow where there\'s water — a sure sign of a seep.', 'Hummingbirds are their favorite pollinators.'] }));
    E.push(new Landmark({ x: 560, w: 50, h: 16, name: 'Seep spring', react: 'view', text: ['Drip… drip… drip.', 'Water that fell as snow on the plateau may have taken years to work its way through the rock to this spot.'] }));
    E.push(new Bench({ x: 380 }));
    E.push(new Wren({ x: 450 }), new Wren({ x: 720 }), new Butterfly({ x: 520 }), new Butterfly({ x: 600 }));
  } else if (id === 'bridges') {
    E.push(new Sign({ x: 120, name: 'Two Bridges', title: 'Two Bridges', text: ['Two natural "bridges" — really windows — worn right through a thin fin of rock.', 'Frost and rain widen these holes a little more every year. Someday they\'ll collapse, and new ones will open elsewhere.', 'Hikers say the view from the top of the fin is worth the scramble…'] }));
    E.push(new Landmark({ x: 340, w: 60, h: 115, name: 'Natural window', text: ['Look through the window: sky on the other side of solid rock!', 'Windows form when weathering eats through a narrow fin from both sides.'] }));
    E.push(new Landmark({ x: 560, w: 50, h: 100, name: 'Smaller window', text: ['A younger, smaller window. Give it a few thousand winters.'] }));
    E.push(new Falcon({ x: 500 }), new Lizard({ x: 280 }), new Lizard({ x: 620 }));
  } else if (id === 'overlook') {
    E.push(new Sign({ x: 140, name: 'Moonlit Overlook', title: 'Moonlit Overlook', view: true, stars: true, text: ['A quiet overlook far from the crowds.', 'On clear nights this is one of the darkest places in North America — the Milky Way casts faint shadows.'] }));
    E.push(new Bench({ x: 320 }));
    E.push(new Landmark({ x: 600, w: 14, h: 14, name: 'Old telescope', react: 'view', text: ['Somebody left a little telescope here for everyone to use.', 'By day you can see plateaus more than 100 miles away. By night… well, come back and see!'] }));
    E.push(new Bluebird({ x: 250 }), new Bluebird({ x: 720 }), new Fox({ x: 480 }), new Butterfly({ x: 200 }));
  }
  for (const p of PAGES.filter(q => q.area === id)) { const e = pageEntity(p); if (e) E.push(e); }
  for (const pt of PORTALS.filter(q => q.area === id)) E.push(new Portal(pt));
  return E;
}

// ---------- title / customizer ----------
const defaults = { skin: PEOPLE_OPTIONS.skin[1], hair: PEOPLE_OPTIONS.hair[1], style: 'short', shirt: PEOPLE_OPTIONS.shirt[0], carrier: PEOPLE_OPTIONS.carrier[0], name: 'Bean' };
let look = { ...defaults };
try { look = { ...defaults, ...JSON.parse(localStorage.getItem('hh_custom') || '{}') }; } catch { /* ignore */ }
for (const k of ['skin', 'hair', 'shirt', 'carrier', 'style']) if (!PEOPLE_OPTIONS[k].includes(look[k])) look[k] = defaults[k];
const playerLook = () => ({ ...look, pants: '#4f5f70', boots: '#5a3a24', babySkin: shade(look.skin, 0.06), bonnet: shade(look.carrier, 0.45) });

function drawPreview() {
  const pc = $('preview'), p = pc.getContext('2d');
  pc.width = 288; pc.height = 216;
  p.setTransform(6, 0, 0, 6, 0, 0);
  p.clearRect(0, 0, 48, 36);
  p.fillStyle = '#8fae5a'; p.fillRect(0, 33, 48, 3);
  drawPerson(p, 22, 34, playerLook(), { dir: 1, state: 'idle', t: 0, baby: { skin: playerLook().babySkin, bonnet: playerLook().bonnet }, babyFace: 'content', babyPos: 'front' });
}

function setupTitle() {
  const labels = { short: 'Short', long: 'Long', bun: 'Bun', curly: 'Curly' };
  document.querySelectorAll('.swatches').forEach(box => {
    const key = box.dataset.key;
    for (const v of PEOPLE_OPTIONS[key]) {
      const b = document.createElement('button');
      if (key === 'style') { b.textContent = labels[v]; b.classList.add('txt'); }
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
  game.player.look = playerLook();
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
  setTimeout(() => game.baby.say(`*${look.name} kicks happily*`), 1800);
  if (game.journal.s.hikes === 1) {
    setTimeout(() => game.ui.notify('💡 Tap your baby whenever they need you!', 5), 3500);
    setTimeout(() => game.ui.notify('⤴ Jump over logs and boulders · 🏃 hold to run', 5), 9000);
  }
}

// ---------- main loop ----------
function update(dt) {
  game.now += dt;
  if (game.minigames.on) return;
  game.time = (game.time + dt / CYCLE_SECONDS * game.timeSpeed * game.debugSpeed) % 1;
  game.sky = sky(game.time, game.director.storm.level);
  audio.setNight(game.sky.night);
  game.flashA = Math.max(0, game.flashA - dt * 2.5);

  if (game.started) {
    game.hikeTime += dt;
    game.player.update(dt);
    game.baby.update(dt);
    const z = game.area.zoneAt(game.player.x);
    if (z && z !== game.zone) {
      if (!game.zone || z.name !== game.zone.name) game.ui.toast(z.name, z.sub);
      game.zone = z;
      game.journal.visit(z.name);
    }
    if (z && z.name === 'Sunset Point' && game.sky.label === 'Golden hour' && !game.journal.s.golden) { game.journal.set('golden', true); game.journal.first('saw golden hour at Sunset Point'); }
    if (game.area.id === 'bridges' && !game.journal.s.lookout && game.player.onGround && game.player.y < game.area.platforms.find(p => p.id === 'b-top').y + 1) {
      game.journal.set('lookout', true); game.audio.fanfare();
      game.ui.toast('Two Bridges Lookout', 'you made it to the top!');
      game.journal.first('reached the top of the Two Bridges fin');
      game.baby.happy('*wide-eyed*', 0.3);
    }
    // walk into pickups to grab them
    for (const e of game.entities) if (e.kind === 'pickup' && Math.abs(e.x - game.player.x) < 6 && Math.abs(e.y - game.player.y) < 9) { game.pickUp(e); break; }
    game.ui.setClock(game.time, game.sky);
    game.ui.setStamina(game.player.stamina, game.player.running);
    const face = game.baby.face;
    if (face !== game._lastFace) { game._lastFace = face; game.ui.refreshBaby(); }
    game.director.update(dt);
    game.journal.tick(dt);
    game.area.prewarm(game.player.x + game.player.dir * 200, BS);
  }
  for (const e of game.entities) {
    if (Math.abs(e.x - game.player.x) < 600 || e instanceof Runner) e.update(dt, game);
    if (game.started && e.kind === 'animal' && e.visible(game)) {
      e.noticeT = (e.noticeT ?? 0) - dt;
      if (e.noticeT <= 0 && Math.abs(e.x - game.player.x) < 70) { e.noticeT = 45; game.journal.see(e.jid); setTimeout(() => game.baby.react('animal'), 400); }
    }
  }
  game.fx.update(dt);

  const p = game.player;
  const tx = p.x - game.W * 0.45 + p.dir * 18;
  const ty = p.y - CAM_Y;
  game.camX += (tx - game.camX) * Math.min(1, dt * 3);
  game.camY += (ty - game.camY) * Math.min(1, dt * (p.onGround ? 3 : 1.2));
  game.camX = Math.max(0, Math.min(game.area.width - game.W, game.camX));
  game.ui.update(dt);
  game.ui.tickDialogue(dt);
}

function render(dt) {
  const W = game.W, S = game.S;
  const ox = game.camX, oy = game.camY;
  const s = game.sky;
  const A = game.area;
  ctx.setTransform(S, 0, 0, S, 0, 0);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  drawSky(ctx, W, H, game.time, s, game.now, ox);
  drawRainbow(ctx, W, H, Math.min(1, game.director.storm.rainbow / 6));

  wctx.setTransform(1, 0, 0, 1, 0, 0);
  wctx.clearRect(0, 0, wcan.width, wcan.height);
  wctx.setTransform(S, 0, 0, S, 0, 0);
  wctx.imageSmoothingEnabled = true; wctx.imageSmoothingQuality = 'high';
  for (const L of A.bg) wctx.drawImage(L.c, -ox * L.p, L.base - LAYER_BASE - oy * L.p, L.c.width / BGS, L.c.height / BGS);
  A.drawNear(wctx, ox, oy, W, H, BS);
  const order = { landmark: 0, facility: 0, portal: 1, sign: 1, bench: 1, flower: 1, pickup: 2, animal: 3, person: 4 };
  const vis = game.entities.filter(e => e.visible(game) && e.x > ox - 60 && e.x < ox + W + 60);
  vis.sort((a, b) => (order[a.kind] ?? 2) - (order[b.kind] ?? 2));
  for (const e of vis) e.draw(wctx, game, ox, oy);
  if (game.started) game.player.draw(wctx, ox, oy);
  // soft out-of-focus foreground
  for (const f of A.fg) {
    const fx = f.x - ox * 1.3;
    if (fx < -60 || fx > W + 20) continue;
    const spr = foregroundSprite(f.kind, f.seed);
    wctx.drawImage(spr.c, fx, H - spr.h * f.s * 0.75 + (game.player.y - CAM_Y - oy) * 0.3, spr.w * f.s, spr.h * f.s);
  }

  const lamp = game.started ? { x: game.player.x - ox + game.player.dir * 8, y: game.player.y - oy - 18 } : null;
  lctx.setTransform(S, 0, 0, S, 0, 0);
  drawLight(lctx, W, H, s, lamp, A.ambient || 1);
  lctx.globalCompositeOperation = 'destination-in';
  lctx.drawImage(wcan, 0, 0, W, H);
  lctx.globalCompositeOperation = 'source-over';
  wctx.globalCompositeOperation = 'multiply';
  wctx.drawImage(lcan, 0, 0, W, H);
  wctx.globalCompositeOperation = 'source-over';

  ctx.drawImage(wcan, 0, 0, W, H);
  if (!A.shelter) drawRays(ctx, W, H, game.time, s, game.now);
  game.fx.weather(ctx, W, H, dt, A.shelter ? 0 : game.director.storm.level, s.label === 'Golden hour' || s.label === 'Morning' ? 1 : 0);
  game.fx.draw(ctx, ox, oy);
  if (game.flashA > 0) { ctx.fillStyle = `rgba(255,255,250,${game.flashA})`; ctx.fillRect(0, 0, W, H); }
}

let last = performance.now();
function frame(t) {
  const dt = Math.min(0.05, (t - last) / 1000);
  last = t;
  update(dt);
  if (!game.minigames.on) render(dt);
  requestAnimationFrame(frame);
}

// ---------- boot ----------
function boot() {
  resize();
  game.ui = new UI(game);
  game.journal = new Journal(game);
  game.bag = new Bag(12);
  if (game.journal.s.bag) game.bag.load(game.journal.s.bag);
  else for (const [id, n] of STARTING_BAG) game.bag.add(id, n);
  game.bag.onChange(() => { game.ui.renderHotbar(); game.journal.mark(); });
  game.areas = makeAreas();
  game.area = game.areas.trail;
  setArea(game.area);
  game.baby = new Baby(game, look.name);
  game.player = new Player(game, playerLook());
  game.director = new Director(game);
  game.events = game.director;
  game.minigames = new MiniGames(game);
  for (const id of ['seep', 'bridges', 'overlook']) { setArea(game.areas[id]); game.areaEnts[id] = populateSide(id); }
  setArea(game.area);
  game.areaEnts.trail = populateTrail();
  game.ensureBackground(game.area);
  const sx = parseFloat(params.get('x'));
  game.player.place(isNaN(sx) ? 110 : sx);
  if (params.get('area') && game.areas[params.get('area')]) game.enterArea(params.get('area'), isNaN(sx) ? 60 : sx);
  game.camX = Math.max(0, game.player.x - game.W * 0.45);
  game.camY = game.player.y - CAM_Y;
  game.sky = sky(game.time);
  setupInput(game, canvas);
  setupTitle();

  $('babyPanel').addEventListener('click', () => { audio.unlock(); game.openBabyMenu(); });
  $('btnPhoto').addEventListener('click', () => game.takePhoto());
  $('btnMute').addEventListener('click', () => { audio.unlock(); game.toggleMute(); });
  $('btnAlbum').addEventListener('click', () => openAlbum());
  $('btnBag').addEventListener('click', () => { audio.unlock(); game.ui.openBag(); });
  $('btnJournal').addEventListener('click', () => { audio.unlock(); game.ui.openJournal(); });
  $('btnMap').addEventListener('click', () => { audio.unlock(); game.ui.openMap(); });
  const jumpBtn = $('btnJump'), runBtn = $('btnRun');
  jumpBtn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); audio.unlock(); if (game.started) game.player.jump(); });
  runBtn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); audio.unlock(); game.player.runHeld = true; runBtn.classList.add('on'); });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) runBtn.addEventListener(ev, () => { game.player.runHeld = false; runBtn.classList.remove('on'); });
  $('title').addEventListener('pointerdown', e => e.stopPropagation());
  document.addEventListener('visibilitychange', () => { if (document.hidden) game.journal.save(); });
  window.addEventListener('pagehide', () => game.journal.save());

  if (params.has('play')) start();
  requestAnimationFrame(frame);
}
boot();
