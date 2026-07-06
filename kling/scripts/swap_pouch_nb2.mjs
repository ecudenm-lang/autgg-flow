/**
 * swap_pouch_nb2.mjs — Reemplaza el pouch viejo por el nuevo en fotos de escena,
 * usando NANO BANANA 2 (Gemini 3 Pro Image) en KIE.AI con 2 imagenes de input
 * (escena + pouch nuevo). Preserva el aspect ratio por foto.
 *
 * USO:  node swap_pouch_nb2.mjs <swap_input.json> [nombre_lote] [1K|2K|4K]
 *
 * FORMATO swap_input.json
 *   [ { "n":"A1", "scene_url":"https://…", "pouch_url":"https://…",
 *       "aspect_ratio":"3:2", "prompt":"…(opcional, hay default)…" } ]
 *
 * SALIDA: swapped/<lote>/<n>.png
 * ENV: KIE_API_KEY  (AUTO_OK=1 opcional)
 */
import { existsSync, mkdirSync, createWriteStream, readFileSync } from "fs";
import { join, resolve } from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";

const BASE = "https://api.kie.ai/api/v1/jobs";
const MODEL = "nano-banana-2";
const POLL_INTERVAL_MS = 4_000;
const POLL_TIMEOUT_MS = 6 * 60_000;

const KEY = process.env.KIE_API_KEY;
if (!KEY) { console.error('\n❌  KIE_API_KEY no encontrado.\n'); process.exit(1); }

const inputFile = process.argv[2] ?? "swap_input.json";
const lote = process.argv[3] ?? "swap";
const RES = (process.argv[4] ?? "1K").toUpperCase();
if (!["1K","2K","4K"].includes(RES)) { console.error(`\n❌  resolution 1K|2K|4K (recibido ${RES}).\n`); process.exit(1); }

const inputPath = resolve(process.cwd(), inputFile);
if (!existsSync(inputPath)) { console.error(`\n❌  No se encontró: ${inputPath}\n`); process.exit(1); }
const shots = JSON.parse(readFileSync(inputPath, "utf-8"));
if (!Array.isArray(shots) || !shots.length) { console.error("\n❌  Array vacío.\n"); process.exit(1); }

const DEFAULT_PROMPT =
  "In this photo, replace ONLY the cinnamon supplement stand-up pouch that the person is holding " +
  "with the exact product shown in the SECOND reference image (a BioZentra pouch with a Spanish " +
  "'CANELA DE CEILAN con Aceite MCT' label). Keep the new pouch's design, label, text and colors " +
  "faithful to that second image. Match the original hand grip, finger positions, the pouch's angle, " +
  "tilt, perspective, scale, and the scene's lighting, shadows and reflections so it looks naturally held. " +
  "Do NOT change the person, their face, clothing, pose, the background, or the framing — change only the pouch. " +
  "Photorealistic, sharp, consistent grain with the original photo.";

const outDir = resolve(process.cwd(), "swapped", lote);
mkdirSync(outDir, { recursive: true });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function downloadToFile(url, destPath) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} al descargar ${url}`);
  await pipeline(Readable.fromWeb(r.body), createWriteStream(destPath));
  return destPath;
}
async function createTask(s) {
  const input = {
    prompt: s.prompt || DEFAULT_PROMPT,
    image_input: [s.scene_url, s.pouch_url],
    aspect_ratio: s.aspect_ratio || "1:1",
    resolution: RES,
    output_format: "png",
  };
  const r = await fetch(`${BASE}/createTask`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, input }),
  });
  const j = await r.json();
  const taskId = j?.data?.taskId ?? j?.data?.task_id;
  if (!taskId) throw new Error(`createTask sin taskId (code=${j?.code} msg=${j?.msg}): ${JSON.stringify(j).slice(0,300)}`);
  return taskId;
}
async function pollTask(taskId, n) {
  const t0 = Date.now();
  while (Date.now() - t0 < POLL_TIMEOUT_MS) {
    const r = await fetch(`${BASE}/recordInfo?taskId=${encodeURIComponent(taskId)}`, { headers: { "Authorization": `Bearer ${KEY}` } });
    const j = await r.json();
    const d = j?.data ?? {};
    if (d.state === "success") {
      const url = JSON.parse(d.resultJson || "{}")?.resultUrls?.[0];
      if (!url) throw new Error(`${n}: success sin resultUrls`);
      return { url, credits: d.creditsConsumed ?? null };
    }
    if (d.state === "fail") throw new Error(`${n}: fail (${d.failCode}) ${d.failMsg}`);
    process.stdout.write(`  🖼  ${n} — ${d.state ?? "?"} (${Math.round((Date.now()-t0)/1000)}s)        \r`);
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error(`${n}: timeout`);
}

console.log(`\n🚀  SWAP de pouch — Nano Banana 2 (${RES}) — ${shots.length} foto(s)\n`);
let totalCredits = 0; const errors = [];
const results = await Promise.allSettled(shots.map(async (s) => {
  const taskId = await createTask(s);
  const { url, credits } = await pollTask(taskId, s.n);
  const local = await downloadToFile(url, join(outDir, `${s.n}.png`));
  process.stdout.write(" ".repeat(60) + "\r");
  console.log(`  ✅ ${s.n} → swapped/${lote}/${s.n}.png  |  ${credits ?? "?"} créditos`);
  return { n: s.n, credits: credits ?? 0 };
}));
for (let i = 0; i < results.length; i++) {
  if (results[i].status === "fulfilled") totalCredits += results[i].value.credits;
  else { console.error(`\n❌  ${shots[i]?.n}: ${results[i].reason?.message}`); errors.push(shots[i]?.n); }
}
console.log(`\n  Exitosos: ${shots.length - errors.length}/${shots.length}  |  Créditos: ${totalCredits} (~$${(totalCredits*0.005).toFixed(3)})`);
if (errors.length) { console.log(`  Fallidos: ${errors.join(", ")}`); process.exit(1); }
