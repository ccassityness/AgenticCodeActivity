// Item definitions and the bag (inventory).
import { drawItemShape } from './figures.js';
import { snapshot } from './color.js';

/**
 * cat: care | toy | snack | litter | nature | lost | keepsake
 * max: stack size
 */
export const ITEMS = {
  bottle: { name: 'Milk bottle', cat: 'care', max: 4, desc: 'Warm milk for a hungry little one. Refill at a water fountain.' },
  diaper: { name: 'Diaper', cat: 'care', max: 6, desc: 'Fresh and fluffy. Refill at the restrooms by the trailheads.' },
  blanket: { name: 'Cozy blanket', cat: 'care', max: 1, desc: 'Soft and warm for chilly evenings (and naps).' },
  sunhat: { name: 'Baby sun hat', cat: 'care', max: 1, desc: 'Keeps the high-desert sun off tiny cheeks.' },
  teether: { name: 'Cool teether', cat: 'care', max: 1, desc: 'For sore, teething gums.' },
  pacifier: { name: 'Pacifier', cat: 'care', max: 1, desc: 'A favorite. Keeps getting thrown overboard.' },
  sock: { name: 'Tiny sock', cat: 'care', max: 2, desc: 'How do they always kick these off?' },
  rattle: { name: 'Rattle', cat: 'toy', max: 1, desc: 'Shake shake shake! Guaranteed giggles.' },
  carving: { name: 'Carved deer toy', cat: 'toy', max: 1, desc: 'A little wooden deer, whittled by Walt. Smooth from years of pockets.' },
  granola: { name: 'Granola bar', cat: 'snack', max: 6, desc: 'Trail fuel. Share with a friend, or eat it yourself.' },
  cookie: { name: 'Homemade cookie', cat: 'snack', max: 6, desc: 'Still a little warm. Everyone loves these.' },
  water: { name: 'Water bottle', cat: 'snack', max: 4, desc: 'Stay hydrated — the air is thin and dry up here.' },
  wrapper: { name: 'Candy wrapper', cat: 'litter', max: 9, desc: 'Litter! Pack it out and toss it in a trash can.' },
  can: { name: 'Soda can', cat: 'litter', max: 9, desc: 'Litter! Pack it out and toss it in a trash can.' },
  plastic: { name: 'Plastic bottle', cat: 'litter', max: 9, desc: 'Litter! Pack it out and toss it in a trash can.' },
  pinecone: { name: 'Ponderosa pinecone', cat: 'nature', max: 3, desc: 'Prickly and perfect. (Nature finds belong in the park — leave it be when you\'re done.)' },
  bluefeather: { name: "Steller's jay feather", cat: 'nature', max: 3, desc: 'Brilliant blue. (Leave it be when you\'re done admiring it.)' },
  blackfeather: { name: 'Raven feather', cat: 'nature', max: 3, desc: 'Glossy black with a purple sheen. (Leave it be when you\'re done.)' },
  stone: { name: 'Pink hoodoo pebble', cat: 'nature', max: 3, desc: 'A rounded bit of Claron Formation. (Leave it be when you\'re done.)' },
  whitestone: { name: 'Limestone pebble', cat: 'nature', max: 3, desc: 'Pale caprock limestone. (Leave it be when you\'re done.)' },
  mitten: { name: 'Red mitten', cat: 'lost', max: 1, desc: 'Somebody is missing this.' },
  sunglasses: { name: 'Sunglasses', cat: 'lost', max: 1, desc: 'Somebody is squinting without these.' },
  map: { name: 'Trail map', cat: 'lost', max: 1, desc: 'Somebody\'s well-loved map, covered in notes.' },
  dino: { name: 'Toy dinosaur', cat: 'lost', max: 1, desc: 'A small green dinosaur. A kid must miss it terribly.' },
  lenscap: { name: 'Lens cap', cat: 'lost', max: 1, desc: 'From a fancy camera.' },
  watch: { name: 'Pocket watch', cat: 'lost', max: 1, desc: 'Old and engraved: "To W., love always."' },
  whistle: { name: 'Ranger whistle', cat: 'lost', max: 1, desc: 'Official park-service issue.' },
  postcard: { name: 'Photo print', cat: 'keepsake', max: 3, desc: 'A print of you and your baby with the hoodoos glowing behind.' },
  badge: { name: 'Junior Ranger badge', cat: 'keepsake', max: 1, desc: 'Awarded for caring for Bryce Canyon.' },
  diary: { name: 'Diary page', cat: 'story', max: 6, desc: 'A page from an old hiking diary.' },
  flowercrown: { name: 'Paper flower crown', cat: 'keepsake', max: 1, desc: 'Folded by a kid on the trail. Real flowers stay in the ground!' },
};
export const isItem = id => !!ITEMS[id];
export const LITTER = ['wrapper', 'can', 'plastic'];
export const NATURE = ['pinecone', 'bluefeather', 'blackfeather', 'stone', 'whitestone'];

