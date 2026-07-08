# Pasos 1 y 2 — Market Research (Apify) + Scraping Competencia (TrendTrack)

> Esta carpeta cubre dos procesos del flow: **Paso 1 · Market Research** (VoC + entendimiento de mercado)
> y **Paso 2 · Scraping Competencia** (ads de competencia vía TrendTrack + score + dossier).
> El nombre `fase0-apify` es por herencia.

Recolecta a escala **experiencias reales de clientes (VoC)** y **lo que hace la competencia**, para
alimentar la "ficha del Senior" (avatares, deseos, mensajes, nivel de conciencia) con datos reales.

## Cómo funciona
1. **Catálogo de fuentes** → `config/sources.json` (qué actor de Apify + qué input por fuente).
2. **Inputs por fuente** → `config/inputs/*.json` (hashtags, subreddits, URLs…).
3. **Motor** → `tools/apify_run.ps1` corre cualquier actor por API, hace polling y guarda el crudo.
4. **Crudos** → `raw/<name>_<fecha>.json` (no se suben a git).

## Correr una fuente
```powershell
# claves cargadas desde la raíz:  . ..\load_env.ps1   (necesita APIFY_TOKEN)
powershell -File tools\apify_run.ps1 -Name reddit_diabetes
powershell -File tools\apify_run.ps1 -Name tiktok_diabetes_es
```

## Fuentes incluidas (buckets)
**VoC / experiencias (el núcleo):** `reddit_diabetes`, `tiktok_diabetes_es`,
`youtube_comments_es`, `amazon_reviews_canela_es`.
**Competencia:** `competitor_ads_meta` (Meta Ad Library), `competitor_sites` (landings).

## TrendTrack (ads del nicho para imitar)
Los scripts `scripts/trendtrack_*.py` reúnen y rankean ads. Toman el token como archivo:
```powershell
python scripts\trendtrack_ads.py <ruta_token_trendtrack.txt> <out_dir>
```
Usan solo librería estándar de Python (sin `pip install`).

## Claves (cuentas propias, en el .env de la raíz)
| Variable | Para qué |
|---|---|
| `APIFY_TOKEN` | correr actores de Apify |
| `TRENDTRACK_TOKEN` | API de TrendTrack |

*(También puedes poner el token en `config/apify_token.txt` — está en `.gitignore`.)*

## Aprendizajes operativos
- **Plan FREE de Apify = $5/mes.** Usar actores pay-per-event/free. Benchmark: ~$0.005 por post/video.
- **Reddit:** scrapear SUBREDDITS directos (no búsquedas globales, traen ruido).
- **Correr en FOREGROUND** (el polling se cuelga en background).
- **TikTok:** los comentarios son add-on de costo (no incluidos en el run base).
