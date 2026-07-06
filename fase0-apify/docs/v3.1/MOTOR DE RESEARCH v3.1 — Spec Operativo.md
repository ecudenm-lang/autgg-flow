# MOTOR DE RESEARCH v3.1 — Spec Operativo

> **Máquina de research repetible y auditable para cualquier producto DTC** (Meta / TikTok / Amazon, metodología Schwartz).
> El motor ingiere evidencia cruda de múltiples fuentes, la puntúa de forma transparente, la interpreta en avatar + deseos + psicología, deriva estrategia + mecanismos, y produce los documentos MASTER + el par UMP/UMS/USP + los 5 ángulos.
> **No es específico de ninguna categoría.** El producto, la categoría, el idioma y las fuentes se inyectan en el INTAKE; el motor es idéntico para un suplemento, un gadget, un cosmético o un producto de hogar.
> Compliance queda **FUERA DE ALCANCE** en esta versión (se trata solo el status del mecanismo hecho vs. hipótesis para no romper la lógica de sustanciación; ninguna regla jurisdiccional).

---

## 0. Qué cambia de v3 → v3.1 (resumen de las 10 mejoras)

| # | Mejora | Efecto sobre el motor |
|---|--------|----------------------|
| 1 | **Jerarquía de 7 tipos de fuente** con pesos y la regla "TEAM_SEED nunca es prueba" | El origen de cada dato deja de ser plano; el peso probatorio se hace explícito y auditable. |
| 2 | **DOC 14 = banco canónico con IDs** (`evidence_bank.csv`) | Toda afirmación de todo documento cita un `EV-ID`, no un texto suelto. Trazabilidad total. |
| 3 | **3 pools de scraping** (venta / inteligencia / competidor) | La ingesta separa desde el origen para qué sirve cada dato; se acaba la mezcla. |
| 4 | **DATA QUALITY REPORT obligatorio ANTES de interpretar** | Gate duro: no se interpreta corpus sucio o sesgado sin declararlo. |
| 5 | **PI transparente**: peso por fuente, fórmula publicada, penalización viral, doble ranking + delta | El score deja de ser caja negra; se recomputa igual con el mismo input. |
| 6 | **Separación estricta** evidencia → scoring → interpretación → estrategia → producción | Capas con contrato de entrada/salida; nadie salta de crudo a copy. |
| 7 | **RECONCILIATION PASS antes del Spine** | Se resuelven contradicciones entre docs antes de consolidar la verdad. |
| 8 | **Spine SIEMPRE al final** | El 00 no se escribe hasta que todo lo demás está saturado y reconciliado. |
| 9 | **Validadores automáticos** | Scripts que rechazan el build si hay citas huérfanas, IDs rotos o capas cruzadas. |
| 10 | **COMPETITOR_MAP de 7 tipos** | El espionaje deja de ser prosa; es un esquema tipado y consultable. |

---

## 1. Arquitectura en 5 capas (con contrato entre capas)

El motor es una tubería estrictamente unidireccional. **Ninguna capa puede leer hacia adelante ni escribir hacia atrás.** Cada flecha es un contrato: la capa N solo consume artefactos sellados de la capa N-1.

```
┌──────────────────────────────────────────────────────────────────────┐
│ CAPA 1 · EVIDENCIA        (única capa citable)                         │
│   → DOC 14 evidence_bank.csv  ·  source_pools/*  ·  competitor_map.csv │
├──────────────────────────────────────────────────────────────────────┤
│ CAPA 2 · SCORING          (matemática pura, sin narrativa)             │
│   → PI_SCORES.csv  ·  CLUSTER_REPORT.md  ·  DATA_QUALITY_REPORT.md     │
├──────────────────────────────────────────────────────────────────────┤
│ CAPA 3 · INTERPRETACIÓN   (lee 14 + scores; cita EV-IDs)              │
│   → B0 Producto · B1/COMPETITOR_MAP · 15 Avatar · 18 Deseos           │
│   → 20 Buyer Psychology · 17 Estrategia · 19 UMP/UMS/USP · 16 Lenguaje │
├──────────────────────────────────────────────────────────────────────┤
│ CAPA 4 · ESTRATEGIA/PRODUCCIÓN-PUENTE                                  │
│   → 10 Los 5 Ángulos + Briefs   (re-narran el MISMO UMP canónico)     │
├──────────────────────────────────────────────────────────────────────┤
│ CAPA 5 · SPINE            (verdad consolidada, SIEMPRE al final)       │
│   → RECONCILIATION_PASS.md  →  00 Master Spine                         │
└──────────────────────────────────────────────────────────────────────┘
              ↓
      [ copy generado: fuera del set de research ]
```

**REGLA MADRE (v3.1):** ninguna afirmación entra a un documento sin ≥1 **`EV-ID`** del banco canónico, con `{source_type, plataforma, engagement, PI, idioma, pool}`. Cero afirmaciones huérfanas. Se separa siempre `[CITA]` de `[INFERENCIA]`. **Y además:** una afirmación cuyo único soporte es `TEAM_SEED` **no puede** presentarse como `[CITA]` — es siempre `[HIPÓTESIS DEL EQUIPO, sin prueba]`.

---

## 2. JERARQUÍA DE FUENTES — 7 tipos (mejora #1)

Todo dato que entra al motor recibe **exactamente un** `source_type`. El `source_type` determina su **peso probatorio** (`w_source`, usado por el PI) y su **admisibilidad** (si puede o no anclar una afirmación de producto). Esto se decide en la INGESTA, nunca después.

