# banner_hook.py — PNG transparente con titular tipo "El secreto de los doctores":
# L1 blanca + L2 roja, Montserrat Black mayuscula, fondo negro redondeado. Auto-ajusta
# el tamano de fuente para que el banner no exceda el ancho.
# Uso:  python banner_hook.py --file texts.txt salida.png [fontsize]   (texts.txt UTF-8, 2 lineas)
#       python banner_hook.py "LINEA 1" "LINEA 2" salida.png [fontsize]
import sys
from PIL import Image, ImageDraw, ImageFont

if sys.argv[1] == "--file":
    with open(sys.argv[2], "r", encoding="utf-8") as f:
        lines = [x.strip() for x in f.read().splitlines() if x.strip()]
    l1, l2, out = lines[0].upper(), lines[1].upper(), sys.argv[3]
    fs = int(sys.argv[4]) if len(sys.argv) > 4 else 60
else:
    l1, l2, out = sys.argv[1].upper(), sys.argv[2].upper(), sys.argv[3]
    fs = int(sys.argv[4]) if len(sys.argv) > 4 else 60

W = 1080
MAXW = W - 48
# Fuente PORTABLE: relativa al kit (assets/fonts). Override con env FONT.
import os as _os
_ROOT = _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))
FONT = _os.environ.get("FONT", _os.path.join(_ROOT, "assets", "fonts", "Montserrat-Black.ttf"))
RED, WHITE, BG = (232, 42, 42, 255), (255, 255, 255, 255), (0, 0, 0, 180)
pad_x, pad_y = 40, 26

tmp = ImageDraw.Draw(Image.new("RGBA", (10, 10)))
def wh(t, font):
    b = tmp.textbbox((0, 0), t, font=font, anchor="la")
    return b[2] - b[0], b[3] - b[1]

# auto-fit
while True:
    font = ImageFont.truetype(FONT, fs)
    w1, h1 = wh(l1, font)
    w2, h2 = wh(l2, font)
    if max(w1, w2) + pad_x * 2 <= MAXW or fs <= 30:
        break
    fs -= 2

gap = int(fs * 0.16)
line_h = max(h1, h2)
banner_w = max(w1, w2) + pad_x * 2
banner_h = line_h * 2 + gap + pad_y * 2

img = Image.new("RGBA", (W, banner_h), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
x0 = (W - banner_w) // 2
radius = int(banner_h * 0.20)
d.rounded_rectangle([x0, 0, x0 + banner_w, banner_h], radius=radius, fill=BG)
cx = W // 2
d.text((cx, pad_y), l1, font=font, fill=WHITE, anchor="ma")
d.text((cx, pad_y + line_h + gap), l2, font=font, fill=RED, anchor="ma")
img.save(out)
print(f"OK {out} {img.size} fs={fs}")
