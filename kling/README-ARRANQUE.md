# Klingaut Starter — Arranque en una máquina nueva (Windows)

Kit **portable** del pipeline de video Klingaut: convierte **un guion + una voz grabada** en un
**video vertical 9:16 montado** (b-roll animado con Kling 3.0 + keyframes nano-banana, voz sincronizada),
y opcionalmente le **quema subtítulos** estilo CapCut.

> Pensado para alguien que **no programa**. Sigue los pasos en orden. El chequeo `doctor` te dice en
> **verde/rojo** qué falta antes de gastar un peso.

---

## 0. Qué necesitas (resumen)

| Para el CORE (video montado) | Para la POST-PRO (subtítulos / TTS) |
|---|---|
| Node.js ≥ 18 | Python 3.10+ |
| ffmpeg + ffprobe | `faster-whisper` y `Pillow` (pip) |
| Cuentas propias: **kie.ai** + **fal.ai** | Cuenta propia: **ElevenLabs** (solo si generas voz con IA) |

El **core NO necesita Python**. Python es solo para subtítulos/banner.

---

## 1. Instalar los prerequisitos

**Node.js** — descarga el instalador LTS de https://nodejs.org y siguiente-siguiente.
Verifica en PowerShell: `node --version` (debe decir v18 o más).

**ffmpeg** (incluye ffprobe) — la forma fácil en Windows:
```powershell
winget install Gyan.FFmpeg
```
Cierra y reabre PowerShell. Verifica: `ffmpeg -version`.
*(Si `winget` no existe: baja el zip de https://www.gyan.dev/ffmpeg/builds/, descomprímelo, y o bien
agrega su carpeta `bin` al PATH, o pon la ruta de `ffmpeg.exe`/`ffprobe.exe` en el `.env`.)*

**Python** *(solo si vas a usar subtítulos)* — https://www.python.org/downloads/ ,
marca **"Add Python to PATH"** al instalar. Verifica: `python --version`.

---

## 2. Descargar el kit e instalar dependencias

Opción A — con git:
```powershell
git clone https://github.com/ecudenm-lang/autgg-flow.git
cd autgg-flow\kling
```
Opción B — sin git: en GitHub, botón verde **Code → Download ZIP**, descomprime, y entra a la carpeta `autgg-flow\kling`.

Luego instala dependencias:
```powershell
npm install
# Solo si usarás subtítulos:
pip install -r requirements.txt
```

---

## 3. Poner tus claves

1. Copia `.env.example` como `.env`:
   ```powershell
   Copy-Item .env.example .env
   ```
2. Abre `.env` en el Bloc de notas y pega **tus** claves:
   - `KIE_API_KEY` — de tu cuenta en https://kie.ai
   - `FAL_KEY` — de tu cuenta en https://fal.ai
   - `ELEVENLABS_API_KEY` — solo si vas a generar voz con IA
3. *(Solo TTS)* copia `config/api_config.example.json` como `config/api_config.json` y pon el `voice_id` de tu voz de ElevenLabs.

> **Seguridad:** el `.env` y `config/api_config.json` están en `.gitignore` — nunca se suben a git.

---

## 4. Chequeo de salud (GASTA $0)

Carga tus claves en la sesión y corre el doctor:
```powershell
. .\load_env.ps1        # ojo: punto + espacio al inicio
npm run doctor
```
Debe salir todo en **verde** (lo esencial). El amarillo es opcional (post-pro).
Para validar además los archivos de ejemplo:
```powershell
npm run smoke
```

---

## 5. Producir UN video (flujo voz-primero)

La **voz grabada manda el timing**: cada toma dura lo que su frase narrada.

> ⚠️ **La capa creativa necesita un asistente IA (Claude).** Los scripts son los *músculos*; el *cerebro*
> (afinar los cortes del paso 2 y sobre todo escribir el `kf_prompt` / `anim_prompt` de cada toma en el
> paso 4) está pensado para hacerse **con un asistente IA como copiloto**, usando `kling/CLAUDE.md` como guía
> (anatomía de prompts, roles de estilo, negative_prompt, reglas de coherencia). Si no usas un asistente,
> copia la estructura de `examples/keyframes_input_demo.json` y el método de `CLAUDE.md` a mano.

