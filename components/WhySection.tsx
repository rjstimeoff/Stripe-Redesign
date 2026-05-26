"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Card1 from "./Card1";
import Globe from "./Globe";
import RibbonCanvas from "./RibbonCanvas";
import TypewriterRotator from "./TypewriterRotator";
import GdpTicker from "./GdpTicker";
import UptimeCounter from "./UptimeCounter";
import HandledChecklist from "./HandledChecklist";

const STATS_TOP = [
  "200M+ active subscriptions managed on Stripe Billing",
  "135+ currencies and payment methods supported",
  "$1.9T in payments volume processed in 2025",
  "99.999% historical uptime for Stripe services",
];

const STATS_BOTTOM = [
  "500M+ API requests per day",
  "10K+ API requests per second",
  "150K+ transactions per minute",
];

const lines = [
  { text: "Stripe gives you the payments infrastructure.", muted: true },
  { text: "You focus on the product.", muted: false },
];

const lineWindows = [
  { in: [0.05, 0.12], out: [0.90, 0.98] },
  { in: [0.12, 0.19], out: [0.90, 0.98] },
];

function AnimatedLine({
  text,
  muted,
  window: win,
  scrollYProgress,
}: {
  text: string;
  muted: boolean;
  window: { in: number[]; out: number[] };
  scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  const opacity = useTransform(
    scrollYProgress,
    [win.in[0], win.in[1], win.out[0], win.out[1]],
    [0, 1, 1, 0]
  );
  const y = useTransform(
    scrollYProgress,
    [win.in[0], win.in[1], win.out[0], win.out[1]],
    [28, 0, 0, -28]
  );
  return (
    <motion.h2
      style={{ opacity, y }}
      className={`text-4xl md:text-6xl font-medium leading-tight tracking-normal ${muted ? "text-[#0a0a14]/40" : "text-[#0a0a14]"}`}
    >
      {text}
    </motion.h2>
  );
}

export default function WhySection() {
  const contentRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: contentRef,
    offset: ["start end", "end start"],
  });

  return (
    <section className="relative overflow-clip min-h-screen">
      <div
        ref={contentRef}
        className="relative flex flex-col gap-2 px-28 pt-16 pb-24"
        style={{ zIndex: 1 }}
      >
        {lines.map((line, i) => (
          <AnimatedLine
            key={line.text}
            text={line.text}
            muted={line.muted}
            window={lineWindows[i]}
            scrollYProgress={scrollYProgress}
          />
        ))}

        {/* Gallery row 1 — left card / middle text / right card */}
        <div className="grid grid-cols-3 gap-12 mt-10">
          <div className="col-start-1 ml-4 mt-8">
            <Card1 />
          </div>

          {/* Middle text */}
          <div className="col-start-2 flex flex-col justify-center">
            <h3 className="text-3xl font-medium text-[#0a0a14] leading-tight">
              For every kind of business.
            </h3>
            <h3 className="text-3xl font-medium text-[#0a0a14]/40 leading-tight mb-6">
              Any amount of customers.
            </h3>
            <p className="text-sm text-[#0a0a14]/60 leading-relaxed mb-8">
              Whether you&apos;re shipping software, running a marketplace, or building a platform that powers other businesses — Stripe handles the payments. Same APIs, same uptime, same tools, no matter how unique your business model is. Six lines of code to get started, infinite room to grow into.
            </p>
            <div className="flex flex-col gap-2.5">
              <a href="#" className="group flex items-center gap-3 text-xs text-[#0a0a14]/80 hover:text-[#0a0a14] transition-colors">
                <span className="text-[#0a0a14]/40 tabular-nums">01</span>
                <span className="origin-left transition-transform duration-200 ease-out group-hover:scale-[1.15]">Read the documentation</span>
              </a>
              <a href="#" className="group flex items-center gap-3 text-xs text-[#0a0a14]/80 hover:text-[#0a0a14] transition-colors">
                <span className="text-[#0a0a14]/40 tabular-nums">02</span>
                <span className="origin-left transition-transform duration-200 ease-out group-hover:scale-[1.15]">See pricing</span>
              </a>
            </div>
          </div>

          {/* Right column — globe bleeds off right edge of page (absolute so it doesn't push grid height) */}
          <div className="col-start-3 mt-8 min-h-[70vh] relative">
            <div
              className="absolute top-1/2 right-0 aspect-square h-[100vh]"
              style={{ transform: "translate(calc(45% + 7rem), -50%)" }}
            >
              <Globe scrollYProgress={scrollYProgress} />
            </div>
            <div className="absolute bottom-0 left-0 z-10">
              <GdpTicker />
            </div>
          </div>
        </div>

      </div>

      {/* Row 2 — two staggered cards on left, text on right. Outside contentRef so it doesn't affect globe scroll timing. */}
      <div className="px-28 pt-32 pb-24">
        <div className="grid grid-cols-3 gap-12">
          {/* Left card — RibbonCanvas, scale-cropped deep into the band so the card fills with color */}
          <div className="col-start-1 mt-24">
            <div className="mb-[11px] h-4 text-left pl-[3px]">
              <TypewriterRotator
                items={STATS_TOP}
                intervalMs={10000}
                className="text-xs italic font-serif text-[#0a0a14]"
              />
            </div>
            <div className="relative aspect-square overflow-hidden">
              <div
                className="absolute"
                style={{ width: "100vw", height: "90vh", top: "0", left: "-47vw" }}
              >
                <RibbonCanvas />
              </div>
            </div>
            <div className="mt-[1px] h-4 text-right pr-[3px]">
              <TypewriterRotator
                items={STATS_BOTTOM}
                intervalMs={10000}
                startDelayMs={5000}
                className="text-xs italic font-serif text-[#0a0a14]"
              />
            </div>
          </div>

          {/* Middle card — staggered higher */}
          <div className="col-start-2">
            <div className="relative aspect-square overflow-hidden bg-[#e8e4dd]">
              <img
                src="/issues_pic.png"
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Right text block */}
          <div className="col-start-3">
            <h3 className="text-3xl font-medium text-[#0a0a14] leading-tight">
              We handle the hard parts.
            </h3>
            <h3 className="text-3xl font-medium text-[#0a0a14]/40 leading-tight mb-6">
              <UptimeCounter /> uptime.
            </h3>
            <p className="text-sm text-[#0a0a14]/60 leading-relaxed mb-6">
              Stripe handles fraud, retries, disputes, tax, and compliance — so your team doesn&apos;t have to. The same infrastructure that processes hundreds of millions of dollars a day for the world&apos;s largest companies is yours from day one.
            </p>
            <div className="mb-7">
              <HandledChecklist />
            </div>
            <div className="flex flex-col gap-2.5">
              <a href="#" className="group flex items-center gap-3 text-xs text-[#0a0a14]/80 hover:text-[#0a0a14] transition-colors">
                <span className="text-[#0a0a14]/40 tabular-nums">01</span>
                <span className="origin-left transition-transform duration-200 ease-out group-hover:scale-[1.15]">See reliability docs</span>
              </a>
            </div>
            <div className="mt-8 flex w-fit">
              <div className="h-[25px] w-[25px]" style={{ backgroundColor: "#635BFF" }} />
              <div className="h-[25px] w-[25px]" style={{ backgroundColor: "#A06CFF" }} />
              <div className="h-[25px] w-[25px]" style={{ backgroundColor: "#FF7847" }} />
              <div className="h-[25px] w-[25px]" style={{ backgroundColor: "#FF5996" }} />
              <div className="h-[25px] w-[25px]" style={{ backgroundColor: "#F6F1E8" }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
