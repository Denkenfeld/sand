import { Game } from './Game.js';

const game = new Game();
window.__game = game;                      // handy for the console + automated tests
game.start();

// ?autostart skips the menu (used for screenshots / quick iteration)
if (new URLSearchParams(location.search).has('autostart')) {
  game.started = true; game.input.enabled = true; game._dragMode = true; game.pause(false);
}
window.__ready = true;
