// Everything you can tap: animals, people, pickups and scenery — drawn as illustrated vectors.
import {
  drawPerson, drawDeer, drawPronghorn, drawPrairieDog, drawSquirrel, drawLizard, drawButterfly,
  drawRaven, drawJay, drawWren, drawBluebird, drawFalcon, drawOwl, drawFox, drawItemShape, shadowBlob,
  PEOPLE_OPTIONS,
} from './figures.js';
import { groundY } from './world.js';
import { ITEMS, LITTER } from './items.js';
import { snapshot, canvas, lin, rad, ellipse, circle, shade, rng } from './color.js';

const pick = a => a[(Math.random() * a.length) | 0];
const rand = (a, b) => a + Math.random() * (b - a);

/** Cache a vector drawing as a hi-res bitmap. draw(g) paints with (0,0) at bottom-centre. */
const _cache = {};
function cached(key, w, h, draw, sc = 5) {
  if (!_cache[key]) {
    const c = canvas(w * sc, h * sc), g = c.getContext('2d');
    g.scale(sc, sc); g.translate(w / 2, h);
    draw(g);
    _cache[key] = c;
  }
  return _cache[key];
}
function blit(ctx, key, w, h, x, y, draw) { ctx.drawImage(cached(key, w, h, draw), x - w / 2, y - h, w, h); }

export class Entity {
  constructor(o) {
    this.reach = 18;
    this.w = 12; this.h = 16;
    this.kind = 'thing';
    Object.assign(this, o);
    if (this.y == null) this.y = groundY(this.x);
  }
  visible() { return true; }
  box() { return { x: this.x - this.w / 2, y: this.y - this.h, w: this.w, h: this.h }; }
  approachX(px) { return px < this.x ? this.x - this.reach : this.x + this.reach; }
  update() { }
  draw() { }
  actions() { return []; }
  head() { return { x: this.x, y: this.y - this.h - 2 }; }
  portrait() { return null; }
}

// ======================= ANIMALS =======================
class Animal extends Entity {
  constructor(o) {
    super({ reach: 34, kind: 'animal', ...o });
    this.watchT = 0;
    this.dir = Math.random() < 0.5 ? 1 : -1;
    this.t = Math.random() * 10;
  }
  watch(g) {
    this.watchT = 10;
    g.journal.see(this.jid);
    g.ui.say('label', () => this.head(), this.name, { dur: 6, cls: 'label' });
    if (this.sound) g.audio[this.sound]();
    g.ui.dialogue(this.name, this.facts, null, this.portrait());
    setTimeout(() => g.baby.react('animal'), 900);
  }
  actions(g) {
    return [
      { label: '📸 Photograph', primary: true, run: () => { this.watchT = 12; g.journal.see(this.jid); g.minigames.photo(this); } },
      { label: '👀 Watch quietly', run: () => this.watch(g) },
      { label: '👉 Show baby', run: () => { g.journal.see(this.jid); if (!g.baby.react('animal')) g.ui.say('parent', () => g.parentHead(), '(they\'re napping — maybe later)'); } },
    ];
  }
  /** Draw this animal into any context at (x, y) — used by the world and the photo mini-game. */
  render(ctx, x, y, dir, t) { }
  draw(ctx, g, ox, oy) { this.render(ctx, this.x - ox, this.y - oy, this.dir, this.t); }
  portrait() {
    if (!this._p) this._p = snapshot(this.pw || 24, this.ph || 20, c => this.render(c, (this.pw || 24) / 2, (this.ph || 20) - 1, 1, 1), 4);
    return this._p;
  }
  playerNear(g, d) { return Math.abs(g.player.x - this.x) < d; }
  spooked(g, d = 26) { return this.watchT <= 0 && g.player.moving && g.player.running && this.playerNear(g, d); }
}

export class Deer extends Animal {
  constructor(o) {
    super({ name: 'Mule deer', jid: 'deer', w: 22, h: 22, sound: 'huff', pw: 30, ph: 26, ...o });
    this.state = 'graze'; this.stateT = rand(2, 6); this.home = this.x;
    this.facts = [
      'Mule deer are named for their big, mule-like ears — they swivel to catch the tiniest sound.',
      'They\'re most active around dawn and dusk, nibbling shrubs and grasses on the canyon floor.',
    ];
  }
  update(dt, g) {
    this.t += dt; this.watchT -= dt; this.stateT -= dt;
    if (this.state !== 'run' && (this.spooked(g, 40) || (g.player.moving && this.playerNear(g, 14) && this.watchT <= 0))) {
      this.state = 'run'; this.stateT = 1.4; this.dir = this.x > g.player.x ? 1 : -1; g.audio.huff();
    }
    if (this.stateT <= 0) {
      this.state = this.state === 'run' ? 'stand' : pick(['graze', 'graze', 'stand', 'walk']);
      this.stateT = rand(2, 6);
      if (this.state === 'walk') this.dir = this.x > this.home + 60 ? -1 : this.x < this.home - 60 ? 1 : pick([1, -1]);
      if (this.watchT > 0 && this.state === 'walk') this.state = 'graze';
    }
    if (this.state === 'walk') this.x += this.dir * 10 * dt;
    if (this.state === 'run') this.x += this.dir * 55 * dt;
    this.x = Math.max(this.home - 140, Math.min(this.home + 140, this.x));
    this.y = groundY(this.x);
  }
  render(ctx, x, y, dir, t) {
    drawDeer(ctx, x, y, dir, { state: this.state || 'stand', t, phase: t * (this.state === 'run' ? 14 : 5) });
  }
}

export class Pronghorn extends Animal {
  constructor(o) {
    super({ name: 'Pronghorn', jid: 'pronghorn', w: 20, h: 18, sound: 'huff', pw: 26, ph: 22, ...o });
    this.state = 'stand'; this.stateT = rand(3, 6);
    this.facts = [
      'Pronghorn are the fastest land animals in North America — they can sprint around 55 miles per hour!',
      'People often call them "antelope," but their closest living relatives are actually giraffes and okapis.',
    ];
  }
  update(dt, g) {
    this.t += dt; this.watchT -= dt; this.stateT -= dt;
    if (this.state !== 'run' && this.spooked(g, 40)) { this.state = 'run'; this.stateT = 1.5; this.dir = this.x > g.player.x ? 1 : -1; }
    if (this.stateT <= 0) {
      this.state = this.watchT > 0 ? 'stand' : pick(['stand', 'stand', 'walk', 'run']);
      this.stateT = this.state === 'run' ? rand(1.5, 2.5) : rand(3, 6);
      if (this.x > this.x1 - 40) this.dir = -1; else if (this.x < this.x0 + 40) this.dir = 1; else this.dir = pick([1, -1]);
    }
    const sp = this.state === 'run' ? 80 : this.state === 'walk' ? 12 : 0;
    this.x += this.dir * sp * dt;
    if (this.x < this.x0 || this.x > this.x1) { this.x = Math.max(this.x0, Math.min(this.x1, this.x)); this.dir *= -1; }
    this.y = groundY(this.x);
  }
  render(ctx, x, y, dir, t) { drawPronghorn(ctx, x, y, dir, { state: this.state || 'stand', t, phase: t * (this.state === 'run' ? 16 : 5) }); }
}

