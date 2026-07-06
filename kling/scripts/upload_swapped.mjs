/**
 * upload_swapped.mjs — sube las 12 fotos swapped a fal y escribe swapped_urls.json
 * ENV: FAL_KEY
 */
import { fal } from "@fal-ai/client";
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";

if (!process.env.FAL_KEY) { console.error("❌ FAL_KEY no encontrado."); process.exit(1); }
fal.config({ credentials: process.env.FAL_KEY });

const dir = "D:/videos-kling/swapped/all";
const files = readdirSync(dir).filter(f => f.endsWith(".png")).sort();
const map = {};
for (const f of files) {
  const n = f.replace(/\.png$/, "");
  const blob = new Blob([readFileSync(join(dir, f))], { type: "image/png" });
  map[n] = await fal.storage.upload(blob);
  console.log(`  ${n.padEnd(4)} → ${map[n]}`);
}
writeFileSync("D:/videos-kling/swapped_urls.json", JSON.stringify(map, null, 2));
console.log(`\n✅ swapped_urls.json (${files.length})`);
