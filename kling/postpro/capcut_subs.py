#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
capcut_subs.py — Subtitulos estilo CapCut (auto-caption clasico) 100% automatico.

Flujo:  faster-whisper (timestamps por palabra) -> archivo .ass con karaoke
        (frase visible + palabra activa resaltada en amarillo) -> ffmpeg quema.

Uso:
    python capcut_subs.py <video.mp4> [--model large-v3] [--lang es]
                          [--out salida.mp4] [--font "Montserrat ExtraBold"]
                          [--max-words 4] [--ass-only]
"""
import argparse, os, sys, subprocess, textwrap

# --- Rutas PORTABLES (relativas al kit) ---------------------------------------
# Raiz del kit = carpeta que contiene /postpro y /assets.
_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Cache de modelos whisper: por defecto dentro del kit; se puede sobreescribir con HF_HOME.
os.environ.setdefault("HF_HOME", os.path.join(_ROOT, "assets", "hf_cache"))
os.environ.setdefault("HF_HUB_CACHE", os.path.join(_ROOT, "assets", "hf_cache"))

# ffmpeg: usa el del PATH; se puede forzar otra ruta con la variable de entorno FFMPEG.
FFMPEG  = os.environ.get("FFMPEG", "ffmpeg")
FONTDIR = os.path.join(_ROOT, "assets", "fonts")

# ---------- estilo (cambia aqui para ajustar el look) ----------
FONTNAME   = "Montserrat ExtraBold"
FONTSIZE   = 90        # tamano base (1080x1920)
PRIMARY    = "&H00FFFFFF"   # texto normal = blanco  (&HAABBGGRR)
HIGHLIGHT  = "&H0000F0FF"   # palabra activa = amarillo
OUTLINE    = "&H00000000"   # borde = negro
OUTLINE_W  = 6
SHADOW_W   = 3
MARGIN_V   = 320       # distancia desde abajo (sube/baja los subs)
POP_SCALE  = 112       # % de escala de la palabra activa (112 = leve pop; 100 = sin pop)
PLAY_W, PLAY_H = 1080, 1920
# ----------------------------------------------------------------


def fmt_ts(t: float) -> str:
    if t < 0:
        t = 0
    h = int(t // 3600)
    m = int((t % 3600) // 60)
    s = int(t % 60)
    cs = int(round((t - int(t)) * 100))
    if cs == 100:
        cs = 0
        s += 1
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"


def esc(text: str) -> str:
    return text.replace("\\", "\\\\").replace("{", "(").replace("}", ")")


def group_words(words, max_words: int, max_gap: float = 0.6):
    """Agrupa palabras en frases por # max y por pausas/puntuacion."""
    phrases, cur = [], []
    for w in words:
        if cur:
            prev = cur[-1]
            gap = w["start"] - prev["end"]
            ends_punct = prev["word"].strip().endswith((".", ",", "?", "!", ":", ";"))
            if len(cur) >= max_words or gap > max_gap or ends_punct:
                phrases.append(cur)
                cur = []
        cur.append(w)
    if cur:
        phrases.append(cur)
    return phrases


def build_ass(phrases, font, out_path):
    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {PLAY_W}
PlayResY: {PLAY_H}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,{font},{FONTSIZE},{PRIMARY},{PRIMARY},{OUTLINE},&H80000000,-1,0,0,0,100,100,0,0,1,{OUTLINE_W},{SHADOW_W},2,80,80,{MARGIN_V},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lines = [header]
    for ph in phrases:
        n = len(ph)
        for i, w in enumerate(ph):
            start = w["start"]
            end = ph[i + 1]["start"] if i + 1 < n else w["end"]
            parts = []
            for j, ww in enumerate(ph):
                token = esc(ww["word"].strip())
                if j == i:
                    pop = f"\\fscx{POP_SCALE}\\fscy{POP_SCALE}" if POP_SCALE != 100 else ""
                    parts.append(f"{{\\c{HIGHLIGHT}{pop}}}{token}{{\\c{PRIMARY}\\fscx100\\fscy100}}")
                else:
                    parts.append(token)
            text = " ".join(parts)
            lines.append(
                f"Dialogue: 0,{fmt_ts(start)},{fmt_ts(end)},Cap,,0,0,0,,{text}"
            )
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


def transcribe(video, model_name, lang, vad=True, prompt=None):
    from faster_whisper import WhisperModel
    print(f"[1/3] Cargando modelo '{model_name}' (CPU int8)...", flush=True)
    model = WhisperModel(model_name, device="cpu", compute_type="int8")
    print("[2/3] Transcribiendo con timestamps por palabra...", flush=True)
    segments, info = model.transcribe(
        video, language=lang, word_timestamps=True,
        vad_filter=vad, beam_size=5,
        condition_on_previous_text=(vad),
        initial_prompt=prompt,
        no_speech_threshold=(0.9 if not vad else 0.6),
    )
    words = []
    for seg in segments:
        if not seg.words:
            continue
        for w in seg.words:
            if w.word.strip():
                words.append({"word": w.word, "start": w.start, "end": w.end})
        print(f"    {seg.start:6.1f}s  {seg.text.strip()}", flush=True)
    return words


def burn(video, ass_path, out_path, font):
    ass_ff = ass_path.replace("\\", "/").replace(":", "\\:")
    fdir_ff = FONTDIR.replace("\\", "/").replace(":", "\\:")
    vf = f"subtitles='{ass_ff}':fontsdir='{fdir_ff}'"
    cmd = [FFMPEG, "-y", "-i", video, "-vf", vf,
           "-c:v", "libx264", "-preset", "medium", "-crf", "18",
           "-c:a", "copy", out_path]
    print("[3/3] Quemando subtitulos con ffmpeg...", flush=True)
    subprocess.run(cmd, check=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--model", default="large-v3")
    ap.add_argument("--lang", default="es")
    ap.add_argument("--out", default=None)
    ap.add_argument("--font", default=FONTNAME)
    ap.add_argument("--max-words", type=int, default=4)
    ap.add_argument("--ass-only", action="store_true",
                    help="solo genera el .ass, no quema")
    ap.add_argument("--no-vad", action="store_true",
                    help="desactiva VAD (para canciones: transcribe todo el audio)")
    ap.add_argument("--prompt", default=None,
                    help="initial_prompt para guiar (ej. la letra de la cancion)")
    args = ap.parse_args()

    video = os.path.abspath(args.video)
    base = os.path.splitext(video)[0]
    ass_path = base + ".ass"
    out_path = args.out or (base + "_subs.mp4")

    words = transcribe(video, args.model, args.lang, vad=(not args.no_vad), prompt=args.prompt)
    if not words:
        print("ERROR: no se detectaron palabras.", file=sys.stderr)
        sys.exit(1)
    phrases = group_words(words, args.max_words)
    build_ass(phrases, args.font, ass_path)
    print(f"    .ass generado: {ass_path}  ({len(phrases)} frases, {len(words)} palabras)")
    if args.ass_only:
        return
    burn(video, ass_path, out_path, args.font)
    print(f"\nLISTO -> {out_path}")


if __name__ == "__main__":
    main()