| # | source_type | Qué es | Ejemplos | `w_source` (PI) | ¿Ancla promesa propia? | ¿Va a copy? |
|---|-------------|--------|----------|:---------------:|:----------------------:|:-----------:|
| 1 | **RAW_CONFESSION** | Voz cruda no solicitada del usuario/mercado en su propio contexto | Reddit, foros, comentarios, hilos, grupos, Q&A | **1.0** | Sí (deseo/dolor) | Sí (pool venta) |
| 2 | **REVIEW** | Reseña sobre un producto de la categoría (propio o ajeno) | Amazon, Trustpilot, Google, app stores | **1.0** | Sí (si es del propio); dolor/vacío si es de competidor | Sí (pool venta) |
| 3 | **CREATOR_CONTENT** | Contenido de creador/influencer/UGC pagado o afiliado sobre la categoría | TikTok/Reels/YT de creadores, UGC | **0.25** | No (sesgo comercial) | Solo como hook, marcado |
| 4 | **COMPETITOR_CLAIM** | Lo que el competidor AFIRMA de su propio producto | Landing, ads, listing bullets, PDP del rival | **0.0** | **Nunca** | No (solo mapa de vacíos) |
| 5 | **TEAM_SEED** | Hipótesis, corazonada o brief del equipo/cliente | Notas del fundador, hipótesis previa, brief | **0.0** | **Nunca** | No |
| 6 | **INTEL_FOREIGN** | Evidencia del mercado de inteligencia (otro idioma/país, típicamente inglés) | Reddit/Amazon EN, foros del mercado maduro | **1.0** (solo pool inteligencia) | No para copy directo; sí para detectar arbitraje | No (informa `delta`) |
| 7 | **INFERENCE** | Conclusión derivada por el motor, no observada | Cualquier síntesis, causa propuesta, patrón | **0.0** (no suma frecuencia) | **Nunca** como `[CITA]` | No |

### Reglas de admisibilidad (duras)

1. **`TEAM_SEED` NUNCA es prueba.** Puede *orientar* la búsqueda (qué scrapear, qué cluster mirar) y puede aparecer como hipótesis explícita, pero **no incrementa frecuencia, no incrementa PI, y no puede ser el único soporte de ninguna afirmación de un documento.** Un `TEAM_SEED` que luego se confirma con evidencia real se re-etiqueta con el `EV-ID` de esa evidencia; el seed original queda como trazabilidad, no como prueba.
2. **`COMPETITOR_CLAIM` pesa 0 en PI** (es marketing del rival, no voz del mercado) y **jamás ancla una promesa del producto propio.** Sirve exclusivamente para el `COMPETITOR_MAP` y el mapa de vacíos.
3. **`CREATOR_CONTENT` pesa 0.25**: la señal existe pero está contaminada por incentivo comercial. Puede sugerir un ángulo o un hook (marcado como tal), nunca validar un deseo de masa por sí solo.
4. **`INFERENCE` nunca es `[CITA]`.** Toda inferencia se marca `[INFERENCIA]` y debe apuntar a los `EV-ID` de la evidencia observada que la sostiene.
5. **`INTEL_FOREIGN` no va a copy del idioma de venta.** Alimenta el `PI_inteligencia` y el `delta` de arbitraje; las citas que llegan al copy salen SIEMPRE del pool idioma-de-venta (`RAW_CONFESSION`/`REVIEW`).

> **Precedencia probatoria:** `RAW_CONFESSION ≈ REVIEW > CREATOR_CONTENT > COMPETITOR_CLAIM ≈ TEAM_SEED ≈ INFERENCE (=0)`. Cuando dos fuentes se contradicen, gana la de mayor `w_source`; empate entre 1.0 se resuelve por frecuencia y luego por recencia.

---

## 3. Los 3 POOLS de scraping (mejora #3)

La ingesta separa físicamente el corpus en tres pools según **para qué sirve el dato**, no según de dónde vino. Un mismo actor de scraping puede alimentar dos pools; lo que decide el pool es el propósito.

| Pool | Contenido | source_types admitidos | Uso |
|------|-----------|-------------------------|-----|
| **POOL_VENTA** | Voz del mercado en el **idioma/país de lanzamiento** | `RAW_CONFESSION`, `REVIEW` (propio + competidor), (`CREATOR_CONTENT` marcado) | **Único** pool del que salen citas a copy. Calcula `PI_venta`. |
| **POOL_INTELIGENCIA** | Voz del **mercado maduro** (otro idioma/país) | `INTEL_FOREIGN` (`RAW_CONFESSION`/`REVIEW` foráneos) | Detecta deseos/mecanismos aún no explotados en el mercado de venta. Calcula `PI_inteligencia`. Nunca va a copy. |
| **POOL_COMPETIDOR** | Lo que dicen los rivales de sí mismos y sus vacíos | `COMPETITOR_CLAIM`, `REVIEW` 1-3★ de competidores | Alimenta `COMPETITOR_MAP` + mapa de vacíos + minería de UMP no resuelto. Pesa 0 en PI de deseo. |

**Regla de no-contaminación:** el PI de deseo de masa se computa **solo** sobre `POOL_VENTA` (y en paralelo `POOL_INTELIGENCIA` para el delta). `POOL_COMPETIDOR` **nunca** entra al PI de deseo — su función es defensiva (¿qué claim ya está quemado?) y ofensiva (¿qué vacío existe?), no validar demanda.

Artefactos de salida de la ingesta por pool:
```
/pools/
  pool_venta.parquet
  pool_inteligencia.parquet
  pool_competidor.parquet
```

---

## 4. Mapa canónico de documentos (IDs CONGELADOS)

> Los IDs se congelan aquí. Ningún documento cita un ID sin resolverlo contra esta tabla. Además, los artefactos de datos (CSV/MD) también son canónicos y tienen nombre fijo.

