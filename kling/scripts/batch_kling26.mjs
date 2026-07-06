/**
 * batch_kling26.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Anima keyframes con KLING 2.6 Pro image-to-video en fal — gemelo de
 * batch_kling3.mjs (Kling 3.0) para COMPARAR la misma toma en ambos modelos.
 * batch_kling3.mjs queda intacto: este es un script aparte.
 *
 * USO
 *   node batch_kling26.mjs [batch_input.json] [clips_dir]
 *   ej:  node batch_kling26.mjs batch_input_v4.json clips_v4_k26
 *        (reusa los mismos keyframes/prompts del V4; sale a clips_v4_k26/,
 *         NO toca clips_v4/ que tiene los de Kling 3.0)
 *
 * FORMATO batch_input.json  (el MISMO que usa batch_kling3.mjs)
 *   [ { "n":"01", "image_url":"https://…", "prompt":"…", "duration":6 } ]
 *
 * DIFERENCIAS vs 3.0 (batch_kling3.mjs):
 *   - endpoint  fal-ai/kling-video/v2.6/pro/image-to-video
 *   - campo de imagen: image_url  (NO start_image_url como en 3.0)
 *   - duration: SOLO "5" o "10" (string). Los enteros del JSON se MAPEAN
 *     automáticamente: ≤5 → "5", >5 → "10". El mapeo se muestra en la tabla.
 *   - precio: $0.07/s sin audio  → $0.35 (5s) / $0.70 (10s).  (3.0 = $0.112/s)
 *
 * VARIABLES DE ENTORNO:  FAL_KEY
 * SALIDA: <clips_dir>/raw_<n>.mp4 (default clips_v26/) + <clips_dir>/batch_log.json
 *         No sobreescribe: si raw_<n>.mp4 existe, añade sufijo _1, _2…
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

const ENDPOINT         = "fal-ai/kling-video/v2.6/pro/image-to-video";
const COST_PER_SECOND  = 0.07;           // USD/s, Kling 2.6 Pro sin audio
const POLL_INTERVAL_MS = 5_000;
const CONFIRM_TIMEOUT  = 30_000;

const FAL_KEY = process.env.FAL_KEY;
if (!FAL_KEY) {
  console.error('\n❌  FAL_KEY no encontrado.\n    $env:FAL_KEY = "tu-clave"   (PowerShell)\n');
  process.exit(1);
}
fal.config({ credentials: FAL_KEY });

const inputFile    = process.argv[2] ?? "batch_input.json";
const clipsDirName = process.argv[3] ?? "clips/v26";
const inputPath    = resolve(process.cwd(), inputFile);
if (!existsSync(inputPath)) { console.error(`\n❌  No se encontró: ${inputPath}\n`); process.exit(1); }

let shots;
try { shots = JSON.parse(readFileSync(inputPath, "utf-8")); }
catch (e) { console.error(`\n❌  No se pudo parsear ${inputFile}: ${e.message}\n`); process.exit(1); }
if (!Array.isArray(shots) || shots.length === 0) { console.error("\n❌  Array vacío.\n"); process.exit(1); }

// Validar campos y MAPEAR duration a "5"/"10" (2.6 solo soporta esos dos).
for (const s of shots) {
  if (!s.n || !s.image_url || !s.prompt) {
    console.error(`\n❌  Toma inválida (n/image_url/prompt): ${JSON.stringify(s)}\n`); process.exit(1);
  }
  s.duration_req = s.duration;                       // lo pedido en el JSON (puede ser entero)
  const n = Number(s.duration ?? 5);
  if (!Number.isFinite(n)) { console.error(`\n❌  Toma ${s.n}: duration no numérico.\n`); process.exit(1); }
  s.duration = n <= 5 ? "5" : "10";                  // lo que acepta Kling 2.6
}

function truncate(str, n) { return str.length > n ? str.slice(0, n - 1) + "…" : str; }
const totalCost = shots.reduce((sum, s) => sum + COST_PER_SECOND * Number(s.duration), 0);
const SEP = "─".repeat(80), SEP2 = "═".repeat(80);

console.log(`\n${SEP2}`);
console.log("  BATCH KLING 2.6 PRO — TABLA DE APROBACIÓN");
console.log(`  Archivo: ${basename(inputFile)}   |   Tomas: ${shots.length}   |   Salida: ${clipsDirName}/`);
console.log(SEP2);
console.log(`  ${"N°".padEnd(5)}${"Pedido".padEnd(8)}${"→ 2.6".padEnd(7)}${"$/clip".padEnd(9)}Prompt animación`);
console.log(SEP);
for (const s of shots) {
  const req = (s.duration_req != null ? String(s.duration_req) + "s" : "—");
  console.log(
    `  ${String(s.n).padEnd(5)}` +
    `${req.padEnd(8)}` +
    `${(s.duration + "s").padEnd(7)}` +
    `${("$" + (COST_PER_SECOND * Number(s.duration)).toFixed(2)).padEnd(9)}` +
    truncate(s.prompt, 50)
  );
}
console.log(SEP);
console.log(`  COSTO TOTAL ESTIMADO: $${totalCost.toFixed(2)} USD  ($0.07/s, sin audio)`);
console.log(`  (Kling 2.6 solo genera 5s o 10s; los enteros del JSON se mapearon: ≤5→5s, >5→10s.)`);
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

console.log(`\n🚀  Enviando ${shots.length} job(s) a Kling 2.6 Pro en paralelo…\n`);
const startedAt = new Date();

let submitted;
try {
  submitted = await Promise.all(shots.map(async (shot) => {
    const { request_id } = await fal.queue.submit(ENDPOINT, {
      input: {
        image_url:      shot.image_url,
        prompt:         shot.prompt,
        duration:       shot.duration,
        negative_prompt: shot.negative_prompt ?? undefined,
        cfg_scale:      shot.cfg_scale ?? undefined,
        generate_audio: false,
      },
    });
    console.log(`  📤 Toma ${shot.n} → en cola  |  request_id: ${request_id}`);
    return { shot, requestId: request_id };
  }));
} catch (err) { console.error(`\n❌  Error al enviar: ${err.message}`); process.exit(1); }

console.log(`\n⏳  Esperando resultados (polling cada ${POLL_INTERVAL_MS / 1000}s)…\n`);
const results = await Promise.allSettled(submitted.map(async ({ shot, requestId }) => {
  await fal.queue.subscribeToStatus(ENDPOINT, {
    requestId, mode: "polling", pollInterval: POLL_INTERVAL_MS, logs: false,
    onQueueUpdate: (st) => {
      if (st.status === "IN_QUEUE")         process.stdout.write(`  🕐 Toma ${shot.n} — en cola        \r`);
      else if (st.status === "IN_PROGRESS") process.stdout.write(`  🎬 Toma ${shot.n} — procesando…     \r`);
      else if (st.status === "COMPLETED")   process.stdout.write(`  ✅ Toma ${shot.n} — completado.     \r`);
    },
  });
  const result   = await fal.queue.result(ENDPOINT, { requestId });
  const videoUrl = result?.data?.video?.url;
  if (!videoUrl) throw new Error(`Toma ${shot.n}: sin data.video.url. ${JSON.stringify(result?.data)}`);
  const savedPath = await downloadToFile(videoUrl, join(clipsDir, `raw_${shot.n}.mp4`));
  const costUsd   = COST_PER_SECOND * Number(shot.duration);
  process.stdout.write(" ".repeat(60) + "\r");
  console.log(`  ✅ Toma ${shot.n} → ${savedPath}  ($${costUsd.toFixed(2)})`);
  return { n: shot.n, status: "COMPLETED", request_id: requestId, video_url: videoUrl,
           saved_path: savedPath, duration_s: Number(shot.duration), duration_req: shot.duration_req ?? null,
           cost_usd: costUsd, prompt: shot.prompt, image_url: shot.image_url, completed_at: new Date().toISOString() };
}));

const logEntries = results.map((res, i) => {
  if (res.status === "fulfilled") return res.value;
  const shot = submitted[i]?.shot;
  console.error(`\n❌  Error en toma ${shot?.n ?? i + 1}: ${res.reason?.message ?? res.reason}`);
  return { n: shot?.n ?? String(i + 1), status: "FAILED", error: String(res.reason), prompt: shot?.prompt ?? null, image_url: shot?.image_url ?? null, failed_at: new Date().toISOString() };
});
const totalCostReal = logEntries.reduce((s, e) => s + (e.cost_usd ?? 0), 0);
const batchLog = { batch_file: inputFile, model: "kling-v2.6-pro", started_at: startedAt.toISOString(), ended_at: new Date().toISOString(), total_cost_usd: totalCostReal, shots_total: shots.length, shots_completed: logEntries.filter(e => e.status === "COMPLETED").length, shots_failed: logEntries.filter(e => e.status === "FAILED").length, shots: logEntries };
writeFileSync(join(clipsDir, "batch_log.json"), JSON.stringify(batchLog, null, 2), "utf-8");

console.log(`\n${SEP2}`);
console.log("  LOTE KLING 2.6 PRO COMPLETADO");
console.log(SEP);
console.log(`  Exitosos : ${batchLog.shots_completed} / ${shots.length}`);
if (batchLog.shots_failed) console.log(`  Fallidos : ${batchLog.shots_failed}  ← revisar ${clipsDirName}/batch_log.json`);
console.log(`  Costo real: $${totalCostReal.toFixed(2)} USD`);
console.log(`${SEP2}\n`);
if (batchLog.shots_failed) process.exit(1);
