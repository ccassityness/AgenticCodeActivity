// The baby: needs appear as thought bubbles and slowly get louder until you help.
// Care is direct — no inventory. Nothing ever fails.
const pick = a => a[(Math.random() * a.length) | 0];
const rand = (a, b) => a + Math.random() * (b - a);

const BABBLE = ['ba-ba!', 'goo!', 'ah-boo!', 'eee!', 'da!', 'bwah?', 'ooo', 'mm-mm', 'pfffbt', 'ga ga', 'hiii', 'aba-ba'];
const REACT = {
  animal: ['!!', 'da! da!', 'ooh!', '*points*', 'eee!', '*flaps arms*'],
  view: ['wow…', 'ooooh', '*stares*', 'aah!'],
  person: ['*waves*', 'hi!', '*shy smile*', 'ba!', '*hides face*'],
  thing: ['ooh?', '*reaches*', 'da?'],
};
export const NEEDS = {
  hungry: { icon: '🍼', label: 'Hungry', hint: 'Give a bottle' },
  diaper: { icon: '🧷', label: 'Needs a change', hint: 'Change the diaper' },
  hot: { icon: '🥵', label: 'Too hot', hint: 'Put on the sun hat' },
  cold: { icon: '🥶', label: 'Chilly', hint: 'Wrap in the blanket' },
  sleepy: { icon: '😴', label: 'Sleepy', hint: 'Rock, sing, or rest on a bench' },
  bored: { icon: '🧸', label: 'Bored', hint: 'Play, or show them an animal' },
  cuddle: { icon: '🤗', label: 'Wants cuddles', hint: 'Rock & cuddle' },
  lost: { icon: '🥺', label: 'Dropped the pacifier', hint: 'Pick it up off the boardwalk' },
};

export class Baby {
  constructor(game, name) {
    this.g = game;
    this.name = name;
    this.need = null;
    this.timers = { hungry: rand(70, 110), diaper: rand(120, 180), bored: rand(45, 75), cuddle: rand(150, 240), sleepy: rand(160, 240), hot: rand(30, 60), cold: rand(20, 40), drop: rand(60, 120) };
    this.napT = 0; this.giggleT = 0; this.wowT = 0; this.babbleT = 6; this.cryT = 0; this.sitT = 0; this.feedT = 0;
    this.carrier = 'front';
    this.wearing = { hat: true, blanket: false, pacifier: true };
    this.sinceFun = 0;
    this.napping = false;
  }
  get face() {
    if (this.napping) return 'napping';
    if (this.giggleT > 0) return 'giggle';
    if (this.wowT > 0) return 'wow';
    if (this.need) { if (this.need.level >= 3) return 'crying'; if (this.need.id === 'sleepy') return 'sleepy'; if (this.need.level >= 2) return 'fussy'; }
    return 'content';
  }
  get status() {
    if (this.napping) return ['💤', 'Napping'];
    if (this.need) return [NEEDS[this.need.id].icon, NEEDS[this.need.id].label];
    if (this.giggleT > 0) return ['😆', 'Giggling'];
    return ['😊', 'Happy'];
  }
  say(text, dur = 2.2) { this.g.ui.say('baby', () => this.g.babyPos(), text, { dur }); }

  setNeed(id, extra = {}) {
    if (this.napping && id !== 'lost') return;
    this.need = { id, level: 1, t: 0, ...extra };
    this.cryT = 2;
    this.g.ui.needChanged();
    this.g.audio.babble();
  }
  meetNeed(id, msg) {
    if (!this.need || this.need.id !== id) return false;
    this.need = null;
    this.g.ui.needChanged();
    this.happy(msg || pick(['*happy sigh*', 'ahh!', '*beams*', 'goo ♥']));
    return true;
  }
  happy(msg) {
    this.giggleT = 1.6;
    if (msg) this.say(msg);
    this.g.audio.giggle();
    const p = this.g.babyPos();
    this.g.fx.hearts(p.x, p.y + 6, 4);
    this.sinceFun = 0;
  }

