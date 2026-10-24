'use strict';

(() => {
    // Spotlight: Mausposition als CSS-Variablen (Gradient liegt in src/input.css)
    document.querySelectorAll('.spotlight-card').forEach(card => {
        card.addEventListener('mousemove', e => {
            const r = card.getBoundingClientRect();
            card.style.setProperty('--x', (e.clientX - r.left) + 'px');
            card.style.setProperty('--y', (e.clientY - r.top) + 'px');
        });
    });

    // Partikel-Hintergrund (pausiert bei verstecktem Tab, statisch bei reduzierter Bewegung)
    const canvas = document.getElementById('particles-canvas');
    const ctx = canvas.getContext('2d');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const particles = [];
    let raf = 0;

    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 1.5 + 0.5;
            this.speedX = (Math.random() - 0.5) * 0.3;
            this.speedY = (Math.random() - 0.5) * 0.3;
            this.opacity = Math.random() * 0.4 + 0.1;
        }
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            if (this.x < 0) { this.x = 0; this.speedX = Math.abs(this.speedX); }
            else if (this.x > canvas.width) { this.x = canvas.width; this.speedX = -Math.abs(this.speedX); }
            if (this.y < 0) { this.y = 0; this.speedY = Math.abs(this.speedY); }
            else if (this.y > canvas.height) { this.y = canvas.height; this.speedY = -Math.abs(this.speedY); }
        }
        draw() {
            ctx.fillStyle = `rgba(197, 155, 39, ${this.opacity})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawFrame() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => p.draw());
    }

    function tick() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.update();
            p.draw();
        });
        raf = requestAnimationFrame(tick);
    }

    function start() {
        if (!raf && !document.hidden && !reduceMotion.matches) raf = requestAnimationFrame(tick);
    }

    function stop() {
        cancelAnimationFrame(raf);
        raf = 0;
    }

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        particles.forEach(p => {
            p.x = Math.min(p.x, canvas.width);
            p.y = Math.min(p.y, canvas.height);
        });
        if (reduceMotion.matches) drawFrame();
    }

    window.addEventListener('resize', resizeCanvas);
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    const onMotionChange = () => {
        if (reduceMotion.matches) {
            stop();
            drawFrame();
        } else {
            start();
        }
    };
    if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', onMotionChange);
    else if (reduceMotion.addListener) reduceMotion.addListener(onMotionChange);

    resizeCanvas();
    for (let i = 0; i < 40; i++) {
        particles.push(new Particle());
    }
    if (reduceMotion.matches) drawFrame();
    else start();
})();
