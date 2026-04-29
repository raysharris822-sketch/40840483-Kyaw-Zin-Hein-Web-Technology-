/* ============================================================
   SOUNDBOARD X — script.js
   Features:
   - Animated canvas background (video-style)
   - Audio visualizer canvas
   - Particle burst on click
   - Favorites with localStorage
   - Search / filter
   - Loop, Shuffle toggles
   - Equalizer bars animation
   - Spinning disc animation
   - Playback speed
   - Stop / Replay buttons
   - Volume %
   - Toast notifications
   - Keyboard shortcuts (Space, ↑↓, R, L)
   - Play counter
============================================================ */

// ===== DATA =====
const categories = { anime: 12, phrase: 12, laugh: 12, music: 12, game: 12 };

let currentAudio   = null;
let activeButton   = null;
let activeCategory = "anime";
let isLooping      = false;
let showFavsOnly   = false;
let favorites      = JSON.parse(localStorage.getItem("sb_favs") || "{}");
let playCount      = parseInt(localStorage.getItem("sb_plays") || "0");

// ===== DOM REFS =====
const soundboard       = document.getElementById("soundboard");
const categoryButtons  = document.querySelectorAll(".category-btn");
const playBtn          = document.getElementById("playBtn");
const pauseBtn         = document.getElementById("pauseBtn");
const stopBtn          = document.getElementById("stopBtn");
const replayBtn        = document.getElementById("replayBtn");
const volumeSlider     = document.getElementById("volumeSlider");
const progressBar      = document.getElementById("progressBar");
const progressFill     = document.getElementById("progressFill");
const currentTimeEl    = document.getElementById("currentTime");
const totalTimeEl      = document.getElementById("totalTime");
const nowPlayingEl     = document.getElementById("nowPlaying");
const nowPlayingSubEl  = document.getElementById("nowPlayingSub");
const volPercentEl     = document.getElementById("volPercent");
const speedSelect      = document.getElementById("speedSelect");
const searchInput      = document.getElementById("searchInput");
const clearSearchBtn   = document.getElementById("clearSearch");
const loopBtn          = document.getElementById("loopBtn");
const favsOnlyBtn      = document.getElementById("favsOnlyBtn");
const eqBars           = document.getElementById("eqBars");
const spinDisc         = document.getElementById("spinDisc");
const favCountEl       = document.getElementById("favCount");
const playCountEl      = document.getElementById("playCount");
const toastEl          = document.getElementById("toast");
const particleLayer    = document.getElementById("particles");

// ===== CANVAS BACKGROUND =====
const bgCanvas = document.getElementById("bgCanvas");
const bgCtx    = bgCanvas.getContext("2d");

function resizeBg() {
  bgCanvas.width  = window.innerWidth;
  bgCanvas.height = window.innerHeight;
}
resizeBg();
window.addEventListener("resize", resizeBg);

// Wave nodes
const waveNodes = Array.from({ length: 6 }, (_, i) => ({
  freq: 0.0004 + i * 0.0002,
  amp:  40 + i * 20,
  phase: Math.random() * Math.PI * 2,
  speed: 0.3 + Math.random() * 0.4,
  y:    0.2 + (i / 6) * 0.7,
  color: i % 2 === 0 ? "#ffd700" : "#c9a800"
}));

// Floating orbs
const orbs = Array.from({ length: 5 }, () => ({
  x: Math.random() * window.innerWidth,
  y: Math.random() * window.innerHeight,
  r: 80 + Math.random() * 120,
  vx: (Math.random() - 0.5) * 0.3,
  vy: (Math.random() - 0.5) * 0.3,
  alpha: 0.03 + Math.random() * 0.05
}));

let bgTime = 0;
let beatScale = 1;

