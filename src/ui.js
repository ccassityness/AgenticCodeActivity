// DOM-based UI on top of the canvas: speech bubbles, menus, dialogue, toast, album.
const $ = id => document.getElementById(id);

export class UI {
  constructor(game) {
    this.g = game;
    this.bubbles = [];
    this.menuEl = $('menu');
    this.dlgEl = $('dialogue');
    this.dlg = null;
    this.toastTimer = null;

    $('menuClose').addEventListener('click', () => this.closeMenu());
    this.dlgEl.addEventListener('pointerdown', e => { e.stopPropagation(); this.advance(); });
    for (const el of [this.menuEl, $('hud')]) el.addEventListener('pointerdown', e => e.stopPropagation());
  }

  get busy() { return !this.menuEl.hidden || !this.dlgEl.hidden; }

  // ----- speech bubbles anchored to world positions -----
  bubble(anchor, text, { dur = 2.4, cls = '' } = {}) {
    const el = document.createElement('div');
    el.className = 'bubble ' + cls;
    el.textContent = text;
    $('bubbles').appendChild(el);
    const b = { el, anchor, life: dur, key: cls };
    this.bubbles.push(b);
    this.positionBubble(b);
    return b;
  }
  /** Replace any existing bubble that shares this anchor tag. */
  say(tag, anchor, text, opts) {
    for (const b of this.bubbles) if (b.tag === tag) b.life = Math.min(b.life, 0.01);
    const b = this.bubble(anchor, text, opts);
    b.tag = tag;
    return b;
  }
  positionBubble(b) {
    const p = b.anchor();
    if (!p) { b.el.style.display = 'none'; return; }
    const s = this.g.toScreen(p.x, p.y);
    b.el.style.display = '';
    b.el.style.left = `${s.x}px`;
    b.el.style.top = `${s.y}px`;
  }
  update(dt) {
    for (const b of this.bubbles) {
      b.life -= dt;
      if (b.life <= 0 && !b.dead) {
        b.dead = true;
        b.el.classList.add('fade');
        setTimeout(() => b.el.remove(), 450);
      }
      if (!b.dead) this.positionBubble(b);
    }
    this.bubbles = this.bubbles.filter(b => !b.dead || b.el.isConnected);
  }

  // ----- place-name toast -----
  toast(name, sub = '') {
    const el = $('toast');
    el.innerHTML = '';
    el.append(name);
    if (sub) { const s = document.createElement('small'); s.textContent = sub; el.append(s); }
    el.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  // ----- action menu -----
  openMenu(title, actions) {
    this.closeDialogue(false);
    $('menuTitle').textContent = title;
    const box = $('menuActions');
    box.innerHTML = '';
    for (const a of actions) {
      const btn = document.createElement('button');
      btn.textContent = a.label;
      btn.addEventListener('click', e => {
        e.stopPropagation();
        if (!a.keepOpen) this.closeMenu();
        this.g.audio.pop();
        a.run();
      });
      box.appendChild(btn);
    }
    this.menuEl.hidden = false;
    this.menuOnClose = null;
  }
  closeMenu() {
    if (this.menuEl.hidden) return;
    this.menuEl.hidden = true;
    const f = this.menuOnClose; this.menuOnClose = null;
    if (f) f();
  }

  // ----- dialogue box with typewriter text -----
  dialogue(name, pages, onDone) {
    this.closeMenu();
    if (typeof pages === 'string') pages = [pages];
    this.dlg = { pages, i: 0, shown: 0, onDone, timer: 0 };
    $('dlgName').textContent = name;
    $('dlgName').style.display = name ? '' : 'none';
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
    const page = d.pages[d.i];
    if (d.shown < page.length) { d.shown = page.length; this.renderDlg(); return; }
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
  }
  tickDialogue(dt) {
    const d = this.dlg;
    if (!d) return;
    const len = d.pages[d.i].length;
    if (d.shown < len) {
      d.shown = Math.min(len, d.shown + dt * 55);
      this.renderDlg();
    }
  }

  setMood(icon, title) {
    const m = $('mood');
    if (m.textContent !== icon) { m.textContent = icon; m.title = title; }
  }

  flash() {
    const f = $('flash');
    f.classList.add('on');
    requestAnimationFrame(() => requestAnimationFrame(() => f.classList.remove('on')));
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
let sessionPhotos = null; // fallback when storage is unavailable

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
  panel.onpointerdown = e => e.stopPropagation();
  render();
  panel.hidden = false;
}
