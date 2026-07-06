# Motor de Research DTC + Proyecto Hígado MX

Máquina repetible y auditable de research pre-lanzamiento para productos DTC (ads Meta/TikTok, metodología Schwartz), más el primer producto ejecutado con ella: un suplemento hepático para México.

## Empieza aquí
- **[HANDOFF.md](HANDOFF.md)** — traspaso completo: qué es, qué se hizo, cómo continuar.
- **[v3.1/](v3.1/)** — la versión auditable del motor (10 entregables: DOC 14, PI_SCORES, CLUSTER_REPORT, COMPETITOR_MAP, RECONCILIATION, Spine actualizado, VALIDATION, DATA QUALITY, Spec, README).
- **[CONSOLIDADO — Research Hígado MX.xlsx](CONSOLIDADO%20—%20Research%20Hígado%20MX.xlsx)** — resumen ejecutivo con tier lists.

## Qué contiene
| Capa | Dónde |
|---|---|
| Motor generalizado (repetible) | `v3.1/MOTOR DE RESEARCH v3.1 — Spec Operativo.md` + `v3.1/README` |
| Evidencia canónica | `v3.1/evidence_bank.csv` (13,548 confesiones con IDs) |
| Scoring transparente | `v3.1/PI_SCORES.csv` + `v3.1/CLUSTER_REPORT.md` |
| Interpretación (avatar, psicología, mecanismo) | `DOC 15/19/20` |
| Producción | `DOC 16` + `DOC 21` (36 hooks) |
| Scripts ejecutables | `scripts/` |

## Seguridad
Los tokens de API (Apify, TrendTrack) viven **fuera del repo** en `C:\Users\Thomas\research_secrets.env`. Nunca se commitean. Ver `.gitignore`.

## Estado
Validación v3.1: **APROBADO** · Deuda documentada: migrar citas de docs v3 a EV-IDs.
