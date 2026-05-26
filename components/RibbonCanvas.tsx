"use client";

import { useRef, useEffect } from "react";

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
  uniform float uTime;
  varying vec2 vUv;

  vec3 panelColor(float t) {
    t = clamp(t, 0.0, 1.0);
    vec3 blue   = vec3(0.55, 0.48, 0.98);
    vec3 pink   = vec3(0.96, 0.22, 0.66);
    vec3 orange = vec3(1.00, 0.54, 0.10);
    float t1 = smoothstep(0.32, 0.44, t);
    float t2 = smoothstep(0.54, 0.64, t);
    return mix(mix(blue, pink, t1), orange, t2);
  }

  float panel(float d, float w) {
    return exp(-(d * d) / (2.0 * w * w));
  }

  float spineX(float y) {
    return 0.52 + y * 0.42 - y * y * 0.08
      + sin(y * 2.2 + uTime * 0.10) * 0.03
      + sin(y * 4.8 - uTime * 0.07) * 0.01;
  }

  float spineXDeriv(float y) {
    return 0.42 - y * 0.16
      + cos(y * 2.2 + uTime * 0.10) * 0.066
      + cos(y * 4.8 - uTime * 0.07) * 0.048;
  }

  void main() {
    vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
    float y = uv.y;
    float cx = spineX(y);
    float dcx = spineXDeriv(y);

    vec2 tangent = normalize(vec2(dcx, 1.0));
    vec2 perp = vec2(-tangent.y, tangent.x);
    float dist = dot(uv - vec2(cx, y), perp);

    float w = 0.001;
    float spread = 0.25 - y * y * 0.13;
    float total = 0.0;
    vec3 color = vec3(0.0);

    float sineVal = 0.5 + 0.5 * sin(y * 2.0 + uTime * 0.3);
    float pinch = 1.0 - (y * 0.85) * pow(sineVal, 2.0);
    float twistRamp = smoothstep(0.33, 0.6, y);
    float twist = (0.5 + 0.5 * sin(y * 1.5 - uTime * 0.15)) * twistRamp * 0.4;

    for (int i = 0; i < 200; i++) {
      float fi = float(i) / 199.0;
      float phase = fi * 6.283;
      float fiTwisted = mix(fi, 1.0 - fi, twist);
      float fiFolded = fi + 0.12 * sin(fi * 3.14159 * 4.0);
      float t = fiFolded * 2.0 - 1.0;
      float baseOffset = sign(t) * pow(abs(t), 1.4) * spread * 0.5 * pinch;
      float o = baseOffset
        + sin(y * 2.5 + phase       + uTime * 0.15) * spread * 0.15
        + sin(y * 5.1 - phase * 0.6 + uTime * 0.10) * spread * 0.067;

      float intensity = panel(dist - o, w);
      color += panelColor(fiTwisted) * intensity;
      total += intensity;
    }

    color /= max(total, 0.001);

    float peak = clamp(total * 0.8, 0.0, 1.0);
    color = mix(color, vec3(1.0), smoothstep(0.70, 1.0, peak) * 0.30);

    float sideLighting = 1.0 + dist * 9.0 * twist * twistRamp;
    color *= clamp(sideLighting, 0.3, 1.8);

    float alpha = clamp(total * 3.0, 0.0, 1.0) * 0.95;
    float sideFade = smoothstep(0.0, 0.08, uv.x);

    gl_FragColor = vec4(color, alpha * sideFade);
  }
`;

export default function RibbonCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let rafId: number | null = null;
    let visible = false;
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
        uniforms: { uTime: { value: 0 } },
      });
      const mesh = new Mesh(gl, { geometry, program });

      const handleResize = () => {
        renderer.setSize(container.offsetWidth, container.offsetHeight);
        gl.canvas.style.width = "100%";
        gl.canvas.style.height = "100%";
      };
      handleResize();
      window.addEventListener("resize", handleResize);

      const startTime = Date.now();
      const render = () => {
        program.uniforms.uTime.value = (Date.now() - startTime) / 1000;
        renderer.render({ scene: mesh });
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

      cleanup = () => {
        io.disconnect();
        if (rafId !== null) cancelAnimationFrame(rafId);
        window.removeEventListener("resize", handleResize);
        if (container.contains(gl.canvas)) container.removeChild(gl.canvas);
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      };
    });

    return () => cleanup?.();
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }} />
  );
}
