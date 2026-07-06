/**
 * batch_lipsync_sync.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Lipsync para personajes CARTOON / no-humanos (ej. el hígado de V5, Metformina V3).
 * Usa fal-ai/sync-lipsync (Sync.so), que SÍ tolera caras estilizadas — a diferencia
 * de Kling LipSync (batch_lipsync_fal.mjs), que solo acepta caras humanas reales.
 *
 * USO
 *   node batch_lipsync_sync.mjs [lipsync_input.json] [out_dir]
 *   ej:  node batch_lipsync_sync.mjs lipsync_input_v5.json clips_sync_v5
 *
 * FORMATO lipsync_input.json   (video y audio: ruta local O url http)
 *   [ { "n":"01", "video":"clips_v5/raw_01.mp4", "audio":"audio_v5/seg_01.wav" } ]
 *
 * ENDPOINT: fal-ai/sync-lipsync   (video_url + audio_url)
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

const ENDPOINT = "fal-ai/sync-lipsync";
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
for (const s of shots) if (!s.n || !s.video || !s.audio) { console.error(`\n❌  Toma inválida: ${JSON.stringify(s)}\n`); process.exit(1); }

const VID_MIME = { ".mp4": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm" };
const AUD_MIME = { ".wav": "audio/wav", ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".aac": "audio/aac" };
async function toUrl(p, map) {
  if (/^https?:\/\//i.test(p)) return p;
  const fp = resolve(p);
  if (!existsSync(fp)) throw new Error(`no existe ${fp}`);
  const type = map[extname(fp).toLowerCase()] ?? "application/octet-stream";
  return await fal.storage.upload(new Blob([readFileSync(fp)], { type }));
}
function truncate(s, n) { return s.length > n ? s.slice(0, n - 1) + "…" : s; }
const SEP = "─".repeat(80), SEP2 = "═".repeat(80);

console.log(`\n${SEP2}`);
console.log("  BATCH LIPSYNC CARTOON — sync-lipsync (fal) — TABLA DE APROBACIÓN");
console.log(`  Archivo: ${basename(inputFile)}   |   Tomas: ${shots.length}   |   Salida: ${outDirName}/`);
console.log(SEP2);
for (const s of shots) console.log(`  ${String(s.n).padEnd(5)}${truncate(basename(s.video), 26).padEnd(28)}${truncate(basename(s.audio), 30)}`);
console.log(SEP2 + "\n");

const rl = createInterface({ input: process.stdin, output: process.stdout });
const confirmed = await new Promise((res) => {
  let answered = false;
  const timer = setTimeout(() => { if (!answered) { answered = true; rl.close(); res(false); } }, CONFIRM_TIMEOUT);
  rl.question('  Escribe "OK" y Enter para confirmar: ', (a) => { if (!answered) { answered = true; clearTimeout(timer); rl.close(); res(a.trim().toUpperCase() === "OK"); } });
});
if (!confirmed) { console.log("\n🚫  Cancelado.\n"); process.exit(0); }

const outDir = resolve(outDirName);
mkdirSync(outDir, { recursive: true });
async function dl(url, dest) { const r = await fetch(url); if (!r.ok) throw new Error(`HTTP ${r.status}`); await pipeline(Readable.fromWeb(r.body), createWriteStream(dest)); return dest; }

console.log(`\n🚀  Enviando ${shots.length} job(s) de lipsync (sync-lipsync) en paralelo…\n`);
const results = await Promise.allSettled(shots.map(async (s) => {
  const [video_url, audio_url] = await Promise.all([toUrl(s.video, VID_MIME), toUrl(s.audio, AUD_MIME)]);
  const out = await fal.subscribe(ENDPOINT, { input: { video_url, audio_url }, logs: false });
  const url = out?.data?.video?.url ?? out?.video?.url ?? out?.data?.url;
  if (!url) throw new Error(`Toma ${s.n}: sin video.url. ${JSON.stringify(out?.data ?? out).slice(0,300)}`);
  const saved = await dl(url, join(outDir, `lip_${s.n}.mp4`));
  console.log(`  ✅ Toma ${s.n} → ${basename(saved)}`);
  return s.n;
}));
const errs = results.map((r, i) => r.status === "rejected" ? `${shots[i].n}: ${r.reason?.message ?? r.reason}` : null).filter(Boolean);
console.log(`\n${SEP2}`);
console.log(`  LIPSYNC COMPLETADO — Exitosos: ${results.filter(r=>r.status==="fulfilled").length}/${shots.length}`);
if (errs.length) console.log(`  Fallidos:\n   - ${errs.join("\n   - ")}`);
console.log(`${SEP2}\n`);
if (errs.length) process.exit(1);
