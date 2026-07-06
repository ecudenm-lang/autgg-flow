/**
 * assemble_mute.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Monta el b-roll MUDO (sin voz), recortando cada clip a la duración de su corte
 * (cuts_<n>.json). Usa SIEMPRE los clips crudos de Kling (clips_<n>/raw_<n>.mp4),
 * ignora cualquier lipsync. Para entregar solo el video y poner la voz en el editor.
 *
 * USO
 *   node assemble_mute.mjs <nombre> [broll_dir] [cuts.json]
 *   ej: node assemble_mute.mjs v5            (defaults: broll=clips/v5, cuts=config/cuts_v5.json)
 *
 * SALIDA: output/final_<nombre>_mudo.mp4  (no sobreescribe)
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { execFileSync } from "child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "fs";
import { resolve, join, basename } from "path";

const name     = process.argv[2];
const brollDir = resolve(process.argv[3] ?? `clips/${name}`);
const cutsArg  = process.argv[4] ?? `config/cuts_${name}.json`;
if (!name) { console.error("\n❌  Uso: node assemble_mute.mjs <nombre> [broll_dir] [cuts.json]\n"); process.exit(1); }

const cutsPath = resolve(cutsArg);
const outPath  = resolve("output", `final_${name}_mudo.mp4`);
mkdirSync(resolve("output"), { recursive: true });
if (!existsSync(cutsPath)) { console.error(`\n❌  No se encontró cuts: ${cutsPath}\n`); process.exit(1); }
if (existsSync(outPath))   { console.error(`\n⚠️  ${basename(outPath)} ya existe. Borralo o renombralo.\n`); process.exit(1); }

const cuts = JSON.parse(readFileSync(cutsPath, "utf-8"));
const tmpDir = resolve(`_tmp_${name}_mute`);
mkdirSync(tmpDir, { recursive: true });
const SEP = "─".repeat(72);
console.log(`\nENSAMBLAR MUDO (sin voz) — ${name}\n${SEP}`);

const normd = [];
for (const c of cuts) {
  const dur = (Number(c.end) - Number(c.start)).toFixed(3);
  const raw = join(brollDir, `raw_${c.n}.mp4`);
  if (!existsSync(raw)) { console.warn(`  ⚠ toma ${c.n}: sin raw — se omite`); continue; }
  const out = join(tmpDir, `n_${c.n}.mp4`);
  execFileSync("ffmpeg", [
    "-y", "-i", raw, "-t", dur,
    "-vf", "scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30",
    "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", "30", out,
  ], { stdio: ["ignore", "ignore", "ignore"] });
  console.log(`  ✅ toma ${c.n}  ${dur}s`);
  normd.push(out);
}
if (!normd.length) { console.error("\n❌  No hay clips.\n"); process.exit(1); }

const listPath = join(tmpDir, "concat.txt");
writeFileSync(listPath, normd.map(p => `file '${p.replace(/\\/g, "/").replace(/'/g, "\\'")}'`).join("\n"), "utf-8");
execFileSync("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", "-an", outPath], { stdio: ["ignore", "ignore", "ignore"] });

let dur = "?";
try { dur = parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", outPath], { encoding: "utf-8" }).trim()).toFixed(2) + "s"; } catch {}
rmSync(tmpDir, { recursive: true, force: true });
console.log(`\n✅  ${basename(outPath)}  (${dur}, sin voz)\n`);
