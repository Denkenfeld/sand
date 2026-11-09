/**
 * Keyboard + mouse input. Mouse look uses Pointer Lock; if the browser refuses
 * it (iframes, some embeds) we fall back to "hold a mouse button and drag".
 */
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.down = new Set();
    this.hit = new Set();      // keys pressed since last endFrame()
    this.dx = 0; this.dy = 0; this.wheel = 0;
    this.locked = false;
    this.dragging = false;
    this.enabled = false;
    this.onLockChange = () => {};

    window.addEventListener('keydown', (e) => {
      if (!this.enabled) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
      if (!e.repeat) this.hit.add(e.code);
      this.down.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.down.delete(e.code));
    window.addEventListener('blur', () => { this.down.clear(); this.dragging = false; });

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
      this.onLockChange(this.locked);
    });
    window.addEventListener('mousemove', (e) => {
      if (!this.enabled) return;
      if (this.locked || this.dragging) {
        // Chrome occasionally reports a huge movementX spike right after pointer lock is acquired -> ignore
        if (Math.abs(e.movementX) > 300 || Math.abs(e.movementY) > 300) return;
        this.dx += e.movementX; this.dy += e.movementY;
      }
    });
    canvas.addEventListener('mousedown', () => { this.dragging = true; });
    window.addEventListener('mouseup', () => { this.dragging = false; });
    canvas.addEventListener('wheel', (e) => { if (this.enabled) { this.wheel += Math.sign(e.deltaY); e.preventDefault(); } }, { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  requestLock() {
    try { const p = this.canvas.requestPointerLock?.(); if (p?.catch) p.catch(() => {}); } catch { /* fall back to drag-look */ }
  }
  releaseLock() { if (document.pointerLockElement) document.exitPointerLock(); }

  isDown(...codes) { return codes.some((c) => this.down.has(c)); }
  wasPressed(...codes) { return codes.some((c) => this.hit.has(c)); }

  /** Movement axes, -1..1 (x = right, y = forward). */
  axis() {
    const x = (this.isDown('KeyD', 'ArrowRight') ? 1 : 0) - (this.isDown('KeyA', 'ArrowLeft') ? 1 : 0);
    const y = (this.isDown('KeyW', 'ArrowUp') ? 1 : 0) - (this.isDown('KeyS', 'ArrowDown') ? 1 : 0);
    return { x, y };
  }

  endFrame() { this.hit.clear(); this.dx = 0; this.dy = 0; this.wheel = 0; }
}
