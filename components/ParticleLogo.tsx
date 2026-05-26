"use client";

import { useRef, useEffect } from "react";
import { Renderer, Program, Mesh, Geometry, Transform } from "ogl";

const COUNT = 900;
const WAVE_VISIBLE = 260;
const MORPH_DURATION = 1200;
const MORPH_SPREAD = 0.45;

// State 0 ("One integration") — converging-lines visual.
const COL_X = 0.72;            // NDC x of left/right anchor columns (±)
const Y_RANGE = 0.85;          // half-height of the column / line spread
const Y_OFFSET = -0.12;        // vertical shift of the whole structure (negative = down in NDC)
const LEFT_DOTS = 50;          // dense left column (cycles)
const RIGHT_DOTS = 30;         // sparser right column (constant)
const N_LINES = LEFT_DOTS;     // one line originates per left dot
const SEGMENTS = 48;           // segments per curve (line resolution)
const CYCLE_TIME = 8.0;        // seconds per per-line lifecycle (birth → fade → dormant)

// Particle shaders ----------------------------------------------------------

const dotsVert = /* glsl */ `
  attribute vec2 aTargetFrom;
  attribute vec2 aTargetTo;
  attribute float aSeed;
  attribute float aLineId;
  attribute float aSide;       // -1 left, +1 right (only meaningful in state 0)
  attribute float aWaveVisible; // 1 = visible in state 1, 0 = hidden
  attribute float aWaveU;       // 0 = back of curve, 1 = front of curve
  uniform float uTime;
  uniform float uMorph;
  uniform float uMorphSpread;
  uniform float uDriftAmp;
  uniform float uDriftMix;
  uniform float uLifeMix;
  uniform float uSizeJitterMix;
  uniform float uLifecycleMix; // 1 = lifecycle drives visibility (state 0), 0 = always visible
  uniform float uWaveAlphaMix; // 1 during state 1
  uniform float uWaveBumpCenter; // u-position of the traveling bump pulse
  uniform vec2 uMouseNDC;        // cursor position in NDC
  uniform float uMouseRepelMix;  // 1 in state 2 + cursor inside canvas
  uniform float uCycleTime;
  uniform float uPointSize;
  uniform float uPixelRatio;
  varying float vSeed;
  varying float vLife;
  varying float vY;
  varying float vWaveVisible;
  varying float vBump;

  void main() {
    vSeed = aSeed;
    vWaveVisible = aWaveVisible;

    float delay = fract(aSeed * 13.71) * uMorphSpread;
    float local = clamp((uMorph - delay) / (1.0 - uMorphSpread), 0.0, 1.0);
    float eased = local * local * (3.0 - 2.0 * local);
    vec2 base = mix(aTargetFrom, aTargetTo, eased);

    float a = aSeed * 6.2831853;
    float speedJitter = 0.55 + 0.9 * fract(aSeed * 3.13);
    float ampJitter   = 0.45 + 1.1 * fract(aSeed * 5.71);
    vec2 drift = vec2(
      sin(uTime * 0.55 * speedJitter + a),
      cos(uTime * 0.73 * speedJitter + a * 1.37)
    ) * uDriftAmp * ampJitter * uDriftMix;

    // Traveling bump pulse: localized cluster of enlarged + raised + darkened dots,
    // origin near the front of the curve (u=1), dispersing as it travels back (u=0).
    float bumpDist = abs(aWaveU - uWaveBumpCenter);
    float bumpShape = exp(-pow(bumpDist / 0.035, 2.0));
    float fadeIn = 1.0 - smoothstep(1.0, 1.15, uWaveBumpCenter);
    float decay = clamp(uWaveBumpCenter, 0.0, 1.0);
    float bumpAmp = fadeIn * decay * decay;
    float bump = bumpShape * bumpAmp * uWaveAlphaMix;
    vBump = bump;

    vec2 bumpOffset = vec2(0.0, bump * 0.05);
    vec2 pos = base + drift + bumpOffset;

    // Cursor repulsion: gaussian falloff around the mouse, dots pushed outward.
    // State 0 — "book pages": dots also feel a reduced pull when the cursor is
    //   near their mirror partner (same y, opposite x column). Overall push reduced.
    // State 1 — Y component amplified so stems stretch and shorten dramatically.
    // State 2 — plain radial.
    vec2 toMouse = pos - uMouseNDC;
    float distMouse = length(toMouse);
    float ownStrength = exp(-pow(distMouse / 0.18, 2.0));
    vec2 repelDir = distMouse > 0.0001 ? toMouse / distMouse : vec2(0.0);
    vec2 partnerPos = vec2(-pos.x, pos.y);
    float partnerDist = length(partnerPos - uMouseNDC);
    float partnerStrength = exp(-pow(partnerDist / 0.18, 2.0)) * 0.65 * uLifecycleMix;
    float effStrength = max(ownStrength, partnerStrength);
    float pushAmount = mix(0.035, 0.030, uLifecycleMix);
    vec2 push = repelDir * pushAmount * effStrength * uMouseRepelMix;
    push.y *= mix(1.0, 6.0, uWaveAlphaMix);
    pos += push;

    vY = pos.y;
    gl_Position = vec4(pos, 0.0, 1.0);

    float sizeMul = mix(1.0, 0.8 + 0.4 * fract(aSeed * 7.31), uSizeJitterMix);

    // ----- Per-line lifecycle (state 0) -----
    float phase = fract(aLineId * 0.61803398875); // golden-ratio offset → evenly-but-randomly distributed phases
    float lc = mod(uTime / uCycleTime + phase, 1.0);

    const float BIRTH_END  = 0.04;
    const float EXTEND_END = 0.14;
    const float SETTLE_END = 0.72;
    const float FADE_END   = 0.82;
    // 0.82 → 1.00: dormant (invisible) — matches the line lifecycle so dots
    // and lines appear and disappear together.

    float lifecycleAlive = 0.0;
    float extension = 0.0;
    if (lc < BIRTH_END) {
      float t = lc / BIRTH_END;
      lifecycleAlive = smoothstep(0.0, 1.0, t);
      extension = 0.0;
    } else if (lc < EXTEND_END) {
      lifecycleAlive = 1.0;
      float t = (lc - BIRTH_END) / (EXTEND_END - BIRTH_END);
      extension = smoothstep(0.0, 1.0, t);
    } else if (lc < SETTLE_END) {
      lifecycleAlive = 1.0;
      extension = 1.0;
    } else if (lc < FADE_END) {
      float t = (lc - SETTLE_END) / (FADE_END - SETTLE_END);
      lifecycleAlive = 1.0 - smoothstep(0.0, 1.0, t);
      extension = 1.0;
    }

    // Left dot rotates through the lifecycle; right dot is always visible (the
    // "destination" anchors stay constant, the left side cycles).
    float isRight = step(0.0, aSide);
    float isLeft = 1.0 - isRight;
    float dotLifecycle = isLeft * lifecycleAlive + isRight;

    // Combine with the breathing-life envelope (used in states 1/2).
    float lifeSpeed = 0.25 + 0.45 * fract(aSeed * 9.71);
    float life = 0.5 + 0.5 * sin(uTime * lifeSpeed + aSeed * 17.3);
    float breathingLife = mix(1.0, smoothstep(0.10, 0.55, life), uLifeMix);

    vLife = mix(breathingLife, dotLifecycle, uLifecycleMix);

    // Size: scale by lifecycle in state 0 (dots grow into view).
    float lifecycleSizeScale = mix(1.0, dotLifecycle, uLifecycleMix);
    float bumpSizeBoost = 1.0 + bump * 0.9;
    gl_PointSize = uPointSize * uPixelRatio * sizeMul * lifecycleSizeScale * bumpSizeBoost;
  }
`;

