// Blue Spring Stroll — boot, game state, rendering loop.
import { drawBabyHead } from './figures.js?v=20261116a';
import { snapshot } from './color.js?v=20261116a';
import { World, groundY, onBoardwalk, zoneAt, WORLD_W, DECK_Y, WATER_Y, drawWater, drawFrontRail, drawMist } from './world.js?v=20261116a';
import { sky, drawSky, drawLight, drawRays, CYCLE_SECONDS } from './timeofday.js?v=20261116a';
import * as audio from './audio.js?v=20261116a';
import { UI, addPhoto, openAlbum } from './ui.js?v=20261116a';
import { Player } from './player.js?v=20261116a';
import { Baby } from './baby.js?v=20261116a';
import { setupInput } from './input.js?v=20261116a';
import { FX } from './fx.js?v=20261116a';
import { Customizer, loadLook, saveLook, randomName } from './custom.js?v=20261116a';
import { Progress } from './progress.js?v=20261116a';
import { plantsFor, Plant } from './flora.js?v=20261116a';
import {
  Manatee, Gar, FishSchool, Alligator, Turtles, Wader, Anhinga, Osprey, Otter, Armadillo, Owl,
  Person, Visitor, Sign, Bench, Landmark, Pacifier, Anole, Skink, WaterSnake, Softshell, Tortoise,
} from './entities.js?v=20261116a';

const H = 128, MIN_W = 200, MAX_W = 300, CAM_Y = 10;
const params = new URLSearchParams(location.search);
const $ = id => document.getElementById(id);
const pick = a => a[(Math.random() * a.length) | 0];
const rand = (a, b) => a + Math.random() * (b - a);

const canvas = $('screen');
const ctx = canvas.getContext('2d');
const wcan = document.createElement('canvas'), wctx = wcan.getContext('2d');
const lcan = document.createElement('canvas'), lctx = lcan.getContext('2d');
const DPR = Math.min(3, window.devicePixelRatio || 1);
const BS = Math.max(1.5, Math.min(3, Math.round(window.innerHeight * DPR / H * 2) / 2));

