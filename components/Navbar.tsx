"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

const SUCK_IN  = { type: "tween", duration: 0.22, ease: [0.7, 0, 1, 1] } as const;
const EXPAND   = { type: "tween", duration: 0.52, ease: [0, 0, 0.3, 1] } as const;

export default function Navbar() {
  const [scrolled,     setScrolled]     = useState(false);
  const [collapsed,    setCollapsed]    = useState(false);
  const [inClosingCTA, setInClosingCTA] = useState(false);

  useEffect(() => {
    let ticking = false;
    let ctaEl: HTMLElement | null = null;

    const compute = () => {
      ticking = false;
      if (!ctaEl) ctaEl = document.getElementById("closing-cta");

      const y  = window.scrollY;
      const vh = window.innerHeight;

      setScrolled(y > vh * 0.85);
      // trigger when title has risen ~40% up the viewport
      setCollapsed(y > vh * 0.40);

      if (ctaEl) {
        const rect = ctaEl.getBoundingClientRect();
        // fires as soon as the section is within ~navbar-height of the top
        // (so the dark logo never paints over the dark image)
        setInClosingCTA(rect.top < vh * 0.1 && rect.bottom > 0);
      }
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(compute);
    };

    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // In the closing CTA we reverse: white logo + items spit back out, mirroring the initial collapse.
  const light       = !scrolled || inClosingCTA;
  const isCollapsed = collapsed && !inClosingCTA;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4">
      <div className="flex items-center gap-8">
        <motion.img
          src="/logos/stripe_wordmark.svg"
          alt="Stripe"
          animate={{
            filter: light ? "brightness(0) invert(1)" : "brightness(0)",
            x: isCollapsed ? [0, -7, 5, -2, 0] : 0,
            scaleX: isCollapsed ? [1, 0.90, 1.07, 0.97, 1] : 1,
            scaleY: isCollapsed ? [1, 1.07, 0.95, 1.02, 1] : 1,
          }}
          transition={{
            filter: { duration: 0.4 },
            x:      isCollapsed ? { duration: 0.55, delay: 0.16, ease: "easeOut", times: [0, 0.20, 0.48, 0.74, 1] } : { duration: 0.3 },
            scaleX: isCollapsed ? { duration: 0.55, delay: 0.16, ease: "easeOut", times: [0, 0.22, 0.50, 0.76, 1] } : { duration: 0.3 },
            scaleY: isCollapsed ? { duration: 0.55, delay: 0.16, ease: "easeOut", times: [0, 0.22, 0.50, 0.76, 1] } : { duration: 0.3 },
          }}
          className="h-7 w-auto"
        />
        <motion.div
          className="hidden md:flex items-center gap-6 text-sm"
          animate={{
            x:       isCollapsed ? -160 : 0,
            scale:   isCollapsed ? 0.4  : 1,
            opacity: isCollapsed ? 0    : 1,
          }}
          transition={isCollapsed ? SUCK_IN : EXPAND}
        >
          {["Products", "Solutions", "Developers", "Resources", "Pricing"].map((item) => (
            <motion.a
              key={item}
              href="#"
              animate={{ color: light ? "rgba(255,255,255,0.7)" : "rgba(10,10,20,0.6)" }}
              whileHover={{ color: light ? "rgba(255,255,255,1)" : "rgba(10,10,20,1)" }}
              transition={{ duration: 0.3 }}
            >
              {item}
            </motion.a>
          ))}
        </motion.div>
      </div>
      <motion.div
        className="flex items-center gap-4 text-sm"
        animate={{
          x:       isCollapsed ? -540 : 0,
          scale:   isCollapsed ? 0.2  : 1,
          opacity: isCollapsed ? 0    : 1,
        }}
        transition={isCollapsed ? SUCK_IN : EXPAND}
      >
        <motion.a
          href="#"
          animate={{ color: light ? "rgba(255,255,255,0.7)" : "rgba(10,10,20,0.6)" }}
          whileHover={{ color: light ? "rgba(255,255,255,1)" : "rgba(10,10,20,1)" }}
          transition={{ duration: 0.3 }}
        >
          Sign in
        </motion.a>
        <motion.a
          href="#"
          animate={{
            borderColor: light ? "rgba(255,255,255,0.3)" : "rgba(10,10,20,0.25)",
            color: light ? "rgba(255,255,255,1)" : "rgba(10,10,20,0.85)",
          }}
          whileHover={{
            borderColor: light ? "rgba(255,255,255,0.6)" : "rgba(10,10,20,0.6)",
          }}
          transition={{ duration: 0.3 }}
          className="border px-4 py-2 rounded font-medium"
        >
          <span className="inline-flex items-center">
            Start now
            <svg className="ml-2 translate-y-[0.5px]" width="6" height="10" viewBox="0 0 8 13" fill="none" xmlns="http://www.w3.org/2000/svg">
              <motion.path
                d="M1 0.5l6 6L1 12.5"
                animate={{ stroke: light ? "white" : "rgba(10,10,20,0.85)" }}
                transition={{ duration: 0.3 }}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </motion.a>
      </motion.div>
    </nav>
  );
}