export class PrairieDog extends Animal {
  constructor(o) {
    super({ name: 'Utah prairie dog', jid: 'prairiedog', w: 10, h: 11, reach: 30, sound: 'squeak', pw: 14, ph: 12, ...o });
    this.state = 'up'; this.stateT = rand(2, 5);
    this.facts = [
      'Utah prairie dogs live only in southern Utah, and they\'re a threatened species. Bryce Canyon helps protect them.',
      'Family members greet each other with a "kiss" — touching their front teeth together!',
    ];
  }
  visible(g) { return !g.sky.night; }
  update(dt, g) {
    this.t += dt; this.watchT -= dt; this.stateT -= dt;
    if (this.state !== 'hidden' && this.watchT <= 0 && g.player.moving && this.playerNear(g, g.player.running ? 40 : 22)) {
      this.state = 'hidden'; this.stateT = 3.5;
      g.audio.squeak();
      g.fx.emote(() => this.head(), '!');
    }
    if (this.stateT <= 0) { this.state = this.state === 'hidden' ? 'down' : pick(['up', 'up', 'down']); this.stateT = rand(2, 5); }
  }
  render(ctx, x, y, dir) { drawPrairieDog(ctx, x, y, dir, this.state || 'up'); }
}

export class Raven extends Animal {
  constructor(o) {
    super({ name: 'Common raven', jid: 'raven', w: 16, h: 12, reach: 0, sound: 'raven', pw: 18, ph: 12, ...o });
    this.ax = this.x; this.cawT = rand(5, 12);
    this.facts = [
      'Ravens are some of the smartest birds on Earth. They solve puzzles, use tools, and remember faces.',
      'They play, too — ravens have been seen sliding down snowy slopes just for fun!',
    ];
  }
  visible(g) { return !g.sky.night; }
  update(dt, g) {
    const sp = this.watchT > 0 ? 0.35 : 1;
    this.watchT -= dt; this.t += dt * sp;
    const nx = this.ax + Math.sin(this.t * 0.25) * 110;
    this.dir = nx > this.x ? 1 : -1;
    this.x = nx;
    this.y = groundY(this.ax) - 60 + Math.sin(this.t * 0.6) * 12;
    this.cawT -= dt;
    if (this.cawT <= 0) { this.cawT = rand(10, 20); if (Math.abs(g.player.x - this.x) < 160) { g.audio.raven(); g.ui.say('rv' + this.ax, () => this.head(), 'kraaa!', { dur: 1.2 }); } }
  }
  box() { return { x: this.x - 10, y: this.y - 8, w: 20, h: 14 }; }
  head() { return { x: this.x, y: this.y - 6 }; }
  approachX() { return this.x; }
  render(ctx, x, y, dir, t) { drawRaven(ctx, x, y, dir, t, true); }
  portrait() { return this._p || (this._p = snapshot(20, 14, c => drawRaven(c, 10, 8, 1, 0.3, true), 4)); }
}

export class Jay extends Animal {
  constructor(o) {
    super({ name: "Steller's jay", jid: 'jay', w: 9, h: 9, reach: 28, sound: 'jay', pw: 12, ph: 10, ...o });
    this.state = 'perch'; this.stateT = rand(1, 3); this.vy = 0; this.hopY = 0; this.flyX = null;
    this.facts = [
      "Steller's jays are noisy, clever blue birds with a tall black crest that rises when they're excited.",
      'They\'re great mimics — they can even copy the scream of a red-tailed hawk to scare other birds away!',
    ];
  }
  visible(g) { return !g.sky.night; }
  update(dt, g) {
    this.t += dt; this.watchT -= dt; this.stateT -= dt;
    if (this.state !== 'fly' && this.watchT <= 0 && g.player.moving && this.playerNear(g, 20)) {
      this.state = 'fly';
      this.flyX = Math.max(this.x0, Math.min(this.x1, this.x + (this.x > g.player.x ? 1 : -1) * rand(50, 80)));
      if (Math.abs(this.flyX - this.x) < 20) this.flyX = this.x < (this.x0 + this.x1) / 2 ? this.x1 : this.x0;
      g.audio.jay();
      if (Math.random() < 0.15) g.events.dropNature(this.x, 'bluefeather');
    }
    if (this.state === 'fly') {
      this.dir = Math.sign(this.flyX - this.x) || 1;
      this.x += this.dir * 60 * dt;
      this.hopY = -10 - Math.sin(Math.min(1, Math.abs(this.flyX - this.x) / 60) * Math.PI) * 10;
      if (Math.abs(this.flyX - this.x) < 2) { this.state = 'perch'; this.hopY = 0; this.stateT = 2; }
    } else {
      if (this.stateT <= 0) {
        this.stateT = rand(0.6, 2.4);
        if (Math.random() < 0.55) { this.vy = -40; this.dir = this.x > this.x1 - 10 ? -1 : this.x < this.x0 + 10 ? 1 : pick([1, -1, this.dir]); }
        if (Math.random() < 0.12 && Math.abs(g.player.x - this.x) < 150) g.audio.chirp();
      }
      if (this.vy !== 0 || this.hopY < 0) {
        this.vy += 160 * dt; this.hopY += this.vy * dt; this.x += this.dir * 18 * dt;
        if (this.hopY >= 0) { this.hopY = 0; this.vy = 0; }
      }
    }
    this.y = groundY(this.x) + this.hopY;
  }
  render(ctx, x, y, dir, t) { drawJay(ctx, x, y, dir, t, this.state === 'fly'); }
}

export class Owl extends Animal {
  constructor(o) {
    super({ name: 'Great horned owl', jid: 'owl', w: 9, h: 11, reach: 26, sound: 'owl', pw: 10, ph: 12, ...o });
    this.hootT = rand(6, 12);
    this.facts = [
      'Great horned owls aren\'t really horned — those are just tufts of feathers.',
      'Soft, fringed feathers let them fly almost silently through the dark.',
    ];
  }
  visible(g) { return g.sky.night; }
  update(dt, g) {
    this.t += dt; this.watchT -= dt; this.hootT -= dt;
    if (this.hootT <= 0) { this.hootT = rand(12, 22); if (Math.abs(g.player.x - this.x) < 200) { g.audio.owl(); g.ui.say('owl', () => this.head(), 'hoo… hoo-hoo', { dur: 2 }); } }
  }
  render(ctx, x, y, dir, t) { drawOwl(ctx, x, y, t); }
}

