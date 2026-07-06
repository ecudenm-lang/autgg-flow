# FASE 0 — Research Hígado + Intestino · Lanzamiento MX

> Producto: suplemento de salud hepática en gotas líquidas (basado en competidor **Purelia Complete Liver Support**).
> Mercado lanzamiento: **México (es)**. Inteligencia: **EE.UU. (en)**. Categoría: salud/suplementos, ampliado a **salud intestinal**.
> Este doc alimenta la Fase 1 (descubrir targets) y el scrape de Apify. Semillas + taxonomía + mapa de ángulos.

---

## 1. Producto (sustrato B0)
Gotas líquidas. Ingredientes: **L-Glutatión, NAC, Cardo Mariano (silimarina), Diente de León, Alcachofa, Betabel, Colina**. Claims del competidor: fin del bajón de las 2pm, desinflama/bloating, flujo biliar, baja enzimas hepáticas (ALT/AST), niebla mental, hígado graso, silimarina anti-fibrótica. Formato-ángulo: líquido = "hasta 98% absorción". Garantía 60 días.

## 2. Sofisticación de mercado (dato duro TrendTrack — ads activos)
| Mercado | Ads activos liver | Bloating | Stage Schwartz |
|---|---|---|---|
| **Inglés (US/UK)** | 1.446 | 2.552 (Wild Dose 8.8M reach, Nutrition Geeks 4.1M) | **4-5** (mecanismos únicos nombrados, identidad, des-culpabilización, advertorial largo) |
| **Español-España** | 109 | — | **2-3** (detox literal) con un pie en 4 (advertorial conspiración de Mariana Esteban ~500K reach, pero para INTESTINO) |
| **Español-México** | no indexado fiable | — | **presumiblemente 2-3 o menos — HIPÓTESIS a validar con el scrape, NO confirmado** |

**⚠️ Honestidad de dato:** MX no está indexado de forma fiable en TrendTrack. "MX virgen" es hipótesis de arbitraje, no hecho. La VoC escrapeada (Apify) lo confirma o lo tumba.

## 3. Tesis de arbitraje (la jugada)
Tomar mecanismos/marcos ya probados en inglés (Stage 4-5) y lanzarlos en MX (Stage 2-3). **Punto óptimo: Stage 3→4** — UN mecanismo simple y nombrado + UNA gran idea des-culpabilizadora. **Error a evitar: apilar todas las promesas de Purelia** (energía+bloating+biliar+enzimas+niebla+graso) en un mercado menos sofisticado → dilución y escepticismo "cura-todo".

**Recomendación de gancho único (elegir 1 para liderar):**
1. **Hinchazón → hígado** ("tu barriga hinchada no es tu intestino, es tu hígado que no drena bien la bilis"), o
2. **Bajón de las 2pm → hígado** (síntoma-gancho de reconocimiento instantáneo).

**Villano re-anclado a MX:** NO alcohol (eje EN/FR de Dawtox/Dr Ruth no traslada). Sí: **refresco/azúcar, tacos/frituras, carga glucémica, medicamentos OTC** → hígado graso metabólico (no alcohólico), que en México tiene alta prevalencia.

## 4. Vacíos de categoría (ángulos libres en español)
1. **Causa-raíz hepática del bloating** — nadie en español conecta hinchazón/digestión pesada → flujo biliar lento/hígado. Es el solapamiento exacto hígado+intestino del producto.
2. **"El bajón de las 2pm" como síntoma-gancho hepático** — sin dueño en español.
3. **Des-culpabilización** ("no es tu falta de disciplina, es tu hígado") — probado en EN (funnels Sarah/Healthy Life), ausente en español, potente en MX donde la culpa por peso/comida es alta.
4. **Mecanismo glutatión/bilis en metáfora simple nombrada** (estilo "conversion failure" pero en español) — nadie lo traduce a lenguaje sentible.
5. **Formato advertorial de mecanismo-conspiración portado a HÍGADO** — Mariana Esteban probó que funciona en español para intestino; hígado está libre.
6. **Segmento hombres / jóvenes** (cerveza+comida, "cruda"/energía) — desatendido en ambos idiomas.
7. **Prueba biomarcador (ALT/AST)** — "baja tus enzimas hepáticas" como prueba tangible, sin explotar en español.

## 5. Competidores mapeados (para B1)
**Hígado:** Purelia (base, apila demasiado) · Galmio (detox 5 días) · Dawtox FR (ángulo alcohol) · Nature's Finest DE/IT/ES (detox+peso, "abdomen plano = hígado limpio") · Happy Liver PL (regeneración).
**Intestino/bloating:** Wild Dose (historia personal, 8.8M) · Happy Mammoth (autoridad científica) · Nutrition Geeks (ACV, 4.1M) · Naturadika ES ("barriga hinchada") · Baïa ES (alivio rápido).
**Advertoriales (mecanismo oculto):** Stephanie Anderson / Healthy Life "Sarah" (hígado↔peso, des-culpabilización) · Dr Ruth White (alcohol+identidad sobria) · **Mariana Esteban ES** (conspiración anti-médico, intestino, ~500K — molde portable a hígado+MX).
**Benchmark oferta escalada:** FlavCity, ESN, RYZE, More Nutrition, Ledisa.

