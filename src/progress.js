// Daily tasks, the field guide and badges. Progress is saved in the browser.
import { PLANTS } from './flora.js?v=20261116a';

const KEY = 'bs_progress';

export const SPECIES = [
  { id: 'manatee', name: 'West Indian manatee', cat: 'Mammals' },
  { id: 'otter', name: 'River otter', cat: 'Mammals' },
  { id: 'armadillo', name: 'Nine-banded armadillo', cat: 'Mammals' },
  { id: 'gator', name: 'American alligator', cat: 'Reptiles' },
  { id: 'juvgator', name: 'Young alligator', cat: 'Reptiles' },
  { id: 'cooter', name: 'Florida red-bellied cooter', cat: 'Reptiles' },
  { id: 'softshell', name: 'Florida softshell turtle', cat: 'Reptiles' },
  { id: 'tortoise', name: 'Gopher tortoise', cat: 'Reptiles' },
  { id: 'snake', name: 'Banded water snake', cat: 'Reptiles' },
  { id: 'anole', name: 'Green anole', cat: 'Reptiles' },
  { id: 'skink', name: 'Five-lined skink', cat: 'Reptiles' },
  { id: 'heron', name: 'Great blue heron', cat: 'Birds' },
  { id: 'egret', name: 'Great egret', cat: 'Birds' },
  { id: 'ibis', name: 'White ibis', cat: 'Birds' },
  { id: 'anhinga', name: 'Anhinga', cat: 'Birds' },
  { id: 'osprey', name: 'Osprey', cat: 'Birds' },
  { id: 'owl', name: 'Barred owl', cat: 'Birds' },
  { id: 'gar', name: 'Longnose gar', cat: 'Fish' },
  { id: 'mullet', name: 'Striped mullet', cat: 'Fish' },
];
const CAT = Object.fromEntries(SPECIES.map(s => [s.id, s.cat]));
export const PLANT_IDS = Object.keys(PLANTS);

// Task definitions. Each counts events; `uniq` counts distinct values only.
const TASKS = [
  { id: 'manatees', text: 'Spot 5 different manatees', goal: 5, ev: 'manateeSeen', uniq: true },
  { id: 'gator', text: 'Find an alligator', goal: 1, ev: 'see', match: v => v === 'gator' || v === 'juvgator' },
  { id: 'turtles', text: 'Spot 2 kinds of turtles or tortoises', goal: 2, ev: 'see', match: v => ['cooter', 'softshell', 'tortoise'].includes(v), uniq: true },
  { id: 'reptiles', text: 'Find 3 kinds of reptiles', goal: 3, ev: 'see', match: v => CAT[v] === 'Reptiles', uniq: true },
  { id: 'dewlap', text: 'See a green anole flash its dewlap', goal: 1, ev: 'dewlap' },
  { id: 'birds', text: 'Spot 3 kinds of birds', goal: 3, ev: 'see', match: v => CAT[v] === 'Birds', uniq: true },
  { id: 'showbaby', text: 'Show the baby 3 different animals', goal: 3, ev: 'showBaby', uniq: true },
  { id: 'orange', text: 'Smell the oranges by the Thursby House', goal: 1, ev: 'smell', match: v => v === 'orange' },
  { id: 'fern', text: 'Bring a resurrection fern back to life', goal: 1, ev: 'fern' },
  { id: 'plants', text: 'Get to know 4 plants', goal: 4, ev: 'plant', uniq: true },
  { id: 'needs', text: 'Take care of 4 of the baby\'s needs', goal: 4, ev: 'needMet' },
  { id: 'nap', text: 'Help the baby fall asleep', goal: 1, ev: 'nap' },
  { id: 'benches', text: 'Rest on 2 different benches', goal: 2, ev: 'bench', uniq: true },
  { id: 'signs', text: 'Read 3 signs', goal: 3, ev: 'sign', uniq: true },
  { id: 'photos', text: 'Take 3 photos', goal: 3, ev: 'photo' },
  { id: 'ranger', text: 'Ask Ranger Dee about the spring', goal: 1, ev: 'topic', match: v => v === 'Ranger Dee' },
  { id: 'chat', text: 'Chat with 3 different people', goal: 3, ev: 'chat', uniq: true },
  { id: 'mullet', text: 'See a mullet leap out of the water', goal: 1, ev: 'mullet' },
  { id: 'boil', text: 'Walk all the way to the Spring Boil', goal: 1, ev: 'zone', match: v => v === 'The Spring Boil' },
  { id: 'history', text: 'Visit the Thursby House', goal: 1, ev: 'zone', match: v => v === 'Thursby House' },
];

