import * as THREE from 'three';

let terrainLines;
let geometry;
const width = 120; // Slightly wider for better coverage
const depth = 120;
const segments = 100; // Optimized segment count for smooth CPU updates

export function createTopoTerrain(scene) {
    // 1. Create Terrain Geometry
    geometry = new THREE.PlaneGeometry(width, depth, segments, segments);
    geometry.rotateX(-Math.PI / 2); // Lay flat

    // 2. Initial Displacement (will be updated in animate)
    updateDisplacement(0);

    // 3. Create wireframe using WireframeGeometry + LineSegments
    const wireframe = new THREE.WireframeGeometry(geometry);
    const lineMat = new THREE.LineBasicMaterial({
        color: 0x00f0ff, // Neon Cyan
        transparent: true,
        opacity: 0.2,
        blending: THREE.AdditiveBlending
    });
    terrainLines = new THREE.LineSegments(wireframe, lineMat);

    // Position it as a deep floor
    terrainLines.position.y = -10;
    scene.add(terrainLines);

    return terrainLines;
}

function updateDisplacement(time) {
    const positionAttribute = geometry.attributes.position;
    const count = positionAttribute.count;

    for (let i = 0; i < count; i++) {
        const x = positionAttribute.getX(i);
        const z = positionAttribute.getZ(i);

        // Rolling Wave Logic: Combine directional waves with varying frequencies
        // Wave A: Primary rolling wave (moving along Z)
        let y = Math.sin(z * 0.15 + time * 0.8) * 1.5;

        // Wave B: Secondary cross-wave (moving along X)
        y += Math.sin(x * 0.1 + time * 0.5) * 1.0;

        // Wave C: Higher frequency "noise" waves for organic feel
        y += Math.sin(x * 0.3 + z * 0.2 + time * 1.2) * 0.5;
        y += Math.cos(x * 0.05 - z * 0.1 + time * 0.4) * 0.8;

        // Apply a gentle falloff toward the center to keep the focus on the helix? 
        // Or just keep it broad. Let's keep it broad but subtle.

        positionAttribute.setY(i, y);
    }
    positionAttribute.needsUpdate = true;
}

export function updateTopoTerrain(time) {
    if (!geometry) return;
    updateDisplacement(time);
}
