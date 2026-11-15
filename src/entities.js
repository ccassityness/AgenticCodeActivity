// Everything you can tap: animals, people, pickups and scenery.
import { SPR, drawSprite, buildPerson, buildKid, PEOPLE_OPTIONS, toDataURL } from './sprites.js';
import { groundY, outlineCanvas } from './world.js';
import { ITEMS, LITTER } from './items.js';

const pick = a => a[(Math.random() * a.length) | 0];
const rand = (a, b) => a + Math.random() * (b - a);

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

function spritePortrait(spr) { return toDataURL(spr.r, Math.max(2, Math.floor(48 / Math.max(spr.w, spr.h)))); }

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
      { label: '👀 Watch quietly', run: () => this.watch(g) },
      { label: '👉 Show baby', run: () => { g.journal.see(this.jid); if (!g.baby.react('animal')) g.ui.say('parent', () => g.parentHead(), '(they\'re napping — maybe later)'); } },
    ];
  }
  portrait() { return this._p || (this._p = spritePortrait(this.portraitSprite())); }
  portraitSprite() { return SPR.heart; }
  playerNear(g, d) { return Math.abs(g.player.x - this.x) < d; }
  spooked(g, d = 26) { return this.watchT <= 0 && g.player.moving && this.playerNear(g, d) && g.player.target !== null && Math.abs(g.player.target - this.x) < 8; }
}

export class Deer extends Animal {
  constructor(o) {
    super({ name: 'Mule deer', jid: 'deer', w: 22, h: 18, sound: 'huff', ...o });
    this.state = 'graze'; this.stateT = rand(2, 6); this.home = this.x;
    this.facts = [
      'Mule deer are named for their big, mule-like ears — they swivel to catch the tiniest sound.',
      'They\'re most active around dawn and dusk, nibbling shrubs and grasses on the canyon floor.',
    ];
  }
  portraitSprite() { return SPR.deer.stand; }
  update(dt, g) {
    this.t += dt; this.watchT -= dt; this.stateT -= dt;
    if (this.state !== 'flee' && (this.spooked(g) || (g.player.moving && this.playerNear(g, 14) && this.watchT <= 0))) {
      this.state = 'flee'; this.stateT = 1.6; this.dir = this.x > g.player.x ? 1 : -1; g.audio.huff();
    }
    if (this.stateT <= 0) {
      this.state = this.state === 'flee' ? 'stand' : pick(['graze', 'graze', 'stand', 'walk']);
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
    super({ name: 'Pronghorn', jid: 'pronghorn', w: 20, h: 16, sound: 'huff', ...o });
    this.state = 'stand'; this.stateT = rand(3, 6);
    this.facts = [
      'Pronghorn are the fastest land animals in North America — they can sprint around 55 miles per hour!',
      'People often call them "antelope," but their closest living relatives are actually giraffes and okapis.',
    ];
  }
  portraitSprite() { return SPR.pronghorn.stand; }
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
    super({ name: 'Utah prairie dog', jid: 'prairiedog', w: 10, h: 10, reach: 30, sound: 'squeak', ...o });
    this.state = 'up'; this.stateT = rand(2, 5);
    this.facts = [
      'Utah prairie dogs live only in southern Utah, and they\'re a threatened species. Bryce Canyon helps protect them.',
      'Family members greet each other with a "kiss" — touching their front teeth together!',
    ];
  }
  portraitSprite() { return SPR.prairieDog.up; }
  visible(g) { return !g.sky.night; }
  update(dt, g) {
    this.t += dt; this.watchT -= dt; this.stateT -= dt;
    if (this.state !== 'hidden' && this.watchT <= 0 && g.player.moving && this.playerNear(g, 22)) {
      this.state = 'hidden'; this.stateT = 3.5;
      g.audio.squeak();
      g.fx.emote(() => this.head(), '!');
    }
    if (this.stateT <= 0) {
      this.state = this.state === 'hidden' ? 'down' : pick(['up', 'up', 'down']);
      this.stateT = rand(2, 5);
    }
  }
  draw(ctx, g, ox, oy) {
    const x = Math.round(this.x - ox), y = Math.round(this.y - oy);
    if (this.state !== 'hidden') drawSprite(ctx, this.state === 'up' ? SPR.prairieDog.up : SPR.prairieDog.down, x, y, this.dir);
    ctx.fillStyle = '#4a2a26'; ctx.fillRect(x - 7, y - 2, 14, 1);
    ctx.fillStyle = '#b98a62'; ctx.fillRect(x - 6, y - 1, 12, 2);
    ctx.fillStyle = '#d8b486'; ctx.fillRect(x - 5, y - 1, 3, 1);
    ctx.fillStyle = '#4a3020'; ctx.fillRect(x - 2, y - 1, 4, 1);
  }
}

