"use client";

import React, { useRef, useEffect, useId, useState } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion";
import Card1 from "./Card1";
import landTopology from "world-atlas/land-110m.json";
import { feature } from "topojson-client";

const HEAT_CITIES = [
  { lat: 40.7,  lon: -74.0,  ci: [99,91,255],   co: [139,92,246]  }, // NYC      blurple→violet
  { lat: 51.5,  lon: -0.1,   ci: [139,92,246],  co: [236,72,153]  }, // London   violet→pink
  { lat: 35.7,  lon: 139.7,  ci: [236,72,153],  co: [249,115,22]  }, // Tokyo    pink→orange
  { lat: 19.1,  lon: 72.9,   ci: [249,115,22],  co: [99,91,255]   }, // Mumbai   orange→blurple
  { lat: -23.5, lon: -46.6,  ci: [99,91,255],   co: [236,72,153]  }, // SP       blurple→pink
  { lat: 6.5,   lon: 3.4,    ci: [139,92,246],  co: [249,115,22]  }, // Lagos    violet→orange
  { lat: 39.9,  lon: 116.4,  ci: [236,72,153],  co: [99,91,255]   }, // Beijing  pink→blurple
  { lat: 55.75, lon: 37.6,   ci: [249,115,22],  co: [139,92,246]  }, // Moscow   orange→violet
  { lat: 28.6,  lon: 77.2,   ci: [99,91,255],   co: [249,115,22]  }, // Delhi    blurple→orange
  { lat: 48.85, lon: 2.35,   ci: [139,92,246],  co: [236,72,153]  }, // Paris    violet→pink
  { lat: 37.6,  lon: 126.9,  ci: [236,72,153],  co: [139,92,246]  }, // Seoul    pink→violet
  { lat: 30.0,  lon: 31.2,   ci: [249,115,22],  co: [99,91,255]   }, // Cairo    orange→blurple
].map((c) => ({ ...c, xyz: llToXYZ(c.lat, c.lon) }));

const GLOBE_LABELS = ["10", "100", "1K", "10K", "100K", "1M", "10M"];
const GLOBAL_MAX_RADIUS = 0.80;
const GLOBAL_COS_MAX = Math.cos(GLOBAL_MAX_RADIUS);
// cities activate sequentially across 80% of the scroll range for distinct visible bursts
const CITY_START_T = HEAT_CITIES.map((_, i) => (i / HEAT_CITIES.length) * 0.80);

function llToXYZ(lat: number, lon: number) {
  const phi = (90 - lat) * Math.PI / 180;
  const th = lon * Math.PI / 180;
  return { x: Math.sin(phi) * Math.cos(th), y: Math.cos(phi), z: Math.sin(phi) * Math.sin(th) };
}

function rotX(p: { x: number; y: number; z: number }, a: number) {
  return { x: p.x, y: p.y * Math.cos(a) - p.z * Math.sin(a), z: p.y * Math.sin(a) + p.z * Math.cos(a) };
}

function rotY(p: { x: number; y: number; z: number }, a: number) {
  return { x: p.x * Math.cos(a) + p.z * Math.sin(a), y: p.y, z: -p.x * Math.sin(a) + p.z * Math.cos(a) };
}

function pip([px, py]: [number, number], ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

const LAND_POINTS = (() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const geo = feature(landTopology as any, (landTopology as any).objects.land) as any;

  const rings: number[][][] = [];
  for (const f of geo.features) {
    const { type, coordinates } = f.geometry;
    if (type === "Polygon") rings.push(coordinates[0]);
    else if (type === "MultiPolygon")
      for (const poly of coordinates) rings.push(poly[0]);
  }

  const boxed = rings.map((ring) => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [x, y] of ring) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    return { ring, minX, maxX, minY, maxY };
  });

  const n = 120000;
  const g = (1 + Math.sqrt(5)) / 2;
  const jitter = 2.2 / Math.sqrt(n);
  const result: { x: number; y: number; z: number; phase: number }[] = [];

  for (let i = 0; i < n; i++) {
    const th = 2 * Math.PI * i / g + (Math.random() - 0.5) * Math.PI * jitter * 3;
    const cosph = Math.max(-1, Math.min(1, 1 - 2 * (i + 0.5) / n + (Math.random() - 0.5) * jitter));
    const ph = Math.acos(cosph);
    const x = Math.sin(ph) * Math.cos(th);
    const y = Math.cos(ph);
    const z = Math.sin(ph) * Math.sin(th);
    const lat = Math.asin(Math.max(-1, Math.min(1, y))) * 180 / Math.PI;
    const lon = Math.atan2(z, x) * 180 / Math.PI;

    for (const { ring, minX, maxX, minY, maxY } of boxed) {
      if (lon < minX || lon > maxX || lat < minY || lat > maxY) continue;
      if (pip([lon, lat], ring)) { result.push({ x, y, z, phase: Math.random() * Math.PI * 2 }); break; }
    }
  }

  return result;
})();