const dotsFrag = /* glsl */ `
  precision highp float;
  uniform float uWaveAlphaMix; // 1 during state 1 — culls hidden dots so the curve doesn't read as solid
  varying float vSeed;
  varying float vLife;
  varying float vY;
  varying float vWaveVisible;
  varying float vBump;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float alpha = smoothstep(0.5, 0.18, d) * vLife;
    alpha *= mix(1.0, vWaveVisible, uWaveAlphaMix);
    if (alpha < 0.01) discard;
    vec3 pink   = vec3(0.950, 0.130, 0.420);
    vec3 color  = mix(pink, pink * 0.78, fract(vSeed * 3.7) * 0.45);
    // Darken dramatically inside the traveling bump.
    vec3 darkPink = vec3(0.42, 0.04, 0.20);
    color = mix(color, darkPink, vBump * 0.9);
    gl_FragColor = vec4(color, alpha);
  }
`;

// Line shaders --------------------------------------------------------------

const linesVert = /* glsl */ `
  attribute vec2 aPos;
  attribute float aT;
  attribute float aLineId;
  uniform float uTime;
  uniform float uCycleTime;
  uniform vec2 uMouseNDC;
  uniform float uMouseRepelMix;
  uniform float uLifecycleMix;
  varying float vT;
  varying float vLineId;
  varying float vY;
  varying float vSweepFront;       // x-position (in 0..1) where the bright sweep front is during extend
  varying float vOverlayMax;       // peak "active" brightness above baseline
  varying float vLifecycleAlive;   // 0 = dormant/invisible, 1 = fully on

  void main() {
    vT = aT;
    vLineId = aLineId;
    // Apply the same cursor repulsion as the dot vertex shader, weighted so
    // endpoints follow their dots while the t=0.5 convergence stays anchored.
    vec2 pos = aPos;
    vec2 toMouse = pos - uMouseNDC;
    float distMouse = length(toMouse);
    float ownStrength = exp(-pow(distMouse / 0.18, 2.0));
    vec2 repelDir = distMouse > 0.0001 ? toMouse / distMouse : vec2(0.0);
    vec2 partnerPos = vec2(-pos.x, pos.y);
    float partnerDist = length(partnerPos - uMouseNDC);
    float partnerStrength = exp(-pow(partnerDist / 0.18, 2.0)) * 0.65 * uLifecycleMix;
    float effStrength = max(ownStrength, partnerStrength);
    float endpointWeight = abs(2.0 * aT - 1.0);
    float pushAmount = mix(0.035, 0.030, uLifecycleMix);
    pos += repelDir * pushAmount * effStrength * uMouseRepelMix * endpointWeight;
    vY = pos.y;
    gl_Position = vec4(pos, 0.0, 1.0);

    float phase = fract(aLineId * 0.61803398875);
    float lc = mod(uTime / uCycleTime + phase, 1.0);

    const float BIRTH_END  = 0.04;
    const float EXTEND_END = 0.30;
    const float SETTLE_END = 0.72;
    const float FADE_END   = 0.82;

    // Line is gated by vLifecycleAlive: invisible during dormant, pops in during
    // birth, stays on through extend/settle, fades back out during fade. The
    // overlay adds the traveling bright sweep on top during extend.
    float sweepFront = 0.0;
    float overlayMax = 0.0;
    float lifecycleAlive = 0.0;
    if (lc < BIRTH_END) {
      sweepFront = 0.0;
      overlayMax = 0.0;
      lifecycleAlive = smoothstep(0.0, 1.0, lc / BIRTH_END);
    } else if (lc < EXTEND_END) {
      float t = (lc - BIRTH_END) / (EXTEND_END - BIRTH_END);
      // Piecewise quartic: slow at left, accelerates through middle, decelerates into right anchor.
      if (t < 0.5) {
        float t2 = t * t;
        sweepFront = 8.0 * t2 * t2;
      } else {
        float o = 1.0 - t;
        float o2 = o * o;
        sweepFront = 1.0 - 8.0 * o2 * o2;
      }
      overlayMax = 1.0;
      lifecycleAlive = 1.0;
    } else if (lc < SETTLE_END) {
      sweepFront = 1.0;
      overlayMax = 1.0;
      lifecycleAlive = 1.0;
    } else if (lc < FADE_END) {
      float t = (lc - SETTLE_END) / (FADE_END - SETTLE_END);
      sweepFront = 1.0;
      overlayMax = 1.0 - smoothstep(0.0, 1.0, t);
      lifecycleAlive = 1.0 - smoothstep(0.0, 1.0, t);
    } else {
      sweepFront = 0.0;
      overlayMax = 0.0;
      lifecycleAlive = 0.0;
    }
    vSweepFront = sweepFront;
    vOverlayMax = overlayMax;
    vLifecycleAlive = lifecycleAlive;
  }
`;

