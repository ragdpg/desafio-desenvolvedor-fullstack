(() => {
  const DURATION = 60;
  const stage = document.getElementById("stage");
  const scenes = {
    title: document.getElementById("scene-title"),
    decorate: document.getElementById("scene-decorate"),
    cake: document.getElementById("scene-cake"),
    surprise: document.getElementById("scene-surprise"),
    celebrate: document.getElementById("scene-celebrate"),
    end: document.getElementById("scene-end"),
  };
  const bubbles = {
    shh: document.getElementById("bubble-shh"),
    vem: document.getElementById("bubble-vem"),
    uau: document.getElementById("bubble-uau"),
    quase: document.getElementById("bubble-quase"),
  };
  const parabensText = document.getElementById("parabens-text");
  const confetti = document.getElementById("confetti");
  const progressBar = document.getElementById("progress-bar");
  const timeLabel = document.getElementById("time-label");
  const btnPlay = document.getElementById("btn-play");

  const audioFiles = {
    abertura: "assets/audio/narracao-abertura.mp3",
    shh: "assets/audio/manu-shh.mp3",
    vem: "assets/audio/manu-vem.mp3",
    uau: "assets/audio/joao-uau.mp3",
    quase: "assets/audio/manu-quase.mp3",
    parabens: "assets/audio/narracao-parabens.mp3",
    final: "assets/audio/narracao-final.mp3",
  };

  const players = {};
  for (const [key, src] of Object.entries(audioFiles)) {
    const a = new Audio(src);
    a.preload = "auto";
    players[key] = a;
  }

  let startTs = null;
  let raf = null;
  let playing = false;
  const fired = new Set();

  function fmt(t) {
    const s = Math.max(0, Math.min(DURATION, Math.floor(t)));
    return `0:${String(s).padStart(2, "0")}`;
  }

  function setScene(name) {
    Object.values(scenes).forEach((el) => el.classList.remove("active"));
    if (scenes[name]) scenes[name].classList.add("active");
    if (name === "title" || name === "end") {
      stage.classList.remove("has-bg");
    } else {
      stage.classList.add("has-bg");
    }
  }

  function showBubble(key, on) {
    if (!bubbles[key]) return;
    bubbles[key].classList.toggle("show", on);
  }

  function playOnce(key) {
    if (fired.has(key)) return;
    fired.add(key);
    const a = players[key];
    if (!a) return;
    a.currentTime = 0;
    a.play().catch(() => {});
  }

  function spawnConfetti() {
    if (fired.has("confetti")) return;
    fired.add("confetti");
    confetti.innerHTML = "";
    const colors = ["#ff7a6e", "#ffd56a", "#2eb8a0", "#7ec8e8", "#ff9ad5"];
    for (let i = 0; i < 48; i++) {
      const p = document.createElement("div");
      p.className = "confetti-piece";
      p.style.left = `${Math.random() * 100}%`;
      p.style.background = colors[i % colors.length];
      p.style.animationDuration = `${2.2 + Math.random() * 2.2}s`;
      p.style.animationDelay = `${Math.random() * 0.8}s`;
      p.style.transform = `rotate(${Math.random() * 360}deg)`;
      confetti.appendChild(p);
    }
  }

  function applyTimeline(t) {
    // Scenes
    if (t < 6) setScene("title");
    else if (t < 18) setScene("decorate");
    else if (t < 30) setScene("cake");
    else if (t < 45) setScene("surprise");
    else if (t < 55) setScene("celebrate");
    else setScene("end");

    // Bubbles
    showBubble("shh", t >= 8 && t < 16);
    showBubble("vem", t >= 21 && t < 28);
    showBubble("uau", t >= 33 && t < 39);
    showBubble("quase", t >= 39 && t < 44);
    parabensText.classList.toggle("show", t >= 46 && t < 54);

    // Audio cues
    if (t >= 0.3) playOnce("abertura");
    if (t >= 8) playOnce("shh");
    if (t >= 21) playOnce("vem");
    if (t >= 33) playOnce("uau");
    if (t >= 39) playOnce("quase");
    if (t >= 46) {
      playOnce("parabens");
      spawnConfetti();
    }
    if (t >= 55) playOnce("final");

    progressBar.style.width = `${(t / DURATION) * 100}%`;
    timeLabel.textContent = `${fmt(t)} / 1:00`;
  }

  function tick(now) {
    if (!playing) return;
    if (startTs == null) startTs = now;
    const t = (now - startTs) / 1000;
    if (t >= DURATION) {
      applyTimeline(DURATION);
      stop(false);
      btnPlay.textContent = "▶ Assistir de novo";
      btnPlay.disabled = false;
      return;
    }
    applyTimeline(t);
    raf = requestAnimationFrame(tick);
  }

  function stopAudio() {
    Object.values(players).forEach((a) => {
      a.pause();
      a.currentTime = 0;
    });
  }

  function stop(resetVisual = true) {
    playing = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    startTs = null;
    stopAudio();
    if (resetVisual) {
      fired.clear();
      confetti.innerHTML = "";
      Object.keys(bubbles).forEach((k) => showBubble(k, false));
      parabensText.classList.remove("show");
      setScene("title");
      progressBar.style.width = "0%";
      timeLabel.textContent = "0:00 / 1:00";
    }
  }

  function start() {
    stop(true);
    playing = true;
    btnPlay.disabled = true;
    btnPlay.textContent = "▶ Tocando…";
    // soft background music via Web Audio
    startBedMusic();
    raf = requestAnimationFrame(tick);
  }

  let musicCtx = null;
  let musicNodes = [];

  function startBedMusic() {
    try {
      musicCtx = new (window.AudioContext || window.webkitAudioContext)();
      const master = musicCtx.createGain();
      master.gain.value = 0.045;
      master.connect(musicCtx.destination);

      const notes = [261.63, 329.63, 392.0, 523.25, 392.0, 329.63];
      let t0 = musicCtx.currentTime + 0.05;
      for (let bar = 0; bar < 20; bar++) {
        notes.forEach((freq, i) => {
          const osc = musicCtx.createOscillator();
          const g = musicCtx.createGain();
          osc.type = "triangle";
          osc.frequency.value = freq;
          g.gain.setValueAtTime(0, t0 + i * 0.45);
          g.gain.linearRampToValueAtTime(0.7, t0 + i * 0.45 + 0.05);
          g.gain.exponentialRampToValueAtTime(0.001, t0 + i * 0.45 + 0.4);
          osc.connect(g);
          g.connect(master);
          osc.start(t0 + i * 0.45);
          osc.stop(t0 + i * 0.45 + 0.42);
          musicNodes.push(osc);
        });
        t0 += notes.length * 0.45;
      }
    } catch (_) {
      /* ignore */
    }
  }

  function stopBedMusic() {
    if (musicCtx) {
      musicCtx.close().catch(() => {});
      musicCtx = null;
      musicNodes = [];
    }
  }

  const originalStop = stop;
  stop = function (resetVisual = true) {
    stopBedMusic();
    originalStop(resetVisual);
  };

  btnPlay.addEventListener("click", () => {
    if (playing) return;
    start();
  });

  // Auto-start for recording / autoplay query
  const params = new URLSearchParams(location.search);
  if (params.has("record") || params.has("autoplay")) {
    document.body.classList.add("recording");
    // browsers may block audio until gesture; try anyway
    const tryStart = () => start();
    window.addEventListener("load", () => {
      setTimeout(tryStart, 400);
    });
    // click fallback for headed recording tools
    document.body.addEventListener(
      "click",
      () => {
        if (!playing) start();
      },
      { once: true }
    );
  } else {
    setScene("title");
  }

  /** Seek to time t (seconds) without wall-clock playback — for frame export */
  function seek(t) {
    playing = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    startTs = null;
    stopAudio();
    stopBedMusic();
    fired.clear();
    confetti.innerHTML = "";
    // Pre-mark audio cues so playOnce no-ops during export
    ["abertura", "shh", "vem", "uau", "quase", "parabens", "final", "confetti"].forEach(
      (k) => fired.add(k)
    );
    if (t >= 46) {
      fired.delete("confetti");
      spawnConfetti();
    }
    applyTimeline(t);
  }

  // Expose for external recorders
  window.__JOAO_MANU__ = { start, stop, seek, DURATION };
})();