export class Squirrel extends Animal {
  constructor(o) {
    super({ name: 'Golden-mantled ground squirrel', jid: 'squirrel', w: 11, h: 9, reach: 26, sound: 'squeak', pw: 14, ph: 10, ...o });
    this.home = this.x; this.state = 'sit'; this.stateT = rand(1, 3); this.hop = 0; this.vy = 0;
    this.facts = [
      'Golden-mantled ground squirrels look like big chipmunks — but they don\'t have stripes on their faces.',
      'They\'re bold beggars! Feeding them makes them sick and dependent on people, so the kindest thing is to just watch.',
    ];
  }
  visible(g) { return !g.sky.night; }
  actions(g) {
    return [
      ...super.actions(g),
      { label: '🥜 Share a snack?', run: () => g.ui.choice(this.name, 'The squirrel stares hopefully at your bag… but human food can make wildlife sick. What do you do?', [
        { label: '🙅 Just admire it', run: () => { g.ui.notify('🌲 Good call — wild animals stay wild!'); g.journal.inc('keptWild'); g.baby.react('animal'); } },
        { label: '😬 Toss a crumb', run: () => g.ui.dialogue('Ranger tip', ['Even crumbs teach animals to beg, and our food can make them sick. Let\'s keep wildlife wild! 🐿️'], null, this.portrait()) },
      ], this.portrait()) },
    ];
  }
  update(dt, g) {
    this.t += dt; this.watchT -= dt; this.stateT -= dt;
    const near = this.playerNear(g, 40);
    if (this.stateT <= 0) {
      this.stateT = rand(0.8, 2.5);
      if (near && !g.player.moving) this.state = 'beg';
      else {
        this.state = pick(['sit', 'sit', 'hop']);
        if (this.state === 'hop') { this.vy = -35; this.dir = this.x > this.home + 30 ? -1 : this.x < this.home - 30 ? 1 : pick([1, -1]); }
      }
    }
    if (g.player.moving && this.playerNear(g, 16) && this.watchT <= 0) { this.vy = -45; this.dir = this.x > g.player.x ? 1 : -1; this.state = 'hop'; }
    if (this.vy !== 0 || this.hop < 0) {
      this.vy += 150 * dt; this.hop += this.vy * dt; this.x += this.dir * 26 * dt;
      if (this.hop >= 0) { this.hop = 0; this.vy = 0; this.state = 'sit'; }
    }
    this.y = groundY(this.x) + this.hop;
  }
  render(ctx, x, y, dir, t) { drawSquirrel(ctx, x, y, dir, this.state === 'beg', t); }
}

export class Lizard extends Animal {
  constructor(o) {
    super({ name: 'Short-horned lizard', jid: 'lizard', w: 12, h: 5, reach: 22, pw: 14, ph: 6, ...o });
    this.home = this.x; this.run = 0;
    this.facts = [
      'Short-horned lizards are round, spiky and perfectly camouflaged against the rocks.',
      'They love warm sunshine and gobble up ants. Some can even squirt a little blood from their eyes to scare off predators!',
    ];
  }
  visible(g) { return !g.sky.night && g.time > 0.12 && g.time < 0.6; }
  update(dt, g) {
    this.t += dt; this.watchT -= dt;
    if (this.run <= 0 && g.player.moving && this.playerNear(g, 20) && this.watchT <= 0) { this.run = 0.8; this.dir = this.x > g.player.x ? 1 : -1; }
    if (this.run > 0) { this.run -= dt; this.x += this.dir * 70 * dt; }
    else if (Math.abs(this.x - this.home) > 60) { this.dir = Math.sign(this.home - this.x); this.x += this.dir * 6 * dt; }
    this.y = groundY(this.x);
  }
  render(ctx, x, y, dir, t) { drawLizard(ctx, x, y, dir, t, this.run > 0); }
}

const BF_COLS = ['#f29e4c', '#7ab0f0', '#f6d860', '#f4a0c0'];
export class Butterfly extends Animal {
  constructor(o) {
    super({ name: 'Butterfly', jid: 'butterfly', w: 10, h: 10, reach: 20, pw: 10, ph: 8, ...o });
    this.ax = this.x; this.col = BF_COLS[(Math.random() * 4) | 0]; this.ph0 = Math.random() * 6;
    this.facts = [
      'Bryce Canyon is home to dozens of kinds of butterflies, like swallowtails, painted ladies and blues.',
      'Butterflies taste with their feet! They land on flowers to check if they\'re good to sip from.',
    ];
  }
  visible(g) { return !g.sky.night && (!this.life || this.life > 0); }
  update(dt, g) {
    this.t += dt; this.watchT -= dt;
    if (this.life) this.life -= dt;
    if (this.follow) this.ax += (g.player.x + 8 - this.ax) * dt * 0.8;
    this.x = this.ax + Math.sin(this.t * 0.9 + this.ph0) * 22 + Math.sin(this.t * 2.3) * 6;
    this.y = groundY(this.ax) - 18 - Math.sin(this.t * 1.7 + this.ph0) * 9;
    this.dir = Math.cos(this.t * 0.9 + this.ph0) > 0 ? 1 : -1;
  }
  box() { return { x: this.x - 6, y: this.y - 6, w: 12, h: 12 }; }
  approachX() { return this.x; }
  head() { return { x: this.x, y: this.y - 5 }; }
  render(ctx, x, y, dir, t) { drawButterfly(ctx, x, y, dir, this.col, t); }
}

export class Wren extends Animal {
  constructor(o) {
    super({ name: 'Canyon wren', jid: 'wren', w: 8, h: 7, reach: 26, sound: 'wren', pw: 10, ph: 8, ...o });
    this.home = this.x; this.songT = rand(3, 8); this.hop = 0; this.vy = 0;
    this.facts = [
      'The canyon wren\'s song is a cascade of clear notes tumbling down the scale — like laughter echoing off the cliffs.',
      'It creeps along cliff faces with its long, curved bill, poking into cracks for insects.',
    ];
  }
  visible(g) { return !g.sky.night; }
  update(dt, g) {
    this.t += dt; this.watchT -= dt; this.songT -= dt;
    if (this.songT <= 0) { this.songT = rand(9, 16); if (Math.abs(g.player.x - this.x) < 200) { g.audio.wren(); g.ui.say('wren', () => this.head(), '♪ tee-tee-tew-tew-tew…', { dur: 2.4 }); } }
    if (Math.random() < dt * 0.6 && this.vy === 0) { this.vy = -30; this.dir = this.x > this.home + 20 ? -1 : this.x < this.home - 20 ? 1 : pick([1, -1]); }
    if (this.vy !== 0 || this.hop < 0) { this.vy += 150 * dt; this.hop += this.vy * dt; this.x += this.dir * 14 * dt; if (this.hop >= 0) { this.hop = 0; this.vy = 0; } }
    this.y = groundY(this.x) + this.hop;
  }
  render(ctx, x, y, dir, t) { drawWren(ctx, x, y, dir, t); }
}

export class Bluebird extends Animal {
  constructor(o) {
    super({ name: 'Mountain bluebird', jid: 'bluebird', w: 8, h: 7, reach: 26, sound: 'chirp', pw: 10, ph: 8, ...o });
    this.home = this.x;
    this.facts = [
      'Mountain bluebirds are the color of a summer sky. They hover in midair before dropping down to catch insects.',
      'They nest in tree holes and even old woodpecker cavities along the rim.',
    ];
  }
  visible(g) { return !g.sky.night; }
  update(dt, g) {
    this.t += dt; this.watchT -= dt;
    this.hovering = Math.sin(this.t * 0.5) > 0.6;
    this.x = this.home + Math.sin(this.t * 0.3) * 30;
    this.dir = Math.cos(this.t * 0.3) > 0 ? 1 : -1;
    this.y = groundY(this.home) - (this.hovering ? 14 + Math.sin(this.t * 6) : 0);
  }
  render(ctx, x, y, dir, t) { drawBluebird(ctx, x, y, dir, t, this.hovering); }
}

