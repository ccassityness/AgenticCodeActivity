// Little canvas effects: floating hearts, sparkles, music notes and emote bubbles.
import { SPR } from './sprites.js';

export class FX {
  constructor() { this.parts = []; this.emotes = []; }
  hearts(x, y, n = 3) {
    for (let i = 0; i < n; i++) this.parts.push({ spr: SPR.heart, x: x + (Math.random() - 0.5) * 10, y, vx: (Math.random() - 0.5) * 8, vy: -14 - Math.random() * 10, life: 1.4 + Math.random() * 0.5, delay: i * 0.12 });
  }
  sparkles(x, y, n = 4) {
    for (let i = 0; i < n; i++) this.parts.push({ spr: SPR.sparkle, x: x + (Math.random() - 0.5) * 14, y: y + (Math.random() - 0.5) * 8, vx: 0, vy: -6, life: 0.7 + Math.random() * 0.4, delay: i * 0.08 });
  }
  notes(x, y) {
    for (let i = 0; i < 3; i++) this.parts.push({ spr: SPR.note, x: x + (Math.random() - 0.5) * 8, y, vx: 6 + Math.random() * 6, vy: -10, life: 1.6, delay: i * 0.35, wave: true });
  }
  emote(anchor, type, dur = 1.8) {
    this.emotes = this.emotes.filter(e => e.anchor !== anchor);
    this.emotes.push({ anchor, spr: SPR.emote[type], life: dur, t: 0 });
  }
  update(dt) {
    for (const p of this.parts) {
      if (p.delay > 0) { p.delay -= dt; continue; }
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.wave) p.x += Math.sin(p.life * 8) * 0.3;
    }
    this.parts = this.parts.filter(p => p.life > 0);
    for (const e of this.emotes) { e.life -= dt; e.t += dt; }
    this.emotes = this.emotes.filter(e => e.life > 0);
  }
  draw(ctx, ox, oy) {
    for (const p of this.parts) {
      if (p.delay > 0) continue;
      ctx.globalAlpha = Math.min(1, p.life * 2);
      ctx.drawImage(p.spr.r, Math.round(p.x - ox - p.spr.w / 2), Math.round(p.y - oy - p.spr.h / 2));
    }
    ctx.globalAlpha = 1;
    for (const e of this.emotes) {
      const a = e.anchor();
      if (!a) continue;
      const pop = e.t < 0.15 ? Math.round((0.15 - e.t) * 20) : 0;
      ctx.drawImage(e.spr.r, Math.round(a.x - ox - 6), Math.round(a.y - oy - 14 + pop));
    }
  }
}