const TILT = 0.28;

function GlobeWidget({ scrollYProgress }: { scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [labelIdx, setLabelIdx] = useState(0);
  const scrollTRef = useRef(0);

  useEffect(() => {
    const unsub = scrollYProgress.on("change", (v) => {
      const t = Math.max(0, Math.min(1, (v - 0.28) / (0.52 - 0.28)));
      scrollTRef.current = t;
      const counterT = Math.max(0, Math.min(1, (v - 0.28) / (0.38 - 0.28)));
      let newIdx = 0;
      for (let i = 0; i < GLOBE_LABELS.length; i++) {
        if (counterT >= i / (GLOBE_LABELS.length - 1)) newIdx = i;
      }
      setLabelIdx(newIdx);
    });
    return unsub;
  }, [scrollYProgress]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      if (!width || !height) return;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    const ctx = canvas.getContext("2d")!;
    let rafId: number;
    let yRot = Math.PI;
    const startTime = Date.now();

    const render = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      yRot += 0.005;
      const scrollT = scrollTRef.current;

      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h * 0.95;
      const r = h * 0.82;

      ctx.clearRect(0, 0, w, h);

      // dark sphere body — gives dots contrast without touching the card's transparency
      // linear gradient top→center so it fades with the sphere's own curvature
      const sphereGrad = ctx.createLinearGradient(cx, cy - r, cx, cy);
      sphereGrad.addColorStop(0,    "rgba(255, 255, 255, 0.96)");
      sphereGrad.addColorStop(0.40, "rgba(255, 255, 255, 0.80)");
      sphereGrad.addColorStop(0.70, "rgba(255, 255, 255, 0.35)");
      sphereGrad.addColorStop(1,    "rgba(255, 255, 255, 0.0)");
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = sphereGrad;
      ctx.fill();

      // pre-compute per-dot values so we can do two compositing passes
      type DotData = { sx: number; sy: number; radius: number; baseOpacity: number; cr: number; cg: number; cb: number; influence: number };
      const dots: DotData[] = [];

      for (const p of LAND_POINTS) {
        const rp = rotY(rotX(p, TILT), yRot);
        if (rp.z < -0.05) continue;
        const sx = cx + rp.x * r;
        const sy = cy - rp.y * r;
        const depth = (rp.z + 1) / 2;
        const shimmer = 0.68 + 0.32 * Math.sin(elapsed * 3.5 + p.phase);
        const pulse = 1 + 0.13 * Math.sin(elapsed * 1.9 + p.phase * 1.7);
        const baseOpacity = (0.4 + depth * 0.6) * shimmer;
        const radius = (0.55 + depth * 0.5) * pulse * dpr;

        let bestInfluence = 0, bestRaw = 0, bestCity = -1;
        for (let ci = 0; ci < HEAT_CITIES.length; ci++) {
          const cityStart = CITY_START_T[ci];
          if (scrollT <= cityStart) continue;
          const localT = (scrollT - cityStart) / (1 - cityStart);
          const eased = 1 - Math.pow(1 - localT, 3);
          const cosR = 1 - (1 - GLOBAL_COS_MAX) * eased;
          const hc = HEAT_CITIES[ci];
          const cosAngle = p.x * hc.xyz.x + p.y * hc.xyz.y + p.z * hc.xyz.z;
          const noise = Math.sin(p.phase * 6.1 + ci * 3.7) * 0.045;
          const threshold = cosR - noise;
          if (cosAngle < threshold) continue;
          const raw = Math.max(0, Math.min(1, (cosAngle - threshold) / (1 - threshold)));
          const influence = Math.pow(raw, 0.18);
          if (influence > bestInfluence) { bestInfluence = influence; bestRaw = raw; bestCity = ci; }
        }

        let cr = 0, cg = 0, cb = 0;
        if (bestCity >= 0 && bestInfluence > 0.01) {
          const hc = HEAT_CITIES[bestCity];
          const edgeT = Math.sqrt(1 - bestRaw);
          cr = Math.round(hc.ci[0] + (hc.co[0] - hc.ci[0]) * edgeT);
          cg = Math.round(hc.ci[1] + (hc.co[1] - hc.ci[1]) * edgeT);
          cb = Math.round(hc.ci[2] + (hc.co[2] - hc.ci[2]) * edgeT);
          // normalize to peak brightness so every color hits 255 on its strongest channel
          const maxC = Math.max(cr, cg, cb, 1);
          const boost = 255 / maxC;
          cr = Math.min(255, Math.round(cr * boost));
          cg = Math.min(255, Math.round(cg * boost));
          cb = Math.min(255, Math.round(cb * boost));
        }

        dots.push({ sx, sy, radius, baseOpacity, cr, cg, cb, influence: bestInfluence });
      }

      // pass 1 — black dots (normal composite)
      ctx.globalCompositeOperation = "source-over";
      for (const d of dots) {
        if (d.influence > 0.01) continue;
        ctx.beginPath();
        ctx.arc(d.sx, d.sy, d.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${d.baseOpacity})`;
        ctx.fill();
      }

      // pass 2 — colored dots (normal composite, fully opaque at peak influence)
      for (const d of dots) {
        if (d.influence <= 0.01) continue;
        ctx.beginPath();
        ctx.arc(d.sx, d.sy, d.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${d.cr},${d.cg},${d.cb},${Math.min(1, d.influence * 1.5)})`;
        ctx.fill();
      }

      rafId = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2">
      <div className="bg-white/60 rounded-xl px-3 py-2.5 flex items-center gap-2.5 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-[#ededff] flex items-center justify-center shrink-0">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <circle cx="5.5" cy="4.5" r="2" stroke="#635bff" strokeWidth="1.2" fill="none"/>
            <path d="M1 14c0-2.485 2.015-4.5 4.5-4.5" stroke="#635bff" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
            <circle cx="10.5" cy="4.5" r="2" stroke="#635bff" strokeWidth="1.2" fill="none"/>
            <path d="M7 14c0-2.485 2.015-4.5 4.5-4.5" stroke="#635bff" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-[#425466] uppercase tracking-wider leading-none mb-1">Active merchants</p>
          <AnimatePresence mode="wait">
            <motion.p
              key={labelIdx}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.18 }}
              className="text-base font-bold text-[#0a2540] tabular-nums leading-none"
            >
              {GLOBE_LABELS[labelIdx]}
            </motion.p>
          </AnimatePresence>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#16a34a] opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#16a34a]" />
          </span>
          <p className="text-[10px] text-[#16a34a] font-semibold">Live</p>
        </div>
      </div>
      <div ref={containerRef} className="flex-1 relative min-h-0 -mx-8 -mb-8">
        <canvas ref={canvasRef} className="absolute inset-0" />
      </div>
    </div>
  );
}

