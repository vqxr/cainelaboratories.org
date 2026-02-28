// hover-sounds.js — Wires up UI tick sounds to interactive elements
import { soundManager } from '../sound.js';

export function initHoverSounds() {
    // Select all interactive elements
    const interactives = document.querySelectorAll('a, button, .interactive, .stat-card, .math-block, .pair-card');

    interactives.forEach(el => {
        el.addEventListener('mouseenter', () => {
            if (soundManager.initialized && !soundManager.muted) {
                soundManager.playUITick();
            }
        });
    });
}
