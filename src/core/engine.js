// engine.js — Scene, Camera, Renderer, Bloom post-processing
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export const COLORS = {
    BG: new THREE.Color('#06060c'),
    ACCENT: new THREE.Color('#ff3355'),
    WHITE: new THREE.Color('#c8d4f0'),
    CELL: new THREE.Color('#1a3080'),
};

let scene, camera, renderer, composer;

export function initEngine() {
    const container = document.getElementById('canvas-container');

    scene = new THREE.Scene();
    scene.background = COLORS.BG;
    scene.fog = new THREE.FogExp2(COLORS.BG, 0.016);

    camera = new THREE.PerspectiveCamera(
        52, window.innerWidth / window.innerHeight, 0.1, 1000
    );
    camera.position.set(0, 2, 13);
    camera.lookAt(0, 0, -4);

    renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // Lighting — works with custom ShaderMaterial in helix.js
    scene.add(new THREE.AmbientLight(0x0a0a1a, 1.0));

    const key = new THREE.DirectionalLight(0xffffff, 3.0);
    key.position.set(5, 8, 6);
    scene.add(key);

    const rim = new THREE.DirectionalLight(0x2255ff, 2.0);
    rim.position.set(-8, 2, -6);
    scene.add(rim);

    const under = new THREE.PointLight(0xff2244, 2.5, 25);
    under.position.set(0, -5, 0);
    scene.add(under);

    const top = new THREE.DirectionalLight(0x6688ff, 1.0);
    top.position.set(0, 15, 0);
    scene.add(top);

    // Bloom — makes emissive nodes glow with light bleed
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const bloom = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.8,   // strength — subtle glow
        0.6,   // radius
        0.25   // threshold — only bright emissives bloom
    );
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    window.addEventListener('resize', onResize);
    return { scene, camera, renderer };
}

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}

export function getScene() { return scene; }
export function getCamera() { return camera; }
export function getRenderer() { return renderer; }
export function getComposer() { return composer; }