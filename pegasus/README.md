# Pegasus — Análisis visual de video (Paso 3 · Fábrica de Videos)

Toma un video ganador (competencia o propio) y lo pasa por **TwelveLabs Pegasus** (modelo de
video-understanding) para extraer su **estructura visual** — el "molde" que luego se combina con el
guion adaptado para generar los prompts de Kling.

**División de dominios:** Pegasus manda en lo **visual** (formato, escenas, ritmo, tipo de plano,
rol de estilo por toma). El **guion** manda en lo narrativo. El prompt final es la fusión de ambos.

## Uso
```powershell
# 1) claves cargadas (desde la raíz):  . ..\load_env.ps1
node pegasus_analyze.mjs <video_url_o_ruta_local> [nombre] [--prompt "instruccion extra"]

# ejemplos
node pegasus_analyze.mjs "https://static.../ad42.mp4" competidor_ad42
node pegasus_analyze.mjs "..\kling\clips\ref.mp4" ref_local
```
Salida: `output/pegasus_<nombre>.json`

## Qué devuelve (JSON)
```json
{
  "formato": "personificacion villano/heroe",
  "duracion_seg": 68,
  "ritmo": "medio",
  "estructura": ["hook","agitar","mecanismo","autoridad","producto","cta"],
  "escenas": [
    { "inicio_seg":0, "fin_seg":8, "lo_que_se_ve":"...", "tipo_plano":"plano medio", "rol_estilo":"EMOTION" }
  ],
  "recursos_visuales": ["subtitulos","b-roll"],
  "notas": "que lo hace potente visualmente"
}
```
El `rol_estilo` (STORY/SCIENCE/EMOTION/CONCEPT) sale ya en el idioma de la fábrica Kling.

## Variables de entorno (.env de la raíz)
| Variable | Obligatoria | Qué es |
|---|---|---|
| `TL_API_KEY` | sí | Clave de TwelveLabs (https://twelvelabs.io) |
| `TL_INDEX_ID` | no | Índice existente; si falta, crea "autgg-pegasus" |
| `TL_BASE` | no | default `https://api.twelvelabs.io/v1.3` |
| `TL_MODEL` | no | default `pegasus1.2` |

## Notas
- La API de TwelveLabs evoluciona; `TL_BASE`/`TL_MODEL` son configurables por si cambian los endpoints.
  **Verifica contra la doc vigente antes del primer run.**
- El script no gasta hasta que sube el video (crear índice y listar son gratis/baratos).
- La 1ª vez, subir e indexar el video tarda unos minutos (hace polling hasta `ready`).
