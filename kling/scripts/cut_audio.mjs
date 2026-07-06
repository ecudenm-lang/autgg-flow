/**
 * cut_audio.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Corta UN audio de narración completo en un clip por toma, según los tiempos
 * de cuts_<nombre>.json. Cada clip resultante es el audio de esa toma (lo que
 * se le pasa a Kling LipSync).
 *
 * USO
 *   node cut_audio.mjs <cuts.json> <audio_local> [out_dir]
 *   ej:  node cut_audio.mjs cuts_v2.json narracion_v2.mp3 audio_v2
 *
 * FORMATO cuts.json   (los tiempos salen de transcript_<nombre>.json)
 *   [ { "n":"01", "start": 0.0,  "end": 7.30 },
 *     { "n":"02", "start": 7.30, "end": 14.57 } ]
 *
 * SALIDA
 *   <out_dir>/seg_<n>.wav   (uno por toma)
 *
 * REQUISITO: ffmpeg en el PATH. Sin costo (es local).
 * NOTA: Kling LipSync acepta audio de 2–60s y ≤5MB; un wav de ≤10s entra de sobra.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { execFileSync } from "child_process";
import { readFileSync, mkdirSync, existsSync } from "fs";
import { resolve, join } from "path";

// ffmpeg: usa el del PATH; se puede forzar con la variable FFMPEG.
const FFMPEG = process.env.FFMPEG || "ffmpeg";

const cutsArg  = process.argv[2] ?? "cuts.json";
const audioArg = process.argv[3];
const outDir   = process.argv[4] ?? "audio_segs";
if (!audioArg) { console.error("\n❌  Falta el audio.\n    node cut_audio.mjs <cuts.json> <audio_local> [out_dir]\n"); process.exit(1); }

const cutsPath  = resolve(cutsArg);
const audioPath = resolve(audioArg);
if (!existsSync(cutsPath))  { console.error(`\n❌  No se encontró: ${cutsPath}\n`); process.exit(1); }
if (!existsSync(audioPath)) { console.error(`\n❌  No se encontró: ${audioPath}\n`); process.exit(1); }

let cuts;
try { cuts = JSON.parse(readFileSync(cutsPath, "utf-8")); }
catch (e) { console.error(`\n❌  No se pudo parsear ${cutsArg}: ${e.message}\n`); process.exit(1); }
if (!Array.isArray(cuts) || !cuts.length) { console.error("\n❌  cuts.json debe ser un array con al menos una toma.\n"); process.exit(1); }

const dir = resolve(outDir);
mkdirSync(dir, { recursive: true });

console.log(`\n✂️   Cortando ${cuts.length} segmentos de ${audioArg} → ${outDir}/\n`);
for (const c of cuts) {
  if (c.n == null || c.start == null || c.end == null) { console.error(`  ⚠ toma inválida: ${JSON.stringify(c)} (n/start/end)`); continue; }
  const dur = (Number(c.end) - Number(c.start));
  if (dur <= 0) { console.error(`  ⚠ toma ${c.n}: end <= start, salto.`); continue; }
  const out = join(dir, `seg_${c.n}.wav`);
  // -ss/-to DESPUÉS de -i = corte exacto en audio. wav pcm 44.1k.
  execFileSync(FFMPEG, [
    "-y", "-i", audioPath,
    "-ss", String(c.start), "-to", String(c.end),
    "-ar", "44100", "-ac", "1", out,
  ], { stdio: ["ignore", "ignore", "ignore"] });
  console.log(`  ✅ seg_${c.n}.wav  (${dur.toFixed(2)}s)`);
}
console.log(`\nListo. Estos wav van como "audio" en lipsync_input.json.\n`);
