// =============================================
// FILE: js/explosion.js (fine control)
// =============================================
// additional explosion effects & hut reveal
(function() {
    // hut card fade-in after explosion
    const hutSection = document.getElementById('hut-section');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && window.CAINELAB.explosionTriggered) {
                gsap.to('.hut-card', {
                    opacity: 1,
                    y: 0,
                    duration: 1,
                    ease: "power2.out"
                });
            }
        });
    }, { threshold: 0.3 });

    observer.observe(hutSection);

    // initial card hidden
    gsap.set('.hut-card', { opacity: 0, y: 30 });

    // also when explosion triggers, show powder piles more
    document.addEventListener('caine-explode', () => {
        gsap.to('.powder-pile', {
            scale: 1.5,
            duration: 1,
            yoyo: true,
            repeat: 1
        });
    });
})();