export class Raven extends Animal {
  constructor(o) {
    super({ name: 'Common raven', jid: 'raven', w: 16, h: 12, reach: 0, sound: 'raven', ...o });
    this.ax = this.x; this.cawT = rand(5, 12);
    this.facts = [
      'Ravens are some of the smartest birds on Earth. They solve puzzles, use tools, and remember faces.',
      'They play, too — ravens have been seen sliding down snowy slopes just for fun!',
    ];
  }
  portraitSprite() { return SPR.raven.up; }
  visible(g) { return !g.sky.night; }
  update(dt, g) {
    const sp = this.watchT > 0 ? 0.35 : 1;
    this.watchT -= dt;
    this.t += dt * sp;
    const nx = this.ax + Math.sin(this.t * 0.25) * 110;
    this.dir = nx > this.x ? 1 : -1;
    this.x = nx;
    this.y = groundY(this.ax) - 58 + Math.sin(this.t * 0.6) * 12;
    this.cawT -= dt;
    if (this.cawT <= 0) {
      this.cawT = rand(10, 20);
      if (Math.abs(g.player.x - this.x) < 160) { g.audio.raven(); g.ui.say('rv' + this.ax, () => this.head(), 'kraaa!', { dur: 1.2 }); }
    }
  }
  box() { return { x: this.x - 10, y: this.y - 10, w: 20, h: 16 }; }
  head() { return { x: this.x, y: this.y - 8 }; }
  draw(ctx, g, ox, oy) {
    drawSprite(ctx, Math.floor(this.t * 4) % 2 ? SPR.raven.up : SPR.raven.down, this.x - ox, this.y - oy, this.dir);
  }
}

export class Jay extends Animal {
  constructor(o) {
    super({ name: "Steller's jay", jid: 'jay', w: 9, h: 10, reach: 28, sound: 'jay', ...o });
    this.state = 'perch'; this.stateT = rand(1, 3); this.vy = 0; this.hopY = 0; this.flyX = null;
    this.facts = [
      "Steller's jays are noisy, clever blue birds with a tall black crest that rises when they're excited.",
      'They\'re great mimics — they can even copy the scream of a red-tailed hawk to scare other birds away!',
    ];
  }
  portraitSprite() { return SPR.jay.perch; }
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
  draw(ctx, g, ox, oy) {
    const spr = this.state === 'fly' ? SPR.jay.fly : this.hopY < 0 ? SPR.jay.hop : SPR.jay.perch;
    drawSprite(ctx, spr, this.x - ox, this.y - oy, this.dir);
  }
}

export class Owl extends Animal {
  constructor(o) {
    super({ name: 'Great horned owl', jid: 'owl', w: 9, h: 11, reach: 26, sound: 'owl', ...o });
    this.hootT = rand(6, 12);
    this.facts = [
      'Great horned owls aren\'t really horned — those are just tufts of feathers.',
      'Soft, fringed feathers let them fly almost silently through the dark.',
    ];
  }
  portraitSprite() { return SPR.owl.idle; }
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
    drawSprite(ctx, (this.t % 4) < 0.15 ? SPR.owl.blink : SPR.owl.idle, this.x - ox, this.y - oy, 1);
  }
}

