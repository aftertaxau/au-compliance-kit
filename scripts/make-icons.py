# Draws the logo mark (a pie ring: take-home in white, the tax slice in orange) as favicons and app
# icons into site/static/. Run once after changing the design: python3 -I scripts/make-icons.py
import sys
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "site/static")
OUT.mkdir(parents=True, exist_ok=True)
NAVY, WHITE, TAX = (15, 44, 76), (255, 255, 255), (242, 135, 90)

# Geometry on a 32-unit grid, matching favicon.svg and the inline header mark.
CX = CY = 16
R, W = 8.25, 4.5                  # ring centre-line radius and stroke width
C = 2 * 3.141592653589793 * R     # circumference
TAKE_HOME = (0, 39.4)             # dash ranges along the ring, starting at 12 o'clock, clockwise
TAX_SLICE = (40.8, 50.4)

def deg(d):  # distance along the ring -> PIL angle (0 = 3 o'clock, clockwise)
    return -90 + d / C * 360

def draw(size, rounded=True, pad=0.0, background=None):
    s = 8  # supersample, then shrink for smooth edges
    big = size * s
    img = Image.new("RGBA", (big, big), background or (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    unit = big / 32
    if rounded:
        d.rounded_rectangle([0, 0, big - 1, big - 1], radius=8 * unit, fill=NAVY)
    else:
        d.rectangle([0, 0, big, big], fill=NAVY)
    k = unit * (1 - pad)  # pad shrinks the ring inside full-bleed icons
    outer = (R + W / 2) * k
    box = [big / 2 - outer, big / 2 - outer, big / 2 + outer, big / 2 + outer]
    for (a, b), colour in ((TAKE_HOME, WHITE), (TAX_SLICE, TAX)):
        d.arc(box, deg(a), deg(b), fill=colour, width=round(W * k))
    return img.resize((size, size), Image.LANCZOS)

draw(48).save(OUT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
draw(180, rounded=False, pad=0.12, background=NAVY).convert("RGB").save(OUT / "apple-touch-icon.png")
# Square logo on white for search engines (Organization logo, at least 112px).
logo = Image.new("RGB", (512, 512), WHITE)
logo.paste(draw(448), (32, 32), draw(448))
logo.save(OUT / "logo-512.png")

ring = lambda colour, a, b: f'<circle cx="16" cy="16" r="{R}" stroke="{colour}" stroke-dasharray="{b - a:.1f} {C:.2f}" stroke-dashoffset="{-a:.1f}"/>'
svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#0f2c4c"/><g transform="rotate(-90 16 16)" fill="none" stroke-width="{W}">{ring("#fff", *TAKE_HOME)}{ring("#f2875a", *TAX_SLICE)}</g></svg>
'''
(OUT / "favicon.svg").write_text(svg)
print("icons written to", OUT)
