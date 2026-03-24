"use client";

import { useEffect, useRef } from "react";

// _____________________________Types____________________________

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  type: "coccus" | "bacillus";
  pulse: number;
  pulseSpeed: number;
  opacity: number;
}

interface Connection {
  a: number;
  b: number;
  opacity: number;
}

// _____________________________Constants____________________________

const TEAL = { r: 74, g: 184, b: 160 };
const BLUE = { r: 26, g: 122, b: 212 };
const BG = "#040d18";

const MIC_ZONES = [
  { label: "S (Sensible)", color: "rgba(15,110,86,0.28)", from: 0.06, to: 0.43 },
  { label: "I", color: "rgba(110,74,15,0.28)", from: 0.43, to: 0.56 },
  { label: "R (Resistente)", color: "rgba(110,15,15,0.28)", from: 0.56, to: 1.0 },
];

const TABLE_ROWS = [
  "Microorganism     │ Antibiotic     │ MIC S≤  │ MIC R≥",
  "S. pneumoniae     │ Penicillin     │  0.06   │  2.0",
  "E. coli           │ Amoxicillin    │  8.0    │  32.0",
  "K. pneumoniae     │ Meropenem      │  2.0    │  8.0",
  "S. aureus         │ Vancomycin     │  2.0    │  —",
  "P. aeruginosa     │ Ciprofloxacin  │  0.5    │  1.0",
];

// _____________________________Helpers____________________________

