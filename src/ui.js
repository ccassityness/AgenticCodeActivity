// DOM-based UI on top of the canvas: bubbles, menus, dialogue, bag, journal, album, HUD.
import { ITEMS, itemIcon, LITTER } from './items.js';
import { NEEDS } from './baby.js';

const $ = id => document.getElementById(id);
const heartsHTML = h => {
  let out = '';
  for (let i = 1; i <= 5; i++) out += h >= i ? '<b class="h full">♥</b>' : h >= i - 0.5 ? '<b class="h half">♥</b>' : '<b class="h">♥</b>';
  return out;
};

export class UI {
  constructor(game) {
    this.g = game;
    this.bubbles = [];
    this.menuEl = $('menu');
    this.dlgEl = $('dialogue');
    this.dlg = null;
    this.toastTimer = null;
    this.thought = null;
    this.bagMode = null;
    this.bagSel = -1;
    this.journalTab = 'wildlife';

    $('menuClose').addEventListener('click', () => this.closeMenu());
    $('menuBack').addEventListener('click', () => { const b = this.menuBackFn; if (b) b(); });
    this.dlgEl.addEventListener('pointerdown', e => { e.stopPropagation(); if (!e.target.closest('#dlgChoices')) this.advance(); });
    for (const el of [this.menuEl, $('hud'), $('bag'), $('journal'), $('album'), $('map')]) el.addEventListener('pointerdown', e => e.stopPropagation());
    $('mapClose').onclick = () => { $('map').hidden = true; };
    $('map').addEventListener('click', e => { if (e.target.id === 'map') $('map').hidden = true; });
    $('bagClose').onclick = () => this.closeBag();
    $('journalClose').onclick = () => { $('journal').hidden = true; };
    document.querySelectorAll('#journalTabs button').forEach(b => b.addEventListener('click', () => this.openJournal(b.dataset.tab)));
    $('bag').addEventListener('click', e => { if (e.target.id === 'bag') this.closeBag(); });
    $('journal').addEventListener('click', e => { if (e.target.id === 'journal') $('journal').hidden = true; });
  }

  get busy() { return !this.menuEl.hidden || !this.dlgEl.hidden || this.panelOpen || this.g.minigames?.on; }
  get panelOpen() { return !$('bag').hidden || !$('journal').hidden || !$('album').hidden || !$('map').hidden; }

  setStamina(v, running) {
    const bar = $('staminaFill');
    const w = Math.round(v) + '%';
    if (bar.style.width !== w) bar.style.width = w;
    bar.className = v < 15 ? 'low' : running ? 'run' : '';
  }

