/**
 * gen_song_kie.mjs — canción CON VOZ (Suno custom mode) vía KIE.AI.
 * USO: node gen_song_kie.mjs <lyrics.txt> "<style>" "<title>" <out.mp3> [model]
 *   model: V4_5 (default) | V5 | V5_5 | V4_5PLUS
 * Devuelve 2 variantes (out.mp3 + out_v2.mp3). ~12 cr ≈ $0.06. ENV: KIE_API_KEY.
 */
import { readFileSync, createWriteStream, mkdirSync, writeFileSync, statSync } from "fs";
import { resolve, dirname, basename } from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";

const KEY = process.env.KIE_API_KEY;
if (!KEY) { console.error("\n❌  KIE_API_KEY no encontrado.\n"); process.exit(1); }
const [lyricsFile, style, title, outMp3, model = "V4_5"] = process.argv.slice(2);
if (!lyricsFile || !style || !title || !outMp3) { console.error('\nUSO: node gen_song_kie.mjs <lyrics.txt> "<style>" "<title>" <out.mp3> [model]\n'); process.exit(1); }

const lyrics = readFileSync(resolve(process.cwd(), lyricsFile), "utf8");
const BASE = "https://api.kie.ai/api/v1/generate";
const H = { "Authorization": `Bearer ${KEY}`, "Content-Type": "application/json" };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

console.log(`\n🎤  Suno ${model} — "${title}"\n    style: ${style}`);
const body = { customMode: true, instrumental: false, prompt: lyrics, style, title, model, callBackUrl: "https://example.com/kie-callback" };
const cr = await fetch(BASE, { method: "POST", headers: H, body: JSON.stringify(body) });
const cj = await cr.json();
const taskId = cj?.data?.taskId ?? cj?.data?.task_id;
if (!taskId) { console.error(`❌  Sin taskId (code=${cj?.code} msg=${cj?.msg}): ${JSON.stringify(cj).slice(0,400)}`); process.exit(1); }
console.log(`    taskId: ${taskId}`);

const t0 = Date.now(), TIMEOUT = 10 * 60_000;
let done = null;
while (Date.now() - t0 < TIMEOUT) {
  const r = await fetch(`${BASE}/record-info?taskId=${encodeURIComponent(taskId)}`, { headers: H });
  const j = await r.json(); const d = j?.data ?? {};
  const st = d.status; const tracks = (d?.response?.sunoData ?? []).filter(t => t.audioUrl);
  process.stdout.write(`    ${st ?? "?"} — ${tracks.length} pista(s) (${Math.round((Date.now()-t0)/1000)}s)      \r`);
  if (st === "SUCCESS" && tracks.length) { done = { tracks, credits: d.creditsConsumed ?? null }; break; }
  if (typeof st === "string" && st.includes("FAIL")) { console.error(`\n❌  ${st}: ${d.errorMessage ?? ""}`); process.exit(1); }
  await sleep(6000);
}
if (!done) { console.error("\n❌  Timeout."); process.exit(1); }

process.stdout.write(" ".repeat(70) + "\r");
const outAbs = resolve(process.cwd(), outMp3);
mkdirSync(dirname(outAbs), { recursive: true });
async function dl(url, dest) {
  for (let a = 1; a <= 8; a++) {
    try { const r = await fetch(url); if (!r.ok) throw new Error("HTTP " + r.status);
      await pipeline(Readable.fromWeb(r.body), createWriteStream(dest));
      if (statSync(dest).size < 50000) throw new Error("chico"); return true;
    } catch (e) { console.log(`    dl intento ${a} (${e.message}); reintento 8s…`); await sleep(8000); }
  }
  return false;
}
const saved = [];
for (let i = 0; i < done.tracks.length; i++) {
  const dest = i === 0 ? outAbs : outAbs.replace(/\.mp3$/i, `_v${i+1}.mp3`);
  if (await dl(done.tracks[i].audioUrl, dest)) { console.log(`  ✅  ${basename(dest)} (${done.tracks[i].duration ?? "?"}s)`); saved.push({ path: dest, url: done.tracks[i].audioUrl, dur: done.tracks[i].duration }); }
}
console.log(`\n  Créditos: ${done.credits ?? "?"}\n`);
writeFileSync(outAbs.replace(/\.mp3$/i, "_log.json"), JSON.stringify({ taskId, title, style, model, credits: done.credits, tracks: saved }, null, 2));
