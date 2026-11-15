// Area definitions: the main trail and three hidden side areas to discover.
import { Area, YTOP } from './world.js';
import { rng } from './color.js';

function trailDecor(a) {
  const D = [];
  const r = rng(5);
  const rimGap = x => (x > 320 && x < 490) || (x > 3740 && x < 3900);
  for (let x = 10; x < a.width; x += 26 + r() * 60) {
    if (a.isRim(x) && !rimGap(x)) D.push({ type: 'pine', x, base: a.groundY(x) + 3, h: 40 + r() * 50, seed: (r() * 1e6) | 0, z: r() < 0.5 ? 0 : 2 });
  }
  for (let x = 800; x < 3720; x += 14 + r() * 28) {
    if (x > 2525 && x < 2995) continue;
    const depth = (a.groundY(x) - 100) / 130;
    if (depth < 0.08) continue;
    if (r() < 0.16) { D.push({ type: 'pine', x, base: a.groundY(x) + 5, h: 30 + r() * 34, seed: (r() * 1e6) | 0, z: 2 }); continue; }
    D.push({ type: 'hoodoo', x, base: a.groundY(x) + 34, w: 10 + r() * 18, h: 46 + depth * 100 + r() * 50, seed: (r() * 1e6) | 0, z: 1 });
  }
  D.push({ type: 'wall', x0: 2525, x1: 2995, top: YTOP, bottom: 260, seed: 7, z: 0 });
  for (const fx of [2610, 2700, 2790, 2880, 2945]) D.push({ type: 'pine', kind: 'fir', x: fx, base: a.groundY(fx) + 3, h: 150 + r() * 40, seed: fx, z: 3 });
  D.push({ type: 'special', kind: 'queen', x: 1730, base: a.groundY(1730) + 12, w: 30, z: 2 });
  D.push({ type: 'special', kind: 'thor', x: 3565, base: a.groundY(3565) + 70, w: 24, z: 2 });
  for (let x = 30; x < a.width; x += 20 + r() * 60) {
    if (x > 2525 && x < 2995) continue;
    D.push({ type: 'shrub', kind: a.isRim(x) ? (r() < 0.5 ? 'sage' : 'manzanita') : (r() < 0.6 ? 'manzanita' : 'sage'), x, base: a.groundY(x) + 1, w: 6 + r() * 8, seed: (r() * 1e6) | 0, layer: 'front', z: 5 });
  }
  D.push({ type: 'fence', x0: 330, x1: 490, x: 410, w: 90, layer: 'front', z: 6 });
  D.push({ type: 'fence', x0: 3740, x1: 3900, x: 3820, w: 90, layer: 'front', z: 6 });
  return D;
}

function seepDecor(a) {
  const D = [];
  const r = rng(77);
  D.push({ type: 'wall', x0: -20, x1: a.width + 20, top: YTOP + 30, bottom: 240, seed: 3, color: '#9a5038', taper: 0, wet: true, z: 0 });
  for (let x = 80; x < a.width - 40; x += 40 + r() * 80) D.push({ type: 'pine', kind: r() < 0.6 ? 'fir' : 'pine', x, base: a.groundY(x) + 3, h: 50 + r() * 50, seed: (r() * 1e6) | 0, z: 1 });
  D.push({ type: 'special', kind: 'seep', x: 560, base: a.groundY(560), w: 80, z: 2 });
  for (let x = 20; x < a.width; x += 18 + r() * 30) D.push({ type: 'shrub', kind: 'green', flowers: r() < 0.5 ? '#e0405a' : null, x, base: a.groundY(x) + 1, w: 5 + r() * 7, seed: (r() * 1e6) | 0, layer: 'front', z: 5 });
  return D;
}