### 4.1 Documentos de research

| ID | Documento | Capa | Consume | Produce |
|----|-----------|------|---------|---------|
| **14** | **Banco de Evidencia canónico** (voz cruda con `EV-ID`) | 1 Evidencia | pools | `evidence_bank.csv` |
| **B0** | Marca, Producto y Rendimientos | 3 Interpretación | 14 | doc B0 |
| **B1** | Espionaje de Competidores + Mapa de Vacíos | 3 Interpretación | 14, POOL_COMPETIDOR | doc B1 + `competitor_map.csv` |
| **15** | Retrato del Cliente: Core Avatar + Sub-avatares (Core 5) | 3 Interpretación | 14, scores | doc 15 |
| **16** | Banco de Lenguaje, Hooks e Identidad Reclamada | 3 Interpretación | 14, 17, 19 | doc 16 |
| **17** | Ranking, Sofisticación, Conciencia y Estrategia | 3 Interpretación | 14, scores, 15 | doc 17 |
| **18** | Mapa y Validación de Deseos de Masa | 3 Interpretación | 14, `PI_SCORES.csv` | doc 18 |
| **19** | UMP / UMS / USP (Mecanismos Únicos) | 3 Interpretación | 14,16,17,20,B0,B1 | doc 19 |
| **20** | Mapa de Dolores + Buyer Psychology | 3 Interpretación | 14, scores | doc 20 |
| **10** | Los 5 Ángulos + Briefs de Producción | 4 Producción-puente | 19, 16, 17 | doc 10 |
| **00** | Master Spine / Índice estratégico | 5 Spine | TODOS (reconciliados) | doc 00 |

### 4.2 Artefactos de datos canónicos (nombres fijos)

| Artefacto | Capa | Producido en | Contenido |
|-----------|------|-------------|-----------|
| `evidence_bank.csv` | 1 | FASE 3 | Banco canónico: 1 fila = 1 pieza de evidencia con `EV-ID` |
| `competitor_map.csv` | 1 | FASE 4 | COMPETITOR_MAP de 7 tipos (§8) |
| `DATA_QUALITY_REPORT.md` | 2 | FASE 1.6 | Salud, sesgo y cobertura del corpus (§6) |
| `CLUSTER_REPORT.md` | 2 | FASE 1.5 | Clusters temáticos + etiqueta verificada + `EV-ID` miembros |
| `PI_SCORES.csv` | 2 | FASE 2 | PI por cluster, doble ranking, delta, componentes |
| `RECONCILIATION_PASS.md` | 5 | FASE 8 | Contradicciones detectadas y resueltas (§9) |
| `VALIDATION_LOG.md` | todas | continuo | Salida de los validadores automáticos (§10) |

**Fusiones que evitan duplicación:** avatar único (doc 15, demografía AL FINAL) · deseo de masa (18) ≠ emoción de compra (20) · el 14 GUARDA la voz cruda, el 16 la CONVIERTE en munición · conciencia/sofisticación se etiquetan UNA vez en INGEST y 15/17 solo agregan.

---

## 5. DOC 14 — Banco de evidencia canónico con IDs (mejora #2)

El doc 14 deja de ser prosa de citas y se convierte en una **tabla canónica con clave primaria**. **Todo `EV-ID` es inmutable.** Todos los demás documentos citan `EV-ID`, nunca re-transcriben.

### 5.1 Esquema de `evidence_bank.csv`

```
EV-ID              # PK inmutable. Formato: EV-<POOL>-<NNNNN>  (p.ej. EV-VEN-00042, EV-INT-00311, EV-COM-00005)
source_type        # uno de los 7 (§2)
pool               # venta | inteligencia | competidor
platform           # amazon | reddit | trustpilot | tiktok | yt | ig | fb | google_local | forum | ...
lang               # ISO (es, en, pt, ...)
is_competitor      # bool
text_raw           # cita textual EXACTA (nunca parafraseada)
url_or_ref         # origen (permalink, listing id, hash de archivo)
engagement_raw     # likes/upvotes/helpful/views según plataforma
w_source           # peso probatorio derivado del source_type (§2)
sentiment_valence  # neg | neu | pos  (con reglas de negación/sarcasmo)
confession_type    # dolor | deseo | solución_fallida | autoculpa | resultado | objeción | identidad | ...
instinct_tag       # (opcional) instinto/driver dominante
buyer_emotion_tag  # emoción de compra
awareness_stage    # 1-5 (etiqueta única de fila)
cluster_id         # asignado en FASE 1.5 (clustering)
PI_cluster         # copiado desde PI_SCORES.csv tras FASE 2 (denormalización de conveniencia)
ingest_batch       # lote de ingesta (para saturación)
sha256_source      # hash del archivo raw de origen (anti-scratch)
```

### 5.2 Regla de cita canónica

- **Formato de cita en cualquier documento:** `EV-VEN-00042` → el motor resuelve `{text_raw, platform, engagement, PI, lang, source_type}` desde el banco.
- Un documento **puede** mostrar `text_raw` inline para legibilidad, pero **debe** anteponer el `EV-ID`. Si el `EV-ID` no existe en `evidence_bank.csv`, el validador (§10) **rompe el build**.
- Una afirmación soportada por múltiples piezas lista todos los IDs: `[CITA: EV-VEN-00042, EV-VEN-00101, EV-VEN-00233]`.
- Una `[INFERENCIA]` lista los IDs de la evidencia observada que la sostiene: `[INFERENCIA ← EV-VEN-00042, EV-VEN-00101]`.

---

## 6. DATA QUALITY REPORT — gate antes de interpretar (mejora #4)