const linesFrag = /* glsl */ `
  precision highp float;
  varying float vT;
  varying float vLineId;
  varying float vY;
  varying float vSweepFront;
  varying float vOverlayMax;
  varying float vLifecycleAlive;
  uniform float uTime;
  uniform float uOpacity;
  uniform float uBaselineAlpha; // permanent thin-line opacity

  void main() {
    vec3 color = vec3(0.950, 0.130, 0.420);

    // Bright overlay covers vT ∈ [0, vSweepFront] at intensity vOverlayMax.
    // Soft edge so the sweep front isn't a hard line.
    float overlay = (1.0 - smoothstep(vSweepFront - 0.02, vSweepFront + 0.02, vT)) * vOverlayMax;

    // Subtle traveling pulse on the bright section adds life.
    float phase = fract(vLineId * 0.1573);
    float pulseT = fract(uTime * 0.22 + phase);
    float dist = abs(vT - pulseT);
    float pulse = exp(-pow(dist * 7.5, 2.0));
    overlay = clamp(overlay + 0.15 * pulse * vOverlayMax, 0.0, 1.0);

    // Asymmetric fade near the convergence: right side fades more.
    // Smoothly graduate the fade params across vT=0.5 so there's no visible seam.
    float rightWeight = smoothstep(0.40, 0.60, vT);
    float fadeFloor = mix(0.30, 0.15, rightWeight);
    float fadeRange = mix(0.09, 0.16, rightWeight);
    float centerFade = mix(fadeFloor, 1.0, smoothstep(0.0, fadeRange, abs(vT - 0.5)));
    float lineAlpha = max(uBaselineAlpha, overlay) * centerFade;
    float alpha = lineAlpha * uOpacity * vLifecycleAlive;
    if (alpha < 0.005) discard;
    gl_FragColor = vec4(color, alpha);
  }
`;

