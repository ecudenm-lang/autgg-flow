# Recorta el margen transparente y re-centra para que el pouch llene el cuadro.
from PIL import Image
import os, shutil

folder = r"D:\videos-kling\swapped\qty"
orig = os.path.join(folder, "orig")
os.makedirs(orig, exist_ok=True)
MARGIN = 0.06  # 6% de margen alrededor del contenido

for name in ["pouch_qty1.png", "pouch_qty3.png", "pouch_qty5.png"]:
    p = os.path.join(folder, name)
    if not os.path.exists(p):
        print("falta", name); continue
    # backup
    shutil.copy2(p, os.path.join(orig, name))
    im = Image.open(p).convert("RGBA")
    bbox = im.split()[3].getbbox()  # bbox del area no transparente
    if not bbox:
        print(name, "sin contenido visible"); continue
    content = im.crop(bbox)
    cw, ch = content.size
    side = int(round(max(cw, ch) * (1 + 2 * MARGIN)))
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(content, ((side - cw) // 2, (side - ch) // 2), content)
    canvas.save(p)
    fill = round(100 * max(cw, ch) / side)
    print(f"{name}: {im.size[0]}x{im.size[1]} -> contenido {cw}x{ch} -> lienzo {side}x{side} (pouch llena ~{fill}%)")

print("Listo. Originales en", orig)
