# DATA QUALITY REPORT — Corpus Hígado+Intestino MX/US
*Motor de Research v3.1 · generado antes de interpretar*

## 1. Volumen
- Filas crudas obtenidas: **16,103**
- Eliminadas (vacías/cortas <4 palabras): **1,998**
- Eliminadas (duplicado/near-dup intra-plataforma): **557**
- **Confesiones limpias finales: 13,548**

## 2. Distribución por plataforma
| Plataforma | Filas | % |
|---|---|---|
| tiktok | 6,755 | 49.9% |
| reddit | 2,444 | 18.0% |
| youtube | 2,438 | 18.0% |
| instagram | 1,344 | 9.9% |
| amazon | 371 | 2.7% |
| mercadolibre | 196 | 1.4% |

## 3. Distribución por MERCADO (pool)
| Pool | Filas | Uso |
|---|---|---|
| venta_MX (español) | 6,913 | Lanzamiento — manda para copy |
| intel_US (inglés) | 6,635 | Inteligencia — mecanismo/arbitraje, NO copy directo |

## 4. Distribución por TIPO DE FUENTE (jerarquía v3.1)
| Tipo | Filas | % | Peso en PI de deseo |
|---|---|---|---|
| RAW_CONFESSION (cliente real) | 10,647 | 78.6% | 1.0 |
| REVIEW (reseña de producto) | 567 | 4.2% | 1.0 |
| CREATOR_CONTENT (nutriólogo/influencer) | 2,100 | 15.5% | 0.25 (down-weight) |
| COMPETITOR_CLAIM (marca/ad) | 234 | 1.7% | 0.0 (excluido del deseo) |

**Voz real de cliente (RAW+REVIEW) = 11,214 (82.8%)** → base sólida para deseos/dolores.

## 5. Distribución por idioma (detectado)
| Idioma | Filas |
|---|---|
| en | 6,461 |
| es | 6,051 |
| pt | 264 |
| it | 88 |
| hi | 70 |
| id | 48 |
| fr | 42 |
| tl | 41 |

## 6. Sesgos del corpus (declarados)
- **Sesgo de plataforma:** TikTok domina el volumen (comentarios). Reddit y YouTube aportan confesiones más largas/profundas.
- **CREATOR_CONTENT mezclado:** ~2,100 captions de creadores/marcas (ya separados y down-weighted; en v3 inflaban el ranking).
- **Reseñas de producto MX delgadas:** solo MercadoLibre (196) + sin Amazon MX → evidencia de RESEÑA para el mercado de venta es débil.
- **Pool competidor delgado:** 234 COMPETITOR_CLAIM (de captions promocionales). Falta scraping dirigido de reseñas 1-3★ de competidor y claims de ads.
- **Idioma mixto en comentarios:** algunos comentarios ES aparecen en videos EN y viceversa (langdetect por fila lo mitiga).
- **Sin Trustpilot/foros DTC** (excluidos por decisión previa de contaminación).

## 7. Huecos que siguen existiendo
- Reseñas de producto en **español-MX** (marketplace) — reforzar MercadoLibre + tiendas DTC.
- **Pool competidor:** reseñas 1-3★ de los ASIN/listings de competidores directos + copy de sus ads (TrendTrack).
- Voz de **hombres/jóvenes** (sub-avatar C) — sub-representada.

## 8. Confiabilidad del research
| Dimensión | Nivel | Razón |
|---|---|---|
| Deseos / dolores (venta) | **ALTA** | 11,214 confesiones reales, sin dependencia viral |
| Sofisticación / arbitraje | **MEDIA-ALTA** | doble pool robusto; MX inferido, no 100% verificado |
| Reseñas de producto MX | **MEDIA-BAJA** | solo 196 MercadoLibre; reforzar |
| Competidores / oferta | **MEDIA** | claims de captions; falta scraping dirigido (Fase 2) |
| Mecanismo causal (UMP) | **BAJA (hipótesis)** | la data prueba la queja, no la causa fisiológica |

**Veredicto global: confiabilidad MEDIA-ALTA** para dirección estratégica y hooks; MEDIA para oferta/competencia (se refuerza en Fase 2).