## 6. Semillas de lenguaje — ESPAÑOL MÉXICO (pool de lanzamiento)
**Dolor (verbatim):** "Traigo el hígado hecho pomada" · "Todo me cae pesado" · "Ando bien crudo, traigo el hígado maltratado" · "Me hincho como globo después de comer" · "Traigo la panza inflamada y dura, parezco embarazada" · "Se me hace bilis por cualquier coraje" · "Como poquito y ya me siento llena" · "El doctor me dijo que tengo grasa en el hígado" · "Salí con las transaminasas altas" · "Después de comer me da un sueño que no puedo ni con mi alma" · "Niebla mental horrible, ando bien atarantado" · "Amanezco hinchada aunque no cene" · "Vivo estreñida y con el vientre inflamado" · "La cruda me tumba".
**Deseo:** "Desintoxicar mi hígado de una vez por todas" · "Que me regrese la energía y ya no me dé el bajón" · "Desinflamar la panza y sentirme ligero" · "Bajar las enzimas sin tanta pastilla" · "Volver a tener la mente clara" · "Recuperar mi vientre plano y dejar de parecer embarazada" · "Volver a sentirme yo".

## 7. Semillas de lenguaje — INGLÉS US (pool inteligencia)
fatty liver/NAFLD/MASLD · elevated liver enzymes / ALT 68 AST 55 · "doctor said lose weight and come back in 6 months" · "bloated all the time, look 5 months pregnant by 2pm" · "2pm crash hits me like a truck" · brain fog · "food sits like a brick" · "cut out alcohol, still fatty liver" · TUDCA / bile salts · glutathione "master antioxidant" · "tried everything nothing works" · "feel poisoned/buildup". Mecanismos EN emergentes: TUDCA, berberine, castor oil packs, sublingual glutathione, gut-liver axis.

## 8. Taxonomía de temas (theme keys para clasificar confesiones)
**Dolores:** bloating_distension · afternoon_energy_crash · chronic_fatigue_tired · brain_fog · fatty_liver_nafld · high_liver_enzymes · heavy_slow_digestion · constipation_irregularity · gas_discomfort_pain · sluggish_bile_flow · toxin_overload_detox_need · weight_gain_stubborn · alcohol_liver_worry · skin_breakouts_dullness · nausea_bad_taste · clothes_dont_fit.
**Deseos:** all_day_energy · flat_stomach · feel_like_myself · light_comfortable · clean_healthy_liver · mental_clarity · confidence_body_back.
**Objeciones:** does_it_work · another_scam · price_too_expensive · drops_taste · safety_side_effects · prefer_pills_or_diet · tried_everything_before.
**Creencias:** self_blame_diet · self_blame_alcohol · its_just_age · liver_is_root_cause · natural_is_safer · absorption_liquid_better · doctor_dismissed_me.
**Identidad:** was_energetic_before · lost_confident_self · mom_who_cant_keep_up · health_conscious_person · ashamed_of_body_now.

## 9. Targets de scraping (Fase 1 → Apify)
**ES-MX:** Reddit r/mexico, r/Salud, r/nutricion, r/hipocondria · Grupos FB "Hígado Graso México", "Colitis Gastritis y Reflujo México", "Remedios Caseros Mexicanos", "Detox y Salud" · TikTok #higadograso #desintoxicarelhigado #higadoinflamado #panzahinchada #digestionpesada #cruda #saludmexico · IG #saludhepatica #limpiezadehigado #inflacionabdominal · **MercadoLibre MX**: "cardo mariano silimarina", "desintoxicante hígado gotas", "protector hepático", "glutatión NAC" · **Amazon MX**: "limpieza de hígado", "hígado graso suplemento" · YouTube MX naturistas (comentarios) · foro enfemenino.com.
**EN-US (inteligencia):** Reddit r/FattyLiverNAFLD, r/fattyliver, r/liver, r/NAFLD, r/guthealth, r/Bloating, r/SIBO, r/Supplements, r/tudca, r/leakygut · TikTok #liverdetox #fattyliver #livercleanse #guthealth #debloat #TUDCA · FB "Fatty Liver Disease Support Group", "NAFLD/MASLD Support" · **Amazon US ASINs:** B0F4HH894D (TUDCA 7-in-1), B0D75RHTJ8 (Clean Nutra Milk Thistle NAC Liquid), B0FL1BF2KX (Glutathione NAC 32-in-1), B0CSKCXKHT (Liver Support NAC), B0DVM7GKC2 (Liver Advanced+ TUDCA/NAD), B0CNSCNJB5 (Dose for Your Liver liquid) · Best Sellers nodes: Milk Thistle (hpc/3766301), Liver Extract (hpc/3773651).
**Marcas a monitorear:** Purelia, HepatoBurn, Dose Daily, NutraChamps, Micro Ingredients, Clean Nutraceuticals, 1MD LiverMD, Swisse, Totaria TUDCA, Carlyle beef liver.

---
*Generado por workflow fase0-hepato-gut-mx (4 agentes). El dato de sofisticación de MX es hipótesis a validar con el scrape VoC, no hecho confirmado.*
