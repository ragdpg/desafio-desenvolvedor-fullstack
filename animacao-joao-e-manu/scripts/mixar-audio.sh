#!/usr/bin/env bash
# Mix dialogue + soft bed into a 60s stereo track aligned to the episode timeline.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
A="$ROOT/assets/audio"
OUT="$ROOT/output/episodio-audio.wav"
mkdir -p "$ROOT/output"

# Generate a soft triangle-ish bed using ffmpeg sine chords (very quiet)
BED="$A/bed.wav"
ffmpeg -y -f lavfi -i "sine=frequency=523:duration=60" -f lavfi -i "sine=frequency=659:duration=60" \
  -filter_complex "[0][1]amix=inputs=2:duration=first,volume=0.03,afade=t=in:st=0:d=1,afade=t=out:st=55:d=5" \
  -ar 44100 -ac 2 "$BED"

# Cue times (seconds) matching script.js
# abertura 0.3 | shh 8 | vem 21 | uau 33 | quase 39 | parabens 46 | final 55
ffmpeg -y \
  -i "$BED" \
  -i "$A/narracao-abertura.mp3" \
  -i "$A/manu-shh.mp3" \
  -i "$A/manu-vem.mp3" \
  -i "$A/joao-uau.mp3" \
  -i "$A/manu-quase.mp3" \
  -i "$A/narracao-parabens.mp3" \
  -i "$A/narracao-final.mp3" \
  -filter_complex "\
    [1]adelay=300|300,volume=1.2[a1];\
    [2]adelay=8000|8000,volume=1.25[a2];\
    [3]adelay=21000|21000,volume=1.25[a3];\
    [4]adelay=33000|33000,volume=1.3[a4];\
    [5]adelay=39000|39000,volume=1.25[a5];\
    [6]adelay=46000|46000,volume=1.2[a6];\
    [7]adelay=55000|55000,volume=1.2[a7];\
    [0][a1][a2][a3][a4][a5][a6][a7]amix=inputs=8:duration=first:dropout_transition=0,loudnorm=I=-16:TP=-1.5:LRA=11[out]" \
  -map "[out]" -t 60 -ar 44100 -ac 2 "$OUT"

echo "Audio mix: $OUT"
ffprobe -hide_banner "$OUT" 2>&1 | head -8
