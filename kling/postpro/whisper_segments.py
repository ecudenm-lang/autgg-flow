#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
whisper_segments.py — Saca tiempos reales por frase (segment-level) de un video/audio.
Genera <base>_segments.txt (legible) y <base>_segments.json (para montaje).
Uso: python whisper_segments.py <video.mp4> [--model large-v3] [--lang es]
"""
import argparse, os, json

# Cache de modelos whisper PORTABLE: dentro del kit por defecto (override con HF_HOME).
_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("HF_HOME", os.path.join(_ROOT, "assets", "hf_cache"))
os.environ.setdefault("HF_HUB_CACHE", os.path.join(_ROOT, "assets", "hf_cache"))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--model", default="large-v3")
    ap.add_argument("--lang", default="es")
    args = ap.parse_args()

    from faster_whisper import WhisperModel
    print(f"[1/2] Modelo '{args.model}' (CPU int8)...", flush=True)
    model = WhisperModel(args.model, device="cpu", compute_type="int8")
    print("[2/2] Transcribiendo (segment-level)...", flush=True)
    segments, info = model.transcribe(
        args.video, language=args.lang, word_timestamps=True,
        vad_filter=True, beam_size=5,
    )

    base = os.path.splitext(os.path.abspath(args.video))[0]
    rows, jrows = [], []
    for seg in segments:
        s, e, txt = seg.start, seg.end, seg.text.strip()
        rows.append(f"{s:6.2f}  {e:6.2f}  {txt}")
        jrows.append({"start": round(s, 2), "end": round(e, 2), "text": txt})
        print(f"    {s:6.2f}-{e:6.2f}  {txt}", flush=True)

    with open(base + "_segments.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(rows))
    with open(base + "_segments.json", "w", encoding="utf-8") as f:
        json.dump(jrows, f, ensure_ascii=False, indent=2)
    print(f"\nOK -> {base}_segments.txt  ({len(jrows)} frases)")


if __name__ == "__main__":
    main()
