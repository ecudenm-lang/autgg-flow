# MOTOR DE RESEARCH v3 — Spec Operativo

> Motor unificado de research VoC para lanzamiento de productos DTC (Meta/TikTok, metodología Schwartz).
> Fusiona: **Playbook VoC** (adquisición Apify + PI) · **Evolve/EAM** (avatar Core 5, sofisticación, buyer psychology, identidad reclamada) · **Desire-To-Scale 2.0** (conciencia, deseo, hooks, ángulos, publirreportajes UMP/UMS).
> Rol del operador (Claude Code): ingerir la data local de Apify, profundizar, contrastar, decidir y generar los 12 documentos MASTER + el par UMP/UMS/USP.
>
> **REGLA MADRE:** ninguna afirmación entra a un documento sin ≥1 cita textual real con `{plataforma + engagement + PI + idioma}`. Cero afirmaciones huérfanas. Se separa siempre `[CITA]` de `[INFERENCIA]`.

---

## 1. Arquitectura en 3 capas

```
EVIDENCIA (única capa citable)         →  14 Banco de Confesiones
        │
INTERPRETACIÓN                          →  B0 Producto · B1 Competidores/Vacíos
        │                                  15 Avatar Core5+Sub · 18 Deseos
        │                                  20 Buyer Psychology · 17 Estrategia
        │                                  19 UMP/UMS/USP · 16 Lenguaje/Hooks/Identidad
        │
PRODUCCIÓN-PUENTE                       →  10 Los 5 Ángulos + Briefs
        │
SPINE (verdad consolidada, se escribe al final) → 00 Master Spine
        ↓
   [ copy generado: fuera del set de research ]
```

## 2. Mapa canónico de documentos (IDs CONGELADOS)

> Fix crítico del pase adversarial: los IDs se congelan aquí. Ningún documento cita un ID sin resolverlo contra esta tabla (evita que "el doc de mecanismos" apunte a 18 cuando es 19).

| ID | Documento | Capa | Fuente-sistema |
|----|-----------|------|----------------|
| **00** | Master Spine / Índice estratégico | Spine | Playbook 00 + DTS-4 (fusión) |
| **B0** | Marca, Producto y Rendimientos | Interpretación | Playbook B0 + DTS-5 |
| **B1** | Espionaje de Competidores + Mapa de Vacíos | Interpretación | Playbook B1 + DTS-2 |
| **14** | Banco de Confesiones (voz cruda) | Evidencia | Playbook 14 |
| **15** | Retrato del Cliente: Core Avatar + Sub-avatares (Core 5) | Interpretación | Evolve + Playbook 15 + DTS-1/3 |
| **16** | Banco de Lenguaje, Hooks e Identidad Reclamada | Interpretación | Playbook 16 + Evolve 3-Vértices + DTS-7 |
| **17** | Ranking, Sofisticación, Conciencia y Estrategia | Interpretación | Playbook 17 + Evolve + DTS-1 |
| **18** | Mapa y Validación de Deseos de Masa | Interpretación | Evolve + DTS-5/6 |
| **19** | UMP / UMS / USP (Mecanismos Únicos) | Interpretación | DTS-11 + Evolve "Nuevo Mecanismo" |
| **20** | Mapa de Dolores + Buyer Psychology | Interpretación | Playbook 20 + Evolve BPA |
| **10** | Los 5 Ángulos + Briefs de Producción | Producción-puente | DTS-9/8/10/11 |

**Fusiones que evitan duplicación:** avatar (los 3 sistemas producían "un avatar" → un solo doc 15, demografía AL FINAL) · deseo de masa (18) ≠ emoción de compra (20), separados a propósito · el 14 GUARDA la voz cruda, el 16 la CONVIERTE en munición · conciencia se etiqueta UNA vez por fila (INGEST) y 15/17 solo agregan, no re-infieren.

## 3. Pipeline de ejecución (orden sobre data real)

