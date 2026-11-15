// Interactive plants at Blue Spring: smell, touch, water, show the baby, and learn about them.
import { Entity } from './entities.js?v=20261116a';
import { groundY, DECK_Y, WATER_Y } from './world.js?v=20261116a';
import { lin, rad, ellipse, circle, rng, shade, snapshot } from './color.js?v=20261116a';

const pick = a => a[(Math.random() * a.length) | 0];

// ---- painters (each draws with (0,0) at the base of the plant) ----
function paintOrange(c) {
  const r = rng(4);
  c.fillStyle = lin(c, -1, 0, 1.5, 0, [[0, '#7a6048'], [1, '#4a3828']]);
  c.beginPath(); c.moveTo(-1, 0); c.lineTo(-0.6, -9); c.lineTo(0.6, -9); c.lineTo(1.1, 0); c.fill();
  for (let i = 0; i < 9; i++) {
    const x = (r() - 0.5) * 16, y = -12 - r() * 12, s = 4 + r() * 4;
    c.fillStyle = rad(c, x - s * 0.3, y - s * 0.3, 0, s, [[0, '#4e7a3a'], [0.6, '#2e5a2a'], [1, '#1e3e1e']]);
    c.beginPath(); c.ellipse(x, y, s, s * 0.8, 0, 0, Math.PI * 2); c.fill();
  }
  for (let i = 0; i < 80; i++) { c.fillStyle = r() < 0.5 ? '#3e6a32' : '#5e8a42'; c.beginPath(); c.ellipse((r() - 0.5) * 22, -10 - r() * 15, 0.7, 0.4, r() * 3, 0, Math.PI * 2); c.fill(); }
  for (let i = 0; i < 14; i++) {
    const x = (r() - 0.5) * 18, y = -11 - r() * 12;
    c.fillStyle = rad(c, x - 0.3, y - 0.3, 0, 1.1, [[0, '#ffc060'], [1, '#e8801a']]); circle(c, x, y, 0.95); c.fill();
  }
}
function paintFernLog(c, green) {
  c.fillStyle = lin(c, 0, -3, 0, 0, [[0, '#7a6a58'], [1, '#4a3c30']]);
  c.beginPath(); c.roundRect(-11, -3, 22, 3, 1.5); c.fill();
  c.fillStyle = '#9a8a72'; c.beginPath(); c.ellipse(10.6, -1.5, 0.8, 1.5, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(110,140,70,0.6)'; c.beginPath(); c.ellipse(-3, -2.9, 5, 0.6, 0, 0, Math.PI * 2); c.fill();
  const r = rng(8);
  for (let i = 0; i < 16; i++) {
    const x = -9 + r() * 18, y = -3;
    if (green) {
      c.strokeStyle = r() < 0.5 ? '#5e8e3a' : '#78a848'; c.lineWidth = 0.22;
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 0.4, y - 2, x + (r() - 0.5) * 2, y - 3.5); c.stroke();
      for (let k = 1; k < 5; k++) { c.beginPath(); c.moveTo(x + 0.1 * k, y - k * 0.7); c.lineTo(x - 0.7, y - k * 0.7 - 0.3); c.moveTo(x + 0.1 * k, y - k * 0.7); c.lineTo(x + 0.8, y - k * 0.7 - 0.3); c.stroke(); }
    } else {
      c.strokeStyle = r() < 0.5 ? '#8a7a5a' : '#6a5e48'; c.lineWidth = 0.28;
      c.beginPath(); c.arc(x, y - 0.8, 0.6, 0, Math.PI * 1.6); c.stroke();
    }
  }
}
function paintBeautyberry(c) {
  const r = rng(12);
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.3;
    const L = 9 + r() * 5;
    const ex = Math.cos(a) * L * 0.8, ey = Math.sin(a) * L;
    c.strokeStyle = '#8a6a4a'; c.lineWidth = 0.3; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(ex * 0.3, ey * 0.8, ex, ey + 2); c.stroke();
    for (let k = 0; k < 4; k++) {
      const t = 0.3 + k * 0.18, px = ex * t * 1.05, py = ey * t * 0.9 + (k * 0.4);
      c.fillStyle = r() < 0.5 ? '#7a9a4a' : '#8aaa58';
      c.beginPath(); c.ellipse(px - 1.2, py, 1.4, 0.6, 0.3, 0, Math.PI * 2); c.fill(); c.beginPath(); c.ellipse(px + 1.2, py, 1.4, 0.6, -0.3, 0, Math.PI * 2); c.fill();
      for (let b = 0; b < 7; b++) { c.fillStyle = r() < 0.5 ? '#b0308a' : '#c84aa0'; circle(c, px + (r() - 0.5) * 1.4, py + 0.4 + (r() - 0.5) * 1.2, 0.32); c.fill(); }
    }
  }
}
function paintCoontie(c) {
  const r = rng(15);
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI * (0.15 + i / 8 * 0.7);
    const L = 5 + r() * 3;
    const ex = Math.cos(a) * L, ey = Math.sin(a) * L * 0.8;
    c.strokeStyle = '#3e5a2a'; c.lineWidth = 0.25; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(ex * 0.5, ey * 0.9, ex, ey); c.stroke();
    for (let k = 1; k < 9; k++) {
      const t = k / 9, px = ex * t, py = ey * t + t * t;
      c.strokeStyle = r() < 0.5 ? '#2e5a2a' : '#3e6e32'; c.lineWidth = 0.3;
      c.beginPath(); c.moveTo(px, py); c.lineTo(px - 0.6, py - 0.9); c.moveTo(px, py); c.lineTo(px + 0.6, py - 0.9); c.stroke();
    }
  }
  c.fillStyle = rad(c, 0, -1.6, 0, 1.4, [[0, '#f08a4a'], [1, '#b8501e']]); c.beginPath(); c.ellipse(0, -1.4, 0.8, 1.4, 0, 0, Math.PI * 2); c.fill();
}
function paintWildCoffee(c) {
  const r = rng(21);
  c.strokeStyle = '#6a5a3a'; c.lineWidth = 0.35; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(0, 0); c.lineTo((i - 1) * 3, -10 - r() * 3); c.stroke(); }
  for (let i = 0; i < 26; i++) {
    const x = (r() - 0.5) * 12, y = -3 - r() * 11;
    c.fillStyle = lin(c, x - 1.5, y - 1, x + 1.5, y + 1, [[0, '#5e9a48'], [1, '#2e5e2a']]);
    c.beginPath(); c.ellipse(x, y, 1.8, 0.85, (r() - 0.5) * 1.2, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.25)'; c.lineWidth = 0.1; c.beginPath(); c.moveTo(x - 1.2, y); c.lineTo(x + 1.2, y); c.stroke();
  }
  for (let i = 0; i < 9; i++) { c.fillStyle = r() < 0.6 ? '#c0302a' : '#e8803a'; circle(c, (r() - 0.5) * 9, -4 - r() * 8, 0.42); c.fill(); }
}
function paintIris(c) {
  const r = rng(30);
  for (let i = 0; i < 9; i++) {
    const x = (i - 4) * 0.7, h = 7 + r() * 5, lean = (r() - 0.5) * 1.6;
    c.fillStyle = r() < 0.5 ? '#5e8a6a' : '#6e9a78';
    c.beginPath(); c.moveTo(x - 0.35, 0); c.quadraticCurveTo(x + lean * 0.4, -h * 0.6, x + lean, -h); c.quadraticCurveTo(x + lean * 0.5 + 0.2, -h * 0.6, x + 0.35, 0); c.fill();
  }
  for (const [x, h] of [[0.6, 10], [-1.8, 9]]) {
    c.strokeStyle = '#5e7a5a'; c.lineWidth = 0.25; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, -h); c.stroke();
    c.fillStyle = '#6a5ab0'; c.beginPath(); c.ellipse(x, -h - 0.6, 0.4, 0.9, 0, 0, Math.PI * 2); c.fill();
  }
}

