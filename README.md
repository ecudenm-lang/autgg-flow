# AutGG Flow — el pipeline creativo completo (portable)

Mono-repo con los **4 procesos** del sistema AutGG, listos para correr en una máquina nueva:

```
PASO 1 ──────────► PASO 2 ──────────► PASO 3 ──────────► PASO 4
Market Research     Scraping           Fábrica de Videos   Growth Guide
                    Competencia
(Apify: VoC +       (TrendTrack: ads   (Pegasus análisis   (registro:
 avatares/deseos)    + score + dossier)  + Kling producción) hit rate/patrones)
                                                            [por definir]
```

> El **orquestador** (board en Gethookd, scoring de guiones, generación de prompts) lo maneja Claude
> con estas piezas. Este repo te da lo **operativo** de cada etapa. Guía conceptual completa: repo `AutGG`.

---

## Flujo operativo (orden de los pasos)

El flow se corre **en este orden**:

| Paso | Proceso | Qué hace | Dónde | Salida |
|---|---|---|---|---|
| **1** | **Market Research** | VoC + entendimiento de mercado (avatares, deseos, hooks) | `fase0-apify/` (`tools/apify_run.ps1`, docs `motor-research`) | `raw/*.json`, docs de avatar/deseos/hooks |
| **2** | **Scraping Competencia** | Ads de competencia (TrendTrack) + score de coincidencia + dossier | `fase0-apify/scripts/` (`trendtrack_*.py`, `trendtrack_score_prep.mjs` → Claude puntúa → `trendtrack_dossier.mjs`) | `score_worksheet.json`, `Dossier_Videos.md` |
| **3** | **Fábrica de Videos** | Análisis visual (Pegasus) + producción (Kling) del ganador | `pegasus/` + `kling/` | `output/pegasus_*.json`, `final_*_voiced.mp4` |
| **4** | **Growth Guide** | Registro histórico: hit rate, métricas soft, patrones | *(por definir)* | *(pendiente)* |

**Paso 2 (Scraping Competencia) en detalle** (bridge research → producción):
```powershell
# a) armar la planilla desde la salida de TrendTrack
node fase0-apify/scripts/trendtrack_score_prep.mjs "<carpeta_trendtrack>" ficha_biozentra.json score_worksheet.json
# b) Claude llena la coincidencia (avatar/nivel/mensaje/deseo/%) por fila
# c) generar el dossier con todos los datos + score
node fase0-apify/scripts/trendtrack_dossier.mjs score_worksheet.json Dossier_Videos.md
```
Cadena de fallback del guion: **transcript → copy → Pegasus** (ver `fase0-apify/SCORE_COINCIDENCIA.md`).

> **Paso 4 (Growth Guide) aún no está definido** — será el registro final que cierra el loop. Se actualizará aquí cuando se defina.

**Nombres de los 4 procesos:** 1. Market Research · 2. Scraping Competencia · 3. Fábrica de Videos · 4. Growth Guide.

---

## Estructura

| Carpeta | Proceso(s) | Qué hace | Stack |
|---|---|---|---|
| `fase0-apify/` | **Paso 1 · Market Research** + **Paso 2 · Scraping Competencia** | VoC + entendimiento de mercado; ads de competencia (TrendTrack) + score + dossier | PowerShell + Python + Node |
| `pegasus/` | **Paso 3 · Fábrica de Videos** (análisis) | Analiza un video ganador → JSON de estructura visual | Node (fetch nativo) |
| `kling/` | **Paso 3 · Fábrica de Videos** (producción) | Guion + voz → video 9:16 montado + subtítulos | Node + ffmpeg + Python (postpro) |

> **Nota:** las carpetas se llaman `fase0-apify/`, `pegasus/`, `kling/` por herencia; los **procesos** son
> los 4 de arriba. `fase0-apify/` cubre los Pasos 1 y 2; `pegasus/` + `kling/` cubren el Paso 3.

Cada carpeta tiene su propio README con el detalle.

---

## Arranque rápido (Windows)

> **¿Máquina nueva?** Un solo comando hace todo (guiado, gasta $0):
> ```powershell
> powershell -ExecutionPolicy Bypass -File .\onboarding.ps1
> ```
> Detecta/instala prerequisitos (preguntando), crea el `.env`, autocompleta ffmpeg, te ayuda a poner
> tus claves y corre el doctor. Scripteable: `-Etapas kling,pegasus`. Los pasos manuales de abajo
> siguen valiendo si prefieres hacerlo a mano.

### 1. Prerequisitos
- **Node.js ≥ 18** (https://nodejs.org)
- **ffmpeg + ffprobe** — `winget install Gyan.FFmpeg` (para la Etapa 4)
- **Python 3.10+** con "Add to PATH" (para subtítulos de Kling y builders de research)

### 2. Descargar e instalar
```powershell
git clone https://github.com/ecudenm-lang/autgg-flow.git
cd autgg-flow
cd kling; npm install; cd ..          # deps de la Etapa 4
pip install -r kling/requirements.txt  # deps Python de post-producción (opcional)
```
*(Pegasus y Fase 0 no necesitan `npm install`: Pegasus usa fetch nativo, Fase 0 es PowerShell + stdlib.)*

### 3. Poner tus claves (cuentas propias)
```powershell
Copy-Item .env.example .env
```
Abre `.env` y pega solo las de las etapas que vayas a usar:
- Fase 0 → `APIFY_TOKEN`, `TRENDTRACK_TOKEN`
- Pegasus → `TL_API_KEY` (TwelveLabs)
- Kling → `KIE_API_KEY`, `FAL_KEY` (y `ELEVENLABS_API_KEY` si usas TTS)

### 4. Chequeo de salud (GASTA $0)
```powershell
. .\load_env.ps1        # carga las claves en la sesión (punto + espacio al inicio)
npm run doctor          # verde/rojo por etapa
npm run smoke           # además valida los JSON de ejemplo
```

---

## Correr cada etapa

**Fase 0 — research:**
```powershell
powershell -File fase0-apify\tools\apify_run.ps1 -Name reddit_diabetes
```

**Paso 3 · Fábrica de Videos — Pegasus (análisis visual de un video):**
```powershell
node pegasus\pegasus_analyze.mjs "https://.../ad_competidor.mp4" competidor_ad42
# → output/pegasus_competidor_ad42.json
```

**Paso 3 · Fábrica de Videos — Kling (producir el video):** ver `kling/README-ARRANQUE.md` (flujo voz-primero paso a paso).
> Si operas el pipeline con un asistente IA, su **manual operativo** (reglas, costos, QC, subtítulos, lip-sync) es **`kling/MANUAL_PIPELINE_CLAUDE.md`**.

---

## Seguridad
- `.env`, tokens (`*_token.txt`, `*_key.txt`) y `api_config.json` están en `.gitignore` — nunca se suben.
- Cada quien usa **sus propias cuentas** en cada servicio. El repo solo trae los NOMBRES de las variables.

## Qué NO necesitas
- No necesitas disco D: — todo funciona en C: con rutas relativas.
- No necesitas correr las 3 etapas: cada una es independiente. El doctor te dice qué falta por etapa.
