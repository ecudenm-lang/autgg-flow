# README — Cómo ejecutar el Motor de Research v3.1 en OTRO producto DTC

> Guía operativa paso-a-paso para correr el **Motor de Research v3.1** (VoC → 12 docs MASTER + UMP/UMS/USP) sobre **cualquier producto DTC nuevo**.
> Metodología: adquisición Apify + PI (Playbook VoC) · avatar/sofisticación/buyer-psychology (Evolve) · conciencia/deseo/hooks/mecanismos (Desire-To-Scale).
> **REGLA MADRE (no negociable):** ninguna afirmación entra a un documento sin ≥1 cita textual real con `{plataforma + engagement + source_type + market + idioma}`. Cero afirmaciones huérfanas. Siempre se separa `[CITA]` de `[INFERENCIA]`.

Este README es un **checklist**. Recórrelo de arriba a abajo. Cada sección tiene un gate `[ ] LISTO` que debe cumplirse antes de avanzar.

---

## 0. INTAKE MÍNIMO (bloqueante — sin esto el motor NO arranca)

Llena esta ficha antes de tocar cualquier script. Es lo mismo que la Fase 0 del producto anterior (`FASE 0 — Higado+Intestino MX.md`), reusada como plantilla.

| # | Campo | Obligatorio | Ejemplo (producto anterior) |
|---|---|---|---|
| 0.1 | **Producto propio** (ficha B0): nombre, formato, ingredientes+dosis / materiales / geometría / proceso / protocolo, certificaciones, precio(s), garantía. Si aún no hay producto físico → el/los **listing(s) de Amazon** que vas a vender | **SÍ** | Gotas líquidas L-Glutatión/NAC/Cardo Mariano; garantía 60 días |
| 0.2 | **Categoría exacta a escrapear (NO la marca)** + sub-nicho | **SÍ** | "salud hepática / suplementos" ampliado a "salud intestinal" — **nunca** "Purelia" |
| 0.3 | **País + idioma de VENTA** (pool de lanzamiento → manda para copy) | **SÍ** | México / español-MX |
| 0.4 | **Mercado de INTELIGENCIA** (idioma/país fuente de mecanismos y arbitraje; normalmente inglés-US) | **SÍ** | EE.UU. / inglés-US |
| 0.5 | **¿Mercado local o nacional?** (local = Google Business/Maps; nacional = marketplace + social) | **SÍ** | Nacional |
| 0.6 | **Competidores: 1-3 URLs DTC top + sus listings de Amazon (con reseñas 1-3★)** | **SÍ*** | Purelia, Galmio, Wild Dose + ASINs B0F4HH894D, B0D75RHTJ8… |
| 0.7 | **Vertical + jurisdicción de compliance** → define verbos prohibidos | **SÍ** | Suplemento salud · Profeco (MX) + FTC/FDA (US): prohibido *curar/tratar/revertir/eliminar* |
| 0.8 | **Presupuesto / tope de ingesta + criterio de parada** (filas máx, lotes máx, USD máx) | Recomendado | ~16k filas / ~$20 USD Apify |
| 0.9 | Hipótesis previa de deseo/conciencia/sofisticación · comprador=usuario o hay tercero (regalo) | Recomendado | Sofisticación MX 2-3 (hipótesis a validar) |

**\* Sobre 0.6:** si NO tienes competidores, NO los inventes. Se descubren automáticamente con TrendTrack (Sección 2). El **único** input manual del motor (Sección 5) es confirmar/pegar esa lista si TrendTrack no la resuelve.

**GATE 0 — DETENER si falta:** ficha B0 (0.1), categoría-no-marca (0.2), país/idioma de venta (0.3) o mercado de inteligencia (0.4). Con esos cuatro, arrancas.

`[ ] LISTO` — Ficha de intake completa y guardada como `FASE 0 — <Producto> <Mercado>.md`.

---

## 1. ACTORES APIFY CANÓNICOS (adquisición de VoC)

Estos son los actores fijos del motor. Cada uno alimenta un `platform` y un `source_type` distinto en el banco de evidencia. Deja los dumps en `/raw/<plataforma>/canonical/`. El precio es **aproximado por fila** (verifica en el store de Apify antes de correr; los actores por evento/CU varían).

