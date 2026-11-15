// Pointer (tap/click) and keyboard input.
export function setupInput(game, canvas) {
  canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    game.audio.unlock();
    const r = canvas.getBoundingClientRect();
    const sx = (e.clientX - r.left) / r.width * game.W;
    const sy = (e.clientY - r.top) / r.height * game.H;
    game.tap(sx + game.camX, sy + game.camY);
  });

  const held = new Set();
  const updateDir = () => {
    const l = held.has('ArrowLeft') || held.has('a') || held.has('A');
    const r = held.has('ArrowRight') || held.has('d') || held.has('D');
    game.player.keyDir = (r ? 1 : 0) - (l ? 1 : 0);
    if (game.player.keyDir) {
      game.player.stop();
      if (game.player.state === 'sit') game.player.stand();
      game.ui.closeMenu();
    }
  };
  window.addEventListener('keydown', e => {
    if (!game.started || e.target.tagName === 'INPUT') return;
    game.audio.unlock();
    const k = e.key;
    if (['ArrowLeft', 'ArrowRight', 'a', 'd', 'A', 'D'].includes(k)) { held.add(k); updateDir(); e.preventDefault(); return; }
    if (k === 'Shift') { game.player.runHeld = true; return; }
    if (e.repeat) return;
    if (game.minigames.on) return;
    if ((k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W') && !game.ui.dlg && game.ui.menuEl.hidden && !game.ui.panelOpen) { e.preventDefault(); game.player.jump(); return; }
    if (k === ' ' || k === 'Enter' || k === 'e' || k === 'E') {
      e.preventDefault();
      if (game.ui.panelOpen) return;
      if (game.ui.dlg) game.ui.advance();
      else if (!game.ui.menuEl.hidden) game.ui.menuEl.querySelector('#menuActions button')?.click();
      else game.interactNearest();
    } else if (k === 'b' || k === 'B') game.openBabyMenu();
    else if (k === 'i' || k === 'I') game.ui.openBag();
    else if (k === 'j' || k === 'J') game.ui.openJournal();
    else if (k === 'n' || k === 'N') game.ui.openMap();
    else if (k === 'p' || k === 'P') game.takePhoto();
    else if (k === 'm' || k === 'M') game.toggleMute();
    else if (k === 'Escape') {
      game.ui.closeMenu(); game.ui.closeDialogue(false); game.ui.closeBag();
      for (const id of ['journal', 'album', 'map']) document.getElementById(id).hidden = true;
    }
  });
  window.addEventListener('keyup', e => { held.delete(e.key); if (e.key === 'Shift') game.player.runHeld = false; updateDir(); });
  window.addEventListener('blur', () => { held.clear(); updateDir(); });
}
