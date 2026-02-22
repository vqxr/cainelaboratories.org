// =============================================
// FILE: js/hut.js (interior details)
// =============================================
// Adds vintage mouse trails and old paper effect
(function() {
    // create old paper texture overlay
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.pointerEvents = 'none';
    overlay.style.background = 'radial-gradient(circle at 20% 30%, rgba(200,180,130,0.02), transparent 70%)';
    overlay.style.zIndex = '999';
    document.body.appendChild(overlay);

    // vintage cursor follower (old explorer's loupe)
    const follower = document.createElement('div');
    follower.style.position = 'fixed';
    follower.style.width = '60px';
    follower.style.height = '60px';
    follower.style.border = '2px solid rgba(200,170,120,0.2)';
    follower.style.borderRadius = '50%';
    follower.style.pointerEvents = 'none';
    follower.style.zIndex = '1000';
    follower.style.transform = 'translate(-50%,-50%)';
    follower.style.backdropFilter = 'invert(0.05) sepia(0.3)';
    document.body.appendChild(follower);

    document.addEventListener('mousemove', (e) => {
        follower.style.left = e.clientX + 'px';
        follower.style.top = e.clientY + 'px';
    });

    // hut section gets extra grain
    const hut = document.getElementById('hut-section');
    const grain = document.createElement('div');
    grain.style.position = 'absolute';
    grain.style.inset = '0';
    grain.style.backgroundImage = 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.02\' numOctaves=\'3\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.08\'/%3E%3C/svg%3E")';
    grain.style.opacity = '0.1';
    grain.style.pointerEvents = 'none';
    hut.appendChild(grain);
})();