const lines = [
  { text: "Stripe gives you the payments infrastructure.", muted: true },
  { text: "You focus on the product.", muted: false },
];

const lineWindows = [
  { in: [0.05, 0.12], out: [0.90, 0.98] },
  { in: [0.12, 0.19], out: [0.90, 0.98] },
];



function AnimatedLine({
  text,
  muted,
  window: win,
  scrollYProgress,
}: {
  text: string;
  muted: boolean;
  window: { in: number[]; out: number[] };
  scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  const opacity = useTransform(
    scrollYProgress,
    [win.in[0], win.in[1], win.out[0], win.out[1]],
    [0, 1, 1, 0]
  );
  const y = useTransform(
    scrollYProgress,
    [win.in[0], win.in[1], win.out[0], win.out[1]],
    [28, 0, 0, -28]
  );
  return (
    <motion.h2
      style={{ opacity, y }}
      className={`text-4xl md:text-6xl font-medium leading-tight tracking-normal ${muted ? "text-[#0a0a14]/40" : "text-[#0a0a14]"}`}
    >
      {text}
    </motion.h2>
  );
}

function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const gradId = useId();
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const lift = useSpring(0, { stiffness: 250, damping: 35 });
  const scale = useSpring(1, { stiffness: 250, damping: 35 });
  const border = useSpring(0, { stiffness: 300, damping: 35 });
  const shadow = useTransform(lift, [0, 10], [
    "0 4px 20px rgba(0,0,0,0.06)",
    "0 20px 48px rgba(0,0,0,0.13)",
  ]);
  const bezelMask = useTransform([rawX, rawY], ([x, y]: number[]) => {
    const px = ((x as number) + 0.5) * 100;
    const py = ((y as number) + 0.5) * 100;
    return `radial-gradient(circle 320px at ${px}% ${py}%, #fff, transparent)`;
  });

  return (
    <motion.div
      ref={ref}
      initial="rest"
      whileHover="hover"
      style={{ translateZ: lift, scale, boxShadow: shadow, position: "relative", overflow: "hidden" }}
      onMouseMove={(e) => {
        const r = ref.current!.getBoundingClientRect();
        rawX.set((e.clientX - r.left) / r.width - 0.5);
        rawY.set((e.clientY - r.top) / r.height - 0.5);
        lift.set(10); scale.set(1.013); border.set(1);
      }}
      onMouseLeave={() => { rawX.set(0); rawY.set(0); lift.set(0); scale.set(1); border.set(0); }}
      className={className}
    >
      {children}
      <motion.svg
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: border, pointerEvents: "none", zIndex: 50, WebkitMask: bezelMask, maskImage: bezelMask }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
            <stop offset="0%" stopColor="#ff4444" />
            <stop offset="100%" stopColor="#4444ff" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" rx="16" ry="16" fill="none" stroke={`url(#${gradId})`} strokeWidth="2" />
      </motion.svg>
    </motion.div>
  );
}

// ─── Hard Parts Card ─────────────────────────────────────────────────────────

