// Mini-games: wildlife photography, stargazing, lullaby rhythm, canyon echo memory, peekaboo.
// Each runs full-screen over the paused world and ends with a 1–3 star rating.
import { drawBabyHead } from './figures.js';
import { addPhoto } from './ui.js';
import { rng } from './color.js';

const $ = id => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[(Math.random() * a.length) | 0];

export class MiniGames {
  constructor(game) {
    this.g = game;
    this.el = $('mg');
    this.cv = $('mgCanvas');
    this.ctx = this.cv.getContext('2d');
    this.active = null;
    this.cv.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation();
      if (!this.active || this.active.over) return;
      const r = this.cv.getBoundingClientRect();
      this.active.tap(e.clientX - r.left, e.clientY - r.top);
    });
    $('mgQuit').onclick = () => this.finish(0, true);
    this.el.addEventListener('pointerdown', e => e.stopPropagation());
  }
  get on() { return !!this.active; }
  start(game) {
    this.g.audio.unlock();
    this.g.ui.closeMenu(); this.g.ui.closeDialogue(false);
    this.active = game;
    game.mg = this; game.g = this.g;
    this.el.hidden = false;
    $('mgResult').hidden = true;
    $('mgTitle').textContent = game.title;
    $('mgHint').textContent = game.hint;
    this.resize();
    game.init(this.W, this.H);
    this.last = performance.now();
    const loop = t => {
      if (this.active !== game) return;
      const dt = Math.min(0.05, (t - this.last) / 1000); this.last = t;
      game.time = (game.time || 0) + dt;
      if (!game.over) game.update(dt);
      const c = this.ctx;
      c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      c.clearRect(0, 0, this.W, this.H);
      game.draw(c, this.W, this.H);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
  resize() {
    this.dpr = Math.min(2.5, window.devicePixelRatio || 1);
    this.W = window.innerWidth; this.H = window.innerHeight;
    this.cv.width = this.W * this.dpr; this.cv.height = this.H * this.dpr;
  }
  /** Show the result card. */
  finish(stars, quit = false, lines = []) {
    const game = this.active;
    if (!game) return;
    game.over = true;
    if (quit) { this.close(); return; }
    const box = $('mgResult');
    $('mgStars').innerHTML = [1, 2, 3].map(i => `<span class="${i <= stars ? 'on' : ''}">★</span>`).join('');
    $('mgMsg').textContent = lines[0] || '';
    $('mgReward').innerHTML = lines.slice(1).map(l => `<div>${l}</div>`).join('');
    box.hidden = false;
    for (let i = 0; i < stars; i++) setTimeout(() => this.g.audio.star(), 250 + i * 250);
    $('mgAgain').onclick = () => { const Ctor = game.constructor; this.close(); this.start(new Ctor(game.opts)); };
    $('mgDone').onclick = () => this.close();
  }
  close() {
    this.active = null;
    this.el.hidden = true;
    this.g.ui.needChanged();
  }
  record(key, stars) {
    const G = this.g.journal.s.games || (this.g.journal.s.games = {});
    const prev = G[key] || 0;
    if (stars > prev) { G[key] = stars; this.g.journal.mark(); }
    return stars > prev;
  }

  // ---- launchers ----
  photo(animal) { this.start(new PhotoGame({ animal })); }
  stars() { this.start(new StarGame({})); }
  lullaby() { this.start(new LullabyGame({})); }
  echo() { this.start(new EchoGame({})); }
  peekaboo() { this.start(new PeekabooGame({})); }
}

// ----------------------------------------------------------------- PHOTO
class PhotoGame {
  constructor(opts) { this.opts = opts; this.title = `Photograph: ${opts.animal.name}`; this.hint = 'Tap when it\'s sharp and centered. Bonus if it looks at you! 3 shots.'; }
  init(W, H) {
    this.shots = []; this.flash = 0; this.freeze = 0;
    const a = this.opts.animal;
    this.bg = this.g.snapshotCanvas();
    this.k = Math.min(W, H) / (a.pw ? a.pw * 2.4 : 40);
    this.ax = rand(0.25, 0.75) * W; this.vx = rand(30, 60) * (Math.random() < 0.5 ? -1 : 1);
    this.ay = H * 0.68;
    this.stopT = 0; this.poseT = 0; this.focusPh = rand(0, 6);
    this.flying = ['raven', 'falcon', 'butterfly'].includes(a.jid) || (a.jid === 'bluebird');
  }
  get focus() { return Math.abs(Math.sin(this.time * 1.35 + this.focusPh)); }
  update(dt) {
    if (this.freeze > 0) { this.freeze -= dt; if (this.freeze <= 0 && this.shots.length >= 3) this.end(); return; }
    const W = this.mg.W;
    if (this.stopT > 0) { this.stopT -= dt; this.poseT -= dt; }
    else {
      this.ax += this.vx * dt;
      if (this.ax < W * 0.12 || this.ax > W * 0.88) this.vx *= -1;
      if (Math.random() < dt * 0.6) { this.stopT = rand(0.8, 2); this.poseT = Math.random() < 0.6 ? rand(0.5, 1.2) : 0; if (this.poseT > 0) this.g.audio.blip(); }
      if (Math.random() < dt * 0.3) this.vx = -this.vx;
    }
    if (this.flying) this.ay = this.mg.H * (0.45 + Math.sin(this.time * 1.2) * 0.12);
  }
  draw(c, W, H) {
    c.drawImage(this.bg, 0, 0, W, H);
    c.fillStyle = 'rgba(20,15,10,0.25)'; c.fillRect(0, 0, W, H);
    const a = this.opts.animal;
    const f = this.freeze > 0 ? this.lastFocus : this.focus;
    // render animal, blurred by lack of focus (draw small, scale up)
    const blur = 1 - f;
    const res = Math.max(0.12, 1 - blur * 0.88);
    const bw = 60 * this.k, bh = 40 * this.k;
    if (!this.buf) { this.buf = document.createElement('canvas'); }
    this.buf.width = Math.max(4, bw * res); this.buf.height = Math.max(4, bh * res);
    const b = this.buf.getContext('2d');
    b.scale(res * this.k, res * this.k);
    const dir = this.stopT > 0 ? (this.poseT > 0 ? -Math.sign(this.ax - W / 2) || 1 : Math.sign(this.vx)) : Math.sign(this.vx);
    a.render(b, 30, 36, dir || 1, this.time * (this.stopT > 0 ? 0.3 : 1));
    c.imageSmoothingEnabled = true;
    c.drawImage(this.buf, this.ax - bw / 2, this.ay - bh * 0.9, bw, bh);
    if (this.poseT > 0 && this.stopT > 0) { c.fillStyle = '#ffe680'; c.font = 'bold 20px sans-serif'; c.textAlign = 'center'; c.fillText('👀', this.ax, this.ay - bh * 0.95); }
    // viewfinder
    c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 3;
    const m = 30, L = 34;
    for (const [x, y, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) { c.beginPath(); c.moveTo(x, y + sy * L); c.lineTo(x, y); c.lineTo(x + sx * L, y); c.stroke(); }
    c.lineWidth = 1.5; c.beginPath(); c.arc(W / 2, H / 2, 26, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.moveTo(W / 2 - 8, H / 2); c.lineTo(W / 2 + 8, H / 2); c.moveTo(W / 2, H / 2 - 8); c.lineTo(W / 2, H / 2 + 8); c.stroke();
    // focus meter
    c.fillStyle = 'rgba(0,0,0,0.45)'; c.fillRect(W - 46, H * 0.25, 14, H * 0.5);
    c.fillStyle = f > 0.85 ? '#7ad07a' : f > 0.6 ? '#f2c14e' : '#e86a6a';
    c.fillRect(W - 44, H * 0.75 - H * 0.5 * f + 2, 10, H * 0.5 * f - 4);
    c.fillStyle = '#fff'; c.font = '12px sans-serif'; c.textAlign = 'center'; c.fillText('FOCUS', W - 39, H * 0.25 - 6);
    // shot counter
    c.textAlign = 'left'; c.font = 'bold 16px sans-serif';
    c.fillText('📷 ' + '●'.repeat(3 - this.shots.length) + '○'.repeat(this.shots.length), 44, H - 40);
    if (this.freeze > 0) { c.fillStyle = '#fff'; c.textAlign = 'center'; c.font = 'bold 26px sans-serif'; c.fillText('★'.repeat(this.lastStars) + '☆'.repeat(3 - this.lastStars), W / 2, H * 0.2); }
    this.flash = Math.max(0, this.flash - 0.06);
    if (this.flash > 0) { c.fillStyle = `rgba(255,255,255,${this.flash})`; c.fillRect(0, 0, W, H); }
  }
  tap() {
    if (this.freeze > 0 || this.shots.length >= 3) return;
    const W = this.mg.W, H = this.mg.H;
    const f = this.focus;
    const dx = Math.abs(this.ax - W / 2) / (W / 2), dy = Math.abs(this.ay - 0.4 * 40 * this.k - H / 2) / (H / 2);
    const center = Math.max(0, 1 - Math.hypot(dx, dy) * 1.3);
    const pose = this.poseT > 0 && this.stopT > 0 ? 1 : 0;
    const score = f * 0.45 + center * 0.4 + pose * 0.2;
    const stars = score > 0.78 ? 3 : score > 0.52 ? 2 : 1;
    this.lastFocus = f; this.lastStars = stars;
    // save the best shot as a photo (the frame currently on screen, before the flash)
    if (!this.best || stars >= this.best.stars) { try { this.best = { stars, url: this.mg.cv.toDataURL('image/jpeg', 0.82) }; } catch { /* ignore */ } }
    this.g.audio.shutter();
    this.flash = 1; this.freeze = 1.1;
    this.shots.push({ stars });
  }
  end() {
    const stars = Math.max(...this.shots.map(s => s.stars));
    const a = this.opts.animal, j = this.g.journal;
    j.see(a.jid);
    const S = j.s.shots || (j.s.shots = {});
    const lines = [stars === 3 ? 'A frame-worthy shot!' : stars === 2 ? 'Nice shot!' : 'A little blurry… try again?'];
    if (stars > (S[a.jid] || 0)) { S[a.jid] = stars; j.mark(); j.check(); lines.push(`New best for ${a.name}!`); }
    if (this.best?.url) { addPhoto(this.best.url); lines.push('Saved to your album 🖼️'); }
    j.inc('photos');
    if (stars === 3) { j.s.bond = Math.min(5, (j.s.bond || 0) + 0.2); this.g.baby.react && setTimeout(() => this.g.baby.react('animal'), 300); }
    this.mg.finish(stars, false, lines);
  }
}

// ----------------------------------------------------------------- STARS
const CONSTELLATIONS = [
  { name: 'Big Dipper', pts: [[0.05, 0.35], [0.22, 0.3], [0.37, 0.37], [0.5, 0.45], [0.55, 0.72], [0.82, 0.74], [0.86, 0.48]], path: [0, 1, 2, 3, 4, 5, 6, 3], fact: 'Part of the Great Bear. Follow the two stars at the end of the cup and they point to Polaris, the North Star.' },
  { name: 'Cassiopeia', pts: [[0.08, 0.32], [0.3, 0.68], [0.5, 0.42], [0.7, 0.7], [0.92, 0.28]], path: [0, 1, 2, 3, 4], fact: 'A bright "W" that circles the North Star all night — opposite the Big Dipper.' },
  { name: 'Orion', pts: [[0.3, 0.12], [0.7, 0.18], [0.42, 0.5], [0.5, 0.52], [0.58, 0.54], [0.33, 0.88], [0.74, 0.84]], path: [0, 1, 4, 6, null, 0, 2, 5, null, 2, 3, 4], fact: 'The Hunter. His three-star belt is one of the easiest patterns in the winter sky; red Betelgeuse is his shoulder.' },
  { name: 'Cygnus', pts: [[0.5, 0.08], [0.5, 0.4], [0.5, 0.92], [0.12, 0.32], [0.88, 0.48]], path: [0, 1, 2, null, 3, 1, 4], fact: 'The Swan flies right along the Milky Way. Its tail star, Deneb, is a supergiant thousands of light-years away.' },
  { name: 'Scorpius', pts: [[0.1, 0.14], [0.2, 0.26], [0.3, 0.2], [0.36, 0.36], [0.4, 0.52], [0.5, 0.67], [0.62, 0.79], [0.77, 0.83], [0.89, 0.72], [0.86, 0.58]], path: [0, 1, 2, null, 1, 3, 4, 5, 6, 7, 8, 9], fact: 'A summer scorpion. Its heart is Antares, a huge red star — the name means "rival of Mars."' },
  { name: 'Lyra', pts: [[0.5, 0.1], [0.38, 0.42], [0.62, 0.44], [0.64, 0.8], [0.4, 0.78]], path: [0, 1, 2, 0, null, 1, 4, 3, 2], fact: 'The Harp. Its brightest star, Vega, is one of the brightest stars in the whole night sky.' },
];
class StarGame {
  constructor(opts) { this.opts = opts; this.title = 'Stargazing'; this.hint = 'Watch the pattern, then tap its stars in order to connect them.'; }
  init(W, H) {
    const done = this.g.journal.s.consts || {};
    const fresh = CONSTELLATIONS.filter(c => !done[c.name]);
    this.c = pick(fresh.length ? fresh : CONSTELLATIONS);
    const r = rng((Math.random() * 1e6) | 0);
    this.bg = Array.from({ length: 260 }, () => ({ x: r() * W, y: r() * H, s: r() * 1.4 + 0.3, tw: r() * 6 }));
    const bw = Math.min(W * 0.6, H * 0.9), bx = (W - bw) / 2, by = (H - bw * 0.75) / 2;
    this.P = this.c.pts.map(([x, y]) => [bx + x * bw, by + y * bw * 0.75]);
    this.step = 0; while (this.c.path[this.step] === null) this.step++;
    this.lines = []; this.misses = 0; this.hintT = 3; this.idle = 0; this.lastIdx = null;
  }
  update(dt) { this.hintT -= dt; this.idle += dt; }
  draw(c, W, H) {
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#060a24'); g.addColorStop(1, '#1c2452'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    for (const s of this.bg) { c.globalAlpha = 0.4 + 0.4 * Math.sin(this.time * 2 + s.tw); c.fillStyle = '#fff'; c.beginPath(); c.arc(s.x, s.y, s.s, 0, Math.PI * 2); c.fill(); }
    c.globalAlpha = 1;
    // hoodoo silhouettes along the bottom
    c.fillStyle = '#0a0a18';
    c.beginPath(); c.moveTo(0, H);
    for (let x = 0; x <= W; x += 14) c.lineTo(x, H - 30 - Math.abs(Math.sin(x * 0.07)) * 40 - (x % 42 === 0 ? 30 : 0));
    c.lineTo(W, H); c.fill();
    // hint lines
    if (this.hintT > 0) {
      c.strokeStyle = `rgba(160,190,255,${Math.min(0.6, this.hintT / 3)})`; c.setLineDash([6, 6]); c.lineWidth = 2;
      this.pathSegs().forEach(([a, b]) => { c.beginPath(); c.moveTo(...this.P[a]); c.lineTo(...this.P[b]); c.stroke(); });
      c.setLineDash([]);
    }
    c.strokeStyle = '#ffe9a8'; c.lineWidth = 2.5; c.shadowColor = '#ffd27a'; c.shadowBlur = 10;
    for (const [a, b] of this.lines) { c.beginPath(); c.moveTo(...this.P[a]); c.lineTo(...this.P[b]); c.stroke(); }
    c.shadowBlur = 0;
    const next = this.c.path[this.step];
    this.P.forEach(([x, y], i) => {
      const glow = (this.idle > 4 && i === next) ? 0.5 + 0.5 * Math.sin(this.time * 6) : 0;
      c.fillStyle = `rgba(255,240,200,${0.25 + glow * 0.5})`; c.beginPath(); c.arc(x, y, 10 + glow * 6, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fffdf2'; c.beginPath(); c.arc(x, y, 3.6, 0, Math.PI * 2); c.fill();
    });
    c.fillStyle = '#cfd8ff'; c.font = 'bold 18px sans-serif'; c.textAlign = 'center';
    c.fillText(this.hintT > 0 ? `Remember the shape of ${this.c.name}…` : this.c.name, W / 2, H - 22);
  }
  pathSegs() {
    const segs = []; const p = this.c.path;
    for (let i = 1; i < p.length; i++) if (p[i] !== null && p[i - 1] !== null) segs.push([p[i - 1], p[i]]);
    return segs;
  }
  tap(x, y) {
    if (this.hintT > 0) this.hintT = 0;
    const p = this.c.path;
    const want = p[this.step];
    const hit = this.P.findIndex(([px, py]) => Math.hypot(px - x, py - y) < 24);
    if (hit < 0) return;
    if (hit !== want) { this.misses++; this.g.audio.miss(); return; }
    this.idle = 0;
    this.g.audio.note([523, 587, 659, 784, 880, 988, 1047][this.step % 7], 0.6, 'sine');
    if (this.step > 0 && p[this.step - 1] !== null) this.lines.push([p[this.step - 1], hit]);
    this.step++;
    while (this.step < p.length && p[this.step] === null) this.step++;
    if (this.step >= p.length) {
      const stars = this.misses === 0 ? 3 : this.misses <= 2 ? 2 : 1;
      const j = this.g.journal;
      const isNew = !(j.s.consts || {})[this.c.name];
      (j.s.consts || (j.s.consts = {}))[this.c.name] = true; j.mark(); j.check();
      if (isNew) j.first(`saw ${this.c.name} from Bryce`);
      setTimeout(() => this.mg.finish(stars, false, [`You traced ${this.c.name}!`, this.c.fact]), 700);
      this.over = true;
    }
  }
}

// ----------------------------------------------------------------- LULLABY (rhythm)
const LULLABY = [[0, 0], [0, 1], [2, 1], [2, 0], [1, 1], [1, 0], [2, 0], [0, 2], [0, 1], [2, 2], [1, 1], [1, 0], [0, 1], [0, 0], [2, 1], [1, 2]];
const LANE_F = [[392, 330, 262], [440, 392, 349], [523, 494, 440]];
class LullabyGame {
  constructor(opts) { this.opts = opts; this.title = 'Sing a lullaby'; this.hint = 'Tap a column as each note reaches the line.'; }
  init(W, H) {
    this.notes = LULLABY.map(([lane, f], i) => ({ lane, f, t: 1.6 + i * 0.62, hit: null }));
    this.hitY = H * 0.8; this.speed = H * 0.42; this.hits = 0; this.perfect = 0; this.fb = [];
  }
  update() {
    for (const n of this.notes) if (n.hit === null && this.time - n.t > 0.22) { n.hit = false; this.fb.push({ txt: 'miss', lane: n.lane, t: this.time }); }
    if (this.time > this.notes[this.notes.length - 1].t + 1) this.end();
  }
  draw(c, W, H) {
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2a2f5e'); g.addColorStop(1, '#6a4a7a'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    const sleepy = this.hits / this.notes.length;
    drawBabyHead(c, W / 2, H * 0.36, Math.min(W, H) * 0.11, sleepy > 0.6 ? 'napping' : sleepy > 0.3 ? 'sleepy' : 'content', { dir: 1, skin: this.g.player.look.babySkin, bonnet: this.g.player.look.bonnet, pacifier: sleepy > 0.6 });
    const lw = W / 3;
    for (let i = 0; i < 3; i++) { c.fillStyle = `rgba(255,255,255,${0.04 + (i % 2) * 0.03})`; c.fillRect(i * lw, 0, lw, H); }
    c.strokeStyle = 'rgba(255,230,180,0.8)'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, this.hitY); c.lineTo(W, this.hitY); c.stroke();
    for (const n of this.notes) {
      if (n.hit) continue;
      const y = this.hitY - (n.t - this.time) * this.speed;
      if (y < -30 || y > H + 30) continue;
      const x = n.lane * lw + lw / 2;
      c.fillStyle = ['#ffd27a', '#9ad0f8', '#f4a0c0'][n.lane];
      c.beginPath(); c.ellipse(x, y, 16, 12, -0.3, 0, Math.PI * 2); c.fill();
      c.fillRect(x + 12, y - 40, 4, 40);
    }
    c.font = 'bold 20px sans-serif'; c.textAlign = 'center';
    for (const f of this.fb) { const a = 1 - (this.time - f.t); if (a <= 0) continue; c.fillStyle = `rgba(255,255,255,${a})`; c.fillText(f.txt, f.lane * lw + lw / 2, this.hitY - 40 - (1 - a) * 30); }
    c.fillStyle = '#fff'; c.font = '16px sans-serif'; c.fillText(`♪ ${this.hits} / ${this.notes.length}`, W / 2, H - 16);
  }
  tap(x) {
    const lane = Math.min(2, Math.floor(x / (this.mg.W / 3)));
    let best = null, bd = 0.28;
    for (const n of this.notes) { if (n.hit !== null || n.lane !== lane) continue; const d = Math.abs(n.t - this.time); if (d < bd) { bd = d; best = n; } }
    if (!best) { this.g.audio.miss(); return; }
    best.hit = true; this.hits++;
    const perfect = bd < 0.09; if (perfect) this.perfect++;
    this.fb.push({ txt: perfect ? 'perfect!' : 'good', lane, t: this.time });
    this.g.audio.note(LANE_F[lane][best.f], 0.7, 'sine');
  }
  end() {
    this.over = true;
    const ratio = this.hits / this.notes.length;
    const stars = ratio >= 0.9 ? 3 : ratio >= 0.65 ? 2 : 1;
    const b = this.g.baby;
    const lines = [stars === 3 ? 'A perfect lullaby. Out like a light.' : stars === 2 ? 'Sweet singing — eyes are getting heavy…' : 'A little off-key, but they loved it.'];
    if (stars >= 2 && !b.napping) { if (b.need?.id === 'sleepy') b.meetNeed('sleepy', '*yawn…*'); b.nap(); lines.push(`${b.name} drifted off to sleep 💤`); }
    else if (b.need && ['bored', 'cuddle'].includes(b.need.id)) b.meetNeed(b.need.id, 'ah-ah-ah ♪');
    else b.happy(null, 0.1);
    if (this.mg.record('lullaby', stars)) lines.push('New best!');
    this.mg.finish(stars, false, lines);
  }
}

// ----------------------------------------------------------------- ECHO (memory)
const ECHO_F = [330, 392, 494, 587];
const ECHO_C = ['#e86a6a', '#f2c14e', '#6ac08a', '#6aa6e8'];
class EchoGame {
  constructor(opts) { this.opts = opts; this.title = 'Canyon echo'; this.hint = 'Listen to the echo, then repeat it by tapping the stones.'; }
  init(W, H) {
    this.seq = [pick([0, 1, 2, 3]), pick([0, 1, 2, 3]), pick([0, 1, 2, 3])];
    this.phase = 'show'; this.showI = 0; this.showT = 0.9; this.input = 0; this.lit = -1; this.litT = 0; this.best = 0; this.ripples = [];
    const r = Math.min(W, H) * 0.16;
    this.pos = [[W / 2 - r * 1.3, H * 0.55 - r * 0.6], [W / 2 + r * 1.3, H * 0.55 - r * 0.6], [W / 2 - r * 1.3, H * 0.55 + r * 1.0], [W / 2 + r * 1.3, H * 0.55 + r * 1.0]];
    this.r = r * 0.62;
  }
  light(i) { this.lit = i; this.litT = 0.45; this.g.audio.note(ECHO_F[i], 0.5, 'sine'); setTimeout(() => this.g.audio.note(ECHO_F[i], 0.35, 'sine'), 220); this.ripples.push({ i, t: this.time }); }
  update(dt) {
    this.litT -= dt; if (this.litT <= 0) this.lit = -1;
    if (this.phase === 'show') {
      this.showT -= dt;
      if (this.showT <= 0) {
        if (this.showI < this.seq.length) { this.light(this.seq[this.showI]); this.showI++; this.showT = Math.max(0.45, 0.75 - this.seq.length * 0.03); }
        else { this.phase = 'input'; this.input = 0; }
      }
    }
  }
  draw(c, W, H) {
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#5a2a22'); g.addColorStop(1, '#a8583c'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(40,10,10,0.35)'; for (let x = 0; x < W; x += 23) c.fillRect(x, 0, 6 + (x % 3) * 3, H);
    c.fillStyle = 'rgba(255,240,220,0.6)'; c.fillRect(W * 0.45, 0, W * 0.1, H * 0.15);
    for (const rp of this.ripples) { const a = 1 - (this.time - rp.t) / 1.2; if (a <= 0) continue; const [x, y] = this.pos[rp.i]; c.strokeStyle = `rgba(255,255,255,${a * 0.5})`; c.lineWidth = 2; c.beginPath(); c.arc(x, y, this.r + (1 - a) * 60, 0, Math.PI * 2); c.stroke(); }
    this.pos.forEach(([x, y], i) => {
      const on = this.lit === i;
      const gr = c.createRadialGradient(x - this.r * 0.3, y - this.r * 0.4, 2, x, y, this.r * 1.1);
      gr.addColorStop(0, on ? '#fff' : ECHO_C[i]); gr.addColorStop(1, on ? ECHO_C[i] : '#3a2420');
      c.fillStyle = gr; c.beginPath(); c.ellipse(x, y, this.r, this.r * 0.8, 0, 0, Math.PI * 2); c.fill();
    });
    c.fillStyle = '#fff3dc'; c.font = 'bold 20px sans-serif'; c.textAlign = 'center';
    c.fillText(this.phase === 'show' ? 'Listen… HELLO-o-o…' : `Your turn! (${this.input}/${this.seq.length})`, W / 2, H - 44);
    c.font = '15px sans-serif'; c.fillText(`Echo length: ${this.seq.length}`, W / 2, H - 18);
  }
  tap(x, y) {
    if (this.phase !== 'input') return;
    const i = this.pos.findIndex(([px, py]) => Math.hypot(px - x, py - y) < this.r * 1.15);
    if (i < 0) return;
    this.light(i);
    if (i !== this.seq[this.input]) { this.g.audio.miss(); this.over = true; setTimeout(() => this.end(), 600); return; }
    this.input++;
    if (this.input >= this.seq.length) {
      this.best = this.seq.length;
      if (this.seq.length >= 9) { this.over = true; setTimeout(() => this.end(), 500); return; }
      this.seq.push(pick([0, 1, 2, 3]));
      this.phase = 'show'; this.showI = 0; this.showT = 1.1;
    }
  }
  end() {
    const n = this.best;
    const stars = n >= 7 ? 3 : n >= 5 ? 2 : 1;
    const lines = [n ? `You echoed a ${n}-note call!` : 'The canyon laughed back at you. Try again!'];
    this.g.baby.happy(null, 0.05);
    if (this.mg.record('echo', stars)) lines.push('New best!');
    this.mg.finish(stars, false, lines);
  }
}

// ----------------------------------------------------------------- PEEKABOO (timing)
class PeekabooGame {
  constructor(opts) { this.opts = opts; this.title = 'Peekaboo!'; this.hint = 'Tap the moment the hands open — but watch out for fake-outs!'; }
  init(W, H) { this.rounds = 0; this.hits = 0; this.combo = 0; this.state = 'closed'; this.t = rand(1, 2); this.open = 0; this.fb = null; this.tapped = false; }
  update(dt) {
    this.t -= dt;
    const target = this.state === 'open' ? 1 : this.state === 'fake' ? 0.18 : 0;
    this.open += (target - this.open) * Math.min(1, dt * 14);
    if (this.t <= 0) {
      if (this.state === 'closed') {
        if (Math.random() < 0.28) { this.state = 'fake'; this.t = 0.45; }
        else { this.state = 'open'; this.t = rand(0.55, 0.8) - this.rounds * 0.02; this.tapped = false; this.rounds++; this.g.audio.blip(); }
      } else {
        if (this.state === 'open' && !this.tapped) { this.combo = 0; this.fb = { txt: 'too slow!', t: this.time }; }
        this.state = 'closed'; this.t = rand(0.8, 2.0);
        if (this.rounds >= 8) this.end();
      }
    }
  }
  draw(c, W, H) {
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#fde6c8'); g.addColorStop(1, '#f2b49e'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    const r = Math.min(W, H) * 0.24;
    const face = this.fb && this.time - this.fb.t < 0.8 ? (this.fb.good ? 'giggle' : 'wow') : this.open > 0.6 ? 'wow' : 'content';
    drawBabyHead(c, W / 2, H * 0.56, r, face, { dir: 1, skin: this.g.player.look.babySkin, bonnet: this.g.player.look.bonnet });
    // parent's hands
    const skin = this.g.player.look.skin;
    const off = this.open * r * 1.3;
    for (const s of [-1, 1]) {
      c.fillStyle = skin; c.strokeStyle = 'rgba(60,30,20,0.4)'; c.lineWidth = 2;
      c.beginPath(); c.ellipse(W / 2 + s * (r * 0.42 + off), H * 0.56, r * 0.55, r * 0.8, s * 0.15, 0, Math.PI * 2); c.fill(); c.stroke();
      for (let k = 0; k < 4; k++) { c.beginPath(); c.ellipse(W / 2 + s * (r * 0.42 + off) + (k - 1.5) * r * 0.22, H * 0.56 - r * 0.85, r * 0.11, r * 0.28, 0, 0, Math.PI * 2); c.fill(); }
    }
    c.fillStyle = '#3a2420'; c.font = 'bold 20px sans-serif'; c.textAlign = 'center';
    c.fillText(`Peekaboos: ${this.hits}   Combo: ${this.combo}`, W / 2, H - 22);
    if (this.fb && this.time - this.fb.t < 0.9) { c.font = 'bold 34px sans-serif'; c.fillStyle = this.fb.good ? '#d4504f' : '#5a6496'; c.fillText(this.fb.txt, W / 2, H * 0.27); }
  }
  tap() {
    if (this.state === 'open' && !this.tapped) {
      this.tapped = true; this.hits++; this.combo++;
      this.fb = { txt: this.combo > 2 ? `BOO! x${this.combo}` : 'BOO!', t: this.time, good: true };
      this.g.audio.giggle();
      this.t = Math.min(this.t, 0.25);
    } else {
      this.combo = 0; this.fb = { txt: this.state === 'fake' ? 'fake-out!' : 'hmm?', t: this.time };
      this.g.audio.miss();
    }
  }
  end() {
    this.over = true;
    const stars = this.hits >= 7 ? 3 : this.hits >= 5 ? 2 : 1;
    const b = this.g.baby;
    const lines = [stars === 3 ? 'Belly laughs all around!' : stars === 2 ? 'Lots of giggles!' : 'A few giggles. Practice makes perfect!'];
    if (b.need?.id === 'bored') b.meetNeed('bored', '*breathless giggles*'); else b.happy(null, 0.05 * stars);
    if (stars === 3) this.g.journal.first('laughed so hard they got the hiccups');
    if (this.mg.record('peekaboo', stars)) lines.push('New best!');
    setTimeout(() => this.mg.finish(stars, false, lines), 300);
  }
}