export class Squirrel extends Animal {
  constructor(o) {
    super({ name: 'Golden-mantled ground squirrel', jid: 'squirrel', w: 11, h: 9, reach: 26, sound: 'squeak', ...o });
    this.home = this.x; this.state = 'sit'; this.stateT = rand(1, 3); this.hop = 0; this.vy = 0;
    this.facts = [
      'Golden-mantled ground squirrels look like big chipmunks — but they don\'t have stripes on their faces.',
      'They\'re bold beggars! Feeding them makes them sick and dependent on people, so the kindest thing is to just watch.',
    ];
  }
  portraitSprite() { return SPR.squirrel.up; }
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
  draw(ctx, g, ox, oy) {
    drawSprite(ctx, this.state === 'beg' ? SPR.squirrel.up : SPR.squirrel.sit, this.x - ox, this.y - oy, this.dir);
  }
}

export class Lizard extends Animal {
  constructor(o) {
    super({ name: 'Short-horned lizard', jid: 'lizard', w: 12, h: 5, reach: 22, ...o });
    this.home = this.x; this.run = 0;
    this.facts = [
      'Short-horned lizards are round, spiky and perfectly camouflaged against the rocks.',
      'They love warm sunshine and gobble up ants. Some can even squirt a little blood from their eyes to scare off predators!',
    ];
  }
  portraitSprite() { return SPR.lizard.a; }
  visible(g) { return !g.sky.night && g.time > 0.12 && g.time < 0.6; }
  update(dt, g) {
    this.t += dt; this.watchT -= dt;
    if (this.run <= 0 && g.player.moving && this.playerNear(g, 20) && this.watchT <= 0) { this.run = 0.8; this.dir = this.x > g.player.x ? 1 : -1; }
    if (this.run > 0) { this.run -= dt; this.x += this.dir * 70 * dt; }
    else if (Math.abs(this.x - this.home) > 60) { this.dir = Math.sign(this.home - this.x); this.x += this.dir * 6 * dt; }
    this.y = groundY(this.x);
  }
  draw(ctx, g, ox, oy) {
    drawSprite(ctx, this.run > 0 && Math.floor(this.t * 16) % 2 ? SPR.lizard.b : SPR.lizard.a, this.x - ox, this.y - oy, this.dir);
  }
}

export class Butterfly extends Animal {
  constructor(o) {
    super({ name: 'Butterfly', jid: 'butterfly', w: 10, h: 10, reach: 20, ...o });
    this.ax = this.x; this.col = (Math.random() * 4) | 0; this.ph = Math.random() * 6;
    this.facts = [
      'Bryce Canyon is home to dozens of kinds of butterflies, like swallowtails, painted ladies and blues.',
      'Butterflies taste with their feet! They land on flowers to check if they\'re good to sip from.',
    ];
  }
  portraitSprite() { return SPR.butterflies[this.col].a; }
  visible(g) { return !g.sky.night && (!this.life || this.life > 0); }
  update(dt, g) {
    this.t += dt; this.watchT -= dt;
    if (this.life) this.life -= dt;
    if (this.follow) this.ax += (g.player.x + 8 - this.ax) * dt * 0.8;
    this.x = this.ax + Math.sin(this.t * 0.9 + this.ph) * 22 + Math.sin(this.t * 2.3) * 6;
    this.y = groundY(this.ax) - 18 - Math.sin(this.t * 1.7 + this.ph) * 9;
    this.dir = Math.cos(this.t * 0.9 + this.ph) > 0 ? 1 : -1;
  }
  box() { return { x: this.x - 6, y: this.y - 8, w: 12, h: 12 }; }
  approachX() { return this.x; }
  head() { return { x: this.x, y: this.y - 6 }; }
  draw(ctx, g, ox, oy) {
    const b = SPR.butterflies[this.col];
    drawSprite(ctx, Math.floor(this.t * 8) % 2 ? b.a : b.b, this.x - ox, this.y - oy, this.dir);
  }
}