export const BADGES = [
  { id: 'reptiles', icon: '🐊', name: 'Reptile Ranger', desc: 'Find every reptile in the park.', test: s => SPECIES.filter(x => x.cat === 'Reptiles').every(x => s.seen[x.id]) },
  { id: 'birds', icon: '🪶', name: 'Bird Watcher', desc: 'Spot every bird in the field guide.', test: s => SPECIES.filter(x => x.cat === 'Birds').every(x => s.seen[x.id]) },
  { id: 'mammals', icon: '🦦', name: 'Mammal Spotter', desc: 'Find the manatee, the otter and the armadillo.', test: s => SPECIES.filter(x => x.cat === 'Mammals').every(x => s.seen[x.id]) },
  { id: 'fish', icon: '🐟', name: 'Fish Finder', desc: 'Spot the gar and the mullet.', test: s => SPECIES.filter(x => x.cat === 'Fish').every(x => s.seen[x.id]) },
  { id: 'botanist', icon: '🌿', name: 'Botanist', desc: 'Get to know every plant along the trail.', test: s => PLANT_IDS.every(p => s.plants[p]) },
  { id: 'counter', icon: '🔢', name: 'Manatee Counter', desc: 'Spot 10 different manatees in one visit.', test: s => (s.bestManatees || 0) >= 10 },
  { id: 'daily1', icon: '📋', name: 'Daily Helper', desc: 'Finish a whole day\'s task list.', test: s => (s.daysDone || 0) >= 1 },
  { id: 'daily3', icon: '🏅', name: 'Spring Regular', desc: 'Finish 3 daily task lists.', test: s => (s.daysDone || 0) >= 3 },
  { id: 'parent', icon: '🍼', name: 'Super Parent', desc: 'Take care of 25 of the baby\'s needs.', test: s => (s.needsMet || 0) >= 25 },
  { id: 'shutter', icon: '📸', name: 'Shutterbug', desc: 'Take 10 photos.', test: s => (s.photos || 0) >= 10 },
];

function today() { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }
function seeded(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; }; }

export class Progress {
  constructor(game) {
    this.g = game;
    this.s = { seen: {}, plants: {}, badges: {}, daily: null, daysDone: 0, needsMet: 0, photos: 0, bestManatees: 0 };
    try { const raw = JSON.parse(localStorage.getItem(KEY) || 'null'); if (raw) this.s = { ...this.s, ...raw }; } catch { /* ignore */ }
    this.manateesNow = new Set();
    this.ensureDaily();
  }
  save() { try { localStorage.setItem(KEY, JSON.stringify(this.s)); } catch { /* ignore */ } }
  ensureDaily() {
    const d = today();
    if (this.s.daily && this.s.daily.date === d) return;
    const r = seeded(d);
    const pool = TASKS.slice();
    const picks = [];
    while (picks.length < 5) picks.push(pool.splice(Math.floor(r() * pool.length), 1)[0].id);
    this.s.daily = { date: d, ids: picks, n: {}, uniq: {}, done: {}, finished: false };
    this.save();
  }
  get tasks() { return this.s.daily.ids.map(id => TASKS.find(t => t.id === id)).filter(Boolean); }
  get doneCount() { return this.tasks.filter(t => this.s.daily.done[t.id]).length; }

