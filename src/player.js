// The parent: tap-to-walk plus jump, run and stamina, with simple platforming physics
// (boulders and logs to hop over, ledges to climb onto).
import { drawPerson } from './figures.js';

const GRAV = 300, JUMP_V = 104, WALK = 40, RUN = 74;

export class Player {
  constructor(game, look) {
    this.g = game;
    this.look = look;
    this.x = 110; this.y = 100; this.vy = 0;
    this.onGround = true;
    this.dir = 1;
    this.target = null; this.onArrive = null;
    this.keyDir = 0;
    this.state = 'idle';
    this.actT = 0; this.phase = 0;
    this.moving = false; this.running = false; this.runHeld = false;
    this.stamina = 100;
    this.seat = null;
    this.airT = 0;
    this.tiredT = 0;
  }
  get area() { return this.g.area; }
  place(x) { this.x = x; this.y = this.area.supportAt(x, -999); this.vy = 0; this.onGround = true; this.stop(); }

  walkTo(x, cb = null) {
    if (this.state === 'sit') this.stand();
    this.target = Math.max(12, Math.min(this.area.width - 12, x));
    this.onArrive = cb;
  }
  stop() { this.target = null; this.onArrive = null; }
  sit(bench) { this.stop(); this.state = 'sit'; this.seat = bench; this.x = bench.x; this.y = this.area.groundY(this.x); }
  stand() { if (this.state !== 'sit') return; this.state = 'idle'; this.seat = null; this.g.onStand(); }
  act(kind, dur) {
    if (this.state === 'sit') { this.actT = dur; this.sitAct = kind; return; }
    this.stop(); this.state = kind; this.actT = dur;
  }

  jump() {
    if (this.state === 'sit') this.stand();
    if (!this.onGround) return false;
    if (this.stamina < 6) { this.puff(); return false; }
    this.vy = -JUMP_V;
    this.onGround = false;
    this.stamina -= 6;
    this.g.audio.jump();
    this.g.events.onJump();
    return true;
  }
  puff() {
    if (this.tiredT > 0) return;
    this.tiredT = 4;
    this.g.ui.say('parent', () => this.g.parentHead(), ['*huff* …need a breather', 'phew… water?', 'legs… jelly…'][(Math.random() * 3) | 0], { dur: 2 });
  }

  update(dt) {
    this.actT -= dt; this.tiredT -= dt;
    if (this.state === 'sit') { if (this.actT <= 0) this.sitAct = null; this.stamina = Math.min(100, this.stamina + 18 * dt); return; }
    const acting = ['rock', 'feed', 'bounce'].includes(this.state);
    if (acting && this.actT > 0 && !this.keyDir && this.target == null && this.onGround) { this.stamina = Math.min(100, this.stamina + 4 * dt); return; }
    if (acting) this.state = 'idle';

    const A = this.area;
    let mv = this.keyDir || (this.target != null ? Math.sign(this.target - this.x) : 0);
    const wantRun = (this.runHeld || this.autoRun) && this.stamina > 2;
    this.running = !!(mv && wantRun);
    this.moving = false;
    if (mv) {
      const ground = A.groundY(this.x);
      const slope = (A.groundY(this.x + mv * 3) - ground) / 3; // >0 downhill
      let sp = (this.running ? RUN : WALK) * Math.max(0.6, slope < 0 && this.onGround ? 1 + slope * 0.9 : 1);
      if (this.stamina < 12 && !this.running) sp *= 0.8;
      if (this.speedBoost > 0) { sp *= 1.25; this.speedBoost -= dt; }
      let nx = this.x + mv * sp * dt;
      // obstacles
      const block = A.blockerAt(nx, this.y);
      if (block && !A.blockerAt(this.x, this.y)) {
        if (this.onGround && this.target != null && block.h <= 10) this.jump();     // auto-hop small stuff
        else if (this.onGround && this.target != null && this.bumpT === undefined) { this.bumpT = 0.8; this.g.ui.say('parent', () => this.g.parentHead(), 'Too tall — jump! ⤴', { dur: 1.6 }); }
        nx = this.x;
      }
      if (this.bumpT !== undefined) { this.bumpT -= dt; if (this.bumpT <= 0) this.bumpT = undefined; }
      if (nx !== this.x) {
        this.x = nx; this.moving = true;
        this.phase += dt * (this.running ? 13 : 7.5) * Math.min(1.3, sp / WALK);
        const step = Math.floor(this.phase / Math.PI);
        if (step !== this._step) { this._step = step; if (this.onGround) { this.g.audio.step(); if (this.running) this.g.fx.dust(this.x - this.dir * 3, this.y - 0.5); } }
        // stamina: running drains, climbing uphill drains a little
        if (this.running) this.stamina -= 9 * dt;
        else if (slope < -0.12) this.stamina -= 1.6 * dt;
        else this.stamina = Math.min(100, this.stamina + 3 * dt);
      }
      this.dir = mv;
      if (this.target != null && Math.sign(this.target - this.x) !== mv) {
        this.x = this.target;
        const cb = this.onArrive;
        this.stop();
        if (cb && this.onGround) cb(); else if (cb) this.pendingArrive = cb;
      }
    } else {
      this.stamina = Math.min(100, this.stamina + 7 * dt);
    }
    if (this.stamina <= 2 && this.running) { this.running = false; this.puff(); }
    this.stamina = Math.max(0, this.stamina);
    this.x = Math.max(12, Math.min(A.width - 12, this.x));

    // vertical
    if (this.onGround) {
      const s = A.supportAt(this.x, this.y, 3);
      if (s > this.y + 3) { this.onGround = false; this.vy = 0; }       // walked off a ledge
      else this.y = s;
    }
    if (!this.onGround) {
      const prev = this.y;
      this.vy += GRAV * dt;
      this.y += this.vy * dt;
      this.airT += dt;
      if (this.vy > 0) {
        const s = A.supportAt(this.x, prev, 0.5);
        if (this.y >= s) {
          this.y = s; this.vy = 0; this.onGround = true;
          if (this.airT > 0.25) { this.g.audio.land(); this.g.fx.dust(this.x - 2, this.y - 0.5); this.g.fx.dust(this.x + 2, this.y - 0.5); }
          this.airT = 0;
          if (this.pendingArrive) { const cb = this.pendingArrive; this.pendingArrive = null; cb(); }
        }
      }
    }
    this.state = !this.onGround ? 'jump' : this.moving ? (this.running ? 'run' : 'walk') : 'idle';
  }

  babyAnchor() {
    const sit = this.state === 'sit' ? 3 : 0;
    if (this.g.baby.carrier === 'front') return { x: this.x + this.dir * 4, y: this.y + sit - 21 };
    return { x: this.x - this.dir * 4, y: this.y + sit - 27 };
  }

  draw(ctx, ox, oy) {
    const b = this.g.baby;
    drawPerson(ctx, this.x - ox, this.y - oy, this.look, {
      dir: this.dir,
      state: this.state === 'feed' ? 'idle' : this.sitAct === 'rock' ? 'rock' : this.state,
      phase: this.phase, t: this.g.now,
      baby: { skin: this.look.babySkin, bonnet: this.look.bonnet, hat: b.wearing.hat, blanket: b.wearing.blanket, pacifier: b.wearing.pacifier && (b.napping || b.face === 'content') },
      babyFace: b.face, babyPos: b.carrier,
      babyBob: b.giggleT > 0 ? -Math.abs(Math.sin(this.g.now * 14)) * 0.5 : 0,
      babyKick: b.giggleT > 0 ? this.g.now * 10 : 0,
      feeding: b.feedT > 0,
    });
  }
}
