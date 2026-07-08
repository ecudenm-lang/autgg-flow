/**
 * trendtrack_dossier.mjs — PASO 2 (salida): arma el DOSSIER de videos en Markdown desde la
 * planilla de scoring ya llena (score_worksheet.json).
 *
 * Es el segundo tramo del Paso 2:
 *   trendtrack_score_prep.mjs  -> score_worksheet.json (datos + huecos de coincidencia)
 *   [Claude llena la coincidencia por fila]
 *   trendtrack_dossier.mjs     -> Dossier_Videos.md  (todos los datos + guion + copy + link + score)
 *
 * USO
 *   node trendtrack_dossier.mjs [score_worksheet.json] [salida.md]
 *   ej: node trendtrack_dossier.mjs score_worksheet.json Dossier_Videos.md
 *
 * Convierte a Word con el generador del repo AutGG:  md2docx.ps1 -In Dossier_Videos.md -Out Dossier_Videos.docx
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";

const IN  = process.argv[2] || "score_worksheet.json";
const OUT = process.argv[3] || "Dossier_Videos.md";

if (!existsSync(resolve(IN))) { console.error(`\n❌  No existe ${IN}. Corre antes trendtrack_score_prep.mjs\n`); process.exit(1); }
const doc = JSON.parse(readFileSync(resolve(IN), "utf-8"));
const filas = doc.filas || [];
const ficha = doc.ficha || {};

const adlibDe = (f) => f.adlib || (f.id && f.id.includes("_") ? "https://www.facebook.com/ads/library/?id=" + f.id.split("_", 1 + 1)[1] : null);
const pct = (f) => (f.coincidencia && f.coincidencia.score_pct != null ? f.coincidencia.score_pct : -1);

// Orden: por coincidencia (los sin puntuar al final), luego por longevidad
filas.sort((a, b) => (pct(b) - pct(a)) || ((b.days || 0) - (a.days || 0)));

const L = [];
L.push("# Dossier de Videos — TrendTrack + Score de Coincidencia");
L.push("");
L.push("> Todos los datos por ad: metadata, guion, copy, Ad Library link, media y el score de coincidencia");
L.push("> contra la ficha del Senior. Ordenado por coincidencia (mayor primero; sin puntuar al final).");
L.push("");
if (ficha.avatar) {
  L.push(`**Ficha del Senior:** Avatar = ${ficha.avatar} · Nivel = ${ficha.nivel_conciencia || "—"} · Mensaje = ${ficha.mensaje || "—"} · Deseo = ${ficha.deseo || "—"}`);
  L.push("");
}
L.push("---");
L.push("");
L.push("## Tabla resumen (ranking)");
L.push("");
L.push("| # | Marca | Días | Fuente guion | Avatar | Nivel | Mensaje | Deseo | Coincidencia |");
L.push("|---|---|---|---|---|---|---|---|---|");
filas.forEach((f, i) => {
  const c = f.coincidencia || {};
  const p = c.score_pct != null ? `**${c.score_pct}%**` : "_pendiente_";
  L.push(`| ${i + 1} | ${f.advertiser || "—"} | ${f.days || 0}d | ${f.guion_fuente} | ${c.avatar ?? "—"} | ${c.nivel_conciencia ?? "—"} | ${c.mensaje ?? "—"} | ${c.deseo ?? "—"} | ${p} |`);
});
L.push("");
L.push("---");
L.push("");
L.push("## Detalle por ad (todos los datos)");
L.push("");
filas.forEach((f, i) => {
  const c = f.coincidencia || {};
  const p = c.score_pct != null ? `${c.score_pct}%` : "pendiente";
  L.push(`### ${i + 1}. ${f.advertiser || "—"} — Coincidencia ${p}`);
  L.push("");
  L.push("| Campo | Valor |");
  L.push("|---|---|");
  L.push(`| Marca / anunciante | ${f.advertiser || "—"} |`);
  L.push(`| adId | ${f.id || "—"} |`);
  L.push(`| Longevidad TrendTrack | ${f.days || 0} días |`);
  L.push(`| País | ${f.country || "—"} |`);
  L.push(`| Score TrendTrack | ${f.trendtrack_score ?? "—"} |`);
  L.push(`| Tags | ${(f.tags && f.tags.length) ? f.tags.join(", ") : "—"} |`);
  L.push(`| Ad Library | ${adlibDe(f) || "—"} |`);
  L.push(`| Media (video) | ${f.media || "—"} |`);
  L.push(`| Fuente del guion | ${f.guion_fuente} |`);
  const dims = c.score_pct != null ? `(Avatar ${c.avatar} · Nivel ${c.nivel_conciencia} · Mensaje ${c.mensaje} · Deseo ${c.deseo})` : "";
  L.push(`| **Coincidencia** | **${p}** ${dims} |`);
  if (c.justificacion) L.push(`| Justificación | ${c.justificacion} |`);
  L.push("");
  const esCopy = f.guion_fuente === "copy" || f.guion_fuente === "copy_corto";
  L.push(`**${esCopy ? "Copy (body del ad)" : "Guion (transcript)"}:**`);
  L.push("");
  L.push("> " + (f.guion_texto ? String(f.guion_texto).replace(/\n/g, " ") : (f.guion_fuente === "needs_pegasus" ? "— (video sin texto; analizar con Pegasus)" : "—")));
  L.push("");
  L.push("---");
  L.push("");
});

writeFileSync(resolve(OUT), L.join("\n"), "utf-8");
const puntuados = filas.filter((f) => pct(f) >= 0).length;
console.log(`\nDOSSIER -> ${OUT}`);
console.log(`  ${filas.length} ads · ${puntuados} con score · ${filas.length - puntuados} pendientes`);
console.log(`  A Word:  powershell -File <ruta>\\md2docx.ps1 -In ${OUT} -Out Dossier_Videos.docx`);
