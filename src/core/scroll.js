// scroll.js — 7-chapter scroll narrative.
// Camera does subtle cinematic movement, helix X-position drives left/right framing.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { setHelixSeparation, getHelixGroup } from '../world/helix.js';
import { showMarkers, hideMarkers, switchMarkerDataset } from '../world/markers.js';
import { soundManager } from '../sound.js';

gsap.registerPlugin(ScrollTrigger);

// Helix X positions — controls which side of the screen the helix appears on
const HELIX_X = {
    hero: -5,       // left — text is right, helix peeks left
    clinical: 5,   // far right — text is left
    cart: -4,      // left — text is right
    data: 5,       // far right — text is left
    engine: -4,    // left — text is right
    results: 5,    // far right — text is left
    safety: -4,    // left — text is right
    vision: 5,     // far right — text is left
};

// Camera positions — subtle cinematic movement (zoom, height)
const CAM = {
    hero: { x: 0, y: 2, z: 10 },
    clinical: { x: 0, y: 3, z: 11 },
    cart: { x: 0, y: 3.5, z: 10 },
    data: { x: 0, y: 3, z: 11 },
    engine: { x: 0, y: 4, z: 9 },
    results: { x: 0, y: 3.5, z: 12 },
    safety: { x: 0, y: 3, z: 10 },
    vision: { x: 0, y: 2.5, z: 11 },
};

export function initScroll(camera) {
    setupLenis();
    setupCameraTimeline(camera);
    setupSectionReveals();
    setupHeroAnimation();
    setupNavbarAutoHide();
}

