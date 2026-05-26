"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const ITEMS = ["Fraud", "Retries", "Disputes", "Tax", "Compliance"];
const STAGGER = 0.16;
const START_DELAY = 0.35;

export default function HandledChecklist() {
  const ref = useRef<HTMLUListElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px 0% 0px" });

  return (
    <ul ref={ref} className="space-y-1.5">
      {ITEMS.map((label, i) => (
        <li key={label} className="flex items-center gap-2.5 text-xs">
          <span className="relative flex h-3.5 w-3.5 items-center justify-center border border-[#0a0a14]/30">
            <motion.span
              className="absolute inset-0 bg-[#0a0a14]"
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ duration: 0.2, delay: START_DELAY + i * STAGGER }}
            />
            <motion.svg
              viewBox="0 0 12 12"
              className="relative h-2.5 w-2.5 text-[#F6F1E8]"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.25, delay: START_DELAY + 0.1 + i * STAGGER }}
            >
              <path
                d="M2.5 6.5 L5 9 L9.5 3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </motion.svg>
          </span>
          <motion.span
            initial={{ opacity: 0.45 }}
            animate={inView ? { opacity: 0.85 } : {}}
            transition={{ duration: 0.3, delay: START_DELAY + i * STAGGER }}
            className="text-[#0a0a14]"
          >
            {label}
          </motion.span>
        </li>
      ))}
    </ul>
  );
}
