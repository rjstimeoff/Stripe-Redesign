"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const START_UNITS = 164995957;

function ScrollDigit({ digit }: { digit: number }) {
  return (
    <span
      className="inline-block overflow-hidden align-bottom"
      style={{ height: "1em", lineHeight: "1em" }}
    >
      <motion.span
        className="flex flex-col"
        animate={{ y: `-${digit}em` }}
        transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} style={{ height: "1em", lineHeight: "1em" }}>
            {i}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

export default function GdpTicker() {
  const [units, setUnits] = useState(START_UNITS);

  useEffect(() => {
    const id = setInterval(() => {
      setUnits((u) => u + 1);
    }, 1700);
    return () => clearInterval(id);
  }, []);

  const integer = Math.floor(units / 1e8);
  const decimal = (units % 1e8).toString().padStart(8, "0");
  const chars = `${integer}.${decimal}`.split("");

  return (
    <div className="flex items-baseline gap-2">
      <span className="text-sm font-semibold text-[#0a0a14]">
        Global GDP running on Stripe:
      </span>
      <span className="text-sm text-[#0a0a14]/55 tabular-nums inline-flex items-baseline">
        {chars.map((c, i) =>
          /\d/.test(c) ? (
            <ScrollDigit key={i} digit={parseInt(c, 10)} />
          ) : (
            <span key={i}>{c}</span>
          )
        )}
        %
      </span>
    </div>
  );
}
