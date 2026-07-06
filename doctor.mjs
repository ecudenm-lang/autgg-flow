/**
 * doctor.mjs — Chequeo de salud del FLOW COMPLETO (Fase 0 · Pegasus · Kling). GASTA $0.
 *
 *   node doctor.mjs           → verifica herramientas y claves de las 3 etapas
 *   node doctor.mjs --smoke   → además valida los JSON de ejemplo de kling
 *
 * Verde = listo · Amarillo = opcional/falta esa etapa · Rojo = bloquea esa etapa.
 */
import { spawnSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const G = "\x1b[32m", Y = "\x1b[33m", R = "\x1b[31m", B = "\x1b[1m", C = "\x1b[36m", X = "\x1b[0m";
const OK = `${G}✅ OK${X}`, WARN = `${Y}⚠  FALTA${X}`, BAD = `${R}❌ FALTA${X}`;

// ── Cargar .env (raíz) ───────────────────────────────────────────────────────
const env = { ...process.env };
const envPath = join(ROOT, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
    if (m && !line.trim().startsWith("#")) {
      env[m[1]] = m[2].replace(/(^|\s)#.*$/, "$1").trim().replace(/^["']|["']$/g, "").trim();
    }
  }
}

const rows = [];
const add = (name, status, detail = "") => rows.push({ name, status, detail });
const head = (t) => rows.push({ header: t });

function tryCmd(cmd, args = ["--version"]) {
  try {
    const r = spawnSync(cmd, args, { encoding: "utf-8", shell: false });
    if (r.status !== 0) return null;
    const out = (r.stdout || r.stderr || "").split(/\r?\n/)[0].trim();
    if (!out || /microsoft store/i.test(out)) return null;
    return out;
  } catch {}
  return null;
}
const mask = (v) => (v ? `presente (${v.length} chars)` : "vacía");

// ── COMÚN: herramientas ──────────────────────────────────────────────────────
head("COMÚN (herramientas)");
const nodeMajor = Number(process.versions.node.split(".")[0]);
add("Node.js", nodeMajor >= 18 ? OK : BAD, `v${process.versions.node}`);
const ffmpegBin = env.FFMPEG || "ffmpeg", ffprobeBin = env.FFPROBE || "ffprobe";
const ffv = tryCmd(ffmpegBin, ["-version"]);   add("ffmpeg (Kling)",  ffv ? OK : BAD, ffv || "winget install Gyan.FFmpeg");
const fpv = tryCmd(ffprobeBin, ["-version"]);  add("ffprobe (Kling)", fpv ? OK : BAD, fpv || "viene con ffmpeg");
const pyBin = tryCmd("python", ["--version"]) ? "python" : (tryCmd("py", ["--version"]) ? "py" : null);
add("Python (postpro/apify)", pyBin ? OK : WARN, pyBin ? tryCmd(pyBin, ["--version"]) : "opcional — subtítulos/research");
if (pyBin) {
  const fw = spawnSync(pyBin, ["-c", "import faster_whisper"], { encoding: "utf-8" });
  add("  faster-whisper", fw.status === 0 ? OK : WARN, fw.status === 0 ? "importable" : "pip install -r kling/requirements.txt");
  const pil = spawnSync(pyBin, ["-c", "import PIL"], { encoding: "utf-8" });
  add("  Pillow", pil.status === 0 ? OK : WARN, pil.status === 0 ? "importable" : "pip install -r kling/requirements.txt");
}
const klingMods = existsSync(join(ROOT, "kling", "node_modules", "@fal-ai", "client"));
add("kling deps (npm)", klingMods ? OK : BAD, klingMods ? "@fal-ai/client presente" : "cd kling && npm install");

// ── FASE 0 (Apify research) ──────────────────────────────────────────────────
head("FASE 0 — Research (Apify / TrendTrack)");
add("APIFY_TOKEN", env.APIFY_TOKEN ? OK : WARN, env.APIFY_TOKEN ? mask(env.APIFY_TOKEN) : "solo si corres scraping Apify");
add("TRENDTRACK_TOKEN", env.TRENDTRACK_TOKEN ? OK : WARN, env.TRENDTRACK_TOKEN ? mask(env.TRENDTRACK_TOKEN) : "solo si usas TrendTrack");

// ── ETAPA 3 (Pegasus) ────────────────────────────────────────────────────────
head("ETAPA 3 — Pegasus (análisis visual)");
add("TL_API_KEY", env.TL_API_KEY ? OK : WARN, env.TL_API_KEY ? mask(env.TL_API_KEY) : "TwelveLabs — solo si analizas video");

// ── ETAPA 4 (Kling) ──────────────────────────────────────────────────────────
head("ETAPA 4 — Kling (producción de video)");
add("KIE_API_KEY", env.KIE_API_KEY ? OK : BAD, mask(env.KIE_API_KEY));
add("FAL_KEY", env.FAL_KEY ? OK : BAD, mask(env.FAL_KEY));
add("ELEVENLABS_API_KEY", env.ELEVENLABS_API_KEY ? OK : WARN, env.ELEVENLABS_API_KEY ? mask(env.ELEVENLABS_API_KEY) : "opcional — TTS");

// ── SMOKE ────────────────────────────────────────────────────────────────────
if (process.argv.includes("--smoke")) {
  head("SMOKE (JSON de ejemplo)");
  const checkJson = (rel, keys) => {
    const p = join(ROOT, rel);
    if (!existsSync(p)) return add(rel, WARN, "no existe");
    try {
      const arr = JSON.parse(readFileSync(p, "utf-8"));
      const ok = Array.isArray(arr) && arr.length && keys.every((k) => k in arr[0]);
      add(rel, ok ? OK : BAD, ok ? `${arr.length} items OK` : `faltan: ${keys.join(",")}`);
    } catch (e) { add(rel, BAD, "JSON inválido"); }
  };
  checkJson("kling/examples/keyframes_input_demo.json", ["n", "kf_prompt"]);
  checkJson("kling/examples/cuts_demo.json", ["n", "start", "end"]);
  checkJson("kling/examples/batch_input_demo.json", ["n", "image_url", "prompt"]);
}

// ── Reporte ──────────────────────────────────────────────────────────────────
console.log(`\n${B}AUTGG-FLOW · DOCTOR${X}   (Fase 0 · Pegasus · Kling — no gasta créditos)\n`);
for (const r of rows) {
  if (r.header) { console.log(`\n${C}${B}▸ ${r.header}${X}`); continue; }
  console.log(`  ${r.status}  ${B}${r.name.padEnd(24)}${X} ${r.detail}`);
}
const blockers = rows.filter((r) => r.status === BAD);
console.log("");
if (blockers.length === 0) {
  console.log(`  ${G}${B}Todo lo esencial está listo.${X}\n`);
} else {
  console.log(`  ${R}${B}${blockers.length} bloqueo(s):${X} ${blockers.map((b) => b.name).join(", ")}.\n`);
  process.exitCode = 1;
}
