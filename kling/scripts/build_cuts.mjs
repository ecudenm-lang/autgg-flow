/**
 * build_cuts.mjs — PROPONE un cuts_<nombre>.json a partir del transcript de la voz.
 *
 * Quita el "problema de la hoja en blanco": en vez de escribir el JSON de cortes a mano,
 * este script agrupa las palabras del transcript en tomas (por puntuación, silencios y duración)
 * y deja un cuts_<nombre>.json listo para AJUSTAR. La regla del método sigue mandando:
 * una toma = una frase/beat; revisa y edita las divisiones antes de producir.
 *
 * USO
 *   node build_cuts.mjs <nombre> [gap_seg] [max_dur_seg] [max_palabras]
 *   ej: node build_cuts.mjs demo                (defaults: gap=0.6s, max_dur=10s, max_palabras=14)
 *
 * ENTRADA:  config/transcript_<nombre>.json   (lo genera transcribe_fal.mjs)
 * SALIDA:   config/cuts_<nombre>.json          = [{n,start,end,guion}]   (NO sobreescribe sin -f)
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, join } from "path";

const nombre = process.argv[2];
const GAP     = Number(process.argv[3] ?? 0.6);   // silencio entre palabras que corta una toma
const MAX_DUR = Number(process.argv[4] ?? 10);    // duración máx por toma (s) antes de forzar corte
const MAX_W   = Number(process.argv[5] ?? 14);    // palabras máx por toma
const force   = process.argv.includes("-f");

if (!nombre) {
  console.error("\n❌  Uso: node build_cuts.mjs <nombre> [gap_seg] [max_dur_seg] [max_palabras]\n");
  process.exit(1);
}
const inPath  = resolve("config", `transcript_${nombre}.json`);
const outPath = resolve("config", `cuts_${nombre}.json`);
if (!existsSync(inPath)) { console.error(`\n❌  No existe ${inPath}. Corre antes: node transcribe_fal.mjs <voz> ${nombre} <idioma>\n`); process.exit(1); }
if (existsSync(outPath) && !force) { console.error(`\n⚠️  ${outPath} ya existe. Usa -f para sobreescribir.\n`); process.exit(1); }

const t = JSON.parse(readFileSync(inPath, "utf-8").replace(/^﻿/, ""));
const words = (t.words || []).filter((w) => w && w.text && w.start != null && w.end != null);
if (!words.length) { console.error("\n❌  El transcript no tiene palabras con timestamps.\n"); process.exit(1); }

const endsSentence = (s) => /[.?!…:]["')\]]?\s*$/.test(s);

const tomas = [];
let cur = [];
const flush = () => {
  if (!cur.length) return;
  const start = cur[0].start, end = cur[cur.length - 1].end;
  tomas.push({
    n: String(tomas.length + 1).padStart(2, "0"),
    start: Number(start.toFixed(3)),
    end: Number(end.toFixed(3)),
    guion: cur.map((w) => w.text).join(" ").replace(/\s+/g, " ").trim(),
  });
  cur = [];
};

for (let i = 0; i < words.length; i++) {
  const w = words[i];
  if (cur.length) {
    const prev = cur[cur.length - 1];
    const gap = w.start - prev.end;
    const dur = prev.end - cur[0].start;
    if (endsSentence(prev.text) || gap > GAP || dur >= MAX_DUR || cur.length >= MAX_W) flush();
  }
  cur.push(w);
}
flush();

// Marcar tomas >10s: el método pide partirlas en 2 planos (aviso, no lo hace solo)
const largas = tomas.filter((t) => t.end - t.start > 10).map((t) => t.n);

writeFileSync(outPath, JSON.stringify(tomas, null, 2), "utf-8");
console.log(`\n✅  Propuesta de cortes → ${outPath}   (${tomas.length} tomas)`);
for (const t of tomas) console.log(`   ${t.n}  ${t.start.toFixed(2)}–${t.end.toFixed(2)}s  ${t.guion.slice(0, 60)}${t.guion.length > 60 ? "…" : ""}`);
if (largas.length) console.log(`\n⚠️  Tomas > 10s (conviene partir en 2 planos): ${largas.join(", ")}`);
console.log(`\n👉  REVISA y AJUSTA cuts_${nombre}.json (una toma = una frase/beat) antes de cortar el audio.\n`);