**Bloqueante.** No se escribe ningún documento de Capa 3 hasta que `DATA_QUALITY_REPORT.md` esté generado y **aprobado**. Un corpus sesgado interpretado como si fuera representativo es el fallo más caro del motor. El reporte declara la salud del corpus para que la interpretación sea honesta sobre lo que sabe y lo que no.

### 6.1 Secciones obligatorias

1. **Volumen y cobertura**
   - Filas por pool, por plataforma, por idioma, por `source_type`.
   - Filas útiles tras dedup vs. crudas (tasa de retención).
2. **Balance de fuentes** (tabla): % de evidencia por `source_type`. **Alerta** si:
   - `>60%` viene de una sola plataforma → sesgo de plataforma.
   - `RAW_CONFESSION + REVIEW < 40%` del pool venta → corpus débil en evidencia de peso 1.0.
   - `CREATOR_CONTENT > 30%` → riesgo de leer marketing como voz de mercado.
3. **Balance temporal:** distribución de recencia; alerta si el corpus es viejo (mercado pudo cambiar de sofisticación).
4. **Sesgo de sentimiento:** ratio neg/neu/pos. Alerta si `>80%` de un solo signo (p.ej. solo reseñas 5★ → no hay dolor scrapeado).
5. **Cobertura de clustering:** % de filas con `cluster_id` asignado vs. huérfanas; nº de clusters bajo umbral mínimo.
6. **Calidad del etiquetado:** accuracy del clasificador contra el gold-set (§ FASE 1.5); % de filas `[SIN ETIQUETA CONFIABLE]`.
7. **Idioma de venta suficiente:** ¿el `POOL_VENTA` tiene masa para computar `PI_venta` con umbral de frecuencia? Si no → **declarar cobertura parcial**.
8. **Huecos declarados:** qué preguntas del INTAKE el corpus NO puede responder (p.ej. "no hay evidencia de comprador≠usuario").

### 6.2 Veredicto del gate

- **PASA** → se abre Capa 3.
- **PASA CON RESERVAS** → se abre Capa 3 pero cada reserva se propaga como bandera obligatoria a los documentos afectados (p.ej. avatar marcado `[BASE DÉBIL: 1 sola plataforma]`).
- **FALLA** → volver a ingesta (más scraping) o **detener** si se agotó el presupuesto, cerrando con cobertura parcial explícita. **Nunca** interpretar en silencio sobre un corpus que falló el gate.

---

## 7. SCORING — PI transparente (mejora #5)

El PI (Priority Index) es **matemática pura** en Capa 2: sin narrativa, reproducible, recomputable con el mismo input. Se calcula **por cluster temático** (no por confesión suelta) y **por pool**.

### 7.1 Preparación (obligatoria antes del PI)

- **Clustering** (embeddings multilingües → agrupamiento → etiqueta LLM verificada contra los `EV-ID` miembros) puebla `cluster_id`. **Sin clustering el PI no es computable.**
- Cada cluster debe cumplir el **umbral mínimo de frecuencia** para ser puntuable: `≥8 EV-IDs únicos` **o** `≥0.5% del corpus del pool`. Bajo umbral → `cluster_id` marcado `[SUB-UMBRAL]`, excluido del ranking.

### 7.2 Fórmula (publicada, no caja negra)

```
PI_cluster = ( 0.60 · Frecuencia_norm  +  0.40 · Resonancia_norm )
             · Penalización_calidad
             · Bono_dolor
             · Factor_fuente
                                                      [escala 0–100]

Frecuencia_norm = log1p( Σ w_source_i por EV-ID único del cluster ) / log1p( N_max_pool )
    · La frecuencia se pondera por w_source: un cluster hecho de RAW_CONFESSION (w=1.0)
      pesa más que uno inflado por CREATOR_CONTENT (w=0.25).
    · COMPETITOR_CLAIM, TEAM_SEED e INFERENCE aportan w=0 → NO suben frecuencia.

Resonancia_norm = engagement → percentil INTRA-plataforma
                             → winsorizing p99 (recorta virales extremos)
                             → × peso_plataforma
                             → log1p → normalizado 0–1

Factor_fuente = Σ(w_source · n_i) / Σ(n_i)   sobre los EV-IDs del cluster
    · Penaliza clusters cuya masa proviene de fuentes de bajo peso probatorio.

Penalización_calidad ∈ [0.5, 1.0]   (bots, near-dup residual, off-topic)
Bono_dolor ∈ [1.0, 1.2]             (clusters de dolor agudo, no solo mención)
```

### 7.3 Penalización viral (explícita)

```
si  engagement_top1 / engagement_total_cluster  > 0.70:
      Penalización_viral = 0.6   (el cluster vive de UN outlier, no de masa)
      → el ítem viral se DESVÍA al banco de hooks (no valida deseo)
si  ratio ∈ (0.50, 0.70]:  Penalización_viral = 0.8
si  ratio ≤ 0.50:          Penalización_viral = 1.0

PI_final = PI_cluster · Penalización_viral
```

> **Principio:** la **frecuencia valida** el deseo de masa; la **resonancia solo prioriza** dentro de lo ya validado. Nunca al revés. Un tema con un solo comentario viral **no es un deseo de masa** — es un hook candidato.

### 7.4 Pesos de plataforma (config, no hardcode)

`amazon/trustpilot = 1.0 · reddit/foros = 0.9 · google_local = 0.85 · youtube = 0.8 · ig/fb = 0.7 · tiktok = 0.6`. Editables en `platform_weights.yaml`.

### 7.5 Doble ranking + delta (mejora #5)

