import { scrollToSection, getLenis } from '../core/scroll.js';

export function initSectionNav() {
    const sections = ['hero', 'clinical', 'cart', 'data', 'engine', 'results', 'safety', 'validation'];

    // Create UI container
    const nav = document.createElement('div');
    nav.className = 'section-nav-container';
    nav.innerHTML = `
        <button class="section-nav-btn up" aria-label="Previous section">
            <svg viewBox="0 0 24 24"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>
        </button>
        <button class="section-nav-btn down" aria-label="Next section">
            <svg viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>
        </button>
    `;
    document.body.appendChild(nav);

    const btnUp = nav.querySelector('.up');
    const btnDown = nav.querySelector('.down');

    let currentSectionIndex = 0;

    const updateButtons = () => {
        // Find current section based on scroll position
        const scrollY = window.scrollY + window.innerHeight / 2;

        let foundIndex = 0;
        sections.forEach((id, index) => {
            const el = document.getElementById(id);
            if (el && scrollY >= el.offsetTop) {
                foundIndex = index;
            }
        });

        currentSectionIndex = foundIndex;

        // Visual state
        btnUp.style.opacity = currentSectionIndex === 0 ? '0.3' : '1';
        btnUp.style.pointerEvents = currentSectionIndex === 0 ? 'none' : 'auto';

        btnDown.style.opacity = currentSectionIndex === sections.length - 1 ? '0.3' : '1';
        btnDown.style.pointerEvents = currentSectionIndex === sections.length - 1 ? 'none' : 'auto';
    };

    btnUp.onclick = () => {
        if (currentSectionIndex > 0) {
            scrollToSection(`#${sections[currentSectionIndex - 1]}`);
        }
    };

    btnDown.onclick = () => {
        if (currentSectionIndex < sections.length - 1) {
            scrollToSection(`#${sections[currentSectionIndex + 1]}`);
        }
    };

    // Listen for scroll to update button visibility/state
    const lenis = getLenis();
    if (lenis) {
        lenis.on('scroll', updateButtons);
    } else {
        window.addEventListener('scroll', updateButtons);
    }

    // Initial check
    updateButtons();
}