const _c = {};
function blit(ctx, key, w, h, x, y, draw) {
  if (!_c[key]) { const s = 5, cv = document.createElement('canvas'); cv.width = w * s; cv.height = h * s; const g = cv.getContext('2d'); g.scale(s, s); g.translate(w / 2, h); draw(g); _c[key] = cv; }
  ctx.drawImage(_c[key], x - w / 2, y - h, w, h);
}

// ---- plant data ----
export const PLANTS = {
  oak: { name: 'Live oak', facts: ['Southern live oaks keep their leaves almost all year, which is how they got their name.', 'Their wide, low branches can live for hundreds of years, and they hold whole gardens of ferns, moss and air plants.'], verbs: [['🤗 Hug the old oak', 'You wrap an arm around the rough, furrowed bark. It\'s been here longer than anyone you know.', 'thing'], ['✋ Feel the bark', 'Deep ridges, cool and rough. Tiny ants march along a crack.', 'thing']] },
  moss: { name: 'Spanish moss', facts: ['Spanish moss isn\'t a moss at all — it\'s a bromeliad, a cousin of the pineapple.', 'It doesn\'t harm the trees. It drinks water and nutrients straight from the humid air.'], verbs: [['✋ Feel a strand', 'Soft and springy, like a gray-green beard. (Best to look, not wear — chiggers like to hide in it!)', 'thing']] },
  palm: { name: 'Sabal palm', facts: ['The sabal, or cabbage palm, is Florida\'s state tree.', 'Each fan-shaped leaf has a curved midrib, so the leaf droops at the tips.'], verbs: [['👂 Listen to the fronds', 'The breeze clatters through the big fans with a dry, papery rustle.', 'view']] },
  palmetto: { name: 'Saw palmetto', facts: ['Saw palmettos grow in clumps that can be hundreds — even thousands — of years old, sprouting again and again from the same underground stems.', 'Their berries are an important fall food for bears, deer and birds.'], verbs: [['✋ Touch a fan (carefully!)', 'The leaf stems have tiny saw-like teeth — that\'s where the name comes from. Gently does it.', 'thing']] },
  cypress: { name: 'Bald cypress', facts: ['Bald cypress trees drop their needles in winter — that\'s the "bald" part.', 'The knobby "knees" around their base poke up from the roots. Scientists still debate exactly what they\'re for!'], verbs: [['👀 Count the knees', 'You count seven knobby cypress knees poking out of the mud.', 'thing']] },
  orange: { name: 'Orange tree', facts: ['Louis Thursby grew oranges here in the 1870s and shipped them out by steamboat on the St. Johns River.', 'A hard freeze in the winter of 1894–95 wiped out many Florida groves, including much of the citrus along this river.'], verbs: [['👃 Smell the oranges', 'Sweet and sharp, like sunshine. The baby\'s nose wrinkles happily.', 'thing', 'smell']] },
  fern: { name: 'Resurrection fern', facts: ['Resurrection fern can lose almost all its water and curl up brown and "dead" during dry spells.', 'Add rain and within hours it unfurls, green and alive again. It grows on oak limbs all over the park.'], verbs: [] },
  beautyberry: { name: 'American beautyberry', facts: ['Those startling purple berries ripen in late summer and last into winter, feeding mockingbirds, cardinals and other birds.', 'People have long crushed the leaves and rubbed them on skin as a folk mosquito repellent.'], verbs: [['🫐 Look at the berries', 'Clusters of glossy magenta-purple berries ring each stem. They almost look painted on.', 'flower']] },
  coontie: { name: 'Coontie', facts: ['Coontie is Florida\'s only native cycad, a plant lineage older than the dinosaurs.', 'Native peoples and later settlers made flour from its starchy root — but only after careful processing, because the raw plant is toxic.'], verbs: [['✋ Feel the fronds', 'Stiff, leathery leaflets, like a tiny palm. A bright orange cone sits in the middle.', 'thing']] },
  coffee: { name: 'Wild coffee', facts: ['Wild coffee is a cousin of the coffee plant, but its berries have no caffeine.', 'Birds love the red berries, and the glossy leaves brighten the shady forest floor.'], verbs: [['✋ Feel the glossy leaves', 'Shiny and waxy, with deep veins. Smooth as a ribbon.', 'thing']] },
  iris: { name: 'Blue flag iris', facts: ['Blue flag iris grows with its feet in the water along Florida\'s springs and marshes.', 'In spring it opens big violet-blue flowers — look for the buds already forming.'], verbs: [['👀 Look for buds', 'A few tight violet buds are tucked between the sword-shaped leaves. Spring is coming!', 'flower']] },
  eelgrass: { name: 'Eelgrass (tape grass)', facts: ['The long ribbon-like leaves on the spring bottom are eelgrass, also called tape grass.', 'It\'s a favorite manatee food — and it shelters fish, snails and the tiny creatures that feed them.'], verbs: [['👀 Watch the eelgrass sway', 'Ribbons of green lean and ripple with the current, all in the same direction, like hair in the wind.', 'view']] },
};