  /** Record a game event. type: see | watch | showBaby | plant | smell | fern | dewlap | needMet | nap | bench | sign | photo | topic | chat | mullet | zone | manateeSeen */
  track(type, value, ent) {
    const s = this.s;
    let changed = false;
    if (type === 'see' && value && !s.seen[value]) {
      s.seen[value] = true; changed = true;
      const sp = SPECIES.find(x => x.id === value);
      if (sp) this.g.ui.notify(`📖 New in your field guide: ${sp.name}`);
    }
    if (type === 'see' && value === 'manatee' && ent) { this.manateesNow.add(ent); this.track('manateeSeen', ent.uid); s.bestManatees = Math.max(s.bestManatees || 0, this.manateesNow.size); }
    if (type === 'plant' && !s.plants[value]) { s.plants[value] = true; changed = true; this.g.ui.notify(`📖 New plant in your field guide: ${PLANTS[value].name}`); }
    if (type === 'needMet') { s.needsMet = (s.needsMet || 0) + 1; changed = true; }
    if (type === 'photo') { s.photos = (s.photos || 0) + 1; changed = true; }
    // daily tasks
    const D = s.daily;
    for (const t of this.tasks) {
      if (D.done[t.id] || t.ev !== type) continue;
      if (t.match && !t.match(value)) continue;
      if (t.uniq) {
        const u = D.uniq[t.id] || (D.uniq[t.id] = []);
        const key = String(value);
        if (u.includes(key)) continue;
        u.push(key);
        D.n[t.id] = u.length;
      } else D.n[t.id] = (D.n[t.id] || 0) + 1;
      changed = true;
      if (D.n[t.id] >= t.goal) {
        D.done[t.id] = true;
        this.g.audio.chime();
        this.g.ui.notify(`✅ Task done: ${t.text}`, 4);
        if (!D.finished && this.doneCount === this.tasks.length) {
          D.finished = true; s.daysDone = (s.daysDone || 0) + 1;
          setTimeout(() => { this.g.audio.fanfare(); this.g.ui.toast('All tasks done! 🌟', 'come back tomorrow for a new list'); this.g.fx.hearts(this.g.player.x, this.g.player.y - 30, 10); }, 800);
        }
      }
    }
    for (const b of BADGES) if (!s.badges[b.id] && b.test(s)) { s.badges[b.id] = true; changed = true; setTimeout(() => { this.g.audio.fanfare(); this.g.ui.notify(`${b.icon} Badge earned: ${b.name}!`, 5); }, 400); }
    if (changed) { this.save(); this.g.ui.refreshTasks?.(); }
  }

  renderTasks(el) {
    const D = this.s.daily;
    el.innerHTML = `<p class="pnote">Today's list — a new one every day. ${D.finished ? '<b>All done! 🌟</b>' : `${this.doneCount} of ${this.tasks.length} done.`}</p>` +
      this.tasks.map(t => {
        const n = Math.min(t.goal, D.n[t.id] || 0), done = D.done[t.id];
        return `<div class="task ${done ? 'done' : ''}"><span class="check">${done ? '✓' : ''}</span><span class="tt">${t.text}</span><span class="bar"><i style="width:${(n / t.goal) * 100}%"></i></span><small>${n}/${t.goal}</small></div>`;
      }).join('') + `<p class="pnote">Daily lists finished: <b>${this.s.daysDone || 0}</b></p>`;
  }
  renderGuide(el, tab, portraits) {
    const s = this.s;
    let html = '';
    if (tab === 'animals') {
      for (const cat of ['Mammals', 'Reptiles', 'Birds', 'Fish']) {
        const list = SPECIES.filter(x => x.cat === cat);
        html += `<h3>${cat} <small>${list.filter(x => s.seen[x.id]).length}/${list.length}</small></h3><div class="ggrid">` +
          list.map(x => s.seen[x.id] ? `<div class="gcard"><img src="${portraits(x.id) || ''}" alt=""><b>${x.name}</b></div>` : '<div class="gcard locked"><div class="q">?</div><b>Not yet found</b></div>').join('') + '</div>';
      }
    } else if (tab === 'plants') {
      html = `<h3>Plants <small>${PLANT_IDS.filter(p => s.plants[p]).length}/${PLANT_IDS.length}</small></h3><div class="ggrid">` +
        PLANT_IDS.map(p => s.plants[p] ? `<div class="gcard"><img src="${portraits('plant:' + p) || ''}" alt=""><b>${PLANTS[p].name}</b><small>${PLANTS[p].facts[0]}</small></div>` : '<div class="gcard locked"><div class="q">?</div><b>Not yet found</b></div>').join('') + '</div>';
    } else {
      html = '<div class="ggrid">' + BADGES.map(b => `<div class="gcard ${s.badges[b.id] ? 'badge' : 'locked'}"><div class="q">${s.badges[b.id] ? b.icon : '🔒'}</div><b>${b.name}</b><small>${b.desc}</small></div>`).join('') + '</div>';
      html += `<p class="pnote">Needs cared for: <b>${s.needsMet || 0}</b> · Photos: <b>${s.photos || 0}</b> · Most manatees in one visit: <b>${s.bestManatees || 0}</b></p>`;
    }
    el.innerHTML = html;
  }
}
