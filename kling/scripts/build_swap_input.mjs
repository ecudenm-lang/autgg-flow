/**
 * build_swap_input.mjs — para cada foto local: lee dimensiones (PNG), la sube a fal,
 * elige el aspect_ratio soportado mas cercano, y escribe swap_input_all.json.
 * ENV: FAL_KEY
 */
import { fal } from "@fal-ai/client";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { basename, extname } from "path";

if (!process.env.FAL_KEY) { console.error("❌ FAL_KEY no encontrado."); process.exit(1); }
fal.config({ credentials: process.env.FAL_KEY });

const POUCH_URL = "https://v3b.fal.media/files/b/0a9fd0b5/NKeqAUTIGfMeEhyvRlbWX_1782458138373.png";

// n -> ruta local. C2 ya hecho, no se incluye.
const FILES = {
  A1: "D:/Iteracionking/fotos_recrear/adv/A1_manos_pouch.png",
  A2: "D:/Iteracionking/fotos_recrear/adv/A2_dias1-3.png",
  A3: "D:/Iteracionking/fotos_recrear/adv/A3_dias4-7.png",
  A4: "D:/Iteracionking/fotos_recrear/adv/A4_dias14-25.png",
  A5: "D:/Iteracionking/fotos_recrear/adv/A5_rosaM.png",
  A6: "D:/Iteracionking/fotos_recrear/adv/A6_cocina.png",
  C1: "D:/Iteracionking/fotos_recrear/plantilla/C1_ugc.png",
  C3: "D:/Iteracionking/fotos_recrear/plantilla/C3_ugc.png",
  C4: "D:/Iteracionking/fotos_recrear/plantilla/C4_ugc.png",
  C5: "D:/Iteracionking/fotos_recrear/plantilla/C5_ugc.png",
  C6: "D:/Iteracionking/fotos_recrear/plantilla/C6_ugc.png",
};

const RATIOS = [
  ["1:1", 1.0], ["4:5", 0.8], ["3:4", 0.75], ["2:3", 0.6667], ["9:16", 0.5625],
  ["5:4", 1.25], ["4:3", 1.3333], ["3:2", 1.5], ["16:9", 1.7778],
];
function pngSize(buf) {
  // PNG: width=bytes 16-19, height=20-23 (big endian) tras firma+IHDR
  if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}
function nearestRatio(w, h) {
  const r = w / h;
  let best = RATIOS[0], bd = Infinity;
  for (const [name, val] of RATIOS) { const d = Math.abs(val - r); if (d < bd) { bd = d; best = [name, val]; } }
  return best[0];
}

const out = [];
for (const [n, path] of Object.entries(FILES)) {
  if (!existsSync(path)) { console.error(`⚠️  falta ${path}`); continue; }
  const buf = readFileSync(path);
  const size = pngSize(buf);
  const ar = size ? nearestRatio(size.w, size.h) : "1:1";
  const blob = new Blob([buf], { type: "image/png" });
  const url = await fal.storage.upload(blob);
  out.push({ n, scene_url: url, pouch_url: POUCH_URL, aspect_ratio: ar });
  console.log(`  ${n.padEnd(3)} ${size ? size.w+"x"+size.h : "?"}  → ${ar}`);
}
writeFileSync("D:/videos-kling/swap_input_all.json", JSON.stringify(out, null, 2));
console.log(`\n✅ swap_input_all.json escrito con ${out.length} fotos.`);
