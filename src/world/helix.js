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

    const turns = 5;
    const height = 10;
    const radius = 1.0;
    const segments = 240;

    const strand1Points = [];
    const strand2Points = [];

    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const angle = t * turns * Math.PI * 2;
        const y = (t - 0.5) * height;

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
        color: 0xe8e8ea,
        roughness: 0.08,
        metalness: 0.0,
        transmission: 0.5,   // semi-transparent glass
        thickness: 0.4,
        ior: 1.45,
        transparent: true,
        opacity: 0.9,
    });

    // Build tube strands
    const curve1 = new THREE.CatmullRomCurve3(strand1Points);
    const curve2 = new THREE.CatmullRomCurve3(strand2Points);
    const tubeGeo1 = new THREE.TubeGeometry(curve1, 240, 0.04, 8, false);
    const tubeGeo2 = new THREE.TubeGeometry(curve2, 240, 0.04, 8, false);

    strandA.add(new THREE.Mesh(tubeGeo1, strandMat));
    strandB.add(new THREE.Mesh(tubeGeo2, strandMat));

    // Rungs (connecting lines) — barely visible, just structural
    const rungMat = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.06,
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
        color: 0xff4d6d,
        emissive: new THREE.Color(0xff4d6d),
        emissiveIntensity: 0.4,
        roughness: 0.1,
        metalness: 0.0,
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
    if (strandB) strandB.position.x = currentSeparation * 0.5;

    // Pulse the node emissive intensity gently
    const pulse = 0.3 + Math.sin(time * 1.4) * 0.15;
    helixGroup.traverse(child => {
        if (child.isMesh && child.material.emissive) {
            child.material.emissiveIntensity = pulse;
        }
    });
}

export function getHelixGroup() { return helixGroup; }
