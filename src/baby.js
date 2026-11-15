// The baby: needs that show up as thought bubbles and slowly get louder until you
// help. Nothing ever fails — care for them and they light up (and you bond).
import { ITEMS } from './items.js';

const pick = a => a[(Math.random() * a.length) | 0];
const rand = (a, b) => a + Math.random() * (b - a);

const BABBLE = ['ba-ba!', 'goo!', 'ah-boo!', 'eee!', 'da!', 'bwah?', 'ooo', 'mm-mm', 'pfffbt', 'ga ga', 'hiii', 'aba-ba'];
const REACT = {
  animal: ['!!', 'da! da!', 'ooh!', '*points*', 'eee!', '*flaps arms*'],
  flower: ['ooh…', '*grabby hands*', 'pretty!', 'ah!'],
  view: ['wow…', 'ooooh', '*stares*', 'aah!'],
  person: ['*waves*', 'hi!', '*shy smile*', 'ba!', '*hides face*'],
  thing: ['ooh?', '*reaches*', 'da?', '*tries to eat it*'],
};

export const NEEDS = {
  hungry: { icon: '🍼', label: 'Hungry', hint: 'Give a bottle' },
  diaper: { icon: '🧷', label: 'Needs a change', hint: 'Change the diaper' },
  hot: { icon: '🥵', label: 'Too hot', hint: 'Sun hat or shade' },
  cold: { icon: '🥶', label: 'Chilly', hint: 'Wrap in the blanket' },
  sleepy: { icon: '😴', label: 'Sleepy', hint: 'Rock, sing, or rest on a bench' },
  bored: { icon: '🧸', label: 'Bored', hint: 'Play, give a toy, or show them something' },
  cuddle: { icon: '🤗', label: 'Wants cuddles', hint: 'Rock & cuddle' },
  teething: { icon: '🦷', label: 'Teething', hint: 'Give the cool teether' },
  lost: { icon: '🥺', label: 'Wants their thing back', hint: 'Pick it up and give it back' },
};

export class Baby {
  constructor(game, name) {
    this.g = game;
    this.name = name;
    this.need = null;          // { id, level 1..3, t, item? }
    this.timers = {
      hungry: rand(70, 110), diaper: rand(120, 180), bored: rand(45, 75), cuddle: rand(150, 240),
      teething: rand(200, 320), sleepy: rand(160, 240), hot: rand(30, 60), cold: rand(20, 40),
    };
    this.napT = 0;
    this.giggleT = 0;
    this.wowT = 0;
    this.babbleT = 6;
    this.cryT = 0;
    this.sitT = 0;
    this.feedT = 0;
    this.carrier = 'front';
    this.wearing = { hat: false, blanket: false, pacifier: true, socks: true };
    this.sinceFun = 0;
    this.napping = false;
  }

  get face() {
    if (this.napping) return 'napping';
    if (this.giggleT > 0) return 'giggle';
    if (this.wowT > 0) return 'wow';
    if (this.need) {
      if (this.need.level >= 3) return 'crying';
      if (this.need.id === 'sleepy') return 'sleepy';
      if (this.need.level >= 2) return 'fussy';
    }
    return 'content';
  }
  get status() {
    if (this.napping) return ['💤', 'Napping'];
    if (this.need) return [NEEDS[this.need.id].icon, NEEDS[this.need.id].label];
    if (this.giggleT > 0) return ['😆', 'Giggling'];
    return ['😊', 'Happy'];
  }

  say(text, dur = 2.2) {
    this.g.ui.say('baby', () => this.g.babyPos(), text, { dur });
  }

  // ----- needs -----
  setNeed(id, extra = {}) {
    if (this.napping && id !== 'lost') return;
    this.need = { id, level: 1, t: 0, ...extra };
    this.cryT = 2;
    this.g.ui.needChanged();
    this.g.audio.babble();
  }
  meetNeed(id, msg) {
    if (!this.need || this.need.id !== id) return false;
    const quick = this.need.level === 1;
    this.need = null;
    this.g.ui.needChanged();
    this.happy(msg || pick(['*happy sigh*', 'ahh!', '*beams*', 'goo ♥']), quick ? 0.35 : 0.2);
    this.g.journal.inc('needsMet');
    if (this.g.journal.s.needsMet === 1) this.g.journal.first('had their first need met on the trail');
    return true;
  }
  happy(msg, bond = 0.1) {
    this.giggleT = 1.6;
    if (msg) this.say(msg);
    this.g.audio.giggle();
    this.g.fx.hearts(this.g.babyPos().x, this.g.babyPos().y + 6, 4);
    const j = this.g.journal;
    j.s.bond = Math.min(5, (j.s.bond || 0) + bond);
    j.mark();
    this.sinceFun = 0;
  }