const game = {
  W: 320, H, S: 3, camX: 0, camY: 0,
  time: parseFloat(params.get('t') ?? '0.07'),
  timeSpeed: 1, debugSpeed: parseFloat(params.get('speed') ?? '1'),
  now: 0, started: false, entities: [], zone: null, sky: null, fx: new FX(),
  audio: { ...audio.sfxs, unlock: audio.unlock },
  hasPaci: false,
  track(type, value, ent) { if (this.progress && this.started) this.progress.track(type, value, ent); },
  guidePortrait(id) {
    if (id.startsWith('plant:')) { const p = this.entities.find(e => e instanceof Plant && e.pid === id.slice(6)); return p && p.portrait(); }
    const e = this.entities.find(x => x.jid === id); return e && e.portrait();
  },

  get onBoardwalk() { return onBoardwalk(this.player.x); },
  toScreen(wx, wy) { const r = this.canvasRect; return { x: r.left + (wx - this.camX) / this.W * r.width, y: r.top + (wy - this.camY) / this.H * r.height }; },
  babyPos() { const a = this.player.babyAnchor(); return { x: a.x, y: a.y - 3 }; },
  parentHead() { const H = this.player.look.parent.height || 1; return { x: this.player.x - this.player.dir * 6, y: this.player.y - 35 * H + (this.player.state === 'sit' ? 3 : 0) }; },
  playerBox() { const p = this.player; return { x: p.x - 9, y: p.y - 33, w: 18, h: 33 }; },
  babyPortrait() {
    const face = this.baby.face, key = face + (this.baby.wearing.hat ? 'h' : '');
    this._bp = this._bp || {};
    if (!this._bp[key]) this._bp[key] = snapshot(12, 12, c => { c.fillStyle = '#f6efe2'; c.fillRect(0, 0, 12, 12); drawBabyHead(c, 6, 7, 4.2, face, { ...this.player.look.baby, hatOn: this.baby.wearing.hat }, 1); }, 6);
    return this._bp[key];
  },

  tap(wx, wy) {
    if (!this.started) return;
    if (this.ui.dlg) { this.ui.advance(); return; }
    this.ui.closeMenu();
    const inBox = (b, pad) => wx >= b.x - pad && wx <= b.x + b.w + pad && wy >= b.y - pad && wy <= b.y + b.h + pad;
    if (inBox(this.playerBox(), 2)) { this.player.stop(); this.openBabyMenu(); return; }
    const hits = this.entities.filter(e => e.visible(this) && inBox(e.box(), e.kind === 'pickup' ? 7 : 4));
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
    if (e.kind === 'pickup') { p.walkTo(e.x); return; }
    const ax = e.approachX(p.x);
    const arrive = () => { p.dir = e.x >= p.x ? 1 : -1; const acts = e.actions(this); if (acts) this.ui.openMenu(e.name, acts, { portrait: e.portrait() }); };
    if (Math.abs(ax - p.x) < 3 || (e.reach > 0 && Math.abs(e.x - p.x) <= e.reach + 2)) { if (p.state === 'sit' && e !== p.seat) p.stand(); arrive(); }
    else p.walkTo(ax, arrive);
  },
  interactNearest() {
    let best = null, bd = 50;
    for (const e of this.entities) { if (!e.visible(this) || e.kind === 'pickup') continue; const d = Math.abs(e.x - this.player.x); if (d < bd) { bd = d; best = e; } }
    if (best) this.goInteract(best); else this.openBabyMenu();
  },
  openBabyMenu() { if (!this.started) return; this.ui.closeDialogue(false); this.baby.openMenu(); },
  sitOn(bench) {
    this.player.sit(bench);
    this.ui.openMenu('Resting on the bench', [
      { label: '⏩ Watch the time pass', run: () => { this.timeSpeed = 12; this.ui.toast('Time drifts by…', 'tap anywhere to get up'); } },
      { label: '👶 Baby', run: () => this.openBabyMenu() },
      { label: '🚶 Get up', run: () => this.player.stand() },
    ]);
  },
  onStand() { this.timeSpeed = 1; },
  dropPacifier() {
    const b = this.baby;
    if (!b.wearing.pacifier || b.need || b.napping) return;
    b.wearing.pacifier = false;
    const x = Math.max(920, this.player.x - this.player.dir * rand(14, 26));
    this.entities.push(new Pacifier({ x, y: DECK_Y }));
    b.say(pick(['*flings pacifier*', 'uh-oh!', '*drops it… on purpose*']));
    this.audio.pop();
    setTimeout(() => b.setNeed('lost'), 1000);
  },
  takePhoto() {
    if (!this.started) return;
    this.audio.unlock(); this.audio.shutter(); this.ui.flash();
    try { addPhoto(canvas.toDataURL('image/jpeg', 0.86)); } catch (err) { console.warn('photo failed', err); }
    this.track('photo');
    this.ui.toast('Snap! 📸', 'saved to your album');
    if (!this.baby.napping) setTimeout(() => this.baby.say('*cheese!*'), 500);
  },
  toggleMute() { audio.setMuted(!audio.isMuted()); $('btnMute').textContent = audio.isMuted() ? '🔇' : '🔊'; },
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
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));

