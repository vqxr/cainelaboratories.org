/* ══════════════════════════════════════════════════════════
   Bloomsbury Burger Therapeutics — Main Script
   ══════════════════════════════════════════════════════════ */

// ── SCROLL REVEALS ─────────────────────────────────────────
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ── SCROLL-SPY FOR SIDEBAR ─────────────────────────────────
function initScrollSpy() {
  const sections = document.querySelectorAll('section[id]');
  const navItems = document.querySelectorAll('.nav-item[href^="#"]');
  if (!sections.length || !navItems.length) return;

  const spy = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        navItems.forEach(n => n.classList.remove('active'));
        const match = document.querySelector(`.nav-item[href="#${e.target.id}"]`);
        if (match) match.classList.add('active');
      }
    });
  }, { threshold: 0.3 });

  sections.forEach(s => spy.observe(s));
}
initScrollSpy();

// ── SMOOTH SCROLL ──────────────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const target = document.querySelector(a.getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    a.classList.add('active');
  });
});

// ── FAQ TOGGLE ─────────────────────────────────────────────
window.toggle = function(el) {
  el.parentElement.classList.toggle('open');
};

// ── TYPING ANIMATION ───────────────────────────────────────
function typeLines(containerId, lines, delay = 60) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let lineIdx = 0;
  let charIdx = 0;

  function typeNext() {
    if (lineIdx >= lines.length) {
      // Add blinking cursor at end
      const cursor = document.createElement('span');
      cursor.className = 'cursor';
      container.appendChild(cursor);
      return;
    }

    const line = lines[lineIdx];
    let el = container.querySelector(`[data-line="${lineIdx}"]`);
    if (!el) {
      el = document.createElement('div');
      el.className = 't-line';
      el.dataset.line = lineIdx;
      container.appendChild(el);
    }

    if (charIdx < line.text.length) {
      el.innerHTML = line.prefix + line.text.slice(0, charIdx + 1);
      charIdx++;
      setTimeout(typeNext, delay);
    } else {
      lineIdx++;
      charIdx = 0;
      setTimeout(typeNext, 300);
    }
  }

  setTimeout(typeNext, 400);
}

// ── COUNTER ANIMATION ──────────────────────────────────────
function animateCounter(el, target, suffix = '', duration = 1500) {
  const start = performance.now();
  const isFloat = !Number.isInteger(target);

  function update(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = eased * target;
    el.textContent = isFloat ? current.toFixed(1) : Math.round(current).toLocaleString();
    if (progress < 1) requestAnimationFrame(update);
    else el.textContent = (isFloat ? target.toFixed(1) : target.toLocaleString()) + suffix;
  }
  requestAnimationFrame(update);
}

function initCounters() {
  const counters = document.querySelectorAll('[data-counter]');
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const el = e.target;
        const target = parseFloat(el.dataset.counter);
        const suffix = el.dataset.suffix || '';
        animateCounter(el, target, suffix);
        obs.unobserve(el);
      }
    });
  }, { threshold: 0.5 });
  counters.forEach(c => obs.observe(c));
}
initCounters();

// ── SCORE BAR ANIMATION ────────────────────────────────────
function animateScoreBars() {
  const fills = document.querySelectorAll('.score-fill[data-width]');
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.width = e.target.dataset.width + '%';
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.5 });
  fills.forEach(f => obs.observe(f));
}
animateScoreBars();

// ── LOAD & RENDER CANDIDATE PAIRS ─────────────────────────
async function loadPairs() {
  const container = document.getElementById('pairs-container');
  if (!container) return;

  try {
    const res = await fetch('./assets/top_pairs.json');
    const pairs = await res.json();
    renderPairs(pairs, container);
  } catch (e) {
    // Fallback data
    renderPairs([
      { rank:1, markerA:'PTPRC', markerB:'EPCAM', specificity_score:0.97, safety_score:0.99, combined_score:0.981, tabula_clear:true, scfv_available:true },
      { rank:2, markerA:'MUC16', markerB:'FOLR1', specificity_score:0.94, safety_score:0.97, combined_score:0.951, tabula_clear:true, scfv_available:true },
      { rank:3, markerA:'CDH1',  markerB:'VTCN1', specificity_score:0.91, safety_score:0.96, combined_score:0.923, tabula_clear:true, scfv_available:false },
    ], container);
  }
}

