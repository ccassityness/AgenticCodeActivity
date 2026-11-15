// The "director": sprinkles every hike with randomized happenings, and runs the weather.
import { groundY } from './world.js';
import { ITEMS, LITTER } from './items.js';
import { Pickup, Wanderer, Squirrel, Lizard, Butterfly } from './entities.js';

const pick = a => a[(Math.random() * a.length) | 0];
const rand = (a, b) => a + Math.random() * (b - a);

export class Director {
  constructor(game) {
    this.g = game;
    this.t = 16;
    this.cooldown = {};
    this.storm = { level: 0, target: 0, t: 0, done: false, rainbow: 0, thunderT: 0 };
  }
  get W() { return this.g.area.width; }
  clampX(x) { return Math.max(30, Math.min(this.W - 30, x)); }
  onRim(x) { return this.g.area.isRim(x); }

  /** Randomized extras for the main trail (called once per hike). */
  populateTrail(list) {
    const add = e => list.push(e);
    for (let i = 0; i < 7; i++) add(new Pickup({ x: rand(150, 4750), item: pick(LITTER) }));
    for (let i = 0; i < 6; i++) {
      const x = rand(120, 4780);
      add(new Pickup({ x, item: this.g.areas.trail.isRim(x) ? pick(['pinecone', 'pinecone', 'bluefeather', 'whitestone']) : pick(['stone', 'whitestone', 'blackfeather', 'pinecone']) }));
    }
    for (const [a, b] of [[560, 760], [2280, 2460], [4080, 4300], [1400, 1600]]) if (Math.random() < 0.8) add(new Squirrel({ x: rand(a, b) }));
    for (let i = 0; i < 2; i++) add(new Lizard({ x: rand(1550, 3000) }));
    for (const fx of [600, 1210, 2310, 4660]) for (let i = 0; i < 1 + (Math.random() < 0.5 ? 1 : 0); i++) add(new Butterfly({ x: fx + rand(-20, 20) }));
    for (let i = 0; i < 2; i++) add(new Wanderer({ x: rand(300, 4500), dir: pick([1, -1]) }));
  }

  spawn(e) { this.g.entities.push(e); return e; }
  ahead(min, max) { const p = this.g.player; return this.clampX(p.x + p.dir * rand(min, max)); }

  dropNature(x, id, quiet = false) {
    this.spawn(new Pickup({ x: this.clampX(x + rand(-10, 10)), item: id }));
    if (quiet) this.g.fx.sparkles(x, groundY(x) - 4, 3);
  }

  babyThrow(id) {
    const g = this.g, b = g.baby;
    if (b.napping || b.need) return false;
    if (id === 'pacifier' && !b.wearing.pacifier) return false;
    if (id === 'sock' && !b.wearing.socks) return false;
    if (id === 'rattle') { if (!g.bag.has('rattle')) return false; g.bag.remove('rattle'); }
    if (id === 'pacifier') b.wearing.pacifier = false;
    if (id === 'sock') b.wearing.socks = false;
    const x = this.clampX(g.player.x - g.player.dir * rand(18, 34));
    this.spawn(new Pickup({ x, item: id, babyItem: true }));
    b.say(pick(['*YEET*', '*flings it*', 'uh-oh!', '*drops it… on purpose*']));
    g.audio.pop();
    setTimeout(() => b.setNeed('lost', { item: id }), 1200);
    g.journal.first(`threw their ${ITEMS[id].name.toLowerCase()} off the carrier`);
    return true;
  }

  onJump() {
    const b = this.g.baby;
    if (b.napping) { if (Math.random() < 0.3) setTimeout(() => b.say('*stirs…*'), 300); return; }
    if (Math.random() < 0.55) {
      setTimeout(() => {
        b.say(pick(['wheee!', 'WHEEE!', '*squeals*', 'again! again!', 'hehehe!']));
        b.giggleT = 1.2; this.g.audio.giggle();
        if (b.need?.id === 'bored') b.meetNeed('bored', '*thrilled*');
        else { const j = this.g.journal; j.s.bond = Math.min(5, (j.s.bond || 0) + 0.02); }
        this.g.journal.first('shrieked "wheee!" on a big jump');
      }, 150);
    }
  }

