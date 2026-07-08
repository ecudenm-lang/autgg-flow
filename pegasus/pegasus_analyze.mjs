/**
 * pegasus_analyze.mjs — PASO 3 (Fábrica de Videos, dominio VISUAL): analiza un video con TwelveLabs Pegasus
 * y devuelve un JSON de estructura visual, listo para alimentar la generación de prompts.
 *
 * Pegasus "ve" el video ganador y describe: formato, estructura de escenas, ritmo, tipo de
 * plano y — mapeado al idioma videos-kling — el ROL de estilo sugerido por toma
 * (STORY / SCIENCE / EMOTION / CONCEPT).  Lo NARRATIVO (el guion) va por otro lado.
 *
 * USO
 *   node pegasus_analyze.mjs <video_url_o_ruta_local> [nombre] [--prompt "texto extra"]
 *   ej:  node pegasus_analyze.mjs https://.../ad.mp4 competidor_ad42
 *        node pegasus_analyze.mjs "clips/ref.mp4" ref_local
 *
 * SALIDA:  output/pegasus_<nombre>.json
 *
 * REQUISITOS (variables de entorno, ver .env):
 *   TL_API_KEY   (obligatoria)  — tu clave de TwelveLabs (https://twelvelabs.io)
 *   TL_INDEX_ID  (opcional)     — si no la pones, el script crea/reusa un índice "autgg-pegasus"
 *   TL_BASE      (opcional)     — default https://api.twelvelabs.io/v1.3
 *   TL_MODEL     (opcional)     — default pegasus1.2
 *
 * NOTA: la API de TwelveLabs evoluciona; base/modelo/endpoints son configurables por si cambian.
 *       Verifica contra la doc vigente antes del primer run. Este script NO gasta hasta que subes video.
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { resolve, basename } from "path";

const API_KEY  = process.env.TL_API_KEY;
const BASE     = (process.env.TL_BASE || "https://api.twelvelabs.io/v1.3").replace(/\/$/, "");
const MODEL    = process.env.TL_MODEL || "pegasus1.2";
let   INDEX_ID = process.env.TL_INDEX_ID || "";

const videoArg = process.argv[2];
const name     = process.argv[3] || (videoArg ? basename(videoArg).replace(/\.[^.]+$/, "") : "video");
const pIdx     = process.argv.indexOf("--prompt");
const extraPrompt = pIdx > -1 ? process.argv[pIdx + 1] : "";

if (!API_KEY) { console.error("\n❌  Falta TL_API_KEY (ponla en .env).\n"); process.exit(1); }
if (!videoArg) {
  console.error("\n❌  Uso: node pegasus_analyze.mjs <video_url_o_ruta_local> [nombre] [--prompt \"...\"]\n");
  process.exit(1);
}

const H = { "x-api-key": API_KEY };
const isUrl = /^https?:\/\//i.test(videoArg);

// El prompt de extracción: lo que le pedimos a Pegasus que devuelva (dominio VISUAL).
const ANALYSIS_PROMPT = `Analiza este anuncio en video y devuelve SOLO un JSON válido con esta forma:
{
  "formato": "descripcion corta del formato (ej: UGC testimonial, advertorial, personificacion, demo)",
  "duracion_seg": <numero>,
  "ritmo": "lento | medio | rapido",
  "estructura": ["hook", "agitar", "mecanismo", "prueba", "cta"],
  "escenas": [
    {
      "inicio_seg": <n>, "fin_seg": <n>,
      "lo_que_se_ve": "descripcion visual concreta de la escena",
      "tipo_plano": "primer plano | plano medio | plano general | inserto/producto | texto en pantalla",
      "rol_estilo": "STORY | SCIENCE | EMOTION | CONCEPT"
    }
  ],
  "recursos_visuales": ["subtitulos", "b-roll", "green screen", "texto grande", "..."],
  "notas": "que hace potente visualmente a este anuncio"
}
Reglas para rol_estilo: STORY=persona/testimonio; SCIENCE=mecanismo/anatomia/datos; EMOTION=miedo/metafora/dramatico; CONCEPT=producto o ingrediente sin marca.
Responde en espanol. No agregues texto fuera del JSON.${extraPrompt ? "\nInstruccion extra: " + extraPrompt : ""}`;

async function api(method, path, { json, form } = {}) {
  const opt = { method, headers: { ...H } };
  if (json) { opt.headers["Content-Type"] = "application/json"; opt.body = JSON.stringify(json); }
  if (form) { opt.body = form; } // fetch pone el multipart boundary solo
  const r = await fetch(`${BASE}${path}`, opt);
  const txt = await r.text();
  let data; try { data = JSON.parse(txt); } catch { data = txt; }
  if (!r.ok) throw new Error(`${method} ${path} → ${r.status}: ${typeof data === "string" ? data : JSON.stringify(data)}`);
  return data;
}

async function ensureIndex() {
  if (INDEX_ID) return INDEX_ID;
  console.log("• Buscando/creando índice 'autgg-pegasus'…");
  // Buscar uno existente
  try {
    const list = await api("GET", "/indexes?page_limit=50");
    const found = (list.data || []).find((i) => i.index_name === "autgg-pegasus");
    if (found) { INDEX_ID = found._id; console.log(`  reuso índice ${INDEX_ID}`); return INDEX_ID; }
  } catch (e) { console.warn("  (no pude listar índices: " + e.message + ")"); }
  const created = await api("POST", "/indexes", {
    json: { index_name: "autgg-pegasus", models: [{ model_name: MODEL, model_options: ["visual", "audio"] }] },
  });
  INDEX_ID = created._id || created.id;
  console.log(`  índice creado ${INDEX_ID}`);
  return INDEX_ID;
}

async function uploadVideo() {
  const form = new FormData();
  form.append("index_id", INDEX_ID);
  if (isUrl) {
    form.append("video_url", videoArg);
    console.log(`• Subiendo por URL: ${videoArg}`);
  } else {
    const p = resolve(videoArg);
    if (!existsSync(p)) throw new Error("No existe el video local: " + p);
    form.append("video_file", new Blob([readFileSync(p)]), basename(p));
    console.log(`• Subiendo archivo local: ${p}`);
  }
  const task = await api("POST", "/tasks", { form });
  return task._id || task.id;
}

async function waitReady(taskId) {
  process.stdout.write("• Procesando video en TwelveLabs");
  for (let i = 0; i < 240; i++) { // hasta ~40 min (10s * 240)
    const t = await api("GET", `/tasks/${taskId}`);
    const status = t.status;
    if (status === "ready") { console.log(" ✓"); return t.video_id || t.videoId; }
    if (status === "failed") throw new Error("La indexación falló: " + JSON.stringify(t));
    process.stdout.write(".");
    await new Promise((r) => setTimeout(r, 10000));
  }
  throw new Error("Timeout esperando indexación.");
}

async function analyze(videoId) {
  console.log("• Pidiendo análisis a Pegasus…");
  // Endpoint abierto de análisis (v1.3). Devuelve texto generado.
  const res = await api("POST", "/analyze", { json: { video_id: videoId, prompt: ANALYSIS_PROMPT, temperature: 0.2 } });
  return res.data ?? res.text ?? res;
}

(async () => {
  try {
    await ensureIndex();
    const taskId = await uploadVideo();
    const videoId = await waitReady(taskId);
    const raw = await analyze(videoId);

    // Intentar parsear el JSON que devolvió Pegasus (viene como texto).
    let parsed = null;
    if (typeof raw === "string") {
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) { try { parsed = JSON.parse(m[0]); } catch {} }
    } else if (typeof raw === "object") { parsed = raw; }

    mkdirSync(resolve("output"), { recursive: true });
    const outPath = resolve("output", `pegasus_${name}.json`);
    const payload = { name, source: videoArg, video_id: videoId, index_id: INDEX_ID, analysis: parsed ?? raw };
    writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf-8");
    console.log(`\n✅  Análisis visual guardado → ${outPath}`);
    if (!parsed) console.log("   (ojo: Pegasus no devolvió JSON limpio; se guardó el texto crudo en 'analysis')");
  } catch (e) {
    console.error("\n❌  " + e.message + "\n");
    process.exit(1);
  }
})();