  update(dt) {
    const g = this.g;
    this.giggleT -= dt; this.wowT -= dt; this.feedT -= dt; this.sinceFun += dt;
    if (this.napping) {
      this.napT -= dt; this.babbleT -= dt;
      if (this.babbleT <= 0) { g.fx.emote(() => g.babyPos(), 'zz'); this.babbleT = 5; }
      if (this.napT <= 0 && !(g.sky.night && g.player.state === 'sit')) this.wake();
      return;
    }
    const hotOK = !g.sky.night && g.time > 0.2 && g.time < 0.56 && !this.wearing.hat;
    const coldOK = (g.sky.night || g.time < 0.12 || g.time > 0.92) && !this.wearing.blanket;
    for (const k of Object.keys(this.timers)) {
      let rate = 1;
      if (k === 'sleepy') rate = g.sky.night ? 4 : g.player.state === 'sit' ? 2.5 : 1;
      if (k === 'hot' && !hotOK) rate = 0;
      if (k === 'cold' && !coldOK) rate = 0;
      if (k === 'bored') rate = this.sinceFun > 30 ? 1.4 : 0.6;
      if (k === 'drop' && (!this.wearing.pacifier || !g.onBoardwalk)) rate = 0;
      this.timers[k] -= dt * rate;
    }
    if (!this.need) {
      const due = Object.keys(this.timers).filter(k => this.timers[k] <= 0);
      if (due.length) {
        const id = pick(due);
        this.resetTimer(id);
        if (id === 'drop') { g.dropPacifier(); return; }
        if ((id === 'hot' && !hotOK) || (id === 'cold' && !coldOK)) return;
        this.setNeed(id);
        return;
      }
    }
    if (this.need) {
      const n = this.need;
      n.t += dt;
      const lvl = n.t > 50 ? 3 : n.t > 24 ? 2 : 1;
      if (lvl !== n.level) { n.level = lvl; g.ui.needChanged(); }
      if (n.id === 'hot' && (this.wearing.hat || g.sky.night)) { this.meetNeed('hot', '*cool sigh*'); return; }
      if (n.id === 'cold' && this.wearing.blanket) { this.meetNeed('cold', '*snug*'); return; }
      if (n.id === 'sleepy' && g.player.state === 'sit') { this.sitT += dt; if (this.sitT > 3) { this.meetNeed('sleepy', '*yaaawn*'); this.nap(); } } else this.sitT = 0;
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
    if (this.babbleT <= 0) { this.say(pick(BABBLE)); g.audio.babble(); this.babbleT = rand(9, 18); }
  }
  resetTimer(id) {
    const base = { hungry: [110, 160], diaper: [150, 230], bored: [55, 90], cuddle: [160, 260], sleepy: [200, 300], hot: [50, 90], cold: [40, 70], drop: [90, 160] }[id];
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
      lost: [['*points down*', 'da! da!', 'uh-oh!'], ['*reaches down*', 'nnh! DA!']],
    };
    return (L[id] || L.bored)[Math.min(1, lvl - 1)];
  }