// ---------- population ----------
function populate() {
  const E = [];
  const S = (x, title, text, view) => E.push(new Sign({ x, title, text, view }));
  S(60, 'St. Johns River', ['The St. Johns is Florida\'s longest river, and one of the few rivers in North America that flows north.', 'Blue Spring\'s clear water pours into it here. Boat tours leave from this dock to explore the river.'], true);
  S(470, 'Thursby House', ['Louis Thursby built this house in 1872 and grew oranges here. Steamboats on the St. Johns stopped at the Thursby landing to pick up fruit and passengers.', 'The house sits on top of a shell mound — a midden of snail and mussel shells left by Native peoples who lived along this river for thousands of years, long before any steamboats.']);
  S(935, 'Spring Run Boardwalk', ['The boardwalk follows the spring run about a third of a mile, from the river up to the spring itself.', 'Stay on the boardwalk and keep your voice soft — the manatees are resting below.']);
  S(1980, 'Manatee Refuge', ['Blue Spring is a designated manatee refuge. From mid-November to mid-March, the spring run is closed to swimming and boating so the manatees can rest in the warm water.', 'In the 1970s only a few dozen manatees wintered here. Thanks to protection, hundreds now come on the coldest days.'], true);
  S(3195, 'The Spring Boil', ['This is where it all begins: Blue Spring is a "first-magnitude" spring, pouring out roughly 100 million gallons of water a day from the Floridan Aquifer.', 'The water stays near 72–73°F all year — chilly for swimming in summer, but cozy for a manatee in January.'], true);
  for (const x of [1450, 2150, 2720, 3120]) E.push(new Bench({ x }));
  E.push(new Bench({ x: 3050, occupied: true }));
  E.push(new Landmark({ x: 640, w: 64, h: 60, name: 'Thursby House', react: 'view', text: ['A two-story frame house with wide double porches, built in 1872.', 'From the upstairs porch, the Thursbys could watch steamboats come up the river.'] }));
  E.push(...plantsFor(game.world));

  // wildlife
  const manatees = [];
  const nM = 7 + (Math.random() * 6 | 0);
  for (let i = 0; i < nM; i++) { const m = new Manatee({ x: rand(900, 3400) }); manatees.push(m); E.push(m); }
  for (let i = 0; i < 2; i++) { const mom = pick(manatees); E.push(new Manatee({ x: mom.x - 8, calf: true, follow: mom })); }
  for (const x of [1100, 1900, 2800]) E.push(new Gar({ x: x + rand(-80, 80) }));
  for (const x of [1350, 2400, 3000]) E.push(new FishSchool({ x: x + rand(-60, 60) }));
  E.push(new Alligator({ x: 340 }));
  E.push(new Alligator({ x: 200, swimOnly: true, range: 140, dir: 1 }));
  E.push(new Alligator({ x: 2560, swimOnly: true, range: 200, dir: -1 }));
  E.push(new Alligator({ x: 2880, juvenile: true }));
  E.push(new Softshell({ x: 1650 }));
  E.push(new WaterSnake({ x: 450, dir: 1 }));
  E.push(new Anole({ x: 1352, y: DECK_Y - 6 }));
  E.push(new Anole({ x: 2712, y: DECK_Y - 6, dir: -1 }));
  E.push(new Skink({ x: 870 }));
  E.push(new Tortoise({ x: 300 }));
  E.push(new Turtles({ x: 1260 }));
  E.push(new Wader({ x: 1520, y: 97, species: 'heron' }));
  E.push(new Wader({ x: 2330, y: 97, species: 'egret' }));
  for (const x of [470, 492, 510]) E.push(new Wader({ x: x + rand(-4, 4), species: 'ibis' }));
  E.push(new Anhinga({ x: 1726, y: WATER_Y + 2 - 26.5 }));
  E.push(new Osprey({ x: 1600 }));
  E.push(new Otter({ x: 260 }));
  E.push(new Armadillo({ x: 800 }));
  E.push(new Owl({ x: 1140, y: 58 }));

  // people
  E.push(new Person({
    x: 2010, name: 'Ranger Dee', greet: 'Good morning! Manatee count is up today!',
    look: { height: 1, build: 1, skin: '#a56d47', eyes: '#4a3426', hairStyle: 'ponytail', hair: '#1e1612', facial: 'none', glasses: 'none', top: 'button', topColor: '#b8a878', bottom: 'pants', bottomColor: '#4a5a3a', shoes: 'boots', shoeColor: '#5a3a24', hat: 'ranger', ranger: true },
    lines: ['Each morning we count the manatees from this boardwalk. You can join in — count the gray shapes below!', 'Watch for the little puffs at the surface. Manatees come up to breathe every few minutes.', 'Please keep the run quiet and stay on the boardwalk. They\'re here to rest and stay warm.'],
    topics: [
      { label: '🌊 About manatees', pages: ['Manatees are gentle plant-eaters. They can weigh over 1,000 pounds and eat about a tenth of their body weight in plants every day.', 'They\'re federally protected. The biggest dangers to them are cold water, boat strikes, and the loss of the seagrass they eat.'] },
      { label: '💧 About the spring', pages: ['Rain soaks into the ground and slowly filters through limestone into the Floridan Aquifer. Here it bubbles back up, clear and cool.', 'That\'s why protecting the land around springs matters — whatever goes into the ground can end up in the water.'] },
      { label: '📜 History here', pages: ['People have lived along this river for thousands of years. The shell mound under the Thursby House is evidence of that long history.', 'In 1972, Jacques Cousteau filmed manatees here, which helped bring the world\'s attention to protecting them.'] },
    ],
  }));
  const fam = new Person({ x: 760, name: 'The Ramírez family', greet: 'Aww, how old is your little one?', look: { height: 1.03, build: 1.05, skin: '#c48a62', eyes: '#4a3426', hairStyle: 'short', hair: '#1e1612', facial: 'beard', glasses: 'none', top: 'tee', topColor: '#5e8f62', bottom: 'shorts', bottomColor: '#5a6878', shoes: 'sneakers', shoeColor: '#f2f0ea', hat: 'cap', hatColor: '#3e6a96', pack: true, packColor: '#c9584b' },
    lines: ['We\'re looking for the armadillo — my daughter is obsessed!', 'We toured the Thursby House. Imagine steamboats pulling right up to the yard!', 'Our first time seeing manatees. They look like big gentle potatoes.'] });
  fam.kid = { kid: true, height: 1, build: 1, skin: '#c48a62', eyes: '#4a3426', hairStyle: 'braids', hair: '#1e1612', facial: 'none', glasses: 'none', top: 'tee', topColor: '#e8b04a', bottom: 'skirt', bottomColor: '#8a6ab0', shoes: 'sandals', shoeColor: '#c9584b', hat: 'none' };
  E.push(fam);
  E.push(new Person({ x: 1500, name: 'Birder with binoculars', greet: 'Shh… heron at two o\'clock.', holding: 'binoculars', look: { height: 0.95, build: 0.9, skin: '#f7dcc8', eyes: '#3f6a8a', hairStyle: 'bun', hair: '#d8d4ce', facial: 'none', glasses: 'round', top: 'button', topColor: '#e8dcc0', bottom: 'pants', bottomColor: '#8a7454', shoes: 'boots', shoeColor: '#5a3a24', hat: 'sun', hatColor: '#e8dcc0' },
    lines: ['I\'ve logged forty species this week. The anhinga drying its wings is my favorite.', 'Look for the osprey overhead — they dive feet-first for fish!', 'White ibis on the lawn by the old house. Lovely curved bills.'] }));
  E.push(new Person({ x: 2630, name: 'Photographer', greet: 'The light on the water is perfect right now.', holding: 'camera', look: { height: 1.05, build: 1, skin: '#6a4129', eyes: '#4a3426', hairStyle: 'afro', hair: '#1e1612', facial: 'stubble', glasses: 'none', top: 'hoodie', topColor: '#2f3a44', bottom: 'pants', bottomColor: '#2b2f38', shoes: 'sneakers', shoeColor: '#2b2b30', hat: 'none', pack: true, packColor: '#4a4a50' },
    lines: ['Tip: polarized sunglasses cut the glare so you can see the manatees underwater.', 'Early mornings in winter, the mist rises off the spring like steam. Magic.', 'Got a great shot of a mother and calf surfacing together.'] }));
  E.push(new Person({ x: 3050, name: 'Ruth', greet: 'Morning, dear.', seated: true, look: { height: 0.93, build: 1, skin: '#efc6a6', eyes: '#5a7a4a', hairStyle: 'short', hair: '#d8d4ce', facial: 'none', glasses: 'square', top: 'button', topColor: '#d98aa0', bottom: 'pants', bottomColor: '#b8a888', shoes: 'sneakers', shoeColor: '#f2f0ea', hat: 'none', cane: true },
    lines: ['I\'ve been coming here every winter since the seventies, when you could count the manatees on two hands.', 'Now look at them all. Makes an old heart happy.', 'Sit a while. The spring has a way of slowing everything down.'] }));
  for (let i = 0; i < 3; i++) E.push(new Visitor({ x: rand(200, 3300), dir: pick([1, -1]) }));
  return E;
}

