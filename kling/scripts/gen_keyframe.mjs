/**
 * gen_keyframe.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Genera UN keyframe 9:16 con nano-banana-pro vía PiAPI.
 *
 * USO
 *   node gen_keyframe.mjs "prompt" [ruta/imagen.png]
 *
 *   Sin imagen  → text-to-image (sin image_urls)
 *   URL https:// → image-edit   (image_urls: [url])
 *   Path local  → image-edit   (auto-upload a fal storage → image_urls: [cdn url])
 *                Requiere FAL_KEY para el upload local.
 *
 * API: model="gemini", task_type="nano-banana-2"
 *
 * VARIABLES DE ENTORNO
 *   PIAPI_KEY — clave API de PiAPI (obligatoria)
 *
 * SALIDA
 *   assets/keyframe_<timestamp>.png  (nunca sobreescribe)
 *
 * COSTO
 *   $0.06 por imagen a 1K — nano-banana-2 vía PiAPI
 * ─────────────────────────────────────────────────────────────────────────────
 */

import axios               from "axios";
import { fal }             from "@fal-ai/client";
import { createInterface } from "readline";
import {
  readFileSync, createWriteStream,
  existsSync,   mkdirSync,
} from "fs";
import { resolve, extname, join } from "path";
import { Readable }        from "stream";
import { pipeline }        from "stream/promises";

// ─── Constantes ───────────────────────────────────────────────────────────────
const PIAPI_BASE_URL   = "https://api.piapi.ai/api/v1";
const POLL_INTERVAL_MS = 4_000;
const TASK_TIMEOUT_MS  = 5 * 60 * 1_000;   // 5 min (imagen es más rápida que video)
const IMAGE_COST       = 0.06;

// ─── Keys ─────────────────────────────────────────────────────────────────────
const PIAPI_KEY = process.env.PIAPI_KEY;
if (!PIAPI_KEY) {
  console.error(
    "\n❌  PIAPI_KEY no encontrado en las variables de entorno.\n" +
    "    $env:PIAPI_KEY = \"tu-clave-aqui\"   (PowerShell)\n"
  );
  process.exit(1);
}

const api = axios.create({
  baseURL: PIAPI_BASE_URL,
  headers: { "x-api-key": PIAPI_KEY, "Content-Type": "application/json" },
});

// ─── Args ─────────────────────────────────────────────────────────────────────
const prompt   = process.argv[2];
const imageArg = process.argv[3] ?? null;  // URL https:// o path local

if (!prompt) {
  console.error(
    "\n❌  Falta el prompt.\n" +
    "    Uso: node gen_keyframe.mjs \"prompt\" [https://url | ruta/local.png]\n"
  );
  process.exit(1);
}

// ─── Resolver imagen → URL pública ───────────────────────────────────────────
let imageUrl = null;

if (imageArg) {
  if (imageArg.startsWith("https://") || imageArg.startsWith("http://")) {
    // Ya es URL pública — usar directo
    imageUrl = imageArg;
  } else {
    // Path local → subir a fal storage
    const localPath = resolve(process.cwd(), imageArg);
    if (!existsSync(localPath)) {
      console.error(`\n❌  No se encontró la imagen: ${localPath}\n`);
      process.exit(1);
    }
    const FAL_KEY = process.env.FAL_KEY;
    if (!FAL_KEY) {
      console.error(
        "\n❌  FAL_KEY requerida para subir imagen local a fal storage.\n" +
        "    $env:FAL_KEY = \"tu-clave-aqui\"\n" +
        "    O pasá directamente una URL https:// como tercer argumento.\n"
      );
      process.exit(1);
    }
    fal.config({ credentials: FAL_KEY });
    console.log(`\n⬆️   Subiendo imagen local a fal storage…`);
    const buffer = readFileSync(localPath);
    const blob   = new Blob([buffer], { type: "image/png" });
    imageUrl     = await fal.storage.upload(blob);
    console.log(`  CDN URL: ${imageUrl}\n`);
  }
}

// ─── Preparar input ───────────────────────────────────────────────────────────
const inputObj = {
  prompt,
  aspect_ratio:  "9:16",
  output_format: "png",
  resolution:    "1K",
  safety_level:  "high",
  ...(imageUrl ? { image_urls: [imageUrl] } : {}),
};

// ─── Tabla de aprobación ──────────────────────────────────────────────────────
const SEP  = "─".repeat(72);
const SEP2 = "═".repeat(72);

