// cell-field.js — Sparse translucent cell spheres behind the helix.
// Minimal overhead: 12 objects, Y-drift only, GPU-friendly.
import * as THREE from 'three';
import { COLORS } from '../core/engine.js';

const cells = [];

// Deterministic positions — not random so they look intentional
const POSITIONS = [
    [-8, 2, -14], [6, 4, -18], [-5, -1, -20],
    [9, -2, -15], [-3, 5, -22], [7, 1, -12],
    [-9, 0, -17], [4, 6, -19], [-6, -3, -13],
    [8, 3, -21], [-4, 2, -16], [5, -1, -23],
];

// Each cell gets a unique drift phase
const PHASES = [0, 0.8, 1.6, 2.4, 3.2, 4.0, 0.4, 1.2, 2.0, 2.8, 3.6, 4.4];

// Sizes vary slightly
const SIZES = [0.6, 0.5, 0.7, 0.45, 0.8, 0.55, 0.65, 0.5, 0.75, 0.6, 0.5, 0.7];

const cellMat = new THREE.MeshPhysicalMaterial({
    color: COLORS.CELL,
    transmission: 0.85,
    roughness: 0.05,
    metalness: 0.0,
    ior: 1.33,   // water-like — biological cells are mostly water
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
});

export function createCellField(scene) {
    POSITIONS.forEach(([x, y, z], i) => {
        const geo = new THREE.SphereGeometry(SIZES[i], 32, 32);
        const mesh = new THREE.Mesh(geo, cellMat.clone());
        mesh.position.set(x, y, z);
        mesh.userData.baseY = y;
        mesh.userData.phase = PHASES[i];
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
