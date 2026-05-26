"use client";

import { useRef, useEffect } from "react";
import { useScroll } from "framer-motion";

const vert = /* glsl */`
  attribute vec2 position;
  attribute vec2 uv;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0, 1);
  }
`;

const frag = /* glsl */`
  precision highp float;

  uniform float uProgress;
  uniform float uTime;

  varying vec2 vUv;

  vec3 panelColor(float t) {
    t = clamp(t, 0.0, 1.0);
    vec3 c0 = vec3(0.70, 0.68, 1.00);
    vec3 c1 = vec3(0.44, 0.20, 0.94);
    vec3 c2 = vec3(0.88, 0.20, 0.82);
    vec3 c3 = vec3(0.97, 0.36, 0.44);
    vec3 c4 = vec3(1.00, 0.58, 0.16);
    float s = t * 4.0;
    if (s < 1.0) return mix(c0, c1, s);
    if (s < 2.0) return mix(c1, c2, s - 1.0);
    if (s < 3.0) return mix(c2, c3, s - 2.0);
    return mix(c3, c4, clamp(s - 3.0, 0.0, 1.0));
  }

  float panel(float d, float w) {
    return exp(-(d * d) / (2.0 * w * w));
  }

  float spineX(float y) {
    return 1.10 - y * 0.62 - y * y * 0.18
      + sin(y * 2.2 + uTime * 0.10) * 0.06
      + sin(y * 4.8 - uTime * 0.07) * 0.02;
  }

  float spineXDeriv(float y) {
    return -0.62 - y * 0.36
      + cos(y * 2.2 + uTime * 0.10) * 0.132
      + cos(y * 4.8 - uTime * 0.07) * 0.096;
  }

  void main() {
    vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
    float y = uv.y;
    float cx = spineX(y);
    float dcx = spineXDeriv(y);

    vec2 tangent = normalize(vec2(dcx, 1.0));
    vec2 perp = vec2(-tangent.y, tangent.x);
    float dist = dot(uv - vec2(cx, y), perp);

    float w = 0.0015;
    float spread = 0.28;
    float total = 0.0;
    vec3 color = vec3(0.0);

    for (int i = 0; i < 120; i++) {
      float fi = float(i) / 119.0;
      float phase = fi * 6.283;
      float baseOffset = mix(-spread * 0.5, spread * 0.5, fi);
      float o = baseOffset
        + sin(y * 2.5 + phase       + uTime * 0.15) * 0.045
        + sin(y * 5.1 - phase * 0.6 + uTime * 0.10) * 0.020;

      float intensity = panel(dist - o, w);
      color += panelColor(fi) * intensity;
      total += intensity;
    }

    color /= max(total, 0.001);

    float peak = clamp(total * 0.8, 0.0, 1.0);
    color = mix(color, vec3(1.0), smoothstep(0.70, 1.0, peak) * 0.45);

    float alpha = clamp(total * 1.2, 0.0, 1.0) * 0.92;

    float drawP = clamp(uProgress * 2.8, 0.0, 1.0);
    float revealT = drawP * 1.15;
    float reveal = smoothstep(revealT, revealT - 0.12, y);

    float sideFade = smoothstep(0.30, 0.52, uv.x);

    alpha *= reveal * sideFade;
    gl_FragColor = vec4(color, alpha);
  }
`;

export default function RibbonWrapper({ children }: { children: React.ReactNode }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const waveRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  useEffect(() => {
    const container = waveRef.current;
    if (!container) return;

    let rafId: number;
    let cleanup: (() => void) | undefined;

    import("ogl").then(({ Renderer, Program, Mesh, Triangle }) => {
      const renderer = new Renderer({ alpha: true, premultipliedAlpha: false, antialias: true });
      const gl = renderer.gl;

      Object.assign(gl.canvas.style, {
        position: "absolute",
        inset: "0",
        width: "100%",
        height: "100%",
      });
      container.appendChild(gl.canvas);

      const geometry = new Triangle(gl);
      const program = new Program(gl, {
        vertex: vert,
        fragment: frag,
        uniforms: {
          uResolution: { value: [container.offsetWidth, container.offsetHeight] },
          uProgress: { value: 0 },
          uTime: { value: 0 },
        },
      });

      const mesh = new Mesh(gl, { geometry, program });

      const handleResize = () => {
        renderer.setSize(container.offsetWidth, container.offsetHeight);
        program.uniforms.uResolution.value = [container.offsetWidth, container.offsetHeight];
        gl.canvas.style.width = "100%";
        gl.canvas.style.height = "100%";
      };
      handleResize();
      window.addEventListener("resize", handleResize);

      const unsubscribe = scrollYProgress.on("change", (v) => {
        program.uniforms.uProgress.value = Math.max(0, (v - 0.08) / (1 - 0.08));
      });

      const startTime = Date.now();
      const render = () => {
        rafId = requestAnimationFrame(render);
        program.uniforms.uTime.value = (Date.now() - startTime) / 1000;
        renderer.render({ scene: mesh });
      };
      render();

      cleanup = () => {
        cancelAnimationFrame(rafId);
        window.removeEventListener("resize", handleResize);
        unsubscribe();
        if (container.contains(gl.canvas)) container.removeChild(gl.canvas);
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      };
    });

    return () => cleanup?.();
  }, [scrollYProgress]);

  return (
    <div ref={sectionRef} className="relative overflow-clip" style={{ background: "#f8f7f4" }}>
      <div
        ref={waveRef}
        className="sticky top-0 h-screen w-full overflow-hidden pointer-events-none"
        style={{ marginBottom: "-100vh", zIndex: 1 }}
      />
      {children}
    </div>
  );
}