  // ----- care -----
  feed() {
    const g = this.g;
    if (this.napping) { this.say('*snores softly*'); return; }
    g.player.act('feed', 3); this.feedT = 3; g.audio.sip();
    if (this.need?.id === 'hungry') { this.say('nom nom nom…', 3); setTimeout(() => this.meetNeed('hungry', 'nom nom… *burp*'), 2400); }
    else this.say('*pushes bottle away*');
  }
  change() {
    if (this.need?.id === 'diaper') { this.g.player.act('rock', 2); this.g.audio.pop(); this.meetNeed('diaper', '*fresh and happy*'); }
    else this.say('*still dry!*');
  }
  toggle(what) {
    this.wearing[what] = !this.wearing[what];
    this.g.audio.pop();
    if (what === 'hat' && this.wearing.hat) { if (!this.meetNeed('hot', '*shady and happy*')) this.say('*looks very stylish*'); }
    if (what === 'blanket' && this.wearing.blanket) {
      if (!this.meetNeed('cold', '*snug as a bug*')) this.say('*snuggles*');
      if (this.need?.id === 'sleepy') { this.meetNeed('sleepy'); this.nap(); }
    }
    this.g._bp = null;
  }
  givePacifier() {
    this.wearing.pacifier = true; this.g.hasPaci = false; this.g.audio.pop();
    if (!this.meetNeed('lost', '*happy sucking*')) this.say('*happy*');
  }
  play(kind) {
    const g = this.g;
    if (this.napping) { this.say('*snores softly*'); return; }
    if (this.need && ['hungry', 'diaper', 'lost', 'hot', 'cold'].includes(this.need.id)) { this.say(pick(['*not now*', 'nnh…', '*fusses*'])); return; }
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
      else this.happy(pick(lines[kind]));
    }, kind === 'peekaboo' ? 900 : 300);
  }
  rock() {
    const g = this.g;
    g.player.act('rock', 3.2); g.audio.shush();
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
    g.ui.say('parent', () => g.parentHead(), pick(['♪ hush little baby… ♪', '♪ twinkle twinkle… ♪', '♪ down by the springs… ♪', '♪ you are my sunshine… ♪']), { dur: 3 });
    g.audio.lullaby(); g.fx.notes(g.parentHead().x, g.parentHead().y);
    setTimeout(() => {
      if (this.need?.id === 'sleepy') { this.meetNeed('sleepy', '*yawns…*'); this.nap(); }
      else if (this.need?.id === 'bored' || this.need?.id === 'cuddle') this.meetNeed(this.need.id, 'ah-ah-ah ♪');
      else if (!this.need) this.happy(pick(['ah-ah-ah ♪', '*happy kicks*', 'ba-ba ♪']));
      else this.say('nnh…');
    }, 2600);
  }
  nap() {
    if (this.napping) return;
    this.napping = true; this.napT = rand(30, 45); this.babbleT = 1;
    this.say('z z z…', 2.5);
    if (this.need && this.need.id !== 'lost') this.need = null;
    this.g.ui.needChanged();
  }
  wake() { this.napping = false; this.timers.sleepy = rand(200, 300); this.say(pick(['*big stretch*', 'ah!', '*blinks*'])); this.g.audio.coo(); this.g.ui.needChanged(); }
  toggleCarrier() { this.carrier = this.carrier === 'front' ? 'back' : 'front'; this.say(this.carrier === 'back' ? '*looks around* wheee' : '*snuggles in*'); this.g.audio.pop(); }
  react(kind) {
    if (this.napping) return false;
    this.say(pick(REACT[kind] || REACT.thing));
    this.wowT = 1.2;
    if (this.need?.id === 'bored' && kind !== 'thing') setTimeout(() => this.meetNeed('bored', '*delighted*'), 900);
    else if (!this.need) { this.giggleT = 1.2; this.sinceFun = 0; if (kind !== 'view') this.g.audio.giggle(); else this.g.audio.coo(); }
    return true;
  }

  // ----- menus -----
  suggestion() {
    if (!this.need) return null;
    const n = this.need, g = this.g;
    const F = {
      hungry: () => ({ label: '🍼 Give a bottle', run: () => this.feed() }),
      diaper: () => ({ label: '🧷 Change diaper', run: () => this.change() }),
      hot: () => ({ label: '👒 Put on sun hat', run: () => this.toggle('hat') }),
      cold: () => ({ label: '🧣 Wrap in blanket', run: () => this.toggle('blanket') }),
      sleepy: () => ({ label: '🎵 Sing a lullaby', run: () => this.sing() }),
      bored: () => ({ label: '🙈 Peekaboo!', run: () => this.play('peekaboo') }),
      cuddle: () => ({ label: '🤗 Cuddle & rock', run: () => this.rock() }),
      lost: () => (g.hasPaci ? { label: '🍭 Give back the pacifier', run: () => this.givePacifier() } : { label: '🔎 Find the pacifier', run: () => g.ui.notify('It fell on the boardwalk nearby — look for the sparkle!') }),
    };
    const f = F[n.id]?.();
    return f ? { ...f, primary: true } : null;
  }
  openMenu() {
    const g = this.g;
    const [icon, label] = this.status;
    const hint = this.need ? ` — ${NEEDS[this.need.id].hint}` : '';
    const acts = [];
    const sug = this.suggestion();
    if (sug) acts.push(sug);
    if (this.napping) {
      acts.push({ label: '💤 Let them sleep', run: () => g.ui.say('parent', () => g.parentHead(), '(so peaceful…)', { dur: 2 }) });
      acts.push({ label: '🌅 Wake gently', run: () => this.wake() });
    } else {
      acts.push({ label: '🧸 Play…', keepOpen: true, run: () => g.ui.openMenu(`Play with ${this.name}`, [
        { label: '🙈 Peekaboo', run: () => this.play('peekaboo') },
        { label: '🤭 Tickle', run: () => this.play('tickle') },
        { label: '😛 Raspberry', run: () => this.play('raspberry') },
        { label: '🦘 Bounce', run: () => this.play('bounce') },
        { label: '🎵 Sing', run: () => this.sing() },
      ], { back: () => this.openMenu() }) });
      acts.push({ label: '🧺 Care…', keepOpen: true, run: () => g.ui.openMenu(`Care for ${this.name}`, [
        { label: '🍼 Bottle', run: () => this.feed() },
        { label: '🧷 Change diaper', run: () => this.change() },
        { label: this.wearing.hat ? '👒 Take off hat' : '👒 Sun hat', run: () => this.toggle('hat') },
        { label: this.wearing.blanket ? '🧣 Unwrap blanket' : '🧣 Blanket', run: () => this.toggle('blanket') },
        ...(g.hasPaci ? [{ label: '🍭 Give pacifier', run: () => this.givePacifier() }] : []),
        { label: '🤱 Rock to sleep', run: () => this.rock() },
      ], { back: () => this.openMenu() }) });
      acts.push({ label: '🤱 Rock & cuddle', run: () => this.rock() });
    }
    const ct = g.player.look.carrier.type;
    if (ct === 'structured') acts.push({ label: this.carrier === 'front' ? '🎒 Carrier to back' : '🫶 Carrier to front', run: () => this.toggleCarrier() });
    g.ui.openMenu(`${this.name} · ${icon} ${label}${hint}`, acts, { portrait: g.babyPortrait() });
  }
}
