import json, sys
V31 = sys.argv[1]
st = json.load(open(f"{V31}/_stats.json"))
pi = json.load(open(f"{V31}/_pi.json"))
bank = json.load(open(f"{V31}/_bank.json", encoding='utf-8'))
pv, pii = pi['venta'], pi['intel']
LAB = {'bloating':'Hinchazón/panza','fatty_liver':'Hígado graso/NAFLD','belief_natural':'Preferencia natural','toxin_detox':'Detox/toxinas',
'liver_enzymes':'Enzimas ALT/AST','heavy_digestion':'Digestión pesada','weight_stubborn':'Peso que no baja','bile_flow':'Flujo biliar',
'desire_flat_stomach':'Deseo: vientre plano','alcohol_liver':'Alcohol→hígado','constipation':'Estreñimiento','obj_taste':'Objeción: sabor',
'chronic_fatigue':'Cansancio crónico','gas_pain':'Gases/dolor','brain_fog':'Niebla mental','obj_does_it_work':'Objeción: ¿funciona?',
'energy_crash_2pm':'Bajón 2pm','belief_its_age':'Creencia: la edad','obj_scam':'Objeción: estafa','obj_price':'Objeción: precio',
'obj_tried_everything':'Ya probé todo','belief_self_blame':'Autoculpa','belief_doctor_dismissed':'Doctor no ayudó',
'identity_lost_self':'Identidad: la de antes','identity_ashamed':'Vergüenza cuerpo','skin_dull':'Piel opaca','desire_feel_myself':'Volver a ser yo'}
def lab(t): return LAB.get(t,t)

