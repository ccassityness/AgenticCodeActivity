// Everything you can tap: animals, people and scenery.
import { SPR, drawSprite, buildPerson, buildKid } from './sprites.js';
import { groundY } from './world.js';

const pick = a => a[(Math.random() * a.length) | 0];
const rand = (a, b) => a + Math.random() * (b - a);

export class Entity {
  constructor(o) {
    this.reach = 18;
    this.w = 12; this.h = 16;
    this.layer = 1;
    Object.assign(this, o);
    if (this.y == null) this.y = groundY(this.x);
  }
  visible() { return true; }
  box() { return { x: this.x - this.w / 2, y: this.y - this.h, w: this.w, h: this.h }; }
  approachX(px) { return px < this.x ? this.x - this.reach : this.x + this.reach; }
  update() { }
  draw() { }
  actions() { return []; }
  /** Point the bubble/label at the top of the entity. */
  head() { return { x: this.x, y: this.y - this.h - 2 }; }
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
    g.ui.say('label', () => this.head(), this.name, { dur: 6, cls: 'label' });
    if (this.sound) g.audio[this.sound]();
    g.ui.dialogue(this.name, this.facts, () => {});
    setTimeout(() => g.baby.react('animal'), 900);
  }
  actions(g) {
    return [
      { label: '👀 Watch quietly', run: () => this.watch(g) },
      { label: '👉 Show baby', run: () => { if (!g.baby.react('animal')) g.ui.say('parent', () => g.parentHead(), '(they\'re napping — maybe later)'); } },
    ];
  }
  playerNear(g, d) { return Math.abs(g.player.x - this.x) < d; }
  spooked(g, d = 26) { return this.watchT <= 0 && g.player.moving && this.playerNear(g, d) && g.player.target !== null && Math.abs(g.player.target - this.x) < 8; }
}

export class Deer extends Animal {
  constructor(o) {
    super({ name: 'Mule deer', w: 20, h: 16, sound: 'huff', ...o });
    this.state = 'graze'; this.stateT = rand(2, 6); this.home = this.x;
    this.facts = [
      'Mule deer are named for their big, mule-like ears — they swivel to catch the tiniest sound.',
      'They\'re most active around dawn and dusk, nibbling shrubs and grasses on the canyon floor.',
    ];
  }
  update(dt, g) {
    this.t += dt; this.watchT -= dt; this.stateT -= dt;
    if (this.state !== 'flee' && (this.spooked(g) || (g.player.moving && this.playerNear(g, 14) && this.watchT <= 0))) {
      this.state = 'flee'; this.stateT = 1.6; this.dir = this.x > g.player.x ? 1 : -1; g.audio.huff();
    }
    if (this.stateT <= 0) {
      if (this.state === 'flee') this.state = 'stand';
      else this.state = pick(['graze', 'graze', 'stand', 'walk']);
      this.stateT = rand(2, 6);
      if (this.state === 'walk') this.dir = this.x > this.home + 60 ? -1 : this.x < this.home - 60 ? 1 : pick([1, -1]);
      if (this.watchT > 0 && this.state === 'walk') this.state = 'graze';
    }
    if (this.state === 'walk') this.x += this.dir * 10 * dt;
    if (this.state === 'flee') this.x += this.dir * 55 * dt;
    this.x = Math.max(this.home - 140, Math.min(this.home + 140, this.x));
    this.y = groundY(this.x);
  }
  draw(ctx, g, ox, oy) {
    const s = SPR.deer;
    let spr = s.stand;
    if (this.state === 'graze') spr = Math.sin(this.t * 0.8) > -0.3 ? s.graze : s.stand;
    if (this.state === 'walk' || this.state === 'flee') spr = Math.floor(this.t * (this.state === 'flee' ? 10 : 4)) % 2 ? s.walk : s.stand;
    drawSprite(ctx, spr, this.x - ox, this.y - oy, this.dir);
  }
}

