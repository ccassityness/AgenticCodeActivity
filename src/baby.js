// The baby: a gentle mood state machine. Nothing ever fails — the baby just
// lets you know (adorably) what they'd like.
const pick = a => a[(Math.random() * a.length) | 0];

const BABBLE = ['ba-ba!', 'goo!', 'ah-boo!', 'eee!', 'da!', 'bwah?', 'ooo', 'mm-mm', 'pfffbt'];
const REACT = {
  animal: ['!!', 'da! da!', 'ooh!', '*points*', 'eee!'],
  flower: ['ooh…', '*grabby hands*', 'pretty!', 'ah!'],
  view: ['wow…', 'ooooh', '*stares*', 'aah!'],
  person: ['*waves*', 'hi!', '*shy smile*', 'ba!'],
  thing: ['ooh?', '*reaches*', 'da?'],
};
export const MOOD_ICON = {
  content: ['😊', 'Happy'],
  giggle: ['😆', 'Giggling'],
  sleepy: ['😪', 'Sleepy'],
  napping: ['💤', 'Napping'],
  fussy: ['😢', 'Wants a cuddle'],
  hungry: ['🍼', 'Hungry'],
};

export class Baby {
  constructor(game, name) {
    this.g = game;
    this.name = name;
    this.mood = 'content';
    this.hunger = 0.15;
    this.sleepiness = 0.1;
    this.fussT = 80 + Math.random() * 70;
    this.giggleT = 0;
    this.napT = 0;
    this.babbleT = 6;
    this.cryT = 0;
    this.sitT = 0;
    this.carrier = 'front';
    this.feedT = 0;
  }

  get face() {
    if (this.mood === 'napping') return 'napping';
    if (this.giggleT > 0) return 'giggle';
    if (this.mood === 'fussy' || this.mood === 'hungry') return 'fussy';
    if (this.mood === 'sleepy') return 'sleepy';
    return 'content';
  }
  get icon() { return MOOD_ICON[this.giggleT > 0 && this.mood === 'content' ? 'giggle' : this.mood]; }

  say(text, dur = 2.2) {
    this.g.ui.say('baby', () => this.g.babyPos(), text, { dur });
  }

  update(dt) {
    const g = this.g;
    this.giggleT -= dt;
    this.feedT -= dt;
    if (this.mood === 'napping') {
      this.napT -= dt;
      this.sleepiness = Math.max(0, this.sleepiness - dt * 0.03);
      this.babbleT -= dt;
      if (this.babbleT <= 0) { this.say('z z z', 2.5); this.babbleT = 5; }
      if (this.napT <= 0 && !(g.sky.night && g.player.state === 'sit')) this.wake();
      return;
    }
    const sitting = g.player.state === 'sit';
    this.hunger += dt / 190;
    this.sleepiness += dt * (g.sky.night ? 1 / 45 : 1 / 260) * (sitting ? 3 : 1);

    if (this.mood === 'content') {
      if (this.hunger > 1) { this.mood = 'hungry'; this.cryT = 0; }
      else if (this.sleepiness > 1) { this.mood = 'sleepy'; this.say('*yaaawn*'); g.audio.yawn(); }
      else {
        this.fussT -= dt;
        if (this.fussT <= 0) { this.mood = 'fussy'; this.cryT = 0; this.fussT = 90 + Math.random() * 90; }
      }
    }
    if (this.mood === 'fussy' || this.mood === 'hungry') {
      this.cryT -= dt;
      if (this.cryT <= 0) {
        this.say(this.mood === 'hungry' ? pick(['waah! 🍼', 'nnnh…', 'ba-ba-ba?']) : pick(['wah…', 'hnnng', '*sniffle*']));
        g.audio.cry();
        this.cryT = 7 + Math.random() * 3;
      }
    }
    if (this.mood === 'sleepy') {
      if (sitting) { this.sitT += dt; if (this.sitT > 4) this.nap(); }
      else this.sitT = 0;
      this.babbleT -= dt;
      if (this.babbleT <= 0) { this.say(pick(['*yawn*', '*rubs eyes*', 'mmh…'])); this.babbleT = 9; }
    }
    if (this.mood === 'content') {
      this.babbleT -= dt;
      if (this.babbleT <= 0) {
        this.say(pick(BABBLE));
        g.audio.babble();
        this.babbleT = 10 + Math.random() * 10;
      }
    }
  }

