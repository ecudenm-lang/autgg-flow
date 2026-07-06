/**
 * batch_keyframes.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Genera TODOS los keyframes del shotlist EN PARALELO con nano-banana-2 vía PiAPI,
 * los descarga a assets/, los sube a fal storage CDN, y escribe batch_input.json
 * listo para pasarle a batch_piapi.mjs (Kling 3.0 video generation).
 *
 * USO
 *   node batch_keyframes.mjs [keyframes_input.json]
 *
 * FORMATO keyframes_input.json
 *   [
 *     {
 *       "n":           "01",
 *       "kf_prompt":   "descripción del keyframe + ANCLA",
 *       "kf_ref_url":  null | "https://…",   ← imagen referencia (toma de producto)
 *       "anim_prompt": "prompt de animación para Kling",
 *       "duration":    5,
 *       "resolution":  "720p"
 *     },
 *     {
 *       "n":           "07",
 *       "copy_kf_from": "06",               ← reutiliza keyframe de otra toma
 *       "anim_prompt": "…",
 *       "duration":    4,
 *       "resolution":  "720p"
 *     }
 *   ]
 *
 * VARIABLES DE ENTORNO
 *   PIAPI_KEY — para nano-banana-2 (generación de keyframes)
 *   FAL_KEY   — para fal storage upload (obtener CDN URLs permanentes)
 *
 * SALIDA
 *   assets/kf_<n>_<timestamp>.png → cada keyframe descargado localmente
 *   batch_input.json              → listo para batch_piapi.mjs
 *
 * COSTO
 *   $0.06 por keyframe nuevo (nano-banana-2 a 1K)
 *   Los copy_kf_from no cuestan — reutilizan la URL CDN de la toma origen.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import axios               from "axios";
import { fal }             from "@fal-ai/client";
import { createInterface } from "readline";
import {
  existsSync, mkdirSync,
  createWriteStream, readFileSync, writeFileSync,
} from "fs";
import { join, resolve, basename } from "path";
import { Readable }        from "stream";
import { pipeline }        from "stream/promises";

// ─── Constantes ───────────────────────────────────────────────────────────────
const PIAPI_BASE_URL   = "https://api.piapi.ai/api/v1";
const POLL_INTERVAL_MS = 4_000;
const TASK_TIMEOUT_MS  = 5 * 60 * 1_000;
const CONFIRM_TIMEOUT  = 30_000;
const KF_COST          = 0.06;   // nano-banana-2 a 1K

// ─── Keys ─────────────────────────────────────────────────────────────────────
const PIAPI_KEY = process.env.PIAPI_KEY;
if (!PIAPI_KEY) {
  console.error("\n❌  PIAPI_KEY no encontrado.\n    $env:PIAPI_KEY = \"tu-clave\"\n");
  process.exit(1);
}

const FAL_KEY = process.env.FAL_KEY;
if (!FAL_KEY) {
  console.error("\n❌  FAL_KEY no encontrado (necesaria para subir keyframes a CDN).\n    $env:FAL_KEY = \"tu-clave\"\n");
  process.exit(1);
}

fal.config({ credentials: FAL_KEY });

const api = axios.create({
  baseURL: PIAPI_BASE_URL,
  headers: { "x-api-key": PIAPI_KEY, "Content-Type": "application/json" },
});

// ─── Archivo de entrada ────────────────────────────────────────────────────────
const inputFile = process.argv[2] ?? "keyframes_input.json";
const inputPath = resolve(process.cwd(), inputFile);

if (!existsSync(inputPath)) {
  console.error(`\n❌  No se encontró: ${inputPath}\n`);
  process.exit(1);
}

let shots;
try {
  shots = JSON.parse(readFileSync(inputPath, "utf-8"));
} catch (e) {
  console.error(`\n❌  No se pudo parsear ${inputFile}:\n    ${e.message}\n`);
  process.exit(1);
}

if (!Array.isArray(shots) || shots.length === 0) {
  console.error("\n❌  El JSON debe ser un array con al menos una toma.\n");
  process.exit(1);
}

// ─── Validar y normalizar ─────────────────────────────────────────────────────
for (const shot of shots) {
  if (!shot.n || !shot.anim_prompt) {
    console.error(`\n❌  Toma inválida — faltan n o anim_prompt:\n    ${JSON.stringify(shot)}\n`);
    process.exit(1);
  }
  const isCopy = Boolean(shot.copy_kf_from);
  if (!isCopy && !shot.kf_prompt) {
    console.error(`\n❌  Toma ${shot.n}: falta kf_prompt (o usá copy_kf_from).\n`);
    process.exit(1);
  }
  shot.duration   = Number(shot.duration ?? 5);
  shot.resolution = shot.resolution ?? "720p";
  if (!Number.isInteger(shot.duration) || shot.duration < 3 || shot.duration > 15) {
    console.error(`\n❌  Toma ${shot.n}: duration debe ser entero 3–15 (recibido: ${shot.duration}).\n`);
    process.exit(1);
  }
  if (!["720p", "1080p"].includes(shot.resolution)) {
    console.error(`\n❌  Toma ${shot.n}: resolution debe ser "720p" o "1080p".\n`);
    process.exit(1);
  }
}

// Validar que todas las copy_kf_from apunten a n existentes
const nSet = new Set(shots.map(s => s.n));
for (const shot of shots) {
  if (shot.copy_kf_from && !nSet.has(shot.copy_kf_from)) {
    console.error(`\n❌  Toma ${shot.n}: copy_kf_from="${shot.copy_kf_from}" no existe.\n`);
    process.exit(1);
  }
}

// ─── Tabla de aprobación ──────────────────────────────────────────────────────
function truncate(str, maxLen) {
  return str.length > maxLen ? str.slice(0, maxLen - 1) + "…" : str;
}

const newShots  = shots.filter(s => !s.copy_kf_from);
const copyShots = shots.filter(s =>  s.copy_kf_from);
const totalKfCost = newShots.length * KF_COST;

const SEP  = "─".repeat(86);
const SEP2 = "═".repeat(86);

console.log(`\n${SEP2}`);
console.log("  BATCH KEYFRAMES — nano-banana-2 → fal CDN → batch_input.json");
console.log(`  Archivo: ${basename(inputFile)}   |   Tomas: ${shots.length}   |   Nuevos keyframes: ${newShots.length}   |   Reutilizados: ${copyShots.length}`);
console.log(SEP2);
console.log(
  `  ${"N°".padEnd(5)}` +
  `${"Tipo".padEnd(12)}` +
  `${"Ref".padEnd(6)}` +
  `${"$/kf".padEnd(8)}` +
  `Prompt keyframe`
);
console.log(SEP);

for (const shot of shots) {
  const isCopy = Boolean(shot.copy_kf_from);
  const tipo   = isCopy ? `REUSA → ${shot.copy_kf_from}` : "GENERA";
  const ref    = (!isCopy && shot.kf_ref_url) ? "IMG" : "—";
  const cost   = isCopy ? "—" : `$${KF_COST.toFixed(2)}`;
  const prompt = isCopy ? `(mismo keyframe que toma ${shot.copy_kf_from})` : truncate(shot.kf_prompt, 48);
  console.log(
    `  ${String(shot.n).padEnd(5)}` +
    `${tipo.padEnd(12)}` +
    `${ref.padEnd(6)}` +
    `${cost.padEnd(8)}` +
    prompt
  );
}

console.log(SEP);
console.log(`  COSTO KEYFRAMES: $${totalKfCost.toFixed(2)} USD  (${newShots.length} × $${KF_COST.toFixed(2)})`);
console.log(`  Salida: assets/kf_<n>.png  +  batch_input.json`);
console.log(`${SEP2}\n`);

// ─── Confirmación ─────────────────────────────────────────────────────────────
const rl = createInterface({ input: process.stdin, output: process.stdout });

const confirmed = await new Promise((res) => {
  let answered = false;
  const timer = setTimeout(() => {
    if (!answered) {
      answered = true; rl.close();
      process.stdout.write("\n");
      console.log("⏱️  Tiempo agotado (30 s). Abortando.");
      res(false);
    }
  }, CONFIRM_TIMEOUT);

  rl.question('  Escribe "OK" y Enter para confirmar: ', (ans) => {
    if (!answered) {
      answered = true; clearTimeout(timer); rl.close();
      res(ans.trim().toUpperCase() === "OK");
    }
  });
});

if (!confirmed) {
  console.log("\n🚫  Cancelado. No se gastaron créditos.\n");
  process.exit(0);
}

// ─── Directorio de salida ─────────────────────────────────────────────────────
const assetsDir = resolve(process.cwd(), "assets");
mkdirSync(assetsDir, { recursive: true });

// ─── Helpers ──────────────────────────────────────────────────────────────────
function uniquePath(base) {
  if (!existsSync(base)) return base;
  const ext = ".png";
  const stem = base.slice(0, -ext.length);
  let i = 1, c;
  do { c = `${stem}_${i++}${ext}`; } while (existsSync(c));
  return c;
}

async function downloadToFile(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} al descargar ${url}`);
  const finalPath = uniquePath(destPath);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(finalPath));
  return finalPath;
}

async function uploadToFal(localPath) {
  const buffer = readFileSync(localPath);
  const blob   = new Blob([buffer], { type: "image/png" });
  return await fal.storage.upload(blob);
}

// ─── Polling nano-banana-2 ────────────────────────────────────────────────────
async function pollTask(taskId, shotN) {
  const deadline = Date.now() + TASK_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    let res;
    try {
      ({ data: res } = await api.get(`/task/${taskId}`));
    } catch (err) {
      process.stdout.write(`  ⚠️  Toma ${shotN} — error de red: ${err.message}\r`);
      continue;
    }
    const status = (res?.data?.status ?? "").toLowerCase();
    if      (status === "pending")    process.stdout.write(`  🕐 Toma ${shotN} — pendiente…                    \r`);
    else if (status === "processing") process.stdout.write(`  🎨 Toma ${shotN} — procesando…                  \r`);
    else if (status === "completed")  { process.stdout.write(`  ✅ Toma ${shotN} — completado.                 \r`); return res.data; }
    else if (status === "failed")     throw new Error(`Task ${taskId} falló: ${res?.data?.error?.message ?? "sin detalle"}`);
    else                              process.stdout.write(`  ❓ Toma ${shotN} — status: "${res?.data?.status}"  \r`);
  }
  throw new Error(`Timeout (5 min) esperando keyframe de toma ${shotN}`);
}

// ─── PASO 1: Generar keyframes nuevos en paralelo ────────────────────────────
console.log(`\n🚀  Generando ${newShots.length} keyframe(s) en paralelo (nano-banana-2)…\n`);

const startedAt = new Date();

let generated;
try {
  generated = await Promise.all(
    newShots.map(async (shot) => {
      const inputObj = {
        prompt:        shot.kf_prompt,
        aspect_ratio:  "9:16",
        output_format: "png",
        resolution:    "1K",
        safety_level:  "high",
        ...(shot.kf_ref_url ? { image_urls: [shot.kf_ref_url] } : {}),
      };

      const { data: res } = await api.post("/task", {
        model:     "gemini",
        task_type: "nano-banana-2",
        input:     inputObj,
      });

      if (res?.code !== 200 || !res?.data?.task_id) {
        throw new Error(`Toma ${shot.n}: respuesta inesperada — ${JSON.stringify(res)}`);
      }

      const taskId = res.data.task_id;
      console.log(`  📤 Toma ${shot.n} → task_id: ${taskId}`);
      return { shot, taskId };
    })
  );
} catch (err) {
  console.error(`\n❌  Error al enviar keyframes: ${err.message}`);
  process.exit(1);
}

// ─── PASO 2: Polling, descarga y upload a fal CDN ────────────────────────────
console.log(`\n⏳  Esperando resultados y subiendo a fal CDN…\n`);

const kfResults = await Promise.allSettled(
  generated.map(async ({ shot, taskId }) => {
    const taskData = await pollTask(taskId, shot.n);

    const output    = taskData?.output ?? {};
    const ephUrl    = output.image_url
      ?? (Array.isArray(output.image_urls) ? output.image_urls[0] : null)
      ?? null;

    if (!ephUrl) throw new Error(`Toma ${shot.n}: sin URL en output. output=${JSON.stringify(output)}`);

    // Descargar localmente
    const localPath = await downloadToFile(ephUrl, join(assetsDir, `kf_${shot.n}.png`));

    // Subir a fal CDN para URL permanente
    process.stdout.write(`  ⬆️  Toma ${shot.n} — subiendo a CDN…                 \r`);
    const cdnUrl = await uploadToFal(localPath);

    process.stdout.write(" ".repeat(65) + "\r");
    console.log(`  ✅ Toma ${shot.n} → ${localPath}  |  CDN: ${cdnUrl}`);

    return { n: shot.n, local_path: localPath, cdn_url: cdnUrl };
  })
);

// ─── PASO 3: Construir mapa n → CDN URL ──────────────────────────────────────
const cdnMap = {};
const kfErrors = [];

kfResults.forEach((res, i) => {
  if (res.status === "fulfilled") {
    cdnMap[res.value.n] = res.value.cdn_url;
  } else {
    const n = generated[i]?.shot?.n ?? String(i + 1);
    console.error(`\n❌  Error en toma ${n}: ${res.reason?.message ?? res.reason}`);
    kfErrors.push(n);
  }
});

// Resolver copy_kf_from
for (const shot of copyShots) {
  const srcN = shot.copy_kf_from;
  if (cdnMap[srcN]) {
    cdnMap[shot.n] = cdnMap[srcN];
    console.log(`  🔁 Toma ${shot.n} → reutiliza CDN de toma ${srcN}`);
  } else {
    console.error(`\n❌  Toma ${shot.n}: copy_kf_from="${srcN}" no tiene CDN URL (la toma origen falló).`);
    kfErrors.push(shot.n);
  }
}

// ─── PASO 4: Escribir batch_input.json ───────────────────────────────────────
const batchInput = shots
  .filter(s => cdnMap[s.n])
  .map(s => ({
    n:          s.n,
    image_url:  cdnMap[s.n],
    prompt:     s.anim_prompt,
    duration:   s.duration,
    resolution: s.resolution,
  }));

const batchInputPath = resolve(process.cwd(), "batch_input.json");
writeFileSync(batchInputPath, JSON.stringify(batchInput, null, 2), "utf-8");

// ─── Resumen ──────────────────────────────────────────────────────────────────
const ok     = shots.length - kfErrors.length;
const failed = kfErrors.length;
const costReal = (shots.length - copyShots.length - failed) * KF_COST;

console.log(`\n${SEP2}`);
console.log("  KEYFRAMES COMPLETADOS");
console.log(SEP);
console.log(`  Exitosos : ${ok} / ${shots.length}`);
if (failed > 0) console.log(`  Fallidos : ${failed}  (${kfErrors.join(", ")}) — NO incluidos en batch_input.json`);
console.log(`  Costo keyframes: $${costReal.toFixed(2)} USD`);
console.log(`  batch_input.json → ${batchInputPath}  (${batchInput.length} tomas listas para Kling)`);
console.log(SEP);
console.log(`  SIGUIENTE PASO:`);
console.log(`    node batch_piapi.mjs batch_input.json`);
console.log(`${SEP2}\n`);

if (failed > 0) process.exit(1);