export class Pronghorn extends Animal {
  constructor(o) {
    super({ name: 'Pronghorn', w: 18, h: 14, sound: 'huff', ...o });
    this.state = 'stand'; this.stateT = rand(3, 6);
    this.facts = [
      'Pronghorn are the fastest land animals in North America — they can sprint around 55 miles per hour!',
      'People often call them "antelope," but their closest living relatives are actually giraffes and okapis.',
    ];
  }
  update(dt, g) {
    this.t += dt; this.watchT -= dt; this.stateT -= dt;
    if (this.state !== 'run' && this.spooked(g, 30)) { this.state = 'run'; this.stateT = 1.5; this.dir = this.x > g.player.x ? 1 : -1; }
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
  draw(ctx, g, ox, oy) {
    const s = SPR.pronghorn;
    const spr = this.state === 'run' ? (Math.floor(this.t * 12) % 2 ? s.run : s.stand)
      : this.state === 'walk' ? (Math.floor(this.t * 4) % 2 ? s.run : s.stand) : s.stand;
    drawSprite(ctx, spr, this.x - ox, this.y - oy, this.dir);
  }
}

export class PrairieDog extends Animal {
  constructor(o) {
    super({ name: 'Utah prairie dog', w: 10, h: 10, reach: 30, sound: 'squeak', ...o });
    this.state = 'up'; this.stateT = rand(2, 5);
    this.facts = [
      'Utah prairie dogs live only in southern Utah, and they\'re a threatened species. Bryce Canyon helps protect them.',
      'Family members greet each other with a "kiss" — touching their front teeth together!',
    ];
  }
  visible(g) { return !g.sky.night; }
  update(dt, g) {
    this.t += dt; this.watchT -= dt; this.stateT -= dt;
    if (this.state !== 'hidden' && this.watchT <= 0 && g.player.moving && this.playerNear(g, 22)) {
      this.state = 'hidden'; this.stateT = 3.5;
      g.audio.squeak();
      g.ui.say('pd' + this.x, () => this.head(), 'eep!', { dur: 1 });
    }
    if (this.stateT <= 0) {
      this.state = this.state === 'hidden' ? 'down' : pick(['up', 'up', 'down']);
      this.stateT = rand(2, 5);
    }
  }
  draw(ctx, g, ox, oy) {
    const x = Math.round(this.x - ox), y = Math.round(this.y - oy);
    if (this.state !== 'hidden') drawSprite(ctx, this.state === 'up' ? SPR.prairieDog.up : SPR.prairieDog.down, x, y, this.dir);
    // burrow mound
    ctx.fillStyle = '#b98a62'; ctx.fillRect(x - 6, y - 1, 12, 2);
    ctx.fillStyle = '#a0704a'; ctx.fillRect(x - 4, y - 2, 8, 1);
    ctx.fillStyle = '#4a3020'; ctx.fillRect(x - 2, y - 1, 4, 1);
  }
}

export class Raven extends Animal {
  constructor(o) {
    super({ name: 'Common raven', w: 16, h: 12, reach: 0, sound: 'raven', ...o });
    this.ax = this.x; this.cawT = rand(5, 12);
    this.facts = [
      'Ravens are some of the smartest birds on Earth. They solve puzzles, use tools, and remember faces.',
      'They play, too — ravens have been seen sliding down snowy slopes just for fun!',
    ];
  }
  visible(g) { return !g.sky.night; }
  update(dt, g) {
    const sp = this.watchT > 0 ? 0.35 : 1;
    this.watchT -= dt;
    this.t += dt * sp;
    const nx = this.ax + Math.sin(this.t * 0.25) * 110;
    this.dir = nx > this.x ? 1 : -1;
    this.x = nx;
    this.y = groundY(this.ax) - 62 + Math.sin(this.t * 0.6) * 14;
    this.cawT -= dt;
    if (this.cawT <= 0) {
      this.cawT = rand(10, 20);
      if (Math.abs(g.player.x - this.x) < 160) { g.audio.raven(); g.ui.say('rv' + this.ax, () => this.head(), 'kraaa!', { dur: 1.2 }); }
    }
  }
  box() { return { x: this.x - 10, y: this.y - 10, w: 20, h: 16 }; }
  head() { return { x: this.x, y: this.y - 8 }; }
  draw(ctx, g, ox, oy) {
    const flap = Math.floor(this.t * 4) % 2 ? SPR.raven.up : SPR.raven.down;
    drawSprite(ctx, flap, this.x - ox, this.y - oy, this.dir);
  }
}

export class Jay extends Animal {
  constructor(o) {
    super({ name: "Steller's jay", w: 8, h: 9, reach: 28, sound: 'jay', ...o });
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
  draw(ctx, g, ox, oy) {
    const spr = this.state === 'fly' ? SPR.jay.fly : this.hopY < 0 ? SPR.jay.hop : SPR.jay.perch;
    drawSprite(ctx, spr, this.x - ox, this.y - oy, this.dir);
  }
}

export class Owl extends Animal {
  constructor(o) {
    super({ name: 'Great horned owl', w: 8, h: 10, reach: 26, sound: 'owl', ...o });
    this.hootT = rand(6, 12);
    this.facts = [
      'Great horned owls aren\'t really horned — those are just tufts of feathers.',
      'Soft, fringed feathers let them fly almost silently through the dark.',
    ];
  }
  visible(g) { return g.sky.night; }
  update(dt, g) {
    this.t += dt; this.watchT -= dt;
    this.hootT -= dt;
    if (this.hootT <= 0) {
      this.hootT = rand(12, 22);
      if (Math.abs(g.player.x - this.x) < 200) { g.audio.owl(); g.ui.say('owl', () => this.head(), 'hoo… hoo-hoo', { dur: 2 }); }
    }
  }
  draw(ctx, g, ox, oy) {
    const spr = (this.t % 4) < 0.15 ? SPR.owl.blink : SPR.owl.idle;
    drawSprite(ctx, spr, this.x - ox, this.y - oy, 1);
  }
}

// ======================= PEOPLE =======================
export class NPC extends Entity {
  constructor(o) {
    super({ reach: 18, w: 12, h: 25, kind: 'person', dir: -1, greeted: false, talkI: 0, ...o });
    this.frames = buildPerson(o.look, { style: o.style, extras: o.extras });
    this.t = Math.random() * 5;
  }
  update(dt, g) {
    this.t += dt;
    if (!this.greeted && Math.abs(g.player.x - this.x) < 60) {
      this.greeted = true;
      this.dir = g.player.x < this.x ? -1 : 1;
      g.ui.say('npc' + this.name, () => this.head(), this.greet, { dur: 2.6 });
      setTimeout(() => g.baby.react('person'), 1200);
    }
  }
  head() { return { x: this.x, y: this.y - 27 }; }
  talk(g, pages) {
    this.dir = g.player.x < this.x ? -1 : 1;
    g.ui.dialogue(this.name, pages);
  }
  actions(g) {
    const acts = [{ label: '💬 Chat', run: () => { this.talk(g, this.lines[this.talkI % this.lines.length]); this.talkI++; } }];
    for (const t of this.topics || []) acts.push({ label: t.label, run: () => this.talk(g, t.pages) });
    acts.push({ label: '👋 Wave', run: () => { g.ui.say('npc' + this.name, () => this.head(), pick(['*waves back*', 'Hi, little one!', 'Happy trails!'])); g.baby.react('person'); } });
    return acts;
  }
  draw(ctx, g, ox, oy) {
    const f = this.frames;
    const bob = Math.sin(this.t * 2) > 0.7 ? -1 : 0;
    drawSprite(ctx, this.seated ? f.sit : f.idle, this.x - ox, this.y - oy + bob + (this.seated ? 3 : 0), this.dir);
  }
}

export class Runner extends NPC {
  constructor(o) {
    super({ ...o });
    this.dir = 1; this.paused = 0; this.passed = false;
  }
  update(dt, g) {
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
      g.ui.say('runner', () => this.head(), pick(['On your left!', 'Morning! Cute baby!', 'Great day for it!']), { dur: 2 });
    }
    if (!near) this.passed = false;
  }
  actions(g) {
    this.paused = 12;
    return super.actions(g);
  }
  approachX(px) { this.paused = 12; return super.approachX(px); }
  draw(ctx, g, ox, oy) {
    const f = this.frames;
    const spr = this.paused > 0 ? f.idle : (Math.floor(this.t * 11) % 2 ? f.walkA : f.walkB);
    drawSprite(ctx, spr, this.x - ox, this.y - oy, this.dir);
  }
}

export class Family extends NPC {
  constructor(o) {
    super(o);
    this.kid = buildKid(o.kidLook);
    this.kidHop = 0;
  }
  update(dt, g) {
    super.update(dt, g);
    this.kidHop = Math.max(0, Math.sin(this.t * 3)) * 2;
  }
  box() { return { x: this.x - 14, y: this.y - 25, w: 28, h: 25 }; }
  draw(ctx, g, ox, oy) {
    super.draw(ctx, g, ox, oy);
    const kx = this.x - this.dir * -10;
    drawSprite(ctx, this.kid.idle, kx - ox, groundY(kx) - oy - Math.round(this.kidHop), this.dir);
  }
}

// ======================= SCENERY =======================
export class Sign extends Entity {
  constructor(o) { super({ w: 14, h: 14, kind: 'sign', name: 'Trail sign', ...o }); }
  actions(g) {
    const acts = [{ label: '📖 Read', run: () => g.ui.dialogue(this.title, this.text) }];
    if (this.view) acts.push({ label: '🌄 Take in the view', run: () => { g.ui.say('parent', () => g.parentHead(), pick(['wow…', 'Look at that, little one.', 'Breathtaking.'])); setTimeout(() => g.baby.react('view'), 900); g.audio.chime(); } });
    return acts;
  }
  draw(ctx, g, ox, oy) { drawSprite(ctx, SPR.sign, this.x - ox, this.y - oy + 1); }
}

export class Bench extends Entity {
  constructor(o) { super({ w: 16, h: 9, kind: 'bench', name: 'Bench', reach: 0, ...o }); }
  approachX() { return this.x; }
  actions(g) {
    if (this.occupied) return [{ label: '🙂 Say hello', run: () => g.ui.say('parent', () => g.parentHead(), 'Lovely spot!') }];
    return [{ label: '🪑 Sit & rest', run: () => g.sitOn(this) }];
  }
  draw(ctx, g, ox, oy) { drawSprite(ctx, SPR.bench, this.x - ox, this.y - oy + 1); }
}

export class Flowers extends Entity {
  constructor(o) { super({ w: 10, h: 8, kind: 'flower', reach: 12, ...o }); }
  actions(g) {
    return [
      { label: '👃 Smell', run: () => {
        g.ui.say('parent', () => g.parentHead(), 'mmm…');
        if (g.baby.carrier === 'front' && g.baby.mood !== 'napping' && Math.random() < 0.6) {
          setTimeout(() => { g.baby.say('ah… ah… CHOO!'); g.audio.sneeze(); g.baby.giggleT = 1.5; }, 1100);
        }
      } },
      { label: '👶 Show baby', run: () => g.baby.react('flower') },
      { label: 'ℹ️ What is it?', run: () => g.ui.dialogue(this.name, [...this.facts, 'Leave the flowers for the next hikers (and the bees) to enjoy! 🐝']) },
    ];
  }
  draw(ctx, g, ox, oy) { drawSprite(ctx, SPR.flowers[this.variety], this.x - ox, this.y - oy + 1); }
}

export class Pinecone extends Entity {
  constructor(o) { super({ w: 8, h: 7, kind: 'thing', name: 'Ponderosa pinecone', reach: 12, ...o }); }
  actions(g) {
    return [
      { label: '👶 Show baby', run: () => g.baby.react('thing') },
      { label: '👃 Sniff the bark', run: () => g.ui.dialogue('Ponderosa pine', ['*sniff sniff* …butterscotch?!', 'On a warm day, ponderosa pine bark really can smell like vanilla or butterscotch.']) },
    ];
  }
  draw(ctx, g, ox, oy) { drawSprite(ctx, SPR.pinecone, this.x - ox, this.y - oy + 1); }
}

/** Big landmarks (hoodoos, trees) that are part of the baked scenery; just a hitbox + info. */
export class Landmark extends Entity {
  constructor(o) { super({ kind: 'landmark', ...o }); }
  box() { return { x: this.x - this.w / 2, y: this.y - this.h + (this.yOff || 0), w: this.w, h: this.h }; }
  head() { return { x: this.x, y: this.y - Math.min(this.h, 60) }; }
  actions(g) {
    return [
      { label: '🔎 Look closely', run: () => g.ui.dialogue(this.name, this.text) },
      { label: '👶 Show baby', run: () => g.baby.react(this.react || 'view') },
    ];
  }
}

export class Bristlecone extends Landmark {
  draw(ctx, g, ox, oy) { ctx.drawImage(this.img, Math.round(this.x - ox - 17), Math.round(this.y - oy - 43)); }
}