  // ----- weather -----
  startStorm() {
    const s = this.storm;
    if (s.done) return;
    s.done = true; s.target = 1; s.t = 45; s.thunderT = 4;
    this.g.ui.notify('⛈️ Clouds are rolling in — find shelter! (Wall Street, the seep, or a cabin)', 5);
    this.g.ui.toast('Thunderstorm!', 'summer storms build fast over the plateau');
  }
  sheltered() {
    const g = this.g;
    if (g.area.shelter) return true;
    if (g.zone?.shelter) return true;
    return g.entities.some(e => e.name === 'Restroom & changing station' && Math.abs(e.x - g.player.x) < 26);
  }
  weather(dt) {
    const s = this.storm, g = this.g;
    s.level += (s.target - s.level) * Math.min(1, dt * 0.5);
    if (s.target > 0) {
      s.t -= dt;
      s.thunderT -= dt;
      if (s.thunderT <= 0) {
        s.thunderT = rand(6, 12);
        g.flashScreen(0.6);
        setTimeout(() => g.audio.thunder(), 500);
        if (!this.sheltered() && !g.baby.napping && (!g.baby.need || g.baby.need.id !== 'scared')) g.baby.setNeed('scared');
      }
      if (this.sheltered() && g.baby.need?.id === 'scared') g.baby.meetNeed('scared', '*feels safe and snug*');
      if (s.t <= 0) {
        s.target = 0; s.rainbow = 40;
        g.ui.toast('🌈 A rainbow!', 'the storm has passed');
        g.journal.set('rainbow', true);
        g.journal.first('saw their first rainbow');
        if (g.baby.need?.id === 'scared') g.baby.meetNeed('scared', '*ooh, colors!*');
      }
    }
    if (s.rainbow > 0) s.rainbow -= dt;
  }

  // ----- random events -----
  events() {
    const g = this.g, p = g.player, b = g.baby;
    const nearPeople = g.entities.filter(e => e.kind === 'person' && Math.abs(e.x - p.x) < 140 && !e.wantsPhoto && !e.lost);
    const onTrail = g.area.id === 'trail';
    return [
      { id: 'photo', w: nearPeople.length ? 3 : 0, run: () => {
        const n = pick(nearPeople);
        n.wantsPhoto = true;
        g.fx.emote(() => n.head(), '!', 3);
        g.ui.say('npc' + n.id, () => n.head(), pick(['Excuse me! Could you take our photo?', 'Hey! Would you snap a picture of me?']), { dur: 3.5 });
        setTimeout(() => { n.wantsPhoto = false; }, 60000);
      } },
      { id: 'gust', w: b.wearing.hat && !this.sheltered() ? 2 : 0, run: () => {
        b.wearing.hat = false;
        this.spawn(new Pickup({ x: this.ahead(40, 90), item: 'sunhat', babyItem: true }));
        g.ui.notify('💨 Whoosh! A gust blew the sun hat down the trail!');
        g.audio.huff(); b.say('*gasp!*');
      } },
      { id: 'throw', w: !b.napping && !b.need ? 3 : 0, run: () => this.babyThrow(pick(['pacifier', 'sock', 'rattle'])) },
      { id: 'litter', w: onTrail ? 2 : 0, run: () => this.spawn(new Pickup({ x: this.ahead(60, 180), item: pick(LITTER) })) },
      { id: 'nature', w: 2, run: () => this.dropNature(this.ahead(50, 160), this.onRim(p.x) ? pick(['pinecone', 'bluefeather', 'whitestone']) : pick(['stone', 'whitestone', 'blackfeather'])) },
      { id: 'butterfly', w: g.sky.night ? 0 : 2, run: () => {
        for (let i = 0; i < 2; i++) { const bf = this.spawn(new Butterfly({ x: p.x + rand(-20, 30) })); bf.life = 35; bf.follow = true; }
        setTimeout(() => b.react('animal'), 800);
        g.ui.notify('🦋 A pair of butterflies flutters around you!');
      } },
      { id: 'squirrel', w: g.sky.night ? 0 : 1.5, run: () => this.spawn(new Squirrel({ x: this.ahead(40, 90) })) },
      { id: 'lost', w: onTrail ? 2.5 : 0, run: () => this.loseSomething() },
      { id: 'raven', w: onTrail && !g.sky.night && (g.bag.has('granola') || g.bag.has('cookie')) ? 1.5 : 0, run: () => this.ravenThief() },
      { id: 'hiker', w: onTrail && g.entities.filter(e => e instanceof Wanderer).length < 3 ? 2 : 0, run: () => this.spawnHiker() },
      { id: 'storm', w: !this.storm.done && g.time > 0.26 && g.time < 0.56 && g.hikeTime > 120 ? 2.5 : 0, run: () => this.startStorm() },
    ];
  }