**FASE 0 — Intake + Gate (bloqueante).** No arrancar sin: ficha B0 del producto, categoría confirmada (NO marca), ruta `/raw/` + actor de Apify + muestra de 20 filas por dump, idioma/país de venta + mercado de inteligencia, vertical/compliance. Falta B0 o categoría → DETENER.

**FASE 1 — Ingesta determinista (nunca puntuar antes de deduplicar).**
1. Manifest anti-scratch: `sha256` por archivo, allowlist `/raw/<plataforma>/canonical`, exclusión por patrón (`scratch/tmp/test/backup/~$/copy/ (1)`).
2. Validar `platform_map.yaml` contra la muestra real; si >X% de filas quedan sin CUERPO o sin engagement → **ABORTAR y avisar** (no ingerir basura).
3. Parse → `confession_schema`.
4. Dedup nivel 1 (PK nativo) → nivel 2 (near-dup SimHash intra-plataforma+producto) → nivel 3 (bot/spam/owner_voice/sponsored).
5. Descartar filas sin texto sustantivo (<4 palabras semánticas).
   → Output: `confessions.parquet` + `dedup_report.json` auditable.

**FASE 1.5 — Etiquetado a escala + Clustering (INSERTADO por el pase adversarial; bloqueante).**
- **Gold-set** de ~200 filas/idioma etiquetadas a mano → medir accuracy ANTES de confiar en el clasificador. Regla de abstención `[SIN ETIQUETA CONFIABLE]`. Reglas explícitas para negación ("NO me funcionó") y sarcasmo.
- Taggear por fila: `lang, sentiment_valence, confession_type, instinct_tag, buyer_emotion_tag, awareness_stage`.
- **Clustering** (embeddings multilingües + agrupamiento + etiqueta LLM verificada contra citas) → poblar `cluster_id` determinista. **Sin clustering el PI no es computable** (el PI se calcula por cluster temático, no por confesión suelta).

**FASE 2 — Scoring PI + doble ranking.**
```
PI_cluster = ( 0.60·Frecuencia_norm + 0.40·Resonancia_norm ) · Penalización_calidad · Bono_dolor   [escala 0–100]
Frecuencia_norm = log1p(N_único_cluster) / log1p(N_max)      (umbral mínimo: ≥8 citas o ≥0.5% del corpus)
Resonancia = engagement → percentil INTRA-plataforma → winsorizing p99 → ×peso_plataforma → log1p
```
- **Frecuencia valida el deseo de masa; resonancia solo prioriza dentro de lo ya validado. Nunca al revés.**
- Pesos por plataforma (config, no hardcode): Amazon/Trustpilot 1.0 · Reddit/foros 0.9 · Google Local 0.85 · YouTube 0.8 · IG/FB 0.7 · TikTok 0.6.
- **Doble ranking:** `PI_venta` (pool idioma de venta = lanzamiento) y `PI_inteligencia` (global incl. inglés). `delta` alto = tema caliente en inglés aún no explotado en español = oportunidad de arbitraje. **Las citas que van a copy SIEMPRE del pool idioma-de-venta.**
- Outliers virales → banco de hooks aparte + degradar clusters cuyo engagement viene >70% de un solo ítem.

**FASE 3 — Evidencia:** doc 14 (única capa citable).
**FASE 4 — Sustrato (paralelo):** B0 (rendimientos directos + secundarios + semáforo compliance) · B1 (espionaje + mapa de vacíos).
**FASE 5 — Interpretación:** 15 Avatar → 18 Deseos (ÚNICO scoring de deseo: Schwartz 3D Urgencia/Permanencia/Alcance alimentado por PI) → 20 Buyer Psychology → 17 Estrategia (histograma de conciencia + sofisticación).
**FASE 6 — Mecanismo:** 19 UMP/UMS/USP (requiere 14+16+17+20+B0+B1 saturados + teardown de reseñas 1-3★ del competidor).
**FASE 7 — Producción verbal:** 16 Lenguaje/Hooks/Identidad Reclamada.
**FASE 8 — Spine:** 00 al final; permite **N líneas estratégicas** si la data lo justifica (bimodalidad de conciencia, comprador≠usuario, sub-avatares con cluster real).
**FASE 9 — Puente:** 10 Los 5 Ángulos (cada ángulo re-narra el MISMO UMP canónico del 19).

