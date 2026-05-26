"use client";

// Snapshot: "Ready to get started?" variant — restrained Q→A copy with custom subtitle.
// Saved 2026-05-26 so the louder "Move money everywhere." version can be compared side-by-side.

import { motion } from "framer-motion";

export default function ClosingCTA() {
  return (
    <section className="relative w-full h-[92vh] overflow-hidden">
      <img
        src="/stripecta1.webp"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />

      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/40" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,0,0,0)_0%,_rgba(0,0,0,0.35)_75%)]" />

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.7, ease: [0.2, 0.65, 0.3, 1] }}
        className="relative z-10 h-full w-full flex flex-col items-center justify-center text-center px-8"
      >
        <h2 className="text-white font-medium tracking-tight leading-[1.02] text-3xl md:text-5xl drop-shadow-[0_2px_24px_rgba(0,0,0,0.35)]">
          Ready to get started?
        </h2>

        <p className="mt-5 max-w-md text-white/80 text-base leading-relaxed drop-shadow-[0_1px_12px_rgba(0,0,0,0.4)]">
          Create an account instantly, or contact us to design a custom package for your business.
        </p>

        <motion.a
          href="#"
          className="mt-10 inline-flex items-center bg-[#635bff] text-white px-6 py-3.5 rounded text-base font-semibold shadow-lg shadow-black/40"
          whileHover={{ skewX: -8, skewY: -4, backgroundColor: "#4f46e5" }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          Get started
          <svg
            className="ml-2 translate-y-[0.5px]"
            width="6"
            height="10"
            viewBox="0 0 8 13"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M1 0.5l6 6L1 12.5"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.a>
      </motion.div>
    </section>
  );
}
