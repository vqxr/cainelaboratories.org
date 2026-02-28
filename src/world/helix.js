// helix.js — Custom GLSL shaders. No MeshPhysicalMaterial transmission
// (requires envmap, silently invisible without one).
// Instead: custom vertex+fragment shaders for chromatic glass effect.
import * as THREE from 'three';

let helixGroup;
let strandA;
let strandB;
let targetSeparation = 0;
let currentSeparation = 0;

// ── Custom glass shader ──────────────────────────────────────────────────
// Fresnel rim + internal refraction shimmer + specular highlight.
// Works without an environment map. Always visible.
const glassVert = /* glsl */`
    varying vec3 vNormal;
    varying vec3 vViewDir;
    varying vec3 vWorldPos;
    varying vec2 vUv;
    void main() {
        vUv = uv;
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        vNormal = normalize(normalMatrix * normal);
        vViewDir = normalize(cameraPosition - worldPos.xyz);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const glassFrag = /* glsl */`
    uniform float uTime;
    uniform vec3  uColor;
    uniform float uFresnelPower;
    varying vec3  vNormal;
    varying vec3  vViewDir;
    varying vec3  vWorldPos;
    varying vec2  vUv;

    void main() {
        // Fresnel — bright at silhouette edges like real glass
        float fresnel = pow(1.0 - clamp(dot(vNormal, vViewDir), 0.0, 1.0), uFresnelPower);

        // Internal shimmer — simulates refraction without an envmap
        float shimmer = sin(vWorldPos.y * 4.0 + uTime * 0.8) * 0.5 + 0.5;
        shimmer *= sin(vWorldPos.x * 6.0 - uTime * 0.5) * 0.5 + 0.5;

        // Chromatic split at edges — red/blue dispersion
        vec3 col = uColor;
        col.r += fresnel * 0.4 + shimmer * 0.08;
        col.b += fresnel * 0.6 + shimmer * 0.12;
        col.g += shimmer * 0.04;

        // Specular hotspot from key light direction
        vec3 lightDir = normalize(vec3(5.0, 8.0, 6.0));
        vec3 halfVec  = normalize(lightDir + vViewDir);
        float spec    = pow(max(dot(vNormal, halfVec), 0.0), 80.0);
        col += vec3(spec * 1.2);

        // Rim from blue light (left-back)
        vec3 rimDir = normalize(vec3(-8.0, 2.0, -6.0));
        float rim   = pow(max(dot(vNormal, rimDir), 0.0), 3.0) * (1.0 - dot(vNormal, vViewDir));
        col += vec3(0.1, 0.2, 0.8) * rim * 0.6;

        // Opacity — fresnel edges opaque, core transparent
        float alpha = mix(0.10, 0.85, fresnel) + shimmer * 0.05;

        gl_FragColor = vec4(col, alpha);
    }
`;

// ── Node glow shader ─────────────────────────────────────────────────────
// Pure emissive spheres that feed the bloom pass.
const nodeVert = /* glsl */`
    varying vec3 vNormal;
    varying vec3 vViewDir;
    void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vNormal   = normalize(normalMatrix * normal);
        vViewDir  = normalize(cameraPosition - worldPos.xyz);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const nodeFrag = /* glsl */`
    uniform float uTime;
    uniform float uPulse;
    uniform vec3  uColor;
    uniform float uBrightness;
    varying vec3  vNormal;
    varying vec3  vViewDir;
    void main() {
        float fresnel = pow(1.0 - clamp(dot(vNormal, vViewDir), 0.0, 1.0), 2.0);
        // Hot core + glowing edge
        vec3 col = uColor * uBrightness;
        col += vec3(1.0, 0.6, 0.5) * uBrightness * 0.3 * (1.0 - fresnel); // hot white core
        col += uColor * fresnel * 2.0;  // bright rim feeds bloom
        col *= 0.85 + uPulse * 0.15;
        gl_FragColor = vec4(col, 1.0);
    }
`;

