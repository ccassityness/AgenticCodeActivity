// Canvas effects: floating hearts, sparkles, music notes, emote bubbles, rain and dust motes.
import { circle } from './color.js?v=20261117a';

function heart(ctx, x, y, s, col = '#e8506a') {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.35);
  ctx.bezierCurveTo(x - s * 0.9, y - s * 0.25, x - s * 0.45, y - s * 0.95, x, y - s * 0.45);
  ctx.bezierCurveTo(x + s * 0.45, y - s * 0.95, x + s * 0.9, y - s * 0.25, x, y + s * 0.35);
  ctx.fill();
}
function sparkle(ctx, x, y, s, col = 'rgba(255,248,200,1)') {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x, y - s); ctx.quadraticCurveTo(x, y, x + s, y); ctx.quadraticCurveTo(x, y, x, y + s); ctx.quadraticCurveTo(x, y, x - s, y); ctx.quadraticCurveTo(x, y, x, y - s);
  ctx.fill();
}
function note(ctx, x, y, s) {
  ctx.fillStyle = '#3a2420'; ctx.strokeStyle = '#3a2420'; ctx.lineWidth = s * 0.18;
  ctx.beginPath(); ctx.ellipse(x, y, s * 0.42, s * 0.3, -0.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + s * 0.38, y); ctx.lineTo(x + s * 0.38, y - s * 1.3); ctx.quadraticCurveTo(x + s * 0.9, y - s * 1.1, x + s * 0.8, y - s * 0.7); ctx.stroke();
}

export function drawEmote(ctx, x, y, type, pop = 0) {
  const w = 9, h = 8;
  ctx.save(); ctx.translate(x, y + pop);
  ctx.fillStyle = 'rgba(40,25,20,0.25)'; ctx.beginPath(); ctx.roundRect(-w / 2 + 0.4, -h + 0.6, w, h, 3); ctx.fill();
  ctx.fillStyle = '#fffaf0'; ctx.strokeStyle = '#3a2420'; ctx.lineWidth = 0.45;
  ctx.beginPath(); ctx.roundRect(-w / 2, -h, w, h, 3); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-1, 0); ctx.lineTo(0, 1.6); ctx.lineTo(1, 0); ctx.fill();
  const cy = -h / 2;
  if (type === 'heart') heart(ctx, 0, cy + 0.6, 3.6);
  else if (type === 'note') note(ctx, -0.6, cy + 1.2, 2.4);
  else if (type === 'zz') { ctx.fillStyle = '#5a6496'; ctx.font = 'bold 4.5px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('z', -1.2, cy + 2); ctx.font = 'bold 3px sans-serif'; ctx.fillText('z', 1.8, cy); }
  else { ctx.fillStyle = type === '!' ? '#d4504f' : '#3f6aa0'; ctx.font = 'bold 6px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(type, 0, cy + 2.2); }
  ctx.restore();
}

export class FX {
  constructor() { this.parts = []; this.emotes = []; this.rain = []; this.motes = []; }
  hearts(x, y, n = 3) {
    for (let i = 0; i < n; i++) this.parts.push({ k: 'heart', x: x + (Math.random() - 0.5) * 10, y, vx: (Math.random() - 0.5) * 8, vy: -14 - Math.random() * 10, life: 1.4 + Math.random() * 0.5, delay: i * 0.12, s: 2 + Math.random() });
  }
  sparkles(x, y, n = 4) {
    for (let i = 0; i < n; i++) this.parts.push({ k: 'sparkle', x: x + (Math.random() - 0.5) * 14, y: y + (Math.random() - 0.5) * 8, vx: 0, vy: -6, life: 0.7 + Math.random() * 0.4, delay: i * 0.08, s: 1.5 + Math.random() });
  }
  notes(x, y) {
    for (let i = 0; i < 3; i++) this.parts.push({ k: 'note', x: x + (Math.random() - 0.5) * 8, y, vx: 6 + Math.random() * 6, vy: -10, life: 1.6, delay: i * 0.35, wave: true, s: 2.4 });
  }
  ripple(x, y) { for (let i = 0; i < 3; i++) this.parts.push({ k: 'ripple', x, y, vx: 0, vy: 0, life: 2.2, max: 2.2, delay: i * 0.35, s: 1 }); }
  dust(x, y) { this.parts.push({ k: 'dust', x, y, vx: (Math.random() - 0.5) * 10, vy: -3 - Math.random() * 3, life: 0.6, delay: 0, s: 1 + Math.random() }); }
  emote(anchor, type, dur = 1.8) {
    this.emotes = this.emotes.filter(e => e.anchor !== anchor);
    this.emotes.push({ anchor, type, life: dur, t: 0 });
  }
  drawEmoteAt(ctx, x, y, type) { drawEmote(ctx, x, y, type); }
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
      ctx.globalAlpha = p.k === 'ripple' ? 1 : Math.min(1, p.life * 2);
      const x = p.x - ox, y = p.y - oy;
      if (p.k === 'heart') heart(ctx, x, y, p.s);
      else if (p.k === 'sparkle') sparkle(ctx, x, y, p.s);
      else if (p.k === 'note') note(ctx, x, y, p.s);
      else if (p.k === 'ripple') { const k = 1 - p.life / p.max; ctx.strokeStyle = `rgba(240,250,250,${0.6 * (1 - k)})`; ctx.lineWidth = 0.25; ctx.beginPath(); ctx.ellipse(x, y, 1 + k * 12, 0.3 + k * 0.9, 0, 0, Math.PI * 2); ctx.stroke(); }
      else if (p.k === 'dust') { ctx.fillStyle = 'rgba(220,190,150,0.6)'; circle(ctx, x, y, p.s); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    for (const e of this.emotes) {
      const a = e.anchor();
      if (!a) continue;
      const pop = e.t < 0.15 ? (0.15 - e.t) * 20 : 0;
      drawEmote(ctx, a.x - ox, a.y - oy - 1, e.type, pop);
    }
  }
  /** Screen-space weather: rain streaks and drifting dust motes in sunbeams. */
  weather(ctx, W, H, dt, storm, motes) {
    if (storm > 0.05) {
      while (this.rain.length < 160 * storm) this.rain.push({ x: Math.random() * (W + 40), y: Math.random() * H, v: 160 + Math.random() * 80 });
      ctx.strokeStyle = `rgba(200,210,230,${0.35 * storm})`; ctx.lineWidth = 0.35;
      ctx.beginPath();
      for (const r of this.rain) {
        r.y += r.v * dt; r.x -= r.v * 0.25 * dt;
        if (r.y > H) { r.y = -5; r.x = Math.random() * (W + 40); }
        ctx.moveTo(r.x, r.y); ctx.lineTo(r.x + 1.2, r.y - 5);
      }
      ctx.stroke();
    } else this.rain.length = 0;
    if (motes > 0) {
      while (this.motes.length < 30) this.motes.push({ x: Math.random() * W, y: Math.random() * H, p: Math.random() * 6 });
      ctx.fillStyle = `rgba(255,235,190,${0.35 * motes})`;
      for (const m of this.motes) {
        m.p += dt; m.x += Math.sin(m.p * 0.7) * 3 * dt + 2 * dt; m.y += Math.cos(m.p * 0.5) * 2 * dt;
        if (m.x > W) m.x = 0;
        ctx.beginPath(); ctx.arc(m.x, m.y, 0.3 + (Math.sin(m.p * 2) + 1) * 0.15, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
}