// ======================= PEOPLE =======================
const GIFT_LINES = {
  love: ['Oh! I LOVE these! You\'re the best!', 'No way — my favorite! Thank you!', 'This is my absolute favorite. Thank you!'],
  like: ['That\'s so kind of you, thanks!', 'Oh, how thoughtful!', 'Thanks, friend!'],
  neutral: ['Oh! Thank you.', 'Well, isn\'t that nice.', 'Thanks!'],
};

export class NPC extends Entity {
  constructor(o) {
    super({ reach: 18, w: 14, h: 28, kind: 'person', dir: -1, greeted: false, loves: [], likes: [], gifts: {}, ...o });
    this.frames = buildPerson(o.look, { style: o.style, extras: o.extras });
    this.t = Math.random() * 5;
    this.lastChat = -999;
    this.recent = [];
    this.lost = null;        // item id this person has lost
    this.wantsPhoto = false;
  }
  get hearts() { return this.g ? this.g.journal.hearts(this.id) : 0; }
  update(dt, g) {
    this.g = g;
    this.t += dt;
    if (!this.greeted && Math.abs(g.player.x - this.x) < 60) {
      this.greeted = true;
      this.dir = g.player.x < this.x ? -1 : 1;
      const hello = this.hearts >= 3 ? `${pick(['Hey, friend!', 'Oh, it\'s you two!', 'Hi again!'])}` : this.greet;
      g.ui.say('npc' + this.id, () => this.head(), hello, { dur: 2.6 });
      setTimeout(() => g.baby.react('person'), 1200);
    }
    if (Math.abs(g.player.x - this.x) > 300) this.greeted = false;
  }
  head() { return { x: this.x, y: this.y - 30 }; }
  portrait() {
    if (!this._p) {
      const src = this.frames.idle.r;
      const c = document.createElement('canvas');
      c.width = src.width; c.height = 17;
      c.getContext('2d').drawImage(src, 0, 0);
      this._p = toDataURL(c, 4);
    }
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
    this.talk(g, pages, () => {
      if (g.now - this.lastChat > 60) { this.lastChat = g.now; this.gainHearts(g, 0.5); }
    });
  }
  lostLine() {
    const it = ITEMS[this.lost].name.toLowerCase();
    return pick([`Have you seen my ${it}? I must have dropped it somewhere on the trail…`, `I can't find my ${it} anywhere! If you spot it, I'd be so grateful.`]);
  }
  gainHearts(g, n) {
    const { before, after } = g.journal.addHearts(this.id, n);
    if (after > before) {
      g.fx.emote(() => this.head(), 'heart');
      g.fx.hearts(this.x, this.y - 30, Math.ceil(n * 3));
    }
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
  /** Receive an item from the bag (slot index). */
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
      } else {
        g.bag.add(id, 1, s.owner);
        this.talk(g, ['Hmm, that\'s not mine. Somebody else must be looking for it!']);
      }
      return;
    }
    if (def.cat === 'litter') {
      if (this.id === 'ranger') {
        g.journal.inc('litter');
        this.talk(g, ['You packed out litter? Thank you! I\'ll toss it for you. That\'s what Leave No Trace is all about.']);
        this.gainHearts(g, 0.5);
      } else {
        this.talk(g, ['Uh… thanks? I think that goes in a trash can, friend. 😅']);
        g.bag.add(id);
      }
      return;
    }
    if (def.cat === 'nature') {
      g.journal.inc('leftBe');
      this.talk(g, [this.id === 'ranger'
        ? 'Beautiful find! But nature belongs right here in the park. Let\'s set it back down so everyone can enjoy it.'
        : 'Ooh, pretty! We should probably leave it out here where it belongs, though.']);
      g.events.dropNature(this.x + 6, id, true);
      if (this.id === 'ranger') this.gainHearts(g, 0.5);
      return;
    }
    if (def.cat === 'care' || def.cat === 'toy' || def.cat === 'keepsake') {
      g.bag.add(id, 1, s.owner);
      this.talk(g, ['Aww, I think the little one needs that more than I do!']);
      return;
    }
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
    if (this.wantsPhoto) acts.push({ label: '📸 Take their photo', primary: true, run: () => this.takePhoto(g) });
    if (this.lost && g.bag.find(s => s.owner === this.id) >= 0) {
      acts.push({ label: `🤝 Return ${ITEMS[this.lost].name.toLowerCase()}`, primary: true, run: () => this.receive(g, g.bag.find(s => s.owner === this.id)) });
    }
    acts.push({ label: '💬 Chat', run: () => this.chat(g) });
    acts.push({ label: '🎁 Give…', run: () => g.ui.openBag({ mode: 'give', target: this }) });
    for (const t of this.topics || []) acts.push({ label: t.label, run: () => this.talk(g, t.pages) });
    if (this.quiz) acts.push({ label: '🎓 Quiz me!', run: () => this.quiz(g) });
    acts.push({ label: '👋 Wave', run: () => { g.ui.say('npc' + this.id, () => this.head(), pick(['*waves back*', 'Hi, little one!', 'Happy trails!'])); g.baby.react('person'); } });
    return acts;
  }
  draw(ctx, g, ox, oy) {
    const f = this.frames;
    const bob = Math.sin(this.t * 2) > 0.7 ? -1 : 0;
    drawSprite(ctx, this.seated ? f.sit : f.idle, this.x - ox, this.y - oy + bob + (this.seated ? 3 : 0), this.dir);
  }
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
  draw(ctx, g, ox, oy) {
    const f = this.frames;
    drawSprite(ctx, this.paused > 0 ? f.idle : (Math.floor(this.t * 11) % 2 ? f.walkA : f.walkB), this.x - ox, this.y - oy, this.dir);
  }
}

