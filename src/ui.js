// DOM UI over the canvas: speech bubbles, the baby's thought bubble, menus, dialogue, toast,
// notifications, clock and photo album.
import { NEEDS } from './baby.js?v=20261116a';

const $ = id => document.getElementById(id);

export class UI {
  constructor(game) {
    this.g = game;
    this.bubbles = [];
    this.menuEl = $('menu');
    this.dlgEl = $('dialogue');
    this.dlg = null; this.dlgQueue = [];
    this.thought = null;
    $('menuClose').addEventListener('click', () => this.closeMenu());
    $('menuBack').addEventListener('click', () => { if (this.menuBackFn) this.menuBackFn(); });
    this.dlgEl.addEventListener('pointerdown', e => { e.stopPropagation(); if (!e.target.closest('#dlgChoices')) this.advance(); });
    for (const el of [this.menuEl, $('hud'), $('album'), $('custom'), $('tasks'), $('guide')]) el.addEventListener('pointerdown', e => e.stopPropagation());
    for (const id of ['tasks', 'guide']) { $(id + 'Close').onclick = () => { $(id).hidden = true; }; $(id).addEventListener('click', e => { if (e.target.id === id) $(id).hidden = true; }); }
    document.querySelectorAll('#guideTabs button').forEach(b => b.addEventListener('click', () => this.openGuide(b.dataset.tab)));
  }
  get busy() { return !this.menuEl.hidden || !this.dlgEl.hidden || this.panelOpen; }
  get panelOpen() { return !$('album').hidden || !$('custom').hidden || !$('tasks').hidden || !$('guide').hidden; }

  openTasks() { this.closeMenu(); this.g.progress.renderTasks($('tasksBody')); $('tasks').hidden = false; }
  openGuide(tab = this.guideTab || 'animals') {
    this.closeMenu(); this.guideTab = tab;
    document.querySelectorAll('#guideTabs button').forEach(b => b.classList.toggle('sel', b.dataset.tab === tab));
    this.g.progress.renderGuide($('guideBody'), tab, id => this.g.guidePortrait(id));
    $('guide').hidden = false;
  }
  refreshTasks() {
    const p = this.g.progress; if (!p) return;
    $('taskChip').textContent = `📋 ${p.doneCount}/${p.tasks.length}`;
    if (!$('tasks').hidden) p.renderTasks($('tasksBody'));
  }

  // ----- speech bubbles -----
  bubble(anchor, text, { dur = 2.4, cls = '' } = {}) {
    const el = document.createElement('div');
    el.className = 'bubble ' + cls;
    el.textContent = text;
    $('bubbles').appendChild(el);
    const b = { el, anchor, life: dur };
    this.bubbles.push(b);
    this.position(b);
    return b;
  }
  say(tag, anchor, text, opts) {
    for (const b of this.bubbles) if (b.tag === tag) b.life = Math.min(b.life, 0.01);
    const b = this.bubble(anchor, text, opts);
    b.tag = tag;
    return b;
  }
  position(b) {
    const p = b.anchor();
    if (!p) { b.el.style.display = 'none'; return; }
    const s = this.g.toScreen(p.x, p.y);
    b.el.style.display = '';
    b.el.style.left = `${s.x}px`; b.el.style.top = `${s.y}px`;
  }
  update(dt) {
    let babyTalking = false;
    for (const b of this.bubbles) {
      b.life -= dt;
      if (b.life <= 0 && !b.dead) { b.dead = true; b.el.classList.add('fade'); setTimeout(() => b.el.remove(), 450); }
      if (!b.dead) { this.position(b); if (b.tag === 'baby') babyTalking = true; }
    }
    this.bubbles = this.bubbles.filter(b => !b.dead || b.el.isConnected);
    if (this.thought) {
      const p = this.g.babyPos();
      const s = this.g.toScreen(p.x - this.g.player.dir * 12, p.y - 6);
      this.thought.style.left = `${s.x}px`;
      this.thought.style.top = `${s.y - (babyTalking ? 26 : 0)}px`;
    }
  }

  needChanged() {
    const b = this.g.baby, n = b.need;
    const icon = $('needIcon');
    icon.textContent = n ? NEEDS[n.id].icon : b.napping ? '💤' : '';
    icon.className = n ? 'l' + n.level : '';
    if (n) {
      if (!this.thought) {
        this.thought = document.createElement('div');
        this.thought.addEventListener('pointerdown', e => { e.stopPropagation(); this.g.audio.unlock(); this.g.openBabyMenu(); });
        $('bubbles').appendChild(this.thought);
      }
      this.thought.textContent = NEEDS[n.id].icon;
      this.thought.className = 'bubble thought l' + n.level;
      this.thought.title = NEEDS[n.id].label;
    } else if (this.thought) { this.thought.remove(); this.thought = null; }
    this.refreshBaby();
  }
  refreshBaby() {
    $('babyFace').src = this.g.babyPortrait();
    $('babyMood').textContent = this.g.baby.status[1];
  }

