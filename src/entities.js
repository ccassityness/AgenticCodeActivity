// Things you can tap at Blue Spring: wildlife, visitors, signs and benches.
import {
  drawHuman, drawManatee, drawAlligator, drawTurtle, drawHeron, drawEgret, drawIbis, drawAnhinga,
  drawOsprey, drawOtter, drawArmadillo, drawGar, drawFish, drawBarredOwl, shadowBlob, OPTIONS, randomLook,
} from './figures.js?v=20261115b';
import { groundY, WATER_Y, bottomY } from './world.js?v=20261115b';
import { snapshot, lin, rng } from './color.js?v=20261115b';

const pick = a => a[(Math.random() * a.length) | 0];
const rand = (a, b) => a + Math.random() * (b - a);

export class Entity {
  constructor(o) {
    this.reach = 18; this.w = 12; this.h = 16; this.kind = 'thing';
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

// ======================= WILDLIFE =======================
class Animal extends Entity {
  constructor(o) {
    super({ reach: 30, kind: 'animal', ...o });
    this.watchT = 0;
    this.dir = this.dir ?? (Math.random() < 0.5 ? 1 : -1);
    this.t = Math.random() * 10;
  }
  watch(g) {
    this.watchT = 12;
    g.ui.say('label', () => this.head(), this.name, { dur: 6, cls: 'label' });
    if (this.sound) g.audio[this.sound]();
    g.ui.dialogue(this.name, this.facts, null, this.portrait());
    setTimeout(() => g.baby.react('animal'), 900);
  }
  actions(g) {
    return [
      { label: '👀 Watch quietly', primary: true, run: () => this.watch(g) },
      { label: '👉 Show baby', run: () => { if (!g.baby.react('animal')) g.ui.say('parent', () => g.parentHead(), '(they\'re napping — maybe later)'); } },
    ];
  }
  render() { }
  draw(ctx, g, ox, oy) { this.render(ctx, this.x - ox, this.y - oy, this.dir, this.t); }
  portrait() {
    if (!this._p) { const [w, h, px, py] = this.pbox || [24, 16, 12, 14]; this._p = snapshot(w, h, c => { c.fillStyle = this.under ? '#6ab0bc' : '#e8efe6'; c.fillRect(0, 0, w, h); this.render(c, px, py, 1, 1); }, 5); }
    return this._p;
  }
  near(g, d) { return Math.abs(g.player.x - this.x) < d; }
}

export class Manatee extends Animal {
  constructor(o) {
    super({ name: o.calf ? 'Manatee calf' : 'West Indian manatee', w: 30, h: 10, reach: 0, under: true, sound: 'manatee', pbox: [34, 14, 17, 7], ...o });
    this.home = this.x; this.depth = rand(116, 128); this.y = this.depth; this.vx = rand(1.5, 3.5) * this.dir;
    this.breathT = rand(10, 40); this.surf = 0; this.scars = Math.random() < 0.6;
    this.facts = o.calf ? [
      'Manatee calves stay with their mothers for one to two years, learning where the warm springs and best feeding spots are.',
      'A calf is born underwater and can swim to the surface for its first breath on its own within moments.',
    ] : [
      'West Indian manatees can weigh more than 1,000 pounds — and they eat only plants, munching about a tenth of their body weight every day.',
      'They can\'t survive long in water colder than about 68°F. Blue Spring stays near 72–73°F all year, so on cold days hundreds of manatees crowd into the spring run.',
      'Their closest living relatives are elephants! Many have scars from boat propellers — researchers use those scars to tell individuals apart.',
    ];
  }
  box() { return { x: this.x - 15, y: this.y - 6, w: 30, h: 12 }; }
  approachX() { return this.x; }
  head() { return { x: this.x + this.dir * 12, y: WATER_Y - 4 }; }
  update(dt, g) {
    this.t += dt; this.watchT -= dt; this.breathT -= dt;
    if (this.follow) { // calves stay with mom
      const m = this.follow;
      this.x += (m.x - m.dir * 6 - this.x) * dt * 0.8; this.dir = m.dir;
      this.y += (m.y + 4 - this.y) * dt * 0.8;
      return;
    }
    if (this.breathT <= 0 && this.surf === 0) { this.surf = 1; this.breathT = rand(25, 60); }
    if (this.surf === 1) {
      this.y += (WATER_Y + 1.6 - this.y) * dt * 0.8;
      if (this.y < WATER_Y + 2.6) {
        this.surf = 2; this.surfT = 2.2;
        if (Math.abs(g.player.x - this.x) < 160) { g.audio.manatee(); g.ui.say('mn' + this.home, () => this.head(), 'pfffff…', { dur: 1.6, cls: 'label' }); }
        g.fx.ripple(this.x + this.dir * 12, WATER_Y);
      }
    } else if (this.surf === 2) { this.surfT -= dt; if (this.surfT <= 0) this.surf = 3; }
    else if (this.surf === 3) { this.y += (this.depth - this.y) * dt * 0.6; if (Math.abs(this.y - this.depth) < 0.5) this.surf = 0; }
    const slow = this.watchT > 0 ? 0.3 : 1;
    this.x += this.vx * dt * slow;
    if (this.x > this.home + 220 || this.x < this.home - 220 || this.x < 760 || this.x > 3500) { this.vx = -this.vx; this.dir = Math.sign(this.vx); }
    this.y = Math.min(this.y, bottomY(this.x) - 5);
  }
  render(ctx, x, y, dir, t) { drawManatee(ctx, x, y, dir, t, { calf: this.calf, scale: this.calf ? 0.55 : 1, scars: this.scars }); }
}

export class Gar extends Animal {
  constructor(o) { super({ name: 'Longnose gar', w: 18, h: 4, reach: 0, under: true, pbox: [22, 6, 11, 3], ...o }); this.home = this.x; this.y = rand(108, 114);
    this.facts = ['Longnose gar belong to an ancient family of fish that has barely changed in 100 million years.', 'They can gulp air at the surface, which helps them live in warm, low-oxygen water.'];
  }
  box() { return { x: this.x - 9, y: this.y - 2, w: 18, h: 4 }; }
  approachX() { return this.x; }
  update(dt) { this.t += dt; this.watchT -= dt; this.x = this.home + Math.sin(this.t * 0.15) * 50; this.dir = Math.cos(this.t * 0.15) > 0 ? 1 : -1; }
  render(ctx, x, y, dir, t) { drawGar(ctx, x, y, dir, t); }
}

export class FishSchool extends Animal {
  constructor(o) { super({ name: 'Striped mullet', w: 20, h: 8, reach: 0, under: true, pbox: [16, 8, 8, 4], ...o }); this.home = this.x; this.y = rand(116, 126);
    this.fish = Array.from({ length: 7 }, () => ({ dx: rand(-9, 9), dy: rand(-3, 3), p: Math.random() * 6 }));
    this.jumpT = rand(8, 20); this.jump = null;
    this.facts = ['Mullet are famous for leaping clean out of the water — nobody is completely sure why!', 'They graze on algae and tiny bits of food on the spring bottom.'];
  }
  box() { return { x: this.x - 10, y: this.y - 4, w: 20, h: 8 }; }
  approachX() { return this.x; }
  update(dt, g) {
    this.t += dt; this.watchT -= dt; this.x = this.home + Math.sin(this.t * 0.2) * 30; this.dir = Math.cos(this.t * 0.2) > 0 ? 1 : -1;
    this.jumpT -= dt;
    if (this.jumpT <= 0) { this.jumpT = rand(10, 24); this.jump = { t: 0, x: this.x }; if (Math.abs(g.player.x - this.x) < 160) { g.audio.splash(); setTimeout(() => g.baby.react('animal'), 500); } g.fx.ripple(this.x, WATER_Y); }
    if (this.jump) { this.jump.t += dt; if (this.jump.t > 0.9) { this.jump = null; g.fx.ripple(this.x + 8, WATER_Y); } }
  }
  render(ctx, x, y, dir, t) { for (const f of this.fish) drawFish(ctx, x + f.dx + Math.sin(t + f.p) * 1.2, y + f.dy, dir, t + f.p); }
  drawAbove(ctx, ox, oy) {
    if (!this.jump) return;
    const k = this.jump.t / 0.9;
    const jx = this.jump.x + k * 8 - ox, jy = WATER_Y - Math.sin(k * Math.PI) * 9 - oy;
    ctx.save(); ctx.translate(jx, jy); ctx.rotate((k - 0.5) * 1.6 * this.dir); drawFish(ctx, 0, 0, this.dir, 0, '#b8c0c0', 4.2); ctx.restore();
  }
}

export class Alligator extends Animal {
  constructor(o) {
    super({ name: 'American alligator', w: 34, h: 5, reach: 46, sound: 'gator', pbox: [42, 8, 18, 6], dir: -1, ...o });
    this.state = 'bask'; this.stateT = rand(30, 60); this.home = this.x;
    this.y = WATER_Y - 0.3;
    this.facts = [
      'The American alligator is Florida\'s official state reptile. They can live 35 to 50 years in the wild.',
      'Basking in the sun warms them up — they\'re cold-blooded. Give them plenty of space and never, ever feed one.',
    ];
  }
  update(dt, g) {
    this.t += dt; this.watchT -= dt; this.stateT -= dt;
    if (this.state === 'bask' && (this.stateT <= 0 || (g.player.moving && this.near(g, 30)))) { this.state = 'swim'; this.stateT = rand(20, 40); g.audio.splash(); g.fx.ripple(this.x, WATER_Y); }
    if (this.state === 'swim') {
      this.x += this.dir * 2.5 * dt;
      if (Math.abs(this.x - this.home) > 120) this.dir = -this.dir;
      if (this.stateT <= 0 && Math.abs(this.x - this.home) < 10) { this.state = 'bask'; this.stateT = rand(30, 60); }
    }
  }
  render(ctx, x, y, dir, t) {
    if (this.state === 'swim') {
      ctx.save(); ctx.beginPath(); ctx.rect(x - 30, y - 10, 60, 10.6); ctx.clip();
      drawAlligator(ctx, x, y + 2.2, dir, t, { submerged: true }); ctx.restore();
      ctx.strokeStyle = 'rgba(230,240,230,0.35)'; ctx.lineWidth = 0.2; ctx.beginPath(); ctx.moveTo(x - dir * 4, y + 0.6); ctx.lineTo(x - dir * 18, y - 0.2); ctx.moveTo(x - dir * 4, y + 0.6); ctx.lineTo(x - dir * 18, y + 1.4); ctx.stroke();
    } else drawAlligator(ctx, x, y, dir, t);
  }
}

export class Turtles extends Animal {
  constructor(o) { super({ name: 'Florida red-bellied cooters', w: 26, h: 5, reach: 30, sound: 'splash', pbox: [16, 6, 8, 5], ...o }); this.y = WATER_Y - 1; this.hidden = 0;
    this.facts = ['These turtles line up on logs to bask. Sunshine warms them and helps keep their shells healthy.', 'If you hear a "plop!" as you walk by — that\'s a turtle diving to safety.'];
  }
  update(dt, g) {
    this.t += dt; this.watchT -= dt; this.hidden -= dt;
    if (this.hidden <= 0 && this.watchT <= 0 && g.player.moving && this.near(g, 22)) { this.hidden = 14; g.audio.splash(); g.ui.say('turt', () => this.head(), 'plop! plop!', { dur: 1.3, cls: 'label' }); g.fx.ripple(this.x, WATER_Y); }
  }
  visible() { return this.hidden <= 0; }
  render(ctx, x, y, dir, t) { drawTurtle(ctx, x - 8, y, 1, t); drawTurtle(ctx, x + 1, y, 1, t + 1.3); drawTurtle(ctx, x + 9, y, -1, t + 2.1); }
}

export class Wader extends Animal {
  constructor(o) {
    const info = {
      heron: ['Great blue heron', ['The great blue heron is the largest heron in North America.', 'It stands perfectly still, then strikes like lightning to spear a fish with its dagger-like bill.'], drawHeron],
      egret: ['Great egret', ['Great egrets were nearly wiped out a century ago, hunted for their lacy breeding plumes. Protecting them helped start the bird conservation movement.', 'Now they\'re a common, elegant sight along Florida waters.'], drawEgret],
      ibis: ['White ibis', ['White ibises probe the mud with their long, curved bills, feeling for crayfish and insects.', 'They often travel in groups — look for a little flock of them on the lawn.'], drawIbis],
    }[o.species];
    super({ name: info[0], w: 10, h: 26, reach: 34, sound: 'heron', pbox: [20, 30, 7, 29], ...o });
    this.facts = info[1]; this.fn = info[2]; this.home = this.x; this.state = 'stand'; this.stateT = rand(2, 6);
  }
  update(dt, g) {
    this.t += dt; this.watchT -= dt; this.stateT -= dt;
    if (this.stateT <= 0) { this.state = pick(['stand', 'stand', 'strike', 'walk']); this.stateT = this.state === 'strike' ? 0.9 : rand(2, 6); if (this.state === 'walk') this.dir = this.x > this.home + 20 ? -1 : this.x < this.home - 20 ? 1 : pick([1, -1]); }
    if (this.state === 'walk') this.x += this.dir * 3 * dt;
    if (g.player.moving && this.near(g, 14) && this.watchT <= 0 && this.species !== 'ibis') { this.home += this.x > g.player.x ? 30 : -30; this.state = 'walk'; this.stateT = 2; this.dir = this.x > g.player.x ? 1 : -1; }
  }
  render(ctx, x, y, dir, t) { this.fn(ctx, x, y, dir, t, this.state); }
}

export class Anhinga extends Animal {
  constructor(o) { super({ name: 'Anhinga', w: 14, h: 12, reach: 34, pbox: [20, 14, 10, 13], dir: 1, ...o });
    this.facts = ['Anhingas swim with just their snaky neck above water — that\'s why people call them "snakebirds."', 'Their feathers aren\'t waterproof, so after fishing they perch with wings spread wide to dry in the sun.'];
  }
  update(dt) { this.t += dt; this.watchT -= dt; }
  render(ctx, x, y, dir, t) { drawAnhinga(ctx, x, y, dir, t, true); }
}

export class Osprey extends Animal {
  constructor(o) { super({ name: 'Osprey', w: 16, h: 12, reach: 0, sound: 'osprey', pbox: [20, 14, 10, 7], ...o }); this.ax = this.x;
    this.facts = ['Ospreys eat almost nothing but fish. They plunge feet-first into the water to grab them.', 'They carry fish head-first, like a torpedo, to cut through the wind.'];
  }
  visible(g) { return !g.sky.night; }
  update(dt) { this.t += dt; this.watchT -= dt; const nx = this.ax + Math.sin(this.t * 0.12) * 260; this.dir = nx > this.x ? 1 : -1; this.x = nx; this.y = 18 + Math.sin(this.t * 0.4) * 6; }
  box() { return { x: this.x - 9, y: this.y - 7, w: 18, h: 14 }; }
  approachX() { return this.x; }
  head() { return { x: this.x, y: this.y - 6 }; }
  render(ctx, x, y, dir, t) { drawOsprey(ctx, x, y, dir, t); }
}

export class Otter extends Animal {
  constructor(o) { super({ name: 'River otter', w: 14, h: 4, reach: 0, pbox: [16, 7, 7, 5], ...o }); this.home = this.x; this.y = WATER_Y;
    this.facts = ['River otters close their ears and nostrils when they dive, and use their whiskers to feel for fish in murky water.', 'They\'re playful — sliding, wrestling and tumbling, even as adults.'];
    this.diveT = rand(4, 9); this.under = false;
  }
  box() { return { x: this.x - 7, y: this.y - 4, w: 14, h: 6 }; }
  approachX() { return this.x; }
  visible() { return !this.diving; }
  update(dt, g) {
    this.t += dt; this.watchT -= dt; this.diveT -= dt;
    if (this.diveT <= 0) { this.diving = !this.diving; this.diveT = this.diving ? rand(2, 4) : rand(5, 10); if (this.diving) g.fx.ripple(this.x, WATER_Y); }
    this.x = this.home + Math.sin(this.t * 0.25) * 70; this.dir = Math.cos(this.t * 0.25) > 0 ? 1 : -1;
  }
  render(ctx, x, y, dir, t) { drawOtter(ctx, x, y, dir, t, true); }
}

export class Armadillo extends Animal {
  constructor(o) { super({ name: 'Nine-banded armadillo', w: 12, h: 5, reach: 26, pbox: [16, 8, 7, 7], ...o }); this.home = this.x;
    this.facts = ['Armadillos almost always give birth to identical quadruplets!', 'They snuffle through leaf litter with their long noses, hunting for insects and grubs.'];
  }
  update(dt, g) { this.t += dt; this.watchT -= dt; this.walking = Math.sin(this.t * 0.4) > 0; if (this.walking) { this.x += this.dir * 4 * dt; if (Math.abs(this.x - this.home) > 40) this.dir = -this.dir; } if (g.player.moving && this.near(g, 14)) { this.dir = this.x > g.player.x ? 1 : -1; this.x += this.dir * 20 * dt; } this.y = groundY(this.x); }
  render(ctx, x, y, dir, t) { drawArmadillo(ctx, x, y, dir, t, this.walking); }
}

export class Owl extends Animal {
  constructor(o) { super({ name: 'Barred owl', w: 8, h: 10, reach: 0, sound: 'owl', pbox: [10, 12, 5, 11.5], ...o }); this.hootT = rand(4, 10);
    this.facts = ['Listen for the barred owl\'s call: "Who cooks for you? Who cooks for you-all?"', 'They love old oak hammocks near water, like the woods around Blue Spring.'];
  }
  visible(g) { return g.sky.night || g.sky.dusk; }
  approachX() { return this.x; }
  update(dt, g) { this.t += dt; this.hootT -= dt; if (this.hootT <= 0) { this.hootT = rand(14, 26); if (Math.abs(g.player.x - this.x) < 220) { g.audio.owl(); g.ui.say('owl', () => this.head(), 'who-cooks-for-you…', { dur: 2.4, cls: 'label' }); } } }
  render(ctx, x, y, dir, t) { drawBarredOwl(ctx, x, y, t); }
}

// ======================= PEOPLE =======================
export class Person extends Entity {
  constructor(o) {
    super({ reach: 18, w: 14, h: 30, kind: 'person', dir: -1, greeted: false, ...o });
    this.t = Math.random() * 5; this.recent = [];
  }
  update(dt, g) {
    this.t += dt;
    if (!this.greeted && Math.abs(g.player.x - this.x) < 60) {
      this.greeted = true; this.dir = g.player.x < this.x ? -1 : 1;
      g.ui.say('npc' + this.name, () => this.head(), this.greet, { dur: 2.6 });
      setTimeout(() => g.baby.react('person'), 1200);
    }
    if (Math.abs(g.player.x - this.x) > 300) this.greeted = false;
  }
  head() { return { x: this.x, y: this.y - 34 }; }
  portrait() { return this._p || (this._p = snapshot(16, 14, c => { c.fillStyle = '#e6eee6'; c.fillRect(0, 0, 16, 14); drawHuman(c, 6.5, 38, this.look, { dir: 1, state: 'idle', t: 0 }); }, 6)); }
  talk(g, pages) { this.dir = g.player.x < this.x ? -1 : 1; g.ui.dialogue(this.name, pages, null, this.portrait()); }
  line() {
    const fresh = this.lines.filter(l => !this.recent.includes(l));
    const l = pick(fresh.length ? fresh : this.lines);
    this.recent.push(l); if (this.recent.length > 3) this.recent.shift();
    return l;
  }
  actions(g) {
    const acts = [{ label: '💬 Chat', primary: true, run: () => this.talk(g, [this.line()]) }];
    for (const tp of this.topics || []) acts.push({ label: tp.label, run: () => this.talk(g, tp.pages) });
    acts.push({ label: '👋 Wave', run: () => { g.ui.say('npc' + this.name, () => this.head(), pick(['*waves back*', 'Hi, little one!', 'Enjoy the springs!'])); g.baby.react('person'); } });
    return acts;
  }
  pose() { return { dir: this.dir, state: this.seated ? 'sit' : 'idle', t: this.t, holding: this.holding }; }
  draw(ctx, g, ox, oy) {
    drawHuman(ctx, this.x - ox, this.y - oy + (this.seated ? 3 : 0), this.look, this.pose());
    if (this.kid) drawHuman(ctx, this.x + this.dir * 11 - ox, this.y - oy, this.kid, { dir: this.dir, state: 'idle', t: this.t + 1 });
  }
}

const NAMES = ['Maya', 'Theo', 'June', 'Sam', 'Priya', 'Leo', 'Ines', 'Kai', 'Eli', 'Nora', 'Diego', 'Hana', 'Omar', 'Lucy', 'Ben', 'Mei', 'Tomas', 'Zara', 'Felix', 'Ada', 'Ravi', 'Gus', 'Rosa', 'Malik'];
const VISITOR_LINES = [
  'We drove two hours just to see the manatees. Worth it!',
  'I counted nine manatees from that last overlook. Nine!',
  'The water is so clear it looks like a swimming pool.',
  'My grandparents used to swim here in the summers.',
  'Did you see the gator by the river dock? Gave me a jump!',
  'The Spanish moss is my favorite. It looks like the trees are wearing scarves.',
  'Shh — there\'s a heron fishing right over there.',
];
export class Visitor extends Person {
  constructor(o) {
    const look = randomLook().parent;
    look.pack = Math.random() < 0.5;
    super({ ...o, name: o.name || pick(NAMES), look, greet: pick(['Morning!', 'Hi there!', 'Aww, cute baby!', 'Have you seen the manatees?']), lines: VISITOR_LINES });
    this.dir = o.dir ?? 1; this.speed = rand(14, 22); this.pauseT = 0; this.gone = false;
  }
  update(dt, g) {
    super.update(dt, g);
    if (this.talking > 0) { this.talking -= dt; return; }
    this.pauseT -= dt;
    if (this.pauseT > 0) return;
    if (Math.random() < dt * 0.05) { this.pauseT = rand(4, 10); return; }
    this.x += this.dir * this.speed * dt;
    this.y = groundY(this.x);
    if (this.x < 30 || this.x > 3560) this.dir = -this.dir;
  }
  actions(g) { this.talking = 15; return super.actions(g); }
  approachX(px) { this.talking = 15; return super.approachX(px); }
  pose() { const walking = !(this.talking > 0) && this.pauseT <= 0; return { dir: this.dir, state: walking ? 'walk' : 'idle', phase: this.t * 6, t: this.t }; }
}

// ======================= SCENERY =======================
function paintSign(c) {
  c.fillStyle = '#4a3a2a'; c.fillRect(-4.6, -9, 1.1, 9); c.fillRect(3.5, -9, 1.1, 9);
  c.fillStyle = lin(c, 0, -16, 0, -8, [[0, '#6a4a32'], [1, '#4a3222']]); c.beginPath(); c.roundRect(-7, -16.5, 14, 8.6, 0.6); c.fill();
  c.fillStyle = '#e8dcc0'; c.beginPath(); c.roundRect(-6.2, -15.7, 12.4, 7, 0.4); c.fill();
  c.fillStyle = '#5a7a8a'; c.fillRect(-5.4, -14.8, 4.2, 3);
  c.fillStyle = '#7a6a58'; for (let i = 0; i < 3; i++) c.fillRect(-0.6, -14.6 + i * 1.4, 5.8, 0.5); c.fillRect(-5.4, -11, 10.6, 0.5); c.fillRect(-5.4, -10, 8, 0.5);
}
const _sign = {};
function blit(ctx, key, w, h, x, y, draw) {
  if (!_sign[key]) { const s = 5; const cv = document.createElement('canvas'); cv.width = w * s; cv.height = h * s; const g = cv.getContext('2d'); g.scale(s, s); g.translate(w / 2, h); draw(g); _sign[key] = cv; }
  ctx.drawImage(_sign[key], x - w / 2, y - h, w, h);
}
export class Sign extends Entity {
  constructor(o) { super({ w: 14, h: 17, kind: 'sign', name: o.title, ...o }); }
  actions(g) {
    const acts = [{ label: '📖 Read', primary: true, run: () => g.ui.dialogue(this.title, this.text, null, snapshot(16, 18, c => { c.translate(8, 18); paintSign(c); }, 4)) }];
    if (this.view) acts.push({ label: '🌿 Take in the view', run: () => { g.ui.say('parent', () => g.parentHead(), pick(['Look at that water, little one.', 'So clear…', 'Beautiful.'])); setTimeout(() => g.baby.react('view'), 900); g.audio.chime(); } });
    return acts;
  }
  draw(ctx, g, ox, oy) { blit(ctx, 'sign', 15, 17, this.x - ox, this.y - oy + 0.3, paintSign); }
}

function paintBench(c) {
  c.fillStyle = '#3e3a34'; c.fillRect(-7.5, -6, 1.1, 6); c.fillRect(6.4, -6, 1.1, 6); c.fillRect(-7.1, -11.5, 0.9, 6); c.fillRect(6.2, -11.5, 0.9, 6);
  c.fillStyle = lin(c, 0, -7, 0, -5, [[0, '#a8906e'], [1, '#6a563e']]); c.beginPath(); c.roundRect(-9, -7, 18, 1.7, 0.4); c.fill();
  c.fillStyle = lin(c, 0, -12, 0, -9, [[0, '#a8906e'], [1, '#6a563e']]); c.beginPath(); c.roundRect(-8.5, -11.8, 17, 1.4, 0.4); c.fill(); c.beginPath(); c.roundRect(-8.5, -9.6, 17, 1.3, 0.4); c.fill();
}
export class Bench extends Entity {
  constructor(o) { super({ w: 18, h: 12, kind: 'bench', name: 'Bench', reach: 0, ...o }); }
  approachX() { return this.x; }
  actions(g) {
    if (this.occupied) return [{ label: '🙂 Say hello', run: () => g.ui.say('parent', () => g.parentHead(), 'Lovely spot!') }];
    return [{ label: '🪑 Sit & rest', primary: true, run: () => g.sitOn(this) }];
  }
  draw(ctx, g, ox, oy) { shadowBlob(ctx, this.x - ox, this.y - oy, 10, 0.22); blit(ctx, 'bench', 20, 13, this.x - ox, this.y - oy + 0.3, paintBench); }
}

export class Landmark extends Entity {
  constructor(o) { super({ kind: 'landmark', ...o }); }
  head() { return { x: this.x, y: this.y - Math.min(this.h, 50) }; }
  actions(g) {
    return [
      { label: '🔎 Look closely', primary: true, run: () => g.ui.dialogue(this.name, this.text) },
      { label: '👶 Show baby', run: () => g.baby.react(this.react || 'view') },
    ];
  }
}

/** The pacifier the baby keeps flinging onto the boardwalk. */
export class Pacifier extends Entity {
  constructor(o) { super({ w: 6, h: 5, kind: 'pickup', name: 'Pacifier', reach: 3, ...o }); this.t = 0; }
  approachX() { return this.x; }
  actions() { return null; }
  update(dt) { this.t += dt; }
  draw(ctx, g, ox, oy) {
    const x = this.x - ox, y = this.y - oy;
    ctx.fillStyle = g.player.look.baby.paci || '#7aa6d8';
    ctx.beginPath(); ctx.ellipse(x, y - 0.8, 1.4, 0.9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f2e6c0'; ctx.beginPath(); ctx.ellipse(x + 0.9, y - 0.8, 0.5, 0.6, 0, 0, Math.PI * 2); ctx.fill();
    const tw = (Math.sin(this.t * 4) + 1) / 2;
    ctx.fillStyle = `rgba(255,250,220,${0.4 + tw * 0.6})`; ctx.beginPath(); ctx.arc(x + 2.4, y - 3.4, 0.4 + tw * 0.5, 0, Math.PI * 2); ctx.fill();
  }
}
