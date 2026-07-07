# Score de Coincidencia sobre TrendTrack (Etapa 2 · prep)

Arma la planilla para puntuar cada ad de la competencia contra la **ficha del Senior** (Fuente B),
usando el guion (Fuente A) que venga de TrendTrack — con **cadena de fallback** cuando no hay guion.

## Cadena de fallback de la fuente del guion
1. **transcript** — `fullText` de TrendTrack (el guion hablado real). Lo ideal.
2. **copy** — el `body` del ad. Si no hay transcript, basamos el entendimiento en el copy.
3. **copy_corto** — copy demasiado breve; se usa pero se marca como debil.
4. **needs_pegasus** — video sin texto: se baja el video y se analiza con Pegasus (Etapa 3).
5. **insuficiente** — ni texto ni media.

## Uso
```powershell
# 1) tu ficha:  copia ficha_biozentra.example.json -> ficha_biozentra.json  y ajustala
# 2) arma la planilla desde la salida de TrendTrack:
node scripts\trendtrack_score_prep.mjs "<carpeta_datos_trendtrack>" scripts\ficha_biozentra.json score_worksheet.json
```
Lee de la carpeta: `trendtrack_transcripts_niche.json`, `trendtrack_videos.json`, `trendtrack_ads_raw.json`.
Salida: `score_worksheet.json` — una fila por ad con la fuente del guion resuelta y los huecos de
coincidencia (avatar/nivel/mensaje/deseo/score_pct/justificacion) listos para que **Claude** los llene.

## Los needs_pegasus
Para los ads que quedaron en `needs_pegasus`, se baja el video y se analiza:
```powershell
node ..\pegasus\pegasus_analyze.mjs <media_url> <id>
```
El JSON de Pegasus (estructura visual + rol de estilo) se usa como Fuente A cuando no hubo texto.

## Importante
- El **% de coincidencia es juicio semantico** (avatar/nivel/mensaje/deseo): lo pone Claude leyendo el
  guion, NO un lexico. El script solo PREPARA la planilla y resuelve de donde sale el guion.
- No confundir con el **score propio de TrendTrack** (mide si el ad es ganador, no si calza con la ficha).
  Ver la metodologia completa y la prueba real en el repo AutGG: `Score_Coincidencia_TrendTrack.md`.

## Resultado real (Biozentra, jul-2026)
287 ads: **22 transcript** + 225 copy + 21 copy_corto + **19 needs_pegasus**.
247 listos para score directo; 19 requieren Pegasus.