export class Falcon extends Animal {
  constructor(o) {
    super({ name: 'Peregrine falcon', jid: 'falcon', w: 18, h: 12, reach: 0, pw: 18, ph: 12, ...o });
    this.ax = this.x;
    this.facts = [
      'Peregrine falcons are the fastest animals on Earth. In a hunting dive they can top 200 miles per hour!',
      'They nest on high cliff ledges — Bryce\'s towering walls are perfect peregrine country.',
    ];
  }
  visible(g) { return !g.sky.night; }
  update(dt, g) {
    this.watchT -= dt; this.t += dt * (this.watchT > 0 ? 0.4 : 1);
    const nx = this.ax + Math.sin(this.t * 0.18) * 160;
    this.dir = nx > this.x ? 1 : -1; this.x = nx;
    this.y = groundY(this.ax) - 95 + Math.sin(this.t * 0.4) * 10;
  }
  box() { return { x: this.x - 10, y: this.y - 8, w: 20, h: 14 }; }
  approachX() { return this.x; }
  render(ctx, x, y, dir, t) { drawFalcon(ctx, x, y, dir, t); }
  portrait() { return this._p || (this._p = snapshot(20, 14, c => drawFalcon(c, 10, 8, 1, 0.4), 4)); }
}

export class Fox extends Animal {
  constructor(o) {
    super({ name: 'Gray fox', jid: 'fox', w: 16, h: 10, reach: 34, pw: 26, ph: 12, ...o });
    this.home = this.x; this.state = 'stand'; this.stateT = 2;
    this.facts = [
      'Gray foxes are the only foxes in North America that can climb trees — they hook their claws into the bark like cats!',
      'They\'re shy and mostly come out at night, trotting along the rim on silent feet.',
    ];
  }
  visible(g) { return g.sky.night || g.sky.dusk; }
  update(dt, g) {
    this.t += dt; this.watchT -= dt; this.stateT -= dt;
    if (this.stateT <= 0) { this.state = this.watchT > 0 ? 'stand' : pick(['stand', 'walk', 'walk']); this.stateT = rand(2, 5); this.dir = this.x > this.home + 50 ? -1 : this.x < this.home - 50 ? 1 : pick([1, -1]); }
    if (g.player.moving && this.playerNear(g, 22) && this.watchT <= 0) { this.state = 'run'; this.stateT = 1.2; this.dir = this.x > g.player.x ? 1 : -1; }
    const sp = this.state === 'run' ? 60 : this.state === 'walk' ? 14 : 0;
    this.x += this.dir * sp * dt;
    this.y = groundY(this.x);
  }
  render(ctx, x, y, dir, t) { drawFox(ctx, x, y, dir, { state: this.state || 'stand', t, phase: t * (this.state === 'run' ? 16 : 6) }); }
}

// ======================= PEOPLE =======================
const GIFT_LINES = {
  love: ['Oh! I LOVE these! You\'re the best!', 'No way — my favorite! Thank you!', 'This is my absolute favorite. Thank you!'],
  like: ['That\'s so kind of you, thanks!', 'Oh, how thoughtful!', 'Thanks, friend!'],
  neutral: ['Oh! Thank you.', 'Well, isn\'t that nice.', 'Thanks!'],
};