export class Family extends NPC {
  constructor(o) { super(o); this.kid = buildKid(o.kidLook); this.kidHop = 0; }
  update(dt, g) { super.update(dt, g); this.kidHop = Math.max(0, Math.sin(this.t * 3)) * 2; }
  box() { return { x: this.x - 16, y: this.y - 28, w: 32, h: 28 }; }
  draw(ctx, g, ox, oy) {
    super.draw(ctx, g, ox, oy);
    const kx = this.x + this.dir * 12;
    drawSprite(ctx, this.kid.idle, kx - ox, groundY(kx) - oy - Math.round(this.kidHop), this.dir);
  }
}

// Randomly generated hikers who wander the trail
const NAMES = ['Maya', 'Theo', 'June', 'Sam', 'Priya', 'Leo', 'Ines', 'Kai', 'Eli', 'Nora', 'Diego', 'Hana', 'Omar', 'Lucy', 'Ben', 'Aiyana', 'Jules', 'Mei', 'Tomas', 'Zara', 'Felix', 'Ada', 'Ravi', 'Gus'];
const PERSONAS = {
  birder: { greet: 'Shh — did you hear that jay?', lines: ['I\'ve spotted twelve kinds of birds today! The Steller\'s jays are showing off.', 'Ravens mate for life, you know. I saw a pair doing barrel rolls earlier!', 'Keep your ears open near the pines — the jays are loud!'], loves: ['granola'], likes: ['water'] },
  geologist: { greet: 'Isn\'t this rock just GORGEOUS?', lines: ['Look at those layers! Each band is a different chapter of an ancient lake.', 'Frost wedging! On around 200 nights a year, water freezes in the cracks and splits the rock.', 'The pale caps are tougher limestone — they protect the softer rock underneath.'], loves: ['cookie'], likes: ['water'] },
  tired: { greet: '*huff* …hi… *huff*', lines: ['Nobody warned me the hike back UP was the hard part.', 'Is it rude to nap on a bench? Asking for a friend. The friend is me.', 'Your baby has the right idea, getting carried.'], loves: ['water', 'granola'], likes: ['cookie'] },
  newlywed: { greet: 'We just got married! Hi!', lines: ['We got engaged at Sunset Point last year, so we had to come back!', 'Our honeymoon plan: hoodoos by day, stars by night.', 'Your little one is SO cute. Maybe someday…!'], loves: ['cookie'], likes: ['granola'] },
  grandparent: { greet: 'Oh, look at that little face!', lines: ['I carried my kids down this very trail, many years ago.', 'Enjoy every minute — they grow up in the blink of an eye.', 'Did you know you can see about 7,500 stars here on a dark night? Stay up and look!'], loves: ['cookie'], likes: ['water'] },
  scout: { greet: 'Hi! I\'m working on my hiking badge!', lines: ['I found three pieces of litter already! We pack it out!', 'Do you know what a hoodoo is? It\'s a rock spire! I learned that today.', 'My troop leader says to leave rocks and feathers where we find them.'], loves: ['granola', 'cookie'], likes: ['water'] },
  photographer: { greet: 'The light is perfect today!', lines: ['Golden hour is magic here — everything glows orange.', 'Want a tip? Shoot from low down so the hoodoos tower over everything.', 'I\'ve filled two memory cards already. Oops.'], loves: ['water'], likes: ['granola'] },
};