**LOOP transversal (saturación).** Evaluado **por pool** (venta e inteligencia por separado) tras cada lote: `Spearman(N, N-1) ≥ 0.95` en el Top-20, <1% clusters nuevos en 2 lotes, ≥90% near-dup de lenguaje. **Regla de parada dura** (tope de filas/lotes/presupuesto del intake): si el pool de venta no satura y no hay más presupuesto → **lanzar con cobertura parcial etiquetada**, nunca cerrar en falso.

## 4. Ejes de estrategia (dos ejes INDEPENDIENTES)

- **Conciencia (1-5):** dónde está la MENTE del prospecto (inconsciente → problema → solución → producto → más consciente). Se etiqueta por fila con marcadores lingüísticos, se agrega ponderado por PI → **histograma**. Dominante = mayor %PI. Regla anti-sobreestimación: si dos niveles están dentro de ~10 pts, se elige el MENOR (más barato educar de más).
- **Sofisticación (1-5):** cuántas rondas de claims oyó el MERCADO. `nivel = MAX(Señal A escepticismo VoC, Señal B claims de competidores, Señal C inventario de mecanismos)`. La sofisticación no retrocede. **El mercado hispano suele ir 1-2 niveles por debajo del inglés → arbitraje: mecanismo quemado en inglés = fresco en español.**
- **Matriz Conciencia × Sofisticación:** la conciencia fija DÓNDE arranca el mensaje; la sofisticación fija QUÉ claim es creíble (promesa directa → mecanismo → identidad). La celda 5×5 emite: estrategia de entrada, tipo de hook, si requiere UMP/UMS, palanca, tipo de doc.
- **Palanca:** Sofisticación 1-2 → promesa directa (+ Nueva Información si conciencia baja) · 3-4 → **Nuevo Mecanismo (UMP+UMS)** · 5 → **Nueva Identidad** + mecanismo de soporte.

## 5. UMP / UMS / USP — metodología (tu pedido explícito)

**UMP (Mecanismo Único del Problema):** la causa raíz OCULTA, contra-intuitiva, que explica por qué el prospecto sigue atascado A PESAR de intentar las soluciones obvias. Debe (1) reencuadrar la culpa (de "soy flojo" → mecanismo externo), (2) explicar por qué fallan TODAS las soluciones tradicionales, (3) ser contra-intuitivo pero con sentido inmediato (<5s), (4) anclarse en lenguaje real.

**UMS (Mecanismo Único de Solución):** cómo el producto NEUTRALIZA DIRECTAMENTE el UMP. Candado causal: *"Como el problema real es [UMP], necesitas [ATRIBUTO REAL del producto], que [acción sobre la causa]."* No es "es mejor/más fuerte" (eso es superioridad, no mecanismo). Debe señalarse en una línea real del listing.

**USP (Propuesta Única de Venta):** `[RESULTADO que canaliza el deseo dominante] + gracias a [UMS nombrado] + que ataca [UMP que las demás ignoran] + [prueba VoC]`. Una sola idea. Vende resultado, no features. Test "sólo nosotros": si el competidor puede decir literal lo mismo, no es única.

**Extracción (10 pasos):** precondiciones (14/16/17/20/B0/B1 saturados + teardown competidor) → aislar problema visible + deseo dominante → minería de "soluciones fallidas" → minería de "autoculpa" → 3-5 hipótesis de causa oculta → contrastar vs reseñas 1-3★ del competidor (ahí vive el UMP no resuelto) → nombrar UMP → derivar UMS del producto real → validar candado causal → sintetizar USP → empaquetar doc 19.