export class NPC extends Entity {
  constructor(o) {
    super({ reach: 18, w: 14, h: 30, kind: 'person', dir: -1, greeted: false, loves: [], likes: [], gifts: {}, ...o });
    this.t = Math.random() * 5;
    this.lastChat = -999;
    this.recent = [];
    this.lost = null;
    this.wantsPhoto = false;
  }
  get hearts() { return this.g ? this.g.journal.hearts(this.id) : 0; }
  update(dt, g) {
    this.g = g;
    this.t += dt;
    if (!this.greeted && Math.abs(g.player.x - this.x) < 60) {
      this.greeted = true;
      this.dir = g.player.x < this.x ? -1 : 1;
      const hello = this.hearts >= 3 ? pick(['Hey, friend!', 'Oh, it\'s you two!', 'Hi again!']) : this.greet;
      g.ui.say('npc' + this.id, () => this.head(), hello, { dur: 2.6 });
      setTimeout(() => g.baby.react('person'), 1200);
    }
    if (Math.abs(g.player.x - this.x) > 300) this.greeted = false;
  }
  head() { return { x: this.x, y: this.y - 33 }; }
  portrait() {
    if (!this._p) this._p = snapshot(16, 14, c => drawPerson(c, 7, 35, this.look, { dir: 1, state: 'idle', t: 0 }), 6);
    return this._p;
  }
  talk(g, pages, after) {
    this.dir = g.player.x < this.x ? -1 : 1;
    g.journal.meet(this.id, this.name);
    g.ui.dialogue(this.name, pages, after, this.portrait(), this.hearts);
  }
  pickLine() {
    const h = this.hearts;
    let pool = [];
    for (const [k, lines] of Object.entries(this.lines)) if (h >= +k) pool = pool.concat(lines);
    const fresh = pool.filter(l => !this.recent.includes(l));
    const line = pick(fresh.length ? fresh : pool);
    this.recent.push(line);
    if (this.recent.length > 4) this.recent.shift();
    return line;
  }
  chat(g) {
    let pages = [this.pickLine()];
    if (this.lost) pages = [this.lostLine()];
    if (this.wantsPhoto) pages = ['Oh! Would you mind taking our photo? Just tap 📸 when you\'re ready.'];
    if (this.extraChat) { const ex = this.extraChat(g); if (ex) pages = ex; }
    this.talk(g, pages, () => { if (g.now - this.lastChat > 60) { this.lastChat = g.now; this.gainHearts(g, 0.5); } });
  }
  lostLine() {
    const it = ITEMS[this.lost].name.toLowerCase();
    return pick([`Have you seen my ${it}? I must have dropped it somewhere on the trail…`, `I can't find my ${it} anywhere! If you spot it, I'd be so grateful.`]);
  }
  gainHearts(g, n) {
    const { before, after } = g.journal.addHearts(this.id, n);
    if (after > before) { g.fx.emote(() => this.head(), 'heart'); g.fx.hearts(this.x, this.y - 32, Math.ceil(n * 3)); }
    for (const th of Object.keys(this.gifts).map(Number).sort()) {
      const key = this.id + ':' + th;
      if (before < th && after >= th && !g.journal.s.gifted[key]) {
        g.journal.s.gifted[key] = true;
        const [item, n2, line] = this.gifts[th];
        setTimeout(() => {
          const left = g.bag.add(item, n2);
          g.journal.find(item);
          g.audio.fanfare();
          g.ui.dialogue(this.name, [line, `You received: ${ITEMS[item].name}${n2 > 1 ? ' ×' + n2 : ''}!${left ? ' (Your bag is full, so some had to stay behind.)' : ''}`], null, this.portrait(), this.hearts);
        }, 600);
      }
    }
  }
  receive(g, slot) {
    const s = g.bag.slots[slot];
    if (!s) return;
    const id = s.id, def = ITEMS[id];
    g.bag.removeAt(slot);
    if (def.cat === 'lost') {
      if (s.owner === this.id) {
        this.lost = null;
        g.journal.inc('returned');
        this.talk(g, [pick(['My ' + def.name.toLowerCase() + '! Oh, thank you, thank you!', 'You found it! I was so worried!']), 'Here — please take this as a thank-you.'], () => {
          const reward = pick(['cookie', 'granola', 'water']);
          g.bag.add(reward);
          g.ui.notify(`Received: ${ITEMS[reward].name}`);
        });
        this.gainHearts(g, 2);
      } else { g.bag.add(id, 1, s.owner); this.talk(g, ['Hmm, that\'s not mine. Somebody else must be looking for it!']); }
      return;
    }
    if (def.cat === 'litter') {
      if (this.id === 'ranger') { g.journal.inc('litter'); this.talk(g, ['You packed out litter? Thank you! I\'ll toss it for you. That\'s what Leave No Trace is all about.']); this.gainHearts(g, 0.5); }
      else { this.talk(g, ['Uh… thanks? I think that goes in a trash can, friend. 😅']); g.bag.add(id); }
      return;
    }
    if (def.cat === 'nature') {
      g.journal.inc('leftBe');
      this.talk(g, [this.id === 'ranger' ? 'Beautiful find! But nature belongs right here in the park. Let\'s set it back down so everyone can enjoy it.' : 'Ooh, pretty! We should probably leave it out here where it belongs, though.']);
      g.events.dropNature(this.x + 6, id, true);
      if (this.id === 'ranger') this.gainHearts(g, 0.5);
      return;
    }
    if (def.cat === 'care' || def.cat === 'toy' || def.cat === 'keepsake') { g.bag.add(id, 1, s.owner); this.talk(g, ['Aww, I think the little one needs that more than I do!']); return; }
    const tier = this.loves.includes(id) ? 'love' : this.likes.includes(id) ? 'like' : 'neutral';
    this.talk(g, [pick(GIFT_LINES[tier])]);
    this.gainHearts(g, tier === 'love' ? 1.5 : tier === 'like' ? 1 : 0.5);
    g.audio.chime();
  }
  takePhoto(g) {
    this.wantsPhoto = false;
    g.flashPhoto();
    g.journal.inc('photos');
    this.talk(g, [pick(['Perfect! Thank you so much!', 'Oh, that\'s a great one!', 'You\'ve got a good eye!'])], () => {
      if (Math.random() < 0.5) { const it = pick(['granola', 'cookie', 'water']); g.bag.add(it); g.ui.notify(`Received: ${ITEMS[it].name}`); }
    });
    this.gainHearts(g, 1);
  }
  actions(g) {
    const acts = [];
    if (this.special) acts.push(...this.special(g));
    if (this.wantsPhoto) acts.push({ label: '📸 Take their photo', primary: true, run: () => this.takePhoto(g) });
    if (this.lost && g.bag.find(s => s.owner === this.id) >= 0) acts.push({ label: `🤝 Return ${ITEMS[this.lost].name.toLowerCase()}`, primary: true, run: () => this.receive(g, g.bag.find(s => s.owner === this.id)) });
    acts.push({ label: '💬 Chat', run: () => this.chat(g) });
    acts.push({ label: '🎁 Give…', run: () => g.ui.openBag({ mode: 'give', target: this }) });
    for (const t of this.topics || []) acts.push({ label: t.label, run: () => this.talk(g, t.pages) });
    if (this.quiz) acts.push({ label: '🎓 Quiz me!', run: () => this.quiz(g) });
    acts.push({ label: '👋 Wave', run: () => { g.ui.say('npc' + this.id, () => this.head(), pick(['*waves back*', 'Hi, little one!', 'Happy trails!'])); g.baby.react('person'); } });
    return acts;
  }
  pose() { return { dir: this.dir, state: this.seated ? 'sit' : 'idle', t: this.t, holding: this.holding }; }
  draw(ctx, g, ox, oy) { drawPerson(ctx, this.x - ox, this.y - oy, this.look, this.pose()); }
}

export class Runner extends NPC {
  constructor(o) { super(o); this.dir = 1; this.paused = 0; this.passed = false; }
  update(dt, g) {
    this.g = g;
    this.t += dt;
    this.paused -= dt;
    if (this.paused > 0) return;
    this.x += this.dir * 62 * dt;
    if (this.x > this.x1) { this.x = this.x1; this.dir = -1; }
    if (this.x < this.x0) { this.x = this.x0; this.dir = 1; }
    this.y = groundY(this.x);
    const near = Math.abs(g.player.x - this.x) < 40;
    if (near && !this.passed) {
      this.passed = true;
      g.ui.say('npc' + this.id, () => this.head(), this.hearts >= 2 ? pick(['Hey neighbor!', 'Lap three!', 'Hi baby!']) : pick(['On your left!', 'Morning! Cute baby!', 'Great day for it!']), { dur: 2 });
      g.journal.meet(this.id, this.name);
    }
    if (!near) this.passed = false;
  }
  actions(g) { this.paused = 14; return super.actions(g); }
  approachX(px) { this.paused = 14; return super.approachX(px); }
  pose() { return this.paused > 0 ? { dir: this.dir, state: 'idle', t: this.t } : { dir: this.dir, state: 'run', phase: this.t * 11, t: this.t }; }
}

export class Family extends NPC {
  constructor(o) { super(o); this.kidHop = 0; }
  update(dt, g) { super.update(dt, g); this.kidHop = Math.max(0, Math.sin(this.t * 3)) * 2; }
  box() { return { x: this.x - 16, y: this.y - 30, w: 32, h: 30 }; }
  draw(ctx, g, ox, oy) {
    super.draw(ctx, g, ox, oy);
    const kx = this.x + this.dir * 12;
    drawPerson(ctx, kx - ox, groundY(kx) - oy - this.kidHop, this.kidLook, { dir: this.dir, state: this.kidHop > 0.3 ? 'jump' : 'idle', t: this.t });
  }
}