export class Wanderer extends NPC {
  constructor(o) {
    const persona = pick(Object.keys(PERSONAS));
    const P = PERSONAS[persona];
    const name = o.name || pick(NAMES);
    const look = {
      skin: pick(PEOPLE_OPTIONS.skin), hair: pick(PEOPLE_OPTIONS.hair), shirt: pick(PEOPLE_OPTIONS.shirt),
      pants: pick(['#55667a', '#5a4a3a', '#3f5a3e', '#6a5a8a', '#2b2b33']), pack: pick(['#a0522d', '#3f6aa0', '#5f9f6a', '#d4504f']), hat: pick(['#3f6aa0', '#d4504f', '#5f9f6a']),
    };
    const style = pick(['short', 'long', 'bun', 'curly', 'cap', 'bald']);
    super({
      ...o, id: 'hiker:' + name, name, persona, greet: P.greet, look, style, extras: ['pack', ...(persona === 'grandparent' ? ['glasses'] : []), ...(persona === 'photographer' ? ['camera'] : [])],
      lines: { 0: P.lines }, loves: P.loves, likes: P.likes, w: 14, h: 28,
    });
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
    if (this.x < 20 || this.x > 4880) this.gone = true;
  }
  actions(g) { this.talking = 15; g.journal.meetHiker(this.name); return super.actions(g); }
  approachX(px) { this.talking = 15; return super.approachX(px); }
  draw(ctx, g, ox, oy) {
    const f = this.frames;
    const walking = !(this.talking > 0) && this.pauseT <= 0;
    const spr = walking ? (Math.floor(this.t * 6) % 2 ? f.walkA : f.walkB) : f.idle;
    drawSprite(ctx, spr, this.x - ox, this.y - oy, this.dir);
    if (this.lost) {
      // a little '?' hint above someone who lost something
      if (Math.floor(g.now * 2) % 4 === 0) ctx.drawImage(SPR.emote['?'].r, Math.round(this.x - ox - 6), Math.round(this.y - oy - 44));
    }
  }
}

// ======================= PICKUPS & FACILITIES =======================
export class Pickup extends Entity {
  constructor(o) { super({ w: 12, h: 12, kind: 'pickup', reach: 6, ...o }); this.name = ITEMS[this.item].name; this.t = Math.random() * 5; }
  approachX(px) { return px < this.x ? this.x - 6 : this.x + 6; }
  actions(g) { return null; } // picked up directly
  onArrive(g) { g.pickUp(this); }
  update(dt) { this.t += dt; }
  draw(ctx, g, ox, oy) {
    const bob = Math.round(Math.sin(this.t * 3) * 1.2);
    const x = this.x - ox, y = this.y - oy;
    ctx.fillStyle = 'rgba(58,36,32,0.35)'; ctx.fillRect(Math.round(x - 4), Math.round(y - 1), 8, 1);
    drawSprite(ctx, SPR.items[this.item], x, y - 2 + bob, 1);
    if (Math.floor(this.t * 2.5) % 3 === 0) ctx.drawImage(SPR.sparkle.r, Math.round(x + 3), Math.round(y - 13 + bob));
  }
}