function renderPairs(pairs, container) {
  container.innerHTML = '';
  pairs.forEach((p, i) => {
    const div = document.createElement('div');
    div.className = `pair-card reveal${i === 0 ? ' top' : ''}`;
    div.style.animationDelay = `${i * 0.08}s`;
    div.innerHTML = `
      <div class="pair-header">
        <span class="pair-rank">RANK #${p.rank}</span>
        <div style="display:flex;gap:6px;align-items:center;">
          ${p.tabula_clear ? '<span class="tag green" style="font-size:10px;">✓ Tabula clear</span>' : '<span class="tag pink" style="font-size:10px;">✗ Tabula flag</span>'}
          ${p.scfv_available ? '<span class="tag blue" style="font-size:10px;">✓ scFv exists</span>' : '<span class="tag yellow" style="font-size:10px;">? scFv needed</span>'}
        </div>
      </div>
      <div class="pair-markers" style="margin-bottom:16px;">
        <span class="gene">${p.markerA}</span>
        <span class="and">AND</span>
        <span class="gene">${p.markerB}</span>
      </div>
      <div class="pair-scores">
        <div class="score-row">
          <span class="score-label">Specificity</span>
          <div class="score-bar"><div class="score-fill spec" data-width="${p.specificity_score*100}" style="width:0%"></div></div>
          <span class="score-val">${p.specificity_score.toFixed(2)}</span>
        </div>
        <div class="score-row">
          <span class="score-label">Safety</span>
          <div class="score-bar"><div class="score-fill safe" data-width="${p.safety_score*100}" style="width:0%"></div></div>
          <span class="score-val">${p.safety_score.toFixed(2)}</span>
        </div>
        <div class="score-row">
          <span class="score-label">Combined</span>
          <div class="score-bar"><div class="score-fill comb" data-width="${p.combined_score*100}" style="width:0%"></div></div>
          <span class="score-val">${p.combined_score.toFixed(3)}</span>
        </div>
      </div>`;
    container.appendChild(div);
    revealObserver.observe(div);
    // animate bars
    setTimeout(() => {
      div.querySelectorAll('.score-fill[data-width]').forEach(f => {
        f.style.transition = 'width 1.2s cubic-bezier(0.4,0,0.2,1)';
        f.style.width = f.dataset.width + '%';
      });
    }, 300 + i * 150);
  });
}

loadPairs();

