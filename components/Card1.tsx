"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

type TagCard = {
  label: string;
  image: string;
};

const CARDS: TagCard[] = [
  { label: "SaaS",         image: "/cards/SaaS_pic.png" },
  { label: "Marketplaces", image: "/cards/marketplace_pic.png" },
  { label: "Platforms",    image: "/cards/platform_pic.png" },
  { label: "Usage-based",  image: "/cards/usage_based_pic.png" },
  { label: "E-commerce",   image: "/cards/ecomm_pic.png" },
  { label: "On-demand",    image: "/cards/on_demand_pic.png" },
];

export default function Card1() {
  const [active, setActive] = useState(0);
  const [displayed, setDisplayed] = useState(CARDS[0].label);
  const displayedRef = useRef(CARDS[0].label);

  useEffect(() => {
    const id = setInterval(() => setActive((i) => (i + 1) % CARDS.length), 3500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const target = CARDS[active].label;
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
  }, [active]);

  const card = CARDS[active];

  return (
    <div>
      {/* Card */}
      <div className="relative min-h-[70vh] overflow-hidden bg-[#e8e4dd]">
        {/* Background image — crossfades on tag change */}
        <AnimatePresence>
          <motion.img
            key={card.image}
            src={card.image}
            alt=""
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </AnimatePresence>

        {/* Top darken gradient for text legibility */}
        <div className="absolute inset-x-0 top-0 h-2/5 bg-gradient-to-b from-black/55 via-black/15 to-transparent pointer-events-none" />

        {/* Static title */}
        <h3 className="absolute inset-x-7 top-7 text-2xl md:text-3xl font-medium text-white leading-tight pr-4">
          Built for whatever you&apos;re building.
        </h3>
      </div>

      {/* Caption — typewriter w/ blinking caret */}
      <div className="mt-[7px] h-4 text-right pr-[3px]">
        <p className="text-xs italic font-serif text-[#0a0a14]">
          {displayed}
          <motion.span
            aria-hidden
            className="inline-block w-[1px] h-[11px] bg-[#0a0a14] ml-[2px] align-[-1px]"
            animate={{ opacity: [1, 1, 0, 0] }}
            transition={{ duration: 0.9, repeat: Infinity, times: [0, 0.5, 0.5, 1], ease: "linear" }}
          />
        </p>
      </div>
    </div>
  );
}