let cabinCanvas = null;
function cabin() {
  if (cabinCanvas) return cabinCanvas;
  const c = document.createElement('canvas'); c.width = 46; c.height = 36;
  const g = c.getContext('2d');
  // roof
  for (let y = 0; y < 12; y++) {
    const half = 8 + y * 1.4;
    g.fillStyle = y % 3 === 0 ? '#5a3424' : '#7a4a32';
    g.fillRect(Math.round(23 - half), 2 + y, Math.round(half * 2), 1);
  }
  g.fillStyle = '#9a6040'; g.fillRect(6, 13, 34, 1);
  // log walls
  for (let y = 14; y < 35; y++) {
    g.fillStyle = (y - 14) % 4 === 0 ? '#8a5a32' : (y - 14) % 4 === 3 ? '#a8703e' : '#c08550';
    g.fillRect(6, y, 34, 1);
  }
  // door + window + sign
  g.fillStyle = '#5a3424'; g.fillRect(25, 21, 9, 14);
  g.fillStyle = '#7a4a32'; g.fillRect(26, 22, 7, 13);
  g.fillStyle = '#e0b040'; g.fillRect(31, 28, 1, 1);
  g.fillStyle = '#5a3424'; g.fillRect(10, 19, 10, 8);
  g.fillStyle = '#9ad0f8'; g.fillRect(11, 20, 8, 6);
  g.fillStyle = '#d8eef8'; g.fillRect(11, 20, 3, 2);
  g.fillStyle = '#5a3424'; g.fillRect(14, 20, 1, 6); g.fillRect(11, 22, 8, 1);
  g.fillStyle = '#f2dcb5'; g.fillRect(17, 6, 12, 5);
  g.fillStyle = '#3f6aa0'; g.fillRect(18, 7, 2, 3); g.fillRect(21, 7, 2, 3); g.fillRect(25, 7, 3, 3);
  cabinCanvas = outlineCanvas(c);
  return cabinCanvas;
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
  draw(ctx, g, ox, oy) { ctx.drawImage(cabin(), Math.round(this.x - ox - 23), Math.round(this.y - oy - 35)); }
}

export class Fountain extends Entity {
  constructor(o) { super({ w: 10, h: 12, kind: 'facility', name: 'Water fountain', reach: 10, ...o }); }
  actions(g) {
    return [{ label: '💧 Refill bottles', primary: true, run: () => {
      const a = g.bag.refill('bottle', 4), b = g.bag.refill('water', 3);
      g.audio.sip();
      g.ui.notify(a || b ? `💧 Refilled: ${a ? a + ' milk bottle' + (a > 1 ? 's' : '') : ''}${a && b ? ', ' : ''}${b ? b + ' water' : ''}` : 'Your bottles are already full.');
    } }, { label: '🥤 Take a sip', run: () => { g.ui.say('parent', () => g.parentHead(), 'Refreshing!'); g.audio.sip(); } }];
  }
  draw(ctx, g, ox, oy) { drawSprite(ctx, SPR.fountain, this.x - ox, this.y - oy, 1); }
}

