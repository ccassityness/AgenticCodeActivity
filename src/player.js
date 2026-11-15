// The parent: tap-to-walk (or arrow keys) along the path and boardwalk.
import { drawHuman } from './figures.js?v=20261117a';
import { groundY, WORLD_W } from './world.js?v=20261117a';

export class Player {
  constructor(game, look) {
    this.g = game;
    this.look = look;
    this.x = 120; this.y = groundY(120);
    this.dir = 1; this.speed = 34;
    this.target = null; this.onArrive = null; this.keyDir = 0;
    this.state = 'idle'; this.actT = 0; this.phase = 0;
    this.moving = false; this.seat = null;
  }
  walkTo(x, cb = null) {
    if (this.state === 'sit') this.stand();
    this.target = Math.max(12, Math.min(WORLD_W - 12, x));
    this.onArrive = cb;
  }
  stop() { this.target = null; this.onArrive = null; }
  sit(bench) { this.stop(); this.state = 'sit'; this.seat = bench; this.x = bench.x; this.y = groundY(this.x); }
  stand() { if (this.state !== 'sit') return; this.state = 'idle'; this.seat = null; this.g.onStand(); }
  act(kind, dur) {
    if (this.state === 'sit') { this.actT = dur; this.sitAct = kind; return; }
    this.stop(); this.state = kind; this.actT = dur;
  }
  update(dt) {
    this.actT -= dt;
    if (this.state === 'sit') { if (this.actT <= 0) this.sitAct = null; return; }
    const acting = ['rock', 'feed', 'bounce'].includes(this.state);
    if (acting && this.actT > 0 && !this.keyDir && this.target == null) return;
    if (acting) this.state = 'idle';
    const mv = this.keyDir || (this.target != null ? Math.sign(this.target - this.x) : 0);
    this.moving = false;
    if (mv) {
      this.x += mv * this.speed * dt;
      this.dir = mv; this.moving = true; this.state = 'walk';
      const before = Math.floor(this.phase / Math.PI);
      this.phase += dt * 7.2;
      if (Math.floor(this.phase / Math.PI) !== before) this.g.audio.step(this.g.onBoardwalk);
      if (this.target != null && Math.sign(this.target - this.x) !== mv) {
        this.x = this.target;
        const cb = this.onArrive;
        this.stop(); this.state = 'idle'; this.moving = false;
        if (cb) cb();
      }
    } else if (this.state === 'walk') this.state = 'idle';
    this.x = Math.max(12, Math.min(WORLD_W - 12, this.x));
    this.y = groundY(this.x);
  }
  babyAnchor() {
    const sit = this.state === 'sit' ? 3 : 0;
    const H = this.look.parent.height || 1;
    if (this.g.baby.carrier === 'front') return { x: this.x + this.dir * 5, y: this.y + sit - 25 * H };
    return { x: this.x - this.dir * 5, y: this.y + sit - 31 * H };
  }
  draw(ctx, ox, oy) {
    const b = this.g.baby;
    const st = this.state === 'sit' ? (this.sitAct === 'rock' ? 'sit' : 'sit') : this.state;
    drawHuman(ctx, this.x - ox, this.y - oy + (this.state === 'sit' ? 3 : 0), this.look.parent, {
      dir: this.dir, state: st, phase: this.phase, t: this.g.now,
      baby: { look: this.look.baby, face: b.face, hatOn: b.wearing.hat, blanket: b.wearing.blanket, pacifier: b.wearing.pacifier && (b.napping || b.face === 'content') },
      carrier: this.look.carrier, babyPos: b.carrier,
      babyBob: b.giggleT > 0 ? -Math.abs(Math.sin(this.g.now * 14)) * 0.4 : 0,
      babyKick: b.giggleT > 0 ? this.g.now * 10 : 0,
      feeding: b.feedT > 0,
    });
  }
}
