# João e Manu — Ep.1: O Aniversário Surpresa

Animação infantil 2D (~60s) com voz em português. Manu (11) prepara a festa surpresa dos quase 5 anos do João (4).

## Assistir

- **Player no navegador (recomendado):** [`player.html`](player.html)
- **MP4 1080p (30 fps, H.264 Main):** [`output/joao-e-manu-ep1.mp4`](output/joao-e-manu-ep1.mp4)
- **MP4 720p (Baseline, mais compatível):** [`output/joao-e-manu-ep1-720p.mp4`](output/joao-e-manu-ep1-720p.mp4)
- **Animação interativa:** [`index.html`](index.html)

```bash
cd animacao-joao-e-manu
python3 -m http.server 8765
# Player: http://127.0.0.1:8765/player.html
# Interativa: http://127.0.0.1:8765/
```

> Se o arquivo baixado do GitHub não abrir no Windows, use o **720p** ou abra pelo `player.html` no navegador.

## Regenerar vozes e mix

```bash
pip install edge-tts
bash scripts/gerar-vozes.sh
bash scripts/mixar-audio.sh
```

## Reexportar o MP4

Com o servidor HTTP rodando na porta 8765 e `puppeteer-core` instalado na raiz do repo:

```bash
node animacao-joao-e-manu/scripts/export-frames.mjs
```

## Estrutura

- `index.html` / `styles.css` / `script.js` — player e timeline de 60s
- `assets/images/` — personagens e cenário
- `assets/audio/` — falas TTS (PT-BR via edge-tts)
- `output/joao-e-manu-ep1.mp4` — episódio final
- `scripts/` — geração de voz, mix e export de frames
