# DOC 14 — Banco de Evidencia Canónico
*Motor v3.1 · fuente única de verdad citable. Todo documento downstream cita IDs de aquí.*

## Cómo funciona
- El banco completo vive en **`evidence_bank.csv`** (13,548 filas). Este .md documenta el esquema y lista las evidencias-ancla top por cluster.
- **Regla madre:** ningún documento puede afirmar algo sin citar un ID de este banco (formato `EVxxxxxxxxxxxx`).
- **Regla de jerarquía:** `TEAM_SEED` (semillas de Fase 0) e `INFERENCE` (deducciones del sistema) **NUNCA cuentan como prueba** — solo como hipótesis. Solo `RAW_CONFESSION` y `REVIEW` prueban deseo/dolor; `CREATOR_CONTENT` es contexto (peso 0.25); `COMPETITOR_CLAIM` va al mapa de competidores.

## Esquema de cada evidencia (columnas de evidence_bank.csv)
| Campo | Descripción |
|---|---|
| id | ID único `EV`+hash |
| platform | reddit/tiktok/youtube/instagram/amazon/mercadolibre |
| source_tag | corrida de origen (ej. tiktok-comments-ES) |
| source_type | RAW_CONFESSION / REVIEW / CREATOR_CONTENT / COMPETITOR_CLAIM |
| market | venta_MX / intel_US |
| lang | idioma detectado |
| engagement | likes/upvotes/helpful |
| res_pct | percentil de engagement dentro de su plataforma |
| rating | estrellas (si es reseña) |
| is_competitor | voz de/sobre competidor |
| cluster / themes | tema(s) asignado(s) |
| url | referencia de origen si existe |
| text | cita textual verbatim |

## Evidencias-ancla top por cluster (citar estos IDs)

### Hígado graso/NAFLD  (`fatty_liver`, PI-venta 99.1)
- `EV103445ddfd2a` [RAW_CONFESSION·youtube·venta_MX·16835]: "Como LIMPIAR EL HÍGADO naturalmente (HÍGADO GRASO). En mi experiencia personal, tuve este problema y luego me salieron cálculos en vesícula. El medico me recomendó que me sometiera a una cirugía para extirpar la vesícula"
- `EV891d8564f747` [REVIEW·amazon·intel_US·84]: "Reduced ALT/AST fatty liver levels. After one month, ALT levels went from 112 to 52 (<31), AST went from 77 to 44 (<41). & slowly losing weight & sleeping through night or 6 hours before waking up. On my second bottle & "
- `EVa3b9c0680bb1` [RAW_CONFESSION·youtube·venta_MX·12335]: "Como LIMPIAR EL HÍGADO naturalmente (HÍGADO GRASO). Hubo que subirlo de nuevo por un problema técnico en la grabación, disculpen la baja calidad. En breve filmo la nueva versión del video de limpieza hepática profunda co"
- `EV20ee996cc059` [RAW_CONFESSION·youtube·venta_MX·10662]: "Limpia tu Hígado Graso en 1 MES con Este Alimento Poderoso. Buen dia ayer estuve muy triste mi hija  tiene higado graso tiene 25 años llore  y llore dije ahora  que are dios mio y me dormi  hoy  y levante el celular y en"
- `EV4b2597d674fc` [RAW_CONFESSION·youtube·venta_MX·10462]: "Limpia tu Hígado Graso en 1 MES con Este Alimento Poderoso. Hagamos viral a este doctor para que se quede como patrimonio de la humanidad, es oro puro su contenido!"

### Hinchazón/panza  (`bloating`, PI-venta 97.9)
- `EVd6a1a1a6bb01` [REVIEW·mercadolibre·venta_MX·30]: "Me ha hecho mucho bien a mi hígado, se me quitó el dolor de vesícula biliar por completo, y me ayuda con la inflamación abdominal y la digestion."
- `EV7f55aa38d7fb` [REVIEW·amazon·intel_US·38]: "Try it you won’t regret it. This product is awesome, I really didn’t think it would work so fast!!! The first time it worked I felt the difference instantly. My stomach got softer and started to go down from bad bloating"
- `EV95866ec015b5` [RAW_CONFESSION·tiktok·venta_MX·18900]: "i fear bloating this bad isnt normal"
- `EV9937651191c6` [RAW_CONFESSION·tiktok·venta_MX·12910]: "Pov: te das cuenta que no son gases sino grasa jajaa😅"
- `EV9e5bfa9edeaa` [RAW_CONFESSION·tiktok·venta_MX·7664]: "Asi me dijo una ves señora que si estaba embarazada y yo con mi colitis nerviosa😔"