const CONNECTED_ACCOUNTS = [
  { initial: "V", name: "Vital Flow",        country: "Canada",        balance: "$8,348.00",   volume: "$71,562.98",   color: "#0ea5e9" },
  { initial: "D", name: "Daybreak Yoga",     country: "United States", balance: "$1,502.00",   volume: "$8,879.00",    color: "#8b5cf6" },
  { initial: "S", name: "Sacred Space",      country: "UK",            balance: "$1,247.00",   volume: "$24,569.09",   color: "#f59e0b" },
  { initial: "J", name: "Jackson Hot Yoga",  country: "Australia",     balance: "$3,660.00",   volume: "$12,691.00",   color: "#f97316" },
  { initial: "H", name: "Harmony Flow",      country: "United States", balance: "$30,930.00",  volume: "$294,669.65",  color: "#ec4899" },
  { initial: "B", name: "Balance at Brunch", country: "Canada",        balance: "$335.00",     volume: "$3,650.36",    color: "#635bff" },
  { initial: "X", name: "Breathline Studio", country: "United States", balance: "$2,245.00",   volume: "$8,608.00",    color: "#10b981" },
  { initial: "Q", name: "Quiet Fire Yoga",   country: "UK",            balance: "$388.00",     volume: "$1,596.37",    color: "#ef4444" },
  { initial: "Z", name: "Zenith Zen",        country: "Australia",     balance: "$660.00",     volume: "$1,643.30",    color: "#14b8a6" },
  { initial: "M", name: "M.E. Yoga",         country: "Canada",        balance: "$4,424.00",   volume: "$6,709.60",    color: "#d97706" },
];

const POPUPS = [
  {
    id: "fraud",
    account: { initial: "S", name: "Sacred Space", color: "#f59e0b" },
    subtitle: "Transaction blocked",
    description: "Suspicious pattern detected\nand blocked automatically.",
    rows: [
      { key: "Card",       val: "····4242 · Russia" },
      { key: "Amount",     val: "$1,247.00" },
      { key: "Confidence", val: "99.2%" },
    ],
    totalLabel: "Protected",
    totalVal: "$1,247.00",
  },
  {
    id: "retries",
    account: { initial: "D", name: "Daybreak Yoga", color: "#8b5cf6" },
    subtitle: "Payment recovered",
    description: "Failed charge retried and\nrecovered automatically.",
    rows: [
      { key: "Attempt",  val: "3 of 3" },
      { key: "Amount",   val: "$89.00" },
      { key: "Status",   val: "Succeeded" },
    ],
    totalLabel: "Recovered",
    totalVal: "$89.00",
  },
  {
    id: "disputes",
    account: { initial: "J", name: "Jackson Hot Yoga", color: "#f97316" },
    subtitle: "Dispute resolved",
    description: "Chargeback reviewed and\nwon on your behalf.",
    rows: [
      { key: "Filed",   val: "3 days ago" },
      { key: "Network", val: "Visa" },
      { key: "Status",  val: "Won" },
    ],
    totalLabel: "Returned",
    totalVal: "$3,660.00",
  },
  {
    id: "tax",
    account: { initial: "H", name: "Harmony Flow", color: "#ec4899" },
    subtitle: "Tax auto-calculated",
    description: "Sales tax determined and\ncollected at checkout.",
    rows: [
      { key: "Jurisdiction", val: "California" },
      { key: "Rate",         val: "8.5%" },
      { key: "Collected",    val: "$8.50" },
    ],
    totalLabel: "Total",
    totalVal: "$108.50",
  },
  {
    id: "pci",
    account: { initial: "V", name: "Vital Flow", color: "#0ea5e9" },
    subtitle: "Data secured",
    description: "All card data encrypted\nand tokenized end-to-end.",
    rows: [
      { key: "Standard",   val: "PCI DSS L1" },
      { key: "Encryption", val: "AES-256" },
      { key: "Tokens",     val: "4,291 active" },
    ],
    totalLabel: "Status",
    totalVal: "Compliant",
  },
];

