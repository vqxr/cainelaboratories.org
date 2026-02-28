// engine.js — Scene, Camera, Renderer, Lights
import * as THREE from 'three';

// FINAL COLOUR PALETTE
// Purple, green, and yellow are intentionally removed.
// One accent (red). Everything else is neutral.
export const COLORS = {
    BG: new THREE.Color('#0a0a0f'),
    ACCENT: new THREE.Color('#ff4d6d'),  // the only accent — used on helix nodes only
    WHITE: new THREE.Color('#e0e0e3'),
    CELL: new THREE.Color('#b0c8ff'),  // cell spheres only
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

export function getScene() { return scene; }
export function getCamera() { return camera; }
export function getRenderer() { return renderer; }
