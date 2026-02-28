// cell-field.js — Translucent cell spheres with custom shader.
// No MeshPhysicalMaterial transmission — uses custom fresnel shader instead.
import * as THREE from 'three';

const cells = [];

const cellVert = /* glsl */`
    varying vec3 vNormal;
    varying vec3 vViewDir;
    varying vec3 vWorldPos;
    void main() {
        vec4 wp  = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        vNormal   = normalize(normalMatrix * normal);
        vViewDir  = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const cellFrag = /* glsl */`
    uniform float uTime;
    uniform float uPhase;
    varying vec3  vNormal;
    varying vec3  vViewDir;
    varying vec3  vWorldPos;
    void main() {
        float fresnel = pow(1.0 - clamp(dot(vNormal, vViewDir), 0.0, 1.0), 3.0);
        // Soft membrane colour — cold blue-white
        vec3 inner = vec3(0.04, 0.06, 0.18);
        vec3 edge  = vec3(0.3, 0.5, 1.0);
        vec3 col   = mix(inner, edge, fresnel);
        // Subtle internal pulse
        float pulse = sin(uTime * 0.4 + uPhase) * 0.5 + 0.5;
        col += vec3(0.02, 0.04, 0.12) * pulse;
        float alpha = mix(0.02, 0.35, fresnel);
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
                uPhase: { value: PHASES[i] },
            },
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false,
        });
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(SIZES[i], 32, 32), mat);
        mesh.position.set(x, y, z);
        mesh.userData.baseY = y;
        mesh.userData.phase = PHASES[i];
        scene.add(mesh);
        cells.push(mesh);
    });
}

export function updateCellField(time) {
    cells.forEach(cell => {
        cell.position.y = cell.userData.baseY + Math.sin(time * 0.07 + cell.userData.phase) * 0.3;
        cell.material.uniforms.uTime.value = time;
    });
}