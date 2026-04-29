/* ============================================================
   shared.js — animated canvas background used on all pages
============================================================ */

const bgCanvas = document.getElementById("bgCanvas");
const bgCtx    = bgCanvas.getContext("2d");

function resizeBg() {
  bgCanvas.width  = window.innerWidth;
  bgCanvas.height = window.innerHeight;
}
resizeBg();
window.addEventListener("resize", resizeBg);

const waveNodes = Array.from({ length: 6 }, (_, i) => ({
  freq:  0.0004 + i * 0.0002,
  amp:   40 + i * 20,
  phase: Math.random() * Math.PI * 2,
  speed: 0.3 + Math.random() * 0.4,
  y:     0.2 + (i / 6) * 0.7,
  color: i % 2 === 0 ? "#ffd700" : "#c9a800"
}));

const orbs = Array.from({ length: 5 }, () => ({
  x:     Math.random() * window.innerWidth,
  y:     Math.random() * window.innerHeight,
  r:     80 + Math.random() * 120,
  vx:    (Math.random() - 0.5) * 0.3,
  vy:    (Math.random() - 0.5) * 0.3,
  alpha: 0.03 + Math.random() * 0.05
}));

let bgTime = 0;

function drawBackground() {
  bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
  bgTime += 0.01;

  // Floating orbs
  orbs.forEach(orb => {
    orb.x += orb.vx;
    orb.y += orb.vy;
    if (orb.x < -orb.r) orb.x = bgCanvas.width  + orb.r;
    if (orb.x > bgCanvas.width  + orb.r) orb.x = -orb.r;
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

  // Scan lines
  for (let y = 0; y < bgCanvas.height; y += 6) {
    bgCtx.fillStyle = "rgba(0,0,0,0.05)";
    bgCtx.fillRect(0, y, bgCanvas.width, 1);
  }

  // Sine waves
  waveNodes.forEach(wave => {
    bgCtx.beginPath();
    const baseY = bgCanvas.height * wave.y;
    bgCtx.moveTo(0, baseY);
    for (let x = 0; x <= bgCanvas.width; x += 4) {
      const y = baseY
        + Math.sin(x * wave.freq + bgTime * wave.speed + wave.phase) * wave.amp
        + Math.sin(x * wave.freq * 2.3 + bgTime * wave.speed * 0.6) * (wave.amp * 0.3);
      bgCtx.lineTo(x, y);
    }
    bgCtx.strokeStyle  = wave.color;
    bgCtx.globalAlpha  = 0.06;
    bgCtx.lineWidth    = 1.5;
    bgCtx.stroke();
    bgCtx.globalAlpha  = 1;
  });

  // Grid
  bgCtx.strokeStyle = "rgba(255,215,0,0.025)";
  bgCtx.lineWidth   = 0.5;
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