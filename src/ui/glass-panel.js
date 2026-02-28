// glass-panel.js — Animates the inline Differentiable Compiler panel.
// Panel is no longer position:fixed — it lives inside the approach section.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initGlassPanel() {
    const panel = document.getElementById('machine-panel');
    if (!panel) return;

    gsap.set(panel, { opacity: 0, y: 20 });

    ScrollTrigger.create({
        trigger: '#approach',
        start: 'top 55%',
        onEnter: () => {
            gsap.to(panel, {
                opacity: 1,
                y: 0,
                duration: 0.7,
                ease: 'power2.out',
                onComplete: runOptimisation,
            });
        },
        onLeaveBack: () => {
            gsap.to(panel, { opacity: 0, y: 20, duration: 0.3 });
        },
    });
}

function runOptimisation() {
    const barsA = document.getElementById('bars-a');
    const barsB = document.getElementById('bars-b');
    if (!barsA || !barsB) return;

    // Reset and rebuild bars each time
    barsA.innerHTML = '';
    barsB.innerHTML = '';

    for (let i = 0; i < 15; i++) {
        const barA = document.createElement('div');
        barA.className = 'bar';
        barA.style.height = `${Math.random() * 70 + 10}%`;
        barsA.appendChild(barA);

        const barB = document.createElement('div');
        barB.className = 'bar';
        barB.style.height = `${Math.random() * 70 + 10}%`;
        barsB.appendChild(barB);
    }

    // Flatten → spike the winner
    gsap.to('.bar', {
        height: '8%',
        stagger: { amount: 0.7, from: 'edges' },
        duration: 1.2,
        ease: 'power1.inOut',
    });

    if (barsA.children[7]) {
        gsap.to(barsA.children[7], {
            height: '92%',
            background: '#ff4d6d',
            delay: 1.0,
            duration: 0.35,
        });
    }

    if (barsB.children[3]) {
        gsap.to(barsB.children[3], {
            height: '92%',
            background: '#74b3ff',
            delay: 1.0,
            duration: 0.35,
        });
    }

    // Loss curve descends
    const lossLine = document.getElementById('loss-line');
    if (lossLine) {
        gsap.to(lossLine, {
            attr: { d: 'M0,8 Q25,42 50,44 T100,44' },
            duration: 2.2,
            ease: 'power3.out',
        });
    }

    // Temperature cools
    const tempFill = document.getElementById('temp-fill');
    if (tempFill) {
        gsap.to(tempFill, {
            scaleX: 0.04,
            duration: 2.2,
            ease: 'power2.out',
        });
    }
}