  // ----- trail map -----
  openMap() {
    this.closeMenu();
    const g = this.g, j = g.journal.s;
    const cv = $('mapCanvas');
    const W = 640, H = 300, dpr = 2;
    cv.width = W * dpr; cv.height = H * dpr;
    const c = cv.getContext('2d');
    c.scale(dpr, dpr);
    c.fillStyle = '#f3e3c0'; c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(160,110,60,0.15)'; c.lineWidth = 1;
    for (let x = 0; x < W; x += 20) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
    for (let y = 0; y < H; y += 20) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    const T = g.areas.trail;
    const mx = x => 30 + x / T.width * (W - 60), my = y => 60 + (y - 90) * 0.9;
    // amphitheater shading
    c.fillStyle = 'rgba(217,118,79,0.25)';
    c.beginPath(); c.moveTo(mx(780), my(100)); for (let x = 780; x <= 3760; x += 20) c.lineTo(mx(x), my(T.groundY(x))); c.lineTo(mx(3760), my(100)); c.fill();
    c.strokeStyle = '#8a5a32'; c.lineWidth = 3; c.setLineDash([7, 4]);
    c.beginPath(); for (let x = 0; x <= T.width; x += 10) c.lineTo(mx(x), my(T.groundY(x))); c.stroke();
    c.setLineDash([]);
    c.font = 'bold 12px Nunito, sans-serif'; c.fillStyle = '#4a2e1e'; c.textAlign = 'center';
    for (const [name, x, dy] of [['Sunrise Point', 400, -12], ["Queen's Garden", 1850, -14], ['Wall Street', 2760, 22], ["Thor's Hammer", 3420, -12], ['Sunset Point', 3820, -12], ['Rim Trail', 4500, -12]]) c.fillText(name, mx(x), my(T.groundY(x)) + dy);
    const spots = [['seep', 2065, 'Hidden Seep'], ['bridges', 2400, 'Two Bridges'], ['overlook', 4565, 'Moonlit Overlook']];
    for (const [id, x, name] of spots) {
      const px = mx(x) + (id === 'bridges' ? 40 : id === 'seep' ? -30 : 0), py = my(T.groundY(x)) + (id === 'overlook' ? -40 : 50);
      c.strokeStyle = '#8a5a32'; c.lineWidth = 1.5; c.setLineDash([3, 3]);
      c.beginPath(); c.moveTo(mx(x), my(T.groundY(x))); c.lineTo(px, py); c.stroke(); c.setLineDash([]);
      c.fillStyle = j.areas[id] ? '#3f8f5a' : '#b8a080';
      c.beginPath(); c.arc(px, py, 9, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fff'; c.font = 'bold 11px sans-serif'; c.fillText(j.areas[id] ? '✓' : '?', px, py + 4);
      c.fillStyle = '#4a2e1e'; c.font = '11px Nunito, sans-serif'; c.fillText(j.areas[id] ? name : '???', px, py + (id === 'overlook' ? -14 : 22));
    }
    // you are here
    let yx = g.player.x;
    if (g.area.id !== 'trail') yx = spots.find(s => s[0] === g.area.id)?.[1] ?? yx;
    const px = mx(yx), py = my(T.groundY(yx));
    c.fillStyle = '#d4504f'; c.beginPath(); c.arc(px, py, 6 + Math.sin(g.now * 4), 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke();
    c.fillStyle = '#d4504f'; c.font = 'bold 11px sans-serif'; c.fillText('You', px, py - 10);
    const pages = Object.keys(j.pages || {}).length;
    $('mapInfo').innerHTML = `📜 Diary pages: <b>${pages}/6</b> · 🧭 Hidden places: <b>${Object.keys(j.areas || {}).length}/3</b> · 🐾 Animals: <b>${Object.keys(j.seen).length}/13</b>`;
    $('map').hidden = false;
  }

  // ----- speech bubbles anchored to world positions -----
  bubble(anchor, text, { dur = 2.4, cls = '' } = {}) {
    const el = document.createElement('div');
    el.className = 'bubble ' + cls;
    el.textContent = text;
    $('bubbles').appendChild(el);
    const b = { el, anchor, life: dur };
    this.bubbles.push(b);
    this.positionBubble(b);
    return b;
  }
  say(tag, anchor, text, opts) {
    for (const b of this.bubbles) if (b.tag === tag) b.life = Math.min(b.life, 0.01);
    const b = this.bubble(anchor, text, opts);
    b.tag = tag;
    return b;
  }
  positionBubble(b, dy = 0) {
    const p = b.anchor();
    if (!p) { b.el.style.display = 'none'; return; }
    const s = this.g.toScreen(p.x, p.y);
    b.el.style.display = '';
    b.el.style.left = `${s.x}px`;
    b.el.style.top = `${s.y + dy}px`;
  }
  update(dt) {
    let babyTalking = false;
    for (const b of this.bubbles) {
      b.life -= dt;
      if (b.life <= 0 && !b.dead) {
        b.dead = true;
        b.el.classList.add('fade');
        setTimeout(() => b.el.remove(), 450);
      }
      if (!b.dead) { this.positionBubble(b); if (b.tag === 'baby') babyTalking = true; }
    }
    this.bubbles = this.bubbles.filter(b => !b.dead || b.el.isConnected);
    if (this.thought) {
      const p = this.g.babyPos();
      const s = this.g.toScreen(p.x - this.g.player.dir * 14, p.y - 4);
      this.thought.style.left = `${s.x}px`;
      this.thought.style.top = `${s.y - (babyTalking ? 26 : 0)}px`;
    }
  }

  // ----- baby need indicator -----
  needChanged() {
    const b = this.g.baby;
    const n = b.need;
    const icon = $('needIcon');
    icon.textContent = n ? NEEDS[n.id].icon : b.napping ? '💤' : '';
    icon.className = n ? 'l' + n.level : '';
    if (n) {
      if (!this.thought) {
        this.thought = document.createElement('div');
        this.thought.className = 'bubble thought';
        this.thought.addEventListener('pointerdown', e => { e.stopPropagation(); this.g.audio.unlock(); this.g.openBabyMenu(); });
        $('bubbles').appendChild(this.thought);
      }
      this.thought.textContent = NEEDS[n.id].icon;
      this.thought.className = 'bubble thought l' + n.level;
      this.thought.title = NEEDS[n.id].label;
    } else if (this.thought) {
      this.thought.remove();
      this.thought = null;
    }
    this.refreshBaby();
  }
  refreshBaby() {
    const b = this.g.baby;
    $('babyFace').src = this.g.babyPortrait();
    $('bondHearts').innerHTML = heartsHTML(this.g.journal.s.bond || 0);
    $('babyPanel').title = b.status[1];
  }

  // ----- toast & notifications -----
  toast(name, sub = '') {
    const el = $('toast');
    el.innerHTML = '';
    el.append(name);
    if (sub) { const s = document.createElement('small'); s.textContent = sub; el.append(s); }
    el.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }
  notify(text, dur = 3.2) {
    const box = $('notes');
    const el = document.createElement('div');
    el.className = 'note';
    el.textContent = text;
    box.appendChild(el);
    while (box.children.length > 4) box.firstChild.remove();
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 450); }, dur * 1000);
  }

  // ----- action menu -----
  openMenu(title, actions, opts = {}) {
    this.closeDialogue(false);
    $('menuTitle').textContent = title;
    const p = $('menuPortrait');
    p.hidden = !opts.portrait;
    if (opts.portrait) p.src = opts.portrait;
    $('menuBack').hidden = !opts.back;
    this.menuBackFn = opts.back || null;
    const box = $('menuActions');
    box.innerHTML = '';
    for (const a of actions) {
      const btn = document.createElement('button');
      btn.textContent = a.label;
      if (a.primary) btn.className = 'primary';
      btn.addEventListener('click', e => {
        e.stopPropagation();
        this.g.audio.pop();
        if (!a.keepOpen) this.closeMenu();
        a.run();
      });
      box.appendChild(btn);
    }
    this.menuEl.hidden = false;
  }
  closeMenu() { this.menuEl.hidden = true; }

  // ----- dialogue with portrait, hearts and optional choices -----
  dialogue(name, pages, onDone, portrait = null, hearts = null, choices = null) {
    if (this.dlg) { (this.dlgQueue || (this.dlgQueue = [])).push([name, pages, onDone, portrait, hearts, choices]); return; }
    this.closeMenu();
    if (typeof pages === 'string') pages = [pages];
    this.dlg = { pages, i: 0, shown: 0, onDone, choices };
    $('dlgName').textContent = name || '';
    $('dlgSide').className = portrait || name ? '' : 'none';
    $('dlgPortraitBox').style.display = portrait ? '' : 'none';
    if (portrait) $('dlgPortrait').src = portrait;
    $('dlgHearts').innerHTML = hearts == null ? '' : heartsHTML(hearts);
    $('dlgChoices').innerHTML = '';
    this.dlgEl.hidden = false;
    this.renderDlg();
  }
  choice(name, text, options, portrait = null) {
    this.dialogue(name, [text], null, portrait, null, options);
  }
  renderDlg() {
    const d = this.dlg;
    const page = d.pages[d.i];
    $('dlgText').textContent = page.slice(0, Math.floor(d.shown));
    const done = d.shown >= page.length;
    const last = d.i === d.pages.length - 1;
    $('dlgNext').style.visibility = done && !(last && d.choices) ? 'visible' : 'hidden';
    if (done && last && d.choices && !$('dlgChoices').children.length) {
      for (const c of d.choices) {
        const b = document.createElement('button');
        b.textContent = c.label;
        b.addEventListener('pointerdown', e => {
          e.stopPropagation();
          this.g.audio.pop();
          this.closeDialogue(false);
          c.run();
        });
        $('dlgChoices').appendChild(b);
      }
    }
  }
  advance() {
    const d = this.dlg;
    if (!d) return;
    const page = d.pages[d.i];
    if (d.shown < page.length) { d.shown = page.length; this.renderDlg(); return; }
    if (d.choices && d.i === d.pages.length - 1) return; // must pick a choice
    d.i++;
    d.shown = 0;
    if (d.i >= d.pages.length) { this.closeDialogue(true); return; }
    this.renderDlg();
  }
  closeDialogue(fire) {
    if (!this.dlg) return;
    const d = this.dlg;
    this.dlg = null;
    this.dlgEl.hidden = true;
    if (fire && d.onDone) d.onDone();
    if (!fire) this.dlgQueue = [];
    else if (this.dlgQueue?.length && !this.dlg) this.dialogue(...this.dlgQueue.shift());
  }
  tickDialogue(dt) {
    const d = this.dlg;
    if (!d) return;
    const len = d.pages[d.i].length;
    if (d.shown < len) {
      const before = Math.floor(d.shown);
      d.shown = Math.min(len, d.shown + dt * 55);
      if (Math.floor(d.shown) !== before && before % 3 === 0) this.g.audio.blip();
      this.renderDlg();
    }
  }

  flash() {
    const f = $('flash');
    f.classList.add('on');
    requestAnimationFrame(() => requestAnimationFrame(() => f.classList.remove('on')));
  }

  // ----- clock -----
  setClock(t, sky) {
    const hours = (5.5 + t * 24) % 24;
    let h = Math.floor(hours), m = Math.floor((hours - h) * 6) * 10;
    const ampm = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    const str = `${h}:${String(m).padStart(2, '0')} ${ampm}`;
    if ($('clockTime').textContent !== str) {
      $('clockTime').textContent = str;
      $('clockLabel').textContent = sky.label;
      $('clockIcon').textContent = sky.night ? '🌙' : sky.label === 'Golden hour' || sky.label === 'Sunset' ? '🌅' : sky.label === 'Dawn' || sky.label === 'Dusk' ? '🌄' : '☀️';
    }
  }

  // ----- hotbar -----
  renderHotbar() {
    const bar = $('hotbar');
    const bag = this.g.bag;
    bar.innerHTML = '';
    const n = window.innerWidth < 700 ? 5 : 7;
    for (let i = 0; i < n; i++) {
      const s = bag.slots[i];
      const el = document.createElement('button');
      el.className = 'slot';
      if (s) {
        el.innerHTML = `<img src="${itemIcon(s.id)}" alt="${ITEMS[s.id].name}">${s.n > 1 ? `<span class="n">${s.n}</span>` : ''}`;
        el.title = ITEMS[s.id].name;
      }
      el.addEventListener('click', () => { this.g.audio.unlock(); if (s) this.quickUse(i); else this.openBag(); });
      bar.appendChild(el);
    }
    if (!$('bag').hidden) this.renderBag();
  }
  /** Tap on a hotbar slot: do the obvious thing with that item. */
  quickUse(i) {
    const g = this.g, s = g.bag.slots[i];
    if (!s) return;
    const def = ITEMS[s.id];
    if (def.cat === 'care' || def.cat === 'toy') { g.baby.useItem(s.id); return; }
    this.openBag();
    this.selectBagSlot(i);
  }

  // ----- bag -----
  openBag(opts = {}) {
    this.closeMenu();
    this.bagMode = opts.mode || 'view';
    this.bagTarget = opts.target || null;
    this.bagSel = -1;
    $('bagTitle').textContent = this.bagMode === 'give' ? `Give a gift to ${this.bagTarget.name}` : 'Bag';
    $('bag').hidden = false;
    this.renderBag();
    this.selectBagSlot(-1);
  }
  closeBag() { $('bag').hidden = true; this.bagMode = null; }
  renderBag() {
    const grid = $('bagGrid');
    grid.innerHTML = '';
    this.g.bag.slots.forEach((s, i) => {
      const el = document.createElement('button');
      el.className = 'slot' + (i === this.bagSel ? ' sel' : '');
      if (s) el.innerHTML = `<img src="${itemIcon(s.id)}" alt="${ITEMS[s.id].name}">${s.n > 1 ? `<span class="n">${s.n}</span>` : ''}`;
      el.addEventListener('click', () => this.selectBagSlot(i));
      grid.appendChild(el);
    });
  }
  selectBagSlot(i) {
    this.bagSel = i;
    const s = this.g.bag.slots[i];
    this.renderBag();
    const acts = $('bagActions');
    acts.innerHTML = '';
    if (!s) {
      $('bagIcon').src = '';
      $('bagName').textContent = this.bagMode === 'give' ? 'Pick something to give' : 'Tap an item';
      $('bagDesc').textContent = this.bagMode === 'give' ? 'Snacks make great gifts. Found something someone lost? Give it back!' : 'Things you pick up on the trail go here.';
      return;
    }
    const def = ITEMS[s.id];
    $('bagIcon').src = itemIcon(s.id);
    $('bagName').textContent = def.name + (s.n > 1 ? ` ×${s.n}` : '');
    let desc = def.desc;
    if (s.owner) { const o = this.g.entities.find(e => e.id === s.owner); desc += o ? ` It belongs to ${o.name}.` : ''; }
    $('bagDesc').textContent = desc;
    for (const a of this.itemActions(i, s, def)) {
      const b = document.createElement('button');
      b.textContent = a.label;
      if (a.primary) b.className = 'primary';
      b.addEventListener('click', () => { this.g.audio.pop(); a.run(); });
      acts.appendChild(b);
    }
  }
  itemActions(i, s, def) {
    const g = this.g, acts = [];
    const close = () => this.closeBag();
    if (this.bagMode === 'give') {
      acts.push({ label: '🎁 Give', primary: true, run: () => { close(); this.bagTarget.receive(g, i); } });
      return acts;
    }
    if (def.cat === 'care' || def.cat === 'toy') acts.push({ label: s.id === 'pacifier' || s.id === 'sock' ? '↩️ Give back to baby' : '👶 Use on baby', primary: true, run: () => { close(); g.baby.useItem(s.id); } });
    if (def.cat === 'snack') {
      acts.push({ label: '😋 Eat / drink', run: () => {
        g.bag.removeAt(i); close();
        g.ui.say('parent', () => g.parentHead(), s.id === 'water' ? '*gulp* Ahh!' : 'Mmm! Energy for the climb!');
        g.player.speedBoost = 20; g.audio.sip();
      } });
    }
    if (def.cat === 'litter') {
      const can = g.entities.find(e => e.name === 'Trash & recycling' && Math.abs(e.x - g.player.x) < 60);
      if (can) acts.push({ label: '🗑️ Throw away', primary: true, run: () => { close(); g.openEntity(can); } });
      else acts.push({ label: '🗑️ Find a trash can', run: () => g.ui.notify('Trash cans are at the trailheads and Navajo Loop.') });
    }
    if (def.cat === 'nature') {
      acts.push({ label: '👶 Show baby', run: () => { close(); g.baby.useItem(s.id); } });
      acts.push({ label: '🌿 Leave it be', primary: true, run: () => {
        g.bag.removeAt(i); close();
        g.journal.inc('leftBe');
        g.events.dropNature(g.player.x + g.player.dir * 8, s.id, true);
        g.ui.notify('🌿 Returned to nature. Leave No Trace!');
        if (g.journal.s.leftBe === 1) g.journal.first('helped leave a treasure for the next hiker');
      } });
    }
    if (def.cat === 'lost') {
      const owner = g.entities.find(e => e.id === s.owner);
      if (owner && Math.abs(owner.x - g.player.x) < 60) acts.push({ label: `🤝 Return to ${owner.name}`, primary: true, run: () => { close(); owner.receive(g, i); } });
      else acts.push({ label: '🔎 Find the owner', run: () => g.ui.notify(owner ? `${owner.name} is ${owner.x > g.player.x ? 'further along' : 'back down'} the trail.` : 'Someone on the trail must be missing this.') });
      acts.push({ label: '👶 Show baby', run: () => { close(); g.baby.useItem(s.id); } });
    }
    if (def.cat === 'keepsake') acts.push({ label: '👶 Show baby', run: () => { close(); g.baby.useItem(s.id); } });
    return acts;
  }

  // ----- journal -----
  openJournal(tab = this.journalTab) {
    this.closeMenu();
    this.journalTab = tab;
    document.querySelectorAll('#journalTabs button').forEach(b => b.classList.toggle('sel', b.dataset.tab === tab));
    this.g.journal.render(tab, $('journalBody'));
    $('journal').hidden = false;
  }
}

