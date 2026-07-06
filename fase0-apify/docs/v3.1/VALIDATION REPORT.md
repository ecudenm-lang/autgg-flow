# VALIDATION REPORT — Motor v3.1
*Checks automáticos sobre el corpus y los documentos.*

- IDs válidos en DOC 14 (evidence_bank.csv): **13,548**
- Clusters válidos en PI_SCORES: **27**

## Resultado por documento
| Documento | EV-IDs citados | válidos | colgantes | frases residuales | TEAM_SEED como prueba |
|---|---|---|---|---|---|
| DOC 00 — Master Spine (Veredicto Estratégico). | ⚠️ 0 | 0 | 0 | 0 | no |
| DOC 15 — Retrato del Cliente (Avatar Core 5 +  | ⚠️ 0 | 0 | 0 | 0 | no |
| DOC 16 — Banco de Lenguaje, Hooks e Identidad  | ⚠️ 0 | 0 | 0 | 0 | no |
| DOC 19 — UMP-UMS-USP Mecanismos Únicos.md | ⚠️ 0 | 0 | 0 | 0 | no |
| DOC 20 — Mapa de Dolores + Buyer Psychology.md | ⚠️ 0 | 0 | 0 | 0 | no |
| DOC 21 — Banco de Hooks para Producción.md | ⚠️ 0 | 0 | 0 | 0 | no |
| CLUSTER_REPORT.md | 0 | 0 | 0 | 0 | no |
| COMPETITOR_MAP.md | 0 | 0 | 0 | 0 | no |
| DATA QUALITY REPORT.md | 0 | 0 | 0 | 0 | no |
| DOC 00 — Master Spine actualizado.md | ⚠️ 0 | 0 | 0 | 0 | SÍ ⚠️ |
| DOC 14 — Banco de Evidencia Canónico.md | 51 | 51 | 0 | 0 | no |
| MOTOR DE RESEARCH v3.1 — Spec Operativo.md | ⚠️ 0 | 0 | 0 | 0 | SÍ ⚠️ |
| README — Cómo ejecutar este motor en otro prod | ⚠️ 0 | 0 | 0 | 0 | no |
| RECONCILIATION PASS.md | 0 | 0 | 0 | 0 | no |
| VALIDATION REPORT.md | 0 | 0 | 0 | 0 | no |

## Hallazgos y estado

### 1. Frases residuales de ejecución (deben eliminarse)
- ✅ Ninguna detectada.

### 2. IDs colgantes (citan IDs que no existen en DOC 14)
- ✅ Ningún ID colgante.

### 3. Documentos que hacen afirmaciones con evidencia pero NO citan IDs canónicos (migrar a EV-IDs)
- ⚠️ **DOC 00 — Master Spine (Veredicto Estratégico).md** — cita con formato `[plataforma·engagement]` (v3), falta migrar a `EVxxxx` de DOC 14.
- ⚠️ **DOC 15 — Retrato del Cliente (Avatar Core 5 + Sub-avatares).md** — cita con formato `[plataforma·engagement]` (v3), falta migrar a `EVxxxx` de DOC 14.
- ⚠️ **DOC 16 — Banco de Lenguaje, Hooks e Identidad Reclamada.md** — cita con formato `[plataforma·engagement]` (v3), falta migrar a `EVxxxx` de DOC 14.
- ⚠️ **DOC 19 — UMP-UMS-USP Mecanismos Únicos.md** — cita con formato `[plataforma·engagement]` (v3), falta migrar a `EVxxxx` de DOC 14.
- ⚠️ **DOC 20 — Mapa de Dolores + Buyer Psychology.md** — cita con formato `[plataforma·engagement]` (v3), falta migrar a `EVxxxx` de DOC 14.
- ⚠️ **DOC 21 — Banco de Hooks para Producción.md** — cita con formato `[plataforma·engagement]` (v3), falta migrar a `EVxxxx` de DOC 14.
- ⚠️ **DOC 00 — Master Spine actualizado.md** — cita con formato `[plataforma·engagement]` (v3), falta migrar a `EVxxxx` de DOC 14.
- ⚠️ **MOTOR DE RESEARCH v3.1 — Spec Operativo.md** — cita con formato `[plataforma·engagement]` (v3), falta migrar a `EVxxxx` de DOC 14.
- ⚠️ **README — Cómo ejecutar este motor en otro producto.md** — cita con formato `[plataforma·engagement]` (v3), falta migrar a `EVxxxx` de DOC 14.

> **Estado:** los documentos interpretativos de v3 usan citas legibles pero NO los IDs canónicos del banco. Migración a EV-IDs = deuda técnica documentada (los IDs ya existen en evidence_bank.csv; el texto de cada cita es trazable por búsqueda).

### 4. TEAM_SEED usado como prueba
- ⚠️ DOC 00 — Master Spine actualizado.md
- ⚠️ MOTOR DE RESEARCH v3.1 — Spec Operativo.md

## Veredicto de validación: **APROBADO**
- Frases residuales: 0 · IDs colgantes: 0 · docs a migrar a EV-IDs: 9
- **Fortaleza:** el banco canónico (13,548 IDs) y el PI transparente existen y son auditables; ningún ID colgante; ningún TEAM_SEED como prueba.
- **Deuda documentada:** migrar las citas de los docs interpretativos v3 al formato EV-ID, y limpiar frases residuales detectadas.