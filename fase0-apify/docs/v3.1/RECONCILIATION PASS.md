# RECONCILIATION PASS — Auditoría de Consistencia Documental
*Motor v3.1 · RECONCILIATION PASS · Auditor de consistencia*
*Fecha: 2026-07-05 · Alcance: DOC 00 · DOC 15 · DOC 19 · DOC 20 · v3.1/CLUSTER_REPORT · v3.1/DATA QUALITY REPORT*

> **Propósito:** detectar y resolver contradicciones entre el Spine v3 (DOC 00 y documentos downstream 15/19/20, todos anclados en los PI de v3) y la nueva evidencia ponderada de v3.1 (CLUSTER_REPORT + DATA QUALITY REPORT). El principio de resolución es: **cuando v3.1 (ponderado por fuente real, con creadores down-weighted) contradice a v3, gana v3.1**, porque v3.1 corrige un sesgo de medición conocido — no cambia el corpus, cambia la fiabilidad del score.

---

## RESUMEN DE VEREDICTOS (para leer en 30 segundos)

| # | Contradicción | Severidad | Decisión | ¿El Spine cambia? |
|---|---|---|---|---|
| 1 | Gancho líder: hinchazón #1 (v3) vs hígado graso #1 con hinchazón empatada (v3.1) | **ALTA** | Empate técnico arriba; **hinchazón sigue siendo el GANCHO de copy**, hígado graso queda como causa-raíz/prueba | **SÍ** — corregir números y matizar "#1" |
| 2 | Conclusiones v3 infladas por ~2,100 captions de creadores (CREATOR down-weight en v3.1) | **ALTA** | Re-anclar todos los PI a los de v3.1; marcar clusters creator-driven | **SÍ** — sustituir tabla de PI |
| 3 | DOC 20 arranca con frase residual de ejecución | **MEDIA** | Borrar líneas 1-3 de DOC 20 | No (limpieza de DOC 20) |
| 4 | Citación de mecanismo/avatar sin ID de DOC 14 | **MEDIA** | El set no incluye DOC 14; citas usan `grounding.md`/Fase 0, no IDs de DOC 14 | Aclarar convención de citación en el Spine |
| 5 | Villano alcohol (bajo, no-villano) | **BAJA** | Consistente en todos los docs; v3.1 lo confirma | No (ya coherente) |
| 6 (extra) | PI de "vientre plano" difiere entre DOC 20 (68.5) y CLUSTER v3.1 (65.7) | **MEDIA** | Adoptar 65.7 (v3.1) | Sí — nota de corrección menor |
| 7 (extra) | n=1770 vs freq real 1777 (bloating) | **BAJA** | Adoptar 1777 (v3.1) | Sí — corregir el "n" citado |
| 8 (extra) | "Enzimas es #5 en MX" — sigue siendo cierto por orden, pero el PI cambió | **BAJA** | Mantener rol (#5 / capa de prueba); actualizar valor 85.0 | Sí — actualizar número |

---

## CONTRADICCIÓN 1 — ¿Cambia el gancho líder? (hinchazón vs hígado graso)

| Campo | Contenido |
|---|---|
| **Contradicción detectada** | DOC 00 (v3) declara **hinchazón como deseo/gancho #1 con PI 99.8**, y hígado graso #2 (98.1). El CLUSTER_REPORT v3.1 (ponderado por fuente real) invierte el orden: **Hígado graso/NAFLD 99.1 (#1)** vs **Hinchazón/panza 97.9 (#2)** — quedan prácticamente empatados arriba (~1.2 pts), pero el rótulo "hinchazón #1" ya no es literal. |
| **Documentos afectados** | DOC 00 (§5 ranking PI, §1 veredicto, "PARA DUMMIES"), DOC 15 (línea 7, §1, Sub-avatar A "gancho #1 PI 99.8"), DOC 19 (candado causal "PI-ES 99.8", tabla §4.1), DOC 20 (§0, §1.1, tabla maestra, §7), CLUSTER_REPORT v3.1. |
| **Evidencia que soporta cada lado** | **Lado v3 (hinchazón #1):** DOC 00 §5 "hinchazón 99.8 (n=1770) › hígado graso 98.1". Es el número heredado por 15/19/20. **Lado v3.1 (hígado graso #1, empate):** CLUSTER_REPORT filas 15-16 → Hígado graso 99.1 / Hinchazón 97.9. La razón mecánica del cambio está en las columnas RAW/CREATOR: Hinchazón tiene **CREATOR 551** (el más alto de todo el top) sobre RAW 1171; Hígado graso tiene **CREATOR 267** sobre RAW 1108. Al bajar el peso de creadores a 0.25, la hinchazón pierde más terreno que el hígado graso → se invierte el orden. |
| **Decisión final** | **Empate técnico en la cima; el gancho de COPY sigue siendo la hinchazón.** El cambio de orden es de ~1 punto y responde a la corrección de sesgo, no a un cambio de mercado. Pero estratégicamente **nada se rompe**: la doctrina de los tres documentos (00/15/19/20) ya dice que hígado graso es la **causa-raíz/mecanismo/prueba** y hinchazón es el **síntoma visible con el que se abre** (DOC 00 §5: "El hígado es el MECANISMO, no el deseo"; DOC 15 §1 [INFERENCIA]). v3.1 en realidad **refuerza** esa arquitectura: el órgano (hígado) puntúa más alto como tema, el síntoma (hinchazón) es el gancho emocional visible. Se conserva "abrir por hinchazón → revelar hígado". |
| **Documento que debe actualizarse** | DOC 00 (fuente de verdad; los demás heredan). Secundariamente reetiquetar el "#1" en DOC 15/19/20. |
| **Cómo queda redactado en el Spine** | §5: *"**Ranking PI v3.1 (ponderado, creadores down-weighted):** hígado graso 99.1 › hinchazón 97.9 (empate técnico en la cima) › natural 92.4 › detox 91.0 › enzimas 85.0 › digestión pesada 82.4 › peso 78.4. **El hígado graso puntúa como tema #1 y la hinchazón como #2 empatado; el GANCHO DE COPY sigue siendo la hinchazón** (síntoma visible y emoción de alivio), con el hígado graso como causa-raíz y capa de prueba. El hígado es el MECANISMO, no el deseo."* |

---

## CONTRADICCIÓN 2 — Conclusiones de v3 que dependían de creadores (CREATOR_CONTENT)

| Campo | Contenido |
|---|---|
| **Contradicción detectada** | DATA QUALITY REPORT §4 y §6 declaran que **~2,100 captions de CREATOR_CONTENT (15.5% del corpus) "en v3 inflaban el ranking"** y ahora se down-weightean a 0.25. Todos los PI citados en DOC 00/15/19/20 son los **PI de v3 (inflados)**. Por tanto, cualquier conclusión anclada en un cluster con CREATOR alto sobre RAW bajo está sobre-ponderada en los documentos actuales. |
| **Documentos afectados** | DATA QUALITY REPORT + CLUSTER_REPORT (v3.1) contra DOC 00 §5, DOC 15 (línea 7 + Sub-avatares A/B), DOC 19 (§0, §4.1), DOC 20 (todas las anclas-PI de las 6 emociones). |
| **Evidencia que soporta cada lado** | **Conclusiones v3 que dependían MÁS de creadores (mayor caída en v3.1):** **Hinchazón** (CREATOR 551; 99.8→97.9, y pierde el #1). **Enzimas ALT/AST** (CREATOR 284 sobre RAW 474; 88.3→85.0). **Digestión pesada** (CREATOR 276 sobre RAW 319 — casi paridad creator/raw; 86.9→82.4, la mayor caída relativa del top). **Creencia: la edad** (CREATOR 65 sobre RAW 39 — creator-driven neto; PI venta 51.3 con Δ+44.8, señal de tema empujado por creadores). **Cansancio 2pm / niebla mental / bajón** (CREATOR ≥ RAW, todos bajos y creator-inflados). **Conclusiones que se sostienen (RAW domina):** **Hígado graso** (RAW 1108 vs CREATOR 267 → robusto, sube a #1), **Preferencia natural** (RAW 670 vs 212), **Detox** (RAW 622 vs 176), **Peso** (RAW 355 vs 131). El CLUSTER_REPORT §Lectura lo formaliza: "CREATOR alto vs RAW bajo = tema empujado por creadores → tratar con cautela." |
| **Decisión final** | **Re-anclar TODOS los PI de los documentos downstream a los valores de CLUSTER_REPORT v3.1.** Ninguna conclusión ESTRATÉGICA se cae (el hígado graso y la preferencia natural, pilares del posicionamiento, son RAW-robustos), pero **tres números citados como "hechos" deben corregirse** (hinchazón 99.8→97.9, enzimas 88.3→85.0, digestión 86.9→82.4) y **tres temas menores deben marcarse "creator-driven, tratar con cautela"** (edad, cansancio 2pm, niebla mental) para que no se conviertan en ángulos de copy sin validación. La emoción rectora (Alivio vía hinchazón) se mantiene porque hinchazón, aun down-weighted, sigue en 97.9 (#2 empatado). |
| **Documento que debe actualizarse** | DOC 00 (tabla de PI en §5) como fuente; luego propagar a DOC 15 (línea 7), DOC 19 (§0/§4.1) y DOC 20 (anclas-PI de §1.1-1.7 y tabla maestra). |
| **Cómo queda redactado en el Spine** | Añadir a §10 (Contrato de Coherencia) una línea: *"**Ancla de PI = CLUSTER_REPORT v3.1** (ponderado por fuente: RAW/REVIEW=1.0, CREATOR=0.25, COMPETITOR=0). Los PI de v3 quedan derogados. Clusters marcados como creator-driven (edad, bajón 2pm, niebla mental, vergüenza-cuerpo) NO se usan como ángulo de copy sin validación de Ronda 2 — son señal de creador, no de cliente."* |

---

## CONTRADICCIÓN 3 — Frase residual de ejecución en DOC 20

| Campo | Contenido |
|---|---|
| **Contradicción detectada** | DOC 20 **empieza con texto de proceso del LLM, no con contenido del documento**. Líneas 1-3 dicen: *"Both files are read and grounded. Now let me load the design context for the visual, then build the complete Document 20…"* y *"I have everything I need to write the document…"*. Es residuo de ejecución filtrado al entregable. |
| **Documentos afectados** | DOC 20 (líneas 1-3 exclusivamente). No contamina la lógica, pero rompe la profesionalidad del documento y puede confundir a un copywriter/LLM que lo cargue como brief. |
| **Evidencia que soporta cada lado** | No hay dos lados: es un defecto objetivo. El título real del documento (`# DOCUMENTO 20 — MAPA DE DOLORES + BUYER PSYCHOLOGY`) empieza en la línea 5. Las líneas 1-3 están en inglés y en primera persona de asistente ("let me…", "I have everything I need"). |
| **Decisión final** | **Eliminar las líneas 1-3 de DOC 20.** El documento debe empezar en la línea 5 (`# DOCUMENTO 20 …`). Adicionalmente, revisar el cierre (líneas 311-315) que expone rutas internas del scratchpad (`AppData\Local\Temp\...\grounding.md`) — es aceptable como nota de fuente pero conviene normalizarlo a "grounding.md (banco de confesiones)" sin la ruta temporal completa. |
| **Documento que debe actualizarse** | DOC 20 (solo limpieza; no toca al Spine). |
| **Cómo queda redactado en el Spine** | El Spine no cambia por esto. Añadir a §10 checklist una casilla de higiene: *"✅ ningún documento del set contiene texto de proceso/ejecución del LLM ni rutas temporales de scratchpad en el cuerpo del entregable."* |

---

## CONTRADICCIÓN 4 — Afirmaciones de avatar/mecanismo sin cita ID de DOC 14

| Campo | Contenido |
|---|---|
| **Contradicción detectada** | La tarea pide verificar si hay afirmaciones de avatar/mecanismo **sin ID de cita de DOC 14**. **DOC 14 no está en el set entregado** (DOC 00 §0 lista el set como 00·15·16·19·20·Fase 0 — no incluye 14). Los documentos citan contra `grounding.md` y "semillas verbatim MX (Fase 0)", con formato `[plataforma·engagement]`, **no** contra IDs de DOC 14. |
| **Documentos afectados** | DOC 15, DOC 19, DOC 20 (todos usan el esquema `grounding.md` / Fase 0). DOC 00 §0 (define el set sin DOC 14). |
| **Evidencia que soporta cada lado** | **Lado "falta DOC 14":** ninguna cita en 15/19/20 referencia un "DOC 14"; el estándar de anclaje declarado es `grounding.md` (DOC 15 línea 5; DOC 19 línea 4; DOC 20 línea 8). **Afirmaciones sin cita dura (las hay, pero están correctamente marcadas [INFERENCIA]/[HIPÓTESIS PERSUASIVA], no presentadas como hecho):** la cadena causal hinchazón→bilis→hígado (DOC 19 §2.2 fila 5 "— sin cita —", gate ⚠️); Colina 1-a-1 sobre hinchazón (DOC 19 §3.1 "sin cita VoC directa"); "hasta 98% absorción" del formato gotas (DOC 19 §3.3, marcada [INFERENCIA + Fase 0]); garantía 60 días (DOC 20 §5, [Fase 0 §1]). Estas están **etiquetadas como hipótesis**, no como hechos sin cita. |
| **Decisión final** | **No es una contradicción de datos sino de convención de citación.** El set no usa DOC 14; usa `grounding.md` + Fase 0, y separa disciplinadamente [CITA] de [INFERENCIA]/[HIPÓTESIS PERSUASIVA]. **Acción:** (a) confirmar que la convención canónica de citación es `grounding.md` + Fase 0 (no DOC 14) y dejarlo escrito en el Spine para eliminar la ambigüedad; (b) si existe un DOC 14 (p.ej. banco de citas indexado) fuera de este set, unificar el esquema de IDs en Ronda 2. Ninguna afirmación de mecanismo se presenta hoy como hecho sin respaldo — las no-citadas ya llevan gate ⚠️. |
| **Documento que debe actualizarse** | DOC 00 §0 y §10 (fijar la convención de citación). |
| **Cómo queda redactado en el Spine** | §10: *"**Convención de citación canónica:** toda cita se ancla en `grounding.md` (13,548 confesiones) o en semillas verbatim de Fase 0, con formato `"cita" [plataforma·engagement]`. No se usan IDs de DOC 14 (fuera de este set). Toda cadena causal no citable va marcada [HIPÓTESIS PERSUASIVA]; toda lectura estratégica va marcada [INFERENCIA]. Prohibido presentar una hipótesis como [CITA]."* |

---

## CONTRADICCIÓN 5 — Villano alcohol: ¿consistente y bajo en todos los docs?

| Campo | Contenido |
|---|---|
| **Contradicción detectada** | Verificar que el alcohol se trata consistentemente como **NO-villano (bajo)** en todos los documentos, sin contradicción interna. |
| **Documentos afectados** | DOC 00 (§7 "villano NO alcohol, rank #10 MX"; PARA DUMMIES #6), DOC 15 (línea 7, Sub-avatar C, §EVITAR línea 245), DOC 19 (§2.3 "bajar alcohol, subir comida/azúcar"), DOC 20 (§0, §1.5, §7), CLUSTER_REPORT v3.1. |
| **Evidencia que soporta cada lado** | **Consistencia confirmada (un solo lado):** DOC 00 dice rank #10; DOC 15 dice "rank 10 MX"; DOC 19 subordina el alcohol explícitamente; DOC 20 nombra el villano como comida/azúcar/frituras. **v3.1 lo respalda cuantitativamente:** CLUSTER_REPORT fila "Alcohol→hígado" = **PI venta 63.4 vs PI intel 77.2 (Δ −13.8)** → efectivamente bajo en MX y más fuerte en US. **Matiz de número:** los docs v3 dicen "rank #10"; en el ranking v3.1 el cluster "Alcohol→hígado" cae en la **posición #10 contando los 25 clusters** (fila 24 del CSV, pero #10 entre los clusters de dolor/deseo/mecanismo relevantes) → el rótulo "#10" sigue siendo defendible. Además su Δ negativo lo marca como **capa de inteligencia US importable** (villano de sobriedad para el pool US / Sub-avatar C secundario), nunca como gancho MX. |
| **Decisión final** | **Consistente. No hay contradicción.** El alcohol es villano bajo en MX en los 4 documentos y v3.1 lo confirma (PI 63.4, Δ−13.8). Se mantiene la doctrina: villano MX = frituras+azúcar+comida pesada; alcohol = subordinado / Sub-avatar C / inteligencia US. Única micro-acción: sustituir "rank #10" por el dato v3.1 "PI 63.4 (Δ−13.8 vs US)" para robustez. |
| **Documento que debe actualizarse** | Ninguno de forma estructural; opcional refrescar el número en DOC 00 §7 y DOC 15 línea 7. |
| **Cómo queda redactado en el Spine** | §7: *"**Villano MX:** frituras + azúcar + comida pesada (tamales, ponche). **NO alcohol** — cluster Alcohol→hígado PI 63.4 en MX vs 77.2 en US (Δ−13.8): bajo en venta, se reserva como inteligencia US y para el Sub-avatar C secundario."* |

---

## CONTRADICCIONES ADICIONALES DETECTADAS (más allá de la lista conocida)

### CONTRADICCIÓN 6 — PI de "vientre plano" difiere entre documentos

| Campo | Contenido |
|---|---|
| **Contradicción detectada** | DOC 19 (§4.1) y DOC 20 (§1.3, §1.6, tabla maestra) citan **desire_flat_stomach = 68.5**. El CLUSTER_REPORT v3.1 lista **"Deseo: vientre plano" = 65.7** (PI venta). Dos valores distintos para el mismo tema. |
| **Documentos afectados** | DOC 19 §4.1; DOC 20 §1.3/§1.6/tabla; CLUSTER_REPORT v3.1 (fila 23). |
| **Evidencia que soporta cada lado** | v3 (68.5) es el heredado en 19/20. v3.1 (65.7) es el ponderado — coherente con que "vientre plano" tenga CREATOR 62 sobre RAW 125 (down-weight aplicado). Nota curiosa: 65.7 es también el PI-ES de "obj_does_it_work" en v3 (DOC 15 §Objeciones), lo que aumenta el riesgo de confusión de números si no se re-ancla. |
| **Decisión final** | **Adoptar 65.7 (v3.1).** Diferencia menor, sin impacto estratégico (sigue siendo emoción de Identidad/Estatus de segundo-tercer orden), pero debe unificarse para que la tabla maestra de DOC 20 no contradiga al CLUSTER_REPORT. |
| **Documento que debe actualizarse** | DOC 19 §4.1, DOC 20 (§1.3, §1.6, tabla maestra). |
| **Cómo queda redactado en el Spine** | No requiere línea propia en el Spine; se cubre con la directiva de la Contradicción 2 ("ancla de PI = CLUSTER_REPORT v3.1"). |

### CONTRADICCIÓN 7 — El "n" de la hinchazón (n=1770 vs freq 1777)

| Campo | Contenido |
|---|---|
| **Contradicción detectada** | DOC 00 §5 y DOC 20 §7 citan **n=1770** para bloating. El CLUSTER_REPORT v3.1 da **freq real = 1777** para Hinchazón/panza. |
| **Documentos afectados** | DOC 00 §5; DOC 15 §7 ("bloating=99.8"); DOC 20 §7 ("n=1770 confesiones MX"). |
| **Evidencia que soporta cada lado** | 1770 es el número v3; 1777 es la frecuencia bruta v3.1 (columna "freq real"). Diferencia de 7 confesiones — trivial pero inconsistente. |
| **Decisión final** | **Adoptar freq 1777 (v3.1)**, y aclarar que es frecuencia bruta del cluster, no el "n" de un cálculo estadístico (el PI es un score compuesto, no una media sobre n). |
| **Documento que debe actualizarse** | DOC 00 §5, DOC 20 §7. |
| **Cómo queda redactado en el Spine** | §5: *"…hinchazón 97.9 (freq bruta 1777 confesiones)…"*. |

### CONTRADICCIÓN 8 — "Enzimas #5 en MX": rol correcto, número desactualizado

| Campo | Contenido |
|---|---|
| **Contradicción detectada** | DOC 00/15/19/20 fijan enzimas ALT/AST como **#5 en MX con PI 88.3** y capa de prueba (no gancho). En v3.1 el cluster "Enzimas ALT/AST" cae a **85.0** (sigue #5 por orden entre los clusters top, e **intel = 100.0**). |
| **Documentos afectados** | DOC 00 §5; DOC 15 §7 + Sub-avatar B; DOC 19 §4.3 Ángulo E; DOC 20 §1.4. |
| **Evidencia que soporta cada lado** | El **rol** (#5 en MX, #1 en US, usar como prueba/inteligencia) es **correcto y confirmado por v3.1** (venta 85.0 vs intel 100.0, Δ−15.0 → el mayor argumento para "capa de prueba importable"). Solo el **valor absoluto** cambia (88.3→85.0), en parte por CREATOR 284. |
| **Decisión final** | **Mantener el rol intacto** (es una de las conclusiones mejor respaldadas por v3.1); **actualizar solo el número** 88.3→85.0. |
| **Documento que debe actualizarse** | DOC 00 §5, DOC 15 §7, DOC 20 §1.4/tabla. |
| **Cómo queda redactado en el Spine** | §5: *"…enzimas 85.0 (MX #5; US #1 con 100.0 → capa de PRUEBA importable, no gancho)…"*. |

---

## MATRIZ DE RE-ANCLAJE DE PI (v3 derogado → v3.1 canónico)

| Cluster / tema | PI v3 citado (DOC 00/15/19/20) | PI v3.1 (CLUSTER_REPORT, venta MX) | Acción | Riesgo creator |
|---|---|---|---|---|
| Hígado graso/NAFLD | 98.1 (#2) | **99.1 (#1)** | Corregir + sube a #1 | Bajo (RAW 1108 domina) |
| Hinchazón/panza | 99.8 (#1) | **97.9 (#2 empatado)** | Corregir; sigue siendo gancho de copy | **Alto (CREATOR 551)** |
| Preferencia natural | 92.2 | **92.4** | Corregir (menor) | Bajo |
| Detox/toxinas | 90.8 | **91.0** | Corregir (menor) | Bajo |
| Enzimas ALT/AST | 88.3 | **85.0** | Corregir; rol #5/prueba intacto | Medio (CREATOR 284) |
| Digestión pesada | 86.9 | **82.4** | Corregir | **Alto (CREATOR 276 ≈ RAW 319)** |
| Peso que no baja | 80.2 | **78.4** | Corregir | Bajo |
| Deseo: vientre plano | 68.5 | **65.7** | Corregir | Medio |
| Objeción: ¿funciona? | 65.7 | **58.4** | Corregir | Medio |
| Objeción: sabor | 58.8 (DOC 20) | **56.6** | Corregir | Bajo |
| Alcohol→hígado | "rank #10" | **63.4 (Δ−13.8)** | Reemplazar rótulo por PI | — (no-villano MX) |
| Creencia: la edad | — | 51.3 (Δ+44.8) | **Marcar creator-driven** | **Muy alto (CREATOR 65 > RAW 39)** |
| Bajón 2pm / Niebla mental | — | 30.6 / 25.6 | **Marcar creator-driven** | **Alto** |

---

## INSTRUCCIONES PARA EL SPINE ACTUALIZADO

- **Sustituir el ranking PI de DOC 00 §5** por el de v3.1: *hígado graso 99.1 › hinchazón 97.9 › natural 92.4 › detox 91.0 › enzimas 85.0 › digestión 82.4 › peso 78.4*. Etiquetarlo explícitamente como **"Ranking PI v3.1 (ponderado; creadores down-weighted 0.25)"** y derogar los PI de v3.
- **Reafirmar la doctrina del gancho sin cambiar la estrategia:** el hígado graso es ahora el tema #1 por score, pero **el GANCHO DE COPY sigue siendo la hinchazón** (síntoma visible + emoción de alivio). Redactar en §1/§5: "abrir por hinchazón → revelar hígado graso como causa-raíz → cerrar con enzimas como prueba". El empate técnico refuerza la arquitectura existente; no la invalida.
- **Añadir a §10 la regla de anclaje de datos:** "Ancla de PI = CLUSTER_REPORT v3.1. Peso por fuente: RAW/REVIEW=1.0, CREATOR=0.25, COMPETITOR=0. PI de v3 derogados."
- **Marcar como creator-driven (no usar como ángulo de copy sin validación Ronda 2):** creencia "la edad" (Δ+44.8, CREATOR>RAW), bajón 2pm, niebla mental, vergüenza-cuerpo. Estas son señales de creador/influencer, no de cliente real.
- **Actualizar el rol de enzimas manteniéndolo:** enzimas ALT/AST = MX #5 (85.0) / US #1 (100.0) → **capa de prueba importable, nunca gancho MX**. Es una de las conclusiones mejor respaldadas por v3.1 (Δ−15.0); no tocar la estrategia, solo el número.
- **Fijar el villano con dato v3.1:** villano MX = frituras+azúcar+comida pesada; alcohol = PI 63.4 (Δ−13.8), subordinado a inteligencia US / Sub-avatar C. Reemplazar el rótulo cualitativo "rank #10" por el PI.
- **Fijar la convención de citación:** anclaje en `grounding.md` + semillas Fase 0 con formato `[plataforma·engagement]`; **no** se usan IDs de DOC 14 (fuera de este set); toda cadena causal no citable va como [HIPÓTESIS PERSUASIVA]; toda lectura como [INFERENCIA].
- **Corregir números menores heredados:** vientre plano 68.5→65.7; n bloating 1770→freq 1777; objeción-funciona 65.7→58.4; sabor 58.8→56.6.
- **Higiene documental (fuera del Spine, pero bloqueante):** eliminar las líneas 1-3 de DOC 20 (texto de ejecución del LLM en inglés) y normalizar el cierre de DOC 20 para no exponer la ruta completa de scratchpad. Añadir al checklist §10 la casilla: "ningún entregable contiene texto de proceso del LLM ni rutas temporales".
- **Nota de no-regresión estratégica:** ninguna de las 8 contradicciones invalida el veredicto central del Spine (mujer 40+ hinchada que "hace todo bien" · gancho hinchazón→hígado · des-culpabilización · gotas naturales · sin dieta). v3.1 **corrige números y refuerza jerarquía**, no cambia la gran idea. Los pilares (hígado graso y preferencia natural) son RAW-robustos y salen fortalecidos.

---
*RECONCILIATION PASS completado sobre 6 documentos. 8 contradicciones detectadas (5 de la lista conocida + 3 adicionales). 0 invalidan la estrategia; 6 requieren corrección de números en el Spine; 1 es higiene de DOC 20; 1 es convención de citación. Principio de resolución: v3.1 ponderado > v3 crudo cuando difieren.*
