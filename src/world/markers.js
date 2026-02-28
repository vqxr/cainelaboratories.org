// markers.js — Floating 3D mathematical markers that orbit the helix.
// Dynamically switch text based on the scroll section.
import * as THREE from 'three';
import { getHelixGroup } from './helix.js';

const markers = [];
const markerGroup = new THREE.Group();
let targetOpacity = 0;
let currentDataset = 'genes';

// Mathematical & biological markers for different sections
const MARKER_DATASETS = {
    genes: ['EPCAM', 'MUC1', 'MSLN', 'FOLR1', 'CD44', 'WT1', 'PAX8', 'CA125'],
    math: ['Output = A ∧ B', 'Kill = (A > θ₁) ∧ (B < θ₂)', 'J = F1 - λ(FP)', 'LogFC > 2.0', 'Threshold: θ', 'Boolean = True', 'State = 1', 'Gate = AND'],
    kinetics: ['v = V_max[S]ⁿ', '[M] / dt', 'Hill coeff: n', 'K_m = 0.5', 'Ultrasensitive', 'F1-Score: 0.94', 'Precision', 'Recall'],
    safety: ['Heart: Safe', 'Liver: Safe', 'Brain: Clear', 'Lungs: Clear', 'Kidney: Safe', 'Off-target: Low', 'Toxicity: 0', 'Specificity'],
};

// Positions in HELIX LOCAL SPACE (helix axis is at local origin)
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
    // Using a wider canvas for long equations
    canvas.width = 384;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Subtle background pill
    ctx.fillStyle = 'rgba(10, 15, 40, 0.6)';
    ctx.font = '600 24px monospace';
    const metrics = ctx.measureText(text);
    // Dynamic pill width based on text
    const pillW = Math.min(metrics.width + 40, 360);
    const pillH = 40;
    const pillX = (canvas.width - pillW) / 2;
    const pillY = (canvas.height - pillH) / 2;

    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(102, 153, 255, 0.3)';
    ctx.stroke();

    ctx.fillStyle = '#88bbff'; // Lighter blue for better contrast
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    return new THREE.CanvasTexture(canvas);
}

export function createMarkers(scene) {
    MARKER_POSITIONS.forEach((pos, i) => {
        // Small glowing dot
        const dotGeo = new THREE.SphereGeometry(0.08, 12, 12);
        const dotMat = new THREE.MeshBasicMaterial({
            color: 0x88bbff,
            transparent: true,
            opacity: 0,
        });
        const dot = new THREE.Mesh(dotGeo, dotMat);
        dot.position.set(pos.x, pos.y, pos.z);

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
        // Scale adjusted for the wider 384px canvas (384/64 = 6:1 ratio)
        label.scale.set(3.0, 0.5, 1);
        label.position.set(pos.x, pos.y + 0.4, pos.z);

        // Thin connecting line toward helix axis (local origin)
        const endX = pos.x * 0.3;  // Lines go 70% of the way to the center
        const endZ = pos.z * 0.3;

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

        markerGroup.add(dot, label, line);

        markers.push({
            dot, label, line,
            dotMat, labelMat, lineMat,
            basePos: { ...pos },
            phase: i * 0.8,
            index: i
        });
    });

    const helix = getHelixGroup();
    if (helix) helix.add(markerGroup);
    else scene.add(markerGroup);
}

// Fade all out, swap the textures, fade them back in
export function switchMarkerDataset(datasetName) {
    if (!MARKER_DATASETS[datasetName] || datasetName === currentDataset) return;

    currentDataset = datasetName;
    const texts = MARKER_DATASETS[datasetName];

    // Create new textures
    markers.forEach(m => {
        const newTexture = createTextTexture(texts[m.index]);
        if (m.labelMat.map) m.labelMat.map.dispose(); // clean up old texture
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
        const next = cur + (targetOpacity - cur) * 0.06;

        m.dotMat.opacity = next;
        m.labelMat.opacity = Math.min(next * 1.2, 1.0); // Labels slightly more opaque
        m.lineMat.opacity = next * 0.3;

        // Gentle 3D bob/float
        if (next > 0.01) {
            const bobY = Math.sin(time * 0.35 + m.phase) * 0.15;
            const floatX = Math.cos(time * 0.2 + m.phase) * 0.05;

            m.dot.position.y = m.basePos.y + bobY;
            m.dot.position.x = m.basePos.x + floatX;

            m.label.position.y = m.basePos.y + bobY + 0.4;
            m.label.position.x = m.basePos.x + floatX;

            // Re-update the line geometry to connect dot to center
            const pts = m.line.geometry.attributes.position.array;
            pts[0] = m.dot.position.x;
            pts[1] = m.dot.position.y;
            pts[2] = m.dot.position.z;
            m.line.geometry.attributes.position.needsUpdate = true;
        }
    });
}
