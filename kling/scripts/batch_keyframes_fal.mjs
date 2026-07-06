/**
 * batch_keyframes_fal.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Genera keyframes con NANO BANANA en fal.ai (todo en fal), EN PARALELO.
 *   - Sin referencia  → endpoint "fal-ai/nano-banana"        (text-to-image)
 *   - Con referencia  → endpoint "fal-ai/nano-banana/edit"   (image_urls)
 *
 * Las imágenes que devuelve fal ya viven en CDN permanente de fal → se usan
 * directo como image_url para Kling y como referencia para keyframes dependientes.
 *
 * USO
 *   node batch_keyframes_fal.mjs <keyframes_input.json> [nombre_lote]
 *
 * FORMATO keyframes_input.json
 *   [
 *     {
 *       "n":           "01",
 *       "kf_prompt":   "prompt para nano-banana",
 *       "kf_ref_urls": null | ["https://…", "https://…"],   ← refs (consistencia / packaging)
 *       "anim_prompt": "prompt de animación para Kling",
 *       "duration":    "5" | "10"
 *     }
 *   ]
 *
 * SALIDA
 *   assets_<lote>/kf_<n>.png        → keyframe descargado local (para revisar)
 *   kf_map_<lote>.json              → { "01": "https://cdn…", … }  (acumulativo entre runs)
 *   batch_input_<lote>.json         → [{ n, image_url, prompt, duration }]  (acumulativo)
 *
 * VARIABLES DE ENTORNO
 *   FAL_KEY — clave API de fal.ai
 *
 * COSTO
 *   ~$0.039–0.04 por imagen (nano-banana en fal).
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

// Tier de modelo: 4º argumento "pro" → Nano Banana 2 / Pro (más realista, más caro).
const TIER = (process.argv[4] ?? "std").toLowerCase();
const IS_PRO = TIER === "pro";
const T2I_ENDPOINT  = IS_PRO ? "fal-ai/nano-banana-pro"      : "fal-ai/nano-banana";
const EDIT_ENDPOINT = IS_PRO ? "fal-ai/nano-banana-pro/edit" : "fal-ai/nano-banana/edit";
const KF_COST         = IS_PRO ? 0.12 : 0.04;
const CONFIRM_TIMEOUT = 30_000;

const FAL_KEY = process.env.FAL_KEY;
if (!FAL_KEY) {
  console.error('\n❌  FAL_KEY no encontrado.\n    $env:FAL_KEY = "tu-clave"\n');
  process.exit(1);
}
fal.config({ credentials: FAL_KEY });

const inputFile = process.argv[2] ?? "keyframes_input.json";
const lote      = process.argv[3] ?? "lote";
const inputPath = resolve(process.cwd(), inputFile);

if (!existsSync(inputPath)) {
  console.error(`\n❌  No se encontró: ${inputPath}\n`);
  process.exit(1);
}

let shots;
try {
  shots = JSON.parse(readFileSync(inputPath, "utf-8"));
} catch (e) {
  console.error(`\n❌  No se pudo parsear ${inputFile}: ${e.message}\n`);
  process.exit(1);
}
if (!Array.isArray(shots) || shots.length === 0) {
  console.error("\n❌  El JSON debe ser un array con al menos una toma.\n");
  process.exit(1);
}

for (const s of shots) {
  if (!s.n || !s.kf_prompt) {
    console.error(`\n❌  Toma inválida (falta n o kf_prompt): ${JSON.stringify(s)}\n`);
    process.exit(1);
  }
  s.duration = String(s.duration ?? "5");
  if (!["5", "10"].includes(s.duration)) {
    console.error(`\n❌  Toma ${s.n}: duration debe ser "5" o "10".\n`);
    process.exit(1);
  }
  if (s.kf_ref_urls != null && !Array.isArray(s.kf_ref_urls)) {
    console.error(`\n❌  Toma ${s.n}: kf_ref_urls debe ser null o array de URLs.\n`);
    process.exit(1);
  }
}

function truncate(str, n) { return str.length > n ? str.slice(0, n - 1) + "…" : str; }

const SEP  = "─".repeat(86);
const SEP2 = "═".repeat(86);

console.log(`\n${SEP2}`);
console.log("  BATCH KEYFRAMES — NANO BANANA en fal");
console.log(`  Archivo: ${basename(inputFile)}   |   Lote: ${lote}   |   Tomas: ${shots.length}`);
console.log(SEP2);
console.log(`  ${"N°".padEnd(5)}${"Modo".padEnd(8)}${"Refs".padEnd(6)}${"$/kf".padEnd(8)}Prompt keyframe`);
console.log(SEP);
for (const s of shots) {
  const isEdit = Array.isArray(s.kf_ref_urls) && s.kf_ref_urls.length > 0;
  console.log(
    `  ${String(s.n).padEnd(5)}` +
    `${(isEdit ? "edit" : "t2i").padEnd(8)}` +
    `${String(isEdit ? s.kf_ref_urls.length : 0).padEnd(6)}` +
    `${("$" + KF_COST.toFixed(2)).padEnd(8)}` +
    truncate(s.kf_prompt, 46)
  );
}
console.log(SEP);
console.log(`  COSTO ESTIMADO: $${(shots.length * KF_COST).toFixed(2)} USD  (${shots.length} × $${KF_COST.toFixed(2)})`);
console.log(`${SEP2}\n`);

const rl = createInterface({ input: process.stdin, output: process.stdout });
const confirmed = await new Promise((res) => {
  let answered = false;
  const timer = setTimeout(() => {
    if (!answered) { answered = true; rl.close(); console.log("\n⏱️  Tiempo agotado. Abortando."); res(false); }
  }, CONFIRM_TIMEOUT);
  rl.question('  Escribe "OK" y Enter para confirmar: ', (ans) => {
    if (!answered) { answered = true; clearTimeout(timer); rl.close(); res(ans.trim().toUpperCase() === "OK"); }
  });
});
if (!confirmed) { console.log("\n🚫  Cancelado. No se gastaron créditos.\n"); process.exit(0); }

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

console.log(`\n🚀  Generando ${shots.length} keyframe(s) en paralelo (nano-banana fal)…\n`);

const results = await Promise.allSettled(
  shots.map(async (s) => {
    const isEdit = Array.isArray(s.kf_ref_urls) && s.kf_ref_urls.length > 0;
    const endpoint = isEdit ? EDIT_ENDPOINT : T2I_ENDPOINT;
    const input = {
      prompt:        s.kf_prompt,
      num_images:    1,
      output_format: "png",
      aspect_ratio:  "9:16",
      ...(isEdit ? { image_urls: s.kf_ref_urls } : {}),
    };
    const out = await fal.subscribe(endpoint, { input, logs: false });
    const url = out?.data?.images?.[0]?.url ?? out?.images?.[0]?.url ?? null;
    if (!url) throw new Error(`Toma ${s.n}: sin URL en respuesta. data=${JSON.stringify(out?.data ?? out)}`);
    const localPath = await downloadToFile(url, join(assetsDir, `kf_${s.n}.png`));
    console.log(`  ✅ Toma ${s.n} (${isEdit ? "edit" : "t2i"}) → ${basename(localPath)}  |  ${url}`);
    return { n: s.n, url, anim: s.anim_prompt ?? "", duration: s.duration };
  })
);

// ─── Cargar mapas acumulativos existentes ─────────────────────────────────────
const mapPath   = resolve(process.cwd(), "config", `kf_map_${lote}.json`);
const batchPath = resolve(process.cwd(), "config", `batch_input_${lote}.json`);
const kfMap   = existsSync(mapPath)   ? JSON.parse(readFileSync(mapPath, "utf-8"))   : {};
let   batchIn = existsSync(batchPath) ? JSON.parse(readFileSync(batchPath, "utf-8")) : [];
const batchByN = new Map(batchIn.map(b => [b.n, b]));

const errors = [];
for (let i = 0; i < results.length; i++) {
  const r = results[i];
  if (r.status === "fulfilled") {
    const v = r.value;
    kfMap[v.n] = v.url;
    if (v.anim) batchByN.set(v.n, { n: v.n, image_url: v.url, prompt: v.anim, duration: v.duration });
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
console.log("  KEYFRAMES COMPLETADOS");
console.log(SEP);
console.log(`  Exitosos : ${shots.length - errors.length} / ${shots.length}`);
if (errors.length) console.log(`  Fallidos : ${errors.join(", ")}`);
console.log(`  Mapa URLs   → ${basename(mapPath)}   (${Object.keys(kfMap).length} keyframes acumulados)`);
console.log(`  batch_input → ${basename(batchPath)} (${batchIn.length} tomas)`);
console.log(`${SEP2}\n`);
if (errors.length) process.exit(1);