  update(dt) {
    const g = this.g;
    this.giggleT -= dt; this.wowT -= dt; this.feedT -= dt;
    this.sinceFun += dt;

    if (this.napping) {
      this.napT -= dt;
      this.babbleT -= dt;
      if (this.babbleT <= 0) { this.g.fx.emote(() => this.g.babyPos(), 'zz'); this.babbleT = 5; }
      if (this.napT <= 0 && !(g.sky.night && g.player.state === 'sit')) this.wake();
      return;
    }

    // timers tick toward new needs
    const shade = g.zone && g.zone.name === 'Wall Street';
    const hotOK = !g.sky.night && g.time > 0.18 && g.time < 0.58 && !shade && !this.wearing.hat;
    const coldOK = (g.sky.night || g.sky.dusk) && !this.wearing.blanket;
    for (const k of Object.keys(this.timers)) {
      let rate = 1;
      if (k === 'sleepy') rate = g.sky.night ? 4 : g.player.state === 'sit' ? 2.5 : 1;
      if (k === 'hot' && !hotOK) rate = 0;
      if (k === 'cold' && !coldOK) rate = 0;
      if (k === 'bored') rate = this.sinceFun > 30 ? 1.4 : 0.6;
      this.timers[k] -= dt * rate;
    }
    if (!this.need) {
      const due = Object.keys(this.timers).filter(k => this.timers[k] <= 0);
      if (due.length) {
        const id = pick(due);
        this.resetTimer(id);
        if (id === 'hot' && !hotOK) return;
        if (id === 'cold' && !coldOK) return;
        this.setNeed(id);
        return;
      }
    }

    if (this.need) {
      const n = this.need;
      n.t += dt;
      const lvl = n.t > 50 ? 3 : n.t > 24 ? 2 : 1;
      if (lvl !== n.level) { n.level = lvl; g.ui.needChanged(); }
      if (n.id === 'hot' && (shade || this.wearing.hat || g.sky.night)) { this.meetNeed('hot', '*cool sigh*'); return; }
      if (n.id === 'cold' && this.wearing.blanket) { this.meetNeed('cold', '*snug*'); return; }
      if (n.id === 'sleepy' && g.player.state === 'sit') { this.sitT += dt; if (this.sitT > 3) { this.meetNeed('sleepy', '*yaaawn*'); this.nap(); } }
      else this.sitT = 0;
      this.cryT -= dt;
      if (this.cryT <= 0) {
        if (n.level === 1) this.say(pick(this.needLines(n.id, 1)));
        else if (n.level === 2) { this.say(pick(this.needLines(n.id, 2))); g.audio.cry(); }
        else { this.say(pick(['WAAAH!', 'waaah! waah!', '*big tears*'])); g.audio.cry(); }
        this.cryT = n.level === 3 ? 5 : n.level === 2 ? 8 : 12;
      }
      return;
    }

    this.babbleT -= dt;
    if (this.babbleT <= 0) {
      this.say(pick(BABBLE));
      g.audio.babble();
      this.babbleT = rand(9, 18);
    }
  }
  resetTimer(id) {
    const base = { hungry: [110, 160], diaper: [150, 230], bored: [55, 90], cuddle: [160, 260], teething: [240, 380], sleepy: [200, 300], hot: [50, 90], cold: [40, 70] }[id];
    this.timers[id] = rand(base[0], base[1]);
  }
  needLines(id, lvl) {
    const L = {
      hungry: [['mm? 🍼', '*smacks lips*', '*chews fist*'], ['nnh… 🍼', 'nyum-nyum?', 'hnnng']],
      diaper: [['*squirms*', 'hmph', '*wiggle*'], ['nnngh!', '*very squirmy*', 'eh-eh-eh']],
      hot: [['*pink cheeks*', 'hhh…', '*fans arms*'], ['*sweaty*', 'nnh, hot']],
      cold: [['*shivers*', 'brr', '*cold hands*'], ['*teeth chatter*', 'nnh…']],
      sleepy: [['*yawn*', '*rubs eyes*', 'mmh…'], ['*cranky yawn*', 'nnnh…']],
      bored: [['bah.', '*sighs*', 'hm?', '*looks around*'], ['eh! eh!', 'BAH!', '*kicks*']],
      cuddle: [['*arms up*', 'up?', 'mm…'], ['*reaches for you*', 'nnnh!']],
      teething: [['*drools*', '*gnaws on strap*'], ['*sore gums*', 'owie…']],
      lost: [['*points back*', 'da! da!', 'uh-oh!'], ['*reaches back*', 'nnh! DA!']],
    };
    return (L[id] || L.bored)[Math.min(1, lvl - 1)];
  }

