/**
 * make_subs.mjs — Subtítulos karaoke robustos (híbrido whisper-timing + guion-texto).
 * ─────────────────────────────────────────────────────────────────────────────
 * PROBLEMA que resuelve: whisper (capcut_subs.py) a veces SUELTA palabras — incl.
 * la marca en el CTA ("Biozentra"). El seeding con --prompt arregla ortografía pero
 * NO recupera palabras faltantes, y el sed no puede AGREGAR una palabra que no está.
 *
 * ESTRATEGIA:
 *   - BASE = palabras de whisper (buen timing + normaliza "eme ce te"→"MCT", "doce"→"12").
 *   - RECUPERACIÓN = alinea el guion conocido (cuts_<ad>.json) contra las palabras de
 *     whisper por LCS; donde whisper SOLTÓ una palabra de CONTENIDO del guion
 *     (alfabética, ≥4 letras → evita relleno fonético "eme/ce/te/uno"), la RE-INSERTA
 *     con timing interpolado en el hueco. Así "Biozentra" nunca se cae.
 *   - Emite .ass en el estilo YA aprobado (post-sed: WrapStyle 0, márgenes 110), o sea
 *     el finish NO necesita el sed de marcas nunca más.
 *
 * FUENTE DE TIMING (una de dos):
 *   --from-ass <archivo.ass>   extrae las palabras+timing de un .ass de capcut ya hecho
 *   --words <archivo.json>     [{word,start,end}] (dump directo de whisper)
 *
 * USO
 *   node make_subs.mjs <ad> --from-ass output/final_<ad>_voiced.ass [--cuts config/cuts_<ad>.json] [--out <ass>]
 *
 * SALIDA: <out> (default output/final_<ad>_voiced.ass, sobreescribe el de whisper).
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

// ---- estilo aprobado (idéntico al post-sed de finish_batch) ----
const PLAY_W = 1080, PLAY_H = 1920;
const FONT = "Montserrat ExtraBold", FONTSIZE = 90;
const PRIMARY = "&H00FFFFFF", HIGHLIGHT = "&H0000F0FF", OUTLINE = "&H00000000";
const OUTLINE_W = 6, SHADOW_W = 3, MARGIN_V = 320, MARGIN_LR = 110, POP = 112;
const MAX_WORDS = 4, MAX_GAP = 0.6;
// palabra "de contenido" recuperable: alfabética (con acentos) y ≥4 letras
const MIN_RECOVER_LEN = 4;
// SOLO recuperar si whisper dejó un HUECO temporal real (drop verdadero). Si no hay hueco,
// el "faltante" es en realidad una normalización de whisper (p.ej. "doce"→"12") y NO se recupera.
const RECOVER_MIN_GAP = 0.3;

// ---- args ----
const argv = process.argv.slice(2);
const ad = argv[0];
if (!ad || ad.startsWith("--")) { console.error("\n❌  Uso: node make_subs.mjs <ad> --from-ass <ass> | --words <json> [--cuts <json>] [--out <ass>]\n"); process.exit(1); }
const getOpt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const fromAss = getOpt("--from-ass");
const wordsJson = getOpt("--words");
const cutsPath = resolve(getOpt("--cuts") ?? `config/cuts_${ad}.json`);
const outPath = resolve(getOpt("--out") ?? `output/final_${ad}_voiced.ass`);
if (!fromAss && !wordsJson) { console.error("\n❌  Falta fuente de timing: --from-ass <ass> o --words <json>\n"); process.exit(1); }

// ---- helpers ----
const stripPunct = (s) => s.replace(/[.,!?:;¿¡"'…]/g, "");
const norm = (s) => stripPunct(s.toLowerCase()).normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
const isContent = (tok) => { const c = stripPunct(tok).normalize("NFD").replace(/[̀-ͯ]/g, ""); return /^[a-zA-Z]+$/.test(c) && c.length >= MIN_RECOVER_LEN; };
const endsPunct = (w) => /[.,!?:;]$/.test(w.trim());

function fmtTs(t) {
  if (t < 0) t = 0;
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = Math.floor(t % 60);
  let cs = Math.round((t - Math.floor(t)) * 100); let ss = s;
  if (cs === 100) { cs = 0; ss += 1; }
  return `${h}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}
function parseTs(ts) { const m = ts.match(/(\d+):(\d\d):(\d\d)\.(\d\d)/); if (!m) return 0; return (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) + (+m[4]) / 100; }
const esc = (t) => t.replace(/\\/g, "\\\\").replace(/{/g, "(").replace(/}/g, ")");

// agrupa una línea de tiempo de palabras {word,start,end} en frases y escribe el .ass karaoke.
function emitAss(timeline, outPath) {
  timeline.sort((a, b) => a.start - b.start);
  const phrases = []; let cur = [];
  for (const w of timeline) {
    if (cur.length) {
      const prev = cur[cur.length - 1];
      if (cur.length >= MAX_WORDS || (w.start - prev.end) > MAX_GAP || endsPunct(prev.word)) { phrases.push(cur); cur = []; }
    }
    cur.push(w);
  }
  if (cur.length) phrases.push(cur);
  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: ${PLAY_W}
PlayResY: ${PLAY_H}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,${FONT},${FONTSIZE},${PRIMARY},${PRIMARY},${OUTLINE},&H80000000,-1,0,0,0,100,100,0,0,1,${OUTLINE_W},${SHADOW_W},2,${MARGIN_LR},${MARGIN_LR},${MARGIN_V},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
  const out = [header];
  for (const ph of phrases) {
    for (let a = 0; a < ph.length; a++) {
      const start = ph[a].start;
      const end = a + 1 < ph.length ? ph[a + 1].start : ph[a].end;
      const parts = ph.map((ww, b) => {
        const token = esc(ww.word.trim());
        return b === a ? `{\\c${HIGHLIGHT}\\fscx${POP}\\fscy${POP}}${token}{\\c${PRIMARY}\\fscx100\\fscy100}` : token;
      });
      out.push(`Dialogue: 0,${fmtTs(start)},${fmtTs(end)},Cap,,0,0,0,,${parts.join(" ")}`);
    }
  }
  writeFileSync(outPath, out.join("\n"), "utf-8");
}

// ═══════════════════════════════════════════════════════════════════════════
// MODO ELEVENLABS (recomendado): timing EXACTO de EL + texto de display autoritativo.
// El timing de EL nunca suelta palabras (a diferencia de whisper). El texto sale del
// campo `sub` de cada cut (o `guion` si no hay `sub`) → display correcto ("MCT", "12"),
// y se alinea contra las palabras de EL para heredar su timing exacto. CERO whisper.
// Se activa con --words <json de EL> SIN --from-ass.
// ═══════════════════════════════════════════════════════════════════════════
if (wordsJson && !fromAss) {
  const el = JSON.parse(readFileSync(resolve(wordsJson), "utf-8")).map(w => ({ word: String(w.word).trim(), start: +w.start, end: +w.end }));
  const cutsE = JSON.parse(readFileSync(cutsPath, "utf-8"));
  const disp = []; // palabras de display (autoritativas)
  for (const c of cutsE) for (const w of String(c.sub ?? c.guion).split(/\s+/).filter(Boolean)) disp.push(w);
  // LCS entre display(norm) y EL(norm)
  const D = disp.map(norm), E = el.map(w => norm(w.word));
  const nn = D.length, mm = E.length;
  const dpe = Array.from({ length: nn + 1 }, () => new Int32Array(mm + 1));
  for (let a = nn - 1; a >= 0; a--) for (let b = mm - 1; b >= 0; b--)
    dpe[a][b] = D[a] === E[b] ? dpe[a + 1][b + 1] + 1 : Math.max(dpe[a + 1][b], dpe[a][b + 1]);
  const dispMatch = new Array(nn).fill(-1); // idx display -> idx EL
  { let a = 0, b = 0; while (a < nn && b < mm) { if (D[a] === E[b]) { dispMatch[a] = b; a++; b++; } else if (dpe[a + 1][b] >= dpe[a][b + 1]) a++; else b++; } }
  // asignar timing a cada palabra de display; los tramos divergentes (fonético↔display)
  // se reparten proporcionalmente sobre el span de EL entre las anclas vecinas.
  const tl = [];
  for (let a = 0; a < nn; a++) {
    if (dispMatch[a] >= 0) { const e = el[dispMatch[a]]; tl.push({ word: disp[a], start: e.start, end: e.end }); }
    else {
      // juntar el run divergente [a..a2)
      let a2 = a; while (a2 < nn && dispMatch[a2] < 0) a2++;
      const prevEl = a > 0 && dispMatch[a - 1] >= 0 ? el[dispMatch[a - 1]] : null;
      const nextEl = a2 < nn && dispMatch[a2] >= 0 ? el[dispMatch[a2]] : null;
      const spanStart = prevEl ? prevEl.end : (nextEl ? nextEl.start : 0);
      const spanEnd = nextEl ? nextEl.start : (prevEl ? prevEl.end : 0);
      const run = disp.slice(a, a2);
      const totLen = run.reduce((s, x) => s + x.length, 0) || run.length;
      let t = spanStart; const span = Math.max(0, spanEnd - spanStart);
      for (const word of run) { const dur = span * ((word.length || 1) / totLen); tl.push({ word, start: t, end: t + dur }); t += dur; }
      a = a2 - 1;
    }
  }
  emitAss(tl, outPath);
  console.log(`✅ ${outPath}  [modo ElevenLabs]`);
  console.log(`   EL words: ${el.length} · display words: ${disp.length} · fuente de timing: ElevenLabs (exacto, sin drops)`);
  process.exit(0);
}

// ---- 1) palabras de whisper (con timing) ----
let whisper = [];
if (wordsJson) {
  whisper = JSON.parse(readFileSync(resolve(wordsJson), "utf-8")).map(w => ({ word: w.word.trim(), start: +w.start, end: +w.end }));
} else {
  // extraer de un .ass de capcut: 1 Dialogue por palabra activa (resaltada en HIGHLIGHT)
  const lines = readFileSync(resolve(fromAss), "utf-8").split(/\r?\n/).filter(l => l.startsWith("Dialogue:"));
  for (const l of lines) {
    const m = l.match(/^Dialogue:\s*\d+,([^,]+),([^,]+),/);
    if (!m) continue;
    const start = parseTs(m[1]), end = parseTs(m[2]);
    // palabra activa = la envuelta en el color HIGHLIGHT
    const hm = l.match(/\{\\c&H0000F0FF[^}]*\}(.*?)\{\\c&H00FFFFFF/);
    if (!hm) continue;
    const word = hm[1].trim();
    if (word) whisper.push({ word, start, end });
  }
}
if (!whisper.length) { console.error("\n❌  No se extrajeron palabras de la fuente de timing.\n"); process.exit(1); }

// ---- 2) guion conocido (texto autoritativo) por cut ----
const cuts = JSON.parse(readFileSync(cutsPath, "utf-8"));
const script = []; // {word, cutStart, cutEnd}
for (const c of cuts) {
  for (const w of String(c.guion).split(/\s+/).filter(Boolean)) {
    script.push({ word: w, cutStart: +c.start, cutEnd: +c.end });
  }
}

// ---- 3) alineación LCS (tokens normalizados) ----
const W = whisper.map(w => norm(w.word)), S = script.map(s => norm(s.word));
const n = S.length, m = W.length;
const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
for (let i = n - 1; i >= 0; i--)
  for (let j = m - 1; j >= 0; j--)
    dp[i][j] = S[i] === W[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
// backtrack → pares (si, wj) alineados
const matchW = new Array(m).fill(-1); // wj -> si
let i = 0, j = 0;
while (i < n && j < m) {
  if (S[i] === W[j]) { matchW[j] = i; i++; j++; }
  else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
  else j++;
}

// ---- 4) construir línea de tiempo: whisper como base + recuperar drops de contenido ----
// mapa: para cada índice de script, ¿quedó alineado a algún whisper?
const scriptMatched = new Array(n).fill(false);
for (let w = 0; w < m; w++) if (matchW[w] >= 0) scriptMatched[matchW[w]] = true;

const timeline = [];
let lastScriptIdx = -1; // último índice de script "consumido" (alineado)
for (let w = 0; w < m; w++) {
  const si = matchW[w];
  if (si >= 0) {
    // antes de esta ancla, ¿hay palabras de guion sin match, de contenido, que whisper soltó?
    const dropped = [];
    for (let k = lastScriptIdx + 1; k < si; k++) if (!scriptMatched[k] && isContent(script[k].word)) dropped.push(k);
    if (dropped.length) {
      const prevEnd = timeline.length ? timeline[timeline.length - 1].end : whisper[w].start;
      const nextStart = whisper[w].start;
      const span = nextStart - prevEnd;
      if (span >= RECOVER_MIN_GAP) {          // hueco real → whisper soltó audio aquí
      const step = span / (dropped.length + 1);
      dropped.forEach((k, di) => {
        const st = prevEnd + step * (di + 1) - step * 0.45;
        timeline.push({ word: script[k].word, start: Math.max(prevEnd, st), end: Math.min(nextStart, st + step * 0.9), recovered: true });
      });
      }
    }
    timeline.push({ word: whisper[w].word, start: whisper[w].start, end: whisper[w].end });
    lastScriptIdx = si;
  } else {
    // whisper sin match (relleno/duplicado): confiar en whisper (ya es display-correcto)
    timeline.push({ word: whisper[w].word, start: whisper[w].start, end: whisper[w].end });
  }
}
// cola: palabras de contenido del guion tras la última ancla (whisper soltó el final)
const tailDropped = [];
for (let k = lastScriptIdx + 1; k < n; k++) if (!scriptMatched[k] && isContent(script[k].word)) tailDropped.push(k);
if (tailDropped.length) {
  const prevEnd = timeline.length ? timeline[timeline.length - 1].end : 0;
  const cutEnd = script[tailDropped[tailDropped.length - 1]].cutEnd;
  const span = cutEnd - prevEnd;
  if (span >= RECOVER_MIN_GAP) {
  const step = span / (tailDropped.length + 1);
  tailDropped.forEach((k, di) => {
    const st = prevEnd + step * (di + 1) - step * 0.45;
    timeline.push({ word: script[k].word, start: Math.max(prevEnd, st), end: st + step * 0.9, recovered: true });
  });
  }
}
timeline.sort((a, b) => a.start - b.start);

// ---- 5+6) agrupar y emitir ----
const recovered = timeline.filter(w => w.recovered).length;
emitAss(timeline, outPath);
console.log(`✅ ${outPath}  [modo whisper+recuperación]`);
console.log(`   whisper words: ${whisper.length} · script words: ${script.length} · recuperadas (drops de contenido): ${recovered}`);
