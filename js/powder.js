// =============================================
// FILE: js/powder.js (2D canvas overlay powder)
// =============================================
(function() {
    const canvas = document.getElementById('powder-canvas');
    const ctx = canvas.getContext('2d');
    let width, height;
    let particles = [];

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
    }
    window.addEventListener('resize', resize);
    resize();

    // particle class for 2d powder
    class PowderParticle {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * 0.2;
            this.vy = Math.random() * 0.1 + 0.05;
            this.radius = Math.random() * 3 + 1;
            this.opacity = Math.random() * 0.5 + 0.3;
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;
            if (this.y > height + 10) {
                this.y = -10;
                this.x = Math.random() * width;
            }
        }
        draw(ctx) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2);
            ctx.fillStyle = `rgba(255, 255, 240, ${this.opacity})`;
            ctx.fill();
            // subtle glow
            ctx.shadowColor = 'rgba(255, 255, 200, 0.6)';
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    // init particles
    for (let i = 0; i < 150; i++) {
        particles.push(new PowderParticle());
    }

    // listen for explosion event
    let active = false;
    document.addEventListener('caine-explode', () => {
        active = true;
        // add burst of particles
        for (let i = 0; i < 50; i++) {
            let p = new PowderParticle();
            p.x = width/2 + (Math.random()-0.5)*200;
            p.y = height/2 + (Math.random()-0.5)*200;
            p.vx = (Math.random()-0.5)*1.5;
            p.vy = (Math.random()-0.5)*1.5 - 0.5;
            particles.push(p);
        }
        setTimeout(() => { active = false; }, 8000);
    });

    function animate() {
        if (!active) {
            // idle few particles
            for (let p of particles.slice(0,30)) p.update();
        } else {
            for (let p of particles) p.update();
        }
        ctx.clearRect(0, 0, width, height);
        for (let p of particles) p.draw(ctx);
        requestAnimationFrame(animate);
    }
    animate();
})();
