// Hero canvas — animated G-code toolpath visualization
// Draws procedural toolpaths that evoke 3D printing / CNC / pen plotting

(function () {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W, H, dpr;
  let paths = [];
  let t = 0;
  let animId = null;

  function resize() {
    const hero = canvas.parentElement;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = hero.offsetWidth;
    H = hero.offsetHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Simple seeded PRNG (mulberry32)
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let tt = Math.imul(seed ^ seed >>> 15, 1 | seed);
      tt = tt + Math.imul(tt ^ tt >>> 7, 61 | tt) ^ tt;
      return ((tt ^ tt >>> 14) >>> 0) / 4294967296;
    };
  }

  // --- Toolpath generators ---

  function spiralPath(rng, cx, cy) {
    const pts = [];
    const rStart = 3;
    const rEnd = 25 + rng() * 55;
    const turns = 3 + rng() * 6;
    const count = 180 + Math.floor(rng() * 120);
    for (let i = 0; i <= count; i++) {
      const frac = i / count;
      const angle = frac * turns * Math.PI * 2;
      const r = rStart + (rEnd - rStart) * frac;
      pts.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
    }
    return pts;
  }

  function zigzagFill(rng, cx, cy) {
    const pts = [];
    const w = 40 + rng() * 100;
    const h = 30 + rng() * 60;
    const lines = 6 + Math.floor(rng() * 10);
    const lineH = h / lines;
    const x0 = cx - w / 2, y0 = cy - h / 2;
    for (let i = 0; i < lines; i++) {
      const y = y0 + i * lineH;
      if (i % 2 === 0) {
        pts.push({ x: x0, y }, { x: x0 + w, y });
      } else {
        pts.push({ x: x0 + w, y }, { x: x0, y });
      }
    }
    return pts;
  }

  function gearProfile(rng, cx, cy) {
    const pts = [];
    const r = 15 + rng() * 35;
    const teeth = 8 + Math.floor(rng() * 14);
    const depth = 3 + rng() * 7;
    const steps = teeth * 4;
    for (let i = 0; i <= steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const phase = i % 4;
      const rr = (phase < 2) ? r + depth : r - depth;
      pts.push({ x: cx + Math.cos(angle) * rr, y: cy + Math.sin(angle) * rr });
    }
    return pts;
  }

  function perimeterShells(rng, cx, cy) {
    // Concentric rectangles — like perimeter shells in slicing
    const pts = [];
    const size = 18 + rng() * 35;
    const shells = 3 + Math.floor(rng() * 3);
    for (let s = 0; s < shells; s++) {
      const d = size - s * 5;
      if (d < 3) break;
      pts.push(
        { x: cx - d, y: cy - d },
        { x: cx + d, y: cy - d },
        { x: cx + d, y: cy + d },
        { x: cx - d, y: cy + d },
        { x: cx - d, y: cy - d },
      );
    }
    return pts;
  }

  function blobContour(rng, cx, cy) {
    const pts = [];
    const r = 18 + rng() * 40;
    const harmonics = 3 + Math.floor(rng() * 5);
    const n = 80 + Math.floor(rng() * 60);
    // Random amplitude/phase for each harmonic
    const amps = [], phases = [];
    for (let h = 0; h < harmonics; h++) {
      amps.push(0.05 + rng() * 0.12);
      phases.push(rng() * Math.PI * 2);
    }
    for (let i = 0; i <= n; i++) {
      const angle = (i / n) * Math.PI * 2;
      let rr = r;
      for (let h = 0; h < harmonics; h++) {
        rr += r * amps[h] * Math.sin(angle * (h + 2) + phases[h]);
      }
      pts.push({ x: cx + Math.cos(angle) * rr, y: cy + Math.sin(angle) * rr });
    }
    return pts;
  }

  function hexInfill(rng, cx, cy) {
    const pts = [];
    const radius = 18 + rng() * 35;
    const spacing = 5 + rng() * 4;
    const rows = Math.ceil(radius * 2 / spacing);
    for (let r = 0; r < rows; r++) {
      const y = cy - radius + r * spacing;
      const dy = y - cy;
      const dx = Math.sqrt(Math.max(0, radius * radius - dy * dy));
      if (r % 2 === 0) {
        pts.push({ x: cx - dx, y }, { x: cx + dx, y });
      } else {
        pts.push({ x: cx + dx, y }, { x: cx - dx, y });
      }
    }
    return pts;
  }

  // --- Grid background ---

  function drawGrid() {
    const spacing = 40;
    ctx.strokeStyle = 'rgba(108, 140, 255, 0.025)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let x = spacing; x < W; x += spacing) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
    }
    for (let y = spacing; y < H; y += spacing) {
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
    }
    ctx.stroke();
  }

  // --- Generate paths ---

  function generatePaths() {
    paths = [];
    const rng = mulberry32(77);

    const colors = [
      { stroke: 'rgba(108, 140, 255, 0.13)', head: 'rgba(108, 140, 255, 0.6)', glow: 'rgba(108, 140, 255, 0.2)' },
      { stroke: 'rgba(108, 140, 255, 0.09)', head: 'rgba(108, 140, 255, 0.5)', glow: 'rgba(108, 140, 255, 0.15)' },
      { stroke: 'rgba(244, 114, 182, 0.08)', head: 'rgba(244, 114, 182, 0.5)', glow: 'rgba(244, 114, 182, 0.15)' },
      { stroke: 'rgba(74, 222, 128, 0.08)',  head: 'rgba(74, 222, 128, 0.5)',  glow: 'rgba(74, 222, 128, 0.15)' },
      { stroke: 'rgba(34, 211, 238, 0.09)',  head: 'rgba(34, 211, 238, 0.5)',  glow: 'rgba(34, 211, 238, 0.15)' },
    ];

    const generators = [spiralPath, zigzagFill, gearProfile, perimeterShells, blobContour, hexInfill];

    // Generate ~22 toolpaths scattered across the hero
    const count = 20 + Math.floor(rng() * 6);
    for (let i = 0; i < count; i++) {
      // Distribute centers across the full canvas area
      const cx = W * 0.05 + rng() * W * 0.9;
      const cy = H * 0.05 + rng() * H * 0.9;
      const gen = generators[Math.floor(rng() * generators.length)];
      const pts = gen(rng, cx, cy);
      if (pts.length < 2) continue;

      const color = colors[Math.floor(rng() * colors.length)];

      paths.push({
        points: pts,
        color,
        lineWidth: 0.8 + rng() * 1.0,
        speed: 0.5 + rng() * 1.5,
        progress: 0,
        delay: i * 8 + rng() * 60, // stagger: each starts ~8 frames after prior
      });
    }
  }

  // --- Rapid travel line (G0 move) ---

  function drawTravelLine(from, to, alpha) {
    ctx.save();
    ctx.setLineDash([4, 6]);
    ctx.strokeStyle = `rgba(108, 140, 255, ${0.06 * alpha})`;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.restore();
  }

  // --- Animate ---

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Subtle grid
    drawGrid();

    let prevEnd = null;

    for (let pi = 0; pi < paths.length; pi++) {
      const path = paths[pi];
      if (t < path.delay) {
        // Draw travel line to next path start when it's about to begin
        if (prevEnd && t >= path.delay - 10) {
          const alpha = 1 - (path.delay - t) / 10;
          drawTravelLine(prevEnd, path.points[0], alpha);
        }
        continue;
      }

      const elapsed = t - path.delay;
      path.progress = Math.min(path.points.length, elapsed * path.speed);

      if (path.progress < 2) continue;

      const drawCount = Math.floor(path.progress);
      const isActive = drawCount < path.points.length;

      // Draw travel line from previous path end to this path start
      if (prevEnd) {
        drawTravelLine(prevEnd, path.points[0], 1);
      }

      // Draw the toolpath
      ctx.beginPath();
      ctx.moveTo(path.points[0].x, path.points[0].y);
      for (let i = 1; i < drawCount; i++) {
        ctx.lineTo(path.points[i].x, path.points[i].y);
      }

      // Partial segment for smooth head
      let headPos;
      if (isActive) {
        const frac = path.progress - drawCount;
        const p0 = path.points[drawCount - 1];
        const p1 = path.points[drawCount];
        headPos = { x: p0.x + (p1.x - p0.x) * frac, y: p0.y + (p1.y - p0.y) * frac };
        ctx.lineTo(headPos.x, headPos.y);
      }

      ctx.strokeStyle = path.color.stroke;
      ctx.lineWidth = path.lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Nozzle head glow + dot
      if (isActive && headPos) {
        // Outer glow
        const grad = ctx.createRadialGradient(headPos.x, headPos.y, 0, headPos.x, headPos.y, 8);
        grad.addColorStop(0, path.color.glow);
        grad.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(headPos.x, headPos.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Bright center dot
        ctx.beginPath();
        ctx.arc(headPos.x, headPos.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = path.color.head;
        ctx.fill();
      }

      // Track end position for travel lines
      if (drawCount >= path.points.length) {
        prevEnd = path.points[path.points.length - 1];
      } else if (headPos) {
        prevEnd = headPos;
      }
    }

    t++;

    const allDone = paths.every(p => t >= p.delay && p.progress >= p.points.length);
    if (!allDone) {
      animId = requestAnimationFrame(draw);
    }
  }

  // --- Init ---

  function init() {
    if (animId) cancelAnimationFrame(animId);
    resize();
    generatePaths();
    t = 0;
    animId = requestAnimationFrame(draw);
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(init, 200);
  });

  init();
})();