function drawBackground() {
  bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
  bgTime += 0.01;

  // Floating glowing orbs
  orbs.forEach(orb => {
    orb.x += orb.vx;
    orb.y += orb.vy;
    if (orb.x < -orb.r) orb.x = bgCanvas.width + orb.r;
    if (orb.x > bgCanvas.width + orb.r) orb.x = -orb.r;
    if (orb.y < -orb.r) orb.y = bgCanvas.height + orb.r;
    if (orb.y > bgCanvas.height + orb.r) orb.y = -orb.r;

    const grad = bgCtx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r);
    grad.addColorStop(0, `rgba(255, 215, 0, ${orb.alpha})`);
    grad.addColorStop(1, "transparent");
    bgCtx.fillStyle = grad;
    bgCtx.beginPath();
    bgCtx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
    bgCtx.fill();
  });

  // Horizontal scan lines
  for (let y = 0; y < bgCanvas.height; y += 6) {
    bgCtx.fillStyle = "rgba(0, 0, 0, 0.05)";
    bgCtx.fillRect(0, y, bgCanvas.width, 1);
  }

  // Animated sine waves
  waveNodes.forEach((wave, wi) => {
    bgCtx.beginPath();
    const baseY = bgCanvas.height * wave.y;
    const extraAmp = currentAudio && !currentAudio.paused ? 30 : 0;
    bgCtx.moveTo(0, baseY);

    for (let x = 0; x <= bgCanvas.width; x += 4) {
      const y = baseY
        + Math.sin(x * wave.freq + bgTime * wave.speed + wave.phase) * (wave.amp + extraAmp)
        + Math.sin(x * wave.freq * 2.3 + bgTime * wave.speed * 0.6) * (wave.amp * 0.3);
      bgCtx.lineTo(x, y);
    }

    bgCtx.strokeStyle = wave.color;
    bgCtx.globalAlpha = currentAudio && !currentAudio.paused ? 0.12 : 0.05;
    bgCtx.lineWidth   = 1.5;
    bgCtx.stroke();
    bgCtx.globalAlpha = 1;
  });

  // Grid overlay
  bgCtx.strokeStyle = "rgba(255, 215, 0, 0.03)";
  bgCtx.lineWidth = 0.5;
  for (let x = 0; x < bgCanvas.width; x += 60) {
    bgCtx.beginPath();
    bgCtx.moveTo(x, 0);
    bgCtx.lineTo(x, bgCanvas.height);
    bgCtx.stroke();
  }
  for (let y = 0; y < bgCanvas.height; y += 60) {
    bgCtx.beginPath();
    bgCtx.moveTo(0, y);
    bgCtx.lineTo(bgCanvas.width, y);
    bgCtx.stroke();
  }

  requestAnimationFrame(drawBackground);
}
drawBackground();

// ===== AUDIO VISUALIZER =====
const vizCanvas = document.getElementById("visualizer");
const vizCtx    = vizCanvas.getContext("2d");
let analyser    = null;
let audioCtx    = null;
let sourceNode  = null;
let dataArray   = null;
let vizAnimId   = null;

function setupAnalyser(audio) {
  if (audioCtx) {
    try { audioCtx.close(); } catch(e) {}
  }
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  analyser  = audioCtx.createAnalyser();
  analyser.fftSize = 64;
  sourceNode = audioCtx.createMediaElementSource(audio);
  sourceNode.connect(analyser);
  analyser.connect(audioCtx.destination);
  dataArray  = new Uint8Array(analyser.frequencyBinCount);
}

