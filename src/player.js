// The parent: tap-to-walk movement along the trail, plus a few action poses.
import { drawSprite, SPR } from './sprites.js';
import { groundY, WORLD_W } from './world.js';

export class Player {
  constructor(game, frames, babyFrames) {
    this.g = game;
    this.frames = frames;
    this.babyFrames = babyFrames;
    this.x = 110;
    this.y = groundY(this.x);
    this.dir = 1;
    this.speed = 40;
    this.target = null;
    this.onArrive = null;
    this.keyDir = 0;
    this.state = 'idle';   // idle | walk | sit | rock | feed | bounce
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
    const acting = ['rock', 'feed', 'bounce'].includes(this.state);
    if (acting && this.actT > 0 && !this.keyDir && this.target == null) return;
    if (acting) this.state = 'idle';

    const mv = this.keyDir || (this.target != null ? Math.sign(this.target - this.x) : 0);
    this.moving = false;
    if (mv) {
      const slope = (groundY(this.x + mv * 3) - groundY(this.x)) / 3; // >0 downhill
      this.speedBoost = (this.speedBoost || 0) - dt;
      const sp = this.speed * (this.speedBoost > 0 ? 1.3 : 1) * Math.max(0.65, slope < 0 ? 1 + slope * 0.9 : 1);
      this.x += mv * sp * dt;
      this.dir = mv;
      this.moving = true;
      this.state = 'walk';
      const before = Math.floor(this.walkT);
      this.walkT += dt * 7 * Math.min(1.3, sp / this.speed);
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

  /** Baby head position in world space (for bubbles). */
  babyAnchor() {
    const sit = this.state === 'sit' ? 3 : 0;
    const top = this.y + sit - 29;
    if (this.g.baby.carrier === 'front') return { x: this.x + this.dir * 4, y: top + 11 };
    return { x: this.x - this.dir * 7, y: top + 7 };
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
    } else if (this.state === 'bounce') {
      bob = -Math.round(Math.abs(Math.sin(this.g.now * 9)) * 2);
    } else {
      bob = Math.sin(this.g.now * 2) > 0.7 ? -1 : 0; // gentle breathing
    }
    const sitOff = this.state === 'sit' ? 3 : 0;
    const x = Math.round(this.x - ox) + dx;
    const y = Math.round(this.y - oy) + bob + sitOff;
    const sx = x - Math.round(spr.w / 2), sy = y - spr.h + spr.pad;
    const baby = this.g.baby;
    const bspr = this.babyFrames[baby.face] || this.babyFrames.content;
    const bbob = baby.giggleT > 0 ? -Math.round(Math.abs(Math.sin(this.g.now * 14))) : 0;
    const right = this.dir > 0;

    const drawBaby = (bx, by) => {
      ctx.drawImage(right ? bspr.r : bspr.l, bx, by);
      if (baby.wearing.blanket) ctx.drawImage(SPR.babyBlanket.r, bx + 1, by + 7);
      if (baby.wearing.hat) ctx.drawImage(SPR.babyHat.r, bx + 1, by - 1);
      if (baby.napping && baby.wearing.pacifier) ctx.drawImage(SPR.babyPacifier.r, bx + 5, by + 7);
    };

    if (baby.carrier === 'back') drawBaby(right ? sx - 4 : sx + spr.w + 4 - 12, sy + 6 + bbob);
    drawSprite(ctx, spr, x, y, this.dir);
    if (baby.carrier === 'front') {
      const bx = right ? sx + 6 : sx + spr.w - 6 - 12;
      const by = sy + 11 + bbob;
      drawBaby(bx, by);
      if (baby.feedT > 0) ctx.drawImage(SPR.bottle.r, right ? bx + 9 : bx - 2, by + 7);
    } else if (baby.feedT > 0) {
      ctx.drawImage(SPR.bottle.r, right ? sx - 5 : sx + spr.w, sy + 12);
    }
  }
}
