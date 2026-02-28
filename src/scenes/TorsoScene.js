import * as THREE from 'three';
import gsap from 'gsap';

export class TorsoScene {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.scene.add(this.group);
        this.create();
    }

    create() {
        // High-tech blueprint look
        const geometry = new THREE.CylinderGeometry(15, 12, 40, 32, 16);
        const edges = new THREE.EdgesGeometry(geometry);
        const material = new THREE.LineBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.15 });
        const torsoMesh = new THREE.LineSegments(edges, material);

        // Glowing dot for lesion
        const lesionGeo = new THREE.SphereGeometry(0.8, 16, 16);
        const lesionMat = new THREE.MeshBasicMaterial({ color: 0xff1053, transparent: true, opacity: 0.9 });
        const lesionMesh = new THREE.Mesh(lesionGeo, lesionMat);
        lesionMesh.position.set(-5, -5, 5);

        // Floating guide rings
        const ringGeo = new THREE.RingGeometry(18, 18.2, 64);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x999999, transparent: true, opacity: 0.2, side: THREE.DoubleSide });
        
        const ring1 = new THREE.Mesh(ringGeo, ringMat);
        ring1.rotation.x = Math.PI / 2;
        ring1.position.y = 10;

        const ring2 = new THREE.Mesh(ringGeo, ringMat);
        ring2.rotation.x = Math.PI / 2;
        ring2.position.y = -10;

        this.group.add(torsoMesh);
        this.group.add(lesionMesh);
        this.group.add(ring1);
        this.group.add(ring2);

        // Animate it gently
        gsap.to(this.group.rotation, { y: Math.PI * 2, duration: 40, repeat: -1, ease: "none" });
    }

    fadeOut() {
        this.group.children.forEach(child => {
            if (child.material) {
                gsap.to(child.material, { opacity: 0, duration: 0.5 });
            }
        });
    }

    fadeIn() {
         this.group.children.forEach(child => {
            if (child.material) {
                const targetOpacity = child instanceof THREE.LineSegments ? 0.15 : (child instanceof THREE.Mesh && child.geometry.type === 'SphereGeometry' ? 0.9 : 0.2);
                gsap.to(child.material, { opacity: targetOpacity, duration: 0.5 });
            }
        });
    }
}
