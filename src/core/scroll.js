// scroll.js — 5-chapter scroll narrative.
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
    hero: 3,    // right
    problem: 4,    // right
    approach: -5,    // far left
    platform: 5,    // far right
    vision: -5,    // far left
};

// Camera positions — subtle cinematic movement (zoom, height)
const CAM = {
    hero: { x: 0, y: 2, z: 13 },
    problem: { x: 0, y: 3, z: 11 },
    approach: { x: 0, y: 3.5, z: 9 },
    platform: { x: 0, y: 4, z: 13 },
    vision: { x: 0, y: 3, z: 11 },
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
    tl.to({}, { duration: 0.5 });

    // Hero → Problem
    tl.to(camera.position,
        { ...CAM.problem, duration: 1, ease: 'power2.inOut' }
    );
    tl.to(helix.position,
        { x: HELIX_X.problem, duration: 1, ease: 'power2.inOut' },
        '<'
    );

    // Problem → Approach
    tl.to(camera.position,
        { ...CAM.approach, duration: 1, ease: 'power2.inOut' }
    );
    tl.to(helix.position,
        { x: HELIX_X.approach, duration: 1, ease: 'power2.inOut' },
        '<'
    );

    // Approach → Platform
    tl.to(camera.position,
        { ...CAM.platform, duration: 1, ease: 'power2.inOut' }
    );
    tl.to(helix.position,
        { x: HELIX_X.platform, duration: 1, ease: 'power2.inOut' },
        '<'
    );

    // Platform → Vision
    tl.to(camera.position,
        { ...CAM.vision, duration: 1, ease: 'power2.inOut' }
    );
    tl.to(helix.position,
        { x: HELIX_X.vision, duration: 1, ease: 'power2.inOut' },
        '<'
    );

    // Helix strand separation — triggers on approach section
    ScrollTrigger.create({
        trigger: '#approach',
        start: 'top 50%',
        end: 'bottom 50%',
        onEnter: () => setHelixSeparation(1),
        onLeaveBack: () => setHelixSeparation(0),
        onLeave: () => setHelixSeparation(0),
    });

    // Math & Biological Markers Showcase
    // Section 1: Hero -> No markers
    ScrollTrigger.create({
        trigger: '#hero',
        start: 'top 50%',
        onEnter: () => hideMarkers(),
        onEnterBack: () => hideMarkers(),
    });

    // Section 2: Problem -> Gene labels
    ScrollTrigger.create({
        trigger: '#problem',
        start: 'top 50%',
        onEnter: () => { switchMarkerDataset('genes'); showMarkers(); },
        onEnterBack: () => { switchMarkerDataset('genes'); showMarkers(); },
    });

    // Section 3: Approach -> Optimization Math
    ScrollTrigger.create({
        trigger: '#approach',
        start: 'top 50%',
        onEnter: () => { switchMarkerDataset('math'); showMarkers(); },
        onEnterBack: () => { switchMarkerDataset('math'); showMarkers(); },
    });

    // Section 4: Platform -> Kinetics Math
    ScrollTrigger.create({
        trigger: '#platform',
        start: 'top 50%',
        onEnter: () => { switchMarkerDataset('kinetics'); showMarkers(); },
        onEnterBack: () => { switchMarkerDataset('kinetics'); showMarkers(); },
    });

    // Section 5: Vision -> Clinical Safety
    ScrollTrigger.create({
        trigger: '#vision',
        start: 'top 50%',
        onEnter: () => { switchMarkerDataset('safety'); showMarkers(); },
        onEnterBack: () => { switchMarkerDataset('safety'); showMarkers(); },
    });

    // Sound triggers
    ScrollTrigger.create({
        trigger: '#problem',
        start: 'top 60%',
        onEnter: () => { if (soundManager?.initialized) soundManager.playPing(); },
    });
    ScrollTrigger.create({
        trigger: '#approach',
        start: 'top 60%',
        onEnter: () => { if (soundManager?.initialized) soundManager.playTensionBuild(); },
        onLeaveBack: () => { soundManager?.stopTension(); },
    });
    ScrollTrigger.create({
        trigger: '#platform',
        start: 'top 60%',
        onEnter: () => { if (soundManager?.initialized) soundManager.playResolvedAmbient(); },
    });
}

function setupSectionReveals() {
    gsap.utils.toArray('.content-section').forEach(section => {
        gsap.fromTo(section,
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
