/**
 * batch_piapi.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Dispara generaciones de video Kling 3.0 EN PARALELO contra la API de PiAPI.
 * Análogo a batch_kling.mjs (videos-broll / fal.ai), adaptado para PiAPI.
 *
 * USO
 *   node batch_piapi.mjs [batch_input.json]
 *   (por defecto busca batch_input.json en el directorio de trabajo actual)
 *
 * FORMATO batch_input.json
 *   [
 *     {
 *       "n":          "01",                ← nº de toma (string, para el nombre de archivo)
 *       "image_url":  "https://…",         ← URL del keyframe (nano-banana u otro)
 *       "prompt":     "…prompt animación…",
 *       "duration":   5,                   ← opcional: entero 3–15 s (default: 5)
 *       "resolution": "720p"               ← opcional: "720p" | "1080p" (default: "720p")
 *     },
 *     …
 *   ]
 *
 * VARIABLES DE ENTORNO
 *   PIAPI_KEY — clave API de PiAPI (obligatoria)
 *
 * SALIDA
 *   clips/raw_<n>.mp4    → cada clip descargado (nunca sobreescribe; añade sufijo _1, _2…)
 *   clips/batch_log.json → log de auditoría: timestamps, task_ids, status, costo real
 *
 * FLUJO
 *   1. Valida PIAPI_KEY y el archivo JSON de entrada.
 *   2. Imprime tabla de aprobación (nº, duración, resolución, $/clip, total).
 *   3. Espera "OK" del usuario por stdin (timeout 30 s → aborta sin gastar créditos).
 *   4. Envía TODOS los jobs en paralelo con Promise.all → POST /api/v1/task.
 *   5. Polling en paralelo (GET /api/v1/task/{task_id} cada 5 s, timeout 10 min c/u).
 *   6. Descarga cada .mp4 a clips/raw_<n>.mp4.
 *   7. Guarda clips/batch_log.json y muestra resumen.
 *
 * PRECIOS (verificados mayo 2026 — piapi.ai/docs/kling-api/kling-3-api)
 *   Kling 3.0 720p  sin audio (mode: std): $0.10/s → $0.50 por clip de 5 s (DEFAULT)
 *   Kling 3.0 1080p sin audio (mode: pro): $0.15/s → $0.75 por clip de 5 s
 *   enable_audio siempre false → evita $0.05/s de audio no deseado.
 *
 * NOTA SOBRE mode vs resolution
 *   En la API de PiAPI, el campo "mode" controla la calidad de renderizado:
 *     "std" = 720p,  "pro" = 1080p
 *   No existe un campo "resolution" en el body. El script acepta "resolution"
 *   en el JSON de entrada como conveniencia y lo traduce a "mode" internamente.
 *   El modo image-to-video se activa enviando image_url (no hay un campo "mode: i2v").
 * ─────────────────────────────────────────────────────────────────────────────
 */

import axios                from "axios";
import { createInterface }  from "readline";
import {
  existsSync, mkdirSync,
  createWriteStream, readFileSync, writeFileSync,
} from "fs";
import { join, resolve, basename } from "path";
import { Readable }         from "stream";
import { pipeline }         from "stream/promises";

// ─── Constantes ───────────────────────────────────────────────────────────────
const PIAPI_BASE_URL   = "https://api.piapi.ai/api/v1";
const POLL_INTERVAL_MS = 5_000;
const TASK_TIMEOUT_MS  = 10 * 60 * 1_000;  // 10 minutos por task
const CONFIRM_TIMEOUT  = 30_000;            // 30 s para confirmar el lote

const COST_PER_SECOND = {
  "720p":  0.10,  // mode: std
  "1080p": 0.15,  // mode: pro
};

const RESOLUTION_TO_MODE = {
  "720p":  "std",
  "1080p": "pro",
};

