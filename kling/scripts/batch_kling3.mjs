/**
 * batch_kling3.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Igual que batch_kling.mjs pero para KLING 3.0 (v3 Pro) image-to-video en fal.
 * Kling 3.0 anima MUCHO más que 2.6 (acción de personaje real, no solo cámara).
 *
 * USO
 *   node batch_kling3.mjs [batch_input.json] [clips_dir]
 *
 * FORMATO batch_input.json
 *   [ { "n":"01", "image_url":"https://…", "prompt":"…", "duration":5|10,
 *       "negative_prompt":"(opcional)", "cfg_scale":0.5 (opcional) } ]
 *
 * DIFERENCIAS vs 2.6:
 *   - endpoint  fal-ai/kling-video/v3/pro/image-to-video
 *   - campo de imagen: start_image_url (NO image_url)
 *   - generate_audio default TRUE → lo forzamos a false (mudo + no duplica costo)
 *   - duration: entero 3–15
 *   - precio: $0.112/s sin audio
 *
 * VARIABLES DE ENTORNO:  FAL_KEY
 * SALIDA: <clips_dir>/raw_<n>.mp4 (default clips_v3/) + <clips_dir>/batch_log.json
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { fal }             from "@fal-ai/client";
import { createInterface } from "readline";
import {
  existsSync, mkdirSync,
  createWriteStream, readFileSync, writeFileSync,
} from "fs";
import { join, resolve, basename } from "path";
import { Readable }        from "stream";
import { pipeline }        from "stream/promises";

const ENDPOINT         = "fal-ai/kling-video/v3/pro/image-to-video";
const COST_PER_SECOND  = 0.112;          // USD/s, Kling 3.0 Pro sin audio
const DEFAULT_NEG      = "blur, distort, low quality, static, frozen, deformed hands, extra fingers, watermark, text, talking mouth closeup";
const POLL_INTERVAL_MS = 5_000;
const CONFIRM_TIMEOUT  = 30_000;

const FAL_KEY = process.env.FAL_KEY;
if (!FAL_KEY) { console.error('\n❌  FAL_KEY no encontrado.\n'); process.exit(1); }
fal.config({ credentials: FAL_KEY });

const inputFile = process.argv[2] ?? "batch_input.json";
const clipsDirName = process.argv[3] ?? "clips/v3";
const inputPath = resolve(process.cwd(), inputFile);
if (!existsSync(inputPath)) { console.error(`\n❌  No se encontró: ${inputPath}\n`); process.exit(1); }

let shots;
try { shots = JSON.parse(readFileSync(inputPath, "utf-8")); }
catch (e) { console.error(`\n❌  No se pudo parsear ${inputFile}: ${e.message}\n`); process.exit(1); }
if (!Array.isArray(shots) || shots.length === 0) { console.error("\n❌  Array vacío.\n"); process.exit(1); }

for (const s of shots) {
  if (!s.n || !s.image_url || !s.prompt) {
    console.error(`\n❌  Toma inválida (n/image_url/prompt): ${JSON.stringify(s)}\n`); process.exit(1);
  }
  s.duration = Number(s.duration ?? 5);
  if (!Number.isInteger(s.duration) || s.duration < 3 || s.duration > 15) {
    console.error(`\n❌  Toma ${s.n}: duration debe ser entero 3–15.\n`); process.exit(1);
  }
}

function truncate(str, n) { return str.length > n ? str.slice(0, n - 1) + "…" : str; }
const totalCost = shots.reduce((sum, s) => sum + COST_PER_SECOND * s.duration, 0);
const SEP = "─".repeat(80), SEP2 = "═".repeat(80);

console.log(`\n${SEP2}`);
console.log("  BATCH KLING 3.0 (v3 Pro) — TABLA DE APROBACIÓN");
console.log(`  Archivo: ${basename(inputFile)}   |   Tomas: ${shots.length}   |   Salida: ${clipsDirName}/`);
console.log(SEP2);
console.log(`  ${"N°".padEnd(5)}${"Dur.".padEnd(6)}${"$/clip".padEnd(9)}Prompt animación`);
console.log(SEP);
for (const s of shots) {
  console.log(`  ${String(s.n).padEnd(5)}${(s.duration + " s").padEnd(6)}${("$" + (COST_PER_SECOND * s.duration).toFixed(2)).padEnd(9)}${truncate(s.prompt, 56)}`);
}
console.log(SEP);
console.log(`  COSTO TOTAL ESTIMADO: $${totalCost.toFixed(2)} USD  ($0.112/s, sin audio)`);
console.log(`${SEP2}\n`);

const rl = createInterface({ input: process.stdin, output: process.stdout });
const confirmed = await new Promise((res) => {
  let answered = false;
  const timer = setTimeout(() => { if (!answered) { answered = true; rl.close(); console.log("\n⏱️  Tiempo agotado. Abortando."); res(false); } }, CONFIRM_TIMEOUT);
  rl.question('  Escribe "OK" y Enter para confirmar: ', (a) => { if (!answered) { answered = true; clearTimeout(timer); rl.close(); res(a.trim().toUpperCase() === "OK"); } });
});
if (!confirmed) { console.log("\n🚫  Cancelado. No se gastaron créditos.\n"); process.exit(0); }

const clipsDir = resolve(process.cwd(), clipsDirName);
mkdirSync(clipsDir, { recursive: true });

function uniquePath(base) {
  if (!existsSync(base)) return base;
  const ext = ".mp4", stem = base.slice(0, -ext.length);
  let i = 1, c; do { c = `${stem}_${i++}${ext}`; } while (existsSync(c));
  return c;
}
async function downloadToFile(url, destPath) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} al descargar ${url}`);
  const finalPath = uniquePath(destPath);
  await pipeline(Readable.fromWeb(r.body), createWriteStream(finalPath));
  return finalPath;
}

console.log(`\n🚀  Enviando ${shots.length} job(s) a Kling 3.0 en paralelo…\n`);
const startedAt = new Date();

let submitted;
try {
  submitted = await Promise.all(shots.map(async (shot) => {
    const { request_id } = await fal.queue.submit(ENDPOINT, {
      input: {
        start_image_url: shot.image_url,
        prompt:          shot.prompt,
        duration:        shot.duration,
        negative_prompt: shot.negative_prompt ?? DEFAULT_NEG,
        cfg_scale:       shot.cfg_scale ?? 0.5,
        generate_audio:  false,
      },
    });
    console.log(`  📤 Toma ${shot.n} → en cola  |  request_id: ${request_id}`);
    return { shot, requestId: request_id };
  }));
} catch (err) { console.error(`\n❌  Error al enviar: ${err.message}`); process.exit(1); }

console.log(`\n⏳  Esperando resultados…\n`);
const results = await Promise.allSettled(submitted.map(async ({ shot, requestId }) => {
  await fal.queue.subscribeToStatus(ENDPOINT, {
    requestId, mode: "polling", pollInterval: POLL_INTERVAL_MS, logs: false,
    onQueueUpdate: (st) => {
      if (st.status === "IN_QUEUE")      process.stdout.write(`  🕐 Toma ${shot.n} — en cola        \r`);
      else if (st.status === "IN_PROGRESS") process.stdout.write(`  🎬 Toma ${shot.n} — procesando…     \r`);
      else if (st.status === "COMPLETED")   process.stdout.write(`  ✅ Toma ${shot.n} — completado.     \r`);
    },
  });
  const result   = await fal.queue.result(ENDPOINT, { requestId });
  const videoUrl = result?.data?.video?.url;
  if (!videoUrl) throw new Error(`Toma ${shot.n}: sin data.video.url. ${JSON.stringify(result?.data)}`);
  const savedPath = await downloadToFile(videoUrl, join(clipsDir, `raw_${shot.n}.mp4`));
  const costUsd   = COST_PER_SECOND * shot.duration;
  process.stdout.write(" ".repeat(60) + "\r");
  console.log(`  ✅ Toma ${shot.n} → ${savedPath}  ($${costUsd.toFixed(2)})`);
  return { n: shot.n, status: "COMPLETED", request_id: requestId, video_url: videoUrl,
           saved_path: savedPath, duration_s: shot.duration, cost_usd: costUsd,
           prompt: shot.prompt, image_url: shot.image_url, completed_at: new Date().toISOString() };
}));

const logEntries = results.map((res, i) => {
  if (res.status === "fulfilled") return res.value;
  const shot = submitted[i]?.shot;
  console.error(`\n❌  Error en toma ${shot?.n ?? i + 1}: ${res.reason?.message ?? res.reason}`);
  return { n: shot?.n ?? String(i + 1), status: "FAILED", error: String(res.reason), prompt: shot?.prompt ?? null, image_url: shot?.image_url ?? null, failed_at: new Date().toISOString() };
});
const totalCostReal = logEntries.reduce((s, e) => s + (e.cost_usd ?? 0), 0);
const batchLog = { batch_file: inputFile, model: "kling-v3-pro", started_at: startedAt.toISOString(), ended_at: new Date().toISOString(), total_cost_usd: totalCostReal, shots_total: shots.length, shots_completed: logEntries.filter(e => e.status === "COMPLETED").length, shots_failed: logEntries.filter(e => e.status === "FAILED").length, shots: logEntries };
writeFileSync(join(clipsDir, "batch_log.json"), JSON.stringify(batchLog, null, 2), "utf-8");

console.log(`\n${SEP2}`);
console.log("  LOTE KLING 3.0 COMPLETADO");
console.log(SEP);
console.log(`  Exitosos : ${batchLog.shots_completed} / ${shots.length}`);
if (batchLog.shots_failed) console.log(`  Fallidos : ${batchLog.shots_failed}`);
console.log(`  Costo real: $${totalCostReal.toFixed(2)} USD`);
console.log(`${SEP2}\n`);
if (batchLog.shots_failed) process.exit(1);