function bridgesDecor(a) {
  const D = [];
  const r = rng(91);
  for (let x = 0; x < a.width; x += 16 + r() * 26) {
    D.push({ type: 'hoodoo', x, base: a.groundY(x) + 30, w: 12 + r() * 16, h: 80 + r() * 90, seed: (r() * 1e6) | 0, z: 0 });
  }
  D.push({ type: 'arch', x: 340, base: a.groundY(340) + 2, w: 70, h: 120, hole: { w: 26, h: 62 }, seed: 12, z: 1 });
  D.push({ type: 'arch', x: 560, base: a.groundY(560) + 2, w: 60, h: 105, hole: { w: 20, h: 48 }, seed: 13, z: 1 });
  for (let x = 30; x < a.width; x += 24 + r() * 40) D.push({ type: 'shrub', kind: 'manzanita', x, base: a.groundY(x) + 1, w: 6 + r() * 6, seed: (r() * 1e6) | 0, layer: 'front', z: 5 });
  return D;
}

function overlookDecor(a) {
  const D = [];
  const r = rng(55);
  for (let x = 10; x < a.width; x += 30 + r() * 50) if (x < 300 || x > 760) D.push({ type: 'pine', x, base: a.groundY(x) + 3, h: 30 + r() * 30, seed: (r() * 1e6) | 0, z: 1 });
  D.push({ type: 'special', kind: 'telescope', x: 600, base: a.groundY(600), w: 10, z: 3 });
  for (let x = 20; x < a.width; x += 14 + r() * 24) D.push({ type: 'shrub', kind: 'sage', x, base: a.groundY(x) + 1, w: 5 + r() * 7, seed: (r() * 1e6) | 0, layer: 'front', z: 5 });
  D.push({ type: 'fence', x0: 420, x1: 760, x: 590, w: 180, layer: 'front', z: 6 });
  return D;
}