// Halton / targets ----------------------------------------------------------

function halton(i: number, b: number) {
  let f = 1;
  let r = 0;
  let k = i;
  while (k > 0) {
    f /= b;
    r += f * (k % b);
    k = Math.floor(k / b);
  }
  return r;
}

// Deterministic per-index jitter so spacing looks organic, not mechanical.
function jitteredY(idx: number, total: number): number {
  const t = (idx + 0.5) / total;
  const base = (t * 2 - 1) * Y_RANGE;
  const s = Math.sin(idx * 91.32 + 7.531) * 43758.5453;
  const r = s - Math.floor(s) - 0.5;
  const spacing = (2 * Y_RANGE) / total;
  return base + r * spacing * 0.6 + Y_OFFSET;
}
function uniformY(idx: number, total: number): number {
  return jitteredY(idx, total);
}
// Small horizontal jitter so the columns aren't ruler-straight.
const X_JITTER_LEFT  = 0.008; // NDC; tight left column
const X_JITTER_RIGHT = 0.025; // looser right column
function xJitter(idx: number, salt: number, amp: number): number {
  const s = Math.sin(idx * 53.71 + salt) * 43758.5453;
  return (s - Math.floor(s) - 0.5) * 2 * amp;
}

// State 0 — two vertical columns of anchor dots.
// Left side clusters at LEFT_DOTS positions; right side at RIGHT_DOTS positions (sparser).
function makeColumns(_W: number, _H: number, out: Float32Array) {
  const halfCount = COUNT / 2;
  const leftPerDot = halfCount / LEFT_DOTS;
  const rightPerDot = halfCount / RIGHT_DOTS;
  for (let i = 0; i < COUNT; i++) {
    const left = i < halfCount;
    const localIdx = left ? i : i - halfCount;
    let y: number;
    let x: number;
    if (left) {
      const dotIdx = Math.floor(localIdx / leftPerDot);
      y = uniformY(dotIdx, LEFT_DOTS);
      x = -COL_X + xJitter(dotIdx, 11.7, X_JITTER_LEFT);
    } else {
      const dotIdx = Math.floor(localIdx / rightPerDot);
      y = uniformY(dotIdx, RIGHT_DOTS);
      x = COL_X + xJitter(dotIdx, 29.3, X_JITTER_RIGHT);
    }
    out[i * 2]     = x;
    out[i * 2 + 1] = y;
  }
}