```
PI_venta        = PI computado SOLO sobre POOL_VENTA (idioma de lanzamiento)
PI_inteligencia = PI computado sobre POOL_INTELIGENCIA (mercado maduro)
delta_cluster   = rank(PI_inteligencia) − rank(PI_venta)   (alineado por cluster temático equivalente)
```

- **`delta` alto positivo** = tema caliente en el mercado maduro **aún no explotado** en el mercado de venta → **oportunidad de arbitraje** (mecanismo quemado en inglés = fresco en español).
- **Las citas que van a copy salen SIEMPRE del pool idioma-de-venta.** El pool inteligencia solo informa la prioridad y el arbitraje, nunca aporta texto al anuncio.

### 7.6 `PI_SCORES.csv` — esquema

```
cluster_id · label · pool · n_evids · n_evids_pond_w
· frecuencia_norm · resonancia_norm · factor_fuente
· penalizacion_calidad · bono_dolor · penalizacion_viral
· PI_venta · PI_inteligencia · rank_venta · rank_inteligencia · delta
· top_evids (lista de EV-ID representativos)
· flag_subumbral · flag_viral · flag_fuente_debil
```

`CLUSTER_REPORT.md` acompaña con: por cada cluster, la etiqueta humana, 3-5 `EV-ID` representativos con `text_raw`, y la justificación de la etiqueta verificada contra esas citas.

---

## 8. COMPETITOR_MAP — 7 tipos (mejora #10)

El espionaje de competidores deja de ser prosa y se vuelve un esquema tipado (`competitor_map.csv`), consultable y citable. **Cada fila es una observación tipada sobre UN competidor, anclada a `EV-ID` del `POOL_COMPETIDOR`.** Los 7 tipos:

| # | map_type | Qué captura | Fuente típica | source_type |
|---|----------|-------------|---------------|-------------|
| 1 | **CLAIM** | Qué promete el competidor (beneficio declarado) | Landing, ad, bullet de listing | COMPETITOR_CLAIM |
| 2 | **MECHANISM** | Qué mecanismo (UMP/UMS) usa para justificar el claim | Página de "cómo funciona", ad de mecanismo | COMPETITOR_CLAIM |
| 3 | **PROOF** | Qué prueba exhibe (estudios, testimonios, sellos, demos) | PDP, reseñas destacadas, ad | COMPETITOR_CLAIM / REVIEW |
| 4 | **PRICE_OFFER** | Precio, bundle, garantía, suscripción, descuento | Checkout, landing de oferta | COMPETITOR_CLAIM |
| 5 | **GAP** | Vacío / promesa NO cubierta / segmento ignorado | Inferido del cruce claims vs. deseos PI | INFERENCE ← EV-IDs |
| 6 | **WEAKNESS** | Queja recurrente en sus reseñas 1-3★ (dolor no resuelto) | Reseñas 1-3★ del competidor | REVIEW |
| 7 | **POSITIONING** | Cómo se para (identidad, tono, avatar al que le habla) | Home, about, estética del ad | COMPETITOR_CLAIM |

### 8.1 Esquema de `competitor_map.csv`

```
CM-ID · competitor · map_type · statement · evid_refs (EV-IDs)
· strength (débil/medio/fuerte) · our_counter (hipótesis de contraataque, marcada [INFERENCIA])
· links_to (cluster_id de deseo o UMP relacionado)
```

### 8.2 Uso downstream

- **GAP** + **WEAKNESS** son la mina del **UMP no resuelto** (doc 19): donde el competidor deja dolor sin explicar es donde vive el mecanismo del problema.
- **MECHANISM** alimenta la **sofisticación** (§ ejes): cada mecanismo distinto que el mercado ya oyó sube el nivel.
- **CLAIM** + **PROOF** definen qué promesa **NO** repetir (ya quemada) → mapa de vacíos.
- **Regla dura:** ninguna fila del `COMPETITOR_MAP` puede anclar una promesa del producto propio. Es inteligencia, no evidencia de demanda.

---

## 9. RECONCILIATION PASS — antes del Spine (mejora #7)

Antes de escribir el 00, un pase de reconciliación cruza **todos** los documentos de Capa 3-4 y **resuelve contradicciones**. Produce `RECONCILIATION_PASS.md`. **El Spine no se escribe hasta que este pase cierra sin contradicciones abiertas.**

### 9.1 Qué chequea (matriz de coherencia)

| Chequeo | Contradicción típica | Resolución |
|---------|----------------------|------------|
| **Avatar ↔ Deseos** | El deseo dominante (18) no le pertenece al avatar (15) | Reasignar deseo a sub-avatar o corregir avatar |
| **Deseo ↔ UMP** | El UMP (19) resuelve un problema que no es el deseo dominante (18) | Re-derivar UMP desde el deseo top-PI |
| **Conciencia ↔ Estrategia** | La estrategia (17) asume nivel de conciencia distinto al histograma | Alinear entrada del mensaje al nivel dominante |
| **Sofisticación ↔ Mecanismo** | Se propone promesa directa (soph 1-2) pero el mercado está en soph 4 | Escalar a Nuevo Mecanismo o Identidad |
| **Lenguaje ↔ Evidencia** | El banco de lenguaje (16) usa frases sin `EV-ID` real | Rechazar frase o encontrar su `EV-ID` |
| **UMP ↔ Competidor** | El UMP propio es idéntico a un `MECHANISM` del competitor_map | Buscar UMP diferenciado (test "solo nosotros") |
| **PI ↔ Interpretación** | Un doc prioriza un cluster con `PI` bajo o `[SUB-UMBRAL]` | Degradar a mención secundaria o eliminar |
| **Pool ↔ Cita a copy** | Una cita destinada a copy viene de `POOL_INTELIGENCIA` o `COMPETIDOR` | Reemplazar por cita equivalente de `POOL_VENTA` |

