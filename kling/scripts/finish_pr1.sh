#!/usr/bin/env bash
# Montaje PR1: assemble (voz + b-roll, sin lipsync, cuts fusionados) + subs karaoke + headline 1a toma + música ACE-Step.
# USO: bash finish_pr1.sh pr1_ad16 [pr1_ad14 ...]
cd /d/videos-kling
FF="/c/ffmpeg/ffmpeg-8.1.1-essentials_build/bin/ffmpeg.exe"
MUSIC="audio/music/pr1_ace.mp3"
[ ! -s "$MUSIC" ] && MUSIC="audio/music/pr1_test.mp3"   # fallback Suno si ACE no bajó
LOG="/c/Users/Unda/AppData/Local/Temp/claude/D--videos-kling/6072a967-a61e-4cf0-9c73-d4bd861cf740/scratchpad"
mkdir -p output/PR1

run_finish(){
  local ad=$1
  rm -f output/final_${ad}_voiced.mp4 output/final_${ad}_voiced.ass
  node assemble_voiced.mjs $ad voces/vo_${ad}.mp3 clips/$ad clips/__nolip__ config/vcuts_${ad}.json 2>&1 | grep -E "final_|❌|toma"
  python "D:/Iteracionking/scripts/capcut_subs.py" "output/final_${ad}_voiced.mp4" --ass-only --lang es > "$LOG/subs_${ad}.log" 2>&1
  local A="output/final_${ad}_voiced.ass"
  sed -i 's/WrapStyle: 2/WrapStyle: 0/; s/,2,80,80,/,2,110,110,/; s/[Bb]io[CcSsZz]ent[ar][ar]*/Biozentra/g; s/Ceyl[aá]n/Ceilán/g; s/Xeil[aá]n/Ceilán/g; s/Ceilan/Ceilán/g; s/\bMST\b/MCT/g' "$A"
  local T1=$(node -e "console.log(require('./config/vcuts_${ad}.json')[0].end)")
  local HL="assets/headline_${ad}.png"
  rm -f output/PR1/${ad}.mp4
  "$FF" -nostdin -v error -y -i "output/final_${ad}_voiced.mp4" -i "$HL" -i "$MUSIC" \
    -filter_complex "[0:v]subtitles=${A}:fontsdir=../Iteracionking/assets/fonts[sv];[1:v]scale=680:-1[hl];[sv][hl]overlay=(W-w)/2:140:enable='lte(t,${T1})'[v];[0:a]volume=1[a0];[2:a]volume=0.12[a1];[a0][a1]amix=inputs=2:duration=first:normalize=0[a]" \
    -map "[v]" -map "[a]" -c:v libx264 -preset medium -crf 18 -c:a aac -b:a 192k "output/PR1/${ad}.mp4"
  echo "  ${ad}.mp4 rc=$? -> $(ffprobe -v error -show_entries format=duration -of csv=p=0 output/PR1/${ad}.mp4 2>/dev/null)s"
}
for ad in "$@"; do run_finish "$ad"; done
echo PR1_FINISH_DONE
