// main.js — Slim orchestrator
import './style.css';

import { initEngine, getScene, getCamera, getComposer } from './core/engine.js';
import { initScroll } from './core/scroll.js';
import { createHelix, updateHelix } from './world/helix.js';
import { createCellField, updateCellField } from './world/cell-field.js';
import { buildCardsUI } from './ui/cards.js';
import { initSoundToggle } from './ui/sound-toggle.js';
import { initGlassPanel } from './ui/glass-panel.js';

init();

async function init() {
    const { scene, camera } = initEngine();

    createHelix(scene);
    createCellField(scene);

    initScroll(camera);
    initSoundToggle();
    initGlassPanel();

    try {
        const res = await fetch('/top_pairs.json');
        const data = await res.json();
        buildCardsUI(data);
    } catch (e) {}

    // Use composer (not renderer) so bloom post-processing runs every frame
    const composer = getComposer();
    composer.setAnimationLoop(animate);
}

function animate(time) {
    const t = time * 0.001;
    updateHelix(t);
    updateCellField(t);
    getComposer().render();
}