function drawVisualizer() {
  vizAnimId = requestAnimationFrame(drawVisualizer);
  vizCanvas.width  = vizCanvas.offsetWidth;
  vizCanvas.height = vizCanvas.offsetHeight;
  vizCtx.clearRect(0, 0, vizCanvas.width, vizCanvas.height);

  if (!analyser || !currentAudio || currentAudio.paused) {
    // idle sine wave
    vizCtx.strokeStyle = "rgba(255, 215, 0, 0.2)";
    vizCtx.lineWidth = 1.5;
    vizCtx.beginPath();
    const t = Date.now() / 800;
    for (let x = 0; x < vizCanvas.width; x++) {
      const y = vizCanvas.height / 2 + Math.sin(x * 0.05 + t) * 4;
      x === 0 ? vizCtx.moveTo(x, y) : vizCtx.lineTo(x, y);
    }
    vizCtx.stroke();
    return;
  }

  analyser.getByteFrequencyData(dataArray);
  const barCount = dataArray.length;
  const barW     = vizCanvas.width / barCount;

  for (let i = 0; i < barCount; i++) {
    const val    = dataArray[i] / 255;
    const barH   = val * vizCanvas.height;
    const hue    = 42 + val * 15;   // gold range: ~42–57°
    const grd    = vizCtx.createLinearGradient(0, vizCanvas.height, 0, vizCanvas.height - barH);
    grd.addColorStop(0, `hsla(${hue}, 100%, 45%, 0.95)`);
    grd.addColorStop(1, `hsla(${hue + 10}, 100%, 80%, 0.3)`);
    vizCtx.fillStyle = grd;
    vizCtx.fillRect(i * barW + 1, vizCanvas.height - barH, barW - 2, barH);
  }

  // Center line
  vizCtx.strokeStyle = "rgba(255,215,0,0.15)";
  vizCtx.lineWidth = 1;
  vizCtx.beginPath();
  vizCtx.moveTo(0, vizCanvas.height / 2);
  vizCtx.lineTo(vizCanvas.width, vizCanvas.height / 2);
  vizCtx.stroke();
}
drawVisualizer();

// ===== PARTICLES =====
function spawnParticles(x, y, count = 12) {
  for (let i = 0; i < count; i++) {
    const p  = document.createElement("div");
    p.classList.add("particle");
    const size  = 4 + Math.random() * 6;
    const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
    const dist  = 40 + Math.random() * 60;
    p.style.cssText = `
      width: ${size}px; height: ${size}px;
      left: ${x}px; top: ${y}px;
      --tx: ${Math.cos(angle) * dist}px;
      --ty: ${Math.sin(angle) * dist}px;
      opacity: 1;
    `;
    particleLayer.appendChild(p);
    setTimeout(() => p.remove(), 1000);
  }
}

// ===== TOAST =====
let toastTimeout;
function showToast(msg) {
  clearTimeout(toastTimeout);
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  toastTimeout = setTimeout(() => toastEl.classList.remove("show"), 2200);
}

// ===== STATS =====
function updateStats() {
  const favCount = Object.values(favorites).filter(Boolean).length;
  favCountEl.textContent  = `★ ${favCount} favs`;
  playCountEl.textContent = `▶ ${playCount} plays`;
}
updateStats();

// ===== EQ BARS =====
function setEqActive(active) {
  eqBars.classList.toggle("active", active);
  eqBars.classList.toggle("idle",   !active);
}
setEqActive(false);

// ===== DISC SPIN =====
function setDiscSpin(spinning) {
  spinDisc.classList.toggle("spinning", spinning);
}

// ===== LOAD CATEGORY =====
function loadCategory(category) {
  activeCategory = category;
  soundboard.innerHTML = "";
  soundboard.classList.remove("switching");
  void soundboard.offsetWidth; // reflow
  soundboard.classList.add("switching");

  const total   = categories[category];
  const query   = searchInput.value.toLowerCase().trim();

  for (let i = 1; i <= total; i++) {
    const label = `${category.toUpperCase()} ${i}`;
    const favKey = `${category}_${i}`;

    if (query && !label.toLowerCase().includes(query)) continue;
    if (showFavsOnly && !favorites[favKey]) continue;

    const button = document.createElement("button");
    button.classList.add("sound-button");
    button.dataset.index   = i;
    button.dataset.favkey  = favKey;
    button.dataset.label   = label;
    button.style.animationDelay = `${(i - 1) * 35}ms`;

    // Number display
    const numSpan = document.createElement("span");
    numSpan.classList.add("btn-num");
    numSpan.textContent = i;

    // Label
    const labelSpan = document.createElement("span");
    labelSpan.textContent = label;

    // Fav star
    const star = document.createElement("span");
    star.classList.add("fav-star");
    star.textContent = "★";
    if (favorites[favKey]) star.classList.add("active");

    star.addEventListener("click", (e) => {
      e.stopPropagation();
      favorites[favKey] = !favorites[favKey];
      if (!favorites[favKey]) delete favorites[favKey];
      localStorage.setItem("sb_favs", JSON.stringify(favorites));
      star.classList.toggle("active", !!favorites[favKey]);
      showToast(favorites[favKey] ? `⭐ Added to favourites!` : `☆ Removed from favourites`);
      updateStats();
      if (showFavsOnly) loadCategory(category);
    });

    button.appendChild(star);
    button.appendChild(numSpan);
    button.appendChild(labelSpan);

    // Create audio
    const ext = (category === "game" || category === "music" || category === "laugh") ? "wav" : "mp3";
    const audio = new Audio(`sounds/${category}${i}.${ext}`);
    audio.loop  = isLooping;

    button.addEventListener("click", (e) => {
      // Particles
      const rect = button.getBoundingClientRect();
      spawnParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, 14);

      // Ripple
      button.classList.remove("ripple");
      void button.offsetWidth;
      button.classList.add("ripple");

      playSound(audio, button, label, category, i);
    });

    soundboard.appendChild(button);
  }
}

