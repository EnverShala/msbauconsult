"""Dev-only: laedt das Platzhalter-Portrait (Phase 1) und erzeugt assets/img/portrait.webp.
Wird in Phase 2 durch das Portraet von Muhamed Shala ersetzt."""
import os
import urllib.request
from PIL import Image

URL = "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=1000&auto=format&fit=crop"
os.makedirs("tools/out", exist_ok=True)
os.makedirs("assets/img", exist_ok=True)
src = "tools/out/portrait-src.jpg"
req = urllib.request.Request(URL, headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(req) as r, open(src, "wb") as f:
    f.write(r.read())
im = Image.open(src).convert("RGB").resize((800, 1200), Image.LANCZOS)
im.save("assets/img/portrait.webp", quality=80, method=6)
print(os.path.getsize("assets/img/portrait.webp"), "bytes")
