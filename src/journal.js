// Hike journal: what you've seen, who you've met, friendship hearts, badges and
// baby "firsts". Saved to localStorage so progress carries over between hikes.
import { ITEMS, itemIcon } from './items.js';

const KEY = 'hh_save_v2';

export const WILDLIFE = [
  { id: 'prairiedog', name: 'Utah prairie dog', a: 'a Utah prairie dog', icon: '🐿️', hint: 'Meadows on the rim' },
  { id: 'squirrel', name: 'Golden-mantled ground squirrel', a: 'a golden-mantled ground squirrel', icon: '🐿️', hint: 'Rocky spots, begging for snacks' },
  { id: 'jay', name: "Steller's jay", a: "a Steller's jay", icon: '🐦', hint: 'Hopping under the pines' },
  { id: 'raven', name: 'Common raven', a: 'a raven', icon: '🐦‍⬛', hint: 'Soaring over the hoodoos' },
  { id: 'deer', name: 'Mule deer', a: 'a mule deer', icon: '🦌', hint: 'Grazing on the canyon floor' },
  { id: 'lizard', name: 'Short-horned lizard', a: 'a short-horned lizard', icon: '🦎', hint: 'Sunning on warm rocks' },
  { id: 'butterfly', name: 'Butterflies', a: 'butterflies', icon: '🦋', hint: 'Near wildflowers on sunny days' },
  { id: 'pronghorn', name: 'Pronghorn', a: 'a pronghorn', icon: '🦌', hint: 'Open meadows past Sunset Point' },
  { id: 'owl', name: 'Great horned owl', a: 'a great horned owl', icon: '🦉', hint: 'Only after dark…' },
  { id: 'wren', name: 'Canyon wren', a: 'a canyon wren', icon: '🐦', hint: 'Listen for falling notes near water…' },
  { id: 'bluebird', name: 'Mountain bluebird', a: 'a mountain bluebird', icon: '🐦', hint: 'Hovering over a hidden overlook' },
  { id: 'falcon', name: 'Peregrine falcon', a: 'a peregrine falcon', icon: '🦅', hint: 'Soaring high above natural windows' },
  { id: 'fox', name: 'Gray fox', a: 'a gray fox', icon: '🦊', hint: 'Trots along the rim at dusk' },
];

export const PLACES = ['Rim Trail', 'Sunrise Point', "Queen's Garden Trail", "Queen's Garden", 'Navajo Loop', 'Wall Street', "Thor's Hammer", 'Sunset Point'];
export const SECRET_AREAS = { seep: 'Hidden Seep', bridges: 'Two Bridges', overlook: 'Moonlit Overlook' };
import { PAGES } from './story.js';

export const BADGES = [
  { id: 'lnt', icon: '🌲', name: 'Leave No Trace', desc: 'Pack out 5 pieces of litter and leave 3 nature finds be.', test: s => s.litter >= 5 && s.leftBe >= 3 },
  { id: 'samaritan', icon: '🤝', name: 'Good Samaritan', desc: 'Return 3 lost items to their owners.', test: s => s.returned >= 3 },
  { id: 'wildlife', icon: '🔭', name: 'Wildlife Watcher', desc: 'Spot every animal in the journal.', test: s => WILDLIFE.every(w => s.seen[w.id]) },
  { id: 'nightowl', icon: '🦉', name: 'Night Owl', desc: 'Meet the great horned owl.', test: s => s.seen.owl },
  { id: 'friend', icon: '💛', name: 'Trail Friend', desc: 'Reach 5 hearts with someone.', test: s => Object.values(s.hearts).some(h => h >= 5) },
  { id: 'parent', icon: '🍼', name: 'Super Parent', desc: 'Take care of 20 of your baby\'s needs.', test: s => s.needsMet >= 20 },
  { id: 'shutter', icon: '📸', name: 'Shutterbug', desc: 'Take 5 photos (yours or other hikers\').', test: s => s.photos >= 5 },
  { id: 'ranger', icon: '🎓', name: 'Junior Ranger', desc: 'Answer 5 of Ranger Rosa\'s quiz questions correctly.', test: s => s.quiz >= 5 },
  { id: 'explorer', icon: '🗺️', name: 'Explorer', desc: 'Visit every place along the trail.', test: s => PLACES.every(p => s.places[p]) },
  { id: 'golden', icon: '🌅', name: 'Golden Hour', desc: 'Stand at Sunset Point during golden hour.', test: s => s.golden },
  { id: 'secrets', icon: '🧭', name: 'Trailblazer', desc: 'Discover all three hidden side areas.', test: s => Object.keys(SECRET_AREAS).every(a => s.areas[a]) },
  { id: 'story', icon: '📜', name: 'Keeper of Stories', desc: 'Find every page of the old diary and return them to their owner.', test: s => s.storyDone },
  { id: 'acrobat', icon: '🧗', name: 'Mountain Goat', desc: 'Climb to the Two Bridges lookout.', test: s => s.lookout },
  { id: 'stargazer', icon: '🌌', name: 'Stargazer', desc: 'Trace 4 different constellations.', test: s => Object.keys(s.consts || {}).length >= 4 },
  { id: 'wildshot', icon: '🖼️', name: 'Wildlife Photographer', desc: 'Earn 3 stars photographing 5 kinds of animals.', test: s => Object.values(s.shots || {}).filter(v => v >= 3).length >= 5 },
  { id: 'rainbow', icon: '🌈', name: 'After the Storm', desc: 'See a rainbow over the canyon.', test: s => s.rainbow },
];

