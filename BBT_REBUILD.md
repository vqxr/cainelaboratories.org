# Bloomsbury Burger Therapeutics — Landing Page Rebuild
## Complete Step-by-Step Implementation Guide

---

## Before You Start

This guide assumes you have the existing Vite + Three.js project running locally. Every step is designed to be testable in the browser before moving to the next. Work through them in order — they build on each other.

**What you're building toward:** A clean, clinical 3D site where a single DNA helix sits in a dark void, lit by a three-point rig, with translucent cell spheres drifting behind it. The camera orbits it slowly on load, then flies through five scroll chapters — each one doing exactly one thing. The neon wireframe terrain, coloured particles, and fixed glass overlay are all gone.

---

## Step 0 — Delete Four Files

Do this first. Before touching any code.

Delete these files entirely from your project:

```
src/world/terrain.js
src/world/horizon.js
src/world/particles.js
src/world/target-marker.js
```

Then open `src/main.js` and remove every import and reference to them. Your new `main.js` should look like this:

```js
// main.js — Slim orchestrator
import './style.css';

import { initEngine, getScene, getCamera, getRenderer } from './core/engine.js';
import { initScroll } from './core/scroll.js';
import { createHelix, updateHelix } from './world/helix.js';
import { createCellField, updateCellField } from './world/cell-field.js';
import { buildCardsUI } from './ui/cards.js';
import { initSoundToggle } from './ui/sound-toggle.js';
import { initGlassPanel } from './ui/glass-panel.js';

init();

async function init() {
    const { scene, camera, renderer } = initEngine();

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

    renderer.setAnimationLoop(animate);
}

function animate(time) {
    const t = time * 0.001;
    updateHelix(t);
    updateCellField(t);
    getRenderer().render(getScene(), getCamera());
}
```

