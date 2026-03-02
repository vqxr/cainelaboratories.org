// markers.js — Floating 3D markers orbiting the helix.
// Dynamically switch text based on the scroll section.
// Content derived from the BBT technical brief.
import * as THREE from 'three';
import { getHelixGroup } from './helix.js';

const markers = [];
const markerGroup = new THREE.Group();
let targetOpacity = 0;
let currentDataset = 'genes';

// Real content from the technical brief, per section
const MARKER_DATASETS = {
    clinical: ['190M affected', '10% prevalence', '20–40% recurrence', 'Diagnostic delay', 'No molecular guide', 'Visual inspection', '1977 FDA gap', 'Excision limits'],
    genes: ['PTPRC', 'EPCAM', 'MUC16', 'FOLR1', 'CDH1', 'VTCN1', 'TACSTD2', 'MSLN'],
    data: ['scVI-VAE', 'ZINB model', 'GSE213216', 'Tabula Sapiens', 'AnnData .h5ad', 'Posterior μ(z)', 'Dropout recovery', '3000 surface proteins'],
    math: ['m_j = σ((α+g)/τ)', 'log a_i = Σ log(1−m_j)', 'L = −y log a + (1−y)a', 'K = 2 constraint', 'Gumbel-Softmax', 'τ → 0 annealing', 'α_j ∈ ℝ (logits)', 'Adam optimiser'],
    results: ['#1 PTPRC+EPCAM', '#2 MUC16+FOLR1', '#3 CDH1+VTCN1', '#4 TACSTD2+MSLN', 'Score: 0.981', 'Specificity: 0.97', 'Prevalence: 0.91', 'Healthy: 0.02'],
    safety: ['Heart: Clear', 'Liver: Clear', 'Brain: Clear', 'Lungs: Clear', 'Kidney: Clear', 'Gut: Clear', '∞ penalty', 'Fratricide check'],
    vision: ['iGEM 2026', 'Pre-seed', 'Deep Tech', 'FemTech', 'Translational', 'scFv screening', 'CAR construct', 'Wet lab next'],
};

// Positions in HELIX LOCAL SPACE
const MARKER_POSITIONS = [
    { x: 3.2, y: 4.0, z: 2.0 },
    { x: -3.0, y: 2.8, z: -1.8 },
    { x: 3.6, y: 0.8, z: 2.5 },
    { x: -2.8, y: -0.5, z: -2.4 },
    { x: 2.5, y: -2.5, z: 1.5 },
    { x: -3.4, y: 3.5, z: 0.8 },
    { x: 2.9, y: 1.8, z: -1.2 },
    { x: -2.9, y: -1.8, z: -0.8 },
];