### 9.2 Salida

- **Tabla de contradicciones**: `{id, docs implicados, descripción, EV-IDs, resolución, estado}`.
- Estado ∈ `{resuelta, aceptada-con-nota, escalada}`. **Ninguna `escalada` puede quedar abierta al entrar al Spine.**
- Cambios forzados en documentos aguas arriba se registran aquí (trazabilidad de por qué el doc cambió).

---

## 10. VALIDADORES AUTOMÁTICOS (mejora #9)

Scripts deterministas que corren en cada build y **rompen el pipeline** si fallan. Salida a `VALIDATION_LOG.md`. Ninguna capa avanza con un validador en rojo.

| Validador | Regla | Rompe si… |
|-----------|-------|-----------|
| `V01_orphan_claims` | Toda afirmación cita ≥1 `EV-ID` | Existe afirmación sin `EV-ID` ni marca `[INFERENCIA←…]` |
| `V02_evid_resolve` | Todo `EV-ID` citado existe en `evidence_bank.csv` | Un `EV-ID` no resuelve |
| `V03_id_freeze` | Todo ID de doc pertenece a la tabla §4 | Un doc cita un ID inexistente/mal mapeado |
| `V04_layer_flow` | Ninguna capa lee hacia adelante | Capa 3 cita un artefacto de Capa 5, etc. |
| `V05_teamseed_not_proof` | Ninguna afirmación tiene `TEAM_SEED` como único soporte | Un `[CITA]` resuelve solo a `EV-*` de `source_type=TEAM_SEED` |
| `V06_competitor_no_anchor` | Ningún `COMPETITOR_CLAIM` ancla promesa propia | Una promesa del producto propio cita un `EV-COM-*` o `is_competitor=true` |
| `V07_copy_pool` | Citas destinadas a copy salen de `POOL_VENTA` | Una cita a copy viene de inteligencia/competidor |
| `V08_pi_recompute` | `PI_SCORES.csv` se recomputa idéntico desde el banco | El PI publicado ≠ PI recomputado |
| `V09_dq_gate` | `DATA_QUALITY_REPORT.md` en estado PASA/PASA-CON-RESERVAS | Capa 3 arrancó con DQ en FALLA |
| `V10_reconciled` | `RECONCILIATION_PASS.md` sin contradicciones `escaladas` abiertas | El Spine arrancó con una contradicción abierta |
| `V11_spine_last` | El 00 se generó después de todos los demás | El 00 tiene timestamp anterior a cualquier doc |
| `V12_ump_unique` | El UMP pasa el test "solo nosotros" vs. `competitor_map` | El UMP propio = un `MECHANISM` del rival |

> Los validadores son **gate de publicación**: un set de research con cualquier validador en rojo se marca `NO PUBLICABLE` y no se libera a producción de copy.

---

## 11. Pipeline de ejecución (fases, artefactos, criterios de parada)

Orden estricto. Cada fase sella sus artefactos antes de la siguiente. `→` indica el artefacto producido.

### FASE 0 — Intake + Gate (bloqueante)
No arrancar sin: ficha B0 del producto, **categoría** confirmada (NO marca), rutas `/raw/` + actor de Apify + muestra de 20 filas/dump, **idioma/país de venta + mercado de inteligencia**, y la lista de competidores. Falta B0 o categoría → **DETENER**.
→ `intake.yaml` (config del run: pools, idiomas, pesos, topes de presupuesto).

### FASE 1 — Ingesta determinista + asignación de pool y source_type
1. Manifest anti-scratch: `sha256` por archivo, allowlist `/raw/<plataforma>/canonical`, exclusión por patrón (`scratch/tmp/test/backup/~$/copy/(1)`).
2. Validar `platform_map.yaml` contra la muestra real; si `>X%` de filas sin CUERPO o sin engagement → **ABORTAR y avisar**.
3. Parse → `confession_schema`. **Asignar `source_type` (1 de 7) y `pool` (1 de 3) a cada fila.**
4. Dedup: nivel 1 (PK nativo) → nivel 2 (near-dup SimHash intra-plataforma+producto) → nivel 3 (bot/spam/owner_voice/sponsored).
5. Descartar filas sin texto sustantivo (`<4` palabras semánticas).
→ `/pools/{venta,inteligencia,competidor}.parquet` + `dedup_report.json`.

### FASE 1.5 — Etiquetado a escala + Clustering (bloqueante)
- **Gold-set** ~200 filas/idioma etiquetadas a mano → medir accuracy ANTES de confiar en el clasificador. Regla de abstención `[SIN ETIQUETA CONFIABLE]`. Reglas explícitas de negación ("NO me funcionó") y sarcasmo.
- Taggear por fila: `lang, sentiment_valence, confession_type, instinct_tag, buyer_emotion_tag, awareness_stage`.
- **Clustering** por pool → puebla `cluster_id`.
→ `CLUSTER_REPORT.md`.

### FASE 1.6 — DATA QUALITY REPORT (bloqueante, mejora #4)
Generar y evaluar `DATA_QUALITY_REPORT.md` (§6). Veredicto PASA / PASA-CON-RESERVAS / FALLA.
→ `DATA_QUALITY_REPORT.md`. **Gate `V09` aquí.**

### FASE 2 — Scoring PI + doble ranking (Capa 2)
Computar PI por cluster y por pool con la fórmula publicada (§7), penalización viral, factor fuente, doble ranking + delta.
→ `PI_SCORES.csv`. **Gate `V08` (recompute) aquí.**

