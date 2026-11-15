// Character customizer: parent body, face, hair and outfit; baby looks; carrier style.
import { OPTIONS, drawHuman, drawBabyHead, randomLook, defaultLook } from './figures.js?v=20261116a';

const $ = id => document.getElementById(id);

export const BABY_NAMES = ['Bean', 'Juniper', 'Milo', 'Ava', 'Theo', 'Luna', 'Ezra', 'Willow', 'Kai', 'Nova', 'Otis', 'Iris', 'Finn', 'Hazel', 'Arlo', 'Maya',
  'Leo', 'Rosie', 'Jasper', 'Wren', 'Mateo', 'Ivy', 'Sage', 'Remy', 'Zuri', 'Ollie', 'Pearl', 'Felix', 'Aria', 'Rio', 'Poppy', 'Ezekiel', 'Coral', 'Bodhi',
  'Esme', 'Nico', 'Lila', 'Emmett', 'Marisol', 'Cyrus', 'Daisy', 'Amara', 'Silas', 'Indie', 'Rafael', 'Tallulah', 'Koa', 'Mabel', 'Ellis', 'Priya'];
export const randomName = () => BABY_NAMES[(Math.random() * BABY_NAMES.length) | 0];

const TABS = [
  ['Parent', 'parent', ['height', 'build', 'skin', 'eyes', 'facial', 'glasses', 'freckles']],
  ['Hair & hat', 'parent', ['hairStyle', 'hair', 'hat', 'hatColor']],
  ['Outfit', 'parent', ['top', 'topColor', 'bottom', 'bottomColor', 'shoes', 'shoeColor', 'pack', 'packColor']],
  ['Baby', 'baby', ['skin', 'eyes', 'hairStyle', 'hair', 'outfit', 'pattern', 'hat', 'hatColor', 'paci']],
  ['Carrier', 'carrier', ['type', 'color', 'pattern']],
];
const LABELS = {
  height: 'Height', build: 'Build', skin: 'Skin', eyes: 'Eyes', facial: 'Facial hair', glasses: 'Glasses', freckles: 'Freckles',
  hairStyle: 'Hairstyle', hair: 'Hair color', hat: 'Hat', hatColor: 'Hat color', top: 'Top', topColor: 'Top color',
  bottom: 'Bottoms', bottomColor: 'Bottoms color', shoes: 'Shoes', shoeColor: 'Shoe color', pack: 'Backpack', packColor: 'Pack color',
  outfit: 'Onesie', pattern: 'Pattern', paci: 'Pacifier', type: 'Style', color: 'Color',
};

const KEY = 'bs_look';
export function loadLook() {
  const d = defaultLook();
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s) return { parent: { ...d.parent, ...s.parent }, baby: { ...d.baby, ...s.baby }, carrier: { ...d.carrier, ...s.carrier } };
  } catch { /* ignore */ }
  return d;
}
export function saveLook(look) { try { localStorage.setItem(KEY, JSON.stringify(look)); } catch { /* ignore */ } }

export class Customizer {
  constructor(look, name, onChange) {
    this.look = look; this.name = name; this.onChange = onChange;
    this.tab = 0;
    $('custTabs').innerHTML = '';
    TABS.forEach(([label], i) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.addEventListener('click', () => { this.tab = i; this.render(); });
      $('custTabs').appendChild(b);
    });
    $('custRandom').addEventListener('click', () => { const r = randomLook(); Object.assign(this.look.parent, r.parent); Object.assign(this.look.baby, r.baby); Object.assign(this.look.carrier, r.carrier); this.changed(); });
    $('babyName').value = name;
    $('babyName').addEventListener('input', () => { this.name = $('babyName').value; });
    $('nameDice').addEventListener('click', () => { this.name = randomName(); $('babyName').value = this.name; });
    this.render();
  }
  changed() { this.render(); saveLook(this.look); this.onChange && this.onChange(this.look); }
  render() {
    document.querySelectorAll('#custTabs button').forEach((b, i) => b.classList.toggle('sel', i === this.tab));
    const [, group, keys] = TABS[this.tab];
    const box = $('custOpts'); box.innerHTML = '';
    for (const k of keys) {
      const row = document.createElement('div'); row.className = 'opt';
      const lab = document.createElement('label'); lab.textContent = LABELS[k]; row.appendChild(lab);
      const sw = document.createElement('div'); sw.className = 'swatches';
      for (const o of OPTIONS[group][k]) {
        const isPair = Array.isArray(o);
        const v = isPair ? o[1] : o;
        const b = document.createElement('button');
        if (isPair) { b.textContent = o[0]; b.className = 'txt'; } else b.style.background = v;
        if (this.look[group][k] === v) b.classList.add('sel');
        b.setAttribute('aria-label', `${LABELS[k]} ${isPair ? o[0] : v}`);
        b.addEventListener('click', () => { this.look[group][k] = v; if (k === 'type' && v === 'wrap') { /* wraps are front-only */ } this.changed(); });
        sw.appendChild(b);
      }
      row.appendChild(sw); box.appendChild(row);
    }
    this.drawPreview();
  }
  drawPreview() {
    const cv = $('preview');
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const W = cv.clientWidth || 220, H = cv.clientHeight || 240;
    cv.width = W * dpr; cv.height = H * dpr;
    const c = cv.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W, H);
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#cfe4ea'); g.addColorStop(0.75, '#e8efe0'); g.addColorStop(0.76, '#b8a888'); g.addColorStop(1, '#9a8a6a');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    const babyTab = TABS[this.tab][1] === 'baby';
    const sc = (H * 0.92) / 34;
    c.save(); c.translate(W * (babyTab ? 0.36 : 0.46), H * 0.97); c.scale(sc, sc);
    const back = this.look.carrier.type === 'frame';
    drawHuman(c, 0, 0, this.look.parent, { dir: 1, state: 'idle', t: 0, baby: { look: this.look.baby, face: 'content', hatOn: true }, carrier: this.look.carrier, babyPos: back ? 'back' : 'front' });
    c.restore();
    if (!babyTab) {
      // close-up of the face
      const cx = W * 0.8, cy = H * 0.19, R = Math.min(W, H) * 0.17;
      c.save(); c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2);
      c.fillStyle = '#f2efe6'; c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 3; c.stroke(); c.clip();
      const k = R / 3.4, Hh = this.look.parent.height || 1;
      c.translate(cx - 0.6 * k, cy + 28.6 * Hh * k); c.scale(k, k);
      drawHuman(c, 0, 0, this.look.parent, { dir: 1, state: 'idle', t: 0 });
      c.restore();
    }
    if (babyTab) {
      c.save(); c.translate(W * 0.76, H * 0.26); c.scale(sc * 1.7, sc * 1.7);
      drawBabyHead(c, 0, 0, 2.3, 'content', { ...this.look.baby, hatOn: true }, -1);
      c.restore();
    }
  }
}