export function createHelix(scene) {
    helixGroup = new THREE.Group();
    strandA = new THREE.Group();
    strandB = new THREE.Group();

    const turns = 5;
    const height = 12;
    const radius = 1.1;
    const segments = 280;

    const pts1 = [], pts2 = [];

    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const angle = t * turns * Math.PI * 2;
        const y = (t - 0.5) * height;
        pts1.push(new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius));
        pts2.push(new THREE.Vector3(Math.cos(angle + Math.PI) * radius, y, Math.sin(angle + Math.PI) * radius));
    }

    // Glass strand material — custom shader, always renders
    const glassMat = () => new THREE.ShaderMaterial({
        vertexShader: glassVert,
        fragmentShader: glassFrag,
        uniforms: {
            uTime: { value: 0 },
            uColor: { value: new THREE.Color(0x8899dd) },
            uFresnelPower: { value: 3.5 },
        },
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
    });

    // Build tubes
    const matA = glassMat();
    const matB = glassMat();
    strandA.add(new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts1), 280, 0.08, 10, false), matA
    ));
    strandB.add(new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts2), 280, 0.08, 10, false), matB
    ));

    // Store materials for animation
    helixGroup.userData.glassMats = [matA, matB];

    // Rungs — subtle blue structure lines
    const rungMat = new THREE.ShaderMaterial({
        vertexShader: `void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `void main() { gl_FragColor = vec4(0.3, 0.5, 1.0, 0.18); }`,
        transparent: true,
        depthWrite: false,
    });
    for (let i = 0; i <= segments; i += 10) {
        const geo = new THREE.BufferGeometry().setFromPoints([pts1[i], pts2[i]]);
        helixGroup.add(new THREE.Line(geo, rungMat));
    }

    // Regular nodes — small red emissive
    const makeNodeMat = (brightness) => new THREE.ShaderMaterial({
        vertexShader: nodeVert,
        fragmentShader: nodeFrag,
        uniforms: {
            uTime: { value: 0 },
            uPulse: { value: 0 },
            uColor: { value: new THREE.Color(0xff2244) },
            uBrightness: { value: brightness },
        },
    });

    const nodeGeo = new THREE.SphereGeometry(0.1, 16, 16);
    const targetGeo = new THREE.SphereGeometry(0.22, 20, 20);  // 2 hero nodes

    const nodeMats = [];

    for (let i = 0; i <= segments; i += 14) {
        const mA = makeNodeMat(3.5); // Brighter
        const mB = makeNodeMat(3.5);
        nodeMats.push(mA, mB);
        const nA = new THREE.Mesh(nodeGeo, mA);
        const nB = new THREE.Mesh(nodeGeo, mB);
        nA.position.copy(pts1[i]);
        nB.position.copy(pts2[i]);
        strandA.add(nA);
        strandB.add(nB);
    }

    // Two hero "target found" nodes — larger, much brighter, will corona hard
    const heroA = new THREE.Mesh(targetGeo, makeNodeMat(8.0));
    const heroB = new THREE.Mesh(targetGeo, makeNodeMat(8.0));
    heroA.position.copy(pts1[Math.floor(segments * 0.32)]);
    heroB.position.copy(pts2[Math.floor(segments * 0.67)]);
    nodeMats.push(heroA.material, heroB.material);
    strandA.add(heroA);
    strandB.add(heroB);

    // Small point lights AT the hero nodes — actual light cast into scene
    const lightA = new THREE.PointLight(0xff1133, 3.0, 8);
    lightA.position.copy(pts1[Math.floor(segments * 0.32)]);
    const lightB = new THREE.PointLight(0xff1133, 3.0, 8);
    lightB.position.copy(pts2[Math.floor(segments * 0.67)]);
    helixGroup.add(lightA, lightB);

    helixGroup.userData.nodeMats = nodeMats;

    helixGroup.add(strandA, strandB);
    helixGroup.position.set(3, 0, -4);

    scene.add(helixGroup);
    return helixGroup;
}

export function setHelixSeparation(amount) {
    targetSeparation = amount;
}

export function updateHelix(time) {
    if (!helixGroup) return;

    currentSeparation += (targetSeparation - currentSeparation) * 0.035;
    if (strandA) strandA.position.x = -currentSeparation * 0.7;
    if (strandB) strandB.position.x = currentSeparation * 0.7;

    // Continuous rotation
    helixGroup.rotation.y = time * 0.15;

    // Update glass shader time (shimmer animation)
    if (helixGroup.userData.glassMats) {
        helixGroup.userData.glassMats.forEach(m => { m.uniforms.uTime.value = time; });
    }

    // Pulse nodes — offset phase so they breathe, not flash
    const pulse = Math.sin(time * 1.5) * 0.5 + 0.5;
    if (helixGroup.userData.nodeMats) {
        helixGroup.userData.nodeMats.forEach((m, i) => {
            m.uniforms.uTime.value = time;
            m.uniforms.uPulse.value = Math.sin(time * 1.5 + i * 0.4) * 0.5 + 0.5;
        });
    }
}

export function getHelixGroup() { return helixGroup; }