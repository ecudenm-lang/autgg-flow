/**
 * batch_keyframes_kie.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Igual que batch_keyframes_fal.mjs pero usando KIE.AI (nano-banana de Google).
 * Mismo formato de keyframes_input.json y mismas salidas → drop-in del pipeline fal.
 *   - Sin referencia  → model "google/nano-banana"        (text-to-image)
 *   - Con referencia  → model "google/nano-banana-edit"   (image_urls, hasta 10)
 *
 * USO
 *   node batch_keyframes_kie.mjs <keyframes_input.json> [nombre_lote]
 *
 * FORMATO keyframes_input.json  (idéntico al de fal)
 *   [ { "n":"01", "kf_prompt":"…", "kf_ref_urls":null|["https://…"],
 *       "anim_prompt":"…", "duration":"5"|"10" } ]
 *
 * SALIDA (idéntica al de fal)
 *   assets/<lote>/kf_<n>.png   ·  config/kf_map_<lote>.json  ·  config/batch_input_<lote>.json
 *
 * API KIE.AI: POST /jobs/createTask {model, input:{prompt, image_urls?, aspect_ratio, output_format}}
 *             GET  /jobs/recordInfo?taskId=… → resultJson(STRING).resultUrls[0]
 * VARIABLE DE ENTORNO: KIE_API_KEY
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { createInterface } from "readline";
import { existsSync, mkdirSync, createWriteStream, readFileSync, writeFileSync } from "fs";
import { join, resolve, basename } from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";

const BASE = "https://api.kie.ai/api/v1/jobs";
const T2I = "google/nano-banana";
const EDIT = "google/nano-banana-edit";
const CREDIT_USD = 0.005;
const POLL_INTERVAL_MS = 4_000;
const POLL_TIMEOUT_MS = 5 * 60_000;
const CONFIRM_TIMEOUT = 30_000;

const KEY = process.env.KIE_API_KEY;
if (!KEY) { console.error('\n❌  KIE_API_KEY no encontrado.\n    Carga tu .env:  . .\\load_env.ps1   (o setea a mano:  $env:KIE_API_KEY = "tu-clave")\n'); process.exit(1); }

const inputFile = process.argv[2] ?? "keyframes_input.json";
const lote = process.argv[3] ?? "lote";
const inputPath = resolve(process.cwd(), inputFile);
if (!existsSync(inputPath)) { console.error(`\n❌  No se encontró: ${inputPath}\n`); process.exit(1); }

let shots;
try { shots = JSON.parse(readFileSync(inputPath, "utf-8")); }
catch (e) { console.error(`\n❌  No se pudo parsear ${inputFile}: ${e.message}\n`); process.exit(1); }
if (!Array.isArray(shots) || !shots.length) { console.error("\n❌  Array vacío.\n"); process.exit(1); }
for (const s of shots) {
  if (!s.n || !s.kf_prompt) { console.error(`\n❌  Toma inválida (n/kf_prompt): ${JSON.stringify(s)}\n`); process.exit(1); }
  s.duration = String(s.duration ?? "5");
  if (s.kf_ref_urls != null && !Array.isArray(s.kf_ref_urls)) { console.error(`\n❌  Toma ${s.n}: kf_ref_urls null o array.\n`); process.exit(1); }
}

const truncate = (str, n) => str.length > n ? str.slice(0, n - 1) + "…" : str;
const SEP = "─".repeat(86), SEP2 = "═".repeat(86);

console.log(`\n${SEP2}`);
console.log("  BATCH KEYFRAMES — NANO BANANA vía KIE.AI");
console.log(`  Archivo: ${basename(inputFile)}   |   Lote: ${lote}   |   Tomas: ${shots.length}`);
console.log(SEP2);
console.log(`  ${"N°".padEnd(5)}${"Modo".padEnd(8)}${"Refs".padEnd(6)}Prompt keyframe`);
console.log(SEP);
for (const s of shots) {
  const isEdit = Array.isArray(s.kf_ref_urls) && s.kf_ref_urls.length > 0;
  console.log(`  ${String(s.n).padEnd(5)}${(isEdit ? "edit" : "t2i").padEnd(8)}${String(isEdit ? s.kf_ref_urls.length : 0).padEnd(6)}${truncate(s.kf_prompt, 50)}`);
}
console.log(SEP);
console.log(`  Costo: por créditos (creditsConsumed). Lo reporto real al terminar (~$${CREDIT_USD}/crédito).`);
console.log(`${SEP2}\n`);

const rl = createInterface({ input: process.stdin, output: process.stdout });
const confirmed = await new Promise((res) => {
  let answered = false;
  const timer = setTimeout(() => { if (!answered) { answered = true; rl.close(); console.log("\n⏱️  Tiempo agotado. Abortando."); res(false); } }, CONFIRM_TIMEOUT);
  rl.question('  Escribe "OK" y Enter para confirmar: ', (a) => { if (!answered) { answered = true; clearTimeout(timer); rl.close(); res(a.trim().toUpperCase() === "OK"); } });
});
if (!confirmed) { console.log("\n🚫  Cancelado.\n"); process.exit(0); }

const assetsDir = resolve(process.cwd(), "assets", lote);
mkdirSync(assetsDir, { recursive: true });
mkdirSync(resolve(process.cwd(), "config"), { recursive: true });

function uniquePath(base) {
  if (!existsSync(base)) return base;
  const ext = ".png", stem = base.slice(0, -ext.length);
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

async function createTask(s) {
  const isEdit = Array.isArray(s.kf_ref_urls) && s.kf_ref_urls.length > 0;
  const input = {
    prompt: s.kf_prompt,
    aspect_ratio: "9:16",
    output_format: "png",
    ...(isEdit ? { image_urls: s.kf_ref_urls } : {}),
  };
  const body = JSON.stringify({ model: isEdit ? EDIT : T2I, input });
  let lastMsg = "";
  for (let att = 1; att <= 6; att++) {
    // stagger + backoff con jitter: reparte los edits concurrentes que kie rechaza con 500
    await sleep(Math.floor(Math.random() * 1200) + (att - 1) * 4000);
    try {
      const r = await fetch(`${BASE}/createTask`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${KEY}`, "Content-Type": "application/json" },
        body,
      });
      const j = await r.json();
      const taskId = j?.data?.taskId ?? j?.data?.task_id;
      if (taskId) return { taskId, isEdit };
      lastMsg = `code=${j?.code} msg=${j?.msg}`;
    } catch (e) { lastMsg = e.message; }
  }
  throw new Error(`createTask sin taskId tras reintentos (${lastMsg})`);
}
async function pollTask(taskId, n) {
  const t0 = Date.now();
  while (Date.now() - t0 < POLL_TIMEOUT_MS) {
    const r = await fetch(`${BASE}/recordInfo?taskId=${encodeURIComponent(taskId)}`, { headers: { "Authorization": `Bearer ${KEY}` } });
    const j = await r.json();
    const d = j?.data ?? {};
    if (d.state === "success") {
      const parsed = JSON.parse(d.resultJson || "{}");
      const url = parsed?.resultUrls?.[0];
      if (!url) throw new Error(`Toma ${n}: success sin resultUrls. ${d.resultJson}`);
      return { url, credits: d.creditsConsumed ?? null };
    }
    if (d.state === "fail") throw new Error(`Toma ${n}: fail (${d.failCode}) ${d.failMsg}`);
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error(`Toma ${n}: timeout`);
}

console.log(`\n🚀  Generando ${shots.length} keyframe(s) en KIE.AI…\n`);
const results = await Promise.allSettled(shots.map(async (s) => {
  const { taskId, isEdit } = await createTask(s);
  const { url, credits } = await pollTask(taskId, s.n);
  const localPath = await downloadToFile(url, join(assetsDir, `kf_${s.n}.png`));
  console.log(`  ✅ Toma ${s.n} (${isEdit ? "edit" : "t2i"}) → ${basename(localPath)}  |  ${credits ?? "?"} créditos  |  ${url}`);
  return { n: s.n, url, anim: s.anim_prompt ?? "", duration: s.duration, credits };
}));

const mapPath = resolve(process.cwd(), "config", `kf_map_${lote}.json`);
const batchPath = resolve(process.cwd(), "config", `batch_input_${lote}.json`);
const kfMap = existsSync(mapPath) ? JSON.parse(readFileSync(mapPath, "utf-8")) : {};
let batchIn = existsSync(batchPath) ? JSON.parse(readFileSync(batchPath, "utf-8")) : [];
const batchByN = new Map(batchIn.map(b => [b.n, b]));

const errors = []; let totalCredits = 0;
for (let i = 0; i < results.length; i++) {
  const r = results[i];
  if (r.status === "fulfilled") {
    const v = r.value; kfMap[v.n] = v.url; totalCredits += v.credits ?? 0;
    if (v.anim) batchByN.set(v.n, { n: v.n, image_url: v.url, prompt: v.anim, duration: Number(v.duration) });
  } else {
    const n = shots[i]?.n ?? String(i + 1);
    console.error(`\n❌  Toma ${n}: ${r.reason?.message ?? r.reason}`);
    errors.push(n);
  }
}
batchIn = [...batchByN.values()].sort((a, b) => Number(a.n) - Number(b.n));
writeFileSync(mapPath, JSON.stringify(kfMap, null, 2));
writeFileSync(batchPath, JSON.stringify(batchIn, null, 2));

console.log(`\n${SEP2}`);
console.log("  KEYFRAMES COMPLETADOS (KIE.AI)");
console.log(SEP);
console.log(`  Exitosos : ${shots.length - errors.length} / ${shots.length}`);
if (errors.length) console.log(`  Fallidos : ${errors.join(", ")}`);
console.log(`  Créditos : ${totalCredits}  (~$${(totalCredits * CREDIT_USD).toFixed(3)})`);
console.log(`  Mapa URLs   → ${basename(mapPath)}`);
console.log(`  batch_input → ${basename(batchPath)}`);
console.log(`${SEP2}\n`);
if (errors.length) process.exit(1);
