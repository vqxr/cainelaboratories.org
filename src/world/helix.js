// helix.js — Hero object. Thick glass-rod helix with glowing red nodes.
import * as THREE from 'three';
import { COLORS } from '../core/engine.js';

let helixGroup;
let strandA;
let strandB;

let targetSeparation = 0;
let currentSeparation = 0;

export function createHelix(scene) {
    helixGroup = new THREE.Group();
    strandA = new THREE.Group();
    strandB = new THREE.Group();

    const turns    = 5;
    const height   = 12;
    const radius   = 1.1;
    const segments = 300;

    const strand1Points = [];
    const strand2Points = [];

    for (let i = 0; i <= segments; i++) {
        const t     = i / segments;
        const angle = t * turns * Math.PI * 2;
        const y     = (t - 0.5) * height;

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

    // ── Glass rod material ─────────────────────────────────────────
    // tube radius is now 0.055 — was 0.04, nearly invisible before
    const strandMat = new THREE.MeshPhysicalMaterial({
        color:               new THREE.Color(0xd0d8f0),
        roughness:           0.05,
        metalness:           0.0,
        transmission:        0.6,
        thickness:           0.8,
        ior:                 1.5,
        transparent:         true,
        opacity:             0.95,
        envMapIntensity:     1.0,
        clearcoat:           1.0,
        clearcoatRoughness:  0.1,
    });

    const curve1   = new THREE.CatmullRomCurve3(strand1Points);
    const curve2   = new THREE.CatmullRomCurve3(strand2Points);
    const tubeGeo1 = new THREE.TubeGeometry(curve1, 300, 0.055, 10, false);
    const tubeGeo2 = new THREE.TubeGeometry(curve2, 300, 0.055, 10, false);

    strandA.add(new THREE.Mesh(tubeGeo1, strandMat));
    strandB.add(new THREE.Mesh(tubeGeo2, strandMat.clone()));

    // ── Rungs ──────────────────────────────────────────────────────
    const rungMat = new THREE.LineBasicMaterial({
        color:       0x4466aa,
        transparent: true,
        opacity:     0.15,
    });

    for (let i = 0; i <= segments; i += 10) {
        const geo = new THREE.BufferGeometry().setFromPoints([
            strand1Points[i], strand2Points[i],
        ]);
        helixGroup.add(new THREE.Line(geo, rungMat));
    }

    // ── Red emissive nodes ─────────────────────────────────────────
    // These are what bloom. High emissiveIntensity = visible glow corona.
    const nodeMat = new THREE.MeshStandardMaterial({
        color:             new THREE.Color(0xff2244),
        emissive:          new THREE.Color(0xff1133),
        emissiveIntensity: 3.0,   // HIGH — this feeds the bloom pass
        roughness:         0.2,
        metalness:         0.0,
    });

    // Slightly larger nodes — 0.12 radius, visible from distance
    const nodeGeo = new THREE.SphereGeometry(0.12, 16, 16);

    for (let i = 0; i <= segments; i += 15) {
        const nA = new THREE.Mesh(nodeGeo, nodeMat);
        nA.position.copy(strand1Points[i]);
        strandA.add(nA);

        const nB = new THREE.Mesh(nodeGeo, nodeMat.clone());
        nB.position.copy(strand2Points[i]);
        strandB.add(nB);
    }

    // ── Highlight two "found target" nodes — bigger, brighter ──────
    const targetMat = new THREE.MeshStandardMaterial({
        color:             new THREE.Color(0xff4466),
        emissive:          new THREE.Color(0xff2244),
        emissiveIntensity: 6.0,   // Very high — will corona in bloom
        roughness:         0.1,
        metalness:         0.0,
    });
    const targetGeo = new THREE.SphereGeometry(0.2, 20, 20);

    // Strand A target — roughly 1/3 up
    const tA = new THREE.Mesh(targetGeo, targetMat);
    tA.position.copy(strand1Points[Math.floor(segments * 0.33)]);
    strandA.add(tA);

    // Strand B target — roughly 2/3 up
    const tB = new THREE.Mesh(targetGeo, targetMat.clone());
    tB.position.copy(strand2Points[Math.floor(segments * 0.66)]);
    strandB.add(tB);

    helixGroup.add(strandA);
    helixGroup.add(strandB);

    // Centre, close enough to feel monumental
    helixGroup.position.set(0, 1, -5);

    scene.add(helixGroup);
    return helixGroup;
}

export function setHelixSeparation(amount) {
    targetSeparation = amount;
}

export function updateHelix(time) {
    if (!helixGroup) return;

    // Smooth interpolation
    currentSeparation += (targetSeparation - currentSeparation) * 0.035;

    if (strandA) strandA.position.x = -currentSeparation * 0.6;
    if (strandB) strandB.position.x =  currentSeparation * 0.6;

    // Very slow idle rotation — barely perceptible, just alive
    helixGroup.rotation.y = time * 0.04;

    // Breathing pulse on all emissive nodes
    const pulse = 2.5 + Math.sin(time * 1.2) * 0.8;
    helixGroup.traverse(child => {
        if (child.isMesh && child.material.emissiveIntensity !== undefined) {
            // Only pulse regular nodes, not the two big target nodes (intensity ~6)
            if (child.material.emissiveIntensity < 5.5) {
                child.material.emissiveIntensity = pulse;
            }
        }
    });
}

export function getHelixGroup() { return helixGroup; }