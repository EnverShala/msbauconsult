"""Dev-only: erzeugt alle Bilder aus tools/assets-src (Portrait, OG, dena-Badge) und optional das Hero-Foto.
Aufruf im Projektstamm: python -I tools/build-images.py"""
import os
import urllib.request
from urllib.parse import urlparse
from PIL import Image

OUT = "assets/img"
os.makedirs(OUT, exist_ok=True)
os.makedirs(OUT + "/hero", exist_ok=True)
written = []


def save(im, path, **kw):
    im.save(path, **kw)
    written.append((path, os.path.getsize(path), im.size))


# 1. Portrait
src = Image.open("tools/assets-src/muhamedshala.jpg").convert("RGB")
for w in (480, 800, 1132):
    im = src if w == src.width else src.resize((w, round(src.height * w / src.width)), Image.LANCZOS)
    save(im, f"{OUT}/portrait-{w}.avif", quality=55, speed=4)
    save(im, f"{OUT}/portrait-{w}.webp", quality=78, method=6)
    if w == 800:
        save(im, f"{OUT}/portrait-800.jpg", quality=80, optimize=True, progressive=True)

# 2. Open Graph
og = src.crop((0, 10, 1132, 604)).resize((1200, 630), Image.LANCZOS)
save(og, f"{OUT}/og.jpg", quality=80, optimize=True, progressive=True)

# 3. dena-Badge
badge = Image.open("tools/assets-src/eee-300x73.png").convert("RGB")
badge = badge.quantize(32, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
save(badge, f"{OUT}/eee.png", optimize=True)

# 4. Hero-Foto (optional): Pexels 8837511, Pexels License
HERO_URL = "https://images.pexels.com/photos/8837511/pexels-photo-8837511.jpeg?auto=compress&cs=tinysrgb&w=1600"
HERO_SRC = "tools/out/hero-src/pexels-8837511.jpeg"
MARKER = ".planning/phases/02-inhalte-neue-sektionen/HERO-VARIANT-OMITTED"


def hero():
    if not os.path.exists(HERO_SRC):
        os.makedirs(os.path.dirname(HERO_SRC), exist_ok=True)
        req = urllib.request.Request(HERO_URL, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=30) as r:
            if urlparse(r.geturl()).hostname != "images.pexels.com":
                raise ValueError("unexpected host " + str(urlparse(r.geturl()).hostname))
            if not r.headers.get("Content-Type", "").startswith("image/jpeg"):
                raise ValueError("unexpected content type " + str(r.headers.get("Content-Type")))
            data = r.read(5 * 1024 * 1024 + 1)
        if len(data) >= 5 * 1024 * 1024:
            raise ValueError("body too large")
        with open(HERO_SRC, "wb") as f:
            f.write(data)
    im = Image.open(HERO_SRC).convert("RGB")
    if im.width < 1500:
        raise ValueError(f"width too small: {im.width}")
    big = im if im.width == 1600 else im.resize((1600, round(im.height * 1600 / im.width)), Image.LANCZOS)
    small = big.resize((960, round(big.height * 960 / big.width)), Image.LANCZOS)
    for w, i in ((1600, big), (960, small)):
        save(i, f"{OUT}/hero/hero-{w}.avif", quality=35, speed=4)
        save(i, f"{OUT}/hero/hero-{w}.webp", quality=55, method=6)


try:
    hero()
    if os.path.exists(MARKER):
        os.remove(MARKER)
except Exception as e:  # Hero ist optional
    print(f"HERO SKIPPED: {e}")
    with open(MARKER, "w", encoding="utf-8") as f:
        f.write(f"Hero-Variante ausgelassen: {e}\n")

for p, b, s in written:
    print(f"{p} {b} bytes {s[0]}x{s[1]}")