// ---------- title / customizer ----------
const look = loadLook();
let babyName = randomName();
let customizer = null;

function openCustomizer(mode) {
  $('custom').hidden = false;
  $('custTitle').hidden = mode !== 'title';
  $('custGo').textContent = mode === 'title' ? 'Start the stroll ▶' : 'Done';
  $('custHeading').textContent = mode === 'title' ? '' : 'Change your look';
  customizer.render();
}
function start() {
  audio.unlock();
  babyName = ($('babyName').value || '').trim().slice(0, 14) || randomName();
  saveLook(look);
  game.baby.name = babyName;
  $('babyLabel').textContent = babyName;
  game._bp = null;
  $('custom').hidden = true;
  if (!game.started) {
    $('hud').hidden = false;
    $('btnMute').textContent = audio.isMuted() ? '🔇' : '🔊';
    game.started = true;
    game.zone = null;
    game.ui.needChanged();
    game.ui.refreshTasks();
    setTimeout(() => game.baby.say(`*${babyName} kicks happily*`), 1800);
    setTimeout(() => game.ui.notify('📋 Check today\'s task list — and fill your field guide 📖', 5), 9000);
    setTimeout(() => game.ui.notify('💡 Tap the boardwalk to walk · tap animals and people · tap your baby when they need you', 6), 3000);
  }
  if (game.baby.carrier === 'back' && look.carrier.type === 'wrap') game.baby.carrier = 'front';
  if (look.carrier.type === 'frame') game.baby.carrier = 'back';
  else if (game.baby.carrier === 'back' && look.carrier.type !== 'structured') game.baby.carrier = 'front';
}