function createTextTexture(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 440; // Increased width for larger box
    canvas.height = 80; // Increased height for larger box
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Modern glass pill with gradient - LARGER BOX
    ctx.font = '600 24px "DM Mono", monospace';
    const metrics = ctx.measureText(text);
    const pillW = Math.min(metrics.width + 60, 420);
    const pillH = 54;
    const pillX = (canvas.width - pillW) / 2;
    const pillY = (canvas.height - pillH) / 2;

    const grad = ctx.createLinearGradient(pillX, pillY, pillX, pillY + pillH);
    grad.addColorStop(0, 'rgba(15, 25, 60, 0.9)');
    grad.addColorStop(1, 'rgba(5, 10, 30, 0.98)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, 8);
    ctx.fill();

    // Sharp outer silver/blue border
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(120, 180, 255, 0.8)';
    ctx.stroke();

    // Sharp, legible white text (No excessive glow for readability)
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '0.5px';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    return new THREE.CanvasTexture(canvas);
}

export function createMarkers(scene) {
    MARKER_POSITIONS.forEach((pos, i) => {
        // Detailed tech node: Icosahedron + Glow core
        const dotGroup = new THREE.Group();

        const geom = new THREE.IcosahedronGeometry(0.12, 1);
        const mat = new THREE.MeshPhongMaterial({
            color: 0x88bbff,
            emissive: 0x4477ff,
            emissiveIntensity: 2,
            transparent: true,
            opacity: 0,
            flatShading: true
        });
        const dot = new THREE.Mesh(geom, mat);
        dotGroup.add(dot);

        // Core glow
        const coreGeom = new THREE.SphereGeometry(0.05, 8, 8);
        const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
        const core = new THREE.Mesh(coreGeom, coreMat);
        dotGroup.add(core);

        // EXTRA GLOW SPRITE (for the "pop")
        const glowTex = new THREE.TextureLoader().load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/lensflare/lensflare0.png');
        const glowMat = new THREE.SpriteMaterial({
            map: glowTex,
            color: 0x4477ff,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const glow = new THREE.Sprite(glowMat);
        glow.scale.set(0.6, 0.6, 1);
        dotGroup.add(glow);

        dotGroup.position.set(pos.x, pos.y, pos.z);

        // Text label sprite
        const initialText = MARKER_DATASETS.genes[i];
        const texture = createTextTexture(initialText);
        const labelMat = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            opacity: 0,
            depthWrite: false,
        });
        const label = new THREE.Sprite(labelMat);
        label.scale.set(3.4, 0.62, 1);
        label.position.set(pos.x, pos.y + 0.5, pos.z);

        // Tech line: Dashed look via shader or simple line with opacity
        const endX = pos.x * 0.25;
        const endZ = pos.z * 0.25;

        const lineGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(pos.x, pos.y, pos.z),
            new THREE.Vector3(endX, pos.y, endZ),
        ]);
        const lineMat = new THREE.LineBasicMaterial({
            color: 0x6699ff,
            transparent: true,
            opacity: 0,
        });
        const line = new THREE.Line(lineGeo, lineMat);

        markerGroup.add(dotGroup, label, line);

        markers.push({
            dotGroup, dot, core, label, line,
            dotMat: mat, coreMat, glowMat, labelMat, lineMat,
            basePos: { ...pos },
            phase: i * 0.8,
            index: i
        });
    });

    const helix = getHelixGroup();
    if (helix) {
        helix.add(markerGroup);
    } else {
        // Fallback or retry logic if helix isn't ready
        scene.add(markerGroup);
        const checkHelix = setInterval(() => {
            const h = getHelixGroup();
            if (h) {
                h.add(markerGroup);
                clearInterval(checkHelix);
            }
        }, 100);
    }
}

// Fade all out, swap the textures, fade them back in
export function switchMarkerDataset(datasetName) {
    if (!MARKER_DATASETS[datasetName] || datasetName === currentDataset) return;

    currentDataset = datasetName;
    const texts = MARKER_DATASETS[datasetName];

    markers.forEach(m => {
        const newTexture = createTextTexture(texts[m.index]);
        if (m.labelMat.map) m.labelMat.map.dispose();
        m.labelMat.map = newTexture;
    });
}

export function showMarkers() {
    targetOpacity = 1;
}

export function hideMarkers() {
    targetOpacity = 0;
}

export function updateMarkers(time) {
    markers.forEach(m => {
        // Smooth opacity lerp
        const cur = m.dotMat.opacity;
        const next = cur + (targetOpacity - cur) * 0.05;

        m.dotMat.opacity = next;
        m.coreMat.opacity = next;
        if (m.glowMat) m.glowMat.opacity = next * 0.8;
        m.labelMat.opacity = Math.min(next * 1.5, 1.0);
        m.lineMat.opacity = next * 0.4;

        // Gentle rotate + bob
        if (next > 0.01) {
            const bobY = Math.sin(time * 0.4 + m.phase) * 0.12;
            const floatX = Math.cos(time * 0.25 + m.phase) * 0.06;

            m.dotGroup.position.y = m.basePos.y + bobY;
            m.dotGroup.position.x = m.basePos.x + floatX;
            m.dotGroup.rotation.y = time * 0.5;
            m.dotGroup.rotation.z = time * 0.3;

            m.label.position.y = m.basePos.y + bobY + 0.45;
            m.label.position.x = m.basePos.x + floatX;

            // Re-update the line geometry
            const pts = m.line.geometry.attributes.position.array;
            pts[0] = m.dotGroup.position.x;
            pts[1] = m.dotGroup.position.y;
            pts[2] = m.dotGroup.position.z;
            m.line.geometry.attributes.position.needsUpdate = true;
        }
    });
}