### Preferencia natural  (`belief_natural`, PI-venta 92.4)
- `EV103445ddfd2a` [RAW_CONFESSION·youtube·venta_MX·16835]: "Como LIMPIAR EL HÍGADO naturalmente (HÍGADO GRASO). En mi experiencia personal, tuve este problema y luego me salieron cálculos en vesícula. El medico me recomendó que me sometiera a una cirugía para extirpar la vesícula"
- `EVa3b9c0680bb1` [RAW_CONFESSION·youtube·venta_MX·12335]: "Como LIMPIAR EL HÍGADO naturalmente (HÍGADO GRASO). Hubo que subirlo de nuevo por un problema técnico en la grabación, disculpen la baja calidad. En breve filmo la nueva versión del video de limpieza hepática profunda co"
- `EVab02c7d16909` [RAW_CONFESSION·youtube·venta_MX·8835]: "Como LIMPIAR EL HÍGADO naturalmente (HÍGADO GRASO). Dios se acordó de nosotros al ponerlo a usted en este canal...gracias doctor"
- `EV506d78c9d0dd` [RAW_CONFESSION·youtube·venta_MX·8788]: "Limpia tu Hígado Graso en 1 MES con Este Alimento Poderoso. Y tenga una alimemtación natural. No tome azúcar, no coma harinas , tome extracto de beterraga, manzana y zanahoria. Tome jugo de guanabana y muela  3 de sus se"
- `EVcfcdda603c97` [RAW_CONFESSION·youtube·venta_MX·8775]: "Limpia tu Hígado Graso en 1 MES con Este Alimento Poderoso. Busca el tratamiento natural.  No aceptes quimioterapia ni radioterapia. Una desparasitación es lo primero"

### Detox/toxinas  (`toxin_detox`, PI-venta 91.0)
- `EV103445ddfd2a` [RAW_CONFESSION·youtube·venta_MX·16835]: "Como LIMPIAR EL HÍGADO naturalmente (HÍGADO GRASO). En mi experiencia personal, tuve este problema y luego me salieron cálculos en vesícula. El medico me recomendó que me sometiera a una cirugía para extirpar la vesícula"
- `EVa3b9c0680bb1` [RAW_CONFESSION·youtube·venta_MX·12335]: "Como LIMPIAR EL HÍGADO naturalmente (HÍGADO GRASO). Hubo que subirlo de nuevo por un problema técnico en la grabación, disculpen la baja calidad. En breve filmo la nueva versión del video de limpieza hepática profunda co"
- `EV351852a281e9` [RAW_CONFESSION·youtube·intel_US·10792]: "How To CLEAN Your LIVER in 3 Days!. Best liver cleanse in history:
1. Keto
2. Lifting weights
3. Lowering body fat
4. Good sleep
5. 2500 calories or less
6. Drinking lots of water aka water fasting too
7. Dry fasting too"
- `EV23ec746f6d9a` [RAW_CONFESSION·youtube·venta_MX·9312]: "¡IMPACTANTE! Quita toda la GRASA del HÍGADO RÁPIDAMENTE. Hace un año me diagnosticaron higado graso en un grado preocupante. Reduje hidratos y azúcares, hago bici estática en días alternos y tomo infusiones detox, boldo."
- `EVab02c7d16909` [RAW_CONFESSION·youtube·venta_MX·8835]: "Como LIMPIAR EL HÍGADO naturalmente (HÍGADO GRASO). Dios se acordó de nosotros al ponerlo a usted en este canal...gracias doctor"

### Enzimas ALT/AST  (`liver_enzymes`, PI-venta 85.0)
- `EV891d8564f747` [REVIEW·amazon·intel_US·84]: "Reduced ALT/AST fatty liver levels. After one month, ALT levels went from 112 to 52 (<31), AST went from 77 to 44 (<41). & slowly losing weight & sleeping through night or 6 hours before waking up. On my second bottle & "
- `EVde5cf864ee63` [RAW_CONFESSION·youtube·intel_US·12392]: "How To CLEAN Your LIVER in 3 Days!. This man has transformed my life for the better. 8 months ago was an alcoholic, sedentary and overweight. After following his advise to the letter; intermittent fasting, exercising, ad"
- `EV351852a281e9` [RAW_CONFESSION·youtube·intel_US·10792]: "How To CLEAN Your LIVER in 3 Days!. Best liver cleanse in history:
1. Keto
2. Lifting weights
3. Lowering body fat
4. Good sleep
5. 2500 calories or less
6. Drinking lots of water aka water fasting too
7. Dry fasting too"
- `EV480786d31827` [REVIEW·amazon·intel_US·79]: "Black pepper???. I’m going to give it five stars for the beautiful bottles that came in and beautifully packaged really good quality and it taste very good. My question is though should this product contain black pepper "
- `EV20dccf8b1975` [RAW_CONFESSION·youtube·venta_MX·9343]: "Limpia tu Hígado Graso en 1 MES con Este Alimento Poderoso. Soy Luz Anita Paredes Salazar y me detectaron hígado graso, también cálculos en la vesícula,en mi desesperación mi madre me dió agua de hoja de tomatillo y lo t"

