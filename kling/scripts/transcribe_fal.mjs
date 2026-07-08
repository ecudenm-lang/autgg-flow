/**
 * transcribe_fal.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Transcribe un audio de narración con Whisper en fal y devuelve TIMESTAMPS por
 * palabra. Sirve para saber en qué segundo se dice cada frase del guion y así
 * cortar el audio por toma (cut_audio.mjs) y sincronizar el video a la voz.
 *
 * USO
 *   node transcribe_fal.mjs <audio_local_o_url> <nombre> [idioma]
 *   ej:  node transcribe_fal.mjs narracion_v2.mp3 v2 es
 *
 * SALIDA
 *   transcript_<nombre>.json   → { text, words:[{n,text,start,end}], chunks:[...] }
 *   También imprime en consola las palabras con su tiempo para revisar rápido.
 *
 * VARIABLE DE ENTORNO:  FAL_KEY
 * COSTO: Whisper en fal es muy barato (centavos por audio). Sin gate de aprobación.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { fal } from "@fal-ai/client";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { resolve, extname, basename } from "path";

const FAL_KEY = process.env.FAL_KEY;
if (!FAL_KEY) { console.error('\n❌  FAL_KEY no encontrado.\n    Carga tu .env:  . .\\load_env.ps1   (o setea a mano:  $env:FAL_KEY = "tu-clave")\n'); process.exit(1); }
fal.config({ credentials: FAL_KEY });

const inArg  = process.argv[2];
const nombre = process.argv[3] ?? "audio";
const idioma = process.argv[4] ?? "es";
if (!inArg) { console.error("\n❌  Falta el audio.\n    node transcribe_fal.mjs <audio_local_o_url> <nombre> [idioma]\n"); process.exit(1); }

const AUDIO_MIME = {
  ".mp3": "audio/mpeg", ".wav": "audio/wav", ".m4a": "audio/mp4",
  ".aac": "audio/aac", ".ogg": "audio/ogg", ".mp4": "video/mp4", ".webm": "audio/webm",
};

async function toUrl(p) {
  if (/^https?:\/\//i.test(p)) return p;
  const fp = resolve(p);
  if (!existsSync(fp)) { console.error(`\n❌  No se encontró: ${fp}\n`); process.exit(1); }
  const type = AUDIO_MIME[extname(fp).toLowerCase()] ?? "application/octet-stream";
  console.log(`⬆️   Subiendo ${basename(fp)} a fal storage…`);
  return await fal.storage.upload(new Blob([readFileSync(fp)], { type }));
}

const audio_url = await toUrl(inArg);
console.log(`🎙️   Transcribiendo (idioma=${idioma}, word-level)…\n`);

const out = await fal.subscribe("fal-ai/whisper", {
  input: { audio_url, task: "transcribe", language: idioma, chunk_level: "word" },
  logs: false,
});
const data = out?.data ?? out;
const chunks = data?.chunks ?? [];

// Normalizar a lista de palabras {n, text, start, end}
const words = chunks.map((c, i) => ({
  n: i,
  text: (c.text ?? "").trim(),
  start: Array.isArray(c.timestamp) ? c.timestamp[0] : (c.start ?? null),
  end:   Array.isArray(c.timestamp) ? c.timestamp[1] : (c.end ?? null),
}));

mkdirSync(resolve("config"), { recursive: true });
const outPath = resolve("config", `transcript_${nombre}.json`);
writeFileSync(outPath, JSON.stringify({ text: data?.text ?? "", language: idioma, words, chunks }, null, 2), "utf-8");

// Vista rápida en consola: una línea por palabra con su tiempo
const fmt = (t) => (t == null ? "  ?  " : t.toFixed(2).padStart(6));
console.log("─".repeat(60));
for (const w of words) console.log(`  [${fmt(w.start)} → ${fmt(w.end)}]  ${w.text}`);
console.log("─".repeat(60));
const dur = words.length ? words[words.length - 1].end : null;
console.log(`\n✅  ${words.length} palabras · duración ≈ ${dur != null ? dur.toFixed(2) + "s" : "?"}`);
console.log(`📄  Guardado: ${basename(outPath)}\n`);
console.log("SIGUIENTE: armamos un cuts_<nombre>.json [{n,start,end}] por toma y corremos cut_audio.mjs.\n");