export class Plant extends Entity {
  constructor(o) {
    const d = PLANTS[o.pid];
    super({ kind: 'plant', name: d.name, reach: 18, w: 14, h: 14, ...o });
    this.d = d; this.green = false; this.greenT = 0;
    this.under = o.pid === 'eelgrass';
  }
  update(dt) { if (this.greenT > 0) { this.greenT -= dt; if (this.greenT <= 0) this.green = false; } }
  look(g) {
    g.track('plant', this.pid);
    g.ui.dialogue(this.d.name, this.d.facts, null, this.portrait());
  }
  actions(g) {
    const acts = [{ label: '🔎 Look closely', primary: true, run: () => this.look(g) }];
    for (const [label, text, react, tag] of this.d.verbs) acts.push({ label, run: () => {
      g.track('plant', this.pid); if (tag) g.track(tag, this.pid);
      g.ui.dialogue(this.d.name, [text]);
      setTimeout(() => g.baby.react(react), 600);
    } });
    if (this.pid === 'fern') acts.push({ label: this.green ? '🌿 Admire the fern' : '💧 Sprinkle some water', run: () => {
      g.track('plant', 'fern');
      if (!this.green) { this.green = true; this.greenT = 120; g.audio.sip(); g.track('fern'); g.fx.sparkles(this.x, this.y - 4, 6); g.ui.dialogue(this.d.name, ['You sprinkle a little water from your bottle onto the curled brown fronds…', '…and slowly, they begin to uncurl, turning green again. It really is a resurrection!']); }
      else g.ui.dialogue(this.d.name, ['Green and glossy now. It\'ll curl up again when the air dries out.']);
      setTimeout(() => g.baby.react('thing'), 800);
    } });
    acts.push({ label: '👶 Show baby', run: () => { g.track('plant', this.pid); g.baby.react(['orange', 'beautyberry', 'iris'].includes(this.pid) ? 'flower' : 'thing'); } });
    return acts;
  }
  portrait() {
    if (this._p) return this._p;
    const draws = { orange: [26, 26, paintOrange], beautyberry: [22, 18, paintBeautyberry], coontie: [16, 10, paintCoontie], coffee: [16, 16, paintWildCoffee], iris: [10, 13, paintIris], fern: [24, 9, c => paintFernLog(c, true)] };
    const dd = draws[this.pid];
    if (dd) this._p = snapshot(dd[0], dd[1] + 1, c => { c.fillStyle = '#e8efe6'; c.fillRect(0, 0, dd[0], dd[1] + 1); c.translate(dd[0] / 2, dd[1]); dd[2](c); }, 5);
    return this._p;
  }
  draw(ctx, g, ox, oy) {
    const x = this.x - ox, y = this.y - oy;
    switch (this.pid) {
      case 'orange': blit(ctx, 'orange', 26, 26, x, y, paintOrange); break;
      case 'fern': blit(ctx, this.green ? 'fernG' : 'fernB', 24, 9, x, y, c => paintFernLog(c, this.green)); break;
      case 'beautyberry': blit(ctx, 'bb', 22, 18, x, y, paintBeautyberry); break;
      case 'coontie': blit(ctx, 'coontie', 16, 10, x, y, paintCoontie); break;
      case 'coffee': blit(ctx, 'coffee', 16, 16, x, y, paintWildCoffee); break;
      case 'iris': blit(ctx, 'iris', 10, 13, x, y, paintIris); break;
      default: break; // big plants are part of the painted scenery; this is just their tap area
    }
  }
}