// Resample N points along the wave curve uniformly in arc length (so bends don't cluster).
// Exported (via duplication) to WaveStems for stem placement — keep the curve math in sync.
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

// State 1 — wave curve receding into space. Pixel-space curve converted to NDC.
// Must match the stem-position math in components/WaveStems.tsx so stems and dots align.
// First WAVE_VISIBLE dots are placed evenly along the curve's ARC LENGTH (they're the
// visible ones); the remaining dots overlap the same positions (i % WAVE_VISIBLE) so morph
// transitions don't drag extra streaks through the canvas.
function makeWave(W: number, H: number, out: Float32Array) {
  const points = buildArcUniformWavePoints(W, H, WAVE_VISIBLE);
  for (let i = 0; i < COUNT; i++) {
    const posIdx = i < WAVE_VISIBLE ? i : i % WAVE_VISIBLE;
    const { cx, cy } = points[posIdx];
    out[i * 2]     = (cx / W) * 2 - 1;
    out[i * 2 + 1] = 1 - (cy / H) * 2;
  }
}

// State 2 — Stripe-logo parallelogram.
function makeParallelogram(W: number, H: number, out: Float32Array) {
  const rectW = 0.19 * W;
  const rectH = rectW * (11 / 16);
  const tanSkew = Math.tan((-7 * Math.PI) / 180);
  for (let i = 0; i < COUNT; i++) {
    const u = halton(i + 1, 2) * 2 - 1;
    const v = halton(i + 1, 3) * 2 - 1;
    const xPx = (u * rectW) / 2;
    const yPx = (v * rectH) / 2 + xPx * tanSkew;
    out[i * 2]     =  xPx / (W / 2);
    out[i * 2 + 1] = -yPx / (H / 2);
  }
}

function makeStateTargets(stateIdx: number, W: number, H: number, out: Float32Array) {
  if (stateIdx === 0) makeColumns(W, H, out);
  else if (stateIdx === 1) makeWave(W, H, out);
  else makeParallelogram(W, H, out);
}

function snapshotCurrent(
  from: Float32Array,
  to: Float32Array,
  seeds: Float32Array,
  uMorph: number,
  spread: number,
  out: Float32Array,
) {
  const denom = 1 - spread;
  for (let i = 0; i < COUNT; i++) {
    const seed = seeds[i];
    const delay = ((seed * 13.71) % 1) * spread;
    const localRaw = (uMorph - delay) / denom;
    const local = localRaw < 0 ? 0 : localRaw > 1 ? 1 : localRaw;
    const eased = local * local * (3 - 2 * local);
    const fx = from[i * 2];
    const fy = from[i * 2 + 1];
    const tx = to[i * 2];
    const ty = to[i * 2 + 1];
    out[i * 2]     = fx + (tx - fx) * eased;
    out[i * 2 + 1] = fy + (ty - fy) * eased;
  }
}

