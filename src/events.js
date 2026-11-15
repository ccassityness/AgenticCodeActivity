// The "director": sprinkles the trail with randomized happenings so every hike is a bit different.
import { groundY, WORLD_W } from './world.js';
import { ITEMS, LITTER, NATURE } from './items.js';
import { Pickup, Wanderer, Squirrel, Lizard, Butterfly } from './entities.js';

const pick = a => a[(Math.random() * a.length) | 0];
const rand = (a, b) => a + Math.random() * (b - a);
const clampX = x => Math.max(30, Math.min(WORLD_W - 30, x));
const onRim = x => x < 790 || x > 3720;

export class Director {
  constructor(game) {
    this.g = game;
    this.t = 18;
    this.hikerT = 30;
    this.cooldown = {};
  }

  // ----- initial randomized population -----
  populate() {
    const g = this.g;
    for (let i = 0; i < 7; i++) this.spawn(new Pickup({ x: rand(150, 4750), item: pick(LITTER) }));
    for (let i = 0; i < 6; i++) {
      const x = rand(120, 4780);
      this.spawn(new Pickup({ x, item: onRim(x) ? pick(['pinecone', 'pinecone', 'bluefeather', 'whitestone']) : pick(['stone', 'whitestone', 'blackfeather', 'pinecone']) }));
    }
    for (const [a, b] of [[560, 760], [2280, 2460], [4080, 4300], [1400, 1600]]) if (Math.random() < 0.8) this.spawn(new Squirrel({ x: rand(a, b) }));
    for (let i = 0; i < 2; i++) this.spawn(new Lizard({ x: rand(1550, 3000) }));
    for (const fx of [600, 1210, 2310, 4660]) for (let i = 0; i < 1 + (Math.random() < 0.5 ? 1 : 0); i++) this.spawn(new Butterfly({ x: fx + rand(-20, 20) }));
    for (let i = 0; i < 2; i++) this.spawn(new Wanderer({ x: rand(300, 4500), dir: pick([1, -1]) }));
  }

  spawn(e) { this.g.entities.push(e); return e; }

  ahead(min, max) {
    const p = this.g.player;
    return clampX(p.x + p.dir * rand(min, max));
  }

  dropNature(x, id, quiet = false) {
    this.spawn(new Pickup({ x: clampX(x + rand(-10, 10)), item: id }));
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
    const x = clampX(g.player.x - g.player.dir * rand(18, 34));
    this.spawn(new Pickup({ x, item: id, babyItem: true }));
    b.say(pick(['*YEET*', '*flings it*', 'uh-oh!', '*drops it… on purpose*']));
    g.audio.pop();
    setTimeout(() => b.setNeed('lost', { item: id }), 1200);
    g.journal.first(`threw their ${ITEMS[id].name.toLowerCase()} off the carrier`);
    return true;
  }

  // ----- the events -----
  events() {
    const g = this.g, p = g.player, b = g.baby;
    const nearPeople = g.entities.filter(e => e.kind === 'person' && Math.abs(e.x - p.x) < 140 && !e.wantsPhoto && !e.lost);
    return [
      { id: 'photo', w: nearPeople.length ? 3 : 0, run: () => {
        const n = pick(nearPeople);
        n.wantsPhoto = true;
        g.fx.emote(() => n.head(), '!', 3);
        g.ui.say('npc' + n.id, () => n.head(), pick(['Excuse me! Could you take our photo?', 'Hey! Would you snap a picture of me?']), { dur: 3.5 });
        setTimeout(() => { n.wantsPhoto = false; }, 60000);
      } },
      { id: 'gust', w: b.wearing.hat && !(g.zone?.name === 'Wall Street') ? 2 : 0, run: () => {
        b.wearing.hat = false;
        this.spawn(new Pickup({ x: this.ahead(40, 90), item: 'sunhat', babyItem: true }));
        g.ui.notify('💨 Whoosh! A gust blew the sun hat down the trail!');
        g.audio.huff();
        b.say('*gasp!*');
      } },
      { id: 'throw', w: !b.napping && !b.need ? 3 : 0, run: () => this.babyThrow(pick(['pacifier', 'sock', 'rattle'])) },
      { id: 'litter', w: 2, run: () => this.spawn(new Pickup({ x: this.ahead(60, 180), item: pick(LITTER) })) },
      { id: 'nature', w: 2, run: () => this.dropNature(this.ahead(50, 160), onRim(p.x) ? pick(['pinecone', 'bluefeather', 'whitestone']) : pick(['stone', 'whitestone', 'blackfeather'])) },
      { id: 'butterfly', w: g.sky.night ? 0 : 2, run: () => {
        for (let i = 0; i < 2; i++) { const bf = this.spawn(new Butterfly({ x: p.x + rand(-20, 30) })); bf.life = 35; bf.follow = true; }
        setTimeout(() => b.react('animal'), 800);
        g.ui.notify('🦋 A pair of butterflies flutters around you!');
      } },
      { id: 'squirrel', w: g.sky.night ? 0 : 1.5, run: () => { this.spawn(new Squirrel({ x: this.ahead(40, 90) })); } },
      { id: 'lost', w: 2.5, run: () => this.loseSomething() },
      { id: 'raven', w: !g.sky.night && (g.bag.has('granola') || g.bag.has('cookie')) ? 1.5 : 0, run: () => this.ravenThief() },
      { id: 'hiker', w: g.entities.filter(e => e instanceof Wanderer).length < 3 ? 2 : 0, run: () => this.spawnHiker() },
    ];
  }

  loseSomething() {
    const g = this.g;
    const owners = g.entities.filter(e => e.kind === 'person' && e.lostItem && !e.lost && !g.entities.some(x => x.owner === e.id));
    const wander = g.entities.filter(e => e instanceof Wanderer && !e.lost);
    let n = pick([...owners, ...wander]);
    if (!n) return;
    const item = n.lostItem || pick(['mitten', 'sunglasses', 'map']);
    n.lost = item;
    // dropped somewhere a ways away, toward the player's direction of travel
    const x = clampX(n.x + (g.player.x > n.x ? 1 : -1) * rand(120, 420));
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
    const x = clampX(g.player.x + (fromLeft ? -1 : 1) * (g.W * 0.6 + 20));
    this.spawn(new Wanderer({ x, dir: fromLeft ? 1 : -1 }));
  }

  update(dt) {
    const g = this.g;
    if (!g.started) return;
    // clean up departed hikers and expired butterflies
    g.entities = g.entities.filter(e => !(e.gone) && !(e.life !== undefined && e.life <= 0));
    this.t -= dt;
    if (this.t > 0 || g.ui.busy) return;
    this.t = rand(18, 34);
    const evs = this.events().filter(e => e.w > 0 && !(this.cooldown[e.id] > g.now));
    const total = evs.reduce((s, e) => s + e.w, 0);
    let r = Math.random() * total;
    for (const e of evs) {
      r -= e.w;
      if (r <= 0) { this.cooldown[e.id] = g.now + 45; e.run(); break; }
    }
  }
}
