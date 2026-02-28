import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { EffectComposer } from 'postprocessing';
import { RenderPass } from 'postprocessing';
import * as Tone from 'tone';
import './style.css';
import { soundManager } from './sound.js';
import { pointVertexShader, pointFragmentShader } from './shaders/points.js';

gsap.registerPlugin(ScrollTrigger);

// --- GLOBAL VARIABLES ---
let scene, camera, renderer, composer;
let lenis;
let pointCloud, silhouetteCloud;
let uniforms, silhouetteUniforms;
let searchBeamA, searchBeamB;
let topPairsData = [];
let safetyData = [];
let torsoGroup;

// Colors
const COLOR_BG = 0xffffff;
const COLOR_ECTOPIC = new THREE.Color('#ff4d6d');
const COLOR_EUTOPIC = new THREE.Color('#74b3ff');
const COLOR_CONTROL = new THREE.Color('#52d48a');
const COLOR_BASE = new THREE.Color('#cccccc');
const COLOR_HUMAN = new THREE.Color('#222222');

// --- INITIALIZATION ---
init();

async function init() {
    setupThree();
    setupLenis();
    createTorso();
    createDataUniverse();
    createSearchBeams();

    // Load JSON Data
    try {
        const [pairsRes, safetyRes] = await Promise.all([
            fetch('/top_pairs.json'),
            fetch('/safety_results.json')
        ]);
        topPairsData = await pairsRes.json();
        safetyData = await safetyRes.json();

        createHumanSilhouette(); // Needs data to setup interactivity
        buildCardsUI();

        setupScrollAnimations();
        setupUI();
    } catch (e) {
        console.error("Failed loading data", e);
    }

    renderer.setAnimationLoop(animate);
}

// --- SETUP THREE.JS ---
function setupThree() {
    const container = document.getElementById('canvas-container');

    scene = new THREE.Scene();
    // Use transparent background so CSS background shows through
    scene.background = null;
    scene.fog = new THREE.FogExp2(COLOR_BG, 0.008);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 50);

    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance", alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0xffffff, 0); // Transparent clear color

    container.appendChild(renderer.domElement);

    window.addEventListener('resize', onWindowResize);
}

function setupLenis() {
    lenis = new Lenis({
        duration: 2.0, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
    });

    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => { lenis.raf(time * 1000) });
    gsap.ticker.lagSmoothing(0);
}

// --- SCENE CREATION ---
function createTorso() {
    // High-tech blueprint look
    const geometry = new THREE.CylinderGeometry(15, 12, 40, 32, 16);
    const edges = new THREE.EdgesGeometry(geometry);
    const material = new THREE.LineBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.15 });
    const torsoMesh = new THREE.LineSegments(edges, material);

    // Glowing dot for lesion (closer to magenta/red)
    const lesionGeo = new THREE.SphereGeometry(0.8, 16, 16);
    const lesionMat = new THREE.MeshBasicMaterial({ color: 0xff1053, transparent: true, opacity: 0.9 });
    const lesionMesh = new THREE.Mesh(lesionGeo, lesionMat);
    lesionMesh.position.set(-5, -5, 5); // approximate pelvic region

    // Add a couple of "floating guide rings" to sell the hi-tech feel
    const ringGeo = new THREE.RingGeometry(18, 18.2, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x999999, transparent: true, opacity: 0.2, side: THREE.DoubleSide });
    const ring1 = new THREE.Mesh(ringGeo, ringMat);
    ring1.rotation.x = Math.PI / 2;
    ring1.position.y = 10;

    const ring2 = new THREE.Mesh(ringGeo, ringMat);
    ring2.rotation.x = Math.PI / 2;
    ring2.position.y = -10;

    torsoGroup = new THREE.Group();
    torsoGroup.add(torsoMesh);
    torsoGroup.add(lesionMesh);
    torsoGroup.add(ring1);
    torsoGroup.add(ring2);
    torsoGroup.position.set(0, 0, 0);

    scene.add(torsoGroup);

    // Animate it gently
    gsap.to(torsoGroup.rotation, { y: Math.PI * 2, duration: 40, repeat: -1, ease: "none" });
}