function HardPartsCard() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % POPUPS.length), 3400);
    return () => clearInterval(id);
  }, []);

  const popup = POPUPS[idx];

  return (
    <TiltCard className="bg-white/20 backdrop-blur-md rounded-2xl flex flex-col min-h-[420px]">
      <motion.button
        className="absolute top-5 right-5 w-7 h-7 rounded-lg flex items-center justify-center z-20"
        variants={{
          rest: { skewX: 0, skewY: 0, backgroundColor: "rgba(255,255,255,0.85)", color: "#635bff" },
          hover: { skewX: -10, skewY: -3, backgroundColor: "rgba(99,91,255,1)", color: "#ffffff" },
        }}
        transition={{
          skewX: { type: "spring", stiffness: 400, damping: 20 },
          skewY: { type: "spring", stiffness: 400, damping: 20 },
          backgroundColor: { type: "tween", ease: "easeOut", duration: 0.15 },
          color: { type: "tween", ease: "easeOut", duration: 0.15 },
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M9 1h4v4M5 13H1V9M13 1L8 6M1 13l5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.button>

      <div className="px-6 pt-6 pb-3 shrink-0">
        <h3 className="text-3xl font-medium text-[#0a2540] leading-tight pr-10">We handle the hard parts.</h3>
      </div>

      {/* Category tags */}
      <div className="px-6 pb-4 flex flex-wrap gap-2 shrink-0">
        {(["Fraud prevention", "Smart retries", "Disputes", "Tax", "PCI compliance"] as const).map((label, i) => (
          <button
            key={label}
            onClick={() => setIdx(i)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 ${
              i === idx
                ? "bg-[#635bff] text-white"
                : "border border-white/40 text-[#425466] bg-white/20"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Dashboard + popup */}
      <div className="flex-1 relative overflow-hidden">
        {/* Scaled-down browser mock — absolutely positioned, zero layout impact */}
        <div className="absolute bottom-0 overflow-hidden rounded-t-2xl shadow-lg border border-[#e0e0e0]/60" style={{ transform: "scale(0.92)", transformOrigin: "bottom right", width: "115%", right: "-120px" }}>

        {/* Browser chrome */}
        <div className="bg-[#f5f5f7] px-4 py-3 flex items-center gap-3 border-b border-[#e0e0e0]/60 shrink-0">
          <div className="flex gap-2">
            <div className="w-3.5 h-3.5 rounded-full bg-[#ff5f57]" />
            <div className="w-3.5 h-3.5 rounded-full bg-[#ffbd2e]" />
            <div className="w-3.5 h-3.5 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex-1 bg-white rounded-md px-3 py-1.5 text-xs text-[#666] flex items-center gap-2 min-w-0">
            <svg width="10" height="11" viewBox="0 0 10 11" fill="none" className="shrink-0">
              <rect x="0.5" y="0.5" width="9" height="10" rx="2" stroke="#999" strokeWidth="0.8" />
              <path d="M3 4.5h4M3 6.5h3" stroke="#999" strokeWidth="0.8" strokeLinecap="round" />
            </svg>
            <span className="truncate">dashboard.zenflow.com</span>
          </div>
        </div>

        {/* Dashboard body — two-panel */}
        <div className="flex">

          {/* Left sidebar — Zenflow account */}
          <div className="w-[200px] shrink-0 bg-[#f9f8f6] border-r border-[#e8e8e8] px-4 py-4 rounded-bl-2xl flex flex-col gap-4">
            {/* Brand */}
            <div className="flex items-center gap-2.5 px-1">
              <div className="w-8 h-8 rounded-full bg-[#fce7f3] flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2C8 2 5 4.5 5 7a3 3 0 006 0c0-2.5-3-5-3-5z" fill="#ec4899" opacity="0.9"/>
                  <path d="M8 4C8 4 4 6 4 9a4 4 0 008 0c0-3-4-5-4-5z" fill="#f9a8d4" opacity="0.5"/>
                  <path d="M8 6C6.5 7.5 6 8.5 6 9.5a2 2 0 004 0c0-1-.5-2-2-3.5z" fill="#ec4899"/>
                </svg>
              </div>
              <span className="text-[13px] font-semibold text-[#0a2540]">Zenflow</span>
            </div>

            {/* Nav */}
            <nav className="flex flex-col gap-0.5">
              {[
                { label: "Home", active: false, icon: <path d="M2 6.5L7 2l5 4.5V13H9.5v-3h-5v3H2V6.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" fill="none"/> },
                { label: "Payments", active: false, icon: <><rect x="1.5" y="3.5" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" fill="none"/><path d="M1.5 6.5h11" stroke="currentColor" strokeWidth="1.2"/></> },
                { label: "Connect", active: true, icon: <><circle cx="3" cy="7" r="1.8" stroke="currentColor" strokeWidth="1.2" fill="none"/><circle cx="11" cy="7" r="1.8" stroke="currentColor" strokeWidth="1.2" fill="none"/><path d="M4.8 7h4.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></> },
                { label: "Reporting", active: false, icon: <><path d="M2 11V8M5 11V5M8 11V7M11 11V3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></> },
                { label: "Settings", active: false, icon: <><circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.2" fill="none"/><path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.9 2.9l1.1 1.1M9 9l1.1 1.1M2.9 11.1L4 10M9 4l1.1-1.1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></> },
              ].map(({ label, active, icon }) => (
                <div
                  key={label}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium ${active ? "bg-white text-[#0a2540] shadow-sm" : "text-[#64748b]"}`}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">{icon}</svg>
                  {label}
                </div>
              ))}
            </nav>
          </div>

          {/* Right panel — accounts table */}
          <div className="flex-1 bg-white px-5 py-4 rounded-br-2xl">
            <p className="text-[15px] font-semibold text-[#0a2540] mb-3">Connected Accounts</p>
            {/* Column headers */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 pb-2.5 border-b border-[#f0f0f0] mb-0.5">
              {["Accounts", "Account country", "Balance (USD)", "Volume (USD)"].map((h) => (
                <span key={h} className="text-[11px] text-[#94a3b8] font-medium truncate">{h}</span>
              ))}
            </div>
            {CONNECTED_ACCOUNTS.map((row) => {
              const isHighlighted = popup.account.initial === row.initial && popup.account.name === row.name;
              return (
                <div
                  key={row.name}
                  className={`grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 py-2.5 border-b border-[#fafafa] last:border-0 transition-colors duration-300 ${isHighlighted ? "bg-[#f8f8ff] -mx-5 px-5" : ""}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-white"
                      style={{ backgroundColor: row.color }}
                    >
                      <span className="text-[9px] font-bold">{row.initial}</span>
                    </div>
                    <span className={`text-[13px] truncate ${isHighlighted ? "font-semibold text-[#0a2540]" : "text-[#425466]"}`}>{row.name}</span>
                  </div>
                  <span className="text-[13px] text-[#94a3b8] truncate">{row.country}</span>
                  <span className={`text-[13px] truncate ${isHighlighted ? "font-semibold text-[#0a2540]" : "text-[#425466]"}`}>{row.balance}</span>
                  <span className={`text-[13px] truncate ${isHighlighted ? "font-semibold text-[#0a2540]" : "text-[#425466]"}`}>{row.volume}</span>
                </div>
              );
            })}
          </div>
        </div>

        </div>{/* end scale wrapper */}

        {/* Floating popup — left side */}
        <div className="absolute left-4 top-[48%] z-10" style={{ transform: "translateY(-50%) scale(0.88)", transformOrigin: "left center" }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={popup.id}
              className="bg-white rounded-2xl w-64 overflow-hidden"
              style={{ boxShadow: "0 12px 40px rgba(0,0,0,0.13), 0 1px 4px rgba(0,0,0,0.06)" }}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.24, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {/* Popup header */}
              <div className="px-5 pt-5 pb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-white"
                    style={{ backgroundColor: popup.account.color }}
                  >
                    <span className="text-sm font-bold">{popup.account.initial}</span>
                  </div>
                  <span className="text-[14px] font-semibold text-[#0a2540] leading-tight">{popup.account.name}</span>
                </div>
                <p className="text-[13px] text-[#425466] leading-relaxed whitespace-pre-line">{popup.description}</p>
              </div>
              <div className="border-t border-[#f4f4f8]" />
              {/* Popup rows */}
              <div className="px-5 py-3.5 space-y-2.5">
                {popup.rows.map((r) => (
                  <div key={r.key} className="flex justify-between items-center">
                    <span className="text-xs text-[#94a3b8]">{r.key}</span>
                    <span className="text-xs text-[#425466]">{r.val}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-[#f4f4f8]" />
              <div className="px-5 py-4 flex justify-between items-center">
                <span className="text-sm font-semibold text-[#0a2540]">{popup.totalLabel}</span>
                <span className="text-sm font-bold text-[#0a2540]">{popup.totalVal}</span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </TiltCard>
  );
}

const DARK = "#0a0a14";

const SNIPPET_TOKENS: { text: string; color: string }[] = [
  { text: "import", color: DARK },
  { text: " Stripe ", color: DARK },
  { text: "from", color: DARK },
  { text: " ", color: DARK },
  { text: "'stripe'", color: DARK },
  { text: ";\n\n", color: DARK },
  { text: "const", color: DARK },
  { text: " stripe ", color: DARK },
  { text: "=", color: DARK },
  { text: " new ", color: DARK },
  { text: "Stripe", color: DARK },
  { text: "(process.env.", color: DARK },
  { text: "STRIPE_SECRET_KEY", color: DARK },
  { text: ");\n\n", color: DARK },
  { text: "// create a payment intent\n", color: DARK },
  { text: "const", color: DARK },
  { text: " intent ", color: DARK },
  { text: "= await", color: DARK },
  { text: " stripe\n  .paymentIntents.create({\n", color: DARK },
  { text: "    amount", color: DARK },
  { text: ": ", color: DARK },
  { text: "2000", color: DARK },
  { text: ",\n", color: DARK },
  { text: "    currency", color: DARK },
  { text: ": ", color: DARK },
  { text: "'usd'", color: DARK },
  { text: ",\n", color: DARK },
  { text: "    automatic_payment_methods", color: DARK },
  { text: ": {\n      ", color: DARK },
  { text: "enabled", color: DARK },
  { text: ": ", color: DARK },
  { text: "true", color: DARK },
  { text: ",\n    },\n  });\n\n", color: DARK },
  { text: "// pass client_secret to the frontend\n", color: DARK },
  { text: "return", color: DARK },
  { text: " { ", color: DARK },
  { text: "clientSecret", color: DARK },
  { text: ": intent.client_secret };", color: DARK },
];

const SNIPPET_CHARS = SNIPPET_TOKENS.flatMap(({ text, color }) =>
  [...text].map((char) => ({ char, color }))
);
const SNIPPET_TEXT = SNIPPET_CHARS.map(c => c.char).join("");

function TypewriterCode() {
  const ref = useRef<HTMLDivElement>(null);
  const [charIdx, setCharIdx] = useState(0);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  useEffect(() => {
    return scrollYProgress.on("change", (v) => {
      const t = Math.max(0, Math.min(1, v / 0.45));
      setCharIdx(Math.round(t * SNIPPET_CHARS.length));
    });
  }, [scrollYProgress]);

  const started = charIdx > 0;
  const done = charIdx >= SNIPPET_CHARS.length;

  return (
    <div
      ref={ref}
      className="relative z-10 flex-1 font-mono font-bold text-[13px] min-h-0 overflow-hidden"
      style={{
        whiteSpace: "pre",
        lineHeight: "1.9",
        background: "linear-gradient(to bottom, #635bff 0%, #1a1060 60%, #0a2540 100%)",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        WebkitTextFillColor: "transparent",
      }}
    >
      {SNIPPET_TEXT.slice(0, charIdx)}
      {started && !done && (
        <motion.span
          animate={{ opacity: [1, 1, 0, 0] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "linear", times: [0, 0.45, 0.5, 0.95] }}
        >|</motion.span>
      )}
    </div>
  );
}

function RayBurst() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const NUM_RAYS = 90;
    const PI2 = Math.PI * 2;
    type Ray = {
      angle: number; length: number; dotT: number;
      opacity: number; dotR: number;
      a1: number; f1: number; p1: number;
      a2: number; f2: number; p2: number;
    };
    const DOT_R = 2.1 * dpr;

    const mainRays: Ray[] = Array.from({ length: NUM_RAYS }, (_, i) => {
      const base = (i / (NUM_RAYS - 1)) * Math.PI;
      const jitter = (Math.random() - 0.5) * (Math.PI / NUM_RAYS) * 1.6;
      return {
        angle:     Math.max(0.02, Math.min(Math.PI - 0.02, base + jitter)),
        length:    0.52 + Math.random() * 0.40,
        dotT:      0.30 + Math.random() * 0.58,
        opacity:   0.20 + Math.random() * 0.26,
        dotR:      DOT_R,
        a1: 0.040 + Math.random() * 0.040, f1: 0.12 + Math.random() * 0.20, p1: Math.random() * PI2,
        a2: 0.018 + Math.random() * 0.022, f2: 0.36 + Math.random() * 0.42, p2: Math.random() * PI2,
      };
    });

    const stubs: Ray[] = Array.from({ length: 18 }, () => ({
      angle:     Math.PI * (0.30 + Math.random() * 0.40),
      length:    0.10 + Math.random() * 0.16,
      dotT:      0.75 + Math.random() * 0.22,
      opacity:   0.22 + Math.random() * 0.24,
      dotR:      DOT_R,
      a1: 0.040 + Math.random() * 0.040, f1: 0.12 + Math.random() * 0.20, p1: Math.random() * PI2,
      a2: 0.018 + Math.random() * 0.022, f2: 0.36 + Math.random() * 0.42, p2: Math.random() * PI2,
    }));

    const rays: Ray[] = [...mainRays, ...stubs].sort((a, b) => a.opacity - b.opacity);

    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      canvas.width  = width  * dpr;
      canvas.height = height * dpr;
      canvas.style.width  = `${width}px`;
      canvas.style.height = `${height}px`;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    let rafId: number;
    const startTime = Date.now();

    const draw = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const ctx = canvas.getContext("2d")!;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Gradient: warm orange at origin → dusty rose → soft lavender
      const bg = ctx.createRadialGradient(w / 2, h, 0, w / 2, h * 0.85, Math.sqrt(w * w + h * h) * 0.72);
      bg.addColorStop(0,    "#f59060");
      bg.addColorStop(0.28, "#d07aaa");
      bg.addColorStop(0.62, "#b899e8");
      bg.addColorStop(1,    "#cbbef8");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      const ox  = w / 2;
      const oy  = h + 2 * dpr;
      const max = Math.sqrt(w * w + h * h);

      for (const ray of rays) {
        const len = ray.length * max;

        // Angular oscillation — tip swings left/right, line stays straight
        const a = ray.angle
          + ray.a1 * Math.sin(elapsed * ray.f1 + ray.p1)
          + ray.a2 * Math.sin(elapsed * ray.f2 + ray.p2);

        const ex = ox + Math.cos(Math.PI - a) * len;
        const ey = oy - Math.sin(a) * len;

        const grad = ctx.createLinearGradient(ox, oy, ex, ey);
        grad.addColorStop(0,    `rgba(50, 28, 110, 0)`);
        grad.addColorStop(0.28, `rgba(50, 28, 110, ${(ray.opacity * 0.5).toFixed(2)})`);
        grad.addColorStop(1,    `rgba(50, 28, 110, ${ray.opacity.toFixed(2)})`);

        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(ex, ey);
        ctx.strokeStyle = grad;
        ctx.lineWidth = (0.45 + ray.opacity * 1.8) * dpr;
        ctx.stroke();

        const dx = ox + (ex - ox) * ray.dotT;
        const dy = oy + (ey - oy) * ray.dotT;

        ctx.beginPath();
        ctx.arc(dx, dy, ray.dotR, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(50, 28, 110, ${Math.min(1, ray.opacity * 1.8).toFixed(2)})`;
        ctx.fill();
      }

      rafId = requestAnimationFrame(draw);
    };
    draw();

    return () => { cancelAnimationFrame(rafId); ro.disconnect(); };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 rounded-2xl overflow-hidden"
      style={{
        zIndex: 0,
        WebkitMaskImage: "radial-gradient(ellipse 95% 72% at 50% 100%, black 30%, transparent 88%)",
        maskImage:        "radial-gradient(ellipse 95% 72% at 50% 100%, black 30%, transparent 88%)",
      }}
    >
      <canvas ref={canvasRef} className="absolute inset-0" />
    </div>
  );
}

function Cards({ scrollYProgress }: { scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"] }) {
  return (
    <div className="grid grid-cols-[5fr_3fr] grid-rows-2 gap-3 w-full pointer-events-auto">
      {/* Row 1 — wide */}
      <Card1 />

      {/* Row 1 — narrow */}
      <TiltCard className="bg-white/20 backdrop-blur-md rounded-2xl p-8 flex flex-col min-h-[70vh]">
        <motion.button
          className="absolute top-5 right-5 w-7 h-7 rounded-lg flex items-center justify-center"
          variants={{
            rest: { skewX: 0, skewY: 0, backgroundColor: "rgba(255,255,255,0.85)", color: "#635bff" },
            hover: { skewX: -10, skewY: -3, backgroundColor: "rgba(99,91,255,1)", color: "#ffffff" },
          }}
          transition={{
            skewX: { type: "spring", stiffness: 400, damping: 20 },
            skewY: { type: "spring", stiffness: 400, damping: 20 },
            backgroundColor: { type: "tween", ease: "easeOut", duration: 0.15 },
            color: { type: "tween", ease: "easeOut", duration: 0.15 },
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 1h4v4M5 13H1V9M13 1L8 6M1 13l5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.button>
        <h3 className="text-3xl font-medium text-[#0a2540] leading-tight mb-5 pr-10">Works at 10 customers. Works at 10 million.</h3>
        <GlobeWidget scrollYProgress={scrollYProgress} />
      </TiltCard>

      {/* Row 2 — wide */}
      <HardPartsCard />

      {/* Row 2 — narrow */}
      <TiltCard className="bg-white/20 backdrop-blur-md rounded-2xl p-8 flex flex-col min-h-[260px]">
        <RayBurst />
        <motion.button
          className="absolute top-5 right-5 w-7 h-7 rounded-lg flex items-center justify-center z-10"
          variants={{
            rest: { skewX: 0, skewY: 0, backgroundColor: "rgba(255,255,255,0.85)", color: "#635bff" },
            hover: { skewX: -10, skewY: -3, backgroundColor: "rgba(99,91,255,1)", color: "#ffffff" },
          }}
          transition={{
            skewX: { type: "spring", stiffness: 400, damping: 20 },
            skewY: { type: "spring", stiffness: 400, damping: 20 },
            backgroundColor: { type: "tween", ease: "easeOut", duration: 0.15 },
            color: { type: "tween", ease: "easeOut", duration: 0.15 },
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 1h4v4M5 13H1V9M13 1L8 6M1 13l5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.button>
        <h3 className="relative z-10 text-3xl font-medium text-[#0a2540] leading-tight mb-5 pr-10">Ship in an afternoon.</h3>
        <TypewriterCode />
      </TiltCard>
    </div>
  );
}

export default function WhySection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  return (
    <section
      ref={sectionRef}
      className="relative overflow-clip"
    >
      {/* Text + cards — normal flow, scrolls over the wave */}
      <div className="relative flex flex-col gap-6 px-28 pt-16 pb-24" style={{ zIndex: 1 }}>
        {/* Full-bleed edge fade */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(to right, #f8f7f4 0px, transparent 160px, transparent 100%)", zIndex: 2 }}
        />
        <div className="flex flex-col items-start gap-2">
          {lines.map((line, i) => (
            <AnimatedLine
              key={line.text}
              text={line.text}
              muted={line.muted}
              window={lineWindows[i]}
              scrollYProgress={scrollYProgress}
            />
          ))}
        </div>

        <Cards scrollYProgress={scrollYProgress} />
      </div>
    </section>
  );
}
