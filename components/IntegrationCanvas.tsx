"use client";

import { useRef, useEffect } from "react";
import { Renderer, Program, Mesh, Triangle } from "ogl";

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
  varying vec2 vUv;
  uniform float uAspect;

  void main() {
    // Aspect-correct distance from bottom-center (vUv.y = 0 is bottom).
    // Under-correct the x scale so the orb is slightly wider than tall (subtle
    // horizontal stretch instead of a perfect circle).
    vec2 d2 = vUv - vec2(0.5, 0.0);
    d2.x *= uAspect / 1.25;
    float d = length(d2);

    // Sampled from reference: cream edges, saturated amber/peach mid, hot
    // pink-magenta into a lavender core at the bottom-center focal point.
    vec3 cream    = vec3(0.988, 0.965, 0.925);
    vec3 butter   = vec3(0.988, 0.890, 0.640);
    vec3 peach    = vec3(0.972, 0.760, 0.560);
    vec3 magenta  = vec3(0.910, 0.490, 0.670);
    vec3 lavender = vec3(0.776, 0.561, 0.800);

    // Soft bloom concentrated near the bottom-center; cream takes over the
    // upper half of the panel and the top corners.
    vec3 color = cream;
    color = mix(color, butter,   smoothstep(1.15, 0.80, d));
    color = mix(color, peach,    smoothstep(0.80, 0.50, d));
    color = mix(color, magenta,  smoothstep(0.50, 0.22, d));
    color = mix(color, lavender, smoothstep(0.22, 0.00, d));

    gl_FragColor = vec4(color, 1.0);
  }
`;

export default function IntegrationCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new Renderer({ alpha: false, antialias: true });
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
        uAspect: { value: 1 },
      },
    });
    const mesh = new Mesh(gl, { geometry, program });

    const handleResize = () => {
      const w = container.offsetWidth;
      const h = container.offsetHeight;
      renderer.setSize(w, h);
      gl.canvas.style.width = "100%";
      gl.canvas.style.height = "100%";
      program.uniforms.uAspect.value = w / h;
      renderer.render({ scene: mesh });
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    // Static gradient — render once. No RAF loop needed.
    renderer.render({ scene: mesh });

    return () => {
      window.removeEventListener("resize", handleResize);
      if (container.contains(gl.canvas)) container.removeChild(gl.canvas);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0" />
  );
}