export class TrashCan extends Entity {
  constructor(o) { super({ w: 12, h: 11, kind: 'facility', name: 'Trash & recycling', reach: 12, ...o }); }
  actions(g) {
    const n = LITTER.reduce((s, id) => s + g.bag.count(id), 0);
    return [{ label: n ? `🗑️ Toss litter (${n})` : '🗑️ Nothing to toss', primary: n > 0, run: () => {
      if (!n) { g.ui.notify('Pick up litter on the trail and pack it out here!'); return; }
      for (const id of LITTER) g.bag.remove(id, g.bag.count(id));
      g.journal.inc('litter', n);
      g.audio.chime();
      g.fx.sparkles(this.x, this.y - 10, 6);
      g.ui.notify(`🌲 Packed out ${n} piece${n > 1 ? 's' : ''} of litter — thank you for keeping Bryce beautiful!`);
      if (g.journal.s.litter >= 1) g.journal.first('watched you pack out litter');
    } }];
  }
  draw(ctx, g, ox, oy) { drawSprite(ctx, SPR.trashcan, this.x - ox, this.y - oy, 1); }
}

// ======================= SCENERY =======================
export class Sign extends Entity {
  constructor(o) { super({ w: 16, h: 16, kind: 'sign', name: 'Trail sign', ...o }); }
  actions(g) {
    const acts = [{ label: '📖 Read', run: () => g.ui.dialogue(this.title, this.text, null, toDataURL(SPR.sign.r, 3)) }];
    if (this.view) acts.push({ label: '🌄 Take in the view', run: () => { g.ui.say('parent', () => g.parentHead(), pick(['wow…', 'Look at that, little one.', 'Breathtaking.'])); setTimeout(() => g.baby.react('view'), 900); g.audio.chime(); } });
    if (this.echo) acts.push({ label: '📣 Call "hello!"', run: () => {
      g.ui.say('parent', () => g.parentHead(), 'HELLOOO!', { dur: 1.2 });
      [0.6, 1.2, 1.8].forEach((d, i) => setTimeout(() => g.ui.say('echo' + i, () => ({ x: this.x + 30 + i * 25, y: this.y - 60 - i * 6 }), ['hellooo…', 'helloo…', 'hello…'][i], { dur: 1.2, cls: 'label' }), d * 1000));
      setTimeout(() => g.baby.happy('*giggles at the echo*', 0.05), 2200);
    } });
    return acts;
  }
  draw(ctx, g, ox, oy) { drawSprite(ctx, SPR.sign, this.x - ox, this.y - oy, 1); }
}

export class Bench extends Entity {
  constructor(o) { super({ w: 18, h: 10, kind: 'bench', name: 'Bench', reach: 0, ...o }); }
  approachX() { return this.x; }
  actions(g) {
    if (this.occupied) return [{ label: '🙂 Say hello', run: () => g.ui.say('parent', () => g.parentHead(), 'Lovely spot!') }];
    return [{ label: '🪑 Sit & rest', run: () => g.sitOn(this) }];
  }
  draw(ctx, g, ox, oy) { drawSprite(ctx, SPR.bench, this.x - ox, this.y - oy, 1); }
}

export class Flowers extends Entity {
  constructor(o) { super({ w: 12, h: 9, kind: 'flower', reach: 12, ...o }); }
  actions(g) {
    return [
      { label: '👃 Smell', run: () => {
        g.ui.say('parent', () => g.parentHead(), 'mmm…');
        if (g.baby.carrier === 'front' && !g.baby.napping && Math.random() < 0.6) {
          setTimeout(() => { g.baby.say('ah… ah… CHOO!'); g.audio.sneeze(); g.baby.giggleT = 1.5; g.journal.first('sneezed at a wildflower'); }, 1100);
        }
      } },
      { label: '👶 Show baby', run: () => g.baby.react('flower') },
      { label: 'ℹ️ What is it?', run: () => g.ui.dialogue(this.name, [...this.facts, 'Leave the flowers for the next hikers (and the bees) to enjoy! 🐝'], null, toDataURL(SPR.flowers[this.variety].r, 4)) },
    ];
  }
  draw(ctx, g, ox, oy) { drawSprite(ctx, SPR.flowers[this.variety], this.x - ox, this.y - oy, 1); }
}

/** Big landmarks (hoodoos, trees) that are part of the baked scenery; just a hitbox + info. */
export class Landmark extends Entity {
  constructor(o) { super({ kind: 'landmark', ...o }); }
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
