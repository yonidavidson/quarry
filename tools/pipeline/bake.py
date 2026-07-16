#!/usr/bin/env python3
"""Bake PixelLab animation frames into KAPLAY sprite strips for QUARRY.

Reads downloaded frame PNGs (252x252, character centered, feet ~y=189),
applies per-frame transforms (rotation / vertical flip for the beast's
wall-cling and ceiling-crawl poses), computes a uniform centered crop,
and writes one horizontal strip PNG per character + a JS snippet with
the loadSprite config numbers.
"""
import json, os, sys, base64
from PIL import Image

SCRATCH = os.environ.get("FRAMES_DIR") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frames")
CANVAS = 252
CX = CY = CANVAS // 2


def load(path):
    return Image.open(os.path.join(SCRATCH, path)).convert("RGBA")


def xform(im, rot=0, vflip=False, tx=0, ty=0):
    """rot: degrees CCW about canvas center; vflip: mirror top-bottom; tx/ty: pixel shift."""
    if vflip:
        im = im.transpose(Image.FLIP_TOP_BOTTOM)
    if rot:
        im = im.rotate(rot, resample=Image.NEAREST, center=(CX, CY))
    if tx or ty:
        shifted = Image.new("RGBA", im.size, (0, 0, 0, 0))
        shifted.paste(im, (tx, ty))
        im = shifted
    return im


def bake(name, frames, pad=6):
    """frames: list of (image, tag). Uniform center-x crop, common box."""
    # union bbox over all frames
    l = t = 10**9
    r = b = -(10**9)
    for im, _ in frames:
        bb = im.getbbox()
        if not bb:
            continue
        l, t = min(l, bb[0]), min(t, bb[1])
        r, b = max(r, bb[2]), max(b, bb[3])
    # symmetric about center-x so flipX keeps the body in place
    half = max(CX - l, r - CX) + pad
    l, r = CX - half, CX + half
    t, b = max(0, t - pad), min(CANVAS, b + pad)
    w, h = r - l, b - t
    strip = Image.new("RGBA", (w * len(frames), h), (0, 0, 0, 0))
    for i, (im, _) in enumerate(frames):
        strip.paste(im.crop((l, t, r, b)), (i * w, 0))
    out = os.path.join(SCRATCH, f"{name}_strip.png")
    strip.quantize(colors=255, method=Image.FASTOCTREE, dither=Image.NONE).save(out, optimize=True)
    info = {
        "name": name, "frameW": w, "frameH": h, "count": len(frames),
        "tags": [tag for _, tag in frames],
        # feet line (y=189 in canvas) relative to frame center -> shadowY
        "feetFromCenter": 189 - (t + h / 2),
        "cropTop": t, "cropLeft": l,
        "bytes": os.path.getsize(out),
    }
    print(json.dumps(info, indent=1))
    return out, info


if __name__ == "__main__":
    print("run via bake_jack()/bake_stalker() driver — see driver.py")
