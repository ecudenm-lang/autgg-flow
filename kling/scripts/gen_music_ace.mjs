/**
 * gen_music_ace.mjs — cama musical INSTRUMENTAL con ACE-Step vía fal (baratísimo: $0.0002/s).
 * USO: node gen_music_ace.mjs "<tags/estilo>" <out.wav> [duration_s]
 *   ej: node gen_music_ace.mjs "cinematic, emotional, piano, strings, ambient, hopeful, no drums" audio/music/pr1_ace.wav 90
 * Instrumental → lyrics fijo "[inst]". Salida: WAV en out. ENV: FAL_KEY.
 */
import { fal } from "@fal-ai/client";
import { createWriteStream, mkdirSync } from "fs";
import { resolve, dirname, basename } from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";

fal.config({ credentials: process.env.FAL_KEY });
if (!process.env.FAL_KEY) { console.error("\n❌  FAL_KEY no encontrado.\n"); process.exit(1); }

const tags = process.argv[2];
const outFile = process.argv[3];
const duration = Number(process.argv[4] ?? 90);
if (!tags || !outFile) { console.error('\nUSO: node gen_music_ace.mjs "<tags>" <out.wav> [duration_s]\n'); process.exit(1); }

console.log(`\n🎵  ACE-Step (fal) — ${duration}s instrumental`);
console.log(`    tags: ${tags}`);
const out = await fal.subscribe("fal-ai/ace-step", {
  input: { tags, lyrics: "[inst]", duration },
  logs: false,
});
const url = out?.data?.audio?.url ?? out?.audio?.url;
if (!url) { console.error(`❌  Sin audio.url: ${JSON.stringify(out).slice(0,400)}`); process.exit(1); }

const dest = resolve(process.cwd(), outFile);
mkdirSync(dirname(dest), { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let ok = false;
for (let att = 1; att <= 8 && !ok; att++) {
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    await pipeline(Readable.fromWeb(r.body), createWriteStream(dest));
    const { statSync } = await import("fs");
    if (statSync(dest).size < 50000) throw new Error("archivo muy chico (CDN no listo)");
    ok = true;
  } catch (e) { console.log(`    intento ${att} falló (${e.message}); reintento en 8s…`); await sleep(8000); }
}
if (!ok) { console.error(`❌  No se pudo bajar tras reintentos. URL: ${url}`); process.exit(1); }
console.log(`  ✅  ${basename(dest)}  (~$${(duration*0.0002).toFixed(4)})\n`);
