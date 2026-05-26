"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

type Props = {
  items: string[];
  intervalMs?: number;
  startDelayMs?: number;
  className?: string;
  caretColor?: string;
};

export default function TypewriterRotator({
  items,
  intervalMs = 3500,
  startDelayMs = 0,
  className = "",
  caretColor = "#0a0a14",
}: Props) {
  const [active, setActive] = useState(0);
  const [displayed, setDisplayed] = useState(items[0]);
  const displayedRef = useRef(items[0]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;
    const startId = setTimeout(() => {
      intervalId = setInterval(
        () => setActive((i) => (i + 1) % items.length),
        intervalMs
      );
    }, startDelayMs);
    return () => {
      clearTimeout(startId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [items.length, intervalMs, startDelayMs]);

  useEffect(() => {
    const target = items[active];
    if (displayedRef.current === target) return;

    let cancelled = false;
    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

    (async () => {
      while (displayedRef.current.length > 0 && !cancelled) {
        await sleep(28);
        if (cancelled) return;
        displayedRef.current = displayedRef.current.slice(0, -1);
        setDisplayed(displayedRef.current);
      }
      await sleep(140);
      if (cancelled) return;
      for (let i = 1; i <= target.length; i++) {
        if (cancelled) return;
        await sleep(55);
        if (cancelled) return;
        displayedRef.current = target.slice(0, i);
        setDisplayed(displayedRef.current);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [active, items]);

  return (
    <span className={className}>
      {displayed}
      <motion.span
        aria-hidden
        className="inline-block w-[1px] h-[11px] ml-[2px] align-[-1px]"
        style={{ backgroundColor: caretColor }}
        animate={{ opacity: [1, 1, 0, 0] }}
        transition={{ duration: 0.9, repeat: Infinity, times: [0, 0.5, 0.5, 1], ease: "linear" }}
      />
    </span>
  );
}