| Actor Apify (slug) | Plataforma | Qué extrae | `source_type` que produce | Precio aprox/fila |
|---|---|---|---|---|
| **axesso / amazon-reviews** | amazon | Reseñas de producto por ASIN (incl. 1-3★ del competidor) | `REVIEW` (cliente) · `COMPETITOR_CLAIM` si es sobre el competidor | **$0.0009** |
| **trudax / reddit-scraper-lite** | reddit | Posts + comentarios de subreddits y búsquedas | `RAW_CONFESSION` | **$0.0036** |
| **streamers / youtube-comments** | youtube | Comentarios de videos (naturistas, reviews) | `RAW_CONFESSION` (comentarista) · `CREATOR_CONTENT` (título/caption del canal) | ver store (por comentario) |
| **clockworks / tiktok-comments** | tiktok | Comentarios de videos por hashtag/URL | `RAW_CONFESSION` | ver store |
| **clockworks / tiktok-scraper** | tiktok | Videos + captions por hashtag (para descubrir posts y captions de creador) | `CREATOR_CONTENT` (caption) → luego se piden comentarios | ver store |
| **apify / instagram-scraper** (instagram) | instagram | Posts, captions y comentarios por hashtag/cuenta | `RAW_CONFESSION` (comentario) · `CREATOR_CONTENT` (caption) | ver store |
| **curious_coder / facebook-ads-library** | facebook | Ads activos de la Ad Library (copy + creativo del competidor) | `COMPETITOR_CLAIM` | ver store |
| **saswave / mercadolibre-reviews** | mercadolibre | Reseñas de producto en MercadoLibre (marketplace LatAm) | `REVIEW` | ver store |
| **apify / cheerio-scraper** (cheerio) | web/foros | HTML genérico (foros DTC, blogs, enfemenino, comentarios web) | `RAW_CONFESSION` | ver store |

**Jerarquía de `source_type` (peso en el PI de deseo):**
- `RAW_CONFESSION` (cliente real) → peso **1.0**
- `REVIEW` (reseña de producto) → peso **1.0**
- `CREATOR_CONTENT` (nutriólogo/influencer/caption de marca) → peso **0.25** (down-weight; NO valida deseo de masa)
- `COMPETITOR_CLAIM` (marca/ad) → peso **0.0** (excluido del deseo; va al mapa de competidores B1)
- `TEAM_SEED` (semillas de tu Fase 0) e `INFERENCE` (deducciones del sistema) → **NUNCA cuentan como prueba**, solo hipótesis.

**Regla de cobertura mínima por pool:** consigue voz real de cliente (`RAW`+`REVIEW`) en AMBOS pools (venta e inteligencia). El corpus del producto anterior llegó a 82.8% voz real de cliente — apunta a algo comparable. Escrapea reseñas 1-3★ del competidor sí o sí: ahí vive el UMP no resuelto.

`[ ] LISTO` — Dumps en `/raw/<plataforma>/canonical/`, cada uno etiquetado con el actor que lo generó y una muestra de 20 filas por dump para validar el schema.

---

## 2. TRENDTRACK (descubrir competidores + ads antes de escrapear)

Antes de la ingesta, usa TrendTrack para poblar 0.6 (competidores) y medir la **sofisticación de mercado** (cuántos ads activos hay por ángulo). Esto también decide la tesis de arbitraje (mecanismo quemado en inglés = fresco en español).

**Endpoints canónicos:**

| Endpoint | Para qué | Salida que buscas |
|---|---|---|
| `GET /v1/facets/categories` | Listar categorías/facetas disponibles para acotar la búsqueda a tu nicho | ID(s) de categoría de tu vertical |
| `POST /v1/shops/query` | Descubrir **tiendas DTC competidoras** por categoría/país/filtros | Lista de shops (dominios) → candidatos de 0.6 |
| `GET /v1/advertisers` | Enumerar **anunciantes** activos en la categoría (quién pauta) | Marcas que pautan → monitorear en Ad Library |
| `GET /v1/ads` | Traer **ads activos** por anunciante/categoría/mercado → conteo por ángulo | # ads activos por idioma/ángulo = **nivel de sofisticación** |

**Cómo se usa el conteo de ads:** replica la tabla de sofisticación de la Fase 0:
- Inglés (US/UK): N ads liver / N bloating → Stage Schwartz (típicamente 4-5).
- Español (ES/MX): N ads → Stage (típicamente 2-3).
- **Δ grande a favor del inglés = arbitraje disponible.** Punto óptimo de entrada: Stage 3→4 (UN mecanismo nombrado + UNA gran idea des-culpabilizadora). Error a evitar: apilar todas las promesas.

