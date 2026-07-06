/**
 * batch_kling3_kie.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Igual que batch_kling3.mjs pero usando KIE.AI en vez de fal para Kling 3.0.
 * Mismo formato de batch_input.json → intercambiable con el pipeline fal.
 *
 * USO
 *   node batch_kling3_kie.mjs [batch_input.json] [clips_dir] [mode]
 *   mode: "std" (720p, default, más barato) | "pro" (1080p) | "4K"
 *
 * FORMATO batch_input.json  (mismo que fal)
 *   [ { "n":"01", "image_url":"https://…", "prompt":"…", "duration":5|10 } ]
 *
 * API KIE.AI:
 *   - POST https://api.kie.ai/api/v1/jobs/createTask
 *       body: { model:"kling-3.0/video", input:{ prompt, image_urls:[url],
 *               duration:"5", aspect_ratio:"9:16", mode:"std", sound:false } }
 *       → data.taskId
 *   - GET  https://api.kie.ai/api/v1/jobs/recordInfo?taskId=…
 *       → data.state (waiting|queuing|generating|success|fail)
 *         data.resultJson  = STRING JSON → parse → resultUrls[0]
 *         data.creditsConsumed = créditos reales (≈ $0.005/crédito)
 *
 * VARIABLE DE ENTORNO:  KIE_API_KEY
 * SALIDA: <clips_dir>/raw_<n>.mp4 + <clips_dir>/batch_log_kie.json
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { createInterface } from "readline";
import { existsSync, mkdirSync, createWriteStream, readFileSync, writeFileSync } from "fs";
import { join, resolve, basename } from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";

const BASE = "https://api.kie.ai/api/v1/jobs";
const MODEL = "kling-3.0/video";
const CREDIT_USD = 0.005;            // ≈ conversión kie.ai ($0.005/crédito) — el costo REAL sale de creditsConsumed
const POLL_INTERVAL_MS = 5_000;
const POLL_TIMEOUT_MS = 10 * 60_000;
const CONFIRM_TIMEOUT = 30_000;

const KEY = process.env.KIE_API_KEY;
if (!KEY) { console.error('\n❌  KIE_API_KEY no encontrado.\n    $env:KIE_API_KEY = "tu-clave"\n'); process.exit(1); }

const inputFile = process.argv[2] ?? "batch_input.json";
const clipsDirName = process.argv[3] ?? "clips/kie";
const MODE = (process.argv[4] ?? "std").toLowerCase();
const inputPath = resolve(process.cwd(), inputFile);
if (!existsSync(inputPath)) { console.error(`\n❌  No se encontró: ${inputPath}\n`); process.exit(1); }

let shots;
try { shots = JSON.parse(readFileSync(inputPath, "utf-8")); }
catch (e) { console.error(`\n❌  No se pudo parsear ${inputFile}: ${e.message}\n`); process.exit(1); }
if (!Array.isArray(shots) || !shots.length) { console.error("\n❌  Array vacío.\n"); process.exit(1); }
for (const s of shots) {
  if (!s.n || !s.image_url || !s.prompt) { console.error(`\n❌  Toma inválida (n/image_url/prompt): ${JSON.stringify(s)}\n`); process.exit(1); }
  s.duration = Number(s.duration ?? 5);
  if (!Number.isInteger(s.duration) || s.duration < 3 || s.duration > 15) { console.error(`\n❌  Toma ${s.n}: duration entero 3–15.\n`); process.exit(1); }
}

const truncate = (str, n) => str.length > n ? str.slice(0, n - 1) + "…" : str;
const SEP = "─".repeat(80), SEP2 = "═".repeat(80);

console.log(`\n${SEP2}`);
console.log(`  BATCH KLING 3.0 vía KIE.AI — mode: ${MODE}`);
console.log(`  Archivo: ${basename(inputFile)}   |   Tomas: ${shots.length}   |   Salida: ${clipsDirName}/`);
console.log(SEP2);
console.log(`  ${"N°".padEnd(5)}${"Dur.".padEnd(6)}Prompt animación`);
console.log(SEP);
for (const s of shots) console.log(`  ${String(s.n).padEnd(5)}${(s.duration + " s").padEnd(6)}${truncate(s.prompt, 60)}`);
console.log(SEP);
console.log(`  Costo: se cobra por créditos (creditsConsumed). Lo reporto real al terminar (~$${CREDIT_USD}/crédito).`);
console.log(`${SEP2}\n`);

const rl = createInterface({ input: process.stdin, output: process.stdout });
const confirmed = await new Promise((res) => {
  let answered = false;
  const timer = setTimeout(() => { if (!answered) { answered = true; rl.close(); console.log("\n⏱️  Tiempo agotado. Abortando."); res(false); } }, CONFIRM_TIMEOUT);
  rl.question('  Escribe "OK" y Enter para confirmar: ', (a) => { if (!answered) { answered = true; clearTimeout(timer); rl.close(); res(a.trim().toUpperCase() === "OK"); } });
});
if (!confirmed) { console.log("\n🚫  Cancelado.\n"); process.exit(0); }

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
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function createTask(shot) {
  const body = {
    model: MODEL,
    input: {
      prompt: shot.prompt,
      image_urls: [shot.image_url],
      duration: String(shot.duration),
      aspect_ratio: "9:16",
      mode: MODE,
      sound: false,
      multi_shots: false,
    },
  };
  const r = await fetch(`${BASE}/createTask`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  const taskId = j?.data?.taskId ?? j?.data?.task_id;
  if (!taskId) throw new Error(`createTask sin taskId (code=${j?.code} msg=${j?.msg}): ${JSON.stringify(j).slice(0,300)}`);
  return taskId;
}

async function pollTask(taskId, n) {
  const t0 = Date.now();
  while (Date.now() - t0 < POLL_TIMEOUT_MS) {
    const r = await fetch(`${BASE}/recordInfo?taskId=${encodeURIComponent(taskId)}`, {
      headers: { "Authorization": `Bearer ${KEY}` },
    });
    const j = await r.json();
    const d = j?.data ?? {};
    const state = d.state;
    if (state === "success") {
      const parsed = JSON.parse(d.resultJson || "{}");
      const url = parsed?.resultUrls?.[0];
      if (!url) throw new Error(`Toma ${n}: success pero sin resultUrls. ${d.resultJson}`);
      return { url, credits: d.creditsConsumed ?? null, costTime: d.costTime ?? null };
    }
    if (state === "fail") throw new Error(`Toma ${n}: fail (${d.failCode}) ${d.failMsg}`);
    process.stdout.write(`  🎬 Toma ${n} — ${state} (${Math.round((Date.now()-t0)/1000)}s)        \r`);
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error(`Toma ${n}: timeout tras ${POLL_TIMEOUT_MS/1000}s`);
}

console.log(`\n🚀  Enviando ${shots.length} job(s) a KIE.AI (Kling 3.0, ${MODE})…\n`);
const startedAt = new Date();

const submitted = [];
for (const shot of shots) {
  try {
    const taskId = await createTask(shot);
    console.log(`  📤 Toma ${shot.n} → taskId: ${taskId}`);
    submitted.push({ shot, taskId });
  } catch (e) { console.error(`  ❌ Toma ${shot.n} createTask: ${e.message}`); }
}

console.log(`\n⏳  Esperando resultados…\n`);
const results = await Promise.allSettled(submitted.map(async ({ shot, taskId }) => {
  const { url, credits, costTime } = await pollTask(taskId, shot.n);
  const saved = await downloadToFile(url, join(clipsDir, `raw_${shot.n}.mp4`));
  process.stdout.write(" ".repeat(60) + "\r");
  const usd = credits != null ? (credits * CREDIT_USD) : null;
  console.log(`  ✅ Toma ${shot.n} → ${basename(saved)}  |  ${credits ?? "?"} créditos${usd != null ? ` (~$${usd.toFixed(3)})` : ""}  |  ${costTime ? (costTime/1000)+"s" : ""}`);
  return { n: shot.n, taskId, video_url: url, saved_path: saved, credits, usd, duration_s: shot.duration };
}));

const logEntries = results.map((res, i) => res.status === "fulfilled" ? res.value
  : { n: submitted[i]?.shot?.n, status: "FAILED", error: String(res.reason?.message ?? res.reason) });
const totalCredits = logEntries.reduce((s, e) => s + (e.credits ?? 0), 0);
const totalUsd = logEntries.reduce((s, e) => s + (e.usd ?? 0), 0);
writeFileSync(join(clipsDir, "batch_log_kie.json"), JSON.stringify({
  provider: "kie.ai", model: MODEL, mode: MODE, started_at: startedAt.toISOString(),
  ended_at: new Date().toISOString(), total_credits: totalCredits, total_usd: totalUsd, shots: logEntries,
}, null, 2));

console.log(`\n${SEP2}`);
console.log("  LOTE KIE.AI COMPLETADO");
console.log(SEP);
console.log(`  Exitosos : ${logEntries.filter(e => !e.status).length} / ${shots.length}`);
console.log(`  Créditos totales: ${totalCredits}  (~$${totalUsd.toFixed(3)} a $${CREDIT_USD}/crédito)`);
console.log(`${SEP2}\n`);