// ---------- photo album ----------
const KEY = 'hh_photos';
function loadPhotos() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } }
function savePhotos(list) {
  while (list.length) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch { list.shift(); }
  }
  try { localStorage.setItem(KEY, '[]'); } catch { /* storage unavailable */ }
  return false;
}
let sessionPhotos = null;

export function addPhoto(dataUrl) {
  const list = sessionPhotos ?? loadPhotos();
  list.push(dataUrl);
  while (list.length > 12) list.shift();
  if (!savePhotos(list.slice())) sessionPhotos = list;
}

export function openAlbum(onClose) {
  const panel = $('album'), grid = $('albumGrid'), view = $('albumView');
  const render = () => {
    const list = sessionPhotos ?? loadPhotos();
    grid.innerHTML = '';
    view.hidden = true;
    grid.hidden = false;
    $('albumEmpty').hidden = list.length > 0;
    list.slice().reverse().forEach((src, ri) => {
      const idx = list.length - 1 - ri;
      const img = document.createElement('img');
      img.src = src;
      img.alt = 'Trail photo ' + (idx + 1);
      img.addEventListener('click', () => {
        grid.hidden = true;
        view.hidden = false;
        $('albumImg').src = src;
        $('albumSave').href = src;
        $('albumDelete').onclick = () => {
          const l = sessionPhotos ?? loadPhotos();
          l.splice(idx, 1);
          if (!savePhotos(l.slice())) sessionPhotos = l;
          render();
        };
      });
      grid.appendChild(img);
    });
  };
  $('albumBack').onclick = render;
  $('albumClose').onclick = () => { panel.hidden = true; onClose && onClose(); };
  render();
  panel.hidden = false;
}
