# Qué te falta instalar (diagnóstico para tu máquina)

> Basado en el perfil que reportaste el 5-jul-2026: **Windows 11 Home, solo disco C:, usuario `cmktc`**,
> con Node v24.15.0 ✅, npm 11.12.1 ✅, Git 2.54 ✅, **Python ❌**, **ffmpeg ❌**.

La forma definitiva de saber qué falta es correr el chequeo (gasta **$0**):
```powershell
cd klingaut-starter
npm install
. .\load_env.ps1
npm run doctor
```
El `doctor` te lo dice en **verde/rojo**. Abajo está el resultado **precomputado** para tu máquina.

---

## ✅ Ya lo tienes (no toques nada)
- Node.js v24.15.0 · npm 11.12.1 · Git 2.54 · PowerShell 5.1 · Git Bash

## ❌ Te falta (en orden)

### 1. ffmpeg + ffprobe  — OBLIGATORIO (bloquea el core)
Sin esto no se cortan ni se montan los videos.
```powershell
winget install Gyan.FFmpeg
```
Cierra y reabre PowerShell. Verifica: `ffmpeg -version` y `ffprobe -version`.
*(Si `winget` no existe: baja el zip de https://www.gyan.dev/ffmpeg/builds/ , descomprímelo y agrega su
carpeta `bin` al PATH — o pon las rutas de `ffmpeg.exe`/`ffprobe.exe` en el `.env` como `FFMPEG=` y `FFPROBE=`.)*

### 2. Python 3.10+  — para la POST-PRODUCCIÓN (subtítulos, banner)
El **core NO lo necesita**; sí lo necesitas porque vas a usar subtítulos/TTS.
- Baja de https://www.python.org/downloads/ y **marca "Add Python to PATH"** al instalar.
- Verifica: `python --version`.

### 3. Paquetes Python  — para la post-producción
```powershell
pip install -r requirements.txt
```
Instala `faster-whisper` (subtítulos) y `Pillow` (banner). La 1ª vez que corras subtítulos se
descarga el modelo whisper (~1.5 GB) a `assets/hf_cache/` dentro del kit.

### 4. Dependencias del kit  — OBLIGATORIO
```powershell
npm install
```

### 5. Tus claves API  — OBLIGATORIO (usa TUS cuentas)
```powershell
Copy-Item .env.example .env
```
Abre `.env` y pega:
- `KIE_API_KEY` — de https://kie.ai  (keyframes + video)
- `FAL_KEY` — de https://fal.ai  (transcripción, lipsync)
- `ELEVENLABS_API_KEY` — de https://elevenlabs.io  (solo si generas voz con IA)

*(Para TTS además: `Copy-Item config\api_config.example.json config\api_config.json` y pon tu `voice_id`.)*

---

## Resumen: comandos en orden

```powershell
winget install Gyan.FFmpeg          # 1. ffmpeg (reabre PowerShell después)
# 2. instala Python desde python.org marcando "Add to PATH"
cd klingaut-starter
npm install                          # 4. deps del kit
pip install -r requirements.txt      # 3. deps python (post-pro)
Copy-Item .env.example .env          # 5. crea tu .env y pega tus claves
. .\load_env.ps1                     # carga las claves en la sesión
npm run doctor                       # verifica TODO en verde ($0)
```

## Qué debe verse al final (doctor en verde)
```
✅ Node.js            ✅ ffmpeg           ✅ KIE_API_KEY
✅ Dependencias npm   ✅ ffprobe          ✅ FAL_KEY
✅ Python (postpro)   ✅ faster-whisper   ✅ Pillow   ✅ Fuentes
```
Con eso, listo para producir tu primer video (ver `README-ARRANQUE.md`, sección 5).

---

## Lo que NO necesitas instalar
- **No necesitas disco D:** — todo el kit funciona en C: con rutas relativas.
- **No necesitas Python para el core** — solo para subtítulos/banner.
- **No necesitas las cuentas de tu compañero** — usa las tuyas propias.
