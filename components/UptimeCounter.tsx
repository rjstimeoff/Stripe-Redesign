"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";

const TARGET = 99.999;
const DURATION_MS = 1700;

export default function UptimeCounter() {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px 10% 0px" });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(TARGET * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView]);

  return (
    <span ref={ref} className="tabular-nums">
      {value.toFixed(3)}%
    </span>
  );
}
