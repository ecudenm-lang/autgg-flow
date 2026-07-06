#!/usr/bin/env bash
# Montaje AD MUSICAL: assemble (canción = audio, b-roll cortado a cuts, sin lipsync) + subs karaoke de la letra.
# NO mezcla música extra (la canción ya es el audio completo).
# USO: bash finish_song.sh song1 audio/songs/song1_pop_v2.mp3 [audio/songs/song1_lyrics.txt]
cd /d/videos-kling
FF="/c/ffmpeg/ffmpeg-8.1.1-essentials_build/bin/ffmpeg.exe"
LOG="/c/Users/Unda/AppData/Local/Temp/claude/D--videos-kling/6072a967-a61e-4cf0-9c73-d4bd861cf740/scratchpad"
mkdir -p output/SONGS
name=$1; song=$2; lyrics=$3
rm -f output/final_${name}_voiced.mp4 output/final_${name}_voiced.ass
node assemble_voiced.mjs $name "$song" clips/$name clips/__nolip__ config/vcuts_${name}.json 2>&1 | grep -E "final_|❌"
# subs karaoke: --no-vad (canción) + letra como initial_prompt para cobertura completa
PROMPT=""
[ -n "$lyrics" ] && [ -f "$lyrics" ] && PROMPT=$(tr '\n' ' ' < "$lyrics" | sed 's/\[[^]]*\]//g' | tr -s ' ')
python "D:/Iteracionking/scripts/capcut_subs.py" "output/final_${name}_voiced.mp4" --ass-only --lang es --no-vad --prompt "$PROMPT" > "$LOG/subs_${name}.log" 2>&1
A="output/final_${name}_voiced.ass"
sed -i 's/WrapStyle: 2/WrapStyle: 0/; s/,2,80,80,/,2,110,110,/; s/[Bb]io[CcSsZz]ent[ar][ar]*/Biozentra/g; s/Ceyl[aá]n/Ceilán/g; s/Xeil[aá]n/Ceilán/g; s/Ceilan/Ceilán/g; s/\bMST\b/MCT/g' "$A"
rm -f output/SONGS/${name}.mp4
"$FF" -nostdin -v error -y -i "output/final_${name}_voiced.mp4" \
  -filter_complex "[0:v]subtitles=${A}:fontsdir=../Iteracionking/assets/fonts[v]" \
  -map "[v]" -map "0:a" -c:v libx264 -preset medium -crf 18 -c:a aac -b:a 192k "output/SONGS/${name}.mp4"
echo "  ${name}.mp4 rc=$? -> $(ffprobe -v error -show_entries format=duration -of csv=p=0 output/SONGS/${name}.mp4 2>/dev/null)s"
echo SONG_FINISH_DONE
