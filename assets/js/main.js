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

    // Rechner
    const areaInput = document.getElementById('area-input');
    const floorsInput = document.getElementById('floors-input');
    const typeInput = document.getElementById('type-input');

    function updateCalc() {
        const area = parseInt(areaInput.value);
        const floors = parseInt(floorsInput.value);
        const factor = parseFloat(typeInput.value);

        document.getElementById('area-val').textContent = area.toLocaleString('de-DE') + ' m²';
        document.getElementById('floors-val').textContent = floors + ' Etagen';

        const baseVol = (area * floors * 210) * factor;
        const hours = Math.round((area / 55 + floors * 14) * factor);

        document.getElementById('vol-calc').textContent = '€ ' + (baseVol / 1000000).toFixed(1) + 'M';
        document.getElementById('hours-calc').textContent = hours + 'h';

        const scoreElem = document.getElementById('result-score');
        if (factor > 1.5 || floors > 35) {
            scoreElem.textContent = 'CLASS S (EXOTIC)';
        } else if (factor > 1.2 || floors > 18) {
            scoreElem.textContent = 'CLASS A+';
        } else {
            scoreElem.textContent = 'CLASS A';
        }
    }

    [areaInput, floorsInput, typeInput].forEach(el => el.addEventListener('input', updateCalc));

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
