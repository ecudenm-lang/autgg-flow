/**
 * assemble_voiced.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Ensambla el VSL final CON la voz del narrador, sincronizado a los cortes.
 * - Cada toma se recorta a la duración exacta de su segmento de voz (cuts_<n>.json).
 * - Si existe un clip con lipsync (clips_sync_<n>/lip_<NN>.mp4) se usa ESE en vez
 *   del clip mudo de Kling (clips_<n>/raw_<NN>.mp4).
 * - Todos los clips se normalizan a 720x1280 / 30fps / h264 para poder concatenar.
 * - Al final se pega la voz completa (un solo mp3) como pista de audio.
 *   Como cada clip dura lo que su segmento de voz, todo queda sincronizado.
 *
 * USO
 *   node assemble_voiced.mjs <nombre> <voz.mp3> [broll_dir] [lip_dir] [cuts.json]
 *   ej: node assemble_voiced.mjs v4 "Videos a iterar/V4.mp3"
 *       (defaults: broll=clips/v4, lip=clips/v4_sync, cuts=config/cuts_v4.json)
 *
 * SALIDA: output/final_<nombre>_voiced.mp4   (no sobreescribe)
 * REQUISITO: ffmpeg/ffprobe en PATH.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { execFileSync } from "child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "fs";
import { resolve, join, basename } from "path";

// ffmpeg/ffprobe: usa los del PATH; se pueden forzar con las variables FFMPEG / FFPROBE.
const FFMPEG  = process.env.FFMPEG  || "ffmpeg";
const FFPROBE = process.env.FFPROBE || "ffprobe";

const name     = process.argv[2];
const voiceArg = process.argv[3];
const brollDir = resolve(process.argv[4] ?? `clips/${name}`);
const lipDir   = resolve(process.argv[5] ?? `clips/${name}_sync`);
const cutsArg  = process.argv[6] ?? `config/cuts_${name}.json`;

if (!name || !voiceArg) {
  console.error("\n❌  Uso: node assemble_voiced.mjs <nombre> <voz.mp3> [broll_dir] [lip_dir] [cuts.json]\n");
  process.exit(1);
}
const voicePath = resolve(voiceArg);
const cutsPath  = resolve(cutsArg);
const outPath   = resolve("output", `final_${name}_voiced.mp4`);
mkdirSync(resolve("output"), { recursive: true });
for (const [p, label] of [[voicePath, "voz"], [cutsPath, "cuts"]]) {
  if (!existsSync(p)) { console.error(`\n❌  No se encontró ${label}: ${p}\n`); process.exit(1); }
}
if (existsSync(outPath)) { console.error(`\n⚠️  ${basename(outPath)} ya existe. Borralo o renombralo.\n`); process.exit(1); }

const cuts = JSON.parse(readFileSync(cutsPath, "utf-8"));
const tmpDir = resolve(`_tmp_${name}`);
mkdirSync(tmpDir, { recursive: true });

const SEP = "─".repeat(72);
console.log(`\nENSAMBLAR CON VOZ — ${name}\n${SEP}`);

const normd = [];
for (const c of cuts) {
  const dur = (Number(c.end) - Number(c.start)).toFixed(3);
  const lip = join(lipDir, `lip_${c.n}.mp4`);
  const raw = join(brollDir, `raw_${c.n}.mp4`);
  const src = existsSync(lip) ? lip : (existsSync(raw) ? raw : null);
  if (!src) { console.warn(`  ⚠ toma ${c.n}: sin clip (ni lip ni raw) — se omite`); continue; }
  const tag = existsSync(lip) ? "lipsync" : "broll";
  const out = join(tmpDir, `n_${c.n}.mp4`);
  execFileSync(FFMPEG, [
    "-y", "-i", src, "-t", dur,
    "-vf", "scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,tpad=stop_mode=clone:stop_duration=8",
    "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", "30", out,
  ], { stdio: ["ignore", "ignore", "ignore"] });
  console.log(`  ✅ toma ${c.n}  ${dur}s  (${tag})`);
  normd.push(out);
}
if (!normd.length) { console.error("\n❌  No hay clips para ensamblar.\n"); process.exit(1); }

// concat (mudo)
const listPath = join(tmpDir, "concat.txt");
writeFileSync(listPath, normd.map(p => `file '${p.replace(/\\/g, "/").replace(/'/g, "\\'")}'`).join("\n"), "utf-8");
const silent = join(tmpDir, "silent.mp4");
execFileSync(FFMPEG, ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", silent], { stdio: ["ignore", "ignore", "ignore"] });

// pegar voz
console.log(`${SEP}\n🎙️  Pegando la voz…`);
execFileSync(FFMPEG, [
  "-y", "-i", silent, "-i", voicePath,
  "-map", "0:v:0", "-map", "1:a:0",
  "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", outPath,
], { stdio: ["ignore", "ignore", "ignore"] });

let dur = "?";
try { dur = parseFloat(execFileSync(FFPROBE, ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", outPath], { encoding: "utf-8" }).trim()).toFixed(2) + "s"; } catch {}
rmSync(tmpDir, { recursive: true, force: true });

console.log(`\n✅  ${basename(outPath)}  (${dur})\n`);
