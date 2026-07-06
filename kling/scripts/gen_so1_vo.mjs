/**
 * gen_so1_vo.mjs — VO multi-voz toma-por-toma para SO1 (personificación).
 * ElevenLabs directo (eleven_flash_v2_5) con request-stitching (previous_text/next_text
 * dentro de runs de la MISMA voz) + seed fijo → entrega pareja pero cada toma es un archivo.
 * Lee config/so1_vo.json. Escribe audio/SO1/<ad>/seg_NN.mp3, audio/SO1/<ad>_full.mp3,
 * config/cuts_<ad>.json (start/end por ffprobe + guion).
 *
 * USO: node gen_so1_vo.mjs [config/so1_vo.json]
 */
import { execFileSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { resolve, join } from "path";

const cfgPath = resolve(process.argv[2] ?? "config/so1_vo.json");
const cfg = JSON.parse(readFileSync(cfgPath, "utf-8"));
const KEY = readFileSync("D:/Iteracionking/tools/elevenlabs_key.txt", "utf-8").trim();
const MODEL = "eleven_flash_v2_5";
const SEED = 777;

const ad = cfg.ad;
const segDir = resolve("audio", "SO1", ad);
mkdirSync(segDir, { recursive: true });
mkdirSync(resolve("config"), { recursive: true });

const tomas = cfg.tomas;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function tts(voiceId, text, prevText, nextText, outPath) {
  const body = {
    text,
    model_id: MODEL,
    voice_settings: { stability: 0.6, similarity_boost: 0.75, style: 0.1, use_speaker_boost: true },
    seed: SEED,
    ...(prevText ? { previous_text: prevText } : {}),
    ...(nextText ? { next_text: nextText } : {}),
  };
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`;
  for (let att = 1; att <= 4; att++) {
    const r = await fetch(url, {
      method: "POST",
      headers: { "xi-api-key": KEY, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (r.ok) {
      const buf = Buffer.from(await r.arrayBuffer());
      writeFileSync(outPath, buf);
      return;
    }
    const msg = await r.text();
    if (att === 4) throw new Error(`TTS ${r.status}: ${msg.slice(0, 200)}`);
    await sleep(1500 * att);
  }
}

const segs = [];
for (let i = 0; i < tomas.length; i++) {
  const t = tomas[i];
  const vid = cfg.voices[t.voice];
  // stitching solo dentro del mismo run de voz
  const prev = (i > 0 && tomas[i - 1].voice === t.voice) ? tomas[i - 1].text : "";
  const next = (i < tomas.length - 1 && tomas[i + 1].voice === t.voice) ? tomas[i + 1].text : "";
  const out = join(segDir, `seg_${t.n}.mp3`);
  await tts(vid, t.text, prev, next, out);
  segs.push(out);
  console.log(`  ✅ ${ad} seg_${t.n} (${t.voice}) OK`);
}

// concat re-encode
const listPath = join(segDir, "_concat.txt");
writeFileSync(listPath, segs.map(p => `file '${p.replace(/\\/g, "/")}'`).join("\n"), "ascii");
const full = resolve("audio", "SO1", `${ad}_full.mp3`);
execFileSync("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c:a", "libmp3lame", "-q:a", "2", full], { stdio: ["ignore", "ignore", "ignore"] });

// cuts por duración real
const cuts = [];
let acc = 0;
for (let i = 0; i < segs.length; i++) {
  const d = parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", segs[i]], { encoding: "utf-8" }).trim());
  const start = Math.round(acc * 1000) / 1000;
  const end = Math.round((acc + d) * 1000) / 1000;
  cuts.push({ n: tomas[i].n, start, end, guion: tomas[i].text });
  acc += d;
}
const cutsPath = resolve("config", `cuts_${ad}.json`);
writeFileSync(cutsPath, JSON.stringify(cuts, null, 2), "utf-8");
console.log(`\n${ad} -> voz ${Math.round(acc * 10) / 10}s, ${cuts.length} tomas -> ${cutsPath}`);