// Build line geometry: N_LINES parametric curves from left column → right column.
// Shape: y(t) = y_anchor * cos²(π*t). Horizontal tangent at both anchors AND at the
// midpoint (0, 0) where every line converges. Emitted as gl.LINES pair-segments.
function buildLineBuffers() {
  const totalVerts = N_LINES * SEGMENTS * 2;
  const pos = new Float32Array(totalVerts * 2);
  const tArr = new Float32Array(totalVerts);
  const idArr = new Float32Array(totalVerts);

  const pts = new Float32Array((SEGMENTS + 1) * 2);
  let v = 0;
  for (let i = 0; i < N_LINES; i++) {
    // Left end: one per LEFT_DOTS position.
    const yLeft = uniformY(i, LEFT_DOTS);
    const xLeft = -COL_X + xJitter(i, 11.7, X_JITTER_LEFT);
    // Right end: collapse N_LINES → RIGHT_DOTS, multiple lines may share an endpoint.
    const rightIdx = Math.floor((i * RIGHT_DOTS) / N_LINES);
    const yRight = uniformY(rightIdx, RIGHT_DOTS);
    const xRight = COL_X + xJitter(rightIdx, 29.3, X_JITTER_RIGHT);

    // Shape: short flat region at anchor, smooth dive (quintic easing for no kink)
    // through a single-point convergence at t=0.5. Asymmetric: left uses yLeft, right uses yRight.
    const DIVE_WIDTH = 0.8;
    const half = DIVE_WIDTH / 2;
    for (let s = 0; s <= SEGMENTS; s++) {
      const t = s / SEGMENTS;
      const d = Math.abs(t - 0.5);
      let s_ = d / half;
      if (s_ > 1) s_ = 1;
      const f = s_ * s_ * (3 - 2 * s_); // smoothstep (cubic) — sharper through zero than smootherstep
      // Subtract Y_OFFSET so the curve scales relative to convergence at (0, Y_OFFSET);
      // then add Y_OFFSET back to translate into shifted space.
      const yEnd = (t < 0.5 ? yLeft : yRight) - Y_OFFSET;
      pts[s * 2]     = xLeft + (xRight - xLeft) * t;
      pts[s * 2 + 1] = yEnd * f + Y_OFFSET;
    }

    for (let s = 0; s < SEGMENTS; s++) {
      const a = s * 2;
      const b = (s + 1) * 2;
      pos[v * 2]     = pts[a];
      pos[v * 2 + 1] = pts[a + 1];
      tArr[v] = s / SEGMENTS;
      idArr[v] = i;
      v++;
      pos[v * 2]     = pts[b];
      pos[v * 2 + 1] = pts[b + 1];
      tArr[v] = (s + 1) / SEGMENTS;
      idArr[v] = i;
      v++;
    }
  }
  return { pos, tArr, idArr };
}

// Line opacity envelope: fade in only after dots have nearly arrived at state 0,
// fade out fast when leaving state 0. Anything else = 0.
function computeLineOpacity(currentState: number, prevState: number, morphProgress: number) {
  if (currentState === 0) {
    return smooth01((morphProgress - 0.55) / 0.45);
  }
  if (prevState === 0) {
    return 1 - smooth01(morphProgress / 0.45);
  }
  return 0;
}

function smooth01(x: number) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return x * x * (3 - 2 * x);
}

interface Props {
  activeState: number;
}

