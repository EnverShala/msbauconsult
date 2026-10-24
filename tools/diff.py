"""Pixel diff with tolerance and masks.

Usage: python tools/diff.py <ref.png> <new.png> [--tol 3] [--out <diff.png>]
Masks come from the sibling .json of each image (unioned).
"""
import argparse
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image


def load_masks(png):
    j = Path(png).with_suffix('.json')
    if j.exists():
        return json.loads(j.read_text(encoding='utf-8')).get('masks', [])
    return []


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('ref')
    ap.add_argument('new')
    ap.add_argument('--tol', type=int, default=3)
    ap.add_argument('--out')
    a = ap.parse_args()

    ia = Image.open(a.ref).convert('RGB')
    ib = Image.open(a.new).convert('RGB')
    if ia.size != ib.size:
        print(f'size mismatch ref={ia.size[0]}x{ia.size[1]} new={ib.size[0]}x{ib.size[1]}')
        sys.exit(2)
    w, h = ia.size
    A = np.asarray(ia).astype(np.int16)
    B = np.asarray(ib).astype(np.int16)
    diff = np.abs(A - B).max(axis=2)
    for x0, y0, x1, y1 in load_masks(a.ref) + load_masks(a.new):
        x0, y0 = max(0, x0), max(0, y0)
        x1, y1 = min(w, x1), min(h, y1)
        if x1 > x0 and y1 > y0:
            diff[y0:y1, x0:x1] = 0
    over_mask = diff > a.tol
    over = int(over_mask.sum())
    print(f'size={w}x{h} max={int(diff.max())} over_tol={over}')

    out = Path(a.out) if a.out else Path('tools/out') / f'diff-{Path(a.new).stem}.png'
    out.parent.mkdir(parents=True, exist_ok=True)
    heat = (B.astype(np.float32) * 0.3).astype(np.uint8)
    heat[over_mask] = (255, 0, 0)
    Image.fromarray(heat).save(out)
    sys.exit(0 if over == 0 else 1)


if __name__ == '__main__':
    main()
