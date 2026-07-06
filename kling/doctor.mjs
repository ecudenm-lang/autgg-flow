/**
 * doctor.mjs — Chequeo de salud del kit. GASTA $0 (no llama a ninguna API de pago).
 *
 *   node doctor.mjs           → verifica node, ffmpeg, ffprobe, python, paquetes y claves
 *   node doctor.mjs --smoke   → además valida los JSON de ejemplo (examples/)
 *
 * Verde = listo · Amarillo = opcional/falta (solo si usas esa parte) · Rojo = bloquea el core.
 */
import { spawnSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const G = "\x1b[32m", Y = "\x1b[33m", R = "\x1b[31m", B = "\x1b[1m", X = "\x1b[0m";
const OK = `${G}✅ OK${X}`, WARN = `${Y}⚠  FALTA${X}`, BAD = `${R}❌ FALTA${X}`;

// ── Cargar .env (sin dependencias) ────────────────────────────────────────────
const env = { ...process.env };
const envPath = join(ROOT, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
    if (m && !line.trim().startsWith("#")) {
      // Cortar comentario en línea: un '#' al inicio del valor o precedido por espacio.
      // (Las claves API no contienen " #", así que esto no las corta.)
      let val = m[2].replace(/(^|\s)#.*$/, "$1").trim().replace(/^["']|["']$/g, "").trim();
      env[m[1]] = val;
    }
  }
}

const rows = [];
const add = (name, status, detail = "") => rows.push({ name, status, detail });

function tryCmd(cmd, args = ["--version"]) {
  try {
    const r = spawnSync(cmd, args, { encoding: "utf-8", shell: false });
    if (r.status !== 0) return null;                         // exigir éxito REAL (no basta con que imprima algo)
    const out = (r.stdout || r.stderr || "").split(/\r?\n/)[0].trim();
    if (!out || /microsoft store/i.test(out)) return null;  // descartar el alias falso de la Microsoft Store
    return out;
  } catch {}
  return null;
}

// ── 1. Node ───────────────────────────────────────────────────────────────────
const nodeMajor = Number(process.versions.node.split(".")[0]);
add("Node.js", nodeMajor >= 18 ? OK : BAD, `v${process.versions.node}${nodeMajor < 18 ? " (se requiere ≥18)" : ""}`);

// ── 2. node_modules instalado ───────────────────────────────────────────────────
const falInstalled = existsSync(join(ROOT, "node_modules", "@fal-ai", "client"));
add("Dependencias npm", falInstalled ? OK : BAD, falInstalled ? "@fal-ai/client presente" : "corre:  npm install");

// ── 3. ffmpeg / ffprobe ─────────────────────────────────────────────────────────
const ffmpegBin  = env.FFMPEG  || "ffmpeg";
const ffprobeBin = env.FFPROBE || "ffprobe";
const ffv = tryCmd(ffmpegBin,  ["-version"]);   add("ffmpeg",  ffv ? OK : BAD, ffv || "instálalo o define FFMPEG en .env");
const fpv = tryCmd(ffprobeBin, ["-version"]);   add("ffprobe", fpv ? OK : BAD, fpv || "viene con ffmpeg; define FFPROBE en .env");

// ── 4. Python + paquetes (SOLO post-producción) ──────────────────────────────────
const pyBin = tryCmd("python", ["--version"]) ? "python" : (tryCmd("py", ["--version"]) ? "py" : null);
add("Python (postpro)", pyBin ? OK : WARN, pyBin ? tryCmd(pyBin, ["--version"]) : "opcional — solo para subtítulos/banner");
if (pyBin) {
  const fw = spawnSync(pyBin, ["-c", "import faster_whisper"], { encoding: "utf-8" });
  add("  faster-whisper", fw.status === 0 ? OK : WARN, fw.status === 0 ? "importable" : "pip install -r requirements.txt");
  const pil = spawnSync(pyBin, ["-c", "import PIL"], { encoding: "utf-8" });
  add("  Pillow", pil.status === 0 ? OK : WARN, pil.status === 0 ? "importable" : "pip install -r requirements.txt");
}

// ── 5. Claves (presencia, NUNCA se imprime el valor) ─────────────────────────────
const mask = (v) => v ? `presente (${v.length} chars)` : "vacía";
add("KIE_API_KEY",       env.KIE_API_KEY ? OK : BAD,  mask(env.KIE_API_KEY));
add("FAL_KEY",           env.FAL_KEY ? OK : BAD,      mask(env.FAL_KEY));
add("ELEVENLABS_API_KEY", env.ELEVENLABS_API_KEY ? OK : WARN, env.ELEVENLABS_API_KEY ? mask(env.ELEVENLABS_API_KEY) : "opcional — solo TTS");

// ── 6. Fuentes de subtítulos ─────────────────────────────────────────────────────
const font = existsSync(join(ROOT, "assets", "fonts", "Montserrat-ExtraBold.ttf"));
add("Fuentes (subtítulos)", font ? OK : WARN, font ? "Montserrat presente" : "faltan .ttf en assets/fonts");

// ── SMOKE: validar JSON de ejemplo ────────────────────────────────────────────────
if (process.argv.includes("--smoke")) {
  const checkJson = (rel, requiredKeys) => {
    const p = join(ROOT, rel);
    if (!existsSync(p)) return add(`ejemplo ${rel}`, WARN, "no existe");
    try {
      const arr = JSON.parse(readFileSync(p, "utf-8"));
      const ok = Array.isArray(arr) && arr.length && requiredKeys.every(k => k in arr[0]);
      add(`ejemplo ${rel}`, ok ? OK : BAD, ok ? `${arr.length} items, campos OK` : `faltan campos: ${requiredKeys.join(",")}`);
    } catch (e) { add(`ejemplo ${rel}`, BAD, "JSON inválido: " + e.message); }
  };
  checkJson("examples/keyframes_input_demo.json", ["n", "kf_prompt"]);
  checkJson("examples/cuts_demo.json", ["n", "start", "end"]);
  checkJson("examples/batch_input_demo.json", ["n", "image_url", "prompt"]);
  checkJson("examples/lipsync_input_demo.json", ["n", "video", "audio"]);
}

// ── Reporte ───────────────────────────────────────────────────────────────────────
console.log(`\n${B}KLINGAUT-STARTER · DOCTOR${X}   (este chequeo no gasta créditos)\n`);
for (const r of rows) {
  console.log(`  ${r.status}  ${B}${r.name.padEnd(22)}${X} ${r.detail}`);
}
const blockers = rows.filter(r => r.status === BAD);
console.log("");
if (blockers.length === 0) {
  console.log(`  ${G}${B}Todo lo esencial está listo.${X} Puedes correr un video de prueba (aprobando el gasto).\n`);
} else {
  console.log(`  ${R}${B}${blockers.length} bloqueo(s) del core:${X} ${blockers.map(b => b.name).join(", ")}.  Resuélvelos antes de correr.\n`);
  process.exitCode = 1;
}