function setupLenis() {
    const lenis = new Lenis({
        duration: 1.4,
        easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(time => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
}

function setupCameraTimeline(camera) {
    const helix = getHelixGroup();
    if (!helix) return;

    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: '.main-content',
            start: 'top top',
            end: 'bottom bottom',
            scrub: 1.8,
        },
    });

    // Chapter 0: Hero Hold
    tl.to({}, { duration: 0.3 });

    // Hero → Clinical
    tl.to(camera.position,
        { ...CAM.clinical, duration: 1, ease: 'power2.inOut' }
    );
    tl.to(helix.position,
        { x: HELIX_X.clinical, duration: 1, ease: 'power2.inOut' },
        '<'
    );

    // Clinical → CAR-T
    tl.to(camera.position,
        { ...CAM.cart, duration: 1, ease: 'power2.inOut' }
    );
    tl.to(helix.position,
        { x: HELIX_X.cart, duration: 1, ease: 'power2.inOut' },
        '<'
    );

    // CAR-T → Data
    tl.to(camera.position,
        { ...CAM.data, duration: 1, ease: 'power2.inOut' }
    );
    tl.to(helix.position,
        { x: HELIX_X.data, duration: 1, ease: 'power2.inOut' },
        '<'
    );

    // Data → Engine
    tl.to(camera.position,
        { ...CAM.engine, duration: 1, ease: 'power2.inOut' }
    );
    tl.to(helix.position,
        { x: HELIX_X.engine, duration: 1, ease: 'power2.inOut' },
        '<'
    );

    // Engine → Results
    tl.to(camera.position,
        { ...CAM.results, duration: 1, ease: 'power2.inOut' }
    );
    tl.to(helix.position,
        { x: HELIX_X.results, duration: 1, ease: 'power2.inOut' },
        '<'
    );

    // Results → Safety
    tl.to(camera.position,
        { ...CAM.safety, duration: 1, ease: 'power2.inOut' }
    );
    tl.to(helix.position,
        { x: HELIX_X.safety, duration: 1, ease: 'power2.inOut' },
        '<'
    );

    // Safety → Vision
    tl.to(camera.position,
        { ...CAM.vision, duration: 1, ease: 'power2.inOut' }
    );
    tl.to(helix.position,
        { x: HELIX_X.vision, duration: 1, ease: 'power2.inOut' },
        '<'
    );

    // Helix strand separation — triggers on engine section
    ScrollTrigger.create({
        trigger: '#engine',
        start: 'top 50%',
        end: 'bottom 50%',
        onEnter: () => setHelixSeparation(1),
        onLeaveBack: () => setHelixSeparation(0),
        onLeave: () => setHelixSeparation(0),
    });

    // Marker dataset triggers
    ScrollTrigger.create({
        trigger: '#hero',
        start: 'top 50%',
        onEnter: () => hideMarkers(),
        onEnterBack: () => hideMarkers(),
    });

    ScrollTrigger.create({
        trigger: '#clinical',
        start: 'top 50%',
        onEnter: () => { switchMarkerDataset('clinical'); showMarkers(); },
        onEnterBack: () => { switchMarkerDataset('clinical'); showMarkers(); },
    });

    ScrollTrigger.create({
        trigger: '#cart',
        start: 'top 50%',
        onEnter: () => { switchMarkerDataset('genes'); showMarkers(); },
        onEnterBack: () => { switchMarkerDataset('genes'); showMarkers(); },
    });

    ScrollTrigger.create({
        trigger: '#data',
        start: 'top 50%',
        onEnter: () => { switchMarkerDataset('data'); showMarkers(); },
        onEnterBack: () => { switchMarkerDataset('data'); showMarkers(); },
    });

    ScrollTrigger.create({
        trigger: '#engine',
        start: 'top 50%',
        onEnter: () => { switchMarkerDataset('math'); showMarkers(); },
        onEnterBack: () => { switchMarkerDataset('math'); showMarkers(); },
    });

    ScrollTrigger.create({
        trigger: '#results',
        start: 'top 50%',
        onEnter: () => { switchMarkerDataset('results'); showMarkers(); },
        onEnterBack: () => { switchMarkerDataset('results'); showMarkers(); },
    });

    ScrollTrigger.create({
        trigger: '#safety',
        start: 'top 50%',
        onEnter: () => { switchMarkerDataset('safety'); showMarkers(); },
        onEnterBack: () => { switchMarkerDataset('safety'); showMarkers(); },
    });

    ScrollTrigger.create({
        trigger: '#vision',
        start: 'top 50%',
        onEnter: () => { switchMarkerDataset('vision'); showMarkers(); },
        onEnterBack: () => { switchMarkerDataset('vision'); showMarkers(); },
    });

    // Sound triggers
    ScrollTrigger.create({
        trigger: '#clinical',
        start: 'top 60%',
        onEnter: () => { if (soundManager?.initialized) soundManager.playPing(); },
    });
    ScrollTrigger.create({
        trigger: '#engine',
        start: 'top 60%',
        onEnter: () => { if (soundManager?.initialized) soundManager.playTensionBuild(); },
        onLeaveBack: () => { soundManager?.stopTension(); },
    });
    ScrollTrigger.create({
        trigger: '#results',
        start: 'top 60%',
        onEnter: () => { if (soundManager?.initialized) soundManager.playResolvedAmbient(); },
    });
}

function setupSectionReveals() {
    gsap.utils.toArray('.float-section').forEach(section => {
        const textEl = section.querySelector('.float-text');
        if (!textEl) return;

        gsap.fromTo(textEl,
            { opacity: 0, y: 40 },
            {
                opacity: 1,
                y: 0,
                duration: 0.9,
                ease: 'power2.out',
                scrollTrigger: {
                    trigger: section,
                    start: 'top 65%',
                },
            }
        );
    });
}

function setupHeroAnimation() {
    const tl = gsap.timeline({ delay: 0.3 });
    tl.to('.fade-up', {
        opacity: 1,
        y: 0,
        duration: 0.9,
        stagger: 0.15,
        ease: 'power2.out',
    });
}

function setupNavbarAutoHide() {
    let lastY = 0;
    window.addEventListener('scroll', () => {
        const currentY = window.scrollY;
        const navbar = document.querySelector('.navbar');
        if (!navbar) return;
        navbar.style.transform = currentY > lastY && currentY > 100
            ? 'translateY(-100%)'
            : 'translateY(0)';
        lastY = currentY;
    }, { passive: true });
}