const NAMES = ['Maya', 'Theo', 'June', 'Sam', 'Priya', 'Leo', 'Ines', 'Kai', 'Eli', 'Nora', 'Diego', 'Hana', 'Omar', 'Lucy', 'Ben', 'Aiyana', 'Jules', 'Mei', 'Tomas', 'Zara', 'Felix', 'Ada', 'Ravi', 'Gus'];
const PERSONAS = {
  birder: { greet: 'Shh — did you hear that jay?', lines: ['I\'ve spotted twelve kinds of birds today! The Steller\'s jays are showing off.', 'Ravens mate for life, you know. I saw a pair doing barrel rolls earlier!', 'There\'s a canyon wren somewhere near Queen\'s Garden — listen for a song that tumbles downhill.'], loves: ['granola'], likes: ['water'] },
  geologist: { greet: 'Isn\'t this rock just GORGEOUS?', lines: ['Look at those layers! Each band is a different chapter of an ancient lake.', 'Frost wedging! On around 200 nights a year, water freezes in the cracks and splits the rock.', 'Off the Navajo Loop there\'s a spur to Two Bridges — natural windows in the rock. Worth the scramble!'], loves: ['cookie'], likes: ['water'] },
  tired: { greet: '*huff* …hi… *huff*', lines: ['Nobody warned me the hike back UP was the hard part.', 'Is it rude to nap on a bench? Asking for a friend. The friend is me.', 'Your baby has the right idea, getting carried.'], loves: ['water', 'granola'], likes: ['cookie'] },
  newlywed: { greet: 'We just got married! Hi!', lines: ['We got engaged at Sunset Point last year, so we had to come back!', 'Someone told us there\'s a secret overlook past the old bristlecone. Perfect for stargazing!', 'Your little one is SO cute. Maybe someday…!'], loves: ['cookie'], likes: ['granola'] },
  grandparent: { greet: 'Oh, look at that little face!', lines: ['I carried my kids down this very trail, many years ago.', 'Enjoy every minute — they grow up in the blink of an eye.', 'Did you know you can see about 7,500 stars here on a dark night? Stay up and look!'], loves: ['cookie'], likes: ['water'] },
  scout: { greet: 'Hi! I\'m working on my hiking badge!', lines: ['I found three pieces of litter already! We pack it out!', 'I heard water dripping behind some hoodoos in Queen\'s Garden. Is there a secret spring?!', 'My troop leader says to leave rocks and feathers where we find them.'], loves: ['granola', 'cookie'], likes: ['water'] },
  photographer: { greet: 'The light is perfect today!', lines: ['Golden hour is magic here — everything glows orange.', 'Want a tip? Wait for the animal to look at you before you press the shutter.', 'I\'ve filled two memory cards already. Oops.'], loves: ['water'], likes: ['granola'] },
};

export class Wanderer extends NPC {
  constructor(o) {
    const persona = pick(Object.keys(PERSONAS));
    const P = PERSONAS[persona];
    const name = o.name || pick(NAMES);
    const style = pick(['short', 'long', 'bun', 'curly', 'bald']);
    const look = {
      skin: pick(PEOPLE_OPTIONS.skin), hair: pick(PEOPLE_OPTIONS.hair), shirt: pick(PEOPLE_OPTIONS.shirt), style,
      pants: pick(['#55667a', '#5a4a3a', '#3f5a3e', '#6a5a8a', '#2b2b33']), pack: true, packColor: pick(['#a0522d', '#3f6aa0', '#5f9f6a', '#d4504f']),
      hat: pick([null, null, 'cap', 'sun']), hatColor: pick(['#3f6aa0', '#d4504f', '#5f9f6a']),
      extras: [...(persona === 'grandparent' ? ['glasses'] : []), ...(persona === 'photographer' ? ['camera'] : []), ...(Math.random() < 0.15 ? ['beard'] : [])],
    };
    super({ ...o, id: 'hiker:' + name, name, persona, greet: P.greet, look, lines: { 0: P.lines }, loves: P.loves, likes: P.likes });
    this.dir = o.dir ?? 1;
    this.speed = rand(18, 28);
    this.pauseT = 0;
    this.gone = false;
  }
  update(dt, g) {
    super.update(dt, g);
    if (this.talking > 0) { this.talking -= dt; return; }
    this.pauseT -= dt;
    if (this.pauseT > 0) return;
    if (Math.random() < dt * 0.04) { this.pauseT = rand(4, 10); return; }
    this.x += this.dir * this.speed * dt;
    this.y = groundY(this.x);
    if (this.x < 20 || this.x > g.area.width - 20) this.gone = true;
  }
  actions(g) { this.talking = 15; g.journal.meetHiker(this.name); return super.actions(g); }
  approachX(px) { this.talking = 15; return super.approachX(px); }
  pose() {
    const walking = !(this.talking > 0) && this.pauseT <= 0;
    return { dir: this.dir, state: walking ? 'walk' : 'idle', phase: this.t * 6.5, t: this.t };
  }
  draw(ctx, g, ox, oy) {
    super.draw(ctx, g, ox, oy);
    if (this.lost && Math.floor(g.now * 2) % 4 === 0) g.fx.drawEmoteAt(ctx, this.x - ox, this.y - oy - 40, '?');
  }
}

// ======================= PICKUPS & FACILITIES =======================
export class Pickup extends Entity {
  constructor(o) {
    super({ w: 8, h: 8, kind: 'pickup', reach: 4, ...o });
    this.name = ITEMS[this.item].name; this.t = Math.random() * 5;
  }
  approachX() { return this.x; }
  actions() { return null; }
  update(dt) { this.t += dt; }
  draw(ctx, g, ox, oy) {
    const bob = Math.sin(this.t * 3) * 0.8;
    const x = this.x - ox, y = this.y - oy;
    shadowBlob(ctx, x, y, 3.5, 0.3);
    ctx.save(); ctx.translate(x, y - 4 + bob);
    if (this.item === 'diary') { ctx.rotate(Math.sin(this.t * 2) * 0.15); }
    drawItemShape(ctx, this.item, this.item === 'diary' ? 7 : 6);
    ctx.restore();
    const tw = (Math.sin(this.t * 4) + 1) / 2;
    ctx.fillStyle = `rgba(255,250,210,${0.4 + tw * 0.6})`;
    const sx = x + 3, sy = y - 8 + bob;
    ctx.beginPath(); ctx.moveTo(sx, sy - 1.8 * tw - 0.5); ctx.lineTo(sx + 0.35, sy); ctx.lineTo(sx, sy + 1.8 * tw + 0.5); ctx.lineTo(sx - 0.35, sy); ctx.fill();
    ctx.beginPath(); ctx.moveTo(sx - 1.8 * tw - 0.5, sy); ctx.lineTo(sx, sy + 0.35); ctx.lineTo(sx + 1.8 * tw + 0.5, sy); ctx.lineTo(sx, sy - 0.35); ctx.fill();
  }
}

