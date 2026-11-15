// Things you can tap at Blue Spring: wildlife, visitors, signs and benches.
import {
  drawHuman, drawManatee, drawAlligator, drawTurtle, drawHeron, drawEgret, drawIbis, drawAnhinga,
  drawOsprey, drawOtter, drawArmadillo, drawGar, drawFish, drawBarredOwl, shadowBlob, OPTIONS, randomLook,
  drawAnole, drawSkink, drawWaterSnake, drawSoftshell, drawGopherTortoise,
} from './figures.js?v=20261117a';
import { groundY, WATER_Y, bottomY } from './world.js?v=20261117a';
import { snapshot, lin, rng } from './color.js?v=20261117a';

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
    this.face = this.dir; this.turnRate = this.turnRate ?? 3;
    this.t = Math.random() * 10; this.anim = this.t;
    this.vx = 0; this.goal = null; this.waitT = rand(0, 3);
    this.home = this.home ?? this.x;
  }
  watch(g) {
    this.watchT = 12;
    g.track('watch', this.jid); g.track('see', this.jid, this);
    g.ui.say('label', () => this.head(), this.name, { dur: 6, cls: 'label' });
    if (this.sound) g.audio[this.sound]();
    g.ui.dialogue(this.name, this.facts, null, this.portrait());
    setTimeout(() => g.baby.react('animal'), 900);
  }
  actions(g) {
    return [
      { label: '👀 Watch quietly', primary: true, run: () => this.watch(g) },
      { label: '👉 Show baby', run: () => { g.track('see', this.jid, this); if (g.baby.react('animal')) g.track('showBaby', this.jid); else g.ui.say('parent', () => g.parentHead(), '(they\'re napping — maybe later)'); } },
    ];
  }
  /** Common clock + gradual turning. `gait` speeds the animation up while moving. */
  tick(dt, gait = 0) {
    this.t += dt; this.watchT -= dt;
    this.anim += dt * (1 + gait * Math.min(1.5, Math.abs(this.vx) / (this.maxV || 1)));
    this.face += (this.dir - this.face) * Math.min(1, dt * this.turnRate);
  }
  /** Ease toward a target x with limited acceleration; returns the remaining distance. */
  steer(dt, tx, maxV, accel) {
    const d = tx - this.x;
    const want = Math.sign(d) * Math.min(maxV, Math.sqrt(Math.abs(d) * accel * 1.6));
    const dv = want - this.vx, lim = accel * dt;
    this.vx += Math.max(-lim, Math.min(lim, dv));
    this.x += this.vx * dt;
    if (Math.abs(this.vx) > maxV * 0.15) this.dir = Math.sign(this.vx);
    return Math.abs(d);
  }
  /** Wander around home: travel to a random spot, linger, pick another. Returns true while travelling. */
  wander(dt, { range = 40, speed = [2, 4], accel = 2, pause = [2, 6], arrive = 1.2 } = {}) {
    const slow = this.watchT > 0 ? 0.35 : 1;
    if (this.goal == null) {
      this.waitT -= dt;
      this.vx *= Math.max(0, 1 - dt * accel);
      this.x += this.vx * dt;
      if (this.waitT <= 0) {
        this.goal = Math.max(this.home - range, Math.min(this.home + range, this.x + (Math.random() < 0.5 ? -1 : 1) * rand(range * 0.25, range)));
        this.goalV = rand(speed[0], speed[1]); this.maxV = speed[1];
      }
      return false;
    }
    const d = this.steer(dt, this.goal, this.goalV * slow, accel);
    if (d < arrive) { this.goal = null; this.waitT = rand(pause[0], pause[1]); }
    return true;
  }
  /** Hurry away from the player if they come close while moving. */
  shy(g, dist, push) {
    if (g.player.moving && this.near(g, dist)) { this.goal = this.x + (this.x > g.player.x ? push : -push); this.goalV = this.maxV * 2; this.waitT = 0; return true; }
    return false;
  }
  render() { }
  draw(ctx, g, ox, oy) {
    const x = this.x - ox, y = this.y - oy;
    if (this.noTurn) { this.render(ctx, x, y, this.dir, this.anim); return; }
    const sx = Math.max(0.1, Math.abs(this.face));
    ctx.save(); ctx.translate(x, y); ctx.scale(sx, 1);
    this.render(ctx, 0, 0, this.face >= 0 ? 1 : -1, this.anim);
    ctx.restore();
  }
  portrait() {
    if (!this._p) { const [w, h, px, py] = this.pbox || [24, 16, 12, 14]; this._p = snapshot(w, h, c => { c.fillStyle = this.under ? '#6ab0bc' : '#e8efe6'; c.fillRect(0, 0, w, h); this.render(c, px, py, 1, 1); }, 5); }
    return this._p;
  }
  near(g, d) { return Math.abs(g.player.x - this.x) < d; }
}