export function makeAreas() {
  const trailW = 4900;
  const trail = new Area({
    id: 'trail', name: 'Bryce Amphitheater', width: trailW, theme: 'trail',
    points: [
      [0, 100], [760, 102], [820, 112], [880, 126], [940, 136], [1000, 150], [1060, 164], [1120, 174],
      [1180, 188], [1240, 196], [1300, 208], [1380, 218], [1500, 226], [1700, 223], [1900, 228],
      [2100, 225], [2300, 229], [2500, 226], [2700, 230], [2950, 228], [3050, 222], [3120, 208],
      [3200, 196], [3280, 182], [3360, 172], [3440, 156], [3520, 142], [3600, 126], [3680, 112],
      [3760, 102], [trailW, 100],
    ],
    rim: x => x < 790 || x > 3720,
    zones: [
      { x0: 0, x1: 300, name: 'Rim Trail', sub: 'Bryce Canyon National Park' },
      { x0: 300, x1: 500, name: 'Sunrise Point', sub: 'elev. about 8,000 ft' },
      { x0: 780, x1: 1550, name: "Queen's Garden Trail", sub: 'down into the amphitheater' },
      { x0: 1550, x1: 2150, name: "Queen's Garden", sub: '' },
      { x0: 2150, x1: 2525, name: 'Navajo Loop', sub: '' },
      { x0: 2525, x1: 2995, name: 'Wall Street', sub: 'a narrow slot canyon', shelter: true },
      { x0: 2995, x1: 3700, name: "Thor's Hammer", sub: 'the climb back up' },
      { x0: 3700, x1: 4000, name: 'Sunset Point', sub: '' },
      { x0: 4000, x1: trailW, name: 'Rim Trail', sub: 'toward Inspiration Point' },
    ],
    obstacles: [
      { x: 610, w: 16, h: 4.5, kind: 'log', seed: 1 },
      { x: 1010, w: 9, h: 6, seed: 2 },
      { x: 1290, w: 12, h: 11, seed: 3 },
      { x: 1620, w: 18, h: 5, kind: 'log', seed: 4 },
      { x: 1890, w: 10, h: 7, seed: 5 },
      { x: 2190, w: 14, h: 14, seed: 6 },
      { x: 2655, w: 18, h: 5, kind: 'log', seed: 7 },
      { x: 2760, w: 13, h: 12, seed: 8 },
      { x: 3160, w: 10, h: 8, seed: 9 },
      { x: 3440, w: 13, h: 13, seed: 10 },
      { x: 4210, w: 16, h: 4.5, kind: 'log', seed: 11 },
      { x: 4520, w: 11, h: 9, seed: 12 },
    ],
    layers: [['plateau', 0.06, 70], ['far', 0.22, 104], ['mid', 0.48, 140]],
    decor: trailDecor,
  });
  const g = x => trail.groundY(x);
  trail.platforms = [
    { x0: 2200, x1: 2236, y: g(2218) - 27, id: 'ledge-navajo' },
    { x0: 2772, x1: 2806, y: g(2790) - 26, id: 'ledge-wall' },
    { x0: 3452, x1: 3490, y: g(3470) - 27, id: 'ledge-thor' },
  ];

  const seep = new Area({
    id: 'seep', name: 'Hidden Seep', width: 1000, theme: 'seep', ambient: 0.78, shelter: true,
    points: [[0, 200], [200, 204], [400, 210], [560, 214], [700, 210], [860, 206], [1000, 204]],
    zones: [{ x0: 0, x1: 1000, name: 'Hidden Seep', sub: 'a secret spring beneath the cliffs', shelter: true }],
    obstacles: [{ x: 300, w: 12, h: 7, seed: 21 }, { x: 790, w: 14, h: 12, seed: 22 }, { x: 900, w: 16, h: 5, kind: 'log', seed: 23 }],
    layers: [['cliffs', 0.5, 150]],
    decor: seepDecor,
  });
  seep.platforms = [{ x0: 805, x1: 840, y: seep.groundY(820) - 25, id: 'ledge-seep' }];

  const bridges = new Area({
    id: 'bridges', name: 'Two Bridges', width: 1000, theme: 'canyon',
    points: [[0, 210], [200, 206], [400, 200], [600, 196], [800, 190], [1000, 186]],
    zones: [{ x0: 0, x1: 1000, name: 'Two Bridges', sub: 'natural windows in the rock' }],
    obstacles: [{ x: 250, w: 10, h: 6, seed: 31 }, { x: 690, w: 14, h: 12, seed: 32 }],
    layers: [['far', 0.22, 104], ['mid', 0.48, 140]],
    decor: bridgesDecor,
  });
  const bg = x => bridges.groundY(x);
  bridges.platforms = [
    { x0: 705, x1: 735, y: bg(720) - 26, id: 'b1' },
    { x0: 748, x1: 778, y: bg(763) - 42, id: 'b2' },
    { x0: 792, x1: 822, y: bg(807) - 58, id: 'b3' },
    { x0: 836, x1: 900, y: bg(868) - 72, id: 'b-top' },
  ];

  const overlook = new Area({
    id: 'overlook', name: 'Moonlit Overlook', width: 900, theme: 'rim', rim: () => true,
    points: [[0, 100], [300, 98], [600, 96], [900, 98]],
    zones: [{ x0: 0, x1: 900, name: 'Moonlit Overlook', sub: 'the darkest skies on the rim' }],
    obstacles: [{ x: 240, w: 16, h: 4.5, kind: 'log', seed: 41 }, { x: 800, w: 10, h: 8, seed: 42 }],
    layers: [['plateau', 0.06, 70], ['far', 0.22, 104]],
    decor: overlookDecor,
  });
  overlook.platforms = [];

  return { trail, seep, bridges, overlook };
}

export const PORTALS = [
  { area: 'trail', x: 2065, to: 'seep', label: 'A narrow side path behind the hoodoos…', toX: 60 },
  { area: 'trail', x: 2400, to: 'bridges', label: 'Spur trail: Two Bridges', toX: 60 },
  { area: 'trail', x: 4565, to: 'overlook', label: 'A faint path toward the cliff edge…', toX: 60 },
  { area: 'seep', x: 30, to: 'trail', label: "Back to Queen's Garden", toX: 2075 },
  { area: 'bridges', x: 30, to: 'trail', label: 'Back to the Navajo Loop', toX: 2410 },
  { area: 'overlook', x: 30, to: 'trail', label: 'Back to the Rim Trail', toX: 4575 },
];