function createDataUniverse() {
    const particleCount = 50000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const offsets = new Float32Array(particleCount);
    const clusterCenters = new Float32Array(particleCount * 3);

    const centers = [
        { pos: new THREE.Vector3(-25, 10, 0), color: COLOR_ECTOPIC },  // Pushed further out
        { pos: new THREE.Vector3(25, -5, -15), color: COLOR_EUTOPIC }, // Pushed further out
        { pos: new THREE.Vector3(0, 15, -30), color: COLOR_CONTROL },   // Pushed back and up
        { pos: new THREE.Vector3(5, -20, 10), color: COLOR_BASE }
    ];

    for (let i = 0; i < particleCount; i++) {
        // Skew distribution so Ectopic and Eutopic are very distinct clouds
        let clusterIdx;
        const rand = Math.random();
        if (rand < 0.2) clusterIdx = 0; // 20% Ectopic
        else if (rand < 0.5) clusterIdx = 1; // 30% Eutopic
        else if (rand < 0.8) clusterIdx = 2; // 30% Control
        else clusterIdx = 3; // 20% Base noise

        const cluster = centers[clusterIdx];

        // Ensure particles group more tightly around their centers
        const u = Math.random();
        const v = Math.random();
        const r = (clusterIdx === 3 ? 25 : 8) * Math.cbrt(u); // Base is wider, others tighter
        const theta = v * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);

        const x = cluster.pos.x + r * Math.sin(phi) * Math.cos(theta);
        const y = cluster.pos.y + r * Math.sin(phi) * Math.sin(theta);
        const z = cluster.pos.z + r * Math.cos(phi);

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        colors[i * 3] = cluster.color.r;
        colors[i * 3 + 1] = cluster.color.g;
        colors[i * 3 + 2] = cluster.color.b;

        offsets[i] = Math.random() * 100;

        clusterCenters[i * 3] = cluster.pos.x;
        clusterCenters[i * 3 + 1] = cluster.pos.y;
        clusterCenters[i * 3 + 2] = cluster.pos.z;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('randomOffset', new THREE.BufferAttribute(offsets, 1));
    geometry.setAttribute('clusterCenter', new THREE.BufferAttribute(clusterCenters, 3));

    uniforms = {
        uTime: { value: 0 },
        uSize: { value: 4.0 },
        uProgress: { value: 0.0 }, // Morph progress
        uIsConvergence: { value: false },
        uTargetColor: { value: new THREE.Color(0xffffff) },
        uBeamA: { value: new THREE.Vector3() },
        uBeamB: { value: new THREE.Vector3() }
    };

    const material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: pointVertexShader,
        fragmentShader: pointFragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending // Changed to Normal for dark-on-white visibility
    });

    pointCloud = new THREE.Points(geometry, material);
    pointCloud.position.y = -100;
    scene.add(pointCloud);
}

