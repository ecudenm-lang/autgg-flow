# HANDOFF — Motor de Research DTC + Proyecto Hígado MX

> Documento de traspaso. Explica qué es este repo, qué se construyó, dónde está cada cosa y cómo continuar.
> Última actualización: 2026-07-05.

---

## 1. Qué es este repositorio

Dos cosas conviven aquí:

1. **El MOTOR DE RESEARCH** — una máquina repetible y auditable para investigación pre-lanzamiento de productos DTC (ads Meta/TikTok, metodología Eugene Schwartz). Va de "¿qué desea el mercado?" hasta hooks listos para pauta, con evidencia trazable.
2. **El primer producto ejecutado con el motor** — un suplemento de salud hepática (base competidor **Purelia**) para lanzar en **México**, ampliado a salud intestinal.

El motor nació fusionando dos sistemas previos del negocio (**Desire-To-Scale 2.0** y **Evolve/EAM**) + un **Playbook VoC** con scraping real, y se refinó a **v3.1** (auditable, con jerarquía de fuentes y validadores).

---

## 2. Estado actual (qué está hecho)

| Bloque | Estado |
|---|---|
| Motor v3 (spec conceptual) | ✅ `MOTOR DE RESEARCH v3 — Spec Operativo.md` |
| Motor **v3.1** (refinado, auditable) | ✅ carpeta `v3.1/` (10 entregables) |
| Research del producto hígado MX | ✅ DOC 00, 15, 16, 19, 20, 21 + FASE 0 |
| Corpus real escrapeado | ✅ 13,548 confesiones (`v3.1/evidence_bank.csv`) |
| Banco de hooks de producción | ✅ DOC 21 (36 hooks) |
| Consolidado ejecutivo | ✅ `CONSOLIDADO — Research Hígado MX.xlsx` (7 pestañas) |
| Todo en Word | ✅ `.docx` de cada `.md` |
| Validación v3.1 | ✅ **APROBADO** (0 residuales, 0 IDs colgantes) |

---

## 3. Estructura del repositorio

```
DOCUMENTOS DE INVESTIGACIÓN/
├── HANDOFF.md                         ← este documento
├── README.md                          ← índice del repo
├── MOTOR DE RESEARCH v3 — Spec Operativo.md
│
├── FASE 0 — Higado+Intestino MX (Purelia).md   ← competencia, vacíos, seeds
├── DOC 00 — Master Spine (Veredicto Estratégico).md
├── DOC 15 — Retrato del Cliente (Avatar Core 5 + Sub-avatares).md
├── DOC 16 — Banco de Lenguaje, Hooks e Identidad Reclamada.md
├── DOC 19 — UMP-UMS-USP Mecanismos Únicos.md
├── DOC 20 — Mapa de Dolores + Buyer Psychology.md
├── DOC 21 — Banco de Hooks para Producción.md
├── CONSOLIDADO — Research Hígado MX.xlsx        ← resumen ejecutivo con tier lists
├── (cada .md tiene su .docx equivalente en Word)
│
├── scripts/                           ← el motor ejecutable (repetible)
│   ├── v31_foundation.py    (ingesta + jerarquía de fuentes + PI transparente)
│   ├── v31_docs.py          (genera DATA QUALITY / CLUSTER_REPORT / DOC 14)
│   ├── validate_v31.py      (validadores automáticos → VALIDATION REPORT)
│   ├── md2docx.py           (convierte los .md a Word)
│   └── build_xlsx.py        (arma el consolidado en Excel)
│
├── 1)..7) *.docx / .txt               ← material fuente original (los prompts de Evolve/EAM)
│
└── v3.1/                              ← LA VERSIÓN AUDITABLE DEL MOTOR (10 entregables)
    ├── MOTOR DE RESEARCH v3.1 — Spec Operativo.md   (el motor generalizado)
    ├── README — Cómo ejecutar este motor en otro producto.md
    ├── DATA QUALITY REPORT.md
    ├── DOC 14 — Banco de Evidencia Canónico.md
    ├── evidence_bank.csv            (13,548 confesiones con IDs EVxxxx)
    ├── PI_SCORES.csv                (scoring transparente por cluster)
    ├── CLUSTER_REPORT.md
    ├── COMPETITOR_MAP.md            (7 tipos de competidor + huecos)
    ├── RECONCILIATION PASS.md       (8 contradicciones resueltas)
    ├── DOC 00 — Master Spine actualizado.md   (veredicto v3.1, escrito al final)
    └── VALIDATION REPORT.md         (APROBADO)
```