**Test:** Run `npm run dev`. The site should load with just the dark background and the existing helix visible (probably broken-looking for now — that's fine). No errors about missing files.

---

## Step 1 — Rewrite `src/core/engine.js`

This sets up the colour palette, lighting rig, fog, and camera. Everything else depends on this being right first.

Replace the entire file:

```js
// engine.js — Scene, Camera, Renderer, Lights
import * as THREE from 'three';

// FINAL COLOUR PALETTE
// Purple, green, and yellow are intentionally removed.
// One accent (red). Everything else is neutral.
export const COLORS = {
    BG:     new THREE.Color('#0a0a0f'),
    ACCENT: new THREE.Color('#ff4d6d'),  // the only accent — used on helix nodes only
    WHITE:  new THREE.Color('#e0e0e3'),
    CELL:   new THREE.Color('#b0c8ff'),  // cell spheres only
};

let scene, camera, renderer;

export function initEngine() {
    const container = document.getElementById('canvas-container');

    scene = new THREE.Scene();
    scene.background = COLORS.BG;

    // Tighter fog — anything beyond ~15 units fades into dark
    scene.fog = new THREE.FogExp2(COLORS.BG, 0.042);

    // Camera — looking directly at helix centre
    camera = new THREE.PerspectiveCamera(
        55,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(0, 3, 14);
    camera.lookAt(0, 1, -6);

    // Renderer
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // THREE-POINT LIGHTING RIG
    // This is what makes MeshPhysicalMaterial look expensive.

    // Dim ambient — just enough to see form in shadow
    const ambient = new THREE.AmbientLight(0x111122, 0.4);
    scene.add(ambient);

    // Key light — crisp directional from top-right
    const key = new THREE.DirectionalLight(0xffffff, 2.0);
    key.position.set(8, 12, 6);
    scene.add(key);

    // Rim light — cold blue from left-back
    const rim = new THREE.DirectionalLight(0x4488ff, 0.8);
    rim.position.set(-10, 2, -8);
    scene.add(rim);

    // Red fill — very dim, from below, gives a blush to the accent nodes
    const fill = new THREE.PointLight(0xff4d6d, 0.4, 20);
    fill.position.set(0, -3, 2);
    scene.add(fill);

    window.addEventListener('resize', onResize);

    return { scene, camera, renderer };
}

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

export function getScene()    { return scene; }
export function getCamera()   { return camera; }
export function getRenderer() { return renderer; }
```

**Test:** The background should be slightly deeper black than before. The helix (if visible) will look different — it'll have lighting response now rather than the flat neon look.

---

## Step 2 — Rewrite `src/world/helix.js`

This is the most important change. The helix moves from flat neon to glass-rod physical materials, moves to centre-stage, and gains the strand-separation animation for chapter 3.

Replace the entire file:

```js
// helix.js — The hero object. Glass-rod double helix with red target nodes.
import * as THREE from 'three';
import { COLORS } from '../core/engine.js';

let helixGroup;
let strandA;  // group for strand 1 + its nodes
let strandB;  // group for strand 2 + its nodes

// Strand separation state (driven by scroll chapter 3)
let targetSeparation = 0;
let currentSeparation = 0;

export function createHelix(scene) {
    helixGroup = new THREE.Group();
    strandA = new THREE.Group();
    strandB = new THREE.Group();

    const turns   = 5;
    const height  = 10;
    const radius  = 1.0;
    const segments = 240;

    const strand1Points = [];
    const strand2Points = [];

    for (let i = 0; i <= segments; i++) {
        const t    = i / segments;
        const angle = t * turns * Math.PI * 2;
        const y    = (t - 0.5) * height;

        strand1Points.push(new THREE.Vector3(
            Math.cos(angle) * radius,
            y,
            Math.sin(angle) * radius
        ));
        strand2Points.push(new THREE.Vector3(
            Math.cos(angle + Math.PI) * radius,
            y,
            Math.sin(angle + Math.PI) * radius
        ));
    }

    // Glass rod material — this is what makes it look expensive
    const strandMat = new THREE.MeshPhysicalMaterial({
        color:        0xe8e8ea,
        roughness:    0.08,
        metalness:    0.0,
        transmission: 0.5,   // semi-transparent glass
        thickness:    0.4,
        ior:          1.45,
        transparent:  true,
        opacity:      0.9,
    });

    // Build tube strands
    const curve1  = new THREE.CatmullRomCurve3(strand1Points);
    const curve2  = new THREE.CatmullRomCurve3(strand2Points);
    const tubeGeo1 = new THREE.TubeGeometry(curve1, 240, 0.04, 8, false);
    const tubeGeo2 = new THREE.TubeGeometry(curve2, 240, 0.04, 8, false);

    strandA.add(new THREE.Mesh(tubeGeo1, strandMat));
    strandB.add(new THREE.Mesh(tubeGeo2, strandMat));

    // Rungs (connecting lines) — barely visible, just structural
    const rungMat = new THREE.LineBasicMaterial({
        color:       0xffffff,
        transparent: true,
        opacity:     0.06,
    });

    for (let i = 0; i <= segments; i += 8) {
        const rungGeo = new THREE.BufferGeometry().setFromPoints([
            strand1Points[i],
            strand2Points[i],
        ]);
        helixGroup.add(new THREE.Line(rungGeo, rungMat));
    }

    // Target node spheres — red emissive, one colour only
    // These represent the "found" dual targets
    const nodeMat = new THREE.MeshPhysicalMaterial({
        color:             0xff4d6d,
        emissive:          new THREE.Color(0xff4d6d),
        emissiveIntensity: 0.4,
        roughness:         0.1,
        metalness:         0.0,
    });
    const nodeGeo = new THREE.SphereGeometry(0.09, 16, 16);

    // Strand A nodes
    for (let i = 0; i <= segments; i += 12) {
        const n = new THREE.Mesh(nodeGeo, nodeMat);
        n.position.copy(strand1Points[i]);
        strandA.add(n);
    }

    // Strand B nodes
    for (let i = 0; i <= segments; i += 12) {
        const n = new THREE.Mesh(nodeGeo, nodeMat.clone());
        n.position.copy(strand2Points[i]);
        strandB.add(n);
    }

    helixGroup.add(strandA);
    helixGroup.add(strandB);

    // Centre-stage, close enough to be sculptural
    helixGroup.position.set(0, 1, -6);

    scene.add(helixGroup);
    return helixGroup;
}

// Called by scroll.js when entering chapter 3
export function setHelixSeparation(amount) {
    targetSeparation = amount;  // 0 = neutral, 1 = fully separated
}

// Called every frame from main.js
export function updateHelix(time) {
    if (!helixGroup) return;

    // Smooth interpolation toward target separation
    currentSeparation += (targetSeparation - currentSeparation) * 0.04;

    // Strands drift apart along X axis — dual-target visualisation
    if (strandA) strandA.position.x = -currentSeparation * 0.5;
    if (strandB) strandB.position.x =  currentSeparation * 0.5;

    // Pulse the node emissive intensity gently
    const pulse = 0.3 + Math.sin(time * 1.4) * 0.15;
    helixGroup.traverse(child => {
        if (child.isMesh && child.material.emissive) {
            child.material.emissiveIntensity = pulse;
        }
    });
}

export function getHelixGroup() { return helixGroup; }
```

**Test:** The helix should now look like glass rods with red dots. If it looks dark/flat, check that engine.js is running first (the lighting rig must be initialised).

---

## Step 3 — Create `src/world/cell-field.js` (new file)

Create this file from scratch. These are the 12 translucent spheres that float behind the helix — they read as cells under a microscope without being distracting.

```js
// cell-field.js — Sparse translucent cell spheres behind the helix.
// Minimal overhead: 12 objects, Y-drift only, GPU-friendly.
import * as THREE from 'three';
import { COLORS } from '../core/engine.js';

const cells = [];

// Deterministic positions — not random so they look intentional
const POSITIONS = [
    [-8,  2, -14],  [ 6,  4, -18],  [-5, -1, -20],
    [ 9, -2, -15],  [-3,  5, -22],  [ 7,  1, -12],
    [-9,  0, -17],  [ 4,  6, -19],  [-6, -3, -13],
    [ 8,  3, -21],  [-4,  2, -16],  [ 5, -1, -23],
];

// Each cell gets a unique drift phase
const PHASES = [0, 0.8, 1.6, 2.4, 3.2, 4.0, 0.4, 1.2, 2.0, 2.8, 3.6, 4.4];

// Sizes vary slightly
const SIZES = [0.6, 0.5, 0.7, 0.45, 0.8, 0.55, 0.65, 0.5, 0.75, 0.6, 0.5, 0.7];

const cellMat = new THREE.MeshPhysicalMaterial({
    color:        COLORS.CELL,
    transmission: 0.85,
    roughness:    0.05,
    metalness:    0.0,
    ior:          1.33,   // water-like — biological cells are mostly water
    transparent:  true,
    opacity:      0.55,
    side:         THREE.DoubleSide,
});

export function createCellField(scene) {
    POSITIONS.forEach(([x, y, z], i) => {
        const geo  = new THREE.SphereGeometry(SIZES[i], 32, 32);
        const mesh = new THREE.Mesh(geo, cellMat.clone());
        mesh.position.set(x, y, z);
        mesh.userData.baseY  = y;
        mesh.userData.phase  = PHASES[i];
        scene.add(mesh);
        cells.push(mesh);
    });
}

export function updateCellField(time) {
    cells.forEach(cell => {
        // Gentle independent Y drift only — GPU isn't touched
        cell.position.y = cell.userData.baseY
            + Math.sin(time * 0.08 + cell.userData.phase) * 0.25;
    });
}
```

**Test:** You should see faint translucent blue-white spheres floating in the background behind the helix. They should barely be noticeable — background texture, not focal objects.

---

## Step 4 — Rewrite `src/core/scroll.js`

The key principle here: **each chapter does exactly ONE thing**. Camera moves OR scene changes — never simultaneously. Text only appears after movement completes.

Replace the entire file:

```js
// scroll.js — 5-chapter scroll narrative.
// ONE transformation per chapter. Camera OR scene, never both.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { setHelixSeparation } from '../world/helix.js';
import { soundManager } from '../sound.js';

gsap.registerPlugin(ScrollTrigger);

// Chapter camera positions
// Each is a resting place the camera arrives at before text appears
const CHAPTERS = {
    hero: {
        pos: { x: 0,  y: 3,  z: 14 },
        rot: { x: 0,  y: 0 },
    },
    problem: {
        pos: { x: 4,  y: 5,  z: 10 },
        rot: { x: -0.08, y: 0.12 },
    },
    approach: {
        pos: { x: -5, y: 4,  z: 8  },
        rot: { x: -0.05, y: -0.18 },
    },
    platform: {
        pos: { x: 0,  y: 5,  z: 16 },
        rot: { x: -0.1, y: 0 },
    },
};

export function initScroll(camera) {
    setupLenis();
    setupCameraTimeline(camera);
    setupSectionReveals();
    setupHeroAnimation();
    setupNavbarAutoHide();
}

function setupLenis() {
    const lenis = new Lenis({
        duration: 1.4,
        easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(time => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
}

function setupCameraTimeline(camera) {
    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: '.main-content',
            start:   'top top',
            end:     'bottom bottom',
            scrub:   1.8,   // slightly slower scrub = more cinematic
        },
    });

    // Chapter 0 → 1: Hero — camera holds still, scene holds still
    // (no tl entries needed — starting position is hero)

    // Chapter 1 → 2: Problem — ONLY camera moves, nothing else
    tl.to(camera.position,
        { ...CHAPTERS.problem.pos, duration: 1, ease: 'power2.inOut' },
        0
    );
    tl.to(camera.rotation,
        { ...CHAPTERS.problem.rot, duration: 1, ease: 'power2.inOut' },
        0
    );

    // Chapter 2 → 3: Approach — ONLY helix strand separation (see below)
    // Camera moves to orbital position
    tl.to(camera.position,
        { ...CHAPTERS.approach.pos, duration: 1, ease: 'power2.inOut' },
        1
    );
    tl.to(camera.rotation,
        { ...CHAPTERS.approach.rot, duration: 1, ease: 'power2.inOut' },
        1
    );

    // Chapter 3 → 4: Platform — camera pulls back to overview
    tl.to(camera.position,
        { ...CHAPTERS.platform.pos, duration: 1, ease: 'power2.inOut' },
        2
    );
    tl.to(camera.rotation,
        { ...CHAPTERS.platform.rot, duration: 1, ease: 'power2.inOut' },
        2
    );

    // Helix strand separation — triggers on approach section entry
    // This is the scene change for chapter 3 (camera has already moved)
    ScrollTrigger.create({
        trigger: '#approach',
        start:   'top 50%',
        end:     'bottom 50%',
        onEnter:     () => setHelixSeparation(1),
        onLeaveBack: () => setHelixSeparation(0),
        onLeave:     () => setHelixSeparation(0),
    });

    // Sound triggers
    ScrollTrigger.create({
        trigger: '#problem',
        start: 'top 60%',
        onEnter: () => { if (soundManager?.initialized) soundManager.playPing(); },
    });
    ScrollTrigger.create({
        trigger: '#approach',
        start: 'top 60%',
        onEnter:     () => { if (soundManager?.initialized) soundManager.playTensionBuild(); },
        onLeaveBack: () => { soundManager?.stopTension(); },
    });
    ScrollTrigger.create({
        trigger: '#platform',
        start: 'top 60%',
        onEnter: () => { if (soundManager?.initialized) soundManager.playResolvedAmbient(); },
    });
}

function setupSectionReveals() {
    gsap.utils.toArray('.content-section').forEach(section => {
        gsap.fromTo(section,
            { opacity: 0, y: 40 },
            {
                opacity: 1,
                y: 0,
                duration: 0.9,
                ease: 'power2.out',
                scrollTrigger: {
                    trigger: section,
                    start: 'top 65%',
                },
            }
        );
    });
}

function setupHeroAnimation() {
    const tl = gsap.timeline({ delay: 0.3 });
    tl.to('.fade-up', {
        opacity: 1,
        y: 0,
        duration: 0.9,
        stagger: 0.15,
        ease: 'power2.out',
    });
}

function setupNavbarAutoHide() {
    let lastY = 0;
    window.addEventListener('scroll', () => {
        const currentY = window.scrollY;
        const navbar = document.querySelector('.navbar');
        if (!navbar) return;
        navbar.style.transform = currentY > lastY && currentY > 100
            ? 'translateY(-100%)'
            : 'translateY(0)';
        lastY = currentY;
    }, { passive: true });
}
```

**Test:** Scroll through the page. Each section transition should feel deliberate. The helix strands should visibly separate when you reach the Architecture section and recombine when you scroll away.

---

## Step 5 — Rewrite `src/style.css`

This is the biggest CSS change. New colour variables, new section layout, grain overlay, typography updates, removal of fixed glass panel positioning.

Replace the entire file:

```css
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:ital,wght@0,400;0,500;1,400&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');

/* ═══════════════════════════════════════════════
   COLOUR SYSTEM
   One accent. Two surfaces. One data colour.
   Purple, green, and yellow are intentionally gone.
═══════════════════════════════════════════════ */
:root {
    --bg:           #0a0a0f;
    --surface:      #141418;
    --surface2:     #1c1c22;
    --border:       #252528;
    --border2:      #32323a;
    --accent:       #ff4d6d;
    --accent-dim:   rgba(255, 77, 109, 0.15);
    --text:         #e0e0e3;
    --text-muted:   #aaaaae;
    --data-blue:    #74b3ff;  /* gene names in pair cards ONLY */
}

/* ═══════════════════════════════════════════════
   RESET & BASE
═══════════════════════════════════════════════ */
*, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

html { scroll-behavior: auto; }  /* Lenis handles this */

body {
    font-family: 'DM Sans', sans-serif;
    background-color: var(--bg);
    color: var(--text);
    line-height: 1.7;
    font-weight: 300;
    overflow-x: hidden;
}

/* Subtle grain overlay — adds tactility, stops the dark bg looking like a void */
body::after {
    content: '';
    position: fixed;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
    opacity: 0.025;
    pointer-events: none;
    z-index: 9999;
}

h1, h2, h3 { font-family: 'Syne', sans-serif; }

/* ═══════════════════════════════════════════════
   3D CANVAS
═══════════════════════════════════════════════ */
#canvas-container {
    position: fixed;
    inset: 0;
    z-index: 1;
    pointer-events: none;
}

/* ═══════════════════════════════════════════════
   LAYOUT
═══════════════════════════════════════════════ */
.layout {
    position: relative;
    z-index: 10;
    pointer-events: none;
}

.navbar,
.main-content,
.sound-toggle {
    pointer-events: auto;
}

/* ═══════════════════════════════════════════════
   NAVBAR
═══════════════════════════════════════════════ */
.navbar {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 48px;
    background: rgba(10, 10, 15, 0.85);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-bottom: 1px solid var(--border);
    z-index: 100;
    transition: transform 0.3s ease;
}

.nav-logo {
    display: flex;
    align-items: center;
    gap: 12px;
}

.nav-logo .wordmark {
    font-family: 'Syne', sans-serif;
    font-weight: 800;
    font-size: 15px;
    letter-spacing: 0.04em;
    color: var(--text);
    text-transform: uppercase;
}

.nav-logo .wordmark span {
    color: var(--accent);
}

.nav-logo .sub {
    font-family: 'DM Mono', monospace;
    font-size: 10px;
    color: var(--text-muted);
    display: block;
    margin-top: 2px;
}

.nav-links {
    display: flex;
    gap: 32px;
}

.nav-item {
    color: var(--text-muted);
    text-decoration: none;
    font-size: 14px;
    font-weight: 500;
    transition: color 0.2s;
}

.nav-item:hover { color: var(--text); }

.btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: transparent;
    border: 1px solid rgba(255, 77, 109, 0.35);
    color: var(--text);
    text-decoration: none;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.2s;
}

.btn-primary:hover {
    background: var(--accent-dim);
    border-color: var(--accent);
}

/* ═══════════════════════════════════════════════
   MAIN CONTENT
═══════════════════════════════════════════════ */
.main-content {
    padding-top: 100px;
}

/* ═══════════════════════════════════════════════
   HERO
═══════════════════════════════════════════════ */
.hero-section {
    min-height: 90vh;
    display: flex;
    align-items: center;
    padding: 0 48px;
}

.hero-content {
    max-width: 760px;
}

/* Live status pulse indicator */
.hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    background: rgba(255, 77, 109, 0.08);
    border: 1px solid rgba(255, 77, 109, 0.22);
    color: var(--text-muted);
    font-size: 12px;
    font-family: 'DM Mono', monospace;
    padding: 6px 14px;
    border-radius: 20px;
    margin-bottom: 28px;
}

.hero-badge::before {
    content: '';
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 0 0 rgba(255, 77, 109, 0.4);
    animation: pulse-dot 2s infinite;
    flex-shrink: 0;
}

@keyframes pulse-dot {
    0%   { box-shadow: 0 0 0 0 rgba(255, 77, 109, 0.4); }
    70%  { box-shadow: 0 0 0 6px rgba(255, 77, 109, 0); }
    100% { box-shadow: 0 0 0 0 rgba(255, 77, 109, 0); }
}

h1 {
    font-size: 64px;
    font-weight: 800;
    line-height: 1.05;
    letter-spacing: -0.02em;
    margin-bottom: 28px;
}

h1 span {
    color: var(--accent);
    text-shadow: 0 0 80px rgba(255, 77, 109, 0.2);
}

.hero-stat {
    font-family: 'DM Mono', monospace;
    font-size: 13px;
    color: var(--text-muted);
    margin-bottom: 16px;
    letter-spacing: 0.02em;
}

.hero-stat strong {
    color: var(--accent);
    font-weight: 500;
}

.hero-desc {
    font-size: 19px;
    color: var(--text-muted);
    line-height: 1.65;
    max-width: 620px;
    margin-bottom: 36px;
}

.hero-actions {
    display: flex;
    gap: 16px;
    align-items: center;
}

.btn-outline {
    display: inline-block;
    color: var(--text);
    text-decoration: none;
    border: 1px solid var(--border2);
    padding: 12px 24px;
    border-radius: 6px;
    font-size: 14px;
    background: rgba(10, 10, 15, 0.6);
    backdrop-filter: blur(8px);
    transition: all 0.2s;
}

.btn-outline:hover {
    background: var(--surface2);
    border-color: var(--text-muted);
}

/* ═══════════════════════════════════════════════
   CONTENT SECTIONS — SPLIT LAYOUT
   Left half: near-opaque text panel
   Right half: the 3D scene shows through
═══════════════════════════════════════════════ */
.content-section {
    min-height: 100vh;
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: center;
    padding: 0;
}

/* Right-aligned sections flip the grid */
.content-section.right {
    direction: rtl;
}
.content-section.right > * {
    direction: ltr;
}

.section-text {
    padding: 80px 64px;
    background: rgba(10, 10, 15, 0.92);
}

/* Section badge — monospace label, no emoji */
.section-badge {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    font-family: 'DM Mono', monospace;
    font-size: 11px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    margin-bottom: 20px;
}

.section-badge::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent);
    flex-shrink: 0;
}

h2 {
    font-size: 36px;
    font-weight: 700;
    margin-bottom: 28px;
    letter-spacing: -0.01em;
    line-height: 1.1;
}

.text-block p {
    font-size: 16px;
    color: var(--text-muted);
    margin-bottom: 18px;
    line-height: 1.7;
}

.text-block p:last-child { margin-bottom: 0; }

.text-block strong {
    color: var(--text);
    font-weight: 500;
}

/* ═══════════════════════════════════════════════
   STAT CARD
═══════════════════════════════════════════════ */
.stat-block {
    margin-top: 40px;
}

.stat-card {
    display: inline-block;
    padding: 0;
}

.stat-value {
    font-family: 'Syne', sans-serif;
    font-size: 88px;
    font-weight: 800;
    color: var(--accent);
    line-height: 1;
    margin-bottom: 4px;
    border-bottom: 2px solid rgba(255, 77, 109, 0.35);
    padding-bottom: 8px;
    display: inline-block;
}

.stat-label {
    font-family: 'DM Mono', monospace;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text);
    margin-top: 12px;
    margin-bottom: 8px;
}

.stat-desc {
    font-size: 14px;
    color: var(--text-muted);
    max-width: 280px;
    line-height: 1.55;
}

/* ═══════════════════════════════════════════════
   MATH BLOCK
═══════════════════════════════════════════════ */
.math-block {
    background: #060608;
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    margin-top: 32px;
}

.math-header {
    font-family: 'DM Mono', monospace;
    font-size: 10px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    margin-bottom: 16px;
}

.math-block code {
    font-family: 'DM Mono', monospace;
    font-size: 18px;
    color: var(--text);
    background: rgba(255, 255, 255, 0.04);
    padding: 10px 18px;
    border-radius: 4px;
    margin-bottom: 12px;
}

.math-footer {
    font-family: 'DM Mono', monospace;
    font-size: 10px;
    color: var(--accent);
    letter-spacing: 0.06em;
}

/* ═══════════════════════════════════════════════
   GENE PAIR CARDS
   Scientific data aesthetic — minimal radius, left-border hover
═══════════════════════════════════════════════ */
.cards-preview {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 32px;
}

.pair-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-left: 3px solid transparent;
    border-radius: 4px;
    padding: 14px 18px;
    transition: border-left-color 0.2s, background 0.2s;
    position: relative;
}

.pair-card:hover {
    border-left-color: var(--accent);
    background: var(--surface2);
}

.pair-rank {
    font-family: 'DM Mono', monospace;
    font-size: 10px;
    color: var(--accent);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 8px;
}

.pair-genes {
    font-family: 'DM Mono', monospace;
    font-size: 15px;
    font-weight: 500;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 0;
    flex-wrap: wrap;
}

.pair-genes .gene {
    background: var(--surface2);
    padding: 3px 9px;
    border-radius: 3px;
    color: var(--data-blue);
}

.pair-genes .and {
    color: var(--accent);
    font-size: 11px;
    margin: 0 10px;
    opacity: 0.7;
}

.pair-stats {
    font-size: 12px;
    color: var(--text-muted);
    font-family: 'DM Mono', monospace;
}

/* ═══════════════════════════════════════════════
   DIFFERENTIABLE COMPILER PANEL
   Terminal aesthetic — inline in Architecture section
   NOT position:fixed
═══════════════════════════════════════════════ */
.compiler-panel {
    background: #060608;
    border: 1px solid var(--border2);
    border-radius: 6px;
    overflow: hidden;
    margin-top: 40px;
    font-family: 'DM Mono', monospace;
}

.compiler-titlebar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    background: #0e0e12;
    border-bottom: 1px solid var(--border);
}

.compiler-dots {
    display: flex;
    gap: 6px;
}

.compiler-dots span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
}

.compiler-dots .dot-red    { background: #ff5f57; }
.compiler-dots .dot-yellow { background: #febc2e; }
.compiler-dots .dot-green  { background: #28c840; }

.compiler-title {
    font-size: 10px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-left: auto;
    margin-right: auto;
}

.compiler-body {
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
}

/* Keep the existing panel internals — bars, loss chart, temp gauge */
/* Just renamed from .glass-panel internals to .compiler-panel internals */
.prob-dists {
    display: flex;
    gap: 16px;
}

.dist {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.dist span {
    font-size: 10px;
    color: var(--text-muted);
    text-transform: uppercase;
}

.bars {
    display: flex;
    align-items: flex-end;
    gap: 2px;
    height: 56px;
    background: rgba(0, 0, 0, 0.4);
    border-radius: 3px;
    padding: 4px;
}

.bar {
    flex: 1;
    background: #3a3a45;
    height: 20%;
    border-radius: 2px 2px 0 0;
    transition: background 0.2s;
}

.loss-chart {
    background: rgba(0, 0, 0, 0.4);
    border-radius: 4px;
    padding: 8px;
}

.loss-chart svg {
    width: 100%;
    height: 44px;
    filter: drop-shadow(0 0 5px rgba(255, 77, 109, 0.5));
}

.temp-gauge {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 11px;
    color: var(--text-muted);
}

.temp-gauge .tau {
    color: var(--text);
    font-style: italic;
}

.gauge-track {
    flex: 1;
    height: 5px;
    background: var(--border2);
    border-radius: 3px;
    overflow: hidden;
}

.gauge-fill {
    height: 100%;
    width: 100%;
    background: var(--text-muted);  /* neutral — no yellow glow */
    border-radius: 3px;
    transform-origin: left;
}

.compiler-footer {
    padding: 8px 24px 12px;
    font-size: 10px;
    color: var(--text-muted);
    border-top: 1px solid var(--border);
    letter-spacing: 0.04em;
    opacity: 0.6;
}

/* ═══════════════════════════════════════════════
   SOUND TOGGLE — icon only, no text
═══════════════════════════════════════════════ */
.sound-toggle {
    position: fixed;
    bottom: 32px;
    right: 32px;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(10, 10, 15, 0.8);
    backdrop-filter: blur(10px);
    border: 1px solid var(--border);
    border-radius: 50%;
    cursor: pointer;
    z-index: 100;
    transition: all 0.2s;
}

.sound-toggle:hover {
    background: var(--surface2);
    border-color: var(--border2);
}

.sound-toggle svg {
    width: 16px;
    height: 16px;
    fill: var(--text-muted);
    transition: fill 0.2s;
}

.sound-toggle:hover svg { fill: var(--text); }

/* ═══════════════════════════════════════════════
   FOOTER
═══════════════════════════════════════════════ */
.site-footer {
    padding: 40px 48px;
    border-top: 1px solid var(--border);
    background: var(--bg);
}

.footer-content {
    display: flex;
    justify-content: space-between;
    font-family: 'DM Mono', monospace;
    font-size: 12px;
    color: var(--text-muted);
}

/* ═══════════════════════════════════════════════
   ANIMATIONS
═══════════════════════════════════════════════ */
.fade-up {
    opacity: 0;
    transform: translateY(20px);
}

/* ═══════════════════════════════════════════════
   RESPONSIVE
═══════════════════════════════════════════════ */
@media (max-width: 900px) {
    .content-section {
        grid-template-columns: 1fr;
    }

    .section-text {
        padding: 60px 32px;
    }

    h1 { font-size: 42px; }
    h2 { font-size: 28px; }

    .stat-value { font-size: 64px; }

    .navbar {
        padding: 16px 24px;
    }

    .nav-links { display: none; }

    /* Hide 3D on very small screens */
    @media (max-width: 480px) {
        #canvas-container { display: none; }
    }
}
```

**Test:** The page should look dramatically cleaner. Dark, minimal, clinical. The glassmorphism cards are gone. Sections use the split layout.

---

## Step 6 — Rewrite `index.html`

New hero copy, inline compiler panel, no emoji badges, new closing section.

Replace the entire file:

```html
<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Bloomsbury Burger Therapeutics — The Target is Found</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:ital,wght@0,400;0,500;1,400&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap" rel="stylesheet">
</head>

<body>
    <!-- Persistent 3D Background -->
    <div id="canvas-container"></div>

    <!-- Foreground UI -->
    <div class="layout">

        <nav class="navbar">
            <div class="nav-logo">
                <div>
                    <div class="wordmark"><span>BBT</span></div>
                    <div class="sub">Bloomsbury Burger Therapeutics</div>
                </div>
            </div>
            <div class="nav-links">
                <a href="#problem"  class="nav-item">The Problem</a>
                <a href="#approach" class="nav-item">The Method</a>
                <a href="#platform" class="nav-item">The Result</a>
            </div>
            <div class="nav-actions">
                <a href="/public/dashboard/index.html" class="btn-primary">
                    Lab Console →
                </a>
            </div>
        </nav>

        <main class="main-content">

            <!-- ═══════════════════════════════════
                 HERO
            ════════════════════════════════════ -->
            <section class="hero-section" id="hero">
                <div class="hero-content">
                    <div class="hero-badge fade-up">
                        CAR-T · Endometriosis · Differentiable Discovery
                    </div>
                    <h1 class="fade-up delay-1">
                        The Target<br><span>is Found.</span>
                    </h1>
                    <p class="hero-stat fade-up delay-2">
                        <strong>~4.5M</strong> candidate pairs screened in silico.
                        <strong>Two</strong> survived.
                    </p>
                    <p class="hero-desc fade-up delay-2">
                        Dual-target CAR-T therapy for endometriosis,
                        discovered by gradient descent over single-cell genomics.
                        Not hormone modulation. Not symptom management.
                        Targeted cellular ablation of ectopic lesions.
                    </p>
                    <div class="hero-actions fade-up delay-3">
                        <a href="#problem" class="btn-outline">Explore the Architecture ↓</a>
                    </div>
                </div>
            </section>

            <!-- ═══════════════════════════════════
                 THE PROBLEM
            ════════════════════════════════════ -->
            <section class="content-section" id="problem">
                <div class="section-text">
                    <div class="section-badge">The Standard of Care</div>
                    <h2>Blind Resection<br>is Not Enough</h2>
                    <div class="text-block">
                        <p>
                            Endometriosis affects ~10% of people with a uterus worldwide.
                            The current standard of care is surgical resection — cutting out
                            the lesions — which has a recurrence rate above 50% within five years.
                        </p>
                        <p>
                            Surgeons cannot reliably distinguish all pathological microscopic
                            tissue from healthy tissue by visual inspection. The lesions hide.
                            The problem is not surgical skill. It is the structural imprecision
                            of a therapy that cannot identify what it is targeting at the
                            cellular level.
                        </p>
                        <p>
                            A therapy that targets cells directly — not anatomy — does not have
                            this problem.
                        </p>
                    </div>
                    <div class="stat-block">
                        <div class="stat-card">
                            <div class="stat-value">50%</div>
                            <div class="stat-label">Post-Surgical Recurrence</div>
                            <div class="stat-desc">
                                Within 5 years, due to missed microscopic deposits
                                and incomplete lesion mapping.
                            </div>
                        </div>
                    </div>
                </div>
                <div class="section-visual" id="dynamic-cards-container">
                    <!-- Gene pair cards injected by JS -->
                </div>
            </section>

            <!-- ═══════════════════════════════════
                 THE METHOD
            ════════════════════════════════════ -->
            <section class="content-section right" id="approach">
                <div class="section-text">
                    <div class="section-badge">Technical Pipeline</div>
                    <h2>We Did Not Enumerate.<br>We Optimised.</h2>
                    <div class="text-block">
                        <p>
                            Brute-force enumeration of dual-target combinations across the
                            human transcriptome produces approximately 4.5 million candidate
                            pairs. Evaluating each against a whole-body safety atlas is
                            computationally intractable.
                        </p>
                        <p>
                            Instead, we relax the discrete combinatorial search into continuous
                            space using a <strong>Gumbel-Softmax reparameterisation</strong>.
                            We optimise with gradient descent, then snap back to a hard discrete
                            selection — combining a biomedical specificity objective with a
                            whole-body safety penalty in a jointly differentiable system.
                        </p>
                        <p>
                            The compiler finds the pair. The atlas validates it.
                            The result is not a ranked list — it is a proof.
                        </p>
                    </div>
                    <div class="math-block">
                        <div class="math-header">Optimization Objective</div>
                        <code>min[ L_spec(θ) + λ · L_safe(θ) ]</code>
                        <div class="math-footer">Gradient descent active</div>
                    </div>

                    <!-- DIFFERENTIABLE COMPILER — inline, not fixed -->
                    <div class="compiler-panel" id="machine-panel">
                        <div class="compiler-titlebar">
                            <div class="compiler-dots">
                                <span class="dot-red"></span>
                                <span class="dot-yellow"></span>
                                <span class="dot-green"></span>
                            </div>
                            <div class="compiler-title">DIFFERENTIABLE COMPILER v0.1</div>
                        </div>
                        <div class="compiler-body">
                            <div class="prob-dists">
                                <div class="dist">
                                    <span>α¹ — Target A</span>
                                    <div class="bars" id="bars-a"></div>
                                </div>
                                <div class="dist">
                                    <span>α² — Target B</span>
                                    <div class="bars" id="bars-b"></div>
                                </div>
                            </div>
                            <div class="loss-chart" id="loss-chart-container">
                                <svg viewBox="0 0 100 44" preserveAspectRatio="none">
                                    <path id="loss-line" d="M0,10 Q25,10 50,28 T100,42"
                                        fill="none" stroke="#ff4d6d" stroke-width="1.5"/>
                                </svg>
                            </div>
                            <div class="temp-gauge">
                                <span class="tau">τ</span>
                                <div class="gauge-track">
                                    <div class="gauge-fill" id="temp-fill"></div>
                                </div>
                                <span>annealing</span>
                            </div>
                        </div>
                        <div class="compiler-footer">Gradient descent active · Tabula Sapiens validation enabled</div>
                    </div>
                </div>
            </section>

            <!-- ═══════════════════════════════════
                 THE RESULT
            ════════════════════════════════════ -->
            <section class="content-section" id="platform">
                <div class="section-text">
                    <div class="section-badge">The Platform</div>
                    <h2>Two Targets.<br>Validated Against<br>475 Cell Types.</h2>
                    <div class="text-block">
                        <p>
                            The result is not just a list of markers. It is a
                            <strong>safety certificate</strong> validated against the whole
                            human body via the Tabula Sapiens single-cell atlas.
                        </p>
                        <p>
                            If a candidate pair is expressed in critical organs — heart,
                            brain, kidney — it receives an infinite penalty and is excluded.
                            What survives is the blueprint for a truly lesion-specific
                            dual-target CAR-T.
                        </p>
                        <p>
                            The top-ranked pairs are shown here. These are real outputs
                            from the optimisation run.
                        </p>
                    </div>
                    <div class="cards-preview" id="dynamic-cards-container-2"></div>
                </div>
            </section>

            <!-- ═══════════════════════════════════
                 CLOSING — VISION
            ════════════════════════════════════ -->
            <section class="content-section right" id="vision">
                <div class="section-text">
                    <div class="section-badge">What Comes Next</div>
                    <h2>From Algorithm<br>to Therapy.</h2>
                    <div class="text-block">
                        <p>
                            We have a computationally validated dual-target pair, a
                            differentiable discovery pipeline that can be rerun on any
                            disease with single-cell data, and a safety framework validated
                            against the most comprehensive human cell atlas available.
                        </p>
                        <p>
                            The next steps are pre-clinical validation of CAR construct
                            binding, in vitro ectopic lesion models, and IND-enabling studies.
                        </p>
                        <p>
                            We are pre-seed. If you are a scientist, investor, or collaborator
                            who wants to understand the platform in depth, the Lab Console
                            has the full data.
                        </p>
                    </div>
                    <div class="hero-actions" style="margin-top: 32px;">
                        <a href="/public/dashboard/index.html" class="btn-primary" style="font-size:14px; padding:12px 24px; border-radius:6px;">
                            Open Lab Console →
                        </a>
                    </div>
                </div>
            </section>

            <footer class="site-footer">
                <div class="footer-content">
                    <span>Bloomsbury Burger Therapeutics plc © 2026</span>
                    <span>pre-seed · pre-revenue · pre-sanity</span>
                </div>
            </footer>

        </main>
    </div>

    <!-- Sound toggle — icon only -->
    <div class="sound-toggle" id="sound-toggle" title="Toggle sound">
        <svg id="sound-icon-on" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
        </svg>
        <svg id="sound-icon-off" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="display:none">
            <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
        </svg>
    </div>

    <script type="module" src="/src/main.js"></script>
</body>
</html>
```

**Test:** The hero should now read "The Target is Found." with the stat below it. Sections have the split layout. No emojis anywhere. The compiler panel is inline in the Method section.

---

## Step 7 — Update `src/ui/glass-panel.js`

The panel is now inline HTML (not fixed position), so this file just handles the animation trigger.

Replace the entire file:

```js
// glass-panel.js — Animates the inline Differentiable Compiler panel.
// Panel is no longer position:fixed — it lives inside the approach section.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initGlassPanel() {
    const panel = document.getElementById('machine-panel');
    if (!panel) return;

    gsap.set(panel, { opacity: 0, y: 20 });

    ScrollTrigger.create({
        trigger: '#approach',
        start: 'top 55%',
        onEnter: () => {
            gsap.to(panel, {
                opacity: 1,
                y: 0,
                duration: 0.7,
                ease: 'power2.out',
                onComplete: runOptimisation,
            });
        },
        onLeaveBack: () => {
            gsap.to(panel, { opacity: 0, y: 20, duration: 0.3 });
        },
    });
}

function runOptimisation() {
    const barsA = document.getElementById('bars-a');
    const barsB = document.getElementById('bars-b');
    if (!barsA || !barsB) return;

    // Reset and rebuild bars each time
    barsA.innerHTML = '';
    barsB.innerHTML = '';

    for (let i = 0; i < 15; i++) {
        const barA = document.createElement('div');
        barA.className = 'bar';
        barA.style.height = `${Math.random() * 70 + 10}%`;
        barsA.appendChild(barA);

        const barB = document.createElement('div');
        barB.className = 'bar';
        barB.style.height = `${Math.random() * 70 + 10}%`;
        barsB.appendChild(barB);
    }

    // Flatten → spike the winner
    gsap.to('.bar', {
        height: '8%',
        stagger: { amount: 0.7, from: 'edges' },
        duration: 1.2,
        ease: 'power1.inOut',
    });

    if (barsA.children[7]) {
        gsap.to(barsA.children[7], {
            height: '92%',
            background: '#ff4d6d',
            delay: 1.0,
            duration: 0.35,
        });
    }

    if (barsB.children[3]) {
        gsap.to(barsB.children[3], {
            height: '92%',
            background: '#74b3ff',
            delay: 1.0,
            duration: 0.35,
        });
    }

    // Loss curve descends
    const lossLine = document.getElementById('loss-line');
    if (lossLine) {
        gsap.to(lossLine, {
            attr: { d: 'M0,8 Q25,42 50,44 T100,44' },
            duration: 2.2,
            ease: 'power3.out',
        });
    }

    // Temperature cools
    const tempFill = document.getElementById('temp-fill');
    if (tempFill) {
        gsap.to(tempFill, {
            scaleX: 0.04,
            duration: 2.2,
            ease: 'power2.out',
        });
    }
}
```

---

## Step 8 — Update `src/ui/cards.js`

Minor update: add rank labels, adjust border-radius, update hover to left-border reveal. Only the parts that changed:

Find the card creation in your existing cards.js and update the HTML template to:

```js
// In your buildCardsUI function, update the card HTML to:
function createCardHTML(pair, rank) {
    return `
        <div class="pair-card">
            <div class="pair-rank">RANK #${String(rank).padStart(2, '0')}</div>
            <div class="pair-genes">
                <span class="gene">${pair.gene_a || pair.geneA || pair[0]}</span>
                <span class="and">AND</span>
                <span class="gene">${pair.gene_b || pair.geneB || pair[1]}</span>
            </div>
            <div class="pair-stats">
                ${pair.score ? `Score: ${pair.score.toFixed(4)}` : ''}
                ${pair.specificity ? ` · Specificity: ${pair.specificity.toFixed(3)}` : ''}
            </div>
        </div>
    `;
}
```

> **Note:** Check the actual key names in your top_pairs.json and adjust gene_a/gene_b accordingly. The structure is already in your project knowledge.

---

## Step 9 — Update `src/ui/sound-toggle.js`

The toggle button is now an icon (SVG already in index.html). Update the JS to swap icons instead of changing text:

```js
// sound-toggle.js — Icon-based sound toggle
import { soundManager } from '../sound.js';

export function initSoundToggle() {
    const toggle  = document.getElementById('sound-toggle');
    const iconOn  = document.getElementById('sound-icon-on');
    const iconOff = document.getElementById('sound-icon-off');

    if (!toggle) return;

    toggle.addEventListener('click', () => {
        if (!soundManager.initialized) {
            soundManager.init();
            soundManager.playAmbient?.();
        }

        const muted = soundManager.toggleMute?.();

        if (iconOn && iconOff) {
            iconOn.style.display  = muted ? 'none'  : 'block';
            iconOff.style.display = muted ? 'block' : 'none';
        }
    });
}
```

---

## Step 10 — Final Checks

Go through this list before considering it done:

### Scroll chapters
- [ ] Hero: camera holds still. Helix visible. Text fades in.
- [ ] Problem: camera moves RIGHT only — no simultaneous scene change.
- [ ] Method: camera moves LEFT. Helix strands separate when section is 50% in view.
- [ ] Result: camera pulls back. Strands recombine. Gene pair cards visible.

### Visual
- [ ] No yellow anywhere on the page
- [ ] No purple anywhere on the page  
- [ ] No green anywhere on the page (not in the 3D scene, not in CSS)
- [ ] The helix is the dominant 3D object. It is centred and close to camera.
- [ ] Cell spheres are barely visible — background texture, not focal
- [ ] Section text sits on near-opaque dark panels, not glass cards

### Content
- [ ] Hero headline includes "The Target is Found"
- [ ] Hero stat mentions "~4.5M candidate pairs"
- [ ] The word "endometriosis" appears in the hero section
- [ ] The word "CAR-T" appears in the hero section
- [ ] The compiler panel is inside the Method section, not floating over everything

### Performance
- [ ] No CPU terrain loop (terrain.js is deleted)
- [ ] No 600 particles spinning every frame
- [ ] Helix strand separation uses smooth interpolation (`+= 0.04 * delta`), not instant jump

---

## Antigravity Prompt Template

If you're using Claude API / Antigravity to help implement any of these steps, paste this at the start of each session:

```
I'm rebuilding a biotech startup landing page (Bloomsbury Burger Therapeutics).
I have a detailed rebuild spec. I'm going to give you the current file and
you will rewrite it according to the spec.

Key constraints:
- Three.js scene: helix (MeshPhysicalMaterial) + 12 cell spheres only. No terrain, no particles.
- Colour palette: #0a0a0f bg, #ff4d6d single accent. No purple, green, or yellow.
- Scroll: 5 chapters, ONE transformation per chapter (camera OR scene, never both).
- The glass panel (Differentiable Compiler) is inline in the Method section, NOT position:fixed.
- MeshPhysicalMaterial requires the 3-point lighting rig in engine.js to be set up first.

Current file:
[PASTE FILE HERE]

Rewrite this file according to the spec. Return only the complete updated file, no explanation.
```

---

*Bloomsbury Burger Therapeutics · Website Architecture v1.0 · February 2026*