```powershell
# (0) Graba tu voz completa del guion en un solo archivo, ej: voz.mp3

# (1) Transcribir la voz  → config/transcript_demo.json   (barato)
node scripts/transcribe_fal.mjs voz.mp3 demo es

# (2) PROPONER los cortes automáticamente desde el transcript → config/cuts_demo.json
node scripts/build_cuts.mjs demo
#     Luego ABRE config/cuts_demo.json y AJÚSTALO (una toma = una frase/beat).
#     (build_cuts te evita la hoja en blanco; el ajuste fino es tuyo.)

# (3) Cortar la voz por toma  → audio/demo/seg_XX.wav
node scripts/cut_audio.mjs config/cuts_demo.json voz.mp3 audio/demo

# (4) Keyframes (imagen por toma) — PAGA (~$0.02 c/u). Ver examples/keyframes_input_demo.json
node scripts/batch_keyframes_kie.mjs examples/keyframes_input_demo.json demo

# (5) Animar cada keyframe con Kling 3.0 — PAGA (~$0.07/s)
node scripts/batch_kling3_kie.mjs config/batch_input_demo.json clips/demo std

# (6) Lipsync SOLO en tomas con personaje hablando de frente (opcional) — PAGA
node scripts/batch_lipsync_fal.mjs examples/lipsync_input_demo.json clips/demo_sync

# (7) Montar todo + pegar la voz  → output/final_demo_voiced.mp4
node scripts/assemble_voiced.mjs demo voz.mp3 clips/demo clips/demo_sync config/cuts_demo.json
```

> **Control de gasto:** los pasos 4-6 cuestan. Prueba con **1 toma** antes de lanzar el lote.
> Cada script muestra lo que va a hacer; tú apruebas.

---

## 6. Post-producción (opcional)

**Subtítulos — dos rutas según de dónde salió la voz:**

| Tu voz vino de… | Usa | Por qué |
|---|---|---|
| **La grabaste tú** (voz.mp3 propio) | `postpro/capcut_subs.py` (whisper) | es la única fuente de timing disponible |
| **ElevenLabs** (`gen_vo.mjs`) | `scripts/make_subs.mjs` modo EL (`--words config/words_<ad>.json`) | timing exacto de ElevenLabs; **no pierde palabras** (whisper suelta la marca en el CTA) |

```powershell
# Ruta A — voz grabada por ti (whisper):
python postpro/capcut_subs.py output/final_demo_voiced.mp4 --lang es
# La 1ª vez descarga el modelo whisper (~1.5GB) a assets/hf_cache/

# Ruta B — voz de ElevenLabs (recomendada si usaste gen_vo.mjs):
node scripts/make_subs.mjs <ad> --words config/words_<ad>.json --cuts config/cuts_<ad>.json --out A
```
> Detalle completo del flujo con ElevenLabs, QC de keyframes, reintentos y lip-sync: **`kling/MANUAL_PIPELINE_CLAUDE.md`**.

**Voz con IA (TTS)** en vez de grabarte:
```powershell
.\postpro\tts_eleven.ps1 -TextFile guion.txt -Out voz.mp3
```

**Banner de hook** (PNG con titular):
```powershell
python postpro/banner_hook.py "EL SECRETO" "QUE TU MEDICO NO TE DIJO" hook.png
```

---

## 7. Si algo falla

- Corre `npm run doctor` — te dice exactamente qué falta.
- `ffmpeg no se reconoce` → no está en el PATH; reinstálalo o pon la ruta en `.env` (`FFMPEG=`, `FFPROBE=`).
- `Cannot find package '@fal-ai/client'` → te faltó `npm install`.
- Claves en rojo → revisa el `.env` y vuelve a correr `. .\load_env.ps1`.
- Python/subtítulos → `pip install -r requirements.txt`.

---

## Qué hace cada pieza

| Carpeta / archivo | Qué es |
|---|---|
| `scripts/` | El core: transcribir, cortar, keyframes, animar, lipsync, montar |
| `postpro/` | Subtítulos (capcut_subs.py), TTS (tts_eleven.ps1), banner (banner_hook.py) |
| `assets/fonts/` | Fuentes Montserrat para los subtítulos |
| `examples/` | Plantillas de los JSON de entrada |
| `config/` | Tu `api_config.json` (voice_id) — no se sube a git |
| `doctor.mjs` | Chequeo de salud verde/rojo ($0) |
| `load_env.ps1` | Carga el `.env` en la sesión de PowerShell |
| `.env` | Tus claves (no se sube a git) |

Método completo y decisiones de estilo: ver el `CLAUDE.md` del repo de producción (Klingaut).