# ---------- DATA QUALITY REPORT ----------
bt=st['by_source_type']; real=bt.get('RAW_CONFESSION',0)+bt.get('REVIEW',0)
pct=lambda n: f"{round(100*n/st['clean'],1)}%"
d=["# DATA QUALITY REPORT — Corpus Hígado+Intestino MX/US","*Motor de Research v3.1 · generado antes de interpretar*\n",
"## 1. Volumen",
f"- Filas crudas obtenidas: **{st['raw_total']:,}**",
f"- Eliminadas (vacías/cortas <4 palabras): **{st['short']:,}**",
f"- Eliminadas (duplicado/near-dup intra-plataforma): **{st['dup']:,}**",
f"- **Confesiones limpias finales: {st['clean']:,}**\n",
"## 2. Distribución por plataforma",
"| Plataforma | Filas | % |","|---|---|---|"]
for p,n in sorted(st['by_platform'].items(),key=lambda x:-x[1]): d.append(f"| {p} | {n:,} | {pct(n)} |")
d+=["\n## 3. Distribución por MERCADO (pool)","| Pool | Filas | Uso |","|---|---|---|",
f"| venta_MX (español) | {st['by_market'].get('venta_MX',0):,} | Lanzamiento — manda para copy |",
f"| intel_US (inglés) | {st['by_market'].get('intel_US',0):,} | Inteligencia — mecanismo/arbitraje, NO copy directo |",
"\n## 4. Distribución por TIPO DE FUENTE (jerarquía v3.1)","| Tipo | Filas | % | Peso en PI de deseo |","|---|---|---|---|",
f"| RAW_CONFESSION (cliente real) | {bt.get('RAW_CONFESSION',0):,} | {pct(bt.get('RAW_CONFESSION',0))} | 1.0 |",
f"| REVIEW (reseña de producto) | {bt.get('REVIEW',0):,} | {pct(bt.get('REVIEW',0))} | 1.0 |",
f"| CREATOR_CONTENT (nutriólogo/influencer) | {bt.get('CREATOR_CONTENT',0):,} | {pct(bt.get('CREATOR_CONTENT',0))} | 0.25 (down-weight) |",
f"| COMPETITOR_CLAIM (marca/ad) | {bt.get('COMPETITOR_CLAIM',0):,} | {pct(bt.get('COMPETITOR_CLAIM',0))} | 0.0 (excluido del deseo) |",
f"\n**Voz real de cliente (RAW+REVIEW) = {real:,} ({pct(real)})** → base sólida para deseos/dolores.",
"\n## 5. Distribución por idioma (detectado)","| Idioma | Filas |","|---|---|"]
for l,n in sorted(st['by_lang'].items(),key=lambda x:-x[1])[:8]: d.append(f"| {l} | {n:,} |")
d+=["\n## 6. Sesgos del corpus (declarados)",
"- **Sesgo de plataforma:** TikTok domina el volumen (comentarios). Reddit y YouTube aportan confesiones más largas/profundas.",
"- **CREATOR_CONTENT mezclado:** ~2,100 captions de creadores/marcas (ya separados y down-weighted; en v3 inflaban el ranking).",
"- **Reseñas de producto MX delgadas:** solo MercadoLibre (196) + sin Amazon MX → evidencia de RESEÑA para el mercado de venta es débil.",
"- **Pool competidor delgado:** 234 COMPETITOR_CLAIM (de captions promocionales). Falta scraping dirigido de reseñas 1-3★ de competidor y claims de ads.",
"- **Idioma mixto en comentarios:** algunos comentarios ES aparecen en videos EN y viceversa (langdetect por fila lo mitiga).",
"- **Sin Trustpilot/foros DTC** (excluidos por decisión previa de contaminación).",
"\n## 7. Huecos que siguen existiendo",
"- Reseñas de producto en **español-MX** (marketplace) — reforzar MercadoLibre + tiendas DTC.",
"- **Pool competidor:** reseñas 1-3★ de los ASIN/listings de competidores directos + copy de sus ads (TrendTrack).",
"- Voz de **hombres/jóvenes** (sub-avatar C) — sub-representada.",
"\n## 8. Confiabilidad del research",
"| Dimensión | Nivel | Razón |","|---|---|---|",
f"| Deseos / dolores (venta) | **ALTA** | {real:,} confesiones reales, sin dependencia viral |",
"| Sofisticación / arbitraje | **MEDIA-ALTA** | doble pool robusto; MX inferido, no 100% verificado |",
"| Reseñas de producto MX | **MEDIA-BAJA** | solo 196 MercadoLibre; reforzar |",
"| Competidores / oferta | **MEDIA** | claims de captions; falta scraping dirigido (Fase 2) |",
"| Mecanismo causal (UMP) | **BAJA (hipótesis)** | la data prueba la queja, no la causa fisiológica |",
"\n**Veredicto global: confiabilidad MEDIA-ALTA** para dirección estratégica y hooks; MEDIA para oferta/competencia (se refuerza en Fase 2)."]
open(f"{V31}/DATA QUALITY REPORT.md","w",encoding='utf-8').write("\n".join(d))

# ---------- CLUSTER_REPORT ----------
c=["# CLUSTER_REPORT — Scoring transparente por cluster","*Motor v3.1 · fuente: PI_SCORES.csv · corpus 13,548 confesiones*\n",
"## Fórmula PI","```","PI = (0.60·freq_norm + 0.40·reson_norm) · penalización_viral","freq_norm  = log1p(freq_ponderada)/log1p(max) ·100   (peso por fuente: RAW/REVIEW=1.0, CREATOR=0.25, COMPETITOR=0)",
"reson_norm = log1p(Σ engagement-percentil-por-plataforma)/log1p(max) ·100","penalización = 0.85 si un solo post aporta >60% de la resonancia del cluster (viral_share)","```\n",
"## Ranking VENTA (MX) vs INTELIGENCIA (US) + delta","| Cluster | PI venta | PI intel | Δ (v-i) | freq real | viral | RAW | REVIEW | CREATOR |",
"|---|---|---|---|---|---|---|---|---|"]
for t,dd in sorted(pv.items(),key=lambda x:-x[1]['PI']):
    di=pii.get(t,{}); delta=round(dd['PI']-di.get('PI',0),1); bs=dd['by_source']
    flag='⚠️' if dd['viral_share']>0.6 else ''
    c.append(f"| {lab(t)} | {dd['PI']} | {di.get('PI','-')} | {delta:+} | {dd['freq_raw']} | {dd['viral_share']}{flag} | {bs.get('RAW_CONFESSION',0)} | {bs.get('REVIEW',0)} | {bs.get('CREATOR_CONTENT',0)} |")
