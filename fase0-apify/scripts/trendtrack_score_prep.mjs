/**
 * trendtrack_score_prep.mjs — ETAPA 2 (prep): arma la planilla de SCORE DE COINCIDENCIA
 * a partir de la salida de TrendTrack, con cadena de fallback para la fuente del guion.
 *
 * FUENTE DEL GUION (por ad, en orden de preferencia):
 *   1) transcript  -> fullText de TrendTrack (lo ideal: el guion hablado real)
 *   2) copy        -> body del ad (si no hay transcript, basamos el entendimiento en el copy)
 *   3) needs_pegasus -> es video sin texto: se marca para bajarlo y analizarlo con Pegasus
 *   4) insuficiente -> ni texto ni media utilizable
 *
 * USO
 *   node trendtrack_score_prep.mjs [carpeta_datos] [ficha.json] [out.json]
 *   ej: node trendtrack_score_prep.mjs "D:\Apify\biozentra\v3.1" ficha_biozentra.json score_worksheet.json
 *
 * Lee de la carpeta: trendtrack_transcripts_niche.json, trendtrack_videos.json, trendtrack_ads_raw.json
 * Salida: score_worksheet.json  — una fila por ad, lista para que Claude llene la coincidencia (%).
 *   El % de coincidencia es JUICIO SEMANTICO (avatar/nivel/mensaje/deseo): lo pone Claude, no el lexico.
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, join } from "path";

const DIR    = process.argv[2] || ".";
const FICHA  = process.argv[3] || "ficha_biozentra.json";
const OUT    = process.argv[4] || "score_worksheet.json";
const MIN_TX = 180;   // minimo de chars para considerar un texto "utilizable"

const load = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf-8")) : null);

const transcripts = load(join(DIR, "trendtrack_transcripts_niche.json")) || [];
const videos      = load(join(DIR, "trendtrack_videos.json")) || [];
const adsRaw      = load(join(DIR, "trendtrack_ads_raw.json")) || [];
const ficha       = load(resolve(FICHA)) || {
  _nota: "Ficha del Senior (Fuente B). Edita esto o pasa tu propio ficha.json.",
  avatar: "Diabetico T2/prediabetico latino +45",
  nivel_conciencia: "Problem/Solution Aware",
  mensaje: "Alternativa natural a la metformina, canela de Ceilan + MCT, mecanismo puerta de la celula",
  deseo: "Controlar la diabetes sin depender solo de farmacos",
};

// Indice de transcripts por adId (y por brand como respaldo debil)
const txById = new Map();
for (const t of transcripts) {
  const full = (t.fullText || "").trim();
  if (t.adId && full) txById.set(String(t.adId), full);
}

// Universo de ads: videos primero (mas campos), luego ads_raw; dedupe por id
const seen = new Set();
const ads = [];
for (const a of [...videos, ...adsRaw]) {
  const id = String(a.id || a.adId || "");
  if (!id || seen.has(id)) continue;
  seen.add(id);
  ads.push(a);
}
// Ademas: los transcripts niche que NO cruzaron con ningun ad entran como filas propias
// (son los guiones reales — la fuente mas valiosa; no queremos perderlos por un id que no matchea).
for (const t of transcripts) {
  const id = String(t.adId || "");
  const full = (t.fullText || "").trim();
  if (!id || seen.has(id) || full.length < MIN_TX) continue;
  seen.add(id);
  ads.push({ id, advertiser: t.brand, days: t.days || 0, media: t.media || null, type: "video", transcript: full });
}

function resolverGuion(a) {
  const id = String(a.id || a.adId || "");
  // 1) transcript propio del ad
  const own = (a.transcript && String(a.transcript).trim()) || "";
  if (own.length >= MIN_TX) return { fuente: "transcript", texto: own };
  // 1b) transcript del indice niche por adId
  const idx = txById.get(id);
  if (idx && idx.length >= MIN_TX) return { fuente: "transcript", texto: idx };
  // 2) copy (body) del ad
  const body = (a.body || "").trim();
  if (body.length >= MIN_TX) return { fuente: "copy", texto: body };
  // 3) video sin texto -> Pegasus
  const media = a.media || a.mediaUrl || "";
  if ((a.type === "video" || /\.mp4|video/i.test(media)) && media) {
    return { fuente: "needs_pegasus", texto: null, media };
  }
  // 4) algo de copy corto, mejor que nada, pero marcado
  if (body.length > 0) return { fuente: "copy_corto", texto: body };
  return { fuente: "insuficiente", texto: null };
}

const filas = ads.map((a) => {
  const g = resolverGuion(a);
  return {
    id: String(a.id || a.adId || ""),
    advertiser: a.advertiser || a.brand || null,
    country: a.country || null,
    days: a.days || 0,
    trendtrack_score: a.score ?? a.rescore ?? null,
    tags: a.tags || [],
    adlib: a.adlib || null,
    media: a.media || a.mediaUrl || null,
    guion_fuente: g.fuente,          // transcript | copy | copy_corto | needs_pegasus | insuficiente
    guion_texto: g.texto,            // el texto a analizar (o null si needs_pegasus/insuficiente)
    // --- lo llena Claude (juicio semantico) ---
    coincidencia: {
      avatar: null, nivel_conciencia: null, mensaje: null, deseo: null,
      score_pct: null, justificacion: null,
    },
  };
});

// Ordenar: primero los que tienen guion real, luego por score de TrendTrack
const rank = { transcript: 0, copy: 1, copy_corto: 2, needs_pegasus: 3, insuficiente: 4 };
filas.sort((x, y) => (rank[x.guion_fuente] - rank[y.guion_fuente]) || ((y.trendtrack_score || 0) - (x.trendtrack_score || 0)));

const resumen = {};
for (const f of filas) resumen[f.guion_fuente] = (resumen[f.guion_fuente] || 0) + 1;

const payload = { ficha, generado_de: DIR, total: filas.length, por_fuente: resumen, filas };
writeFileSync(resolve(OUT), JSON.stringify(payload, null, 2), "utf-8");

console.log(`\nPLANILLA DE SCORE DE COINCIDENCIA -> ${OUT}`);
console.log(`  total ads: ${filas.length}`);
console.log(`  por fuente de guion:`);
for (const [k, v] of Object.entries(resumen)) console.log(`    ${k.padEnd(14)} ${v}`);
const conGuion = (resumen.transcript || 0) + (resumen.copy || 0);
console.log(`\n  listos para score directo (transcript+copy): ${conGuion}`);
console.log(`  requieren Pegasus (bajar video): ${resumen.needs_pegasus || 0}`);
console.log(`\n  Siguiente: Claude llena 'coincidencia' por fila. Para los needs_pegasus:`);
console.log(`    node ..\\..\\pegasus\\pegasus_analyze.mjs <media_url> <id>  -> luego se scorea con ese analisis.`);