const iconCache = {};
export function itemIcon(id) {
  if (!iconCache[id]) iconCache[id] = snapshot(12, 12, g => { g.translate(6, 6); drawItemShape(g, id, 10); }, 6);
  return iconCache[id];
}

export class Bag {
  constructor(size = 12) {
    this.size = size;
    this.slots = Array(size).fill(null); // {id, n, owner?}
    this.listeners = [];
  }
  onChange(f) { this.listeners.push(f); }
  changed() { for (const f of this.listeners) f(this); }

  count(id) { return this.slots.reduce((s, x) => s + (x && x.id === id ? x.n : 0), 0); }
  has(id) { return this.count(id) > 0; }
  find(pred) { return this.slots.findIndex(x => x && pred(x)); }

  /** Returns how many could NOT fit (0 = all added). */
  add(id, n = 1, owner = null) {
    const def = ITEMS[id];
    if (!def) return n;
    for (const s of this.slots) {
      if (n <= 0) break;
      if (s && s.id === id && s.owner === owner && s.n < def.max) {
        const k = Math.min(n, def.max - s.n);
        s.n += k; n -= k;
      }
    }
    for (let i = 0; i < this.size && n > 0; i++) {
      if (!this.slots[i]) {
        const k = Math.min(n, def.max);
        this.slots[i] = { id, n: k, owner };
        n -= k;
      }
    }
    this.changed();
    return n;
  }
  /** Room for at least one of id? */
  canAdd(id, owner = null) {
    const def = ITEMS[id];
    return this.slots.some(s => !s || (s.id === id && s.owner === owner && s.n < def.max));
  }
  remove(id, n = 1) {
    for (let i = this.size - 1; i >= 0 && n > 0; i--) {
      const s = this.slots[i];
      if (s && s.id === id) {
        const k = Math.min(n, s.n);
        s.n -= k; n -= k;
        if (s.n <= 0) this.slots[i] = null;
      }
    }
    this.changed();
  }
  removeAt(i, n = 1) {
    const s = this.slots[i];
    if (!s) return null;
    s.n -= n;
    if (s.n <= 0) this.slots[i] = null;
    this.changed();
    return s;
  }
  /** Top up a stackable to a target count. */
  refill(id, target) {
    const have = this.count(id);
    if (have >= target) return 0;
    const left = this.add(id, target - have);
    return target - have - left;
  }
  toJSON() { return this.slots; }
  load(slots) {
    if (!Array.isArray(slots)) return;
    this.slots = Array(this.size).fill(null).map((_, i) => {
      const s = slots[i];
      return s && ITEMS[s.id] ? { id: s.id, n: s.n, owner: s.owner ?? null } : null;
    });
    this.changed();
  }
}

export const STARTING_BAG = [
  ['bottle', 3], ['diaper', 3], ['sunhat', 1], ['blanket', 1], ['rattle', 1], ['teether', 1], ['granola', 2], ['water', 2],
];