  // ----- actions -----
  tickle() {
    if (this.mood === 'fussy') { this.say('…hehe?'); this.mood = 'content'; }
    else if (this.mood === 'hungry') { this.say('nnh… 🍼'); return; }
    else if (this.mood === 'sleepy') { this.say('*sleepy giggle*'); }
    else this.say(pick(['hehehe!', 'ahaha!', 'eee-hee!', '*squeals*']));
    this.giggleT = 1.6;
    this.g.audio.giggle();
  }
  feed() {
    this.g.player.act('feed', 3);
    this.feedT = 3;
    this.g.audio.sip();
    if (this.hunger < 0.3 && this.mood !== 'hungry') {
      this.say('*pushes bottle away*');
      return;
    }
    this.hunger = 0;
    this.say('nom nom nom…', 3);
    if (this.mood === 'hungry') this.mood = 'content';
    setTimeout(() => { if (this.mood === 'content') { this.say('*burp*'); this.giggleT = 1; } }, 3300);
  }
  rock() {
    this.g.player.act('rock', 3.2);
    this.g.audio.shush();
    this.g.ui.say('parent', () => this.g.parentHead(), 'shh, shh…', { dur: 2 });
    if (this.mood === 'sleepy' || (this.g.sky.night && this.sleepiness > 0.5)) { setTimeout(() => this.nap(), 2500); return; }
    if (this.mood === 'fussy') { this.mood = 'content'; setTimeout(() => this.say('*content sigh*'), 2200); }
    else if (this.mood === 'hungry') setTimeout(() => this.say('nnh… 🍼'), 2200);
    else setTimeout(() => { this.say('*coo*'); this.g.audio.coo(); }, 2000);
  }
  sing() {
    const g = this.g;
    g.ui.say('parent', () => g.parentHead(), pick(['♪ hush little hiker… ♪', '♪ twinkle twinkle… ♪', '♪ hoodoo, hoodoo, who are you… ♪']), { dur: 3 });
    g.audio.chime();
    this.sleepiness += 0.25;
    if (this.mood === 'fussy') this.mood = 'content';
    setTimeout(() => {
      if (this.mood === 'content') { this.say(pick(['ah-ah-ah ♪', '*happy kicks*', 'ba-ba ♪'])); this.giggleT = 1.2; }
      else if (this.mood === 'sleepy') this.nap();
    }, 2600);
  }
  nap() {
    if (this.mood === 'napping') return;
    this.mood = 'napping';
    this.napT = 35 + Math.random() * 20;
    this.babbleT = 1.5;
    this.say('z z z…', 2.5);
  }
  wake() {
    this.mood = 'content';
    this.sleepiness = 0;
    this.fussT = 70 + Math.random() * 60;
    this.say(pick(['*big stretch*', 'ah!', '*blinks*']));
    this.g.audio.coo();
  }
  toggleCarrier() {
    this.carrier = this.carrier === 'front' ? 'back' : 'front';
    this.say(this.carrier === 'back' ? '*looks around* wheee' : '*snuggles in*');
    this.g.audio.pop();
  }
  /** React to something interesting. Returns false if napping. */
  react(kind) {
    if (this.mood === 'napping') return false;
    if (this.mood === 'fussy' && Math.random() < 0.6) this.mood = 'content';
    this.say(pick(REACT[kind] || REACT.thing));
    if (this.mood === 'content') { this.giggleT = 1.2; if (kind !== 'view') this.g.audio.giggle(); else this.g.audio.coo(); }
    return true;
  }

  menuActions() {
    const acts = [];
    if (this.mood === 'napping') {
      acts.push({ label: '💤 Let them sleep', run: () => this.g.ui.say('parent', () => this.g.parentHead(), '(so peaceful…)', { dur: 2 }) });
      acts.push({ label: '🌅 Wake gently', run: () => this.wake() });
    } else {
      acts.push({ label: '🤭 Tickle', run: () => this.tickle() });
      acts.push({ label: '🍼 Bottle', run: () => this.feed() });
      acts.push({ label: '🤱 Rock & soothe', run: () => this.rock() });
      acts.push({ label: '🎵 Sing', run: () => this.sing() });
    }
    acts.push({ label: this.carrier === 'front' ? '🎒 Move carrier to back' : '🫶 Move carrier to front', run: () => this.toggleCarrier() });
    return acts;
  }
}