export default function ParticleLogo({ activeState }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const requestStateChangeRef = useRef<((s: number) => void) | null>(null);

  useEffect(() => {
    requestStateChangeRef.current?.(activeState);
  }, [activeState]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const renderer = new Renderer({ alpha: true, antialias: true, dpr });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);

    Object.assign(gl.canvas.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
    });
    container.appendChild(gl.canvas);

    // Particle geometry
    const targetsFrom = new Float32Array(COUNT * 2);
    const targetsTo   = new Float32Array(COUNT * 2);
    const seeds       = new Float32Array(COUNT);
    const lineIds     = new Float32Array(COUNT);
    const sides       = new Float32Array(COUNT);
    const waveVis     = new Float32Array(COUNT);
    const waveU       = new Float32Array(COUNT);
    {
      const halfCount = COUNT / 2;
      const leftPerDot = halfCount / LEFT_DOTS;
      for (let i = 0; i < COUNT; i++) {
        seeds[i] = Math.random();
        waveVis[i] = i < WAVE_VISIBLE ? 1 : 0;
        const posIdx = i < WAVE_VISIBLE ? i : i % WAVE_VISIBLE;
        waveU[i] = posIdx / (WAVE_VISIBLE - 1);
        const left = i < halfCount;
        if (left) {
          lineIds[i] = Math.floor(i / leftPerDot); // 0..LEFT_DOTS-1, one per line
          sides[i] = -1;
        } else {
          // Right dots are always-on (no lifecycle), so lineId here is irrelevant
          // for opacity. Use 0; doesn't affect anything because isRight branch skips lifecycleAlive.
          lineIds[i] = 0;
          sides[i] = 1;
        }
      }
    }

    const dotsGeometry = new Geometry(gl, {
      aTargetFrom:   { size: 2, data: targetsFrom, usage: gl.DYNAMIC_DRAW },
      aTargetTo:     { size: 2, data: targetsTo,   usage: gl.DYNAMIC_DRAW },
      aSeed:         { size: 1, data: seeds },
      aLineId:       { size: 1, data: lineIds },
      aSide:         { size: 1, data: sides },
      aWaveVisible:  { size: 1, data: waveVis },
      aWaveU:        { size: 1, data: waveU },
    });

    const dotsProgram = new Program(gl, {
      vertex: dotsVert,
      fragment: dotsFrag,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uTime:          { value: 0 },
        uMorph:         { value: 1 },
        uMorphSpread:   { value: MORPH_SPREAD },
        uDriftAmp:      { value: 0.006 },
        uDriftMix:      { value: activeState === 2 ? 1 : 0 },
        uLifeMix:       { value: activeState === 2 ? 1 : 0 },
        uSizeJitterMix: { value: activeState === 2 ? 1 : 0 },
        uLifecycleMix:  { value: activeState === 0 ? 1 : 0 },
        uWaveAlphaMix:  { value: activeState === 1 ? 1 : 0 },
        uWaveBumpCenter:{ value: 1.2 },
        uMouseNDC:      { value: [0, 0] },
        uMouseRepelMix: { value: 0 },
        uCycleTime:     { value: CYCLE_TIME },
        uPointSize:     { value: 5.5 },
        uPixelRatio:    { value: dpr },
      },
    });

    const dotsMesh = new Mesh(gl, { geometry: dotsGeometry, program: dotsProgram, mode: gl.POINTS });

    // Lines geometry
    const lineBufs = buildLineBuffers();
    const linesGeometry = new Geometry(gl, {
      aPos:    { size: 2, data: lineBufs.pos },
      aT:      { size: 1, data: lineBufs.tArr },
      aLineId: { size: 1, data: lineBufs.idArr },
    });

    const linesProgram = new Program(gl, {
      vertex: linesVert,
      fragment: linesFrag,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uTime:           { value: 0 },
        uOpacity:        { value: 0 },
        uCycleTime:      { value: CYCLE_TIME },
        uBaselineAlpha:  { value: 0.5 },
        uMouseNDC:       { value: [0, 0] },
        uMouseRepelMix:  { value: 0 },
        uLifecycleMix:   { value: activeState === 0 ? 1 : 0 },
      },
    });

    const linesMesh = new Mesh(gl, { geometry: linesGeometry, program: linesProgram, mode: gl.LINES });

    const scene = new Transform();
    linesMesh.setParent(scene);
    dotsMesh.setParent(scene);

    let currentState = activeState;
    let prevState = activeState;
    let morphProgress = 1;
    let morphStartTime = performance.now() - MORPH_DURATION;

    const regenerateTargets = (W: number, H: number) => {
      makeStateTargets(prevState, W, H, targetsFrom);
      makeStateTargets(currentState, W, H, targetsTo);
      dotsGeometry.attributes.aTargetFrom.needsUpdate = true;
      dotsGeometry.attributes.aTargetTo.needsUpdate = true;
    };

    const handleResize = () => {
      const W = container.offsetWidth;
      const H = container.offsetHeight;
      renderer.setSize(W, H);
      regenerateTargets(W, H);
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    // Cursor tracking for state-2 repulsion.
    const mouseState = { x: 0, y: 0, active: 0 };
    const smoothMouse = { x: 0, y: 0 };
    let smoothedMouseActive = 0;
    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      if (
        e.clientX < rect.left || e.clientX > rect.right ||
        e.clientY < rect.top || e.clientY > rect.bottom
      ) {
        mouseState.active = 0;
        return;
      }
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      mouseState.x = (px / rect.width) * 2 - 1;
      mouseState.y = 1 - (py / rect.height) * 2;
      mouseState.active = 1;
    };
    window.addEventListener("mousemove", onMouseMove);

    requestStateChangeRef.current = (newState: number) => {
      if (newState === currentState) return;
      const W = container.offsetWidth;
      const H = container.offsetHeight;
      snapshotCurrent(targetsFrom, targetsTo, seeds, morphProgress, MORPH_SPREAD, targetsFrom);
      makeStateTargets(newState, W, H, targetsTo);
      dotsGeometry.attributes.aTargetFrom.needsUpdate = true;
      dotsGeometry.attributes.aTargetTo.needsUpdate = true;
      prevState = currentState;
      currentState = newState;
      morphProgress = 0;
      morphStartTime = performance.now();
    };

    let raf = 0;
    const start = performance.now();
    const loop = () => {
      const now = performance.now();
      const t = (now - start) / 1000;
      const elapsed = now - morphStartTime;
      morphProgress = elapsed >= MORPH_DURATION ? 1 : elapsed / MORPH_DURATION;

      dotsProgram.uniforms.uTime.value = t;
      dotsProgram.uniforms.uMorph.value = morphProgress;

      // Drift/life/sizeJitter: only state 2 (parallelogram cloud) wants them.
      // States 0 and 1 sit cleanly on their target geometry.
      // Lifecycle: only state 0 uses the per-line birth/fade cycle.
      const eased = smooth01(morphProgress);
      const driftOf = (s: number) => (s === 2 ? 1 : 0);
      const lifecycleOf = (s: number) => (s === 0 ? 1 : 0);
      const waveOf = (s: number) => (s === 1 ? 1 : 0);
      const mix = driftOf(prevState) + (driftOf(currentState) - driftOf(prevState)) * eased;
      const lifecycleMix =
        lifecycleOf(prevState) + (lifecycleOf(currentState) - lifecycleOf(prevState)) * eased;
      const waveAlphaMix =
        waveOf(prevState) + (waveOf(currentState) - waveOf(prevState)) * eased;
      dotsProgram.uniforms.uDriftMix.value = mix;
      dotsProgram.uniforms.uLifeMix.value = mix;
      dotsProgram.uniforms.uSizeJitterMix.value = mix;
      dotsProgram.uniforms.uLifecycleMix.value = lifecycleMix;
      dotsProgram.uniforms.uWaveAlphaMix.value = waveAlphaMix;
      // Traveling bump: front (u≈1) → back (u≈0), ~3.5s per cycle.
      const BUMP_CYCLE = 4.8;
      const bumpT = (t / BUMP_CYCLE) % 1.0;
      dotsProgram.uniforms.uWaveBumpCenter.value = 1.2 - bumpT * 1.4;

      // Cursor repulsion (all three states). Smooth in/out when the cursor enters
      // or leaves the canvas; lag the cursor position so dots trail the mouse
      // rather than snapping to it — feels fluid instead of choppy.
      const repelGate = Math.max(mix, waveAlphaMix, lifecycleMix);
      const mouseTarget = mouseState.active * repelGate;
      smoothedMouseActive += (mouseTarget - smoothedMouseActive) * 0.1;
      smoothMouse.x += (mouseState.x - smoothMouse.x) * 0.15;
      smoothMouse.y += (mouseState.y - smoothMouse.y) * 0.15;
      dotsProgram.uniforms.uMouseRepelMix.value = smoothedMouseActive;
      dotsProgram.uniforms.uMouseNDC.value = [smoothMouse.x, smoothMouse.y];

      linesProgram.uniforms.uTime.value = t;
      linesProgram.uniforms.uOpacity.value = computeLineOpacity(currentState, prevState, morphProgress);
      linesProgram.uniforms.uMouseNDC.value = [smoothMouse.x, smoothMouse.y];
      linesProgram.uniforms.uMouseRepelMix.value = smoothedMouseActive;
      linesProgram.uniforms.uLifecycleMix.value = lifecycleMix;

      renderer.render({ scene });
      if (visible) raf = requestAnimationFrame(loop);
    };

    let visible = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !visible) {
          visible = true;
          raf = requestAnimationFrame(loop);
        } else if (!entry.isIntersecting && visible) {
          visible = false;
          cancelAnimationFrame(raf);
        }
      },
      { rootMargin: "200px" }
    );
    io.observe(container);

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", onMouseMove);
      requestStateChangeRef.current = null;
      if (container.contains(gl.canvas)) container.removeChild(gl.canvas);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return <div ref={containerRef} className="absolute inset-0 z-[5] pointer-events-none" />;
}