console.log(`\n${SEP2}`);
console.log("  GEN KEYFRAME — nano-banana-2 (gemini)");
console.log(SEP2);
console.log(`  Modo    : ${imageUrl ? "image-edit" : "text-to-image"}`);
if (imageUrl) console.log(`  Imagen  : ${imageArg}  →  ${imageUrl}`);
console.log(`  Prompt  : ${prompt}`);
console.log(`  Costo   : ~$${IMAGE_COST.toFixed(2)} USD`);
console.log(`${SEP2}\n`);

// ─── Confirmación ─────────────────────────────────────────────────────────────
const rl = createInterface({ input: process.stdin, output: process.stdout });

const confirmed = await new Promise((res) => {
  let answered = false;
  const timer = setTimeout(() => {
    if (!answered) {
      answered = true;
      rl.close();
      process.stdout.write("\n");
      console.log("⏱️  Tiempo agotado (30 s). Abortando.");
      res(false);
    }
  }, 30_000);

  rl.question('  Escribe "OK" y Enter para confirmar: ', (ans) => {
    if (!answered) {
      answered = true;
      clearTimeout(timer);
      rl.close();
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

// ─── Enviar task ──────────────────────────────────────────────────────────────
console.log(`\n🚀  Enviando task a PiAPI…`);

let taskId;
try {
  const { data: res } = await api.post("/task", {
    model:     "gemini",
    task_type: "nano-banana-2",
    input:     inputObj,
  });

  if (res?.code !== 200 || !res?.data?.task_id) {
    console.error("\n❌  Respuesta inesperada:\n", JSON.stringify(res, null, 2));
    process.exit(1);
  }

  taskId = res.data.task_id;
  console.log(`  📤 task_id: ${taskId}\n`);
} catch (err) {
  const detail = err.response?.data ?? err.message;
  console.error("\n❌  Error al crear task:\n", JSON.stringify(detail, null, 2));
  process.exit(1);
}

// ─── Polling ──────────────────────────────────────────────────────────────────
console.log(`⏳  Esperando resultado…`);

const deadline = Date.now() + TASK_TIMEOUT_MS;
let taskData;

while (Date.now() < deadline) {
  await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));

  let res;
  try {
    ({ data: res } = await api.get(`/task/${taskId}`));
  } catch (err) {
    process.stdout.write(`  ⚠️  Error de red en polling: ${err.message}\r`);
    continue;
  }

  const status = (res?.data?.status ?? "").toLowerCase();

  if (status === "pending") {
    process.stdout.write("  🕐 Pendiente…                    \r");
  } else if (status === "processing") {
    process.stdout.write("  🎨 Procesando…                   \r");
  } else if (status === "completed") {
    process.stdout.write("  ✅ Completado.                   \n");
    taskData = res.data;
    break;
  } else if (status === "failed") {
    const errMsg = res?.data?.error?.message ?? JSON.stringify(res?.data?.error);
    console.error(`\n❌  Task falló: ${errMsg}`);
    console.error("  Respuesta completa:", JSON.stringify(res?.data, null, 2));
    process.exit(1);
  } else {
    // Status desconocido — mostrar para debug
    process.stdout.write(`  ❓ status: "${res?.data?.status}"                \r`);
  }
}

if (!taskData) {
  console.error(`\n❌  Timeout (${TASK_TIMEOUT_MS / 60_000} min) esperando el keyframe.\n`);
  process.exit(1);
}

// ─── Extraer URL del resultado ────────────────────────────────────────────────
// nano-banana-pro devuelve la URL en output.image_url o output.image_urls[0]
const output    = taskData?.output ?? {};
const resultUrl = output.image_url
  ?? (Array.isArray(output.image_urls) ? output.image_urls[0] : null)
  ?? output.image
  ?? null;

if (!resultUrl) {
  console.error("\n❌  No se encontró URL de imagen en la respuesta.");
  console.error("  output:", JSON.stringify(output, null, 2));
  process.exit(1);
}

// ─── Descargar ────────────────────────────────────────────────────────────────
const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const outPath   = join(assetsDir, `keyframe_${timestamp}.png`);

console.log(`\n⬇️   Descargando keyframe…`);
const dlRes = await fetch(resultUrl);
if (!dlRes.ok) {
  console.error(`\n❌  HTTP ${dlRes.status} al descargar la imagen.\n`);
  process.exit(1);
}
const fileStream = createWriteStream(outPath);
await pipeline(Readable.fromWeb(dlRes.body), fileStream);

// ─── Resultado ────────────────────────────────────────────────────────────────
console.log(`\n${SEP2}`);
console.log("  KEYFRAME GENERADO");
console.log(SEP);
console.log(`  Guardado en : ${outPath}`);
console.log(`  URL fuente  : ${resultUrl}`);
console.log(`  Costo real  : ~$${IMAGE_COST.toFixed(2)} USD`);
console.log(`${SEP2}\n`);