// ===== PLAY SOUND =====
function playSound(audio, button, label, category, index) {
  if (currentAudio && currentAudio !== audio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }

  if (activeButton) activeButton.classList.remove("playing");

  // Try to set up analyser (may fail due to CORS on local files; graceful fallback)
  try {
    if (!sourceNode || currentAudio !== audio) {
      setupAnalyser(audio);
    }
  } catch(e) {}

  currentAudio          = audio;
  currentAudio.volume   = parseFloat(volumeSlider.value);
  currentAudio.loop     = isLooping;
  currentAudio.playbackRate = parseFloat(speedSelect.value);
  activeButton          = button;

  button.classList.add("playing");
  setEqActive(true);
  setDiscSpin(true);

  currentAudio.play().catch(() => {});

  nowPlayingEl.textContent    = label;
  nowPlayingSubEl.textContent = `Category: ${category.toUpperCase()} · Speed: ${speedSelect.value}×`;

  playCount++;
  localStorage.setItem("sb_plays", playCount);
  updateStats();

  currentAudio.onended = () => {
    if (!isLooping) {
      button.classList.remove("playing");
      setEqActive(false);
      setDiscSpin(false);
      nowPlayingEl.textContent    = "No Sound Selected";
      nowPlayingSubEl.textContent = "Pick a category and press a button";
    }
  };
}

// ===== DEFAULT LOAD =====
loadCategory("anime");

// ===== CATEGORY BUTTONS =====
categoryButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }
    activeButton = null;
    currentAudio = null;
    setEqActive(false);
    setDiscSpin(false);
    nowPlayingEl.textContent    = "No Sound Selected";
    nowPlayingSubEl.textContent = "Pick a category and press a button";
    progressFill.style.width    = "0%";
    currentTimeEl.textContent   = "0:00";
    totalTimeEl.textContent     = "0:00";

    categoryButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    loadCategory(btn.getAttribute("data-category"));
  });
});

// ===== PLAYBACK CONTROLS =====
playBtn.addEventListener("click", () => {
  if (currentAudio) {
    currentAudio.play();
    setEqActive(true);
    setDiscSpin(true);
  }
});

pauseBtn.addEventListener("click", () => {
  if (currentAudio) {
    currentAudio.pause();
    setEqActive(false);
    setDiscSpin(false);
  }
});

stopBtn.addEventListener("click", () => {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    setEqActive(false);
    setDiscSpin(false);
    if (activeButton) activeButton.classList.remove("playing");
    nowPlayingEl.textContent    = "No Sound Selected";
    nowPlayingSubEl.textContent = "Pick a category and press a button";
    progressFill.style.width    = "0%";
  }
});

replayBtn.addEventListener("click", () => {
  if (currentAudio) {
    currentAudio.currentTime = 0;
    currentAudio.play();
    setEqActive(true);
    setDiscSpin(true);
    showToast("🔄 Replaying from start");
  }
});