  toast(name, sub = '') {
    const el = $('toast');
    el.innerHTML = ''; el.append(name);
    if (sub) { const s = document.createElement('small'); s.textContent = sub; el.append(s); }
    el.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
  }
  notify(text, dur = 3.4) {
    const box = $('notes'), el = document.createElement('div');
    el.className = 'note'; el.textContent = text;
    box.appendChild(el);
    while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 450); }, dur * 1000);
  }

  // ----- action menu -----
  openMenu(title, actions, opts = {}) {
    this.closeDialogue(false);
    $('menuTitle').textContent = title;
    const p = $('menuPortrait');
    p.hidden = !opts.portrait; if (opts.portrait) p.src = opts.portrait;
    $('menuBack').hidden = !opts.back; this.menuBackFn = opts.back || null;
    const box = $('menuActions'); box.innerHTML = '';
    for (const a of actions) {
      const btn = document.createElement('button');
      btn.textContent = a.label;
      if (a.primary) btn.className = 'primary';
      btn.addEventListener('click', e => { e.stopPropagation(); this.g.audio.pop(); if (!a.keepOpen) this.closeMenu(); a.run(); });
      box.appendChild(btn);
    }
    this.menuEl.hidden = false;
  }
  closeMenu() { this.menuEl.hidden = true; }

  // ----- dialogue -----
  dialogue(name, pages, onDone, portrait = null) {
    if (this.dlg) { this.dlgQueue.push([name, pages, onDone, portrait]); return; }
    this.closeMenu();
    if (typeof pages === 'string') pages = [pages];
    this.dlg = { pages, i: 0, shown: 0, onDone };
    $('dlgName').textContent = name || '';
    $('dlgPortraitBox').style.display = portrait ? '' : 'none';
    if (portrait) $('dlgPortrait').src = portrait;
    this.dlgEl.hidden = false;
    this.renderDlg();
  }
  renderDlg() {
    const d = this.dlg;
    $('dlgText').textContent = d.pages[d.i].slice(0, Math.floor(d.shown));
    $('dlgNext').style.visibility = d.shown >= d.pages[d.i].length ? 'visible' : 'hidden';
  }
  advance() {
    const d = this.dlg;
    if (!d) return;
    if (d.shown < d.pages[d.i].length) { d.shown = d.pages[d.i].length; this.renderDlg(); return; }
    d.i++; d.shown = 0;
    if (d.i >= d.pages.length) { this.closeDialogue(true); return; }
    this.renderDlg();
  }
  closeDialogue(fire) {
    if (!this.dlg) return;
    const d = this.dlg;
    this.dlg = null; this.dlgEl.hidden = true;
    if (fire && d.onDone) d.onDone();
    if (!fire) this.dlgQueue = [];
    else if (this.dlgQueue.length && !this.dlg) this.dialogue(...this.dlgQueue.shift());
  }
  tickDialogue(dt) {
    const d = this.dlg;
    if (!d) return;
    const len = d.pages[d.i].length;
    if (d.shown < len) { d.shown = Math.min(len, d.shown + dt * 55); this.renderDlg(); }
  }

  flash() { const f = $('flash'); f.classList.add('on'); requestAnimationFrame(() => requestAnimationFrame(() => f.classList.remove('on'))); }

  setClock(t, sky) {
    const hours = (5.5 + t * 24) % 24;
    let h = Math.floor(hours); const m = Math.floor((hours - h) * 6) * 10;
    const ampm = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    const str = `${h}:${String(m).padStart(2, '0')} ${ampm}`;
    if ($('clockTime').textContent !== str) {
      $('clockTime').textContent = str;
      $('clockLabel').textContent = sky.label;
      $('clockIcon').textContent = sky.night ? '🌙' : sky.label === 'Golden hour' || sky.label === 'Sunset' ? '🌅' : sky.label === 'Dawn' || sky.label === 'Dusk' ? '🌄' : '☀️';
    }
  }
}

// ---------- photo album ----------
const KEY = 'bs_photos';
function loadPhotos() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } }
function savePhotos(list) {
  while (list.length) { try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch { list.shift(); } }
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
export function openAlbum() {
  const panel = $('album'), grid = $('albumGrid'), view = $('albumView');
  const render = () => {
    const list = sessionPhotos ?? loadPhotos();
    grid.innerHTML = ''; view.hidden = true; grid.hidden = false;
    $('albumEmpty').hidden = list.length > 0;
    list.slice().reverse().forEach((src, ri) => {
      const idx = list.length - 1 - ri;
      const img = document.createElement('img');
      img.src = src; img.alt = 'Photo ' + (idx + 1);
      img.addEventListener('click', () => {
        grid.hidden = true; view.hidden = false;
        $('albumImg').src = src; $('albumSave').href = src;
        $('albumDelete').onclick = () => { const l = sessionPhotos ?? loadPhotos(); l.splice(idx, 1); if (!savePhotos(l.slice())) sessionPhotos = l; render(); };
      });
      grid.appendChild(img);
    });
  };
  $('albumBack').onclick = render;
  $('albumClose').onclick = () => { panel.hidden = true; };
  render();
  panel.hidden = false;
}