// ── UMAP CANVAS MOCK ───────────────────────────────────────
function drawUMAP(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  // Background
  ctx.fillStyle = '#0a0a0b';
  ctx.fillRect(0, 0, W, H);

  // Grid lines
  ctx.strokeStyle = '#1a1a1d';
  ctx.lineWidth = 0.5;
  for (let x = 0; x < W; x += 30) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for (let y = 0; y < H; y += 30) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

  // Clusters
  const clusters = [
    { cx: 0.25, cy: 0.3,  r: 0.1,  n: 80,  color: '#ff4d6d', label: 'Ectopic Lesion' },
    { cx: 0.65, cy: 0.25, r: 0.08, n: 60,  color: '#74b3ff', label: 'Eutopic' },
    { cx: 0.55, cy: 0.65, r: 0.09, n: 70,  color: '#52d48a', label: 'Control' },
    { cx: 0.3,  cy: 0.7,  r: 0.06, n: 40,  color: '#c77dff', label: 'Stromal' },
    { cx: 0.8,  cy: 0.6,  r: 0.05, n: 30,  color: '#ffd166', label: 'Immune' },
  ];

  function gaussianRand() {
    let u=0, v=0;
    while (!u) u = Math.random();
    while (!v) v = Math.random();
    return Math.sqrt(-2*Math.log(u)) * Math.cos(2*Math.PI*v);
  }

  clusters.forEach(cl => {
    // Glow
    const grd = ctx.createRadialGradient(cl.cx*W, cl.cy*H, 0, cl.cx*W, cl.cy*H, cl.r*W*1.5);
    grd.addColorStop(0, cl.color + '22');
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(cl.cx*W, cl.cy*H, cl.r*W*1.5, 0, Math.PI*2);
    ctx.fill();

    // Points
    for (let i = 0; i < cl.n; i++) {
      const px = cl.cx*W + gaussianRand() * cl.r * W;
      const py = cl.cy*H + gaussianRand() * cl.r * H;
      ctx.globalAlpha = 0.6 + Math.random() * 0.4;
      ctx.fillStyle = cl.color;
      ctx.beginPath();
      ctx.arc(px, py, 1.8, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Label
    ctx.fillStyle = cl.color;
    ctx.font = '9px DM Mono, monospace';
    ctx.fillText(cl.label, cl.cx*W - 20, cl.cy*H - cl.r*H - 8);
  });
}

// ── LOSS CURVE CANVAS ──────────────────────────────────────
function drawLossCurve(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const PAD = { top: 20, right: 20, bottom: 36, left: 50 };
  const IW = W - PAD.left - PAD.right;
  const IH = H - PAD.top - PAD.bottom;

  ctx.fillStyle = '#0a0a0b';
  ctx.fillRect(0, 0, W, H);

  // Grid
  ctx.strokeStyle = '#1e1e20';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = PAD.top + (IH / 4) * i;
    ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(W - PAD.right, y); ctx.stroke();
  }

  // Generate synthetic loss curve
  const steps = 200;
  const pts = [];
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const val = 2.8 * Math.exp(-4.5 * t) + 0.18 + 0.04 * Math.sin(t * 40) * Math.exp(-3 * t) + 0.005 * (Math.random() - 0.5);
    pts.push(val);
  }
  const maxVal = Math.max(...pts);
  const minVal = Math.min(...pts) - 0.05;

  function toCanvas(i, v) {
    return {
      x: PAD.left + (i / (steps - 1)) * IW,
      y: PAD.top + (1 - (v - minVal) / (maxVal - minVal)) * IH
    };
  }

  // Draw line
  ctx.strokeStyle = '#ff4d6d';
  ctx.lineWidth = 2;
  ctx.shadowBlur = 8;
  ctx.shadowColor = '#ff4d6d';
  ctx.beginPath();
  pts.forEach((v, i) => {
    const { x, y } = toCanvas(i, v);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Fill under
  const grad = ctx.createLinearGradient(0, PAD.top, 0, H - PAD.bottom);
  grad.addColorStop(0, 'rgba(255,77,109,0.15)');
  grad.addColorStop(1, 'rgba(255,77,109,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  pts.forEach((v, i) => {
    const { x, y } = toCanvas(i, v);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.lineTo(PAD.left + IW, H - PAD.bottom);
  ctx.lineTo(PAD.left, H - PAD.bottom);
  ctx.closePath();
  ctx.fill();

  // Convergence line
  const convX = PAD.left + IW * 0.65;
  ctx.strokeStyle = '#ffd16688';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(convX, PAD.top); ctx.lineTo(convX, H - PAD.bottom); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#ffd166';
  ctx.font = '9px DM Mono, monospace';
  ctx.fillText('convergence', convX + 4, PAD.top + 14);

  // Axes labels
  ctx.fillStyle = '#5a5a62';
  ctx.font = '9px DM Mono, monospace';
  ctx.fillText('0', PAD.left - 16, H - PAD.bottom + 3);
  ctx.fillText('200', PAD.left + IW - 8, H - PAD.bottom + 12);
  ctx.save();
  ctx.translate(14, PAD.top + IH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('L(θ)', -12, 0);
  ctx.restore();
  ctx.fillText('optimisation step', PAD.left + IW / 2 - 40, H - 6);
}

// ── HISTOGRAM MOCK ─────────────────────────────────────────
function drawHistogram(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const PAD = { top: 16, right: 16, bottom: 36, left: 42 };
  const IW = W - PAD.left - PAD.right;
  const IH = H - PAD.top - PAD.bottom;

  ctx.fillStyle = '#0a0a0b';
  ctx.fillRect(0, 0, W, H);

  // synthetic gene count distribution (log-normal-ish)
  const bins = 30;
  const heights = [];
  for (let i = 0; i < bins; i++) {
    const x = i / bins;
    // bimodal: dead cells peak low, cells peak higher
    const v1 = 0.3 * Math.exp(-((x - 0.08) ** 2) / 0.003);
    const v2 = Math.exp(-((x - 0.45) ** 2) / 0.025);
    heights.push(Math.max(0, v1 + v2 + 0.05 * (Math.random() - 0.5)));
  }
  const maxH = Math.max(...heights);

  const bw = IW / bins;
  const threshold = 0.2; // fraction along x

  heights.forEach((h, i) => {
    const bx = PAD.left + i * bw;
    const bh = (h / maxH) * IH;
    const by = PAD.top + IH - bh;
    const filtered = (i / bins) < threshold;
    ctx.fillStyle = filtered ? 'rgba(255,77,109,0.4)' : 'rgba(116,179,255,0.5)';
    ctx.strokeStyle = filtered ? '#ff4d6d' : '#74b3ff';
    ctx.lineWidth = 0.5;
    ctx.fillRect(bx + 1, by, bw - 2, bh);
    ctx.strokeRect(bx + 1, by, bw - 2, bh);
  });

  // Threshold line
  const tx = PAD.left + threshold * IW;
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.beginPath(); ctx.moveTo(tx, PAD.top); ctx.lineTo(tx, PAD.top + IH); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#ffd166';
  ctx.font = '9px DM Mono, monospace';
  ctx.fillText('threshold', tx + 3, PAD.top + 10);

  // Labels
  ctx.fillStyle = '#5a5a62';
  ctx.font = '9px DM Mono, monospace';
  ctx.fillText('gene count / cell', PAD.left + IW / 2 - 30, H - 4);
  ctx.fillStyle = '#ff4d6d88';
  ctx.font = '8px DM Mono, monospace';
  ctx.fillText('filtered', PAD.left + 4, PAD.top + IH - 4);
  ctx.fillStyle = '#74b3ff88';
  ctx.fillText('kept', PAD.left + threshold * IW + 6, PAD.top + IH - 4);
}

// ── INIT CHARTS ────────────────────────────────────────────
window.addEventListener('load', () => {
  drawUMAP('umap-canvas');
  drawLossCurve('loss-canvas');
  drawHistogram('hist-canvas');
});

// ── PIPELINE PAGE NAVIGATION ───────────────────────────────
window.selectPipeStep = function(idx) {
  document.querySelectorAll('.pipe-step-content').forEach((el, i) => {
    el.style.display = i === idx ? 'block' : 'none';
  });
  document.querySelectorAll('.pipe-nav-item').forEach((el, i) => {
    el.classList.toggle('active', i === idx);
  });
};

// ── CONSOLE STATUS SIMULATION ──────────────────────────────
function initConsoleStatus() {
  const el = document.getElementById('optimisation-status');
  if (!el) return;
  const states = ['running...', 'running...', 'running...', 'converged ✓'];
  let i = 0;
  const interval = setInterval(() => {
    if (i < states.length) { el.textContent = states[i++]; }
    else clearInterval(interval);
  }, 900);
}
initConsoleStatus();
