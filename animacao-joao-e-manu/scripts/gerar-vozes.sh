#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/assets/audio"
mkdir -p "$OUT"
export PATH="$HOME/.local/bin:$PATH"

# Narradora
edge-tts --voice pt-BR-FranciscaNeural --rate="+5%" \
  --text "João e Manu! Episódio um: O Aniversário Surpresa." \
  --write-media "$OUT/narracao-abertura.mp3"

edge-tts --voice pt-BR-FranciscaNeural --rate="+5%" \
  --text "Parabéns, João!" \
  --write-media "$OUT/narracao-parabens.mp3"

edge-tts --voice pt-BR-FranciscaNeural --rate="-5%" \
  --text "Feliz quase cinco anos, João! Até o próximo episódio." \
  --write-media "$OUT/narracao-final.mp3"

# Manu (11 anos) — voz jovem
edge-tts --voice pt-BR-ThalitaMultilingualNeural --rate="+8%" --pitch="+5Hz" \
  --text "Shh… surpresa pro João!" \
  --write-media "$OUT/manu-shh.mp3"

edge-tts --voice pt-BR-ThalitaMultilingualNeural --rate="+10%" --pitch="+5Hz" \
  --text "Joãozinho, vem cá!" \
  --write-media "$OUT/manu-vem.mp3"

edge-tts --voice pt-BR-ThalitaMultilingualNeural --rate="+8%" --pitch="+5Hz" \
  --text "Quase cinco anos!" \
  --write-media "$OUT/manu-quase.mp3"

# João (~5 anos) — tom mais agudo
edge-tts --voice pt-BR-AntonioNeural --rate="+15%" --pitch="+25Hz" \
  --text "Uau! É pra mim?" \
  --write-media "$OUT/joao-uau.mp3"

echo "Vozes geradas em $OUT"
ls -la "$OUT"
