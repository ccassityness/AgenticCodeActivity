// The parent: tap-to-walk movement along the trail, plus a few action poses.
import { drawSprite } from './sprites.js';
import { groundY, WORLD_W } from './world.js';

export class Player {
  constructor(game, frames, babyFrames) {
    this.g = game;
    this.frames = frames;
    this.babyFrames = babyFrames;
    this.x = 110;
    this.y = groundY(this.x);
    this.dir = 1;
    this.speed = 38;
    this.target = null;
    this.onArrive = null;
    this.keyDir = 0;
    this.state = 'idle';   // idle | walk | sit | rock | feed
    this.actT = 0;
    this.walkT = 0;
    this.moving = false;
    this.seat = null;
  }

  walkTo(x, cb = null) {
    if (this.state === 'sit') this.stand();
    this.target = Math.max(12, Math.min(WORLD_W - 12, x));
    this.onArrive = cb;
  }
  stop() { this.target = null; this.onArrive = null; }

  sit(bench) {
    this.stop();
    this.state = 'sit';
    this.seat = bench;
    this.x = bench.x;
    this.y = groundY(this.x);
  }
  stand() {
    if (this.state !== 'sit') return;
    this.state = 'idle';
    this.seat = null;
    this.g.onStand();
  }
  act(kind, dur) {
    if (this.state === 'sit') { this.actT = dur; this.sitAct = kind; return; }
    this.stop();
    this.state = kind;
    this.actT = dur;
  }

  update(dt) {
    this.actT -= dt;
    if (this.state === 'sit') { if (this.actT <= 0) this.sitAct = null; return; }
    if ((this.state === 'rock' || this.state === 'feed') && this.actT > 0 && !this.keyDir && this.target == null) return;
    if (this.state === 'rock' || this.state === 'feed') this.state = 'idle';

    const mv = this.keyDir || (this.target != null ? Math.sign(this.target - this.x) : 0);
    this.moving = false;
    if (mv) {
      const slope = (groundY(this.x + mv * 3) - groundY(this.x)) / 3; // >0 downhill
      const sp = this.speed * Math.max(0.65, slope < 0 ? 1 + slope * 0.9 : 1);
      this.x += mv * sp * dt;
      this.dir = mv;
      this.moving = true;
      this.state = 'walk';
      const before = Math.floor(this.walkT);
      this.walkT += dt * 7 * (sp / this.speed);
      if (Math.floor(this.walkT) !== before && Math.floor(this.walkT) % 2 === 0) this.g.audio.step();
      if (this.target != null && Math.sign(this.target - this.x) !== mv) {
        this.x = this.target;
        const cb = this.onArrive;
        this.stop();
        this.state = 'idle';
        this.moving = false;
        if (cb) cb();
      }
    } else if (this.state === 'walk') {
      this.state = 'idle';
    }
    this.x = Math.max(12, Math.min(WORLD_W - 12, this.x));
    this.y = groundY(this.x);
  }

  /** Where the baby's head is in world space. */
  babyAnchor() {
    const sit = this.state === 'sit' ? 3 : 0;
    const top = this.y + sit - 25;
    if (this.g.baby.carrier === 'front') return { x: this.x + this.dir * 4, y: top + 9 };
    return { x: this.x - this.dir * 6, y: top + 5 };
  }

  draw(ctx, ox, oy) {
    const f = this.frames;
    let spr = f.idle, bob = 0, dx = 0;
    if (this.state === 'walk') {
      const ph = Math.floor(this.walkT) % 4;
      spr = ph % 2 === 0 ? f.walkA : f.walkB;
      bob = ph % 2 === 1 ? -1 : 0;
    } else if (this.state === 'sit') {
      spr = f.sit;
    } else if (this.state === 'rock' || this.sitAct === 'rock') {
      dx = Math.round(Math.sin(this.g.now * 5));
    } else {
      bob = Math.sin(this.g.now * 2) > 0.7 ? -1 : 0; // gentle breathing
    }
    const sitOff = this.state === 'sit' ? 3 : 0;
    const x = Math.round(this.x - ox) + dx;
    const y = Math.round(this.y - oy) + bob + sitOff;
    const left = x - 7, top = y - spr.h;
    const baby = this.g.baby;
    const bspr = this.babyFrames[baby.face];
    const bbob = baby.giggleT > 0 ? Math.round(Math.abs(Math.sin(this.g.now * 14))) * -1 : 0;

    if (baby.carrier === 'back') {
      const bx = this.dir > 0 ? left - 3 : left + 14 + 3 - 8;
      ctx.drawImage(this.dir > 0 ? bspr.r : bspr.l, bx, top + 5 + bbob);
    }
    drawSprite(ctx, spr, x, y, this.dir);
    if (baby.carrier === 'front') {
      const bx = this.dir > 0 ? left + 7 : left + 14 - 7 - 8;
      ctx.drawImage(this.dir > 0 ? bspr.r : bspr.l, bx, top + 9 + bbob);
      if (baby.feedT > 0) {
        const b = this.g.sprites.bottle;
        ctx.drawImage(b.r, this.dir > 0 ? bx + 7 : bx - 2, top + 13);
      }
    } else if (baby.feedT > 0) {
      const b = this.g.sprites.bottle;
      ctx.drawImage(b.r, this.dir > 0 ? left - 4 : left + 15, top + 10);
    }
  }
}