### FASE 3 — Evidencia (Capa 1 sellada)
Consolidar el **banco canónico** con `EV-ID` inmutables; denormalizar `cluster_id` y `PI_cluster`.
→ `evidence_bank.csv` (doc 14). **Gate `V01/V02` disponibles desde aquí.**

### FASE 4 — Sustrato (paralelo, Capa 3)
- **B0**: rendimientos directos + secundarios del producto propio.
- **B1 + COMPETITOR_MAP**: espionaje tipado de 7 tipos + mapa de vacíos.
→ doc B0, doc B1, `competitor_map.csv` (§8).

### FASE 5 — Interpretación (Capa 3)
`15 Avatar → 18 Deseos` (ÚNICO scoring de deseo: Schwartz 3D Urgencia/Permanencia/Alcance alimentado por `PI_venta`) `→ 20 Buyer Psychology → 17 Estrategia` (histograma de conciencia + sofisticación desde `COMPETITOR_MAP.MECHANISM`).
→ docs 15, 18, 20, 17.

### FASE 6 — Mecanismo (Capa 3)
`19 UMP/UMS/USP` (requiere 14+16-parcial+17+20+B0+B1 saturados + teardown de `WEAKNESS`/`GAP` del competitor_map).
→ doc 19. **Gate `V12` (UMP único).**

### FASE 7 — Producción verbal (Capa 3)
`16 Lenguaje/Hooks/Identidad Reclamada` (convierte `text_raw` de `EV-IDs` en munición; hooks virales desviados en FASE 2 entran aquí, marcados).
→ doc 16.

### FASE 8 — RECONCILIATION PASS (mejora #7)
Cruzar todos los docs, resolver contradicciones (§9).
→ `RECONCILIATION_PASS.md`. **Gate `V10` aquí.**

### FASE 9 — Spine (Capa 5, SIEMPRE al final, mejora #8)
`00 Master Spine` al final; permite **N líneas estratégicas** si la data lo justifica (bimodalidad de conciencia, comprador≠usuario, sub-avatares con cluster real).
→ doc 00. **Gate `V11` (spine last).**

### FASE 10 — Puente (Capa 4)
`10 Los 5 Ángulos` (cada ángulo re-narra el MISMO UMP canónico del 19).
→ doc 10.

### LOOP transversal — Saturación / Parada / Presupuesto
Evaluado **por pool** (venta e inteligencia por separado) tras cada lote de ingesta:
- **Saturación:** `Spearman(rank_N, rank_{N-1}) ≥ 0.95` en el Top-20, `<1%` clusters nuevos en 2 lotes, `≥90%` near-dup de lenguaje nuevo.
- **Presupuesto:** topes de filas/lotes/costo definidos en `intake.yaml`.
- **Regla de parada dura:** si el `POOL_VENTA` no satura y no hay más presupuesto → **lanzar con cobertura parcial etiquetada** (propagada desde el DATA QUALITY REPORT), **nunca** cerrar en falso.

---

## 12. Ejes de estrategia (dos ejes INDEPENDIENTES)

- **Conciencia (1-5):** dónde está la MENTE del prospecto (inconsciente → problema → solución → producto → más consciente). Etiquetada por fila, agregada ponderada por `PI_venta` → **histograma**. Dominante = mayor %PI. Anti-sobreestimación: si dos niveles están dentro de ~10 pts, se elige el MENOR (más barato educar de más).
- **Sofisticación (1-5):** cuántas rondas de claims oyó el MERCADO. `nivel = MAX(Señal A escepticismo VoC, Señal B claims de competidores [= COMPETITOR_MAP.MECHANISM], Señal C inventario de mecanismos)`. No retrocede. Mercado de venta suele ir 1-2 niveles por debajo del mercado maduro → **arbitraje** (confirmado por `delta` del PI).
- **Matriz Conciencia × Sofisticación:** la conciencia fija DÓNDE arranca el mensaje; la sofisticación fija QUÉ claim es creíble (promesa directa → mecanismo → identidad). La celda 5×5 emite: estrategia de entrada, tipo de hook, si requiere UMP/UMS, palanca, tipo de doc.
- **Palanca:** Soph 1-2 → promesa directa (+ Nueva Información si conciencia baja) · 3-4 → **Nuevo Mecanismo (UMP+UMS)** · 5 → **Nueva Identidad** + mecanismo de soporte.

---

## 13. UMP / UMS / USP — metodología

**UMP (Mecanismo Único del Problema):** la causa raíz OCULTA, contra-intuitiva, que explica por qué el prospecto sigue atascado A PESAR de las soluciones obvias. Debe (1) reencuadrar la culpa (de "soy X" → mecanismo externo), (2) explicar por qué fallan TODAS las soluciones tradicionales, (3) ser contra-intuitivo pero con sentido inmediato (`<5s`), (4) anclarse en lenguaje real (`EV-IDs`).

**UMS (Mecanismo Único de Solución):** cómo el producto NEUTRALIZA DIRECTAMENTE el UMP. Candado causal: *"Como el problema real es [UMP], necesitas [ATRIBUTO REAL del producto], que [acción sobre la causa]."* No es "es mejor/más fuerte" (eso es superioridad, no mecanismo). Debe señalarse en una línea real del listing/producto.

**USP (Propuesta Única de Venta):** `[RESULTADO que canaliza el deseo dominante] + gracias a [UMS nombrado] + que ataca [UMP que las demás ignoran] + [prueba VoC = EV-IDs]`. Una sola idea. Vende resultado, no features. Test "solo nosotros": si el competidor puede decir literal lo mismo (revisar `COMPETITOR_MAP.CLAIM/MECHANISM`), no es única.

