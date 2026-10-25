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

    // Hero-Hintergrund: Netz aus Gold-Knoten mit Verbindungslinien, Knoten weichen der Maus aus.
    // Läuft nur, solange der Hero sichtbar und der Tab aktiv ist; bei reduzierter Bewegung ein statisches Bild.
    const hero = document.getElementById('top');
    const canvas = document.getElementById('hero-canvas');
    const ctx = canvas.getContext('2d');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const LINK = 160, REPEL = 150;
    const nodes = [];
    const mouse = { x: -1e4, y: -1e4 };
    let w = 0, h = 0, raf = 0, inView = true;

    function resizeCanvas() {
        const r = canvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        w = r.width;
        h = r.height;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const count = Math.round(Math.min(45, Math.max(w < 640 ? 10 : 16, (w * h) / (w < 640 ? 36000 : 28800))));
        while (nodes.length < count) {
            nodes.push({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.4,
                r: Math.random() * 2 + 1.5
            });
        }
        nodes.length = count;
        nodes.forEach(n => { n.x = Math.min(n.x, w); n.y = Math.min(n.y, h); });
        if (reduceMotion.matches) draw(false);
    }

    function draw(move) {
        ctx.clearRect(0, 0, w, h);
        for (let i = 0; i < nodes.length; i++) {
            const n = nodes[i];
            if (move) {
                n.x += n.vx;
                n.y += n.vy;
                if (n.x < 0 || n.x > w) n.vx *= -1;
                if (n.y < 0 || n.y > h) n.vy *= -1;
                const dx = mouse.x - n.x, dy = mouse.y - n.y;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d < REPEL && d > 0) {
                    n.x -= (dx / d) * 0.8;
                    n.y -= (dy / d) * 0.8;
                }
            }
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
            ctx.fillStyle = '#C59B27';
            ctx.fill();
            for (let j = i + 1; j < nodes.length; j++) {
                const m = nodes[j];
                const d = Math.sqrt((n.x - m.x) ** 2 + (n.y - m.y) ** 2);
                if (d < LINK) {
                    ctx.beginPath();
                    ctx.moveTo(n.x, n.y);
                    ctx.lineTo(m.x, m.y);
                    ctx.strokeStyle = `rgba(197, 155, 39, ${1 - d / LINK})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
    }

    function tick() {
        draw(true);
        raf = requestAnimationFrame(tick);
    }

    function start() {
        if (!raf && inView && !document.hidden && !reduceMotion.matches) raf = requestAnimationFrame(tick);
    }

    function stop() {
        cancelAnimationFrame(raf);
        raf = 0;
    }

    hero.addEventListener('pointermove', e => {
        const r = canvas.getBoundingClientRect();
        mouse.x = e.clientX - r.left;
        mouse.y = e.clientY - r.top;
    }, { passive: true });
    hero.addEventListener('pointerleave', () => { mouse.x = mouse.y = -1e4; });
    window.addEventListener('resize', resizeCanvas);
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(([e]) => {
            inView = e.isIntersecting;
            inView ? start() : stop();
        }).observe(hero);
    }
    const onMotionChange = () => {
        if (reduceMotion.matches) {
            stop();
            draw(false);
        } else {
            start();
        }
    };
    if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', onMotionChange);
    else if (reduceMotion.addListener) reduceMotion.addListener(onMotionChange);

    // Setup im ersten Frame: vermeidet erzwungenen Reflow im Script-Task, schont TBT
    requestAnimationFrame(() => {
        resizeCanvas();
        if (reduceMotion.matches) draw(false);
        else start();
    });

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

    // Mobiles Menue (Disclosure, nicht modal)
    const menuToggle = document.getElementById('menu-toggle');
    const menuPanel = document.getElementById('mobile-menu');
    const closeMenu = ({ focusToggle = false } = {}) => {
        if (!menuToggle || !menuPanel) return;
        menuToggle.setAttribute('aria-expanded', 'false');
        menuPanel.hidden = true;
        if (focusToggle) menuToggle.focus();
    };
    if (menuToggle && menuPanel) {
        menuToggle.addEventListener('click', () => {
            const open = menuToggle.getAttribute('aria-expanded') !== 'true';
            menuToggle.setAttribute('aria-expanded', String(open));
            menuPanel.hidden = !open;
        });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && !menuPanel.hidden) closeMenu({ focusToggle: true });
        });
        const desktop = window.matchMedia('(min-width: 1024px)');
        const onDesktop = () => { if (desktop.matches) closeMenu(); };
        if (desktop.addEventListener) desktop.addEventListener('change', onDesktop);
        else if (desktop.addListener) desktop.addListener(onDesktop);
    }

    // Anker ohne Hash in der Adressleiste (Ziel scrollen und fokussieren)
    document.addEventListener('click', e => {
        const a = e.target.closest && e.target.closest('a[href^="#"]');
        if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const id = decodeURIComponent(a.getAttribute('href').slice(1));
        const target = id ? document.getElementById(id) : null;
        if (!target) return;
        e.preventDefault();
        closeMenu();
        target.scrollIntoView();
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
    });

    // Waermepumpen-Check: heizreport erst nach Klick laden (keine Speicherung der Einwilligung)
    const wpLoad = document.getElementById('wp-load');
    const wpHost = document.getElementById('wp-check');
    const wpConsent = document.getElementById('wp-consent');
    const wpError = document.getElementById('wp-error');
    const wpStatus = document.getElementById('wp-status');
    if (wpLoad && wpHost && wpConsent && wpError && wpStatus) {
        let wpBusy = false;
        wpLoad.addEventListener('click', () => {
            if (wpBusy) return;
            wpBusy = true;
            wpLoad.disabled = true;
            const box = document.createElement('div');
            box.id = 'wp_check_script';
            box.className = 'heizreport';
            box.dataset.heizreportAnsprache = 'sie';
            box.dataset.primaryColor = '#85650F';
            box.dataset.heizreportUser = 'info@ms-bauconsult.de';
            box.tabIndex = -1;
            wpHost.appendChild(box);
            wpConsent.hidden = true;
            wpError.hidden = true;
            // Ladehinweis (aria-live) erhaelt den Fokus, damit er beim Ausblenden des Buttons nicht verloren geht
            wpStatus.textContent = 'Wärmepumpen-Check wird geladen …';
            wpStatus.hidden = false;
            wpStatus.focus({ preventScroll: true });

            // Das Widget registriert DOMContentLoaded, das beim spaeten Laden nie mehr feuert
            const late = [];
            document.addEventListener = function (type, fn, opts) {
                if (type === 'DOMContentLoaded') late.push(fn);
                else EventTarget.prototype.addEventListener.call(document, type, fn, opts);
            };
            // Entfernt die Eigenschaft wieder, sodass wieder EventTarget.prototype.addEventListener gilt
            const restore = () => { delete document.addEventListener; };
            const hideStatus = () => { wpStatus.hidden = true; wpStatus.textContent = ''; };
            const script = document.createElement('script');
            let timer = 0;

            const fail = () => {
                clearTimeout(timer);
                restore();
                script.onload = script.onerror = null;
                script.remove();
                wpHost.replaceChildren();
                hideStatus();
                wpConsent.hidden = false;
                wpLoad.disabled = false;
                wpBusy = false;
                wpError.textContent = 'Der Wärmepumpen-Check konnte nicht geladen werden. Bitte versuchen Sie es später erneut.';
                wpError.hidden = false;
                wpLoad.focus({ preventScroll: true });
            };

            script.src = 'https://heizreport.de/js/heizreport_3.js';
            script.async = true;
            script.onload = () => {
                clearTimeout(timer);
                restore();
                late.forEach(fn => {
                    try {
                        const ev = new Event('DOMContentLoaded');
                        if (typeof fn === 'function') fn.call(document, ev);
                        else if (fn && typeof fn.handleEvent === 'function') fn.handleEvent(ev);
                    } catch (err) { console.error('[wpcheck]', err); }
                });
                hideStatus();
                box.focus({ preventScroll: true });
            };
            script.onerror = fail;
            // Haengt die Verbindung ohne load/error, nach 15 s wie bei einem Fehler aufraeumen
            timer = setTimeout(fail, 15000);
            document.body.appendChild(script);
        });
    }

    // Kontaktformular: Validierung wie sendMail.php, Telefonfilter, JSON-Versand
    const form = document.getElementById('contact-form');
    if (form) {
        // Muss mit sendMail.php uebereinstimmen - geprueft von tools/interactcheck.mjs (parity)
        const NAME_RE = /^(?=(?:.*\p{L}){2})[\p{L}\p{M} .'’\-]+$/u;
        const EMAIL_RE = /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9](?:[A-Za-z0-9\-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9\-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;
        const PHONE_RE = /^\+?[0-9()\/\- ]+$/;
        const PHONE_MIN_DIGITS = 6;
        const MSG_NAME = 'Bitte geben Sie Ihren Namen an (mindestens 2 Buchstaben; erlaubt sind Buchstaben, Leerzeichen, Punkt, Bindestrich und Apostroph).';
        const MSG_FAIL ='Senden fehlgeschlagen – bitte kontaktieren Sie mich per Telefon (+49 172 232 14 82) oder E-Mail (info@ms-bauconsult.de).';
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

        // Regex plus die zusaetzlichen Pruefungen von PHPs filter_var (sendMail.php): kein Punkt am
        // Anfang/Ende des lokalen Teils, keine doppelten Punkte, lokaler Teil <= 64, gesamt <= 254 Zeichen
        const emailOk = v => {
            if (!EMAIL_RE.test(v) || v.length > 254) return false;
            const local = v.slice(0, v.lastIndexOf('@'));
            return local.length <= 64 && local[0] !== '.' && local[local.length - 1] !== '.' && local.indexOf('..') === -1;
        };

        const setStatus = (state, text) => {
            if (state) status.setAttribute('data-state', state);
            else status.removeAttribute('data-state');
            status.textContent = text;
        };

        const check = (k, v) => {
            const max = el[k].maxLength;
            if (k === 'name') {
                if (!NAME_RE.test(v)) return MSG_NAME;
            } else if (k === 'email') {
                if (v === '') return 'Bitte geben Sie Ihre E-Mail-Adresse an.';
                if (!emailOk(v)) return 'Bitte geben Sie eine gültige E-Mail-Adresse an.';
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
            let abortTimer = 0;
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
                // AbortSignal.timeout fehlt in aelteren Browsern (Safari < 16, Chrome < 103)
                let signal;
                if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
                    signal = AbortSignal.timeout(15000);
                } else if (typeof AbortController !== 'undefined') {
                    const ctrl = new AbortController();
                    abortTimer = setTimeout(() => ctrl.abort(), 15000);
                    signal = ctrl.signal;
                }
                const res = await fetch('/sendMail.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body,
                    signal
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
                clearTimeout(abortTimer);
                button.disabled = false;
                button.textContent = label;
                form.removeAttribute('aria-busy');
            }
        });
    }
})();
