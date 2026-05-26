"use client";

import { motion } from "framer-motion";

export default function ClosingCTA() {
  return (
    <section id="closing-cta" className="relative w-full h-[92vh] overflow-hidden">
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
        <h2 className="text-white font-medium tracking-tight leading-[1.02] text-6xl md:text-8xl drop-shadow-[0_2px_24px_rgba(0,0,0,0.35)]">
          Move money
          <br />
          everywhere.
        </h2>

        <p className="mt-6 max-w-xl text-white/80 text-lg leading-relaxed drop-shadow-[0_1px_12px_rgba(0,0,0,0.4)]">
          Ready to get started?
        </p>

        <div className="mt-10 flex items-center gap-6">
          <motion.a
            href="#"
            className="group inline-flex items-center text-white text-base font-semibold border border-white/40 px-5 py-2.5 rounded"
            whileHover={{ borderColor: "rgba(255,255,255,0.9)" }}
            transition={{ duration: 0.2 }}
          >
            Start now
            <svg
              className="ml-2 translate-y-[0.5px] transition-transform duration-200 group-hover:translate-x-1"
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

          <motion.a
            href="#"
            className="group relative inline-flex items-center text-base font-semibold"
            animate={{ color: "rgba(255,255,255,0.7)" }}
            whileHover={{ color: "rgba(255,255,255,1)" }}
            transition={{ duration: 0.25 }}
          >
            <span className="relative after:absolute after:left-0 after:-bottom-1 after:h-[1.5px] after:w-0 after:bg-white after:transition-all after:duration-300 group-hover:after:w-full">
              Contact sales
            </span>
          </motion.a>
        </div>
      </motion.div>
    </section>
  );
}
