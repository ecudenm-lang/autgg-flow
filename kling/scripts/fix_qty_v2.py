from PIL import Image, ImageFilter
import os, shutil

src = r"D:\videos-kling\swapped\qty2"
dst = r"D:\videos-kling\swapped\qty"
prev = os.path.join(dst, "preview")
os.makedirs(prev, exist_ok=True)
MARGIN = 0.06

for count in [1, 3, 5]:
    p = os.path.join(src, f"raw_qty{count}.png")
    im = Image.open(p).convert("RGBA")
    r, g, b, a = im.split()
    # erosionar alpha 1px para quitar el fringe verde del borde
    a = a.filter(ImageFilter.MinFilter(3))
    im = Image.merge("RGBA", (r, g, b, a))
    # recortar al contenido
    bbox = a.getbbox()
    content = im.crop(bbox)
    cw, ch = content.size
    side = int(round(max(cw, ch) * (1 + 2 * MARGIN)))
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(content, ((side - cw) // 2, (side - ch) // 2), content)
    out = os.path.join(dst, f"pouch_qty{count}.png")
    canvas.save(out)
    # preview sobre gris para detectar halos
    pv = Image.new("RGBA", canvas.size, (130, 130, 130, 255))
    pv.alpha_composite(canvas)
    pv.convert("RGB").save(os.path.join(prev, f"preview_qty{count}.jpg"), quality=90)
    print(f"qty{count}: contenido {cw}x{ch} -> {side}x{side} -> {out}")

print("Listo. Previews (sobre gris) en", prev)
