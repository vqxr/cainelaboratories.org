// main.js — Orchestrator. Uses composer.render() for bloom post-processing.
import './style.css';

import { initEngine, getScene, getCamera, getRenderer, getComposer } from './core/engine.js';
import { initScroll } from './core/scroll.js';
import { createHelix, updateHelix } from './world/helix.js';
import { createCellField, updateCellField } from './world/cell-field.js';
import { createMarkers, updateMarkers } from './world/markers.js';
import { buildCardsUI } from './ui/cards.js';
import { initSoundToggle } from './ui/sound-toggle.js';
import { initCursor } from './ui/cursor.js';
import { initHoverSounds } from './ui/hover-sounds.js';

init();

async function init() {
    const loader = document.getElementById('loader');
    const progressBar = document.getElementById('loader-progress');
    const statusText = document.getElementById('loader-status');

    const updateLoader = (progress, status) => {
        if (progressBar) progressBar.style.width = `${progress}%`;
        if (statusText && status) statusText.innerText = status;
    };

    updateLoader(10, 'Initializing Engine...');
    const { scene, camera } = initEngine();

    updateLoader(30, 'Building biological structures...');
    createHelix(scene);
    createCellField(scene);
    createMarkers(scene);

    updateLoader(50, 'Calibrating scroll-driven logic...');
    initScroll(camera);
    initSoundToggle();
    initCursor();
    initHoverSounds();

    try {
        updateLoader(70, 'Fetching neural atlas data...');
        const res = await fetch('/top_pairs.json');
        const data = await res.json();
        buildCardsUI(data);
    } catch (e) { }

    updateLoader(90, 'Finalizing render pass...');

    // Animation loop on the renderer, render via composer for bloom
    const renderer = getRenderer();
    renderer.setAnimationLoop(animate);

    // Fade out loader
    setTimeout(() => {
        updateLoader(100, 'Sequence Complete');
        setTimeout(() => {
            if (loader) loader.classList.add('fade-out');
        }, 400);
    }, 600);
}

function animate(time) {
    const t = time * 0.001;
    updateHelix(t);
    updateCellField(t);
    updateMarkers(t);
    getComposer().render();
}