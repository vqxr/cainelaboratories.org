// =============================================
// FILE: js/main.js (orchestrator)
// =============================================
import * as THREE from 'https://cdn.skypack.dev/three@0.128.0';
import { OrbitControls } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/controls/OrbitControls.js';

// global state
window.CAINELAB = {
    scene: null,
    camera: null,
    renderer: null,
    cane: null,
    particles: [],
    powderSystem: null,
    hutScene: null,
    currentScroll: 0,
    explosionTriggered: false
};

// init main 3d canvas (background)
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a1f0a);
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 2, 8);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
container.appendChild(renderer.domElement);

window.CAINELAB.scene = scene;
window.CAINELAB.camera = camera;
window.CAINELAB.renderer = renderer;

// basic lights
const ambient = new THREE.AmbientLight(0x404040);
scene.add(ambient);
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(2, 5, 3);
scene.add(dirLight);

// create sugarcane stalk (detailed)
const stalkGroup = new THREE.Group();

// main stem (curved)
const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -2, 0),
    new THREE.Vector3(0.1, -1, 0.1),
    new THREE.Vector3(-0.05, 0, -0.05),
    new THREE.Vector3(0.1, 1, 0.1),
    new THREE.Vector3(0, 2, 0)
]);
const tubeGeo = new THREE.TubeGeometry(curve, 64, 0.2, 8, false);
const tubeMat = new THREE.MeshStandardMaterial({ color: 0x8ba86b, emissive: 0x1a3a1a });
const stalk = new THREE.Mesh(tubeGeo, tubeMat);
stalk.castShadow = true;
stalk.receiveShadow = true;
stalkGroup.add(stalk);

// leaves
for (let i = 0; i < 5; i++) {
    const leafGeo = new THREE.ConeGeometry(0.1, 1.2, 6);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x5b8c4b });
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.position.set(0.2 + i*0.1, 1 - i*0.4, 0.1);
    leaf.rotation.z = 0.3;
    leaf.rotation.x = 0.4;
    stalkGroup.add(leaf);
}

// golden bands (nodes)
for (let y = -1.5; y <= 1.5; y+=0.8) {
    const ringGeo = new THREE.TorusGeometry(0.22, 0.03, 8, 20);
    const ringMat = new THREE.MeshStandardMaterial({ color: 0xc9a550 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = y;
    ring.rotation.x = Math.PI/2;
    stalkGroup.add(ring);
}

stalkGroup.position.y = 0;
scene.add(stalkGroup);
window.CAINELAB.cane = stalkGroup;

// powder particle system (invisible until explosion)
const powderGeo = new THREE.BufferGeometry();
const powderCount = 2000;
const powderPositions = new Float32Array(powderCount * 3);
const powderColors = new Float32Array(powderCount * 3);
for (let i = 0; i < powderCount; i++) {
    powderPositions[i*3] = (Math.random() - 0.5) * 2;
    powderPositions[i*3+1] = (Math.random() - 0.5) * 4;
    powderPositions[i*3+2] = (Math.random() - 0.5) * 2;
    // white/cream colors
    powderColors[i*3] = 0.95 + Math.random()*0.05;
    powderColors[i*3+1] = 0.9 + Math.random()*0.1;
    powderColors[i*3+2] = 0.8 + Math.random()*0.2;
}
powderGeo.setAttribute('position', new THREE.BufferAttribute(powderPositions, 3));
powderGeo.setAttribute('color', new THREE.BufferAttribute(powderColors, 3));

const powderMat = new THREE.PointsMaterial({
    size: 0.05,
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
});
const powderPoints = new THREE.Points(powderGeo, powderMat);
powderPoints.visible = false;
scene.add(powderPoints);
window.CAINELAB.powderSystem = powderPoints;

// hut scene (will be swapped later via scroll)
const hutGroup = new THREE.Group();
// simple hut shape (old explorer's hut)
const hutBase = new THREE.BoxGeometry(3, 2, 3);
const hutMat = new THREE.MeshStandardMaterial({ color: 0x6b4e3a });
const hut = new THREE.Mesh(hutBase, hutMat);
hut.position.y = 1;
hutGroup.add(hut);

// thatched roof (pyramid)
const roofGeo = new THREE.ConeGeometry(2.2, 1.5, 4);
const roofMat = new THREE.MeshStandardMaterial({ color: 0x4a3a2a });
const roof = new THREE.Mesh(roofGeo, roofMat);
roof.position.y = 2.2;
roof.rotation.y = Math.PI/4;
hutGroup.add(roof);

// door
const doorGeo = new THREE.BoxGeometry(0.8, 1.3, 0.2);
const doorMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a });
const door = new THREE.Mesh(doorGeo, doorMat);
door.position.set(0, 0.8, 1.51);
hutGroup.add(door);

hutGroup.position.set(0, -10, -5); // hidden below
scene.add(hutGroup);
window.CAINELAB.hutScene = hutGroup;

// animation loop
function animate() {
    requestAnimationFrame(animate);

    // subtle cane rotation based on scroll
    if (window.CAINELAB.cane && !window.CAINELAB.explosionTriggered) {
        window.CAINELAB.cane.rotation.y += 0.002;
    }

    // powder animation if visible
    if (window.CAINELAB.powderSystem && window.CAINELAB.powderSystem.visible) {
        const positions = window.CAINELAB.powderSystem.geometry.attributes.position.array;
        for (let i = 0; i < positions.length; i+=3) {
            positions[i+1] += 0.005; // drift upward
            if (positions[i+1] > 4) positions[i+1] = -4;
        }
        window.CAINELAB.powderSystem.geometry.attributes.position.needsUpdate = true;
    }

    renderer.render(scene, camera);
}
animate();

// scroll trigger (simplified with gsap)
gsap.registerPlugin(ScrollTrigger);

// when user scrolls past threshold, trigger explosion
ScrollTrigger.create({
    trigger: "#explosion-section",
    start: "top top",
    end: "+=1000",
    scrub: true,
    onUpdate: (self) => {
        const progress = self.progress;
        if (progress > 0.3 && !window.CAINELAB.explosionTriggered) {
            triggerExplosion();
        }
        // move camera slightly
        camera.position.z = 8 - progress * 3;
    }
});

// when entering hut section, move hut up
ScrollTrigger.create({
    trigger: "#hut-section",
    start: "top bottom",
    end: "top center",
    scrub: true,
    onUpdate: (self) => {
        if (self.progress > 0.2) {
            hutGroup.position.y = -5 + self.progress * 15;
            if (hutGroup.position.y > 1) hutGroup.position.y = 1;
        }
    }
});

function triggerExplosion() {
    if (window.CAINELAB.explosionTriggered) return;
    window.CAINELAB.explosionTriggered = true;

    // hide cane
    gsap.to(window.CAINELAB.cane.scale, {
        x: 0, y: 0, z: 0,
        duration: 0.5,
        ease: "power2.in"
    });

    // show powder
    window.CAINELAB.powderSystem.visible = true;
    gsap.fromTo(window.CAINELAB.powderSystem.material,
        { opacity: 0 },
        { opacity: 0.9, duration: 1 }
    );

    // shake camera
    gsap.to(camera.position, {
        x: 0.2, y: 0.2, z: 7,
        duration: 0.2,
        yoyo: true,
        repeat: 3
    });

    // dispatch event for powder.js overlay
    document.dispatchEvent(new CustomEvent('caine-explode'));
}

// resize handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
