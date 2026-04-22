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
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [logoIndex, setLogoIndex] = useState(0);


  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleEnded = () => setCurrentIndex((prev) => (prev + 1) % videos.length);
    video.addEventListener("ended", handleEnded);
    return () => video.removeEventListener("ended", handleEnded);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.load();
    video.play().catch(() => {});
  }, [currentIndex]);

  useEffect(() => {
    const interval = setInterval(() => {
      setLogoIndex((prev) => (prev + 1) % logos.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col justify-end px-12 pb-16 overflow-hidden">
      {/* Video background */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        muted
        playsInline
      >
        <source src={videos[currentIndex]} type="video/mp4" />
      </video>

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" />

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