function createHumanSilhouette() {
    const particleCount = 15000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const isOrgan = new Float32Array(particleCount); // 0 or 1 for filtering

    // Simple procedural humanoid torso geometry
    for (let i = 0; i < particleCount; i++) {
        // Torso cylinder
        const height = (Math.random() - 0.5) * 40;
        let radius = 10;
        // Taper for waist and shoulders
        if (height > 10) radius = 12 - (height - 10) * 0.5;
        if (height < -5) radius = 9 + (height + 5) * 0.2;

        const theta = Math.random() * 2 * Math.PI;

        let x = Math.cos(theta) * radius * Math.random();
        let y = height;
        let z = Math.sin(theta) * radius * 0.5 * Math.random(); // Flatter chest

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        colors[i * 3] = COLOR_HUMAN.r;
        colors[i * 3 + 1] = COLOR_HUMAN.g;
        colors[i * 3 + 2] = COLOR_HUMAN.b;

        // Mark organs for interaction (roughly heart/lungs)
        if (y > 5 && Math.abs(x) < 5 && z > 0) {
            isOrgan[i] = 1.0;
        } else {
            isOrgan[i] = 0.0;
        }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('isOrgan', new THREE.BufferAttribute(isOrgan, 1));

    // Minimal shader for human
    silhouetteUniforms = {
        uTime: { value: 0 },
        uSize: { value: 3.0 },
        uHoverState: { value: 0.0 }, // 0 = normal, 1 = hovering
        uOrganDim: { value: 0.0 } // 0 = normal, 1 = dim organs
    };

    const material = new THREE.ShaderMaterial({
        uniforms: silhouetteUniforms,
        vertexShader: `
            uniform float uSize;
            uniform float uHoverState;
            uniform float uOrganDim;
            attribute vec3 color;
            attribute float isOrgan;
            varying vec3 vColor;
            varying float vAlpha;
            void main() {
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = uSize * (100.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
                
                vColor = color;
                vAlpha = 0.3; // Default ghost
                
                if (uHoverState > 0.0) {
                     if (isOrgan > 0.5) {
                         vAlpha = mix(0.3, 0.05, uOrganDim); // Dim organs
                         vColor = vec3(0.5); // Grey out
                     } else if (position.y < -5.0 && position.y > -15.0) {
                         // Pelvic/Lesion area glow magenta
                         vColor = vec3(1.0, 0.3, 0.4);
                         vAlpha = 1.0;
                     }
                }
            }
         `,
        fragmentShader: pointFragmentShader,
        transparent: true, depthWrite: false, blending: THREE.NormalBlending
    });

    silhouetteCloud = new THREE.Points(geometry, material);
    silhouetteCloud.position.set(20, -200, 0); // Start far right and down
    scene.add(silhouetteCloud);
}

function createSearchBeams() {
    searchBeamA = new THREE.SpotLight(COLOR_EUTOPIC, 0);
    searchBeamA.angle = Math.PI / 6;
    searchBeamA.penumbra = 0.5;
    searchBeamA.position.set(-30, 0, 20);
    searchBeamA.target.position.set(0, -100, 0);
    scene.add(searchBeamA);
    scene.add(searchBeamA.target);

    searchBeamB = new THREE.SpotLight(COLOR_CONTROL, 0);
    searchBeamB.angle = Math.PI / 6;
    searchBeamB.penumbra = 0.5;
    searchBeamB.position.set(30, 0, 20);
    searchBeamB.target.position.set(0, -100, 0);
    scene.add(searchBeamB);
    scene.add(searchBeamB.target);
}

// --- DOM UI CREATION ---
function buildCardsUI() {
    const container = document.getElementById('cards-container');

    topPairsData.forEach((pair, index) => {
        const card = document.createElement('div');
        card.className = `pair-card pair-${index}`;
        card.innerHTML = `
            <div class="pair-rank">Rank ${pair.rank}</div>
            <div class="pair-genes">${pair.markerA} × ${pair.markerB}</div>
            <div class="pair-stats">
                Score: ${pair.combined_score.toFixed(3)}
            </div>
            <div class="safety-panel">
                <span>Specificity: ${pair.specificity_score}</span>
                <span>Safety: ${pair.safety_score}</span>
            </div>
        `;

        // Interactions for Scene 6
        card.addEventListener('mouseenter', () => {
            gsap.to(card, { scale: 1.05, borderColor: '#ff4d6d', duration: 0.3 });
            // Flash particles
            gsap.to(silhouetteUniforms.uHoverState, { value: 1.0, duration: 0.3 });
            gsap.to(silhouetteUniforms.uOrganDim, { value: 1.0, duration: 0.3 });
            soundManager.playPing();
        });

        card.addEventListener('mouseleave', () => {
            gsap.to(card, { scale: 1, borderColor: '#eee', duration: 0.3 });
            gsap.to(silhouetteUniforms.uHoverState, { value: 0.0, duration: 0.3 });
        });

        container.appendChild(card);
    });
}

// --- ANIMATIONS & SCROLL LOGIC ---
function setupScrollAnimations() {
    // SCENE 1
    const tl1 = gsap.timeline({
        scrollTrigger: { trigger: "#scene-1", start: "top top", end: "bottom top", scrub: 1, onEnter: () => soundManager.playHeartbeat() }
    });
    gsap.utils.toArray("#scene-1 .fade-text").forEach((el) => {
        gsap.to(el, { opacity: 1, y: 0, scrollTrigger: { trigger: el, start: "top 80%", end: "bottom 60%", scrub: true } });
    });
    tl1.to(camera.position, { y: -100, z: 40, ease: "power1.inOut" }, 0);
    tl1.to(scene.fog, { density: 0.005 }, 0);
    if (torsoGroup) {
        tl1.to(torsoGroup.children[0].material, { opacity: 0, duration: 0.5 }, 0);
        tl1.to(torsoGroup.children[1].material, { opacity: 0, duration: 0.5 }, 0);
    }

    // SCENE 2
    const tl2 = gsap.timeline({ scrollTrigger: { trigger: "#scene-2", start: "top center", end: "bottom top", scrub: 1 } });
    gsap.utils.toArray("#scene-2 .fade-text").forEach((el) => {
        gsap.to(el, { opacity: 1, y: 0, scrollTrigger: { trigger: el, start: "top 80%", scrub: true } });
    });
    tl2.to(pointCloud.rotation, { y: Math.PI / 4, x: 0.1, ease: "none" }, 0);

    // SCENE 3
    const tl3 = gsap.timeline({
        scrollTrigger: {
            trigger: "#scene-3", start: "top center", end: "bottom center", scrub: 1,
            onEnter: () => {
                gsap.to(searchBeamA, { intensity: 50, duration: 1 });
                gsap.to(searchBeamB, { intensity: 50, duration: 1 });
            }
        }
    });
    gsap.utils.toArray("#scene-3 .fade-text").forEach((el) => {
        gsap.to(el, { opacity: 1, y: 0, scrollTrigger: { trigger: el, start: "top 80%", scrub: true } });
    });

    // Sweep beams across clusters (this drives the shader AND gate)
    tl3.to(searchBeamA.target.position, { x: 5, y: -95, z: -10 }, 0); // Eutopic
    tl3.to(searchBeamA.target.position, { x: -15, y: -95, z: 0 }, 1); // Hit Ectopic

    tl3.to(searchBeamB.target.position, { x: 10, y: -90, z: -20 }, 0); // Control
    tl3.to(searchBeamB.target.position, { x: -15, y: -95, z: 0 }, 1); // Hit Ectopic at same time


    // SCENE 4
    ScrollTrigger.create({
        trigger: "#scene-4", start: "top center",
        onEnter: () => {
            gsap.to("#machine-panel", { opacity: 1, y: 0, duration: 1, ease: "back.out(1.7)" });
            soundManager.playTensionBuild();
            animateMachinePanel();
        },
        onLeaveBack: () => {
            gsap.to("#machine-panel", { opacity: 0, y: 20 });
            soundManager.stopTension();
        }
    });
    gsap.utils.toArray("#scene-4 .fade-text").forEach((el) => {
        gsap.to(el, { opacity: 1, y: 0, scrollTrigger: { trigger: el, start: "top 80%", scrub: true } });
    });

    // SCENE 5
    ScrollTrigger.create({
        trigger: "#scene-5", start: "top center",
        onEnter: () => {
            soundManager.playClimax();
            gsap.to([searchBeamA.color, searchBeamB.color], { r: 1, g: 1, b: 1, duration: 0.5 });
            gsap.to([searchBeamA, searchBeamB], { intensity: 300, angle: Math.PI / 24, duration: 0.5 }); // Laser focused
            gsap.to(uniforms.uProgress, { value: 1.0, duration: 1.5, ease: "expo.out" });
            uniforms.uIsConvergence.value = true;
        }
    });
    gsap.utils.toArray("#scene-5 .fade-text").forEach((el) => {
        gsap.to(el, { opacity: 1, y: 0, scrollTrigger: { trigger: el, start: "top 80%", scrub: true } });
    });

    // SCENE 6 - Transition to Human Silhouette
    const tl6 = gsap.timeline({
        scrollTrigger: {
            trigger: "#scene-6", start: "top center", end: "bottom center", scrub: 1,
            onEnter: () => {
                soundManager.playResolvedAmbient();
                gsap.to(pointCloud.material, { opacity: 0, duration: 1 }); // fade out data
                gsap.to([searchBeamA, searchBeamB], { intensity: 0, duration: 1 }); // clear beams
            },
            onLeaveBack: () => {
                gsap.to(pointCloud.material, { opacity: 1, duration: 1 });
            }
        }
    });

    gsap.utils.toArray("#scene-6 .fade-text").forEach((el) => {
        gsap.to(el, { opacity: 1, y: 0, scrollTrigger: { trigger: el, start: "top 80%", scrub: true } });
    });

    // Bring human into view from right
    if (silhouetteCloud) {
        tl6.to(silhouetteCloud.position, { x: 0, y: -100, z: 0, ease: "power2.out" }, 0);
        tl6.to(camera.position, { y: -100, z: 60, ease: "sine.inOut" }, 0); // Pull back
    }

    // Stagger cards in
    gsap.fromTo(".pair-card",
        { opacity: 0, x: -50 },
        {
            opacity: 1, x: 0, stagger: 0.1, duration: 0.8, ease: "back.out",
            scrollTrigger: { trigger: "#cards-container", start: "top 80%" }
        }
    );
}

function animateMachinePanel() {
    const barsA = document.getElementById('bars-a');
    const barsB = document.getElementById('bars-b');

    if (barsA.children.length === 0) {
        for (let i = 0; i < 15; i++) {
            barsA.innerHTML += `<div class="bar" style="height:${Math.random() * 100}%"></div>`;
            barsB.innerHTML += `<div class="bar" style="height:${Math.random() * 100}%"></div>`;
        }
    }

    // Liquid to solid
    gsap.to(".bar", {
        height: "10%", stagger: { amount: 1, from: "edges" }, duration: 2, ease: "power1.inOut"
    });
    // Snap the final target
    gsap.to(barsA.children[7], { height: "90%", background: "#ff4d6d", delay: 1, duration: 0.5 });
    gsap.to(barsB.children[3], { height: "90%", background: "#74b3ff", delay: 1, duration: 0.5 });

    const lossLine = document.getElementById('loss-line');
    gsap.to(lossLine, { attr: { d: "M0,10 Q25,45 50,48 T100,48" }, duration: 2, ease: "bounce.out" });

    gsap.to("#temp-fill", { scaleX: 0.05, duration: 2, ease: "power2.out" });
}

// --- EVENT LISTENERS ---
function setupUI() {
    const soundToggle = document.getElementById('sound-toggle');
    soundToggle.addEventListener('click', async () => {
        await soundManager.init();
        const isMuted = soundManager.toggleMute();
        soundToggle.innerText = isMuted ? "Sound: Muted" : "Sound: On 🔊";
        if (!isMuted) soundManager.playClimax();
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- RENDER LOOP ---
function animate(time) {
    if (uniforms) {
        uniforms.uTime.value = time * 0.001;
        if (searchBeamA && searchBeamB) {
            uniforms.uBeamA.value.copy(searchBeamA.target.position);
            uniforms.uBeamB.value.copy(searchBeamB.target.position);
            // Add simple collision checking sound
            const distA = searchBeamA.target.position.distanceTo(new THREE.Vector3(-15, -95, 0));
            const distB = searchBeamB.target.position.distanceTo(new THREE.Vector3(-15, -95, 0));

            if (distA < 5 && distB < 5 && !uniforms.uIsConvergence.value) {
                // If they intersect on ectopic, click rapidly
                if (Math.random() < 0.1) soundManager.playClick();
            }
        }
    }

    if (silhouetteUniforms) silhouetteUniforms.uTime.value = time * 0.001;

    if (silhouetteCloud) {
        silhouetteCloud.rotation.y = Math.sin(time * 0.0005) * 0.1; // gentle breathing
    }

    renderer.render(scene, camera);
}
