// Little unscripted moments: people and animals noticing and reacting to each other.
// Each visit picks a different handful of these and they play out wherever you happen to be,
// so no two strolls go quite the same way.
import { Manatee, FishSchool, Alligator, Turtles, Wader, Osprey, Otter, Anole, Person, Visitor } from './entities.js?v=20261117a';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[(Math.random() * a.length) | 0];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const later = (ms, fn) => setTimeout(fn, ms);

const ANIMAL_WORDS = { manatee: 'a manatee', gator: 'an alligator', juvgator: 'a baby gator', cooter: 'turtles', heron: 'a heron', egret: 'an egret', ibis: 'an ibis', anhinga: 'an anhinga', osprey: 'an osprey', otter: 'an otter', armadillo: 'an armadillo', gar: 'a gar', mullet: 'fish', anole: 'a little lizard', snake: 'a snake', softshell: 'a softshell turtle', tortoise: 'a tortoise' };

export class Happenings {
  constructor(g) {
    this.g = g;
    this.t = rand(12, 18);
    this.recent = [];
    const all = Object.keys(EVENTS);
    // this visit's mix of moments
    this.active = shuffle(all).slice(0, Math.min(all.length, 9 + ((Math.random() * 4) | 0)));
  }
  view(e, pad = 0) { return Math.abs(e.x - this.g.player.x) < this.g.W * 0.5 + pad && e.visible(this.g); }
  find(cls, pred = () => true, pad = 0) {
    const p = this.g.player.x;
    return this.g.entities.filter(e => e instanceof cls && this.view(e, pad) && pred(e)).sort((a, b) => Math.abs(a.x - p) - Math.abs(b.x - p))[0];
  }
  people(pad = 0) { return this.g.entities.filter(e => e instanceof Person && !e.seated && this.view(e, pad)); }
  say(who, text, dur = 2.6) { this.g.ui.say('hap' + (who.name || ''), () => who.head(), text, { dur }); }
  update(dt) {
    const g = this.g;
    if (!g.started || g.ended || g.ui.busy || g.baby.napping && Math.random() < 0.5) return;
    this.t -= dt;
    if (this.t > 0) return;
    for (const k of shuffle(this.active.filter(k => !this.recent.includes(k)))) {
      if (EVENTS[k](this, g)) {
        this.recent.push(k); if (this.recent.length > 4) this.recent.shift();
        this.t = rand(14, 28);
        g.track('happening', k);
        return;
      }
    }
    this.t = 4;
  }
}

