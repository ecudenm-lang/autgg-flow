/**
 * batch_lipsync_fal.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Aplica LIPSYNC con Kling LipSync (fal) sobre clips YA animados con Kling 3.0.
 * Para cada toma con personaje hablando: clip de video + audio de esa toma →
 * clip con la boca sincronizada a la voz. (Las tomas de b-roll puro NO van aquí.)
 *
 * USO
 *   node batch_lipsync_fal.mjs [lipsync_input.json] [out_dir]
 *   ej:  node batch_lipsync_fal.mjs lipsync_input_v2.json clips_sync_v2
 *
 * FORMATO lipsync_input.json   (video y audio: ruta local O url http)
 *   [ { "n":"01", "video":"clips_v2/raw_01.mp4", "audio":"audio_v2/seg_01.wav" } ]
 *
 * ENDPOINT: fal-ai/kling-video/lipsync/audio-to-video
 *   - video_url: 2–10 s, mp4/mov/webm/m4v/gif, ≤100MB
 *   - audio_url: 2–60 s, mp3/ogg/wav/m4a/aac, ≤5MB
 *   - precio: $0.014 por bloque de 5s (un clip de ≤10s ≈ $0.028)
 *
 * SALIDA: <out_dir>/lip_<n>.mp4 (default clips_sync/)
 * VARIABLE DE ENTORNO: FAL_KEY
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { fal } from "@fal-ai/client";
import { createInterface } from "readline";
import { existsSync, mkdirSync, createWriteStream, readFileSync } from "fs";
import { join, resolve, basename, extname } from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";

const ENDPOINT = "fal-ai/kling-video/lipsync/audio-to-video";
const COST_PER_BLOCK = 0.014;       // por cada 5s
const EST_BLOCKS = 2;               // estimación para tabla (clips ≤10s)
const CONFIRM_TIMEOUT = 30_000;

const FAL_KEY = process.env.FAL_KEY;
if (!FAL_KEY) { console.error('\n❌  FAL_KEY no encontrado.\n'); process.exit(1); }
fal.config({ credentials: FAL_KEY });

const inputFile = process.argv[2] ?? "lipsync_input.json";
const outDirName = process.argv[3] ?? "clips/sync";
const inputPath = resolve(inputFile);
if (!existsSync(inputPath)) { console.error(`\n❌  No se encontró: ${inputPath}\n`); process.exit(1); }

let shots;
try { shots = JSON.parse(readFileSync(inputPath, "utf-8")); }
catch (e) { console.error(`\n❌  No se pudo parsear ${inputFile}: ${e.message}\n`); process.exit(1); }
if (!Array.isArray(shots) || !shots.length) { console.error("\n❌  Array vacío.\n"); process.exit(1); }
for (const s of shots) {
  if (!s.n || !s.video || !s.audio) { console.error(`\n❌  Toma inválida (n/video/audio): ${JSON.stringify(s)}\n`); process.exit(1); }
}

const VID_MIME = { ".mp4": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm", ".m4v": "video/x-m4v", ".gif": "image/gif" };
const AUD_MIME = { ".mp3": "audio/mpeg", ".wav": "audio/wav", ".m4a": "audio/mp4", ".aac": "audio/aac", ".ogg": "audio/ogg" };

async function toUrl(p, mimeMap) {
  if (/^https?:\/\//i.test(p)) return p;
  const fp = resolve(p);
  if (!existsSync(fp)) throw new Error(`no existe ${fp}`);
  const type = mimeMap[extname(fp).toLowerCase()] ?? "application/octet-stream";
  return await fal.storage.upload(new Blob([readFileSync(fp)], { type }));
}

function truncate(str, n) { return str.length > n ? str.slice(0, n - 1) + "…" : str; }
const SEP = "─".repeat(80), SEP2 = "═".repeat(80);
const estCost = shots.length * COST_PER_BLOCK * EST_BLOCKS;

console.log(`\n${SEP2}`);
console.log("  BATCH LIPSYNC — Kling LipSync (fal) — TABLA DE APROBACIÓN");
console.log(`  Archivo: ${basename(inputFile)}   |   Tomas: ${shots.length}   |   Salida: ${outDirName}/`);
console.log(SEP2);
console.log(`  ${"N°".padEnd(5)}${"Video".padEnd(28)}Audio`);
console.log(SEP);
for (const s of shots) console.log(`  ${String(s.n).padEnd(5)}${truncate(basename(s.video), 26).padEnd(28)}${truncate(basename(s.audio), 40)}`);
console.log(SEP);
console.log(`  COSTO ESTIMADO: ~$${estCost.toFixed(2)} USD  ($0.014/5s; clips ≤10s ≈ $0.028 c/u)`);
console.log(`${SEP2}\n`);

const rl = createInterface({ input: process.stdin, output: process.stdout });
const confirmed = await new Promise((res) => {
  let answered = false;
  const timer = setTimeout(() => { if (!answered) { answered = true; rl.close(); console.log("\n⏱️  Tiempo agotado. Abortando."); res(false); } }, CONFIRM_TIMEOUT);
  rl.question('  Escribe "OK" y Enter para confirmar: ', (a) => { if (!answered) { answered = true; clearTimeout(timer); rl.close(); res(a.trim().toUpperCase() === "OK"); } });
});
if (!confirmed) { console.log("\n🚫  Cancelado. No se gastaron créditos.\n"); process.exit(0); }

const outDir = resolve(outDirName);
mkdirSync(outDir, { recursive: true });

async function downloadToFile(url, destPath) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} al descargar ${url}`);
  await pipeline(Readable.fromWeb(r.body), createWriteStream(destPath));
  return destPath;
}

console.log(`\n🚀  Enviando ${shots.length} job(s) de lipsync en paralelo…\n`);
const results = await Promise.allSettled(shots.map(async (s) => {
  const [video_url, audio_url] = await Promise.all([toUrl(s.video, VID_MIME), toUrl(s.audio, AUD_MIME)]);
  const out = await fal.subscribe(ENDPOINT, { input: { video_url, audio_url }, logs: false });
  const url = out?.data?.video?.url ?? out?.video?.url;
  if (!url) throw new Error(`Toma ${s.n}: sin video.url. ${JSON.stringify(out?.data ?? out)}`);
  const saved = await downloadToFile(url, join(outDir, `lip_${s.n}.mp4`));
  console.log(`  ✅ Toma ${s.n} → ${basename(saved)}`);
  return { n: s.n, saved };
}));

const ok = results.filter(r => r.status === "fulfilled").length;
const errs = results.map((r, i) => r.status === "rejected" ? `${shots[i].n}: ${r.reason?.message ?? r.reason}` : null).filter(Boolean);
console.log(`\n${SEP2}`);
console.log("  LIPSYNC COMPLETADO");
console.log(SEP);
console.log(`  Exitosos : ${ok} / ${shots.length}`);
if (errs.length) console.log(`  Fallidos :\n   - ${errs.join("\n   - ")}`);
console.log(`${SEP2}\n`);
if (errs.length) process.exit(1);
