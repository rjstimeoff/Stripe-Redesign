"use client";

import { useEffect, useRef } from "react";

interface Props {
  activeIdx: number;
}

const STEM_COUNT = 260;
const COLOR = "232, 60, 130";
const MORPH_DURATION = 1200;

function smooth01(x: number) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return x * x * (3 - 2 * x);
}

// Mirror of ParticleLogo's wave-curve resampling so stems and dots stay aligned.
function buildArcUniformWavePoints(W: number, H: number, N: number) {
  const SAMPLES = 2000;
  const px = new Float32Array(SAMPLES + 1);
  const py = new Float32Array(SAMPLES + 1);
  for (let i = 0; i <= SAMPLES; i++) {
    const u = i / SAMPLES;
    const xAmp = (0.5 + 0.42 * u) * W * 0.44;
    px[i] = W * 0.5 + Math.sin(u * Math.PI * 3.4) * xAmp;
    py[i] = H * 0.15 + u * H * 0.65;
  }
  const cumLen = new Float32Array(SAMPLES + 1);
  for (let i = 1; i <= SAMPLES; i++) {
    const dx = px[i] - px[i - 1];
    const dy = py[i] - py[i - 1];
    cumLen[i] = cumLen[i - 1] + Math.sqrt(dx * dx + dy * dy);
  }
  const totalLen = cumLen[SAMPLES];
  const out: Array<{ cx: number; cy: number }> = new Array(N);
  let j = 0;
  for (let i = 0; i < N; i++) {
    const target = (i / (N - 1)) * totalLen;
    while (j < SAMPLES - 1 && cumLen[j + 1] < target) j++;
    const segLen = cumLen[j + 1] - cumLen[j];
    const t = segLen > 0 ? (target - cumLen[j]) / segLen : 0;
    out[i] = {
      cx: px[j] + (px[j + 1] - px[j]) * t,
      cy: py[j] + (py[j + 1] - py[j]) * t,
    };
  }
  return out;
}

// Match the converging-lines fade pattern: stems fade in only after dots have
// nearly arrived at state 1; fade out fast when leaving state 1.
function computeStemOpacity(currentState: number, prevState: number, morphProgress: number) {
  if (currentState === 1) return smooth01((morphProgress - 0.55) / 0.45);
  if (prevState === 1) return 1 - smooth01(morphProgress / 0.45);
  return 0;
}

export default function WaveStems({ activeIdx }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const kickRef = useRef<() => void>(() => {});
  const stateRef = useRef({
    current: activeIdx,
    prev: activeIdx,
    morphStart: performance.now() - MORPH_DURATION,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    let raf = 0;
    let visible = false;
    let W = 0;
    let H = 0;
    // Cache the wave-curve resample — only rebuild when canvas dimensions change.
    let cachedPoints: ReturnType<typeof buildArcUniformWavePoints> | null = null;

    // Cursor tracking — mirrors ParticleLogo's mouse setup so stems and dots see
    // the same repulsion field.
    const mouseState = { x: 0, y: 0, active: 0 };
    const smoothMouse = { x: 0, y: 0 };
    let smoothMouseActive = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      W = rect.width;
      H = rect.height;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cachedPoints = buildArcUniformWavePoints(W, H, STEM_COUNT);
    };

    const draw = (opacity: number) => {
      ctx.clearRect(0, 0, W, H);
      if (opacity <= 0) return;
      if (!cachedPoints) cachedPoints = buildArcUniformWavePoints(W, H, STEM_COUNT);
      const points = cachedPoints;
      for (let i = 0; i < STEM_COUNT; i++) {
        const { cx, cy } = points[i];
        // Cursor repulsion (mirrors ParticleLogo's vert shader): convert stem top
        // to NDC, push away from smoothed mouse, convert back to pixel space.
        let topX = cx;
        let topY = cy;
        if (smoothMouseActive > 0.001) {
          const ndcx = (cx / W) * 2 - 1;
          const ndcy = 1 - (cy / H) * 2;
          const dx = ndcx - smoothMouse.x;
          const dy = ndcy - smoothMouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0.0001) {
            const strength = Math.exp(-Math.pow(dist / 0.18, 2));
            const push = 0.035 * strength * smoothMouseActive;
            const newNdcx = ndcx + (dx / dist) * push;
            // Y amplified 6× to match ParticleLogo's state-1 push so stem tops
            // track the dramatically stretched/compressed dots.
            const newNdcy = ndcy + (dy / dist) * push * 6;
            topX = ((newNdcx + 1) * W) / 2;
            topY = ((1 - newNdcy) * H) / 2;
          }
        }
        // Depth proxy from original cy: cy = H*(0.15..0.80) → 0 (back) to 1 (front).
        const depth = (cy / H - 0.15) / 0.65;
        ctx.strokeStyle = `rgba(${COLOR}, ${(0.06 + depth * 0.18) * opacity})`;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(topX, topY);
        ctx.lineTo(cx, H);
        ctx.stroke();
      }
    };

    const loop = () => {
      const s = stateRef.current;
      const elapsed = performance.now() - s.morphStart;
      const progress = elapsed >= MORPH_DURATION ? 1 : elapsed / MORPH_DURATION;
      const opacity = computeStemOpacity(s.current, s.prev, progress);

      // Cursor smoothing — match ParticleLogo's lag (0.15 position, 0.10 active).
      const mouseTarget = mouseState.active * (s.current === 1 ? 1 : 0);
      smoothMouseActive += (mouseTarget - smoothMouseActive) * 0.1;
      smoothMouse.x += (mouseState.x - smoothMouse.x) * 0.15;
      smoothMouse.y += (mouseState.y - smoothMouse.y) * 0.15;

      draw(opacity);

      // Keep RAF alive while: morph in progress, state 1 active, or cursor decay
      // hasn't reached zero yet (so the bubble can ease out smoothly).
      const cursorAlive = smoothMouseActive > 0.001;
      if (progress < 1 || s.current === 1 || cursorAlive) {
        raf = requestAnimationFrame(loop);
      } else {
        raf = 0;
      }
    };

    kickRef.current = () => {
      if (visible && !raf) raf = requestAnimationFrame(loop);
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (
        e.clientX < rect.left || e.clientX > rect.right ||
        e.clientY < rect.top || e.clientY > rect.bottom
      ) {
        mouseState.active = 0;
        kickRef.current();
        return;
      }
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      mouseState.x = (px / rect.width) * 2 - 1;
      mouseState.y = 1 - (py / rect.height) * 2;
      mouseState.active = 1;
      kickRef.current();
    };

    resize();
    // Initial draw — settle at the right opacity for the starting state.
    const s = stateRef.current;
    draw(s.current === 1 ? 1 : 0);

    const onResize = () => {
      resize();
      const sr = stateRef.current;
      const elapsed = performance.now() - sr.morphStart;
      const progress = elapsed >= MORPH_DURATION ? 1 : elapsed / MORPH_DURATION;
      draw(computeStemOpacity(sr.current, sr.prev, progress));
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("mousemove", onMouseMove);

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !visible) {
          visible = true;
          kickRef.current();
        } else if (!entry.isIntersecting && visible) {
          visible = false;
          if (raf) cancelAnimationFrame(raf);
          raf = 0;
        }
      },
      { rootMargin: "200px" }
    );
    io.observe(canvas);

    return () => {
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  useEffect(() => {
    const s = stateRef.current;
    if (activeIdx === s.current) return;
    s.prev = s.current;
    s.current = activeIdx;
    s.morphStart = performance.now();
    kickRef.current();
  }, [activeIdx]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}
