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

    // Rechtsdialoge (Impressum, Datenschutz): Klick-Delegation, Deep-Links, URL-Bereinigung
    const dialogs = {
        impressum: document.getElementById('dlg-impressum'),
        datenschutz: document.getElementById('dlg-datenschutz')
    };
    const openDialog = name => {
        const d = Object.prototype.hasOwnProperty.call(dialogs, name) ? dialogs[name] : null;
        if (d && !d.open) d.showModal();
    };

    document.addEventListener('click', e => {
        const a = e.target.closest && e.target.closest('a[data-dialog]');
        if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        openDialog(a.dataset.dialog);
    });

    Object.values(dialogs).forEach(d => {
        if (!d) return;
        let downOnBackdrop = false;
        d.addEventListener('pointerdown', e => { downOnBackdrop = e.target === d; });
        d.addEventListener('click', e => { if (e.target === d && downOnBackdrop) d.close(); });
        const closeBtn = d.querySelector('[data-close]');
        if (closeBtn) closeBtn.addEventListener('click', () => d.close());
    });

    // Deep-Link: /impressum, /datenschutz, /#impressum, /#datenschutz (Whitelist, Wert nur Schluessel einer festen Map)
    const deep = /^\/(impressum|datenschutz)$/i.exec(location.pathname.replace(/\/+$/, '')) ||
        /^#(impressum|datenschutz)$/i.exec(location.hash);
    if (deep) openDialog(deep[1].toLowerCase());

    // URL-Bereinigung erst nach load (frueher bricht der Fragment-Scroll von /#contact ab)
    const cleanUrl = () => {
        const p = location.pathname.replace(/\/+$/, '').toLowerCase();
        const known = p === '' || p === '/index.html' || p === '/impressum' || p === '/datenschutz';
        if (known && (location.pathname !== '/' || location.hash || location.search)) history.replaceState(null, '', '/');
    };
    if (document.readyState === 'complete') cleanUrl();
    else window.addEventListener('load', cleanUrl, { once: true });

    // Kontaktformular: Validierung wie sendMail.php, Telefonfilter, JSON-Versand
    const form = document.getElementById('contact-form');
    if (form) {
        // Muss mit sendMail.php uebereinstimmen - geprueft von tools/interactcheck.mjs (parity)
        const NAME_RE = /^(?=(?:.*\p{L}){2})[\p{L}\p{M} .'\-]+$/u;
        const EMAIL_RE = /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9](?:[A-Za-z0-9\-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9\-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;
        const PHONE_RE = /^\+?[0-9()\/\- ]+$/;
        const PHONE_MIN_DIGITS = 6;
        const MSG_FAIL = 'Senden fehlgeschlagen – bitte kontaktieren Sie mich per Telefon (+49 172 232 14 82) oder E-Mail (info@ms-bauconsult.de).';
        const MSG_CHECK = 'Bitte prüfen Sie Ihre Eingaben.';

        form.noValidate = true;
        const el = form.elements;
        const status = document.getElementById('form-status');
        const button = form.querySelector('button[type="submit"]');
        const fields = ['name', 'email', 'phone', 'message'].map(k => ({
            key: k,
            input: el[k],
            err: document.getElementById('f-' + k + '-err'),
            touched: false
        }));
        const len = s => Array.from(s).length;

        const setStatus = (state, text) => {
            if (state) status.setAttribute('data-state', state);
            else status.removeAttribute('data-state');
            status.textContent = text;
        };

        const check = (k, v) => {
            const max = el[k].maxLength;
            if (k === 'name') {
                if (!NAME_RE.test(v)) return 'Bitte geben Sie Ihren Namen an (mindestens 2 Buchstaben).';
            } else if (k === 'email') {
                if (v === '') return 'Bitte geben Sie Ihre E-Mail-Adresse an.';
                if (!EMAIL_RE.test(v)) return 'Bitte geben Sie eine gültige E-Mail-Adresse an.';
            } else if (k === 'phone') {
                const digits = (v.match(/[0-9]/g) || []).length;
                if (v !== '' && (!PHONE_RE.test(v) || digits < PHONE_MIN_DIGITS || len(v) > 30)) {
                    return 'Bitte geben Sie eine gültige Telefonnummer an (nur Ziffern).';
                }
            } else if (v === '') {
                return 'Bitte geben Sie Ihre Nachricht ein.';
            }
            if (max > 0 && len(v) > max) return 'Der Text ist zu lang (höchstens ' + max + ' Zeichen).';
            return '';
        };

        const validateField = f => {
            const msg = check(f.key, f.input.value.trim());
            f.input.setAttribute('aria-invalid', msg ? 'true' : 'false');
            f.err.textContent = msg;
            f.err.hidden = !msg;
            return !msg;
        };

        const validate = () => {
            let first = null;
            fields.forEach(f => {
                f.touched = true;
                if (!validateField(f) && !first) first = f.input;
            });
            return first;
        };

        fields.forEach(f => {
            const again = () => { if (f.touched) validateField(f); };
            f.input.addEventListener('input', again);
            f.input.addEventListener('blur', again);
        });

        // Telefon: nur Ziffern, Leerzeichen, ( ) / -, fuehrendes + - alles andere verschwindet sofort
        const phone = el.phone;
        phone.addEventListener('input', () => {
            const old = phone.value;
            const caret = phone.selectionStart;
            const clean = (s, plusOk) => s.replace(/[^0-9 ()\/\-+]/g, '').replace(/\+/g, (m, i) => (plusOk && i === 0 ? m : ''));
            const next = clean(old, true);
            if (next === old) return;
            const before = clean(old.slice(0, caret === null ? old.length : caret), true);
            const pos = Math.min(before.length, next.length);
            phone.value = next;
            phone.setSelectionRange(pos, pos);
        });

        form.addEventListener('submit', async e => {
            e.preventDefault();
            if (button.disabled) return;
            const bad = validate();
            if (bad) {
                setStatus('error', MSG_CHECK);
                bad.focus();
                return;
            }
            const label = button.textContent;
            button.disabled = true;
            button.textContent = 'Wird gesendet…';
            form.setAttribute('aria-busy', 'true');
            setStatus('busy', 'Ihre Nachricht wird gesendet …');
            try {
                // Zeitfalle: Server verwirft Anfragen mit t < 3000 ms still
                await new Promise(r => setTimeout(r, Math.max(0, 3200 - performance.now())));
                const body = JSON.stringify({
                    name: el.name.value.trim(),
                    email: el.email.value.trim(),
                    phone: el.phone.value.trim(),
                    message: el.message.value.trim(),
                    hp_website: el.hp_website.value,
                    t: Math.round(performance.now())
                });
                const res = await fetch('/sendMail.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body,
                    signal: AbortSignal.timeout(15000)
                });
                const data = await res.json().catch(() => null);
                if (res.ok && data && data.success) {
                    form.reset();
                    fields.forEach(f => {
                        f.touched = false;
                        f.input.setAttribute('aria-invalid', 'false');
                        f.err.textContent = '';
                        f.err.hidden = true;
                    });
                    setStatus('success', 'Vielen Dank! Ihre Nachricht wurde gesendet. Ich melde mich in Kürze bei Ihnen.');
                } else if (res.status === 429) {
                    setStatus('error', 'Zu viele Anfragen – bitte in einigen Minuten erneut versuchen.');
                } else if (res.status === 400) {
                    setStatus('error', data && typeof data.error === 'string' ? data.error : MSG_CHECK);
                } else {
                    setStatus('error', MSG_FAIL);
                }
            } catch (err) {
                setStatus('error', MSG_FAIL);
            } finally {
                button.disabled = false;
                button.textContent = label;
                form.removeAttribute('aria-busy');
            }
        });
    }
})();