// ===== VOLUME =====
volumeSlider.addEventListener("input", () => {
  const v = parseFloat(volumeSlider.value);
  if (currentAudio) currentAudio.volume = v;
  volPercentEl.textContent = `${Math.round(v * 100)}%`;
});

// ===== SPEED =====
speedSelect.addEventListener("change", () => {
  if (currentAudio) {
    currentAudio.playbackRate = parseFloat(speedSelect.value);
    if (activeButton) {
      nowPlayingSubEl.textContent = `Category: ${activeCategory.toUpperCase()} · Speed: ${speedSelect.value}×`;
    }
    showToast(`⚡ Speed: ${speedSelect.value}×`);
  }
});

// ===== PROGRESS BAR =====
setInterval(() => {
  if (currentAudio && !isNaN(currentAudio.duration) && currentAudio.duration > 0) {
    const pct = (currentAudio.currentTime / currentAudio.duration) * 100;
    progressBar.value              = pct || 0;
    progressFill.style.width       = `${pct || 0}%`;
    currentTimeEl.textContent      = formatTime(currentAudio.currentTime);
    totalTimeEl.textContent        = formatTime(currentAudio.duration);
  }
}, 200);

progressBar.addEventListener("input", () => {
  if (currentAudio && !isNaN(currentAudio.duration)) {
    currentAudio.currentTime = (progressBar.value / 100) * currentAudio.duration;
  }
});

// ===== LOOP =====
loopBtn.addEventListener("click", () => {
  isLooping = !isLooping;
  loopBtn.classList.toggle("on", isLooping);
  if (currentAudio) currentAudio.loop = isLooping;
  showToast(isLooping ? "🔁 Loop ON" : "🔁 Loop OFF");
});

// ===== FAVS ONLY =====
favsOnlyBtn.addEventListener("click", () => {
  showFavsOnly = !showFavsOnly;
  favsOnlyBtn.classList.toggle("on", showFavsOnly);
  loadCategory(activeCategory);
  showToast(showFavsOnly ? "★ Showing favourites only" : "★ Showing all sounds");
});

// ===== SEARCH =====
searchInput.addEventListener("input", () => loadCategory(activeCategory));
clearSearchBtn.addEventListener("click", () => {
  searchInput.value = "";
  loadCategory(activeCategory);
  searchInput.focus();
});

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener("keydown", (e) => {
  const tag = document.activeElement.tagName;
  if (tag === "INPUT" || tag === "SELECT") return;

  switch (e.code) {
    case "Space":
      e.preventDefault();
      if (currentAudio) {
        if (currentAudio.paused) {
          currentAudio.play(); setEqActive(true); setDiscSpin(true);
          showToast("▶ Playing");
        } else {
          currentAudio.pause(); setEqActive(false); setDiscSpin(false);
          showToast("⏸ Paused");
        }
      }
      break;

    case "ArrowUp":
      e.preventDefault();
      volumeSlider.value = Math.min(1, parseFloat(volumeSlider.value) + 0.05).toFixed(2);
      if (currentAudio) currentAudio.volume = volumeSlider.value;
      volPercentEl.textContent = `${Math.round(volumeSlider.value * 100)}%`;
      showToast(`🔊 Volume: ${Math.round(volumeSlider.value * 100)}%`);
      break;

    case "ArrowDown":
      e.preventDefault();
      volumeSlider.value = Math.max(0, parseFloat(volumeSlider.value) - 0.05).toFixed(2);
      if (currentAudio) currentAudio.volume = volumeSlider.value;
      volPercentEl.textContent = `${Math.round(volumeSlider.value * 100)}%`;
      showToast(`🔉 Volume: ${Math.round(volumeSlider.value * 100)}%`);
      break;

    case "KeyR":
      if (currentAudio) {
        currentAudio.currentTime = 0;
        currentAudio.play();
        setEqActive(true); setDiscSpin(true);
        showToast("🔄 Replayed");
      }
      break;

    case "KeyL":
      loopBtn.click();
      break;
  }
});

// ===== HELPERS =====
function formatTime(secs) {
  if (isNaN(secs)) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}