**GATE DE SUSTANCIACIÓN (fix crítico de compliance):** cada UMP/UMS declara `estatus del mecanismo: {hecho respaldado | hipótesis persuasiva}`. Anclar en VoC prueba que la QUEJA existe, **no** que la CAUSA sea real. Un mecanismo causal presentado como hecho en pauta pagada sin respaldo externo es claim engañoso ante Meta/TikTok/FTC/Profeco. Separar "evidencia de que el problema existe" (VoC) de "evidencia de que la causa es real" (respaldo científico/estructural externo citado).

## 6. Gates anti-alucinación y compliance (correcciones del pase adversarial)

1. **UMP inventado (riesgo #1):** el UMP debe citar el patrón de FRACASO repetido y marcar la relación causal como `[INFERENCIA]`; nunca presentarla como `[CITA]`.
2. **Demografía / TAM:** el prompt DTS-1 dice "genera estimaciones estilo SimilarWeb" = licencia para alucinar. **Anulada:** demografía solo con evidencia, si no `[SIN EVIDENCIA DEMOGRÁFICA]`. TAM, tendencia y claims de anuncios son **INPUTS EXTERNOS** (los provee el usuario o WebSearch/Ad Library), NO derivables de la VoC local; si no se proveen → `[NO DISPONIBLE - no bloqueante]`.
3. **Sofisticación = método ORIGINAL del motor** (no sale de tus documentos; el archivo "Market Sophistication" es en realidad el prompt de Identidad Reclamada). Se marca como tal para no fabricar falsa autoridad.
4. **Scores 1-10 / 1-5:** reportar el CONTEO CRUDO (N citas + PI) junto a cada score y usar bandas (bajo/medio/alto), no precisión falsa de un dígito.
5. **Voz de competidor:** una cita de resultado sobre el producto de un competidor (`is_competitor=true`) NUNCA ancla una promesa del producto propio.
6. **Números "plausibles" ≠ ok:** todo número proviene de fuente citable o se marca ilustrativo/hipotético.
7. **Identidad Reclamada condicional:** si la data no muestra identidad perdida → `NO aplica`, no se fabrica el arco.
8. **Verbos prohibidos por vertical** (curar/tratar/revertir/eliminar) definidos en el intake según jurisdicción.

## 7. INTAKE — lo que necesito de ti para disparar el motor

**Bloqueantes:**
1. **Producto propio (ficha B0):** nombre, formato, ingredientes+dosis / materiales / geometría / proceso / protocolo, certificaciones, precio(s), garantía. Si aún no hay producto: el/los **listing(s) de Amazon** que vas a vender.
2. **Categoría exacta a escrapear** (NO la marca) + sub-nicho.
3. **Competidores:** 1-3 URLs DTC top + sus listings de Amazon (con las reseñas 1-3★).
4. **Data de Apify:** ruta absoluta de `/raw/`, estructura por plataforma, **qué actor** generó cada dump, y una muestra de 20 filas por dump para validar el schema.
5. **Idioma de venta + país(es)** + mercado de inteligencia (inglés u otro) + si es mercado local (Google Business) o nacional.
6. **Vertical + jurisdicción de compliance** (suplemento/belleza/salud/mascota/hogar; FTC-FDA / Profeco / UE).

**Recomendados:** tu hipótesis previa de deseo/conciencia/sofisticación · si comprador=usuario o hay un tercero (regalo) · fuente de espionaje de ads y TAM · presupuesto/tope de ingesta y criterio de parada.

---
*Motor v3 — diseñado con 5 arquitectos en paralelo + 1 pase adversarial (workflow research-engine-spec-v3). Los IDs, el gate de sustanciación, el paso de clustering/etiquetado y el tratamiento de TAM/demografía como input externo son correcciones del pase crítico sobre el diseño inicial.*
