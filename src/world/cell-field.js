// cell-field.js — Background floating cells.
// Now interactive: repel gently from the mouse cursor.
import * as THREE from 'three';
import { getCamera } from '../core/engine.js';

const cells = [];
let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const cellVert = `
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const cellFrag = `
    varying vec3 vNormal;
    varying vec3 vPosition;
    uniform float uTime;
    
    void main() {
        // Soft blue core with bright edge (fresnel)
        vec3 viewDir = normalize(cameraPosition - vPosition);
        float fresnel = dot(viewDir, vNormal);
        fresnel = clamp(1.0 - fresnel, 0.0, 1.0);
        fresnel = pow(fresnel, 4.0);
        
        vec3 col = mix(vec3(0.05, 0.1, 0.3), vec3(0.3, 0.5, 1.0), fresnel);
        float alpha = mix(0.1, 0.8, fresnel);
        alpha *= 0.5 + sin(uTime * 0.5) * 0.1;

        gl_FragColor = vec4(col, alpha);
    }
`;

const POSITIONS = [
    [-7, 2, -14], [6, 3, -18], [-4, -1, -20],
    [8, -2, -15], [-3, 4, -22], [7, 0, -12],
    [-8, 1, -17], [4, 5, -19], [-5, -2, -13],
    [9, 2, -21], [-4, 1, -16], [5, -1, -23],
];
const SIZES = [0.7, 0.55, 0.8, 0.5, 0.85, 0.6, 0.7, 0.55, 0.75, 0.65, 0.5, 0.75];
const PHASES = [0, 0.8, 1.6, 2.4, 3.2, 4.0, 0.4, 1.2, 2.0, 2.8, 3.6, 4.4];

export function createCellField(scene) {
    POSITIONS.forEach(([x, y, z], i) => {
        const mat = new THREE.ShaderMaterial({
            vertexShader: cellVert,
            fragmentShader: cellFrag,
            uniforms: {
                uTime: { value: 0 },
            },
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending, // makes them look more luminous
        });
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(SIZES[i], 32, 32), mat);

        // Base positions they want to return to
        mesh.userData.basePos = new THREE.Vector3(x, y, z);
        // Current velocity/offset from interaction
        mesh.userData.offset = new THREE.Vector3(0, 0, 0);
        mesh.userData.velocity = new THREE.Vector3(0, 0, 0);
        mesh.userData.phase = PHASES[i];

        mesh.position.copy(mesh.userData.basePos);
        scene.add(mesh);
        cells.push(mesh);
    });

    // Track mouse for interaction
    window.addEventListener('mousemove', (e) => {
        // Convert screen coordinates to normalized device coordinates (-1 to +1)
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        mouseX = e.clientX;
        mouseY = e.clientY;
    });
}

const REPEL_RADIUS = 5.0;
const REPEL_FORCE = 0.05;
const SPRING_STRENGTH = 0.015;
const DAMPING = 0.88;

// Plane at z=-16 (avg cell depth) to cast mouse ray against
const rayPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 16);
const targetVec = new THREE.Vector3();

export function updateCellField(time) {
    const camera = getCamera();

    // Find where mouse ray intersects the background plane
    raycaster.setFromCamera(mouse, camera);
    raycaster.ray.intersectPlane(rayPlane, targetVec);

    cells.forEach(cell => {
        const data = cell.userData;

        // --- 1. Natural Bobbing ---
        const bob = Math.sin(time * 0.4 + data.phase) * 0.4;

        // --- 2. Mouse Interaction (Repel) ---
        // Calculate distance from mouse target position in 3D space to the cell's base
        const dx = data.basePos.x - targetVec.x;
        const dy = data.basePos.y - targetVec.y;
        const distSq = dx * dx + dy * dy; // Ignore Z for repel

        if (distSq < REPEL_RADIUS * REPEL_RADIUS) {
            const dist = Math.sqrt(distSq);
            // Repel force inversely proportional to distance
            const force = (REPEL_RADIUS - dist) / REPEL_RADIUS * REPEL_FORCE;
            data.velocity.x += (dx / dist) * force;
            data.velocity.y += (dy / dist) * force;
        }

        // --- 3. Physics Step ---
        // Apply spring force pulling back to base (0 offset)
        data.velocity.x += -data.offset.x * SPRING_STRENGTH;
        data.velocity.y += -data.offset.y * SPRING_STRENGTH;

        // Apply damping (friction)
        data.velocity.multiplyScalar(DAMPING);

        // Update offset
        data.offset.add(data.velocity);

        // --- 4. Final Position ---
        cell.position.x = data.basePos.x + data.offset.x;
        cell.position.y = data.basePos.y + bob + data.offset.y;
        cell.position.z = data.basePos.z; // Z doesn't change

        // Update shader time
        cell.material.uniforms.uTime.value = time;
    });
}