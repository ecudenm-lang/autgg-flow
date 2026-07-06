# Biozentra — Sistema de Product/Market Research con Apify

**Objetivo:** recolectar a escala todo lo posible sobre el nicho y la enfermedad
(diabetes / prediabetes / resistencia a la insulina) — **sobre todo experiencias reales
de personas (VoC)** — y **lo que hace la competencia**, para **España y México**.
Alimenta el funnel de Biozentra (canela Ceilán 12:1 + MCT) que vive en `D:\Iteracionking`.

## Contexto del producto y el mensaje (resumen)
- Producto: Biozentra Canela de Ceilán 12:1 + MCT, softgels, azúcar en sangre / diabetes T2.
- Funnel = 4 avatares (línea de tiempo): Preventivo → Prediabético → Recién diagnosticado → T2 con metformina.
- Mensaje ganador: villano = **la metformina**; mecanismo = "puerta de la célula trabada";
  payoff = "volver a sentirse normal"; "no la dejes, súmale".
- Ya existe VoC manual previa (~455 testimonios Reddit) en `D:\Iteracionking\reddit_validation.md`
  y espionaje de ads vía gethookd (board 233609: Glucora, Primal Remedies, Nutrissa).
  **Este sistema industrializa y amplía eso.**

## Cómo funciona
1. **Catálogo de fuentes** → `config\sources.json` (qué actor + qué input por fuente).
2. **Inputs por fuente** → `config\inputs\*.json` (parámetros del actor: hashtags, subreddits, URLs…).
3. **Motor** → `tools\apify_run.ps1` corre cualquier actor por API, hace polling y guarda el dataset crudo.
4. **Crudos** → `raw\<name>_<fecha>.json`.
5. **Análisis (Claude)** → reportes de insight en `reports\`.

## Correr una fuente
```powershell
# token en config\apify_token.txt (1 línea) o env APIFY_TOKEN
powershell -File tools\apify_run.ps1 -Name reddit_diabetes
powershell -File tools\apify_run.ps1 -Name tiktok_diabetes_es
```

## Fuentes (buckets)
**VoC / experiencias (el núcleo):**
- `youtube_comments_es` — comentarios de videos ES sobre diabetes/metformina/canela.
- `tiktok_diabetes_es` — videos+comentarios por hashtag; ganchos que rinden ahora.
- `amazon_reviews_canela_es` — reviews amazon.es de canela/berberina (objeciones y razones de compra).
- `reddit_diabetes` — r/diabetes_t2, r/prediabetes (inglés, gran volumen; payoff "sentirse normal", food noise).
- *(pendiente añadir)* Facebook Groups de apoyo a diabéticos ES/MX, foros (forodiabetes), Quora ES.

**Competencia:**
- `competitor_ads_meta` — Meta Ad Library: qué corren Glucora/Primal/Nutrissa en ES/MX.
- `competitor_sites` — landings de producto: precios, claims, ingredientes, ofertas.

## Reportes objetivo (en `reports\`)
- `voc_dolores.md` — dolores/emociones por avatar, con frases textuales citadas.
- `voc_objeciones.md` — objeciones y dudas (para FAQ y rebatir en copy).
- `voc_lenguaje.md` — el lenguaje exacto del cliente (para hooks/headlines).
- `competencia.md` — tabla comparativa de competidores (precio/claims/ofertas/ángulos).
- `tendencias.md` — formatos/ganchos de TikTok que están funcionando.
- `oportunidades.md` — gaps = posibles productos nuevos / ángulos sin explotar.

## Aprendizajes operativos (importantes)
- **Plan FREE = $5/mes.** Usar SOLO actores pay-per-event/free (NO rental). Benchmark: ~$0.005 por post/video.
- **Reddit:** scrapear SUBREDDITS directos (startUrls a r/diabetes_t2 etc.), NO búsquedas globales (traen subreddits equivocados = ruido).
- **Correr en FOREGROUND.** En background el polling del motor se cuelga (lag del endpoint /actor-runs). El motor ya tolera ese lag pero conviene foreground.
- **TikTok:** los comentarios son add-on de costo (no incluidos en el run base).

## Estado
- **2026-06-26: primera tanda hecha** (gasto $3.23/$5). 3 datasets en `raw\`: reddit (220), tiktok ES (200), competidor Primal (16 pág).
  Reporte maestro = **`reports\HALLAZGOS_20260626.md`**. Pendiente: decisión de subir de plan para barrido amplio
  (comentarios TikTok/YouTube ES, grupos FB, más competidores Glucora/Nutrissa).