### Digestión pesada  (`heavy_digestion`, PI-venta 82.4)
- `EVd6a1a1a6bb01` [REVIEW·mercadolibre·venta_MX·30]: "Me ha hecho mucho bien a mi hígado, se me quitó el dolor de vesícula biliar por completo, y me ayuda con la inflamación abdominal y la digestion."
- `EVbff4a8779dfc` [RAW_CONFESSION·youtube·venta_MX·8774]: "Limpia tu Hígado Graso en 1 MES con Este Alimento Poderoso. ​ @juanayaipen3131 hola , yo te lo garantizo que lo que el doctor dice es cierto, en lo personal consumo el vinagre y me funciona,  con decirle que hasta mejora"
- `EV1c16b69396cf` [REVIEW·amazon·intel_US·26]: "Excellent supplement for liver support.. I started taking TUDCA after reading about its benefits for liver and digestive support, and I can honestly say I’ve noticed a difference. My digestion feels smoother, and I don’t"
- `EV3c5b45968dbf` [REVIEW·mercadolibre·venta_MX·3]: "Es un producto q es confiable tiene buen sabor. Me gusta y lo mejor me ayuda con mi digestión yo lo súper recomiendo me a ayudado hasta con el peso porque está desintoxicando mi hígado. Lo he comprado dos veces y en este"
- `EV454583110443` [RAW_CONFESSION·tiktok·intel_US·2688]: "💚 I used to drink green juice every morning and still felt bloated by noon. Someone recommended Eat Like a Woman Protocol and it helped me understand how to actually support digestion—not just mask symptoms. My gut feels"

### Peso que no baja  (`weight_stubborn`, PI-venta 78.4)
- `EV891d8564f747` [REVIEW·amazon·intel_US·84]: "Reduced ALT/AST fatty liver levels. After one month, ALT levels went from 112 to 52 (<31), AST went from 77 to 44 (<41). & slowly losing weight & sleeping through night or 6 hours before waking up. On my second bottle & "
- `EVde5cf864ee63` [RAW_CONFESSION·youtube·intel_US·12392]: "How To CLEAN Your LIVER in 3 Days!. This man has transformed my life for the better. 8 months ago was an alcoholic, sedentary and overweight. After following his advise to the letter; intermittent fasting, exercising, ad"
- `EV351852a281e9` [RAW_CONFESSION·youtube·intel_US·10792]: "How To CLEAN Your LIVER in 3 Days!. Best liver cleanse in history:
1. Keto
2. Lifting weights
3. Lowering body fat
4. Good sleep
5. 2500 calories or less
6. Drinking lots of water aka water fasting too
7. Dry fasting too"
- `EV54ec0294eec2` [RAW_CONFESSION·youtube·venta_MX·8772]: "Limpia tu Hígado Graso en 1 MES con Este Alimento Poderoso. A medio vaso de agua agregarle una cucharadita de vinagre de manzana, revolver todo bien, acabando de comer ahi mismo tomarse el medio vasito de agua con vinagr"
- `EV4abdbe31e6e8` [RAW_CONFESSION·youtube·venta_MX·8735]: "Como LIMPIAR EL HÍGADO naturalmente (HÍGADO GRASO). Hace 6 meses vi este video y me cambio la vida, sirvió para tomar conciencia, empecé con dieta ejercicio y baje 10 kilos desde entonces, me cambio la vida, hoy me sient"

