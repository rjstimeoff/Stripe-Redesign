"use client";

import { useEffect, useRef } from "react";
import { useScroll } from "framer-motion";
import landTopology from "world-atlas/land-110m.json";
import { feature } from "topojson-client";

const HEAT_CITIES = [
  { lat: 40.7,  lon: -74.0,  ci: [99,91,255],   co: [139,92,246]  }, // NYC
  { lat: 51.5,  lon: -0.1,   ci: [139,92,246],  co: [236,72,153]  }, // London
  { lat: 35.7,  lon: 139.7,  ci: [236,72,153],  co: [249,115,22]  }, // Tokyo
  { lat: 19.1,  lon: 72.9,   ci: [249,115,22],  co: [99,91,255]   }, // Mumbai
  { lat: -23.5, lon: -46.6,  ci: [99,91,255],   co: [236,72,153]  }, // SP
  { lat: 6.5,   lon: 3.4,    ci: [139,92,246],  co: [249,115,22]  }, // Lagos
  { lat: 39.9,  lon: 116.4,  ci: [236,72,153],  co: [99,91,255]   }, // Beijing
  { lat: 55.75, lon: 37.6,   ci: [249,115,22],  co: [139,92,246]  }, // Moscow
  { lat: 28.6,  lon: 77.2,   ci: [99,91,255],   co: [249,115,22]  }, // Delhi
  { lat: 48.85, lon: 2.35,   ci: [139,92,246],  co: [236,72,153]  }, // Paris
  { lat: 37.6,  lon: 126.9,  ci: [236,72,153],  co: [139,92,246]  }, // Seoul
  { lat: 30.0,  lon: 31.2,   ci: [249,115,22],  co: [99,91,255]   }, // Cairo
].map((c) => ({ ...c, xyz: llToXYZ(c.lat, c.lon) }));

const GLOBAL_MAX_RADIUS = 0.80;
const GLOBAL_COS_MAX = Math.cos(GLOBAL_MAX_RADIUS);
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

export default function Globe({ scrollYProgress }: { scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTRef = useRef(0);

  useEffect(() => {
    const unsub = scrollYProgress.on("change", (v) => {
      const t = Math.max(0, Math.min(1, (v - 0.28) / (0.58 - 0.28)));
      scrollTRef.current = t;
    });
    return unsub;
  }, [scrollYProgress]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

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
    let rafId: number | null = null;
    let visible = false;
    let yRot = Math.PI;
    const startTime = Date.now();

    const render = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      yRot += 0.005;
      const scrollT = scrollTRef.current;

      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(w, h) * 0.49;

      ctx.clearRect(0, 0, w, h);

      // Sphere body — radial gradient for full-orb look against page bg
      const sphereGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      sphereGrad.addColorStop(0,    "rgba(255, 255, 255, 0.85)");
      sphereGrad.addColorStop(0.55, "rgba(255, 255, 255, 0.65)");
      sphereGrad.addColorStop(0.85, "rgba(255, 255, 255, 0.30)");
      sphereGrad.addColorStop(1,    "rgba(255, 255, 255, 0.0)");
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = sphereGrad;
      ctx.fill();

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
          const maxC = Math.max(cr, cg, cb, 1);
          const boost = 255 / maxC;
          cr = Math.min(255, Math.round(cr * boost));
          cg = Math.min(255, Math.round(cg * boost));
          cb = Math.min(255, Math.round(cb * boost));
        }

        dots.push({ sx, sy, radius, baseOpacity, cr, cg, cb, influence: bestInfluence });
      }

      ctx.globalCompositeOperation = "source-over";
      for (const d of dots) {
        if (d.influence > 0.01) continue;
        ctx.beginPath();
        ctx.arc(d.sx, d.sy, d.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${d.baseOpacity})`;
        ctx.fill();
      }

      for (const d of dots) {
        if (d.influence <= 0.01) continue;
        ctx.beginPath();
        ctx.arc(d.sx, d.sy, d.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${d.cr},${d.cg},${d.cb},${Math.min(1, d.influence * 1.5)})`;
        ctx.fill();
      }

      if (visible) rafId = requestAnimationFrame(render);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !visible) {
          visible = true;
          rafId = requestAnimationFrame(render);
        } else if (!entry.isIntersecting && visible) {
          visible = false;
          if (rafId !== null) cancelAnimationFrame(rafId);
          rafId = null;
        }
      },
      { rootMargin: "200px" }
    );
    io.observe(container);

    return () => {
      io.disconnect();
      if (rafId !== null) cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{ willChange: "transform", transform: "translateZ(0)" }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ willChange: "transform", transform: "translateZ(0)" }}
      />
    </div>
  );
}
