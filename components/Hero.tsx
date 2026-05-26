"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useRef, useState, useEffect } from "react";

const videos = [
  "/videos/stripevid1.mp4",
  "/videos/stripevid2.mp4",
  "/videos/stripevid3.mp4",
  "/videos/stripevid4.mp4",
  "/videos/stripevid5.mp4",
  "/videos/stripevid6.mp4",
  "/videos/stripevid7.mp4",
];

const logos: { src: string; alt: string; style: React.CSSProperties; className?: string }[] = [
  { src: "/logos/openai_wordmark_light.svg",     alt: "OpenAI",    style: { height: 29 } },
  { src: "/logos/figma.svg",                     alt: "Figma",     style: { height: 36, width: 24 }, className: "" },
  { src: "/logos/vercel_wordmark.svg",           alt: "Vercel",    style: { height: 22 } },
  { src: "/logos/uber_light.svg",                alt: "Uber",      style: { height: 22 } },
  { src: "/logos/anthropic_black_wordmark.svg",  alt: "Anthropic", style: { height: 20 } },
  { src: "/logos/cursor_wordmark_light.svg",     alt: "Cursor",    style: { height: 22, maxWidth: 100 } },
  { src: "/logos/aws_light.svg",                 alt: "AWS",       style: { height: 32 } },
  { src: "/logos/nvidia-wordmark-light.svg",     alt: "NVIDIA",    style: { height: 23 } },
  { src: "/logos/google-wordmark.svg",           alt: "Google",    style: { height: 34 } },
  { src: "/logos/shopify-wordmark-light.svg",    alt: "Shopify",   style: { height: 28 } },
];

export default function Hero() {
  const aRef = useRef<HTMLVideoElement>(null);
  const bRef = useRef<HTMLVideoElement>(null);
  const [aSrc, setASrc] = useState(videos[0]);
  const [bSrc, setBSrc] = useState(videos[1 % videos.length]);
  const [active, setActive] = useState<"a" | "b">("a");
  const idxRef = useRef({ a: 0, b: 1 % videos.length });
  const [logoIndex, setLogoIndex] = useState(0);

  useEffect(() => {
    aRef.current?.play().catch(() => {});
  }, []);

  useEffect(() => {
    const el = active === "a" ? aRef.current : bRef.current;
    if (!el) return;

    const onEnded = () => {
      const finishing = active;
      const nextSlot = active === "a" ? "b" : "a";
      const nextEl = nextSlot === "a" ? aRef.current : bRef.current;

      nextEl?.play().catch(() => {});
      setActive(nextSlot);

      const newClipIdx = (idxRef.current[nextSlot] + 1) % videos.length;
      window.setTimeout(() => {
        idxRef.current[finishing] = newClipIdx;
        if (finishing === "a") setASrc(videos[newClipIdx]);
        else setBSrc(videos[newClipIdx]);
      }, 300);
    };

    el.addEventListener("ended", onEnded);
    return () => el.removeEventListener("ended", onEnded);
  }, [active]);

  useEffect(() => {
    const interval = setInterval(() => {
      setLogoIndex((prev) => (prev + 1) % logos.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col justify-end px-12 pb-16 overflow-hidden">
      {/* Crossfading background videos */}
      <video
        ref={aRef}
        src={aSrc}
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: active === "a" ? 1 : 0, transition: "opacity 0.3s ease-in-out" }}
      />
      <video
        ref={bRef}
        src={bSrc}
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: active === "b" ? 1 : 0, transition: "opacity 0.3s ease-in-out" }}
      />

      {/* Overlay - fades out in the bottom 30% so the white can blend cleanly */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/50 to-black/0 [--tw-gradient-via-position:70%]" />

      {/* Fade to next section */}
      <div className="absolute bottom-0 left-0 right-0 h-[131px] bg-gradient-to-b from-[#f8f7f4]/0 via-[#f8f7f4]/30 to-[#f8f7f4] z-10 pointer-events-none" />

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 max-w-4xl"
      >
        <h1 className="text-4xl md:text-6xl font-medium text-white leading-tight tracking-normal mb-4">
          Accept payments. Move money. Grow anywhere.
        </h1>
        <p className="text-lg text-white/70 leading-relaxed mb-8">
          Add Stripe to your platform and manage every aspect of your business's finances in one place.
        </p>
        <motion.a
          href="#"
          className="inline-flex items-center bg-[#635bff] text-white px-5 py-3 rounded text-base font-semibold shadow-lg shadow-[#635bff]/40"
          whileHover={{ skewX: -8, skewY: -4, backgroundColor: "#4f46e5" }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          Get started
          <svg className="ml-2 translate-y-[0.5px]" width="6" height="10" viewBox="0 0 8 13" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 0.5l6 6L1 12.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.a>
      </motion.div>

      {/* Trusted by — bottom right */}
      <div className="absolute bottom-16 right-12 z-10 text-right">
        <p className="text-white/40 text-[13px] uppercase tracking-widest mb-2 text-center">Trusted by</p>
        <div className="h-10 w-44 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.img
            key={logoIndex}
            src={logos[logoIndex].src}
            alt={logos[logoIndex].alt}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.4 }}
            className={logos[logoIndex].className !== undefined ? logos[logoIndex].className : "brightness-0 invert"}
            style={{ width: "auto", ...logos[logoIndex].style }}
          />
        </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