  // ----- actions -----
  /** Use an item from the bag on the baby. Returns true if it was used up. */
  useItem(id) {
    const g = this.g, bag = g.bag;
    if (this.napping && !['blanket', 'sunhat'].includes(id)) { this.say('*snores softly*'); return false; }
    switch (id) {
      case 'bottle':
        g.player.act('feed', 3); this.feedT = 3; g.audio.sip();
        if (this.need?.id === 'hungry') { bag.remove('bottle'); setTimeout(() => this.meetNeed('hungry', 'nom nom… *burp*'), 2200); this.say('nom nom nom…', 3); return true; }
        this.say('*pushes bottle away*'); return false;
      case 'diaper':
        if (this.need?.id === 'diaper') { bag.remove('diaper'); g.player.act('rock', 2); g.audio.pop(); this.meetNeed('diaper', '*fresh and happy*'); return true; }
        this.say('*still dry!*'); return false;
      case 'sunhat':
        bag.remove('sunhat'); this.wearing.hat = true; g.audio.pop();
        if (this.need?.id === 'hot') this.meetNeed('hot', '*shady and happy*'); else this.say('*looks very stylish*');
        return true;
      case 'blanket':
        bag.remove('blanket'); this.wearing.blanket = true; g.audio.pop();
        if (this.need?.id === 'cold') this.meetNeed('cold', '*snug as a bug*'); else this.say('*snuggles*');
        if (this.need?.id === 'sleepy') { this.meetNeed('sleepy'); this.nap(); }
        return true;
      case 'teether':
        g.audio.coo();
        if (this.need?.id === 'teething') { this.meetNeed('teething', '*happy gnawing*'); return false; }
        this.say('*gnaws happily*'); this.giggleT = 1; return false;
      case 'pacifier': case 'sock':
        bag.remove(id); g.audio.pop();
        if (id === 'pacifier') this.wearing.pacifier = true; else this.wearing.socks = true;
        if (this.need?.id === 'lost' && this.need.item === id) this.meetNeed('lost', id === 'pacifier' ? '*happy sucking*' : '*wiggles toes*');
        else this.say('*happy*');
        return true;
      default:
        if (ITEMS[id]?.cat === 'toy') return this.playWith(id);
        if (ITEMS[id]?.cat === 'nature' || ITEMS[id]?.cat === 'keepsake' || ITEMS[id]?.cat === 'lost') {
          this.wowT = 1.5; this.react('thing');
          if (this.need?.id === 'bored') this.meetNeed('bored', '*examines it seriously*');
          return false;
        }
        this.say('*confused baby noises*');
        return false;
    }
  }
  playWith(id) {
    const g = this.g;
    if (id === 'rattle' && this.need?.id === 'lost' && this.need.item === 'rattle') {
      g.bag.remove('rattle');
      this.meetNeed('lost', '*shake shake!*');
      g.bag.add('rattle');
      return false;
    }
    g.audio.giggle();
    const msg = id === 'rattle' ? '*shake shake shake!*' : id === 'carving' ? '*makes the deer hop*' : '*plays*';
    if (this.need?.id === 'bored') this.meetNeed('bored', msg); else this.happy(msg, 0.05);
    if (id === 'rattle' && Math.random() < 0.25) setTimeout(() => this.g.events.babyThrow('rattle'), 2500);
    return false;
  }
  play(kind) {
    const g = this.g;
    if (this.napping) { this.say('*snores softly*'); return; }
    if (this.need && ['hungry', 'diaper', 'teething', 'lost', 'hot', 'cold'].includes(this.need.id)) {
      this.say(pick(['*not now*', 'nnh…', '*fusses*']));
      return;
    }
    const lines = {
      peekaboo: ['*gasp* …hehehe!', 'AH! hehe!', '*squeals*'],
      tickle: ['hehehe!', 'ahaha!', 'eee-hee!', '*squeals*'],
      raspberry: ['*shrieks with joy*', 'pffbt! hehe', '*copies you* pfffbt'],
      bounce: ['wheee!', 'ba! ba! ba!', '*bouncy giggles*'],
    };
    if (kind === 'bounce') g.player.act('bounce', 2);
    if (kind === 'peekaboo') g.ui.say('parent', () => g.parentHead(), pick(['Where\'s the baby?…', 'Peek-a…BOO!']), { dur: 1.6 });
    if (kind === 'raspberry') g.ui.say('parent', () => g.parentHead(), 'pfffbbbt!', { dur: 1.4 });
    setTimeout(() => {
      if (this.need?.id === 'bored') this.meetNeed('bored', pick(lines[kind]));
      else if (this.need?.id === 'sleepy') this.say('*sleepy giggle*');
      else if (this.need?.id === 'cuddle') this.say('*wants a hug*');
      else this.happy(pick(lines[kind]), 0.05);
    }, kind === 'peekaboo' ? 900 : 300);
  }
  rock() {
    const g = this.g;
    g.player.act('rock', 3.2);
    g.audio.shush();
    g.ui.say('parent', () => g.parentHead(), pick(['shh, shh…', 'there, there…', 'I\'ve got you.']), { dur: 2 });
    setTimeout(() => {
      if (this.need?.id === 'cuddle') this.meetNeed('cuddle', '*melts into you*');
      else if (this.need?.id === 'sleepy') { this.meetNeed('sleepy', '*eyes droop…*'); this.nap(); }
      else if (this.need) this.say(pick(this.needLines(this.need.id, 1)));
      else if (g.sky.night && Math.random() < 0.6) this.nap();
      else { this.say('*coo*'); g.audio.coo(); }
    }, 2400);
  }
  sing() {
    const g = this.g;
    g.ui.say('parent', () => g.parentHead(), pick(['♪ hush little hiker… ♪', '♪ twinkle twinkle… ♪', '♪ hoodoo, hoodoo, who are you… ♪', '♪ you are my sunshine… ♪']), { dur: 3 });
    g.audio.lullaby();
    g.fx.notes(g.parentHead().x, g.parentHead().y);
    setTimeout(() => {
      if (this.need?.id === 'sleepy') { this.meetNeed('sleepy', '*yawns…*'); this.nap(); }
      else if (this.need?.id === 'bored' || this.need?.id === 'cuddle') this.meetNeed(this.need.id, 'ah-ah-ah ♪');
      else if (!this.need) this.happy(pick(['ah-ah-ah ♪', '*happy kicks*', 'ba-ba ♪']), 0.05);
      else this.say('nnh…');
    }, 2600);
  }
  nap() {
    if (this.napping) return;
    this.napping = true;
    this.napT = rand(30, 45);
    this.babbleT = 1;
    this.say('z z z…', 2.5);
    if (this.need && this.need.id !== 'lost') { this.need = null; this.g.ui.needChanged(); }
    this.g.journal.first('napped under the open sky');
    this.g.ui.needChanged();
  }
  wake() {
    this.napping = false;
    this.timers.sleepy = rand(200, 300);
    this.say(pick(['*big stretch*', 'ah!', '*blinks*']));
    this.g.audio.coo();
    this.g.ui.needChanged();
  }
  toggleCarrier() {
    this.carrier = this.carrier === 'front' ? 'back' : 'front';
    this.say(this.carrier === 'back' ? '*looks around* wheee' : '*snuggles in*');
    this.g.audio.pop();
  }
  takeOff(what) {
    const id = what === 'hat' ? 'sunhat' : 'blanket';
    if (!this.g.bag.canAdd(id)) { this.g.ui.notify('Your bag is full!'); return; }
    this.wearing[what] = false;
    this.g.bag.add(id);
    this.g.audio.pop();
  }
  /** React to something interesting. Returns false if napping. */
  react(kind) {
    if (this.napping) return false;
    this.say(pick(REACT[kind] || REACT.thing));
    this.wowT = 1.2;
    if (this.need?.id === 'bored' && (kind === 'animal' || kind === 'view' || kind === 'flower' || kind === 'person')) {
      setTimeout(() => this.meetNeed('bored', '*delighted*'), 900);
    } else if (!this.need) {
      this.giggleT = 1.2;
      this.sinceFun = 0;
      if (kind !== 'view') this.g.audio.giggle(); else this.g.audio.coo();
    }
    return true;
  }