**Honestidad de dato:** si tu mercado de venta NO está indexado de forma fiable en TrendTrack (p. ej. MX), márcalo como **HIPÓTESIS a validar con el scrape VoC**, no como hecho. La VoC de Apify lo confirma o lo tumba.

`[ ] LISTO` — Lista de competidores DTC (dominios + ASINs) y tabla de sofisticación por mercado. Si TrendTrack no resolvió competidores → ir a Sección 5 (único input manual).

---

## 3. ORDEN DE SCRIPTS A CORRER

Corre en este orden estricto. Cada script escribe artefactos auditables que el siguiente consume. Usa rutas **absolutas**.

```
[0] TrendTrack (Sección 2)     → competidores + tabla sofisticación   (manual/API, pre-scripts)
[1] Apify (Sección 1)          → /raw/<plataforma>/canonical/*.json    (adquisición)
        │
[2] v31_foundation.py          → ingesta + dedup + etiquetado + clustering + PI
        │   entradas: /raw/**  + platform_map.yaml + ficha B0
        │   salidas:  confessions.parquet · evidence_bank.csv · PI_SCORES.csv
        │             _pi.json · _stats.json · _bank.json
        │             DATA QUALITY REPORT.md · CLUSTER_REPORT.md
        │   GATES internos: manifest sha256 (anti-scratch) · validación platform_map
        │                   (>X% filas sin cuerpo/engagement → ABORTAR) · gold-set
        │                   ~200 filas/idioma (mide accuracy antes de confiar en el tagger)
        ▼
[3] v31_docs.py                → esqueleto de los documentos MASTER a partir de PI + banco
        │   salidas: DOC 14 (Banco de Evidencia) · B0 · B1 · andamiaje 15/16/17/18/19/20/10
        ▼
[4] SÍNTESIS (Claude Code, guiado por el Spec Operativo v3)
        │   El operador profundiza/contrasta/decide y RELLENA cada doc citando IDs EVxx…
        │   Orden interno de síntesis (Fases 3-9 del Spec):
        │     14 evidencia → B0/B1 (paralelo) → 15 Avatar → 18 Deseos → 20 Buyer Psych
        │     → 17 Estrategia (conciencia×sofisticación) → 19 UMP/UMS/USP → 16 Lenguaje/Hooks
        │     → 00 Master Spine (al final) → 10 Los 5 Ángulos
        ▼
[5] VALIDADORES (gates anti-alucinación + compliance)
            · verificador de citas: cada afirmación resuelve a un ID real del banco
            · gate de sustanciación UMP/UMS: {hecho respaldado | hipótesis persuasiva}
            · verbos prohibidos por vertical (Sección 0.7)
            · voz de competidor (is_competitor=true) NUNCA ancla promesa propia
            · demografía/TAM solo con evidencia, si no [SIN EVIDENCIA] / [NO DISPONIBLE]
```

> **Nota de nombres:** `v31_foundation.py` y `v31_docs.py` son los dos scripts canónicos del motor (fundación de datos + andamiaje de documentos). Si en tu carpeta tienen otro nombre, mapea por función: *foundation* = ingesta→PI; *docs* = genera los .md MASTER. La síntesis y los validadores los ejecuta el operador (Claude Code) siguiendo el Spec.

`[ ] LISTO` — `v31_foundation.py` corrió sin ABORT, `DATA QUALITY REPORT.md` + `CLUSTER_REPORT.md` generados y revisados.

---

## 4. CONTROL DE PRESUPUESTO Y SATURACIÓN / PARADA

**Presupuesto (fijado en el intake 0.8):** tope de filas, de lotes y de USD Apify. Estima antes de correr: `filas_objetivo × precio/fila` por actor. Reddit ($0.0036) y actores por-evento cuestan más que Amazon ($0.0009) — prioriza reseñas y confesiones de alto valor, no volumen bruto de TikTok.

**Criterios de saturación (evaluados POR POOL — venta e inteligencia por separado — tras cada lote):**
- `Spearman(N, N-1) ≥ 0.95` en el Top-20 de clusters (el ranking ya no se mueve).
- `< 1%` de clusters nuevos en 2 lotes consecutivos.
- `≥ 90%` de near-dup de lenguaje (las citas nuevas repiten lo ya capturado).
- Ningún cluster con `viral_share > 0.6` (el ranking no depende de un solo post viral).