// ---------- loop ----------
function update(dt) {
  game.now += dt;
  game.time = (game.time + dt / CYCLE_SECONDS * game.timeSpeed * game.debugSpeed) % 1;
  game.sky = sky(game.time, 0);
  audio.setNight(game.sky.night);
  if (game.started) {
    game.player.update(dt);
    game.baby.update(dt);
    const z = zoneAt(game.player.x);
    if (z && z !== game.zone) { if (game.zone) game.ui.toast(z.name, z.sub); game.zone = z; game.track('zone', z.name); }
    game.sceneT = (game.sceneT || 0) - dt;
    if (game.sceneT <= 0) { game.sceneT = 0.5; const x = game.player.x; audio.setScene({ water: onBoardwalk(x) ? 1 : 0.4, boil: Math.exp(-Math.pow((x - 3340) / 220, 2)), river: x < 700 ? 1 : 0 }); }
    for (const e of game.entities) if (e instanceof Pacifier && Math.abs(e.x - game.player.x) < 6) {
      game.entities.splice(game.entities.indexOf(e), 1); game.hasPaci = true; game.audio.pickup?.(); game.fx.sparkles(e.x, e.y - 4, 4);
      game.ui.notify(`Picked up the pacifier — give it back to ${game.baby.name}!`); game.ui.needChanged(); break;
    }
    game.ui.setClock(game.time, game.sky);
    const face = game.baby.face;
    if (face !== game._lastFace) { game._lastFace = face; game.ui.refreshBaby(); }
    game.world.prewarm(game.player.x + game.player.dir * 200, BS);
  }
  for (const e of game.entities) {
    if (Math.abs(e.x - game.player.x) < 500 || e instanceof Visitor || e instanceof Osprey || e instanceof Manatee) e.update(dt, game);
    if (game.started && e.kind === 'animal' && e.visible(game)) {
      e.noticeT = (e.noticeT ?? rand(0, 10)) - dt;
      if (Math.abs(e.x - game.player.x) < 60) game.track('see', e.jid, e);
      if (e.noticeT <= 0 && Math.abs(e.x - game.player.x) < 60) { e.noticeT = 50; setTimeout(() => game.baby.react('animal'), 400); }
    }
  }
  game.fx.update(dt);
  const p = game.player;
  const tx = p.x - game.W * 0.45 + p.dir * 16;
  game.camX += (tx - game.camX) * Math.min(1, dt * 3);
  game.camX = Math.max(0, Math.min(WORLD_W - game.W, game.camX));
  game.camY = CAM_Y;
  game.ui.update(dt);
  game.ui.tickDialogue(dt);
}