  // ----- menus -----
  suggestion() {
    if (!this.need) return null;
    const g = this.g, n = this.need;
    const fix = {
      hungry: () => (g.bag.has('bottle') ? { label: '🍼 Give a bottle', run: () => this.useItem('bottle') } : { label: '🍼 Out of milk — find a fountain', run: () => g.ui.notify('Refill bottles at a water fountain by the trailheads.') }),
      diaper: () => (g.bag.has('diaper') ? { label: '🧷 Change diaper', run: () => this.useItem('diaper') } : { label: '🧷 Out of diapers — find a restroom', run: () => g.ui.notify('The restrooms at the trailheads have diapers.') }),
      hot: () => (this.wearing.hat ? null : g.bag.has('sunhat') ? { label: '👒 Put on sun hat', run: () => this.useItem('sunhat') } : { label: '👒 Find shade (or the hat!)', run: () => g.ui.notify('Wall Street is nice and shady.') }),
      cold: () => (g.bag.has('blanket') ? { label: '🧣 Wrap in blanket', run: () => this.useItem('blanket') } : null),
      sleepy: () => ({ label: '🤱 Rock to sleep', run: () => this.rock() }),
      bored: () => ({ label: '🙈 Peekaboo!', run: () => this.play('peekaboo') }),
      cuddle: () => ({ label: '🤗 Cuddle & rock', run: () => this.rock() }),
      teething: () => (g.bag.has('teether') ? { label: '🦷 Give teether', run: () => this.useItem('teether') } : null),
      lost: () => (g.bag.has(n.item) ? { label: `🥺 Give back the ${ITEMS[n.item].name.toLowerCase()}`, run: () => this.useItem(n.item) } : { label: `🔎 Find the ${ITEMS[n.item].name.toLowerCase()}`, run: () => g.ui.notify('It fell on the trail nearby — look for the sparkle!') }),
    }[n.id]?.();
    return fix ? { ...fix, primary: true } : null;
  }
  menu() {
    const g = this.g;
    const acts = [];
    const sug = this.suggestion();
    if (sug) acts.push(sug);
    if (this.napping) {
      acts.push({ label: '💤 Let them sleep', run: () => g.ui.say('parent', () => g.parentHead(), '(so peaceful…)', { dur: 2 }) });
      acts.push({ label: '🌅 Wake gently', run: () => this.wake() });
    } else {
      acts.push({ label: '🧸 Play…', keepOpen: true, run: () => g.ui.openMenu(`Play with ${this.name}`, this.playMenu(), { back: () => this.openMenu() }) });
      acts.push({ label: '🧺 Care…', keepOpen: true, run: () => g.ui.openMenu(`Care for ${this.name}`, this.careMenu(), { back: () => this.openMenu() }) });
      acts.push({ label: '🤱 Rock & cuddle', run: () => this.rock() });
    }
    acts.push({ label: this.carrier === 'front' ? '🎒 Carrier to back' : '🫶 Carrier to front', run: () => this.toggleCarrier() });
    return acts;
  }
  openMenu() {
    const [icon, label] = this.status;
    const hint = this.need ? ` — ${NEEDS[this.need.id].hint}` : '';
    this.g.ui.openMenu(`${this.name} · ${icon} ${label}${hint}`, this.menu(), { portrait: this.g.babyPortrait() });
  }
  playMenu() {
    const acts = [
      { label: '🙈 Peekaboo', run: () => this.play('peekaboo') },
      { label: '🤭 Tickle', run: () => this.play('tickle') },
      { label: '😛 Raspberry', run: () => this.play('raspberry') },
      { label: '🦘 Bounce', run: () => this.play('bounce') },
      { label: '🎵 Sing', run: () => this.sing() },
    ];
    for (const id of ['rattle', 'carving']) if (this.g.bag.has(id)) acts.push({ label: `🧸 ${ITEMS[id].name}`, run: () => this.useItem(id) });
    return acts;
  }
  careMenu() {
    const g = this.g, bag = g.bag;
    const acts = [
      { label: `🍼 Bottle (${bag.count('bottle')})`, run: () => this.useItem('bottle') },
      { label: `🧷 Diaper (${bag.count('diaper')})`, run: () => this.useItem('diaper') },
    ];
    if (this.wearing.hat) acts.push({ label: '👒 Take off hat', run: () => this.takeOff('hat') });
    else if (bag.has('sunhat')) acts.push({ label: '👒 Sun hat', run: () => this.useItem('sunhat') });
    if (this.wearing.blanket) acts.push({ label: '🧣 Unwrap blanket', run: () => this.takeOff('blanket') });
    else if (bag.has('blanket')) acts.push({ label: '🧣 Blanket', run: () => this.useItem('blanket') });
    if (bag.has('teether')) acts.push({ label: '🦷 Teether', run: () => this.useItem('teether') });
    for (const id of ['pacifier', 'sock']) if (bag.has(id)) acts.push({ label: `↩️ Give back ${ITEMS[id].name.toLowerCase()}`, run: () => this.useItem(id) });
    acts.push({ label: '🤱 Rock to sleep', run: () => this.rock() });
    return acts;
  }

  toJSON() { return { wearing: this.wearing, carrier: this.carrier }; }
}
