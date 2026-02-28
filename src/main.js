// main.js — Orchestrator. Uses composer.render() for bloom post-processing.
import './style.css';

import { initEngine, getScene, getCamera, getRenderer, getComposer } from './core/engine.js';
import { initScroll } from './core/scroll.js';
import { createHelix, updateHelix } from './world/helix.js';
import { createCellField, updateCellField } from './world/cell-field.js';
import { createMarkers, updateMarkers } from './world/markers.js';
import { buildCardsUI } from './ui/cards.js';
import { initSoundToggle } from './ui/sound-toggle.js';
import { initGlassPanel } from './ui/glass-panel.js';
import { initCursor } from './ui/cursor.js';
import { initHoverSounds } from './ui/hover-sounds.js';

init();

async function init() {
    const { scene, camera } = initEngine();

    createHelix(scene);
    createCellField(scene);
    createMarkers(scene);

    initScroll(camera);
    initSoundToggle();
    initGlassPanel();
    initCursor();
    initHoverSounds();

    try {
        const res = await fetch('/top_pairs.json');
        const data = await res.json();
        buildCardsUI(data);
    } catch (e) { }

    // Animation loop on the renderer, render via composer for bloom
    const renderer = getRenderer();
    renderer.setAnimationLoop(animate);
}

function animate(time) {
    const t = time * 0.001;
    updateHelix(t);
    updateCellField(t);
    updateMarkers(t);
    getComposer().render();
}