function paintCabin(g) {
  g.fillStyle = lin(g, -20, -30, 20, 0, [[0, '#c98d58'], [1, '#8a5a32']]);
  g.fillRect(-17, -22, 34, 22);
  g.strokeStyle = 'rgba(70,40,20,0.45)'; g.lineWidth = 0.4;
  for (let y = -21; y < 0; y += 2.4) { g.beginPath(); g.moveTo(-17, y); g.lineTo(17, y); g.stroke(); }
  g.fillStyle = lin(g, 0, -36, 0, -20, [[0, '#6a4232'], [1, '#4a2a20']]);
  g.beginPath(); g.moveTo(-21, -20); g.lineTo(0, -35); g.lineTo(21, -20); g.closePath(); g.fill();
  g.fillStyle = '#4a2a1a'; g.fillRect(3, -14, 8, 14);
  g.fillStyle = '#6e4430'; g.fillRect(4, -13, 6, 13);
  g.fillStyle = '#e0b040'; circle(g, 8.8, -6.5, 0.45); g.fill();
  g.fillStyle = '#3a2418'; g.fillRect(-13, -15, 10, 7);
  g.fillStyle = lin(g, 0, -14, 0, -9, [[0, '#cfe8f6'], [1, '#7aa6c8']]); g.fillRect(-12.3, -14.3, 8.6, 5.6);
  g.fillStyle = '#f2dcb5'; g.fillRect(-5, -28, 10, 4.2);
  g.fillStyle = '#3f6aa0'; g.font = 'bold 3px sans-serif'; g.textAlign = 'center'; g.fillText('WC', 0, -24.8);
}
export class Restroom extends Entity {
  constructor(o) { super({ w: 40, h: 34, kind: 'facility', name: 'Restroom & changing station', reach: 14, ...o }); }
  actions(g) {
    return [
      { label: '🧷 Restock diapers', primary: true, run: () => {
        const n = g.bag.refill('diaper', 5);
        g.ui.notify(n ? `🧷 Grabbed ${n} diaper${n > 1 ? 's' : ''} from the changing station.` : 'You already have plenty of diapers.');
        if (n) g.audio.pop();
        if (g.baby.need?.id === 'diaper' && g.bag.has('diaper')) g.baby.useItem('diaper');
      } },
      { label: '🧼 Wash up', run: () => { g.ui.say('parent', () => g.parentHead(), 'Ahh, fresh!'); g.audio.chime(); } },
    ];
  }
  draw(ctx, g, ox, oy) { shadowBlob(ctx, this.x - ox, this.y - oy, 22, 0.3); blit(ctx, 'cabin', 44, 37, this.x - ox, this.y - oy + 0.5, paintCabin); }
}

export class Fountain extends Entity {
  constructor(o) { super({ w: 8, h: 12, kind: 'facility', name: 'Water fountain', reach: 10, ...o }); }
  actions(g) {
    return [{ label: '💧 Refill bottles', primary: true, run: () => {
      const a = g.bag.refill('bottle', 4), b = g.bag.refill('water', 3);
      g.audio.sip(); g.player.stamina = Math.min(100, g.player.stamina + 25);
      g.ui.notify(a || b ? `💧 Refilled: ${a ? a + ' milk bottle' + (a > 1 ? 's' : '') : ''}${a && b ? ', ' : ''}${b ? b + ' water' : ''}` : 'Your bottles are already full.');
    } }, { label: '🥤 Take a sip', run: () => { g.ui.say('parent', () => g.parentHead(), 'Refreshing!'); g.audio.sip(); g.player.stamina = Math.min(100, g.player.stamina + 30); } }];
  }
  draw(ctx, g, ox, oy) {
    blit(ctx, 'fountain', 8, 13, this.x - ox, this.y - oy, c => {
      c.fillStyle = lin(c, -2, 0, 2, 0, [[0, '#b8b8c0'], [1, '#6a6a74']]); c.fillRect(-1.6, -9, 3.2, 9);
      c.fillStyle = '#8a8a94'; c.beginPath(); c.ellipse(0, -9.5, 3.2, 1.2, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#9ad0f8'; c.beginPath(); c.ellipse(0, -9.8, 2.2, 0.6, 0, 0, Math.PI * 2); c.fill();
    });
  }
}

export class TrashCan extends Entity {
  constructor(o) { super({ w: 8, h: 10, kind: 'facility', name: 'Trash & recycling', reach: 12, ...o }); }
  actions(g) {
    const n = LITTER.reduce((s, id) => s + g.bag.count(id), 0);
    return [{ label: n ? `🗑️ Toss litter (${n})` : '🗑️ Nothing to toss', primary: n > 0, run: () => {
      if (!n) { g.ui.notify('Pick up litter on the trail and pack it out here!'); return; }
      for (const id of LITTER) g.bag.remove(id, g.bag.count(id));
      g.journal.inc('litter', n);
      g.audio.chime();
      g.fx.sparkles(this.x, this.y - 10, 6);
      g.ui.notify(`🌲 Packed out ${n} piece${n > 1 ? 's' : ''} of litter — thank you for keeping Bryce beautiful!`);
      g.journal.first('watched you pack out litter');
    } }];
  }
  draw(ctx, g, ox, oy) {
    blit(ctx, 'trash', 9, 11, this.x - ox, this.y - oy, c => {
      c.fillStyle = lin(c, -4, 0, 4, 0, [[0, '#7a9474'], [1, '#3f5a3e']]); c.beginPath(); c.roundRect(-3.6, -9, 7.2, 9, 0.6); c.fill();
      c.fillStyle = '#2f4430'; c.beginPath(); c.roundRect(-4.2, -10.2, 8.4, 1.8, 0.6); c.fill();
      c.strokeStyle = 'rgba(30,40,30,0.4)'; c.lineWidth = 0.3; for (let x = -2.5; x <= 2.5; x += 1.25) { c.beginPath(); c.moveTo(x, -8); c.lineTo(x, -1); c.stroke(); }
    });
  }
}

/** Trail fork to a hidden side area. */
export class Portal extends Entity {
  constructor(o) { super({ w: 12, h: 16, kind: 'portal', reach: 8, ...o }); this.name = o.label; }
  actions(g) {
    const discovered = g.journal.s.areas?.[this.to];
    const names = { seep: 'Hidden Seep', bridges: 'Two Bridges', overlook: 'Moonlit Overlook', trail: 'the main trail' };
    return [{ label: this.to === 'trail' ? '↩️ Head back' : discovered ? `🧭 Go to ${names[this.to]}` : '🧭 Follow the path…', primary: true, run: () => g.travel(this) }];
  }
  draw(ctx, g, ox, oy) {
    const back = this.to === 'trail';
    blit(ctx, back ? 'portal-back' : 'portal', 12, 16, this.x - ox, this.y - oy, c => {
      c.fillStyle = '#7a5032'; c.fillRect(-0.6, -14, 1.2, 14);
      c.fillStyle = lin(c, 0, -14, 0, -9, [[0, '#d6a46a'], [1, '#a8703e']]);
      c.beginPath();
      if (back) { c.moveTo(4.5, -14); c.lineTo(-3.5, -14); c.lineTo(-5.5, -11.5); c.lineTo(-3.5, -9); c.lineTo(4.5, -9); }
      else { c.moveTo(-4.5, -14); c.lineTo(3.5, -14); c.lineTo(5.5, -11.5); c.lineTo(3.5, -9); c.lineTo(-4.5, -9); }
      c.fill();
      c.fillStyle = '#5a3420'; c.fillRect(-3, -12, 5, 0.5); c.fillRect(-3, -11, 4, 0.5);
    });
    if (!back && !g.journal.s.areas?.[this.to] && Math.floor(g.now * 1.5) % 2 === 0) g.fx.drawEmoteAt(ctx, this.x - ox, this.y - oy - 20, '?');
  }
}

// ======================= SCENERY =======================
function paintSign(c) {
  c.fillStyle = '#5e3d22'; c.fillRect(-0.9, -9, 1.8, 9);
  c.fillStyle = lin(c, 0, -15, 0, -8, [[0, '#c08a52'], [1, '#8a5a32']]);
  c.beginPath(); c.roundRect(-6.5, -15.5, 13, 7.4, 0.8); c.fill();
  c.fillStyle = '#f2dcb5'; for (let i = 0; i < 3; i++) c.fillRect(-5, -14 + i * 1.9, 10 - (i === 2 ? 4 : 0), 0.7);
}
export class Sign extends Entity {
  constructor(o) { super({ w: 14, h: 16, kind: 'sign', name: 'Trail sign', ...o }); }
  actions(g) {
    const acts = [{ label: '📖 Read', run: () => g.ui.dialogue(this.title, this.text, null, snapshot(16, 16, c => { c.translate(8, 16); paintSign(c); }, 4)) }];
    if (this.view) acts.push({ label: '🌄 Take in the view', run: () => { g.ui.say('parent', () => g.parentHead(), pick(['wow…', 'Look at that, little one.', 'Breathtaking.'])); setTimeout(() => g.baby.react('view'), 900); g.audio.chime(); } });
    if ((this.view || this.stars) && g.sky.night) acts.unshift({ label: '✨ Stargaze', primary: true, run: () => g.minigames.stars() });
    if (this.echo) acts.unshift({ label: '📣 Echo game', primary: true, run: () => g.minigames.echo() });
    return acts;
  }
  draw(ctx, g, ox, oy) { blit(ctx, 'sign', 14, 16, this.x - ox, this.y - oy + 0.3, paintSign); }
}

function paintBench(c) {
  c.fillStyle = '#5e3d22'; c.fillRect(-7.5, -6, 1.2, 6); c.fillRect(6.3, -6, 1.2, 6); c.fillRect(-7, -11, 1, 6); c.fillRect(6, -11, 1, 6);
  c.fillStyle = lin(c, 0, -7, 0, -5, [[0, '#d39a62'], [1, '#9a6232']]); c.beginPath(); c.roundRect(-9, -7, 18, 1.8, 0.5); c.fill();
  c.fillStyle = lin(c, 0, -12, 0, -9, [[0, '#d39a62'], [1, '#9a6232']]); c.beginPath(); c.roundRect(-8.5, -11.5, 17, 1.6, 0.5); c.fill(); c.beginPath(); c.roundRect(-8.5, -9.4, 17, 1.4, 0.5); c.fill();
}
export class Bench extends Entity {
  constructor(o) { super({ w: 18, h: 12, kind: 'bench', name: 'Bench', reach: 0, ...o }); }
  approachX() { return this.x; }
  actions(g) {
    if (this.occupied) return [{ label: '🙂 Say hello', run: () => g.ui.say('parent', () => g.parentHead(), 'Lovely spot!') }];
    return [{ label: '🪑 Sit & rest', run: () => g.sitOn(this) }];
  }
  draw(ctx, g, ox, oy) { shadowBlob(ctx, this.x - ox, this.y - oy, 10, 0.25); blit(ctx, 'bench', 20, 13, this.x - ox, this.y - oy + 0.3, paintBench); }
}

const FLOWER_COLS = { paintbrush: ['#e2453c', '#ff8a5c'], penstemon: ['#6a6fd1', '#b39ddb'], sego: ['#f7f1e6', '#e9c46a'], monkey: ['#e0405a', '#ff9aa8'] };
export class Flowers extends Entity {
  constructor(o) { super({ w: 12, h: 9, kind: 'flower', reach: 12, ...o }); }
  actions(g) {
    return [
      { label: '👃 Smell', run: () => {
        g.ui.say('parent', () => g.parentHead(), 'mmm…');
        if (g.baby.carrier === 'front' && !g.baby.napping && Math.random() < 0.6) setTimeout(() => { g.baby.say('ah… ah… CHOO!'); g.audio.sneeze(); g.baby.giggleT = 1.5; g.journal.first('sneezed at a wildflower'); }, 1100);
      } },
      { label: '👶 Show baby', run: () => g.baby.react('flower') },
      { label: 'ℹ️ What is it?', run: () => g.ui.dialogue(this.name, [...this.facts, 'Leave the flowers for the next hikers (and the bees) to enjoy! 🐝']) },
    ];
  }
  draw(ctx, g, ox, oy) {
    const [a, b] = FLOWER_COLS[this.variety];
    blit(ctx, 'fl-' + this.variety, 14, 10, this.x - ox, this.y - oy + 0.3, c => {
      const r = rng(this.variety.length * 7);
      for (let i = 0; i < 9; i++) {
        const x = (r() - 0.5) * 11, h = 3 + r() * 5;
        c.strokeStyle = '#5f8a4a'; c.lineWidth = 0.35; c.beginPath(); c.moveTo(x, 0); c.quadraticCurveTo(x + 0.6, -h / 2, x + (r() - 0.5), -h); c.stroke();
        c.fillStyle = r() < 0.5 ? a : b;
        if (this.variety === 'paintbrush') { c.beginPath(); c.ellipse(x, -h - 0.6, 0.6, 1.4, 0, 0, Math.PI * 2); c.fill(); }
        else { for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(x + Math.cos(k * 1.57) * 0.6, -h + Math.sin(k * 1.57) * 0.6, 0.5, 0, Math.PI * 2); c.fill(); } c.fillStyle = '#f2c14e'; c.beginPath(); c.arc(x, -h, 0.3, 0, Math.PI * 2); c.fill(); }
      }
    });
  }
}