const EVENTS = {
  // someone nearby spots an animal and points it out
  pointOut(h, g) {
    const who = pick(h.people(20)); if (!who) return false;
    const a = g.entities.filter(e => e.kind === 'animal' && h.view(e, -20) && ANIMAL_WORDS[e.jid]).sort((p, q) => Math.abs(p.x - who.x) - Math.abs(q.x - who.x))[0];
    if (!a) return false;
    who.gesture('point', 2.6, a.x);
    h.say(who, pick([`Look — ${ANIMAL_WORDS[a.jid]}!`, `Oh! Do you see ${ANIMAL_WORDS[a.jid]} down there?`, `There's ${ANIMAL_WORDS[a.jid]}, right there!`]));
    later(1200, () => g.baby.react('animal'));
    return true;
  },
  // the osprey folds and plunges for a mullet
  ospreyDive(h, g) {
    const o = g.entities.find(e => e instanceof Osprey && !e.dive && h.view(e, 120)); if (!o) return false;
    const fish = h.find(FishSchool, () => true, 60); if (!fish) return false;
    o.hunt(fish.x, g);
    later(1300, () => fish.scatter());
    later(2600, () => { const w = pick(h.people(30)); if (w) { w.gesture('point', 2, o.x); h.say(w, pick(['Did you see that dive?!', 'Whoa — it got one!', 'Feet first! Amazing.'])); } else g.ui.say('parent', () => g.parentHead(), 'Did you see that?!'); g.baby.react('animal'); });
    return true;
  },
  // a heron or egret stabs at a fish
  waderStrike(h, g) {
    const w = h.find(Wader, e => e.species !== 'ibis' && e.state !== 'strike'); if (!w) return false;
    w.strike();
    later(900, () => { g.ui.say('wad', () => w.head(), pick(['*gulp!*', '*snap* — got one!', '*swallows a fish*']), { dur: 1.8, cls: 'label' }); g.audio.heron?.(); });
    later(1800, () => g.baby.react('animal'));
    return true;
  },
  // a mother and calf come up for air together
  manateeBreath(h, g) {
    const calf = g.entities.find(e => e instanceof Manatee && e.follow && h.view(e.follow, 30)); if (!calf) return false;
    calf.follow.surface(g);
    later(4500, () => { const w = pick(h.people(30)); if (w) h.say(w, pick(['Mama and baby, breathing together!', 'Aww, look at the little one!'])); g.baby.react('animal'); });
    return true;
  },
  // a gator cruises toward the basking turtles, and they bail out one by one
  gatorTurtles(h, g) {
    const tu = g.entities.find(e => e instanceof Turtles && h.view(e, 100) && e.shells.every(s => s.on)); if (!tu) return false;
    const gt = g.entities.find(e => e instanceof Alligator && !e.juvenile && e.state === 'swim' && Math.abs(e.x - tu.x) < 400);
    if (gt) { gt.goal = tu.x + 14; gt.goalV = 3; gt.waitT = 0; gt.home = tu.x; later(5000, () => tu.spook(g)); }
    else later(400, () => tu.spook(g));
    return true;
  },
  // the Ramírez kid spots your baby and waves
  kidWaves(h, g) {
    const f = g.entities.find(e => e.kid && h.view(e, -10)); if (!f) return false;
    f.kidGest = 'wave'; f.kidHop = 3; f.kidDir = g.player.x < f.x ? -1 : 1;
    g.ui.say('kid', () => ({ x: f.x + f.dir * 11, y: f.y - 24 }), pick([`Hi baby ${g.baby.name}!`, 'Hiiii baby!', 'Look, it\'s a baby! Hi!']), { dur: 2.6 });
    later(1200, () => { g.baby.react('person'); g.ui.say('parent', () => g.parentHead(), `${g.baby.name}, can you wave?`, { dur: 2 }); });
    return true;
  },
  // two strangers stop and swap sightings
  strangersChat(h, g) {
    const v = g.entities.filter(e => e instanceof Visitor && h.view(e, 40));
    let pair = null;
    for (const a of v) for (const b of g.entities) if (b !== a && b instanceof Person && !b.seated && Math.abs(a.x - b.x) < 40) { pair = [a, b]; break; }
    if (!pair) return false;
    const [a, b] = pair; a.talking = 9; b.talking = 9; a.dir = b.x > a.x ? 1 : -1; b.dir = -a.dir;
    const topic = pick([
      ['Seen any manatees yet?', 'Dozens! Up by the boil.'],
      ['Is the gator still by the dock?', 'Just floating there like a log.'],
      ['Beautiful morning, isn\'t it?', 'Perfect. Not a cloud.'],
      ['First time here?', 'Every winter for ten years!'],
      ['Did you see the osprey?', 'It caught a fish right in front of me!'],
    ]);
    h.say(a, topic[0], 2.4); later(2600, () => h.say(b, topic[1], 2.6));
    return true;
  },
  // a passer-by stops to admire the baby
  admirer(h, g) {
    const v = h.find(Visitor, e => !(e.talking > 0) && Math.abs(e.x - g.player.x) < 90); if (!v) return false;
    v.dir = g.player.x < v.x ? -1 : 1; v.talking = 7;
    h.say(v, pick(['What a sweet baby! What\'s their name?', 'Oh, those cheeks! How old?', 'Your little one is taking it all in!']));
    later(2600, () => { g.ui.say('parent', () => g.parentHead(), pick([`This is ${g.baby.name}!`, `Thanks! ${g.baby.name}'s first time here.`]), { dur: 2.4 }); g.baby.react('person'); });
    later(5200, () => { v.gesture('wave', 1.6); h.say(v, pick([`Hi ${g.baby.name}! Enjoy the springs!`, 'Have a lovely walk!'])); });
    return true;
  },
  // the photographer offers to take your picture
  photoOffer(h, g) {
    const p = g.entities.find(e => e instanceof Person && e.holding === 'camera' && Math.abs(e.x - g.player.x) < 70 && !e.offered); if (!p) return false;
    p.offered = true; p.dir = g.player.x < p.x ? -1 : 1;
    h.say(p, 'Want me to snap one of you two with the spring behind you?', 3);
    later(1500, () => g.ui.openMenu(p.name, [
      { label: '📸 Yes please!', primary: true, run: () => { g.ui.say('parent', () => g.parentHead(), 'Say cheese!'); later(900, () => { g.takePhoto(); h.say(p, 'Beautiful! That\'s a keeper.'); }); } },
      { label: '🙂 No thanks', run: () => h.say(p, 'No problem — enjoy!') },
    ], { portrait: p.portrait() }));
    return true;
  },
  // Ranger Dee calls out the morning count
  rangerCount(h, g) {
    const r = g.entities.find(e => e.name === 'Ranger Dee' && h.view(e, 40)); if (!r) return false;
    const n = g.entities.filter(e => e instanceof Manatee).length;
    r.gesture('point', 2.2, r.x + 20);
    h.say(r, pick([`Count update: ${n} manatees in the run!`, `I make it ${n} manatees so far today!`, `${n} manatees! Keep your eyes on the water.`]), 3);
    return true;
  },
  // the otter goes fishing
  otterFish(h, g) {
    const o = h.find(Otter); if (!o) return false;
    o.goal = o.x + (Math.random() < 0.5 ? -40 : 40); o.goalV = 12; o.waitT = 0;
    later(3500, () => { g.ui.say('ott', () => o.head(), pick(['*pops up with a fish*', '*crunch crunch*', '*rolls and splashes*']), { dur: 2, cls: 'label' }); g.fx.ripple(o.x, o.y); g.audio.splash(); g.baby.react('animal'); });
    return true;
  },
  // two anoles have a dewlap stand-off — or one shows off to a visitor
  anoleShow(h, g) {
    const a = h.find(Anole); if (!a) return false;
    a.dewT = 0;
    later(600, () => { const w = pick(h.people(20)); if (w) { w.gesture('point', 2, a.x); h.say(w, 'That lizard is showing off its pink throat!'); } else g.ui.say('parent', () => g.parentHead(), 'Look at the little lizard\'s pink throat!'); });
    return true;
  },
  // mullet go leaping, and everyone jumps
  mulletLeap(h, g) {
    const f = h.find(FishSchool); if (!f) return false;
    f.jumpT = 0;
    later(700, () => { const w = pick(h.people(20)); if (w) h.say(w, pick(['Whoa! A jumping fish!', 'Did that fish just jump?!'])); });
    return true;
  },
  // the ibises move off together across the lawn
  ibisStroll(h, g) {
    const flock = g.entities.filter(e => e instanceof Wader && e.species === 'ibis' && h.view(e, 30)); if (flock.length < 2) return false;
    const dx = Math.random() < 0.5 ? -25 : 25;
    flock.forEach((b, i) => { b.home += dx; later(i * 450, () => { b.goal = b.home + (Math.random() - 0.5) * 8; b.goalV = 5; b.waitT = 0; }); });
    return true;
  },
};