function fresh() {
  return {
    seen: {}, met: {}, hearts: {}, gifted: {}, places: {}, finds: {}, badges: {},
    litter: 0, leftBe: 0, returned: 0, needsMet: 0, photos: 0, quiz: 0, golden: false,
    hikersMet: [], firsts: [], bond: 0, bag: null, hikes: 0,
    areas: {}, pages: {}, storyDone: false, lookout: false, consts: {}, shots: {}, games: {}, rainbow: false,
  };
}

export class Journal {
  constructor(game) {
    this.g = game;
    this.s = fresh();
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) this.s = { ...fresh(), ...JSON.parse(raw) };
    } catch { /* storage unavailable */ }
    this.dirty = false;
    this.saveT = 0;
  }
  get hasSave() { return this.s.hikes > 0; }
  reset() { this.s = fresh(); this.save(); }
  mark() { this.dirty = true; }
  save() {
    this.s.bag = this.g.bag ? this.g.bag.toJSON() : this.s.bag;
    try { localStorage.setItem(KEY, JSON.stringify(this.s)); } catch { /* ignore */ }
    this.dirty = false;
  }
  tick(dt) {
    this.saveT -= dt;
    if (this.dirty && this.saveT <= 0) { this.save(); this.saveT = 4; }
  }

  // ----- recording -----
  see(id) {
    if (this.s.seen[id]) return false;
    this.s.seen[id] = true;
    const w = WILDLIFE.find(x => x.id === id);
    if (w) this.g.ui.notify(`${w.icon} New journal entry: ${w.name}`);
    this.check(); this.mark();
    return true;
  }
  meet(id, name) {
    if (!this.s.met[id]) { this.s.met[id] = name; this.mark(); }
  }
  meetHiker(name) {
    if (!this.s.hikersMet.includes(name)) { this.s.hikersMet.push(name); if (this.s.hikersMet.length > 40) this.s.hikersMet.shift(); this.mark(); }
  }
  hearts(id) { return this.s.hearts[id] || 0; }
  addHearts(id, n) {
    const before = this.hearts(id);
    const after = Math.max(0, Math.min(5, before + n));
    this.s.hearts[id] = after;
    this.check(); this.mark();
    return { before, after };
  }
  visit(place) {
    if (!this.s.places[place]) { this.s.places[place] = true; this.check(); this.mark(); }
  }
  find(id) { if (!this.s.finds[id]) { this.s.finds[id] = true; this.mark(); } }
  inc(key, n = 1) { this.s[key] = (this.s[key] || 0) + n; this.check(); this.mark(); }
  set(key, v) { this.s[key] = v; this.check(); this.mark(); }
  first(text) {
    const name = this.g.baby ? this.g.baby.name : 'Baby';
    if (this.s.firsts.some(f => f.text === text)) return;
    this.s.firsts.push({ text, when: this.g.sky ? this.g.sky.label : '' });
    if (this.s.firsts.length > 30) this.s.firsts.shift();
    this.g.ui.notify(`📔 ${name} ${text}!`);
    this.mark();
  }
  check() {
    for (const b of BADGES) {
      if (!this.s.badges[b.id] && b.test(this.s)) {
        this.s.badges[b.id] = true;
        this.g.ui.notify(`${b.icon} Badge earned: ${b.name}!`, 4);
        this.g.audio.fanfare && this.g.audio.fanfare();
      }
    }
  }

  // ----- UI -----
  render(tab, el) {
    const s = this.s;
    const heartRow = h => {
      let out = '';
      for (let i = 1; i <= 5; i++) out += h >= i ? '<b class="h full">♥</b>' : h >= i - 0.5 ? '<b class="h half">♥</b>' : '<b class="h">♥</b>';
      return `<span class="hearts">${out}</span>`;
    };
    let html = '';
    if (tab === 'wildlife') {
      html = '<div class="jgrid">' + WILDLIFE.map(w => s.seen[w.id]
        ? `<div class="jcard"><div class="ji">${w.icon}</div><b>${w.name}</b></div>`
        : `<div class="jcard locked"><div class="ji">❔</div><b>???</b><small>${w.hint}</small></div>`).join('') + '</div>';
    } else if (tab === 'friends') {
      const friends = this.g.friendList();
      html = '<div class="jlist">' + friends.map(f => s.met[f.id]
        ? `<div class="jrow"><span>${f.icon} <b>${f.name}</b></span>${heartRow(this.hearts(f.id))}</div>`
        : `<div class="jrow locked"><span>❔ <b>???</b></span><small>${f.hint}</small></div>`).join('') + '</div>';
      html += `<p class="jnote">Hikers met along the way: ${s.hikersMet.length ? s.hikersMet.join(', ') : 'nobody yet'}</p>`;
    } else if (tab === 'finds') {
      const cats = ['nature', 'lost', 'keepsake', 'toy'];
      const ids = Object.keys(ITEMS).filter(id => cats.includes(ITEMS[id].cat));
      html = '<div class="jgrid small">' + ids.map(id => s.finds[id]
        ? `<div class="jcard"><img src="${itemIcon(id)}" alt=""><b>${ITEMS[id].name}</b></div>`
        : `<div class="jcard locked"><div class="ji">❔</div><b>???</b></div>`).join('') + '</div>';
      html += `<p class="jnote">🗑️ Litter packed out: <b>${s.litter}</b> · 🌿 Nature finds left be: <b>${s.leftBe}</b> · 🤝 Lost items returned: <b>${s.returned}</b></p>`;
    } else if (tab === 'badges') {
      html = '<div class="jgrid">' + BADGES.map(b => s.badges[b.id]
        ? `<div class="jcard badge"><div class="ji">${b.icon}</div><b>${b.name}</b><small>${b.desc}</small></div>`
        : `<div class="jcard locked"><div class="ji grey">${b.icon}</div><b>${b.name}</b><small>${b.desc}</small></div>`).join('') + '</div>';
    } else if (tab === 'story') {
      const got = PAGES.filter(p => s.pages[p.id]);
      html = `<p class="jnote">An old hiking diary, its pages scattered by the wind. Found <b>${got.length}</b> of ${PAGES.length}. ${s.storyDone ? 'Returned to Walt ♥' : ''}</p>`;
      html += PAGES.map(p => s.pages[p.id]
        ? `<div class="page"><b>${p.title}</b><p>${p.text}</p></div>`
        : `<div class="page locked"><b>Missing page</b><p>${['Somewhere high in the canyon…', 'Up off the ground, hidden from view…', 'Near the sound of water…', 'Higher than you\'d think to look…', 'Beyond the natural windows…', 'Where the stars are brightest…'][p.id - 1]}</p></div>`).join('');
      html += '<h3>Hidden places</h3>' + Object.entries(SECRET_AREAS).map(([k, n]) => `<div class="jrow ${s.areas[k] ? '' : 'locked'}"><span>${s.areas[k] ? '🧭 <b>' + n + '</b>' : '❔ ???'}</span></div>`).join('');
    } else if (tab === 'baby') {
      const name = this.g.baby.name;
      html = `<div class="jrow"><span>👶 <b>${name}</b> · bond</span>${heartRow(s.bond)}</div>`;
      html += `<p class="jnote">Needs cared for: <b>${s.needsMet}</b> · Photos taken: <b>${s.photos}</b> · Quiz answers: <b>${s.quiz}</b></p>`;
      const G = s.games || {}, st = n => n ? '★'.repeat(n) + '☆'.repeat(3 - n) : '—';
      html += `<h3>Mini-game bests</h3><div class="jlist">
        <div class="jrow"><span>🙈 Peekaboo</span><b class="stars">${st(G.peekaboo)}</b></div>
        <div class="jrow"><span>🎵 Lullaby</span><b class="stars">${st(G.lullaby)}</b></div>
        <div class="jrow"><span>📣 Canyon echo</span><b class="stars">${st(G.echo)}</b></div>
        <div class="jrow"><span>✨ Constellations traced</span><b>${Object.keys(s.consts || {}).join(', ') || '—'}</b></div>
        <div class="jrow"><span>📸 Wildlife photos</span><b>${Object.entries(s.shots || {}).map(([k, v]) => (WILDLIFE.find(w => w.id === k)?.icon || '') + '★'.repeat(v)).join(' ') || '—'}</b></div></div>`;
      html += '<h3>Firsts</h3>' + (s.firsts.length
        ? '<ul class="firsts">' + s.firsts.slice().reverse().map(f => `<li>${name} ${f.text}<small>${f.when}</small></li>`).join('') + '</ul>'
        : '<p class="jnote">Every first moment on the trail will be written here.</p>');
      html += '<p class="jreset"><button id="jReset">Start a fresh journal</button></p>';
    }
    el.innerHTML = html;
    const rb = el.querySelector('#jReset');
    if (rb) rb.onclick = () => {
      if (confirm('Erase your journal, hearts and bag and start fresh?')) { this.reset(); location.reload(); }
    };
  }
}
