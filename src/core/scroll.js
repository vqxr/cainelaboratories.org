// scroll.js — 5-chapter scroll narrative.
// ONE transformation per chapter. Camera OR scene, never both.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { setHelixSeparation } from '../world/helix.js';
import { soundManager } from '../sound.js';

gsap.registerPlugin(ScrollTrigger);

// Chapter camera positions
// Each is a resting place the camera arrives at before text appears
const CHAPTERS = {
    hero: {
        pos: { x: 0, y: 3, z: 14 },
        rot: { x: 0, y: 0 },
    },
    problem: {
        pos: { x: 4, y: 5, z: 10 },
        rot: { x: -0.08, y: 0.12 },
    },
    approach: {
        pos: { x: -5, y: 4, z: 8 },
        rot: { x: -0.05, y: -0.18 },
    },
    platform: {
        pos: { x: 0, y: 5, z: 16 },
        rot: { x: -0.1, y: 0 },
    },
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
    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: '.main-content',
            start: 'top top',
            end: 'bottom bottom',
            scrub: 1.8,   // slightly slower scrub = more cinematic
        },
    });

    // Chapter 0: Hero Hold — Camera stays still for the first 0.5 units of timeline
    tl.to({}, { duration: 0.5 }); // Dummy hold

    // Chapter 1 → 2: Problem — ONLY camera moves
    tl.to(camera.position,
        { ...CHAPTERS.problem.pos, duration: 1, ease: 'power2.inOut' }
    );
    tl.to(camera.rotation,
        { ...CHAPTERS.problem.rot, duration: 1, ease: 'power2.inOut' },
        '<' // Start at the same time as the position move
    );

    // Chapter 2 → 3: Approach
    tl.to(camera.position,
        { ...CHAPTERS.approach.pos, duration: 1, ease: 'power2.inOut' }
    );
    tl.to(camera.rotation,
        { ...CHAPTERS.approach.rot, duration: 1, ease: 'power2.inOut' },
        '<'
    );

    // Chapter 3 → 4: Platform — camera pulls back
    tl.to(camera.position,
        { ...CHAPTERS.platform.pos, duration: 1, ease: 'power2.inOut' }
    );
    tl.to(camera.rotation,
        { ...CHAPTERS.platform.rot, duration: 1, ease: 'power2.inOut' },
        '<'
    );

    // Helix strand separation — triggers on approach section entry
    // This is the scene change for chapter 3 (camera has already moved)
    ScrollTrigger.create({
        trigger: '#approach',
        start: 'top 50%',
        end: 'bottom 50%',
        onEnter: () => setHelixSeparation(1),
        onLeaveBack: () => setHelixSeparation(0),
        onLeave: () => setHelixSeparation(0),
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
