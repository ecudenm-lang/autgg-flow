/**
 * gen_music_kie.mjs — genera cama musical INSTRUMENTAL original con Suno vía KIE.AI.
 * Reemplaza el track fijo del pipeline (sin copyright, mood a medida por tipo de ad).
 *
 * USO
 *   node gen_music_kie.mjs "<style/descripcion>" <out.mp3> [modelVersion] [title]
 *   ej: node gen_music_kie.mjs "cinematic emotional piano and soft strings, subtle, hopeful resolve, no drums" audio/music/pr1.mp3 V4_5 "PR1 bed"
 *
 * Precio: ~12 créditos ≈ $0.06 por generación (devuelve 2 variantes; bajamos las 2).
 * API:
 *   POST https://api.kie.ai/api/v1/generate
 *     body: { customMode:false, instrumental:true, prompt, model:"suno", modelVersion:"V4_5" }
 *     → data.taskId
 *   GET  https://api.kie.ai/api/v1/generate/record-info?taskId=…
 *     → data.status (PENDING|TEXT_SUCCESS|FIRST_SUCCESS|SUCCESS|*_FAILED)
 *       data.response.sunoData[i].audioUrl  (mp3 final por variante)
 * ENV: KIE_API_KEY
 */
import { existsSync, mkdirSync, createWriteStream, writeFileSync } from "fs";
import { resolve, dirname, basename } from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";

const KEY = process.env.KIE_API_KEY;
if (!KEY) { console.error("\n❌  KIE_API_KEY no encontrado.\n"); process.exit(1); }

const style = process.argv[2];
const outMp3 = process.argv[3];
const modelVersion = process.argv[4] ?? "V4_5";
const title = process.argv[5] ?? "bg bed";
if (!style || !outMp3) { console.error('\nUSO: node gen_music_kie.mjs "<style>" <out.mp3> [modelVersion] [title]\n'); process.exit(1); }

const BASE = "https://api.kie.ai/api/v1/generate";
const CREDIT_USD = 0.005;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const H = { "Authorization": `Bearer ${KEY}`, "Content-Type": "application/json" };

async function downloadToFile(url, destPath) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} al descargar`);
  mkdirSync(dirname(destPath), { recursive: true });
  await pipeline(Readable.fromWeb(r.body), createWriteStream(destPath));
  return destPath;
}

console.log(`\n🎵  Generando música instrumental (Suno ${modelVersion}) …`);
console.log(`    style: ${style}`);

const body = { customMode: false, instrumental: true, prompt: style, model: modelVersion, callBackUrl: "https://example.com/kie-callback" };
const cr = await fetch(BASE, { method: "POST", headers: H, body: JSON.stringify(body) });
const cj = await cr.json();
const taskId = cj?.data?.taskId ?? cj?.data?.task_id;
if (!taskId) { console.error(`❌  Sin taskId (code=${cj?.code} msg=${cj?.msg}): ${JSON.stringify(cj).slice(0,400)}`); process.exit(1); }
console.log(`    taskId: ${taskId}`);

const t0 = Date.now();
const TIMEOUT = 8 * 60_000;
let done = null;
while (Date.now() - t0 < TIMEOUT) {
  const r = await fetch(`${BASE}/record-info?taskId=${encodeURIComponent(taskId)}`, { headers: H });
  const j = await r.json();
  const d = j?.data ?? {};
  const st = d.status;
  const tracks = d?.response?.sunoData ?? [];
  const ready = tracks.filter(t => t.audioUrl);
  process.stdout.write(`    ${st ?? "?"} — ${ready.length} pista(s) listas (${Math.round((Date.now()-t0)/1000)}s)      \r`);
  if (st === "SUCCESS" && ready.length) { done = { tracks: ready, credits: d.creditsConsumed ?? d.credits ?? null }; break; }
  if (typeof st === "string" && st.includes("FAIL")) { console.error(`\n❌  ${st}: ${d.errorMessage ?? ""}`); process.exit(1); }
  await sleep(5000);
}
if (!done) { console.error("\n❌  Timeout."); process.exit(1); }

process.stdout.write(" ".repeat(70) + "\r");
const outAbs = resolve(process.cwd(), outMp3);
const saved = [];
for (let i = 0; i < done.tracks.length; i++) {
  const dest = i === 0 ? outAbs : outAbs.replace(/\.mp3$/i, `_v${i+1}.mp3`);
  await downloadToFile(done.tracks[i].audioUrl, dest);
  console.log(`  ✅  ${basename(dest)}  (${done.tracks[i].duration ?? "?"}s)`);
  saved.push({ path: dest, url: done.tracks[i].audioUrl, duration: done.tracks[i].duration });
}
console.log(`\n  Créditos: ${done.credits ?? "?"}${done.credits != null ? ` (~$${(done.credits*CREDIT_USD).toFixed(3)})` : ""}\n`);
writeFileSync(outAbs.replace(/\.mp3$/i, "_log.json"), JSON.stringify({ taskId, style, modelVersion, credits: done.credits, tracks: saved }, null, 2));