**Extracción (10 pasos):** precondiciones (14/16/17/20/B0/B1 saturados + teardown competidor) → aislar problema visible + deseo dominante (top `PI_venta`) → minería de "soluciones fallidas" (`confession_type=solución_fallida`) → minería de "autoculpa" → 3-5 hipótesis de causa oculta → contrastar vs. `COMPETITOR_MAP.WEAKNESS/GAP` (ahí vive el UMP no resuelto) → nombrar UMP → derivar UMS del producto real (B0) → validar candado causal → sintetizar USP → empaquetar doc 19.

**STATUS DEL MECANISMO (lógica de sustanciación, no compliance):** cada UMP/UMS declara `estatus: {hecho respaldado | hipótesis persuasiva}`. Anclar en VoC prueba que la QUEJA existe (`EV-IDs`), **no** que la CAUSA sea real. Se separa "evidencia de que el problema existe" (VoC, `RAW_CONFESSION`/`REVIEW`) de "evidencia de que la causa es real" (respaldo externo citado). Esto es rigor de razonamiento; las reglas jurisdiccionales quedan fuera de alcance de esta versión.

---

## 14. Gates anti-alucinación (independientes de compliance)

1. **UMP inventado (riesgo #1):** el UMP cita el patrón de FRACASO repetido (`EV-IDs`) y marca la relación causal como `[INFERENCIA]`; nunca como `[CITA]`.
2. **Demografía / TAM:** demografía solo con evidencia; si no → `[SIN EVIDENCIA DEMOGRÁFICA]`. TAM, tendencia y claims de anuncios son **INPUTS EXTERNOS** (usuario / WebSearch / Ad Library), NO derivables de VoC local; si no se proveen → `[NO DISPONIBLE - no bloqueante]`.
3. **Sofisticación = método original del motor** (se marca como tal, no se fabrica falsa autoridad de fuente).
4. **Scores 1-10 / 1-5:** reportar el CONTEO CRUDO (N `EV-IDs` + PI) junto a cada score y usar bandas (bajo/medio/alto), no precisión falsa de un dígito.
5. **Voz de competidor:** una cita de resultado sobre el producto de un competidor (`is_competitor=true` / `COMPETITOR_CLAIM`) NUNCA ancla una promesa propia (validador `V06`).
6. **Números "plausibles" ≠ ok:** todo número proviene de `EV-ID` citable o se marca ilustrativo/hipotético.
7. **Identidad Reclamada condicional:** si la data no muestra identidad perdida → `NO aplica`; no se fabrica el arco.
8. **TEAM_SEED aislado:** cualquier afirmación cuyo único soporte sea `TEAM_SEED` se marca `[HIPÓTESIS DEL EQUIPO, sin prueba]` (validador `V05`).

---

## 15. INTAKE — lo que el motor necesita para disparar

**Bloqueantes:**
1. **Producto propio (ficha B0):** nombre, formato, componentes/atributos reales (ingredientes+dosis / materiales / geometría / proceso / protocolo), certificaciones, precio(s), garantía. Si aún no hay producto: el/los **listing(s) que se venderán**.
2. **Categoría exacta a escrapear** (NO la marca) + sub-nicho.
3. **Competidores:** 1-3 URLs DTC top + sus listings con reseñas 1-3★ (alimenta `POOL_COMPETIDOR` + `COMPETITOR_MAP`).
4. **Data de scraping:** ruta absoluta de `/raw/`, estructura por plataforma, **qué actor** generó cada dump, muestra de 20 filas/dump para validar schema, y **para qué pool** va cada dump (venta / inteligencia / competidor).
5. **Idioma de venta + país(es)** + mercado de inteligencia (otro idioma) + si es mercado local (Google Business) o nacional.
6. **Vertical/categoría** (para tono y taxonomía de `confession_type`; sin reglas de compliance en esta versión).

**Recomendados:** hipótesis previa de deseo/conciencia/sofisticación (entra como `TEAM_SEED`, nunca como prueba) · si comprador=usuario o hay un tercero (regalo) · fuente de espionaje de ads y TAM (input externo) · presupuesto/tope de ingesta y criterio de parada.

---

## 16. Contrato de repetibilidad (por qué el motor es auditable)

Un tercero, con el **mismo `intake.yaml` + los mismos dumps `/raw/`**, debe poder reproducir el set completo. Esto se garantiza por:

1. **Determinismo de ingesta:** `sha256` + dedup determinista + asignación fija de `source_type`/`pool`.
2. **PI recomputable:** fórmula publicada + `platform_weights.yaml` versionado + validador `V08` que recomputa el PI desde el banco y exige igualdad.
3. **Todo cita `EV-ID`:** cero afirmaciones huérfanas (validador `V01/V02`); cualquier lector rastrea una frase de copy hasta su cita cruda.
4. **Capas selladas:** el flujo unidireccional (validador `V04`) impide que una conclusión contamine su propia evidencia.
5. **Gates registrados:** DATA QUALITY, RECONCILIATION y VALIDATION_LOG dejan rastro escrito de cada decisión de parada, reserva y contradicción.
6. **Spine reproducible:** al escribirse al final sobre artefactos sellados y reconciliados, el 00 es una función determinista de las capas previas, no una opinión.

---

*Motor v3.1 — máquina de research repetible y auditable para cualquier producto DTC. Cambios sobre v3: jerarquía de 7 fuentes con "TEAM_SEED nunca es prueba", banco canónico con EV-IDs, 3 pools de scraping, DATA QUALITY REPORT como gate previo a interpretar, PI transparente con peso por fuente + penalización viral + doble ranking/delta, separación estricta en 5 capas, RECONCILIATION PASS antes del Spine, Spine siempre al final, 12 validadores automáticos y COMPETITOR_MAP de 7 tipos. Compliance fuera de alcance.*