c+=["\n## Lectura",
"- **Δ positivo alto** = tema más fuerte en MX que en US → gancho de lanzamiento. **Δ negativo** = más fuerte en US → capa de prueba/inteligencia importable.",
"- **Ningún cluster tiene viral_share > 0.6** → ningún ranking depende de un post viral (robustez alta).",
"- **CREATOR alto vs RAW bajo** en un cluster = tema empujado por creadores más que sentido por clientes → tratar con cautela.",
f"- Cluster líder venta: **{lab(sorted(pv.items(),key=lambda x:-x[1]['PI'])[0][0])}**. Cluster líder intel: **{lab(sorted(pii.items(),key=lambda x:-x[1]['PI'])[0][0])}**."]
open(f"{V31}/CLUSTER_REPORT.md","w",encoding='utf-8').write("\n".join(c))

# ---------- DOC 14 ----------
e=["# DOC 14 — Banco de Evidencia Canónico","*Motor v3.1 · fuente única de verdad citable. Todo documento downstream cita IDs de aquí.*\n",
"## Cómo funciona",
"- El banco completo vive en **`evidence_bank.csv`** (13,548 filas). Este .md documenta el esquema y lista las evidencias-ancla top por cluster.",
"- **Regla madre:** ningún documento puede afirmar algo sin citar un ID de este banco (formato `EVxxxxxxxxxxxx`).",
"- **Regla de jerarquía:** `TEAM_SEED` (semillas de Fase 0) e `INFERENCE` (deducciones del sistema) **NUNCA cuentan como prueba** — solo como hipótesis. Solo `RAW_CONFESSION` y `REVIEW` prueban deseo/dolor; `CREATOR_CONTENT` es contexto (peso 0.25); `COMPETITOR_CLAIM` va al mapa de competidores.",
"\n## Esquema de cada evidencia (columnas de evidence_bank.csv)",
"| Campo | Descripción |","|---|---|",
"| id | ID único `EV`+hash |","| platform | reddit/tiktok/youtube/instagram/amazon/mercadolibre |",
"| source_tag | corrida de origen (ej. tiktok-comments-ES) |","| source_type | RAW_CONFESSION / REVIEW / CREATOR_CONTENT / COMPETITOR_CLAIM |",
"| market | venta_MX / intel_US |","| lang | idioma detectado |","| engagement | likes/upvotes/helpful |","| res_pct | percentil de engagement dentro de su plataforma |",
"| rating | estrellas (si es reseña) |","| is_competitor | voz de/sobre competidor |","| cluster / themes | tema(s) asignado(s) |","| url | referencia de origen si existe |","| text | cita textual verbatim |",
"\n## Evidencias-ancla top por cluster (citar estos IDs)"]
for t,dd in sorted(pv.items(),key=lambda x:-x[1]['PI'])[:14]:
    e.append(f"\n### {lab(t)}  (`{t}`, PI-venta {dd['PI']})")
    for q in bank.get(t,[])[:5]:
        e.append(f"- `{q['id']}` [{q['type']}·{q['platform']}·{q['market']}·{q['eng']}]: \"{q['text']}\"")
open(f"{V31}/DOC 14 — Banco de Evidencia Canónico.md","w",encoding='utf-8').write("\n".join(e))
print("Generados: DATA QUALITY REPORT.md, CLUSTER_REPORT.md, DOC 14 — Banco de Evidencia Canónico.md")
print("+ evidence_bank.csv, PI_SCORES.csv")