---

## 4. El veredicto estratégico (producto hígado MX)

- **Avatar:** mujer mexicana 40+ que "hace todo bien" y aún así vive hinchada.
- **Gancho de copy:** la **HINCHAZÓN/panza** (síntoma visible, emoción de alivio).
- **Causa-raíz (mecanismo):** **"EL HÍGADO TAPADO"** (bilis estancada) → tema #1 por PI.
- **Producto = el destape:** UMS "Destape hepático en 3 llaves" (diente de león/colina/glutatión-NAC).
- **USP:** *"Panza plana desde el hígado, no desde la dieta."*
- **Villano:** frituras + azúcar + comida pesada (NO alcohol, bajo en MX).
- **Prueba:** enzimas ALT/AST (capa de credibilidad, no gancho).
- **Arbitraje:** el DR de hígado/intestino está dominado por marcas EN/EU; el ES-MX está casi vacío.
- **Gate de honestidad:** la cadena causal hinchazón→hígado es **hipótesis persuasiva de venta**, no hecho clínico.

---

## 5. Integraciones (IMPORTANTE — secretos FUERA del repo)

- **Apify** (scraping VoC) y **TrendTrack** (competidores/ads) se usan vía API.
- **Los tokens viven en `C:\Users\Thomas\research_secrets.env` — FUERA de este repo, nunca commiteados.** Variables: `APIFY_TOKEN`, `TRENDTRACK_TOKEN`.
- Plan Apify: **Scale** ($199/mes, tier SILVER). Gasto del research: ~$24.
- Actores Apify canónicos y precios: ver `v3.1/README`.

---

## 6. Cómo continuar (próximos pasos)

1. **Cerrar la única deuda documentada:** migrar las citas de los docs interpretativos v3 (`[plataforma·engagement]`) a los **EV-IDs** de `evidence_bank.csv` (mecánico; los IDs ya existen). El `VALIDATION REPORT` lo marca.
2. **Capa de producción:** convertir los 36 hooks del DOC 21 en advertoriales/scripts completos (molde "descubrimiento 2am" o RMBC / UMP-UMS).
3. **Probar repetibilidad:** correr el motor v3.1 sobre un **segundo producto** siguiendo `v3.1/README`.
4. **Ronda 2 de data (opcional):** reforzar reseñas de producto MX (MercadoLibre/Amazon MX) y reseñas 1-3★ de competidor — el pool más débil (ver `DATA QUALITY REPORT`).
5. **Compliance:** quedó fuera de alcance a propósito; desarrollarla antes de escalar pauta pagada.

---

## 7. Cómo se ejecuta el motor (resumen técnico)

```
Fase 0  Seeds + competencia (TrendTrack)         → FASE 0.md
Fase 1  Scraping por pools (Apify)               → raw/  (temp, no en repo)
Fase 1b python scripts/v31_foundation.py         → evidence_bank.csv + PI_SCORES.csv
Fase 1c python scripts/v31_docs.py               → DATA QUALITY / CLUSTER_REPORT / DOC 14
Fase 2  Síntesis (agentes)                       → avatar/psych/UMP/hooks/competitor_map
Fase 3  RECONCILIATION PASS → Spine al final
Fase 4  python scripts/validate_v31.py           → VALIDATION REPORT
```
Detalle completo y generalizado en `v3.1/MOTOR DE RESEARCH v3.1 — Spec Operativo.md` y `v3.1/README`.

---
*Handoff generado tras el refinamiento v3.1. El corpus crudo (raw/) y los tokens NO están en el repo por diseño.*
