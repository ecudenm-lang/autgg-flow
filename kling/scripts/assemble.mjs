/**
 * assemble.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Ensambla los clips de clips/raw_NN.mp4 en orden, cortes secos, sin audio.
 *
 * USO
 *   node assemble.mjs <nombre_shotlist> [timecodes_<nombre>.json]
 *
 *   Sin timecodes → concat de clips a duración completa
 *   Con timecodes → cada clip recortado a su duración real en el audio
 *
 * TIMECODES JSON
 *   { "audio_duration": 53.76, "shots": [{ "n": "01", "tc_start": 0.00 }, …] }
 *   La duración de cada clip = tc_start[siguiente] - tc_start[actual]
 *   La duración del último   = audio_duration - tc_start[último]
 *   Si un clip generado es más corto que el requerido, se usa su duración total.
 *
 * SALIDA
 *   final_<nombre>.mp4  → video ensamblado (nunca sobreescribe)
 *   index_<nombre>.md   → índice de tomas
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { execSync }  from "child_process";
import {
  existsSync, readdirSync,
  writeFileSync, readFileSync, unlinkSync,
} from "fs";
import { resolve, join, basename } from "path";

// ─── Args ─────────────────────────────────────────────────────────────────────
const shotlistName   = process.argv[2];
const timecodesArg   = process.argv[3] ?? null;

if (!shotlistName) {
  console.error("\n❌  Falta nombre de shotlist.\n    Uso: node assemble.mjs sintomas_v2_timed [timecodes_sintomas_v2_timed.json]\n");
  process.exit(1);
}

const clipsDir  = resolve(process.cwd(), "clips");
const outputMp4 = resolve(process.cwd(), `final_${shotlistName}.mp4`);
const outputMd  = resolve(process.cwd(), `index_${shotlistName}.md`);

if (existsSync(outputMp4)) {
  console.error(`\n⚠️  ${basename(outputMp4)} ya existe. Borralo o renombralo antes de ensamblar.\n`);
  process.exit(1);
}

// ─── Leer batch_input.json para el índice ─────────────────────────────────────
let batchData = [];
const batchPath = resolve(process.cwd(), "batch_input.json");
if (existsSync(batchPath)) {
  try { batchData = JSON.parse(readFileSync(batchPath, "utf-8")); } catch {}
}
const batchMap = Object.fromEntries(batchData.map(s => [s.n, s]));

// ─── Leer timecodes (opcional) ────────────────────────────────────────────────
let trimMap = null;  // n → seconds to keep

if (timecodesArg) {
  const tcPath = resolve(process.cwd(), timecodesArg);
  if (!existsSync(tcPath)) {
    console.error(`\n❌  No se encontró archivo de timecodes: ${tcPath}\n`);
    process.exit(1);
  }
  const tc = JSON.parse(readFileSync(tcPath, "utf-8"));
  const audioDur = tc.audio_duration;
  const tcShots  = tc.shots;
  trimMap = {};
  for (let i = 0; i < tcShots.length; i++) {
    const start = tcShots[i].tc_start;
    const end   = i + 1 < tcShots.length ? tcShots[i + 1].tc_start : audioDur;
    trimMap[tcShots[i].n] = parseFloat((end - start).toFixed(3));
  }
  console.log(`\n📐  Timecodes cargados — duración objetivo: ${audioDur}s`);
}

// ─── Encontrar clip más reciente para cada toma ───────────────────────────────
function findClip(n) {
  const prefix = `raw_${n}`;
  const all    = readdirSync(clipsDir).filter(f =>
    f.startsWith(prefix) && f.endsWith(".mp4") &&
    (f === `${prefix}.mp4` || new RegExp(`^raw_${n}_\\d+\\.mp4$`).test(f))
  );
  if (all.length === 0) return null;
  const ranked = all.map(f => {
    const m = f.match(new RegExp(`^raw_${n}_(\\d+)\\.mp4$`));
    return { file: f, suffix: m ? parseInt(m[1]) : -1 };
  });
  ranked.sort((a, b) => b.suffix - a.suffix);
  return join(clipsDir, ranked[0].file);
}

// ─── Construir lista de clips ─────────────────────────────────────────────────
const shotNums = batchData.length > 0
  ? batchData.map(s => s.n)
  : Array.from({ length: 14 }, (_, i) => String(i + 1).padStart(2, "0"));

const clipList = [];
const missing  = [];

for (const n of shotNums) {
  const clip = findClip(n);
  if (clip) clipList.push({ n, path: clip });
  else { missing.push(n); console.warn(`  ⚠️  No se encontró clip para toma ${n}`); }
}

if (clipList.length === 0) {
  console.error("\n❌  No se encontraron clips.\n"); process.exit(1);
}
if (missing.length > 0) {
  console.warn(`\n⚠️  Faltan tomas: ${missing.join(", ")} — se ensambla con las disponibles.\n`);
}

// ─── Mostrar plan ─────────────────────────────────────────────────────────────
const SEP  = "─".repeat(72);
const SEP2 = "═".repeat(72);

console.log(`\n${SEP2}`);
console.log(`  ENSAMBLAR — ${shotlistName}${trimMap ? "  (con recorte por timecodes)" : ""}`);
console.log(SEP2);
console.log(`  ${"N°".padEnd(5)} ${"Archivo".padEnd(22)} ${"Trim".padEnd(8)} Final`);
console.log(SEP);

let totalFinal = 0;
for (const { n, path: p } of clipList) {
  const trim   = trimMap ? trimMap[n] : null;
  const trimStr = trim ? `→ ${trim}s` : "(completo)";
  console.log(`  ${n.padEnd(5)} ${basename(p).padEnd(22)} ${trimStr}`);
  totalFinal += trim ?? 0;
}

console.log(SEP);
console.log(`  Total tomas : ${clipList.length}`);
if (trimMap) console.log(`  Duración final: ~${totalFinal.toFixed(2)}s`);
console.log(`  Salida      : ${basename(outputMp4)}`);
console.log(`${SEP2}\n`);

// ─── Recortar clips si hay timecodes ─────────────────────────────────────────
const tempFiles = [];

function trimClip(srcPath, duration) {
  const tmpPath = srcPath.replace(".mp4", `_trim${duration}.mp4`);
  const cmd = `ffmpeg -y -i "${srcPath}" -t ${duration} -c copy -an "${tmpPath}"`;
  execSync(cmd, { stdio: "pipe" });
  tempFiles.push(tmpPath);
  return tmpPath;
}

// ─── Preparar lista de archivos para concat ───────────────────────────────────
const finalClipPaths = [];

if (trimMap) {
  console.log("✂️   Recortando clips a timecodes…");
  for (const { n, path: p } of clipList) {
    const targetDur = trimMap[n];
    if (!targetDur) { finalClipPaths.push(p); continue; }

    // Obtener duración real del clip con ffprobe
    let clipDur = Infinity;
    try {
      const out = execSync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${p}"`,
        { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
      ).trim();
      clipDur = parseFloat(out);
    } catch {}

    if (targetDur >= clipDur - 0.05) {
      // Clip ya es más corto o igual — usar completo
      console.log(`  ✓ Toma ${n}: ${clipDur.toFixed(2)}s → usar completo (target ${targetDur}s ≥ clip)`);
      finalClipPaths.push(p);
    } else {
      console.log(`  ✂️  Toma ${n}: ${clipDur.toFixed(2)}s → recortar a ${targetDur}s`);
      const trimmed = trimClip(p, targetDur);
      finalClipPaths.push(trimmed);
    }
  }
  console.log();
} else {
  for (const { path: p } of clipList) finalClipPaths.push(p);
}

// ─── Crear archivo concat ─────────────────────────────────────────────────────
const concatPath = join(clipsDir, "_concat_list.txt");
const concatContent = finalClipPaths
  .map(p => `file '${p.replace(/\\/g, "/").replace(/'/g, "\\'")}'`)
  .join("\n");
writeFileSync(concatPath, concatContent, "utf-8");
tempFiles.push(concatPath);

// ─── Correr ffmpeg concat ─────────────────────────────────────────────────────
console.log("🎬  Ensamblando con ffmpeg…");

try {
  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${concatPath}" -c copy -an "${outputMp4}"`,
    { stdio: "pipe" }
  );
  console.log(`✅  Ensamblado → ${outputMp4}\n`);
} catch (err) {
  console.error("\n❌  ffmpeg falló:");
  console.error(err.stderr?.toString() ?? err.message);
  process.exit(1);
} finally {
  for (const f of tempFiles) { try { unlinkSync(f); } catch {} }
}

// ─── Obtener duración real del output ─────────────────────────────────────────
let realDur = "?";
try {
  realDur = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outputMp4}"`,
    { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
  ).trim();
  realDur = parseFloat(realDur).toFixed(2) + "s";
} catch {}

// ─── Crear index_<nombre>.md ──────────────────────────────────────────────────
const now = new Date().toISOString().slice(0, 19).replace("T", " ");
let md = `# Index — ${shotlistName}\n`;
md += `Generado: ${now} | Duración: ${realDur}\n\n`;
md += `| N° | Archivo | Dur clip | Dur final | Prompt animación |\n`;
md += `|---|---|---|---|---|\n`;

for (let i = 0; i < clipList.length; i++) {
  const { n, path: p } = clipList[i];
  const shot    = batchMap[n] ?? {};
  const durClip = shot.duration ? `${shot.duration}s` : "—";
  const durFin  = trimMap ? `${trimMap[n]}s` : durClip;
  const prompt  = (shot.prompt ?? "—").replace(/\|/g, "\\|").slice(0, 70);
  md += `| ${n} | ${basename(p)} | ${durClip} | ${durFin} | ${prompt} |\n`;
}

if (missing.length > 0) md += `\n## Tomas faltantes\n${missing.map(n => `- ${n}`).join("\n")}\n`;

writeFileSync(outputMd, md, "utf-8");
console.log(`📄  Índice → ${outputMd}`);

console.log(`\n${SEP2}`);
console.log("  LISTO");
console.log(SEP);
console.log(`  Video    : ${basename(outputMp4)}  (${realDur})`);
console.log(`  Índice   : ${basename(outputMd)}`);
console.log(`${SEP2}\n`);