/** Interactive flora placed along the trail. Big trees reuse the painted scenery's positions. */
export function plantsFor(world) {
  const P = [];
  const near = (type, x0, x1) => world.decor.find(o => o.type === type && o.x > x0 && o.x < x1);
  const oak = near('oak', 1100, 1500) || { x: 1250, h: 60, base: DECK_Y + 6 };
  P.push(new Plant({ pid: 'oak', x: oak.x, y: DECK_Y - 2, w: 14, h: 30 }));
  P.push(new Plant({ pid: 'moss', x: oak.x + 18, y: DECK_Y - 30, w: 16, h: 24 }));
  const palm = near('palm', 2350, 2700) || { x: 2440, h: 60 };
  P.push(new Plant({ pid: 'palm', x: palm.x, y: DECK_Y - 2, w: 10, h: 40 }));
  const cyp = near('cypress', 1700, 3100) || { x: 2000 };
  P.push(new Plant({ pid: 'cypress', x: cyp.x, y: DECK_Y - 2, w: 10, h: 40 }));
  const pal = near('palmetto', 150, 380) || { x: 260 };
  P.push(new Plant({ pid: 'palmetto', x: pal.x, y: groundY(pal.x) + 2, w: 14, h: 10 }));
  P.push(new Plant({ pid: 'orange', x: 540, w: 22, h: 26 }));
  P.push(new Plant({ pid: 'coontie', x: 745, w: 14, h: 8 }));
  P.push(new Plant({ pid: 'fern', x: 840, w: 22, h: 7 }));
  P.push(new Plant({ pid: 'beautyberry', x: 1060, y: DECK_Y - 0.5, w: 18, h: 16 }));
  P.push(new Plant({ pid: 'coffee', x: 1640, y: DECK_Y - 0.5, w: 14, h: 15 }));
  P.push(new Plant({ pid: 'iris', x: 2250, y: WATER_Y + 1, w: 10, h: 12 }));
  P.push(new Plant({ pid: 'eelgrass', x: 1900, y: 136, w: 30, h: 12, reach: 0 }));
  return P;
}