  loseSomething() {
    const g = this.g;
    const owners = g.entities.filter(e => e.kind === 'person' && e.lostItem && !e.lost && !g.entities.some(x => x.owner === e.id));
    const wander = g.entities.filter(e => e instanceof Wanderer && !e.lost);
    const n = pick([...owners, ...wander]);
    if (!n) return;
    const item = n.lostItem || pick(['mitten', 'sunglasses', 'map']);
    n.lost = item;
    const x = this.clampX(n.x + (g.player.x > n.x ? 1 : -1) * rand(120, 420));
    this.spawn(new Pickup({ x, item, owner: n.id }));
    if (Math.abs(n.x - g.player.x) < 200) {
      g.fx.emote(() => n.head(), '?', 3);
      g.ui.say('npc' + n.id, () => n.head(), pick(['Oh no, where did it go?', 'Hmm… I had it a minute ago…']), { dur: 3 });
    }
  }

  ravenThief() {
    const g = this.g;
    const snack = g.bag.has('granola') ? 'granola' : 'cookie';
    g.audio.raven();
    g.ui.choice('Common raven', 'A raven swoops down and lands right next to you, eyeing your bag… it can smell your snack!', [
      { label: '👋 Shoo it gently', run: () => { g.ui.notify('The raven hops off with an offended "kraa!" 🐦‍⬛'); g.journal.see('raven'); g.baby.react('animal'); } },
      { label: '🎒 Zip the bag tight', run: () => { g.ui.notify('Smart! Ravens can open zippers, but not today.'); g.journal.see('raven'); } },
      { label: '🤷 Ignore it', run: () => {
        g.bag.remove(snack);
        g.ui.notify(`The raven made off with your ${ITEMS[snack].name.toLowerCase()}! Clever bird… 🐦‍⬛`);
        g.journal.see('raven');
        g.baby.say('*waves bye-bye to the raven*');
      } },
    ], g.entities.find(e => e.jid === 'raven')?.portrait());
  }

  spawnHiker() {
    const g = this.g;
    const fromLeft = Math.random() < 0.5;
    const x = this.clampX(g.player.x + (fromLeft ? -1 : 1) * (g.W * 0.6 + 20));
    this.spawn(new Wanderer({ x, dir: fromLeft ? 1 : -1 }));
  }

  update(dt) {
    const g = this.g;
    if (!g.started) return;
    this.weather(dt);
    g.entities = g.entities.filter(e => !(e.gone) && !(e.life !== undefined && e.life <= 0));
    this.t -= dt;
    if (this.t > 0 || g.ui.busy) return;
    this.t = rand(16, 30);
    const evs = this.events().filter(e => e.w > 0 && !(this.cooldown[e.id] > g.now));
    const total = evs.reduce((s, e) => s + e.w, 0);
    let r = Math.random() * total;
    for (const e of evs) {
      r -= e.w;
      if (r <= 0) { this.cooldown[e.id] = g.now + 45; e.run(); break; }
    }
  }
}