// ─── PIAPI_KEY ────────────────────────────────────────────────────────────────
const PIAPI_KEY = process.env.PIAPI_KEY;
if (!PIAPI_KEY) {
  console.error(
    "\n❌  PIAPI_KEY no encontrado en las variables de entorno.\n" +
    "    Exportalo antes de correr el script:\n" +
    "      $env:PIAPI_KEY = \"tu-clave-aqui\"   (PowerShell)\n" +
    "      export PIAPI_KEY=\"tu-clave-aqui\"    (bash/zsh)\n"
  );
  process.exit(1);
}

const api = axios.create({
  baseURL: PIAPI_BASE_URL,
  headers: { "x-api-key": PIAPI_KEY, "Content-Type": "application/json" },
});

// ─── Archivo de entrada ────────────────────────────────────────────────────────
const inputFile = process.argv[2] ?? "batch_input.json";
const inputPath = resolve(process.cwd(), inputFile);

if (!existsSync(inputPath)) {
  console.error(`\n❌  No se encontró el archivo de entrada: ${inputPath}\n`);
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

// ─── Validar campos y normalizar ──────────────────────────────────────────────
for (const shot of shots) {
  if (!shot.n || !shot.image_url || !shot.prompt) {
    console.error(
      `\n❌  Toma inválida — faltan campos n, image_url o prompt:\n` +
      `    ${JSON.stringify(shot)}\n`
    );
    process.exit(1);
  }

  shot.duration   = Number(shot.duration ?? 5);
  shot.resolution = shot.resolution ?? "720p";

  if (!Number.isInteger(shot.duration) || shot.duration < 3 || shot.duration > 15) {
    console.error(
      `\n❌  Toma ${shot.n}: "duration" debe ser un entero entre 3 y 15 ` +
      `(recibido: ${JSON.stringify(shot.duration)}).\n`
    );
    process.exit(1);
  }

  if (!["720p", "1080p"].includes(shot.resolution)) {
    console.error(
      `\n❌  Toma ${shot.n}: "resolution" debe ser "720p" o "1080p" ` +
      `(recibido: "${shot.resolution}").\n`
    );
    process.exit(1);
  }
}

// ─── Tabla de aprobación ──────────────────────────────────────────────────────
function truncate(str, maxLen) {
  return str.length > maxLen ? str.slice(0, maxLen - 1) + "…" : str;
}

const totalCostEstimated = shots.reduce(
  (sum, s) => sum + COST_PER_SECOND[s.resolution] * s.duration, 0
);

const SEP  = "─".repeat(84);
const SEP2 = "═".repeat(84);

console.log(`\n${SEP2}`);
console.log("  BATCH PiAPI / KLING 3.0 — TABLA DE APROBACIÓN");
console.log(`  Archivo: ${basename(inputFile)}   |   Tomas: ${shots.length}`);
console.log(SEP2);
console.log(
  `  ${"N°".padEnd(5)}` +
  `${"Dur.".padEnd(7)}` +
  `${"Res.".padEnd(8)}` +
  `${"$/clip".padEnd(9)}` +
  `Prompt animación`
);
console.log(SEP);

for (const shot of shots) {
  const cost = (COST_PER_SECOND[shot.resolution] * shot.duration).toFixed(2);
  console.log(
    `  ${String(shot.n).padEnd(5)}` +
    `${(shot.duration + " s").padEnd(7)}` +
    `${shot.resolution.padEnd(8)}` +
    `${"$" + cost.padEnd(7)}  ` +
    truncate(shot.prompt, 53)
  );
}

console.log(SEP);
console.log(`  COSTO TOTAL ESTIMADO: $${totalCostEstimated.toFixed(2)} USD`);
console.log(`  (Estos créditos se cobran en cuanto se confirme el lote.)`);
console.log(`${SEP2}\n`);

// ─── Confirmación con timeout de 30 s ────────────────────────────────────────
const rl = createInterface({ input: process.stdin, output: process.stdout });

const confirmed = await new Promise((resolvePromise) => {
  let answered = false;

  const timer = setTimeout(() => {
    if (!answered) {
      answered = true;
      rl.close();
      process.stdout.write("\n");
      console.log("⏱️  Tiempo agotado (30 s). Abortando sin gastar créditos.");
      resolvePromise(false);
    }
  }, CONFIRM_TIMEOUT);

  rl.question(
    '  Escribe "OK" y Enter para confirmar, o cualquier otra cosa para cancelar: ',
    (answer) => {
      if (!answered) {
        answered = true;
        clearTimeout(timer);
        rl.close();
        resolvePromise(answer.trim().toUpperCase() === "OK");
      }
    }
  );
});

if (!confirmed) {
  console.log("\n🚫  Lote cancelado. No se gastaron créditos.\n");
  process.exit(0);
}

// ─── Directorio de salida ─────────────────────────────────────────────────────
const clipsDir = resolve(process.cwd(), "clips");
mkdirSync(clipsDir, { recursive: true });

// ─── Helper: ruta única sin sobreescribir ─────────────────────────────────────
function uniquePath(basePath) {
  if (!existsSync(basePath)) return basePath;
  const ext  = ".mp4";
  const stem = basePath.slice(0, -ext.length);
  let i = 1;
  let candidate;
  do {
    candidate = `${stem}_${i}${ext}`;
    i++;
  } while (existsSync(candidate));
  return candidate;
}

// ─── Helper: descarga URL → archivo local ─────────────────────────────────────
async function downloadToFile(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} al descargar ${url}`);
  }
  const finalPath  = uniquePath(destPath);
  const fileStream = createWriteStream(finalPath);
  await pipeline(Readable.fromWeb(res.body), fileStream);
  return finalPath;
}

// ─── Helper: polling hasta completed / failed (timeout 10 min) ───────────────
async function pollTask(taskId, shotN) {
  const deadline = Date.now() + TASK_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));

    let res;
    try {
      ({ data: res } = await api.get(`/task/${taskId}`));
    } catch (err) {
      // Error de red transitorio: loguear y seguir intentando
      process.stdout.write(`  ⚠️  Toma ${shotN} — error de red al hacer polling: ${err.message}\r`);
      continue;
    }

    const status = (res?.data?.status ?? "").toLowerCase();

    if (status === "pending") {
      process.stdout.write(`  🕐 Toma ${shotN} — pendiente en cola…              \r`);
    } else if (status === "processing") {
      process.stdout.write(`  🎬 Toma ${shotN} — procesando…                     \r`);
    } else if (status === "completed") {
      process.stdout.write(`  ✅ Toma ${shotN} — completado.                     \r`);
      return res.data;
    } else if (status === "failed") {
      const errMsg = res?.data?.error?.message ?? JSON.stringify(res?.data?.error) ?? "sin detalle";
      throw new Error(`Task ${taskId} falló: ${errMsg}`);
    }
    // "staged" u otros estados desconocidos → seguir esperando
  }

  throw new Error(`Timeout (10 min) esperando task ${taskId} para toma ${shotN}`);
}

// ─── PASO 1: Enviar TODOS en paralelo ────────────────────────────────────────
console.log(`\n🚀  Enviando ${shots.length} job(s) a PiAPI (Kling 3.0) en paralelo…\n`);

const startedAt = new Date();

let submitted;
try {
  submitted = await Promise.all(
    shots.map(async (shot) => {
      const { data: res } = await api.post("/task", {
        model:     "kling",
        task_type: "video_generation",
        input: {
          version:      "3.0",
          mode:         RESOLUTION_TO_MODE[shot.resolution],
          image_url:    shot.image_url,
          prompt:       shot.prompt,
          duration:     shot.duration,   // integer (API requiere int, no string)
          aspect_ratio: "9:16",
          enable_audio: false,
        },
      });

      if (res?.code !== 200 || !res?.data?.task_id) {
        throw new Error(
          `Toma ${shot.n}: respuesta inesperada al crear task — ` +
          JSON.stringify(res)
        );
      }

      const taskId = res.data.task_id;
      console.log(`  📤 Toma ${shot.n} → enviada  |  task_id: ${taskId}`);
      return { shot, taskId };
    })
  );
} catch (err) {
  console.error(`\n❌  Error al enviar jobs a PiAPI: ${err.message}`);
  process.exit(1);
}

// ─── PASO 2: Polling y descarga TODOS en paralelo ────────────────────────────
console.log(`\n⏳  Polling cada ${POLL_INTERVAL_MS / 1_000} s (timeout ${TASK_TIMEOUT_MS / 60_000} min por task)…\n`);

const results = await Promise.allSettled(
  submitted.map(async ({ shot, taskId }) => {
    const taskData = await pollTask(taskId, shot.n);

    const videoField = taskData?.output?.video;
    let videoUrl;
    if (typeof videoField === "string") {
      videoUrl = videoField;
    } else if (videoField && typeof videoField === "object") {
      videoUrl = videoField.resource_without_watermark || videoField.resource;
    }

    if (!videoUrl) {
      throw new Error(
        `Toma ${shot.n}: la respuesta no contiene output.video.resource.\n` +
        `  output: ${JSON.stringify(taskData?.output)}`
      );
    }

    const destPath  = join(clipsDir, `raw_${shot.n}.mp4`);
    const savedPath = await downloadToFile(videoUrl, destPath);
    const costUsd   = COST_PER_SECOND[shot.resolution] * shot.duration;

    process.stdout.write(" ".repeat(65) + "\r");
    console.log(`  ✅ Toma ${shot.n} → ${savedPath}  ($${costUsd.toFixed(2)})`);

    return {
      n:            shot.n,
      status:       "completed",
      task_id:      taskId,
      video_url:    videoUrl,
      saved_path:   savedPath,
      duration_s:   shot.duration,
      resolution:   shot.resolution,
      mode:         RESOLUTION_TO_MODE[shot.resolution],
      cost_usd:     costUsd,
      prompt:       shot.prompt,
      image_url:    shot.image_url,
      completed_at: new Date().toISOString(),
    };
  })
);

// ─── PASO 3: Log de auditoría ─────────────────────────────────────────────────
const logEntries = results.map((res, i) => {
  if (res.status === "fulfilled") return res.value;
  const shot = submitted[i]?.shot;
  console.error(`\n❌  Error en toma ${shot?.n ?? i + 1}: ${res.reason?.message ?? res.reason}`);
  return {
    n:          shot?.n ?? String(i + 1),
    status:     "failed",
    task_id:    submitted[i]?.taskId ?? null,
    error:      String(res.reason),
    prompt:     shot?.prompt ?? null,
    image_url:  shot?.image_url ?? null,
    resolution: shot?.resolution ?? null,
    failed_at:  new Date().toISOString(),
  };
});

const totalCostReal = logEntries.reduce((sum, e) => sum + (e.cost_usd ?? 0), 0);

const batchLog = {
  batch_file:      inputFile,
  started_at:      startedAt.toISOString(),
  ended_at:        new Date().toISOString(),
  total_cost_usd:  totalCostReal,
  shots_total:     shots.length,
  shots_completed: logEntries.filter(e => e.status === "completed").length,
  shots_failed:    logEntries.filter(e => e.status === "failed").length,
  shots:           logEntries,
};

const logPath = join(clipsDir, "batch_log.json");
writeFileSync(logPath, JSON.stringify(batchLog, null, 2), "utf-8");

// ─── Resumen final ─────────────────────────────────────────────────────────────
const ok     = batchLog.shots_completed;
const failed = batchLog.shots_failed;

console.log(`\n${SEP2}`);
console.log("  LOTE COMPLETADO");
console.log(SEP);
console.log(`  Exitosos : ${ok} / ${shots.length}`);
if (failed > 0) {
  console.log(`  Fallidos : ${failed}  ← revisar clips/batch_log.json para detalles`);
}
console.log(`  Costo real: $${totalCostReal.toFixed(2)} USD`);
console.log(`  Log guardado → ${logPath}`);
console.log(`${SEP2}\n`);

if (failed > 0) {
  process.exit(1);
}