### Flujo biliar  (`bile_flow`, PI-venta 68.2)
- `EV103445ddfd2a` [RAW_CONFESSION·youtube·venta_MX·16835]: "Como LIMPIAR EL HÍGADO naturalmente (HÍGADO GRASO). En mi experiencia personal, tuve este problema y luego me salieron cálculos en vesícula. El medico me recomendó que me sometiera a una cirugía para extirpar la vesícula"
- `EVd6a1a1a6bb01` [REVIEW·mercadolibre·venta_MX·30]: "Me ha hecho mucho bien a mi hígado, se me quitó el dolor de vesícula biliar por completo, y me ayuda con la inflamación abdominal y la digestion."
- `EV20dccf8b1975` [RAW_CONFESSION·youtube·venta_MX·9343]: "Limpia tu Hígado Graso en 1 MES con Este Alimento Poderoso. Soy Luz Anita Paredes Salazar y me detectaron hígado graso, también cálculos en la vesícula,en mi desesperación mi madre me dió agua de hoja de tomatillo y lo t"
- `EV32d87d9b99ae` [REVIEW·amazon·intel_US·18]: "Excellent TUDCA Formula But Proprietary Blend is Frustrating. This is a really solid TUDCA supplement that I use primarily for liver and kidney health support, though it seems to be targeted more toward kidney function b"
- `EV14f783ece02a` [RAW_CONFESSION·youtube·venta_MX·8735]: "Como LIMPIAR EL HÍGADO naturalmente (HÍGADO GRASO). 2:12 síntomas de alteración por funcionamiento hepatico
2:46 enfermedades
3:15 causas (fructosa)
4:18 funciones del hígado
5:09 el aumento de estrógeno y su riesgo por "

### Deseo: vientre plano  (`desire_flat_stomach`, PI-venta 65.7)
- `EVa484aab2fa6a` [RAW_CONFESSION·tiktok·intel_US·358]: "Chris Titus debloat for the win 🏆"
- `EV1a1730705d96` [RAW_CONFESSION·tiktok·venta_MX·270]: "Denle clic en cómo desinflamar el intestino, en su misma cuenta tiene el protocolo con recomendaciones. Si sirve o no, habrá que probarlo."
- `EVb84a1535ebc6` [RAW_CONFESSION·tiktok·intel_US·94]: "career IT guy here: the Titus debloating script is pretty well known and safe. generally don't follow tiktok pc advice but this one's 👌"
- `EV592d0d8c2995` [RAW_CONFESSION·tiktok·venta_MX·93]: "pero para desinflamar, primero hay que quitar los alimentos agresores 🤔🤔 el intestino no sé desinflama por arte de magia. OJO NO SOY MÉDICO Pero creo que es algo de lógica"
- `EV336372895af6` [RAW_CONFESSION·tiktok·intel_US·87]: "CTT is one of the best debloaters, 100% approved!"

### Alcohol→hígado  (`alcohol_liver`, PI-venta 63.4)
- `EVde5cf864ee63` [RAW_CONFESSION·youtube·intel_US·12392]: "How To CLEAN Your LIVER in 3 Days!. This man has transformed my life for the better. 8 months ago was an alcoholic, sedentary and overweight. After following his advise to the letter; intermittent fasting, exercising, ad"
- `EV351852a281e9` [RAW_CONFESSION·youtube·intel_US·10792]: "How To CLEAN Your LIVER in 3 Days!. Best liver cleanse in history:
1. Keto
2. Lifting weights
3. Lowering body fat
4. Good sleep
5. 2500 calories or less
6. Drinking lots of water aka water fasting too
7. Dry fasting too"
- `EV14f783ece02a` [RAW_CONFESSION·youtube·venta_MX·8735]: "Como LIMPIAR EL HÍGADO naturalmente (HÍGADO GRASO). 2:12 síntomas de alteración por funcionamiento hepatico
2:46 enfermedades
3:15 causas (fructosa)
4:18 funciones del hígado
5:09 el aumento de estrógeno y su riesgo por "
- `EV9c40a40ed4f8` [RAW_CONFESSION·youtube·intel_US·8141]: "How To CLEAN Your LIVER in 3 Days!. After 15 years of alcoholism, my brother had lost hope—he was depressed, in pain from psoriasis, and struggling. After speaking with Dr. Berg and following intermittent fasting, runnin"
- `EV1e15e671c443` [RAW_CONFESSION·youtube·venta_MX·8112]: "¡IMPACTANTE! Quita toda la GRASA del HÍGADO RÁPIDAMENTE. Bebidas:
Beber cafe sin azúcar max 3 t/día
Beber té verde 1/día
Beber té negro 1/día
Beber agua 30ml x kilo de peso/día
Grasas:
Consumir Omega 3(ace oliva)1ch/dia
"