function rgba(col: { r: number; g: number; b: number }, a: number) {
  return `rgba(${col.r},${col.g},${col.b},${a})`;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

// _____________________________Component____________________________

export default function BackgroundCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const nodesRef = useRef<Node[]>([]);
  const connectionsRef = useRef<Connection[]>([]);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // _____________________________Resize____________________________
    function resize() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx!.scale(window.devicePixelRatio, window.devicePixelRatio);
      initNodes();
    }

    // _____________________________Init nodes____________________________
    function initNodes() {
      if (!canvas) return;
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      const count = Math.floor((W * H) / 22000); // density scales with viewport

      nodesRef.current = Array.from({ length: Math.max(count, 18) }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        r: Math.random() < 0.6 ? lerp(3, 7, Math.random()) : lerp(5, 10, Math.random()),
        type: Math.random() < 0.55 ? "coccus" : "bacillus",
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: lerp(0.008, 0.022, Math.random()),
        opacity: lerp(0.5, 0.9, Math.random()),
      }));

      // Build connections for nearby nodes
      const nodes = nodesRef.current;
      const conns: Connection[] = [];
      const maxDist = Math.min(W, H) * 0.22;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxDist) {
            conns.push({ a: i, b: j, opacity: lerp(0.08, 0.28, 1 - dist / maxDist) });
          }
        }
      }
      connectionsRef.current = conns;
    }

    // _____________________________ DNA helix____________________________
    function drawHelix(W: number, H: number, t: number) {
      if (!ctx) return;
      const x1 = W * 0.88;
      const x2 = W * 0.93;
      const amplitude = W * 0.025;
      const period = H * 0.18;
      const steps = 80;

      ctx.save();
      ctx.globalAlpha = 0.13;

      // Strand 1 (teal)
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const y = (i / steps) * H;
        const x = x1 + Math.sin((y / period) * Math.PI * 2 + t * 0.4) * amplitude;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = rgba(TEAL, 0.7);
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Strand 2 (blue)
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const y = (i / steps) * H;
        const x = x2 + Math.sin((y / period) * Math.PI * 2 + t * 0.4 + Math.PI) * amplitude;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = rgba(BLUE, 0.7);
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Base pairs (rungs)
      ctx.strokeStyle = rgba(TEAL, 0.5);
      ctx.lineWidth = 0.8;
      for (let i = 0; i < 10; i++) {
        const y = (i / 9) * H * 0.9 + H * 0.05;
        const sx1 = x1 + Math.sin((y / period) * Math.PI * 2 + t * 0.4) * amplitude;
        const sx2 = x2 + Math.sin((y / period) * Math.PI * 2 + t * 0.4 + Math.PI) * amplitude;
        ctx.beginPath();
        ctx.moveTo(sx1, y);
        ctx.lineTo(sx2, y);
        ctx.stroke();
      }
      ctx.restore();
    }

    // _____________________________Draw grid____________________________
    function drawGrid(W: number, H: number) {
      if (!ctx) return;
      const step = 80;
      ctx.save();
      ctx.strokeStyle = rgba(TEAL, 0.055);
      ctx.lineWidth = 0.5;
      for (let x = 0; x < W; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y < H; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
      ctx.restore();
    }

    // ___________________ Draw MIC scale _____________________
    function drawMicScale(W: number, H: number) {
      if (!ctx) return;
      const y = H - 44;
      const x0 = W * 0.05;
      const x1 = W * 0.75;
      const scaleW = x1 - x0;
      const barH = 12;

      ctx.save();
      ctx.globalAlpha = 0.38;

      // Zone fills
      for (const z of MIC_ZONES) {
        ctx.fillStyle = z.color;
        const zx = x0 + z.from * scaleW;
        const zw = (z.to - z.from) * scaleW;
        ctx.beginPath();
        ctx.roundRect(zx, y, zw, barH, 2);
        ctx.fill();
      }

      // Baseline
      ctx.strokeStyle = rgba(TEAL, 0.4);
      ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(x0, y + barH / 2); ctx.lineTo(x1, y + barH / 2); ctx.stroke();

      // Breakpoint markers
      const bp1x = x0 + 0.43 * scaleW;
      const bp2x = x0 + 0.56 * scaleW;
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgba(196,160,61,0.85)";
      ctx.beginPath(); ctx.moveTo(bp1x, y - 4); ctx.lineTo(bp1x, y + barH + 4); ctx.stroke();
      ctx.strokeStyle = "rgba(196,74,61,0.85)";
      ctx.beginPath(); ctx.moveTo(bp2x, y - 4); ctx.lineTo(bp2x, y + barH + 4); ctx.stroke();

      // MIC labels
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = rgba(TEAL, 1);
      ctx.font = `700 8px monospace`;
      const labels = ["0.001", "0.01", "0.1", "1", "8", "32", "≥128"];
      labels.forEach((l, i) => {
        ctx.fillText(l, x0 + (i / (labels.length - 1)) * scaleW - 6, y + barH + 14);
      });

      // Zone text
      ctx.font = "700 8px monospace";
      ctx.fillStyle = rgba(TEAL, 1);
      ctx.fillText("S", x0 + 0.1 * scaleW, y + 9);
      ctx.fillStyle = "rgba(196,160,61,0.9)";
      ctx.fillText("I", x0 + 0.485 * scaleW, y + 9);
      ctx.fillStyle = "rgba(196,74,61,0.9)";
      ctx.fillText("R", x0 + 0.72 * scaleW, y + 9);

      ctx.restore();
    }

    // _____________________________Draw data table ghost_____________________________
    function drawTableGhost(W: number) {
      if (!ctx) return;
      const tx = W * 0.28;
      ctx.save();
      ctx.globalAlpha = 0.085;
      ctx.fillStyle = rgba(TEAL, 1);
      ctx.font = "600 8.5px monospace";
      TABLE_ROWS.forEach((row, i) => {
        ctx.fillText(row, tx, 52 + i * 14);
      });
      // Separator line
      ctx.strokeStyle = rgba(TEAL, 0.6);
      ctx.lineWidth = 0.4;
      ctx.beginPath(); ctx.moveTo(tx, 57); ctx.lineTo(tx + W * 0.45, 57); ctx.stroke();
      ctx.restore();
    }

    // _____________________________Draw corner markers_____________________________
    function drawCorners(W: number, H: number) {
      if (!ctx) return;
      const len = 18;
      const pad = 12;
      ctx.save();
      ctx.strokeStyle = rgba(TEAL, 0.2);
      ctx.lineWidth = 0.9;
      const corners = [
        [[pad, pad + len], [pad, pad], [pad + len, pad]],
        [[W - pad, pad + len], [W - pad, pad], [W - pad - len, pad]],
        [[pad, H - pad - len], [pad, H - pad], [pad + len, H - pad]],
        [[W - pad, H - pad - len], [W - pad, H - pad], [W - pad - len, H - pad]],
      ] as [number, number][][];
      for (const pts of corners) {
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        ctx.lineTo(pts[1][0], pts[1][1]);
        ctx.lineTo(pts[2][0], pts[2][1]);
        ctx.stroke();
      }
      ctx.restore();
    }

    // _____________________________Draw bacterial nodes_____________________________
    function drawNodes(t: number) {
      if (!ctx || !canvas) return;
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      const nodes = nodesRef.current;
      const conns = connectionsRef.current;

      // Update positions
      nodes.forEach((n) => {
        n.x += n.vx;
        n.y += n.vy;
        n.pulse += n.pulseSpeed;
        if (n.x < -20) n.x = W + 20;
        if (n.x > W + 20) n.x = -20;
        if (n.y < -20) n.y = H + 20;
        if (n.y > H + 20) n.y = -20;
      });

      // Draw connections
      conns.forEach((c) => {
        const a = nodes[c.a];
        const b = nodes[c.b];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = Math.min(W, H) * 0.22;
        if (dist > maxDist) return;
        const alpha = c.opacity * (1 - dist / maxDist) * (0.7 + 0.3 * Math.sin(t * 0.5 + c.a));
        ctx!.save();
        ctx!.globalAlpha = alpha;
        ctx!.strokeStyle = rgba(TEAL, 0.9);
        ctx!.lineWidth = 0.6;
        ctx!.beginPath();
        ctx!.moveTo(a.x, a.y);
        ctx!.lineTo(b.x, b.y);
        ctx!.stroke();
        ctx!.restore();
      });

      // Draw nodes
      nodes.forEach((n) => {
        const pulse = 0.85 + 0.15 * Math.sin(n.pulse);
        const r = n.r * pulse;
        const alpha = n.opacity * (0.75 + 0.25 * Math.sin(n.pulse * 0.7));

        ctx!.save();
        ctx!.globalAlpha = alpha;

        if (n.type === "coccus") {
          // Glow
          const grad = ctx!.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 2.5);
          grad.addColorStop(0, rgba(TEAL, 0.35));
          grad.addColorStop(1, rgba(TEAL, 0));
          ctx!.fillStyle = grad;
          ctx!.beginPath();
          ctx!.arc(n.x, n.y, r * 2.5, 0, Math.PI * 2);
          ctx!.fill();
          // Core
          ctx!.fillStyle = `rgba(13,90,74,0.85)`;
          ctx!.strokeStyle = rgba(TEAL, 0.9);
          ctx!.lineWidth = 0.9;
          ctx!.beginPath();
          ctx!.arc(n.x, n.y, r, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.stroke();
        } else {
          // Bacillus (rod)
          ctx!.save();
          ctx!.translate(n.x, n.y);
          ctx!.rotate(n.pulse * 0.1);
          ctx!.fillStyle = `rgba(10,45,74,0.8)`;
          ctx!.strokeStyle = rgba(BLUE, 0.85);
          ctx!.lineWidth = 0.9;
          ctx!.beginPath();
          ctx!.ellipse(0, 0, r * 1.8, r * 0.7, 0, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.stroke();
          ctx!.restore();
        }

        ctx!.restore();
      });
    }

    // _____________________________Draw radial glows_____________________________
    function drawGlows(W: number, H: number, t: number) {
      if (!ctx) return;
      const glows = [
        { x: W * 0.22, y: H * 0.28, r: W * 0.38, col: TEAL, a: 0.12 + 0.04 * Math.sin(t * 0.3) },
        { x: W * 0.72, y: H * 0.65, r: W * 0.32, col: BLUE, a: 0.1 + 0.03 * Math.sin(t * 0.4 + 1) },
        { x: W * 0.58, y: H * 0.12, r: W * 0.22, col: TEAL, a: 0.08 + 0.03 * Math.sin(t * 0.5 + 2) },
      ];
      for (const g of glows) {
        const grad = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, g.r);
        grad.addColorStop(0, rgba(g.col, g.a));
        grad.addColorStop(1, rgba(g.col, 0));
        ctx.save();
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
    }

    // _____________________________Draw scanline_____________________________
    function drawScanline(H: number, t: number) {
      if (!ctx || !canvas) return;
      const W = canvas.offsetWidth;
      const y = ((t * 18) % (H + 4)) - 2;
      ctx.save();
      ctx.globalAlpha = 0.045;
      ctx.fillStyle = rgba(TEAL, 1);
      ctx.fillRect(0, y, W, 1.5);
      ctx.restore();
    }

    // _____________________________Main render loop_____________________________
    function render() {
      if (!canvas || !ctx) return;
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      timeRef.current += 0.016;
      const t = timeRef.current;

      ctx.clearRect(0, 0, W, H);

      // Background gradient
      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, "#030b16");
      bg.addColorStop(0.45, "#071426");
      bg.addColorStop(1, "#040d1a");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      drawGlows(W, H, t);
      drawGrid(W, H);
      drawTableGhost(W);
      drawNodes(t);
      drawHelix(W, H, t);
      drawMicScale(W, H);
      drawScanline(H, t);
      drawCorners(W, H);

      frameRef.current = requestAnimationFrame(render);
    }

    // _____________________________Init_____________________________
    resize();
    window.addEventListener("resize", resize);
    frameRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        background: BG,
        display: "block",
      }}
    />
  );
}