export class Manatee extends Animal {
  constructor(o) {
    super({ name: o.calf ? 'Manatee calf' : 'West Indian manatee', jid: 'manatee', w: 30, h: 10, reach: 0, under: true, sound: 'manatee', pbox: [34, 14, 17, 7], turnRate: 0.7, ...o });
    this.depth = rand(116, 128); this.y = this.depth; this.restDepth = 0;
    this.breathT = rand(10, 40); this.surf = 0; this.scars = Math.random() < 0.6; this.uid = Math.random().toString(36).slice(2);
    this.lazy = rand(0.6, 1.4);
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
  surface(g) { if (this.surf === 0) { this.surf = 1; this.breathT = rand(25, 60); } }
  update(dt, g) {
    this.tick(dt, 0.6); this.breathT -= dt;
    if (this.follow) { // calves tag along just behind mom, with a little lag
      const m = this.follow;
      this.steer(dt, m.x - m.face * 7 + Math.sin(this.t * 0.3) * 2, 6, 2.5);
      if (Math.abs(this.vx) < 0.3) this.dir = m.dir;
      this.y += (m.y + 3.5 + Math.sin(this.t * 0.5) * 0.8 - this.y) * Math.min(1, dt * 0.9);
      this.y = Math.min(this.y, bottomY(this.x) - 4);
      return;
    }
    if (this.breathT <= 0) this.surface(g);
    if (this.surf === 1) {
      this.y += (WATER_Y + 1.6 - this.y) * dt * 0.7;
      if (this.y < WATER_Y + 2.6) {
        this.surf = 2; this.surfT = rand(1.6, 3);
        if (Math.abs(g.player.x - this.x) < 160) { g.audio.manatee(); g.ui.say('mn' + this.uid, () => this.head(), 'pfffff…', { dur: 1.6, cls: 'label' }); }
        g.fx.ripple(this.x + this.dir * 12, WATER_Y);
        for (const c of g.entities) if (c.follow === this) c.y = Math.min(c.y, WATER_Y + 5);
      }
    } else if (this.surf === 2) { this.surfT -= dt; if (this.surfT <= 0) this.surf = 3; }
    else if (this.surf === 3) { this.y += (this.depth - this.y) * dt * 0.5; if (Math.abs(this.y - this.depth) < 0.5) this.surf = 0; }
    else this.y = this.depth + Math.sin(this.t * 0.25 * this.lazy) * 1.2;
    // drift slowly, then rest for a long while (manatees doze for minutes at a time)
    this.wander(dt, { range: 200, speed: [0.8 * this.lazy, 3 * this.lazy], accel: 0.35, pause: [6, 22], arrive: 3 });
    if (this.x < 780 || this.x > 3480) { this.goal = Math.max(800, Math.min(3460, this.home)); }
    this.y = Math.min(this.y, bottomY(this.x) - 5);
  }
  render(ctx, x, y, dir, t) { drawManatee(ctx, x, y, dir, t, { calf: this.calf, scale: this.calf ? 0.55 : 1, scars: this.scars }); }
}

export class Gar extends Animal {
  constructor(o) { super({ name: 'Longnose gar', jid: 'gar', w: 18, h: 4, reach: 0, under: true, pbox: [22, 6, 11, 3], turnRate: 1.2, ...o }); this.y = rand(108, 114); this.base = this.y;
    this.facts = ['Longnose gar belong to an ancient family of fish that has barely changed in 100 million years.', 'They can gulp air at the surface, which helps them live in warm, low-oxygen water.'];
  }
  box() { return { x: this.x - 9, y: this.y - 2, w: 18, h: 4 }; }
  approachX() { return this.x; }
  update(dt) {
    this.tick(dt, 1);
    // gar hang motionless, then glide a short way
    this.wander(dt, { range: 60, speed: [1.5, 4], accel: 1.2, pause: [4, 14] });
    this.y += (this.base + Math.sin(this.t * 0.2) * 1.5 - this.y) * dt;
  }
  render(ctx, x, y, dir, t) { drawGar(ctx, x, y, dir, t); }
}

export class FishSchool extends Animal {
  constructor(o) { super({ name: 'Striped mullet', jid: 'mullet', w: 20, h: 8, reach: 0, under: true, pbox: [16, 8, 8, 4], noTurn: true, ...o }); this.y = rand(116, 126);
    this.fish = Array.from({ length: 6 + (Math.random() * 5 | 0) }, () => ({ dx: rand(-9, 9), dy: rand(-3, 3), x: 0, y: 0, p: Math.random() * 6, f: 1, lag: rand(0.6, 1.6) }));
    this.jumpT = rand(8, 20); this.jump = null;
    this.facts = ['Mullet are famous for leaping clean out of the water — nobody is completely sure why!', 'They graze on algae and tiny bits of food on the spring bottom.'];
  }
  box() { return { x: this.x - 10, y: this.y - 4, w: 20, h: 8 }; }
  approachX() { return this.x; }
  scatter() { this.goal = this.x + rand(-40, 40); this.goalV = 14; this.waitT = 0; for (const f of this.fish) { f.dx = rand(-14, 14); f.dy = rand(-5, 5); } }
  update(dt, g) {
    this.tick(dt, 1);
    this.wander(dt, { range: 45, speed: [3, 7], accel: 4, pause: [1, 5], arrive: 2 });
    for (const f of this.fish) { // each fish follows the school with its own lag, and turns on its own
      f.p += dt;
      if (Math.random() < dt * 0.3) { f.dx = rand(-9, 9); f.dy = rand(-3, 3); }
      const tx = this.x + f.dx + Math.sin(f.p * 0.9) * 1.5, ty = this.y + f.dy + Math.sin(f.p * 0.7) * 0.6;
      const k = Math.min(1, dt * 1.2 * f.lag), px = f.x;
      f.x = f.x ? f.x + (tx - f.x) * k : tx; f.y = f.y ? f.y + (ty - f.y) * k : ty;
      const v = f.x - px; if (Math.abs(v) > 0.004) f.f += (Math.sign(v) - f.f) * Math.min(1, dt * 5);
    }
    this.jumpT -= dt;
    if (this.jumpT <= 0) { this.jumpT = rand(10, 24); this.jump = { t: 0, x: this.x }; if (Math.abs(g.player.x - this.x) < 160) { g.audio.splash(); g.track('mullet'); setTimeout(() => g.baby.react('animal'), 500); } g.fx.ripple(this.x, WATER_Y); }
    if (this.jump) { this.jump.t += dt; if (this.jump.t > 0.9) { this.jump = null; g.fx.ripple(this.x + 8, WATER_Y); } }
  }
  render(ctx, x, y, dir, t) {
    if (!this.fish[0].x) { for (const f of this.fish) drawFish(ctx, x + f.dx, y + f.dy, dir, t + f.p); return; }
    for (const f of this.fish) {
      ctx.save(); ctx.translate(x + f.x - this.x, y + f.y - this.y); ctx.scale(Math.max(0.15, Math.abs(f.f)), 1);
      drawFish(ctx, 0, 0, f.f >= 0 ? 1 : -1, t * 2 + f.p); ctx.restore();
    }
  }
  drawAbove(ctx, ox, oy) {
    if (!this.jump) return;
    const k = this.jump.t / 0.9;
    const jx = this.jump.x + k * 8 * this.dir - ox, jy = WATER_Y - Math.sin(k * Math.PI) * 9 - oy;
    ctx.save(); ctx.translate(jx, jy); ctx.rotate((k - 0.5) * 1.6 * this.dir); drawFish(ctx, 0, 0, this.dir, 0, '#b8c0c0', 4.2); ctx.restore();
  }
}

export class Alligator extends Animal {
  constructor(o) {
    super({ name: o.juvenile ? 'Young alligator' : 'American alligator', jid: o.juvenile ? 'juvgator' : 'gator', w: o.juvenile ? 18 : 34, h: 5, reach: 46, sound: 'gator', pbox: [42, 8, 18, 6], dir: -1, turnRate: 0.8, ...o });
    this.state = o.swimOnly ? 'swim' : 'bask'; this.stateT = rand(30, 60);
    this.y = WATER_Y - 0.3; this.sink = 0;
    this.facts = o.juvenile ? ['Baby alligators wear bright yellow stripes for camouflage among sunlit reeds. They stay near their mother for a year or more.', 'Mother alligators are surprisingly caring — they guard the nest and carry hatchlings to the water in their mouths. Admire from a distance!'] : [
      'The American alligator is Florida\'s official state reptile. They can live 35 to 50 years in the wild.',
      'Basking in the sun warms them up — they\'re cold-blooded. Give them plenty of space and never, ever feed one.',
    ];
  }
  update(dt, g) {
    this.tick(dt, 0.8); this.stateT -= dt;
    if (this.juvenile) { this.y = WATER_Y - 1.6; if (Math.random() < dt * 0.05) this.dir = -this.dir; return; }
    if (this.state === 'bask' && (this.stateT <= 0 || (g.player.moving && this.near(g, 30)))) { this.enter(g); }
    if (this.state === 'swim') {
      // gators cruise slowly, then float dead-still for long spells, sometimes sinking out of sight
      const moving = this.wander(dt, { range: this.range || 120, speed: [1.2, 3.2], accel: 0.6, pause: [5, 16], arrive: 2 });
      this.sink += ((!moving && this.waitT > 9 ? 1 : 0) - this.sink) * dt * 0.4;
      if (!this.swimOnly && this.stateT <= 0 && Math.abs(this.x - this.home) < 10) { this.state = 'bask'; this.stateT = rand(30, 60); this.vx = 0; }
      else if (!this.swimOnly && this.stateT <= 0) { this.goal = this.home; this.goalV = 2.5; }
    }
  }
  enter(g) { this.state = 'swim'; this.stateT = rand(20, 40); this.goal = this.x + this.dir * rand(20, 40); this.goalV = 4; g.audio.splash(); g.fx.ripple(this.x, WATER_Y); }
  visible() { return this.sink < 0.85; }
  render(ctx, x, y, dir, t) {
    if (this.juvenile) {
      ctx.fillStyle = lin(ctx, 0, y - 1, 0, y + 2, [[0, '#6a5a46'], [1, '#3a2e24']]); ctx.beginPath(); ctx.roundRect(x - 12, y - 0.2, 24, 2.6, 1.3); ctx.fill();
      ctx.save(); ctx.translate(x, y); ctx.scale(0.5, 0.5); drawAlligator(ctx, 0, 0, dir, t, { juvenile: true }); ctx.restore();
      return;
    }
    if (this.state === 'swim') {
      ctx.save(); ctx.beginPath(); ctx.rect(x - 30, y - 10, 60, 10.6); ctx.clip();
      drawAlligator(ctx, x, y + 2.2 + this.sink * 2, dir, t, { submerged: true }); ctx.restore();
      const wake = Math.min(1, Math.abs(this.vx) / 2);
      if (wake > 0.05) { ctx.strokeStyle = `rgba(230,240,230,${0.35 * wake})`; ctx.lineWidth = 0.2; ctx.beginPath(); ctx.moveTo(x - dir * 4, y + 0.6); ctx.lineTo(x - dir * 18, y - 0.2); ctx.moveTo(x - dir * 4, y + 0.6); ctx.lineTo(x - dir * 18, y + 1.4); ctx.stroke(); }
    } else drawAlligator(ctx, x, y, dir, t);
  }
}

export class Turtles extends Animal {
  constructor(o) { super({ name: 'Florida red-bellied cooters', jid: 'cooter', w: 26, h: 5, reach: 30, sound: 'splash', pbox: [16, 6, 8, 5], noTurn: true, ...o }); this.y = WATER_Y - 1;
    this.shells = [[-8, 1], [1, 1], [9, -1]].map(([dx, d], i) => ({ dx, d, on: true, t: i * 1.3, back: 0 }));
    this.facts = ['These turtles line up on logs to bask. Sunshine warms them and helps keep their shells healthy.', 'If you hear a "plop!" as you walk by — that\'s a turtle diving to safety.'];
  }
  spook(g) { // they don't all go at once: plop… plop… plop
    let d = 0;
    for (const s of this.shells) if (s.on) { const sh = s; setTimeout(() => { sh.on = false; sh.back = rand(10, 30); g.fx.ripple(this.x + sh.dx, WATER_Y); if (this.near(g, 140)) g.audio.splash(); }, d); d += rand(150, 700); }
    if (this.near(g, 140)) g.ui.say('turt', () => this.head(), 'plop! plop!', { dur: 1.3, cls: 'label' });
  }
  update(dt, g) {
    this.tick(dt);
    for (const s of this.shells) { s.t += dt; if (!s.on) { s.back -= dt; if (s.back <= 0) { s.on = true; s.t = 0; } } }
    if (this.watchT <= 0 && g.player.moving && this.near(g, 22) && this.shells.some(s => s.on)) this.spook(g);
  }
  visible() { return this.shells.some(s => s.on); }
  render(ctx, x, y, dir, t) {
    for (const s of this.shells) if (s.on || !this.shells.length) {
      const climb = Math.min(1, s.t / 2), cy = y + (1 - climb) * 2;
      drawTurtle(ctx, x + s.dx, cy, s.d, s.t * 0.5 + (Math.sin(s.t * 0.37 + s.dx) > 0.92 ? s.t * 3 : 0));
    }
  }
  portrait() { if (!this._p) { const on = this.shells.map(s => s.on); for (const s of this.shells) s.on = true; super.portrait(); this.shells.forEach((s, i) => { s.on = on[i]; }); } return this._p; }
}

export class Wader extends Animal {
  constructor(o) {
    const info = {
      heron: ['Great blue heron', ['The great blue heron is the largest heron in North America.', 'It stands perfectly still, then strikes like lightning to spear a fish with its dagger-like bill.'], drawHeron],
      egret: ['Great egret', ['Great egrets were nearly wiped out a century ago, hunted for their lacy breeding plumes. Protecting them helped start the bird conservation movement.', 'Now they\'re a common, elegant sight along Florida waters.'], drawEgret],
      ibis: ['White ibis', ['White ibises probe the mud with their long, curved bills, feeling for crayfish and insects.', 'They often travel in groups — look for a little flock of them on the lawn.'], drawIbis],
    }[o.species];
    super({ name: info[0], jid: o.species, w: 10, h: 26, reach: 34, sound: 'heron', pbox: [20, 30, 7, 29], turnRate: 4, ...o });
    this.facts = info[1]; this.fn = info[2]; this.state = 'stand'; this.stateT = rand(2, 6); this.stepP = 0;
  }
  strike() { this.state = 'strike'; this.stateT = 0.9; this.goal = null; this.vx = 0; this.anim = 0; }
  update(dt, g) {
    this.tick(dt); this.stateT -= dt;
    const ibis = this.species === 'ibis';
    if (this.state === 'strike') { if (this.stateT <= 0) { this.state = 'stand'; this.waitT = rand(2, 5); } return; }
    // a slow, deliberate stalk: lift a foot, place it, freeze — with long still pauses
    const moving = this.wander(dt, { range: ibis ? 22 : 40, speed: ibis ? [3, 5] : [2, 3.4], accel: 6, pause: ibis ? [0.5, 2.5] : [3, 9], arrive: 1 });
    if (moving) { this.stepP += dt * (ibis ? 5 : 2.6); const k = Math.pow(Math.max(0, Math.sin(this.stepP)), 2); this.x -= this.vx * dt * (1 - k * 1.6); }
    this.state = moving ? 'walk' : 'stand';
    this.probe = ibis && !moving && Math.sin(this.t * 1.7 + this.home) > 0.3;
    if (!ibis && !moving && this.stateT <= 0) { this.stateT = rand(5, 14); if (Math.random() < 0.35) this.strike(); }
    if (!ibis && this.watchT <= 0 && this.shy(g, 14, 30)) this.goalV = 6;
    this.y = this.y0 ?? (this.y0 = this.y);
  }
  render(ctx, x, y, dir) {
    if (this.state === 'strike') this.fn(ctx, x, y, dir, (0.9 - this.stateT) * 1.15, 'strike');
    else this.fn(ctx, x, y, dir, this.t, this.probe ? 'strike' : this.state);
  }
}

export class Anhinga extends Animal {
  constructor(o) { super({ name: 'Anhinga', jid: 'anhinga', w: 14, h: 12, reach: 34, pbox: [20, 14, 10, 13], dir: 1, ...o });
    this.facts = ['Anhingas swim with just their snaky neck above water — that\'s why people call them "snakebirds."', 'Their feathers aren\'t waterproof, so after fishing they perch with wings spread wide to dry in the sun.'];
  }
  update(dt) { this.tick(dt); if (Math.random() < dt * 0.03) this.dir = -this.dir; }
  render(ctx, x, y, dir, t) { drawAnhinga(ctx, x, y, dir, t, true); }
}

export class Osprey extends Animal {
  constructor(o) { super({ name: 'Osprey', jid: 'osprey', w: 16, h: 12, reach: 0, sound: 'osprey', pbox: [20, 14, 10, 7], turnRate: 6, ...o });
    this.cx = this.x; this.th = Math.random() * 6; this.R = rand(30, 60); this.alt = rand(14, 24); this.dive = null;
    this.facts = ['Ospreys eat almost nothing but fish. They plunge feet-first into the water to grab them.', 'They carry fish head-first, like a torpedo, to cut through the wind.'];
  }
  visible(g) { return !g.sky.night; }
  /** Fold, plunge feet-first into the water, and labour back up with a fish. */
  hunt(tx, g) { if (!this.dive) this.dive = { t: 0, x0: this.x, y0: this.y, tx, g }; }
  update(dt, g) {
    this.tick(dt);
    const px = this.x;
    if (this.dive) {
      const d = this.dive; d.t += dt;
      if (d.t < 1.4) { const k = d.t / 1.4; this.x = d.x0 + (d.tx - d.x0) * k; this.y = d.y0 + (WATER_Y - 2 - d.y0) * k * k; }
      else if (!d.hit) { d.hit = true; g.fx.ripple(this.x, WATER_Y); if (this.near(g, 180)) { g.audio.splash(); g.ui.say('osp', () => this.head(), 'SPLASH!', { dur: 1.3, cls: 'label' }); } }
      else if (d.t < 4.5) { const k = (d.t - 1.4) / 3.1; this.y = WATER_Y - 2 - k * (WATER_Y - 2 - this.alt); this.x += this.dir * 10 * dt; this.fish = true; }
      else { this.dive = null; this.cx = this.x; this.th = Math.PI / 2; }
    } else {
      // soar in lazy, drifting circles, sometimes wandering off along the run
      this.th += dt * (0.25 + 0.1 * Math.sin(this.t * 0.07));
      if (Math.random() < dt * 0.02) this.goalX = rand(this.home - 260, this.home + 260);
      if (this.goalX != null) this.cx += (this.goalX - this.cx) * dt * 0.05;
      this.x = this.cx + Math.cos(this.th) * this.R;
      this.y += (this.alt + Math.sin(this.th) * 5 + Math.sin(this.t * 0.11) * 4 - this.y) * Math.min(1, dt * 2);
      if (Math.random() < dt * 0.01) this.fish = false;
    }
    const v = (this.x - px) / Math.max(dt, 1e-4); if (Math.abs(v) > 0.5) this.dir = Math.sign(v);
  }
  box() { return { x: this.x - 9, y: this.y - 7, w: 18, h: 14 }; }
  approachX() { return this.x; }
  head() { return { x: this.x, y: this.y - 6 }; }
  render(ctx, x, y, dir, t) {
    if (this.dive && this.dive.t < 1.4) { ctx.save(); ctx.translate(x, y); ctx.rotate(dir * 0.9); drawOsprey(ctx, 0, 0, dir, 0.2); ctx.restore(); return; }
    drawOsprey(ctx, x, y, dir, t);
    if (this.fish) drawFish(ctx, x, y + 3, dir, 0, '#b8c0c0', 3.2);
  }
}

export class Otter extends Animal {
  constructor(o) { super({ name: 'River otter', jid: 'otter', w: 14, h: 4, reach: 0, pbox: [16, 7, 7, 5], turnRate: 5, ...o }); this.y = WATER_Y;
    this.facts = ['River otters close their ears and nostrils when they dive, and use their whiskers to feel for fish in murky water.', 'They\'re playful — sliding, wrestling and tumbling, even as adults.'];
    this.under = false; this.diving = false; this.bob = 0;
  }
  box() { return { x: this.x - 7, y: this.y - 4, w: 14, h: 6 }; }
  approachX() { return this.x; }
  visible() { return !this.diving; }
  update(dt, g) {
    this.tick(dt, 1.2);
    const moving = this.wander(dt, { range: 90, speed: [5, 12], accel: 8, pause: [1.5, 6], arrive: 1.5 });
    // porpoise along when travelling: duck under, pop up a little further on
    const wasDiving = this.diving;
    this.diving = moving && Math.abs(this.vx) > 6 && Math.sin(this.t * 1.6) < -0.35;
    if (this.diving !== wasDiving) g.fx.ripple(this.x, WATER_Y);
    this.y = WATER_Y + (moving ? Math.sin(this.t * 1.6) * 0.5 : Math.sin(this.t * 1.1) * 0.25);
  }
  render(ctx, x, y, dir, t) { drawOtter(ctx, x, y, dir, t, true); }
}

export class Armadillo extends Animal {
  constructor(o) { super({ name: 'Nine-banded armadillo', jid: 'armadillo', w: 12, h: 5, reach: 26, pbox: [16, 8, 7, 7], turnRate: 6, ...o });
    this.facts = ['Armadillos almost always give birth to identical quadruplets!', 'They snuffle through leaf litter with their long noses, hunting for insects and grubs.'];
  }
  update(dt, g) {
    this.tick(dt, 2.5);
    // trundle, stop to root in the leaves, trundle on; startle and scurry if you rush up
    this.walking = this.wander(dt, { range: 45, speed: [3, 6], accel: 10, pause: [1, 4], arrive: 0.8 });
    if (!(this.watchT > 0) && this.shy(g, 14, 30)) this.goalV = 16;
    if (!this.walking) this.anim += dt * 0.3;
    this.y = groundY(this.x);
  }
  render(ctx, x, y, dir, t) { drawArmadillo(ctx, x, y + (this.walking ? 0 : Math.max(0, Math.sin(this.t * 6)) * 0.25), dir, t, this.walking); }
}

export class Owl extends Animal {
  constructor(o) { super({ name: 'Barred owl', jid: 'owl', w: 8, h: 10, reach: 0, sound: 'owl', pbox: [10, 12, 5, 11.5], noTurn: true, ...o }); this.hootT = rand(4, 10);
    this.facts = ['Listen for the barred owl\'s call: "Who cooks for you? Who cooks for you-all?"', 'They love old oak hammocks near water, like the woods around Blue Spring.'];
  }
  visible(g) { return g.sky.night || g.sky.dusk; }
  approachX() { return this.x; }
  update(dt, g) { this.tick(dt); this.hootT -= dt; if (this.hootT <= 0) { this.hootT = rand(14, 26); if (Math.abs(g.player.x - this.x) < 220) { g.audio.owl(); g.track('see', 'owl', this); g.ui.say('owl', () => this.head(), 'who-cooks-for-you…', { dur: 2.4, cls: 'label' }); } } }
  render(ctx, x, y, dir, t) { drawBarredOwl(ctx, x, y, t); }
}

export class Anole extends Animal {
  constructor(o) { super({ name: 'Green anole', jid: 'anole', w: 6, h: 8, reach: 20, pbox: [12, 10, 6, 9], turnRate: 12, ...o }); this.dew = 0; this.dewT = rand(3, 8); this.y0 = this.y;
    this.facts = ['Green anoles are Florida\'s native "chameleons" — they can shift from bright green to brown depending on mood and temperature.', 'Males flash a pink throat fan called a dewlap to show off and defend their patch of railing.'];
  }
  update(dt, g) {
    this.tick(dt, 3); this.dewT -= dt;
    if (this.dewT <= 0) { this.dewT = rand(4, 10); this.dewOn = 1.6; this.bobT = 1.2; if (this.near(g, 60)) g.track('dewlap'); }
    if (this.dewOn > 0) { this.dewOn -= dt; this.dew = Math.min(1, this.dew + dt * 4); } else this.dew = Math.max(0, this.dew - dt * 3);
    this.bobT = (this.bobT || 0) - dt;
    // quick little dashes along the railing, then frozen stillness
    this.wander(dt, { range: 8, speed: [14, 22], accel: 80, pause: [2, 8], arrive: 0.4 });
    this.climb = this.bobT > 0 ? -Math.abs(Math.sin(this.bobT * 10)) * 0.5 : 0;
  }
  render(ctx, x, y, dir, t) { drawAnole(ctx, x, y - 4 + (this.climb || 0), dir, t, this.dew); }
}
export class Skink extends Animal {
  constructor(o) { super({ name: 'Five-lined skink', jid: 'skink', w: 10, h: 4, reach: 22, pbox: [14, 5, 6, 4], turnRate: 14, ...o });
    this.facts = ['Young five-lined skinks have bright blue tails. If a predator grabs the tail, it breaks off and wiggles while the skink escapes — then grows back!', 'They hunt insects and spiders among fallen logs and leaf litter.'];
  }
  visible(g) { return !g.sky.night; }
  update(dt, g) {
    this.tick(dt, 3);
    this.wander(dt, { range: 30, speed: [12, 24], accel: 120, pause: [1.5, 5], arrive: 0.5 });
    if (this.shy(g, 16, 26)) this.goalV = 40;
    this.y = groundY(this.x);
  }
  render(ctx, x, y, dir, t) { drawSkink(ctx, x, y, dir, t); }
}
export class WaterSnake extends Animal {
  constructor(o) { super({ name: 'Banded water snake', jid: 'snake', w: 16, h: 4, reach: 32, pbox: [18, 6, 9, 5], turnRate: 1.5, ...o }); this.y = WATER_Y - 0.6;
    this.facts = ['Banded water snakes are harmless, non-venomous snakes that hunt fish and frogs along the water\'s edge.', 'People often mistake them for cottonmouths. Either way, the rule is the same: give snakes space and let them be.'];
  }
  visible(g) { return !g.sky.night; }
  update(dt) { this.tick(dt, 2); this.wander(dt, { range: 50, speed: [2, 4], accel: 1.5, pause: [3, 10] }); }
  render(ctx, x, y, dir, t) { drawWaterSnake(ctx, x, y, dir, t); }
}
export class Softshell extends Animal {
  constructor(o) { super({ name: 'Florida softshell turtle', jid: 'softshell', w: 12, h: 4, reach: 0, under: true, pbox: [16, 6, 7, 3], turnRate: 1.5, ...o }); this.y = 128;
    this.facts = ['Florida softshells have flat, leathery shells instead of hard scutes — like a swimming pancake!', 'Their long snorkel nose lets them breathe while hiding buried in the sandy bottom.'];
  }
  box() { return { x: this.x - 6, y: this.y - 2, w: 12, h: 4 }; }
  approachX() { return this.x; }
  update(dt) {
    this.tick(dt, 1.5);
    const moving = this.wander(dt, { range: 70, speed: [2, 5], accel: 2, pause: [5, 15] });
    const floor = bottomY(this.x) - (moving ? 4 + Math.sin(this.t * 0.5) * 2 : 1.2); // settle into the sand to rest
    this.y += (floor - this.y) * Math.min(1, dt * 0.8);
  }
  render(ctx, x, y, dir, t) { drawSoftshell(ctx, x, y, dir, t); }
}
export class Tortoise extends Animal {
  constructor(o) { super({ name: 'Gopher tortoise', jid: 'tortoise', w: 9, h: 5, reach: 22, pbox: [24, 8, 16, 7], turnRate: 0.8, ...o });
    this.facts = ['Gopher tortoises dig burrows up to 40 feet long. More than 350 other kinds of animals use those burrows for shelter!', 'They\'re a threatened species in Florida, living in dry, sandy uplands like the ridge above the spring.'];
  }
  visible(g) { return !g.sky.night; }
  update(dt) {
    this.tick(dt, 1);
    this.walking = this.wander(dt, { range: 20, speed: [0.8, 1.6], accel: 1, pause: [4, 12], arrive: 0.5 });
    this.y = groundY(this.x);
  }
  render(ctx, x, y, dir, t) { drawGopherTortoise(ctx, x, y, dir, t, this.walking); }
}

// ======================= PEOPLE =======================
export class Person extends Entity {
  constructor(o) {
    super({ reach: 18, w: 14, h: 30, kind: 'person', dir: -1, greeted: false, ...o });
    this.t = Math.random() * 5; this.recent = [];
  }
  /** Point at or wave toward something for a moment. */
  gesture(kind, dur = 2.4, faceX = null) { this.gest = kind; this.gestT = dur; if (faceX != null) this.dir = faceX < this.x ? -1 : 1; this.talking = Math.max(this.talking || 0, dur + 0.5); }
  update(dt, g) {
    this.t += dt;
    if (this.gestT > 0) { this.gestT -= dt; if (this.gestT <= 0) this.gest = null; }
    if (this.kidHop > 0) { this.kidHop -= dt; if (this.kidHop <= 0) { this.kidGest = null; this.kidDir = null; } }
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
    const acts = [{ label: '💬 Chat', primary: true, run: () => { this.talk(g, [this.line()]); g.track('chat', this.name); } }];
    for (const tp of this.topics || []) acts.push({ label: tp.label, run: () => { this.talk(g, tp.pages); g.track('topic', this.name); } });
    acts.push({ label: '👋 Wave', run: () => { g.ui.say('npc' + this.name, () => this.head(), pick(['*waves back*', 'Hi, little one!', 'Enjoy the springs!'])); g.baby.react('person'); } });
    return acts;
  }
  pose() { return { dir: this.dir, state: this.seated ? 'sit' : 'idle', t: this.t, holding: this.gest ? null : this.holding, gesture: this.gest }; }
  draw(ctx, g, ox, oy) {
    drawHuman(ctx, this.x - ox, this.y - oy + (this.seated ? 3 : 0), this.look, this.pose());
    if (this.kid) drawHuman(ctx, this.x + this.dir * 11 - ox, this.y - oy - (this.kidHop > 0 ? Math.abs(Math.sin(this.t * 9)) * 1.5 : 0), this.kid, { dir: this.kidDir || this.dir, state: 'idle', t: this.t + 1, gesture: this.kidGest });
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
  pose() { const walking = !(this.talking > 0) && this.pauseT <= 0; return { dir: this.dir, state: walking ? 'walk' : 'idle', phase: this.t * 6, t: this.t, gesture: this.gest }; }
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
    const acts = [{ label: '📖 Read', primary: true, run: () => { g.track('sign', this.title); g.ui.dialogue(this.title, this.text, null, snapshot(16, 18, c => { c.translate(8, 18); paintSign(c); }, 4)); } }];
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
    return [{ label: '🪑 Sit & rest', primary: true, run: () => { g.track('bench', this.x); g.sitOn(this); } }];
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