### Estreñimiento  (`constipation`, PI-venta 61.7)
- `EV66139f606d64` [RAW_CONFESSION·tiktok·venta_MX·1065]: "[Sticker] Yo estreñida 1 semana"
- `EV2b6509957f93` [RAW_CONFESSION·tiktok·intel_US·313]: "Chia seeds constipates meee 😭"
- `EVa5ac155ce1a5` [RAW_CONFESSION·tiktok·venta_MX·302]: "que buena representación del estreñimiento😂😂😂😂"
- `EV579f72e31d7d` [RAW_CONFESSION·tiktok·intel_US·237]: "this also helps constipation 😊"
- `EV599e129f058f` [RAW_CONFESSION·tiktok·intel_US·224]: "what if you're constipated idk 😭"

### Objeción: ¿funciona?  (`obj_does_it_work`, PI-venta 58.4)
- `EVbff4a8779dfc` [RAW_CONFESSION·youtube·venta_MX·8774]: "Limpia tu Hígado Graso en 1 MES con Este Alimento Poderoso. ​ @juanayaipen3131 hola , yo te lo garantizo que lo que el doctor dice es cierto, en lo personal consumo el vinagre y me funciona,  con decirle que hasta mejora"
- `EVef9a53545e93` [REVIEW·mercadolibre·venta_MX·5]: "Un poco caro pero funciona muy bien y si como comentaron ,si baja los triglicéridos 👌."
- `EVd60daea9d838` [RAW_CONFESSION·tiktok·intel_US·7126]: "Bro why does it work so well"
- `EVc925e91e1e52` [REVIEW·amazon·intel_US·19]: "Liver detox, cleanse and repair. Received on time, great product it really work well, lab test results were a big surprise after starting taking this capsules no more liver problems, I’m happy and satisfied with this pro"
- `EV33fb009341a9` [REVIEW·mercadolibre·venta_MX·3]: "Realmente es funcional, desde mi testimonio confirmo que ayudo mucho a la pronta recuperación del higado graso , gracias a estarlo tomando como se indica , desparecieron todos los síntomas asociados a este padecimiento, "

### Objeción: sabor  (`obj_taste`, PI-venta 56.6)
- `EV480786d31827` [REVIEW·amazon·intel_US·79]: "Black pepper???. I’m going to give it five stars for the beautiful bottles that came in and beautifully packaged really good quality and it taste very good. My question is though should this product contain black pepper "
- `EV87840c09bb4a` [REVIEW·amazon·intel_US·40]: "Works. I need this and I'm going take it. I can handle bad tastes but this takes the cake! It's really nasty. Sulphur smell and rotten egg flavor with some berry momentarily, lol. I put half a dropper in my liter, flavor"
- `EV7cec96794daf` [REVIEW·amazon·intel_US·40]: "this worked for me. i believe in my heart and soul this worked. i had high levels in my liver and was told to comsult my Primary doctor. I brought this instead and after 3 months were levels wer normal again. No side eff"
- `EV1df14cce72d8` [REVIEW·mercadolibre·venta_MX·7]: "Lo tomo sin azúcar no sabe amargo yo me siento mucho mejor cuando me lo tomo y ya llevo un mes y no se ha acabado la bolsa muy buen producto."
- `EV0270ec705eaa` [REVIEW·amazon·intel_US·27]: "Just got it today. Just arrived this morning. I don't know if it works well yet obviously, however I've seen people complain about it smelling and tasting like rotten eggs and suffer, I just wanted to say to me it smells"

### Gases/dolor  (`gas_pain`, PI-venta 53.1)
- `EV8b5e0e32bf2f` [RAW_CONFESSION·tiktok·venta_MX·301]: "si duele tengo hígado graso y me duele"
- `EVaf6fc491307e` [RAW_CONFESSION·youtube·intel_US·7492]: "How To CLEAN Your LIVER in 3 Days!. How do I keep from getting bad headaches when I fast? Water does help much…"
- `EVdc7322cf6ee0` [RAW_CONFESSION·tiktok·venta_MX·142]: "Y si es cólico biliar y no tengo vesícula como lo quito?"
- `EV4816302cbc52` [RAW_CONFESSION·tiktok·venta_MX·125]: "y si me duele el lado izquierdo debajo de la costilla cuando me muevo???"
- `EVf6a0748714c4` [RAW_CONFESSION·tiktok·venta_MX·119]: "Me duele la cabeza sin azúcar"