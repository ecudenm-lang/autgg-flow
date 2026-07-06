/**
 * gen_vo.mjs — VO multi-voz toma-por-toma, GENERICO para cualquier batch.
 * ElevenLabs directo (eleven_flash_v2_5) con request-stitching (previous/next dentro
 * de runs de la misma voz) + seed fijo. Lee config/<ad>.json:
 *   { "ad":"so1_1", "batch":"SO1", "voices":{alias:voiceId}, "tomas":[{n,voice,text}] }
 * Escribe audio/<BATCH>/<ad>/seg_NN.mp3, audio/<BATCH>/<ad>_full.mp3, config/cuts_<ad>.json.
 * USO: node gen_vo.mjs config/<ad>.json
 */
import { execFileSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { resolve, join } from "path";

const cfgPath = resolve(process.argv[2]);
const cfg = JSON.parse(readFileSync(cfgPath, "utf-8"));
const KEY = readFileSync("D:/Iteracionking/tools/elevenlabs_key.txt", "utf-8").trim();
const MODEL = "eleven_flash_v2_5", SEED = 777;
const ad = cfg.ad;
const batch = cfg.batch || "MISC";
const segDir = resolve("audio", batch, ad);
mkdirSync(segDir, { recursive: true });
mkdirSync(resolve("config"), { recursive: true });
const tomas = cfg.tomas;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function tts(voiceId, text, prev, next, outPath) {
  const body = {
    text, model_id: MODEL,
    voice_settings: { stability: 0.6, similarity_boost: 0.75, style: 0.1, use_speaker_boost: true },
    seed: SEED, ...(prev ? { previous_text: prev } : {}), ...(next ? { next_text: next } : {}),
  };
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`;
  for (let att = 1; att <= 4; att++) {
    const r = await fetch(url, { method: "POST", headers: { "xi-api-key": KEY, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (r.ok) { writeFileSync(outPath, Buffer.from(await r.arrayBuffer())); return; }
    const msg = await r.text();
    if (att === 4) throw new Error(`TTS ${r.status}: ${msg.slice(0, 200)}`);
    await sleep(1500 * att);
  }
}

const segs = [];
for (let i = 0; i < tomas.length; i++) {
  const t = tomas[i], vid = cfg.voices[t.voice];
  const prev = (i > 0 && tomas[i - 1].voice === t.voice) ? tomas[i - 1].text : "";
  const next = (i < tomas.length - 1 && tomas[i + 1].voice === t.voice) ? tomas[i + 1].text : "";
  const out = join(segDir, `seg_${t.n}.mp3`);
  await tts(vid, t.text, prev, next, out);
  segs.push(out);
  console.log(`  ✅ ${ad} seg_${t.n} (${t.voice})`);
}
const listPath = join(segDir, "_concat.txt");
writeFileSync(listPath, segs.map(p => `file '${p.replace(/\\/g, "/")}'`).join("\n"), "ascii");
const full = resolve("audio", batch, `${ad}_full.mp3`);
execFileSync("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c:a", "libmp3lame", "-q:a", "2", full], { stdio: ["ignore", "ignore", "ignore"] });
const cuts = []; let acc = 0;
for (let i = 0; i < segs.length; i++) {
  const d = parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", segs[i]], { encoding: "utf-8" }).trim());
  cuts.push({ n: tomas[i].n, start: Math.round(acc * 1000) / 1000, end: Math.round((acc + d) * 1000) / 1000, guion: tomas[i].text });
  acc += d;
}
writeFileSync(resolve("config", `cuts_${ad}.json`), JSON.stringify(cuts, null, 2), "utf-8");
console.log(`${ad} -> voz ${Math.round(acc * 10) / 10}s, ${cuts.length} tomas`);
