/**
 * gen_vo.mjs — VO multi-voz toma-por-toma, GENERICO para cualquier batch.
 * ElevenLabs directo (eleven_flash_v2_5) con request-stitching (previous/next dentro
 * de runs de la misma voz) + seed fijo. Lee config/<ad>.json:
 *   { "ad":"so1_1", "batch":"SO1", "voices":{alias:voiceId}, "tomas":[{n,voice,text}] }
 * Escribe audio/<BATCH>/<ad>/seg_NN.mp3, audio/<BATCH>/<ad>_full.mp3, config/cuts_<ad>.json, config/words_<ad>.json.
 * USO: node gen_vo.mjs config/<ad>.json
 * CLAVE: ELEVENLABS_API_KEY (env; o config/elevenlabs_key.txt).  ffmpeg/ffprobe: env FFMPEG/FFPROBE o PATH.
 */
import { execFileSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { resolve, join } from "path";

const FFMPEG  = process.env.FFMPEG  || "ffmpeg";
const FFPROBE = process.env.FFPROBE || "ffprobe";

const cfgPath = resolve(process.argv[2] ?? "");
if (!process.argv[2] || !existsSync(cfgPath)) { console.error("\n❌  Uso: node gen_vo.mjs config/<ad>.json\n"); process.exit(1); }
const cfg = JSON.parse(readFileSync(cfgPath, "utf-8"));

// Clave PORTABLE: env var primero; fallback a config/elevenlabs_key.txt (gitignored). Sin rutas a otra maquina.
const keyFile = resolve("config", "elevenlabs_key.txt");
const KEY = (process.env.ELEVENLABS_API_KEY || (existsSync(keyFile) ? readFileSync(keyFile, "utf-8") : "")).trim();
if (!KEY) { console.error('\n❌  ELEVENLABS_API_KEY no encontrada.\n    Carga tu .env:  . .\\load_env.ps1   (o crea config/elevenlabs_key.txt)\n'); process.exit(1); }

const MODEL = "eleven_flash_v2_5", SEED = 777;
const ad = cfg.ad;
const batch = cfg.batch || "MISC";
const segDir = resolve("audio", batch, ad);
mkdirSync(segDir, { recursive: true });
mkdirSync(resolve("config"), { recursive: true });
const tomas = cfg.tomas;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Agrupa el alignment por-caracter de ElevenLabs en palabras {word,start,end} (tiempos relativos al seg).
function charsToWords(al) {
  const ch = al?.characters, st = al?.character_start_times_seconds, et = al?.character_end_times_seconds;
  if (!Array.isArray(ch) || !Array.isArray(st) || !Array.isArray(et)) return [];
  const words = []; let cur = [], curStart = null, lastEnd = 0;
  for (let i = 0; i < ch.length; i++) {
    if (/\s/.test(ch[i])) {
      if (cur.length) { words.push({ word: cur.join(""), start: curStart, end: lastEnd }); cur = []; curStart = null; }
    } else {
      if (curStart == null) curStart = st[i];
      cur.push(ch[i]); lastEnd = et[i];
    }
  }
  if (cur.length) words.push({ word: cur.join(""), start: curStart, end: lastEnd });
  return words;
}

// TTS con timestamps nativos de ElevenLabs -> escribe mp3 y DEVUELVE las palabras con timing exacto.
// Esto elimina la necesidad de whisper para el timing (y la marca nunca se cae: EL sabe cuando la dijo).
async function tts(voiceId, text, prev, next, outPath) {
  const body = {
    text, model_id: MODEL,
    voice_settings: { stability: 0.6, similarity_boost: 0.75, style: 0.1, use_speaker_boost: true },
    seed: SEED, ...(prev ? { previous_text: prev } : {}), ...(next ? { next_text: next } : {}),
  };
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`;
  for (let att = 1; att <= 4; att++) {
    const r = await fetch(url, { method: "POST", headers: { "xi-api-key": KEY, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (r.ok) {
      const j = await r.json();
      writeFileSync(outPath, Buffer.from(j.audio_base64, "base64"));
      return charsToWords(j.alignment);
    }
    const msg = await r.text();
    if (att === 4) throw new Error(`TTS ${r.status}: ${msg.slice(0, 200)}`);
    await sleep(1500 * att);
  }
}

const segs = [], segWords = [];
for (let i = 0; i < tomas.length; i++) {
  const t = tomas[i], vid = cfg.voices[t.voice];
  const prev = (i > 0 && tomas[i - 1].voice === t.voice) ? tomas[i - 1].text : "";
  const next = (i < tomas.length - 1 && tomas[i + 1].voice === t.voice) ? tomas[i + 1].text : "";
  const out = join(segDir, `seg_${t.n}.mp3`);
  const words = await tts(vid, t.text, prev, next, out);
  segs.push(out); segWords.push(words);
  console.log(`  ✅ ${ad} seg_${t.n} (${t.voice})  ·  ${words.length} palabras con timing`);
}
const listPath = join(segDir, "_concat.txt");
writeFileSync(listPath, segs.map(p => `file '${p.replace(/\\/g, "/")}'`).join("\n"), "ascii");
const full = resolve("audio", batch, `${ad}_full.mp3`);
execFileSync(FFMPEG, ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c:a", "libmp3lame", "-q:a", "2", full], { stdio: ["ignore", "ignore", "ignore"] });
const cuts = []; const wordsGlobal = []; let acc = 0;
for (let i = 0; i < segs.length; i++) {
  const d = parseFloat(execFileSync(FFPROBE, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", segs[i]], { encoding: "utf-8" }).trim());
  cuts.push({ n: tomas[i].n, start: Math.round(acc * 1000) / 1000, end: Math.round((acc + d) * 1000) / 1000, guion: tomas[i].text });
  // palabras del seg desplazadas al offset global del track completo (timing exacto de ElevenLabs)
  for (const w of segWords[i]) wordsGlobal.push({ word: w.word, start: Math.round((acc + w.start) * 1000) / 1000, end: Math.round((acc + w.end) * 1000) / 1000, n: tomas[i].n });
  acc += d;
}
writeFileSync(resolve("config", `cuts_${ad}.json`), JSON.stringify(cuts, null, 2), "utf-8");
writeFileSync(resolve("config", `words_${ad}.json`), JSON.stringify(wordsGlobal, null, 2), "utf-8");
console.log(`${ad} -> voz ${Math.round(acc * 10) / 10}s, ${cuts.length} tomas`);