function render() {
  const W = game.W, S = game.S, ox = game.camX, oy = game.camY, s = game.sky;
  ctx.setTransform(S, 0, 0, S, 0, 0);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  drawSky(ctx, W, H, game.time, s, game.now, ox);
  wctx.setTransform(1, 0, 0, 1, 0, 0); wctx.clearRect(0, 0, wcan.width, wcan.height);
  wctx.setTransform(S, 0, 0, S, 0, 0);
  wctx.imageSmoothingEnabled = true; wctx.imageSmoothingQuality = 'high';
  for (const L of game.layers) wctx.drawImage(L.c, -ox * L.p, -oy * L.p, L.c.width / L.S, L.c.height / L.S);
  game.world.drawNear(wctx, ox, oy, W, BS);
  const vis = game.entities.filter(e => e.visible(game) && e.x > ox - 60 && e.x < ox + W + 60);
  for (const e of vis) if (e.under) e.draw(wctx, game, ox, oy);
  drawWater(wctx, ox, oy, W, H, game.now, s);
  const order = { landmark: 0, plant: 0, sign: 1, bench: 1, pickup: 2, animal: 3, person: 4 };
  const above = vis.filter(e => !e.under).sort((a, b) => (order[a.kind] ?? 2) - (order[b.kind] ?? 2));
  for (const e of above) e.draw(wctx, game, ox, oy);
  for (const e of vis) if (e.drawAbove) e.drawAbove(wctx, ox, oy);
  if (game.started) game.player.draw(wctx, ox, oy);
  drawFrontRail(wctx, ox, oy, W);
  const mist = game.time < 0.14 ? 1 - game.time / 0.14 : game.time > 0.9 ? (game.time - 0.9) / 0.1 : 0;
  drawMist(wctx, ox, oy, W, game.now, mist);
  const lamp = game.started ? { x: game.player.x - ox + game.player.dir * 8, y: game.player.y - oy - 20 } : null;
  lctx.setTransform(S, 0, 0, S, 0, 0);
  drawLight(lctx, W, H, s, lamp, 1);
  lctx.globalCompositeOperation = 'destination-in'; lctx.drawImage(wcan, 0, 0, W, H); lctx.globalCompositeOperation = 'source-over';
  wctx.globalCompositeOperation = 'multiply'; wctx.drawImage(lcan, 0, 0, W, H); wctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(wcan, 0, 0, W, H);
  drawRays(ctx, W, H, game.time, s, game.now);
  game.fx.draw(ctx, ox, oy);
}

let last = performance.now();
function frame(t) {
  const dt = Math.min(0.05, (t - last) / 1000); last = t;
  update(dt); render();
  requestAnimationFrame(frame);
}

function boot() {
  resize();
  game.world = new World();
  game.layers = game.world.bakeLayers(MAX_W + 60, Math.min(2, BS * 0.75));
  game.ui = new UI(game);
  game.progress = new Progress(game);
  game.baby = new Baby(game, babyName);
  game.player = new Player(game, look);
  if (look.carrier.type === 'frame') game.baby.carrier = 'back';
  const sx = parseFloat(params.get('x'));
  game.player.x = isNaN(sx) ? 120 : sx; game.player.y = groundY(game.player.x);
  game.camY = CAM_Y;
  game.camX = Math.max(0, Math.min(WORLD_W - game.W, game.player.x - game.W * 0.45));
  game.entities = populate();
  game.sky = sky(game.time, 0);
  setupInput(game, canvas);
  customizer = new Customizer(look, babyName, () => { game._bp = null; });
  $('custGo').addEventListener('click', start);
  $('babyPanel').addEventListener('click', () => { audio.unlock(); game.openBabyMenu(); });
  $('btnPhoto').addEventListener('click', () => game.takePhoto());
  $('btnMute').addEventListener('click', () => { audio.unlock(); game.toggleMute(); });
  $('btnAlbum').addEventListener('click', () => openAlbum());
  $('btnLook').addEventListener('click', () => { audio.unlock(); openCustomizer('edit'); });
  $('btnTasks').addEventListener('click', () => { audio.unlock(); game.ui.openTasks(); });
  $('btnGuide').addEventListener('click', () => { audio.unlock(); game.ui.openGuide(); });
  openCustomizer('title');
  if (params.has('play')) start();
  requestAnimationFrame(frame);
}
boot();
