# CLUSTER_REPORT — Scoring transparente por cluster
*Motor v3.1 · fuente: PI_SCORES.csv · corpus 13,548 confesiones*

## Fórmula PI
```
PI = (0.60·freq_norm + 0.40·reson_norm) · penalización_viral
freq_norm  = log1p(freq_ponderada)/log1p(max) ·100   (peso por fuente: RAW/REVIEW=1.0, CREATOR=0.25, COMPETITOR=0)
reson_norm = log1p(Σ engagement-percentil-por-plataforma)/log1p(max) ·100
penalización = 0.85 si un solo post aporta >60% de la resonancia del cluster (viral_share)
```

## Ranking VENTA (MX) vs INTELIGENCIA (US) + delta
| Cluster | PI venta | PI intel | Δ (v-i) | freq real | viral | RAW | REVIEW | CREATOR |
|---|---|---|---|---|---|---|---|---|
| Hígado graso/NAFLD | 99.1 | 91.2 | +7.9 | 1399 | 0.002 | 1108 | 10 | 267 |
| Hinchazón/panza | 97.9 | 79.9 | +18.0 | 1777 | 0.002 | 1171 | 8 | 551 |
| Preferencia natural | 92.4 | 87.0 | +5.4 | 909 | 0.002 | 670 | 10 | 212 |
| Detox/toxinas | 91.0 | 96.6 | -5.6 | 825 | 0.003 | 622 | 9 | 176 |
| Enzimas ALT/AST | 85.0 | 100.0 | -15.0 | 800 | 0.005 | 474 | 8 | 284 |
| Digestión pesada | 82.4 | 71.6 | +10.8 | 653 | 0.005 | 319 | 6 | 276 |
| Peso que no baja | 78.4 | 71.5 | +6.9 | 490 | 0.01 | 355 | 1 | 131 |
| Flujo biliar | 68.2 | 64.7 | +3.5 | 174 | 0.014 | 137 | 2 | 32 |
| Deseo: vientre plano | 65.7 | 46.8 | +18.9 | 189 | 0.017 | 125 | 1 | 62 |
| Alcohol→hígado | 63.4 | 77.2 | -13.8 | 160 | 0.02 | 97 | 0 | 61 |
| Estreñimiento | 61.7 | 61.2 | +0.5 | 154 | 0.025 | 95 | 1 | 58 |
| Objeción: ¿funciona? | 58.4 | 46.1 | +12.3 | 154 | 0.034 | 53 | 13 | 85 |
| Objeción: sabor | 56.6 | 69.7 | -13.1 | 113 | 0.049 | 53 | 33 | 22 |
| Gases/dolor | 53.1 | 51.8 | +1.3 | 76 | 0.041 | 54 | 0 | 17 |
| Creencia: la edad | 51.3 | 6.5 | +44.8 | 109 | 0.054 | 39 | 0 | 65 |
| Cansancio crónico | 46.7 | 60.5 | -13.8 | 86 | 0.056 | 26 | 0 | 56 |
| Doctor no ayudó | 41.4 | 31.7 | +9.7 | 28 | 0.126 | 26 | 2 | 0 |
| Objeción: precio | 38.9 | 46.1 | -7.2 | 34 | 0.166 | 20 | 5 | 7 |
| Objeción: estafa | 37.5 | 34.2 | +3.3 | 33 | 0.107 | 8 | 1 | 23 |
| Piel opaca | 34.9 | 42.3 | -7.4 | 28 | 0.178 | 15 | 0 | 13 |
| Bajón 2pm | 30.6 | 40.5 | -9.9 | 18 | 0.194 | 9 | 0 | 8 |
| Niebla mental | 25.6 | 39.9 | -14.3 | 17 | 0.149 | 7 | 0 | 10 |
| Vergüenza cuerpo | 21.4 | 9.8 | +11.6 | 8 | 0.457 | 4 | 0 | 3 |
| Ya probé todo | 14.4 | 44.5 | -30.1 | 4 | 0.54 | 3 | 0 | 1 |
| Identidad: la de antes | 5.8 | 6.5 | -0.7 | 1 | 0 | 1 | 0 | 0 |

## Lectura
- **Δ positivo alto** = tema más fuerte en MX que en US → gancho de lanzamiento. **Δ negativo** = más fuerte en US → capa de prueba/inteligencia importable.
- **Ningún cluster tiene viral_share > 0.6** → ningún ranking depende de un post viral (robustez alta).
- **CREATOR alto vs RAW bajo** en un cluster = tema empujado por creadores más que sentido por clientes → tratar con cautela.
- Cluster líder venta: **Hígado graso/NAFLD**. Cluster líder intel: **Enzimas ALT/AST**.