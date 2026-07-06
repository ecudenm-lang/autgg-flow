# AutGG Flow — el pipeline creativo completo (portable)

Mono-repo con las **3 etapas ejecutables** del sistema AutGG, listas para correr en una máquina nueva:

```
FASE 0 ─────────► ETAPA 3 ─────────► ETAPA 4
Research           Análisis visual     Producción de video
(Apify/TrendTrack)  (Pegasus/TwelveLabs) (Kling 3.0 + nano-banana)
   VoC + competencia   video → JSON        guion + voz → .mp4 montado
```

> El **orquestador** (board en Gethookd, scoring de guiones, generación de prompts) lo maneja Claude
> con estas piezas. Este repo te da lo **operativo** de cada etapa. Guía conceptual completa: repo `AutGG`.

---

## Estructura

| Carpeta | Etapa | Qué hace | Stack |
|---|---|---|---|
| `fase0-apify/` | Fase 0 | Scraping de VoC + competencia (Reddit/TikTok/YouTube/Amazon/ads) | PowerShell + Python (stdlib) |
| `pegasus/` | Etapa 3 | Analiza un video ganador → JSON de estructura visual | Node (fetch nativo) |
| `kling/` | Etapa 4 | Guion + voz → video 9:16 montado + subtítulos | Node + ffmpeg + Python (postpro) |

Cada carpeta tiene su propio README con el detalle.

---

## Arranque rápido (Windows)

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

**Etapa 3 — Pegasus (análisis visual de un video):**
```powershell
node pegasus\pegasus_analyze.mjs "https://.../ad_competidor.mp4" competidor_ad42
# → output/pegasus_competidor_ad42.json
```

**Etapa 4 — Kling (producir el video):** ver `kling/README-ARRANQUE.md` (flujo voz-primero paso a paso).

---

## Seguridad
- `.env`, tokens (`*_token.txt`, `*_key.txt`) y `api_config.json` están en `.gitignore` — nunca se suben.
- Cada quien usa **sus propias cuentas** en cada servicio. El repo solo trae los NOMBRES de las variables.

## Qué NO necesitas
- No necesitas disco D: — todo funciona en C: con rutas relativas.
- No necesitas correr las 3 etapas: cada una es independiente. El doctor te dice qué falta por etapa.