**Cuando los 3 primeros se cumplen en un pool → ese pool está SATURADO, deja de escrapearlo.**

**Regla de PARADA dura:** si el pool de VENTA no satura y ya no hay presupuesto → **lanzar con cobertura parcial etiquetada** (declarar el hueco en el DATA QUALITY REPORT), **nunca cerrar en falso** ni rellenar con inferencia.

`[ ] LISTO` — Ambos pools saturados, o parada dura declarada con huecos documentados.

---

## 5. ÚNICO PUNTO DE INPUT MANUAL

El motor es autónomo salvo **un** momento:

> **Si TrendTrack (Sección 2) NO devuelve competidores fiables para tu mercado de venta, el motor se DETIENE y te pide pegar manualmente la lista de 1-3 competidores DTC + sus ASINs de Amazon (con reseñas 1-3★).**

Todo lo demás (qué escrapear, cómo puntuar, qué cluster gana, qué UMP proponer) lo decide el motor con reglas deterministas. No introduzcas juicio manual en el scoring: si quieres forzar un ángulo, hazlo en la fase de síntesis y márcalo como `[INFERENCIA]`, nunca como cita.

`[ ] LISTO` — Competidores confirmados (por TrendTrack o pegados a mano).

---

## 6. ENTREGABLES FINALES ESPERADOS

Al cerrar, la carpeta `v3.1/` (o `<Producto>/`) debe contener:

**Artefactos de datos (los genera `v31_foundation.py`):**
- `evidence_bank.csv` — banco de evidencia canónico, N filas limpias (fuente única citable).
- `PI_SCORES.csv` — scoring por cluster, doble ranking venta/inteligencia + Δ.
- `_pi.json` · `_stats.json` · `_bank.json` — respaldos estructurados.
- `DATA QUALITY REPORT.md` — volumen, distribución por plataforma/pool/source_type/idioma, sesgos, huecos, confiabilidad.
- `CLUSTER_REPORT.md` — fórmula PI + ranking transparente por cluster con freq/viral/RAW/REVIEW/CREATOR.

**Documentos MASTER (andamiaje por `v31_docs.py`, rellenados en síntesis):**
- `DOC 00 — Master Spine (Veredicto Estratégico).md` — se escribe AL FINAL; permite N líneas estratégicas.
- `DOC B0 — Marca, Producto y Rendimientos.md`
- `DOC B1 — Espionaje de Competidores + Mapa de Vacíos.md`
- `DOC 14 — Banco de Evidencia Canónico.md`
- `DOC 15 — Retrato del Cliente (Avatar Core 5 + Sub-avatares).md`
- `DOC 16 — Banco de Lenguaje, Hooks e Identidad Reclamada.md`
- `DOC 17 — Ranking, Sofisticación, Conciencia y Estrategia.md`
- `DOC 18 — Mapa y Validación de Deseos de Masa.md`
- `DOC 19 — UMP/UMS/USP (Mecanismos Únicos).md` — con gate de sustanciación `{hecho respaldado | hipótesis persuasiva}`.
- `DOC 20 — Mapa de Dolores + Buyer Psychology.md`
- `DOC 10 — Los 5 Ángulos + Briefs de Producción.md` — cada ángulo re-narra el MISMO UMP canónico.

**Criterio de aceptación final (checklist de cierre):**
- [ ] Toda afirmación en todo doc resuelve a un ID `EVxx…` real del banco.
- [ ] `[CITA]` e `[INFERENCIA]` separados en cada documento.
- [ ] Citas que van a copy: SIEMPRE del pool idioma-de-venta.
- [ ] UMP/UMS con estatus de mecanismo declarado (no presentar causa como hecho sin respaldo externo).
- [ ] Verbos prohibidos por vertical ausentes del copy accionable.
- [ ] Voz de competidor no ancla ninguna promesa propia.
- [ ] `DATA QUALITY REPORT` declara confiabilidad por dimensión y huecos abiertos.

---

### Resumen de una línea
`INTAKE → TrendTrack (competidores+sofisticación) → Apify (VoC) → v31_foundation.py (datos+PI) → v31_docs.py (andamiaje) → síntesis citada → validadores → 12 docs MASTER + UMP/UMS/USP.`

*Motor v3.1 — un solo input manual (competidores si TrendTrack falla). Todo lo demás determinista y auditable. Nunca cierres en falso: parcial-etiquetado > alucinado.*