export class Landmark extends Entity {
  constructor(o) { super({ kind: 'landmark', ...o }); }
  head() { return { x: this.x, y: this.y - Math.min(this.h, 60) }; }
  actions(g) {
    return [
      { label: '🔎 Look closely', run: () => g.ui.dialogue(this.name, this.text) },
      { label: '👶 Show baby', run: () => g.baby.react(this.react || 'view') },
      { label: '📸 Snap a photo', run: () => g.takePhoto() },
    ];
  }
}

function paintBristlecone(c) {
  const r = rng(77);
  c.strokeStyle = '#d8b88a'; c.lineCap = 'round';
  const branch = (x, y, a, len, w) => {
    if (len < 2 || w < 0.3) return;
    const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
    c.strokeStyle = lin(c, x, y, x2, y2, [[0, '#c8a070'], [1, '#e8d2aa']]);
    c.lineWidth = w; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + (r() - 0.5) * 3, (y + y2) / 2, x2, y2); c.stroke();
    if (w < 1.6) { c.fillStyle = r() < 0.5 ? '#2f5d3a' : '#4a7a50'; for (let k = 0; k < 5; k++) { c.beginPath(); c.ellipse(x2 + (r() - 0.5) * 3, y2 + (r() - 0.5) * 2, 1.4, 0.7, r() * 3, 0, Math.PI * 2); c.fill(); } }
    branch(x2, y2, a - 0.4 - r() * 0.3, len * 0.72, w * 0.62);
    branch(x2, y2, a + 0.35 + r() * 0.3, len * 0.66, w * 0.58);
  };
  branch(0, 0, -Math.PI / 2 - 0.15, 16, 4.2);
}
export class Bristlecone extends Landmark {
  draw(ctx, g, ox, oy) { blit(ctx, 'bristlecone', 44, 48, this.x - ox, this.y - oy + 0.5, paintBristlecone); }
}
