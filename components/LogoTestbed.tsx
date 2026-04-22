import React from "react";

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

export default function LogoTestbed() {
  return (
    <section className="bg-black px-12 py-16">
      <p className="text-white/40 text-xs uppercase tracking-widest mb-8">— Logo Testbed (delete me) —</p>
      <div className="flex flex-wrap items-center gap-10">
        {logos.map((logo) => (
          <div key={logo.alt} className="flex flex-col items-center gap-2">
            <img
              src={logo.src}
              alt={logo.alt}
              className={logo.className !== undefined ? logo.className : "brightness-0 invert"}
              style={{ width: "auto", ...logo.style }}
            />
            <span className="text-white/30 text-[10px]">{logo.alt}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
