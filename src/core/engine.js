// engine.js — Scene, Camera, Renderer, Lights + Post-processing bloom
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

export const COLORS = {
    BG:     new THREE.Color('#0a0a0f'),
    ACCENT: new THREE.Color('#ff4d6d'),
    WHITE:  new THREE.Color('#e0e0e3'),
    CELL:   new THREE.Color('#b0c8ff'),
};

let scene, camera, renderer, composer;

export function initEngine() {
    const container = document.getElementById('canvas-container');

    scene = new THREE.Scene();
    scene.background = COLORS.BG;
    scene.fog = new THREE.FogExp2(COLORS.BG, 0.028);

    camera = new THREE.PerspectiveCamera(
        55,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(0, 3, 14);
    camera.lookAt(0, 1, -6);

    renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;
    // CRITICAL: required for MeshPhysicalMaterial to look like glass not chalk
    renderer.physicallyCorrectLights = true;
    container.appendChild(renderer.domElement);

    // ── Lighting ──────────────────────────────────────────────────
    // Very dim ambient — shadows should be deep
    scene.add(new THREE.AmbientLight(0x080814, 1.0));

    // Key light — top right, bright, defines the glass highlights
    const key = new THREE.DirectionalLight(0xffffff, 8.0);
    key.position.set(6, 10, 8);
    scene.add(key);

    // Rim light — cold blue from behind-left, gives glass a glassy edge
    const rim = new THREE.DirectionalLight(0x3366ff, 4.0);
    rim.position.set(-8, 3, -10);
    scene.add(rim);

    // Red point light from below — bleeds onto the red nodes, haunting
    const fill = new THREE.PointLight(0xff2244, 3.0, 18);
    fill.position.set(0, -4, 0);
    scene.add(fill);

    // Subtle top fill so the helix top isn't totally black
    const top = new THREE.DirectionalLight(0x8899ff, 1.5);
    top.position.set(0, 20, 0);
    scene.add(top);

    // ── Post-processing: Bloom ─────────────────────────────────────
    // This is the single biggest visual upgrade.
    // The red nodes will bleed light. The glass strands will glow.
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const bloom = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.9,   // strength  — how bright the bloom is
        0.4,   // radius    — how far it spreads
        0.2    // threshold — only pixels brighter than this bloom
    );
    composer.addPass(bloom);

    window.addEventListener('resize', onResize);

    return { scene, camera, renderer };
}

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer?.setSize(window.innerWidth, window.innerHeight);
}

export function getScene()    { return scene; }
export function getCamera()   { return camera; }
export function getRenderer() { return renderer; }
export function getComposer() { return composer; }