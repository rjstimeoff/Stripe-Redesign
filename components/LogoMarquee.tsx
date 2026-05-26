"use client";

const logos: { src: string; alt: string; style: React.CSSProperties }[] = [
  { src: "/logos/openai_wordmark_light.svg",     alt: "OpenAI",    style: { height: 26 } },
  { src: "/logos/figma.svg",                     alt: "Figma",     style: { height: 30, width: 22 } },
  { src: "/logos/vercel_wordmark.svg",           alt: "Vercel",    style: { height: 20 } },
  { src: "/logos/uber_light.svg",                alt: "Uber",      style: { height: 20 } },
  { src: "/logos/anthropic_black_wordmark.svg",  alt: "Anthropic", style: { height: 18 } },
  { src: "/logos/cursor_wordmark_light.svg",     alt: "Cursor",    style: { height: 20, maxWidth: 92 } },
  { src: "/logos/aws_light.svg",                 alt: "AWS",       style: { height: 28 } },
  { src: "/logos/nvidia-wordmark-light.svg",     alt: "NVIDIA",    style: { height: 21 } },
  { src: "/logos/google-wordmark.svg",           alt: "Google",    style: { height: 30 } },
  { src: "/logos/shopify-wordmark-light.svg",    alt: "Shopify",   style: { height: 25 } },
];

const doubled = [...logos, ...logos];

export default function LogoMarquee() {
  return (
    <section
      className="w-full bg-[#f8f7f4] border-t border-zinc-200 py-10 overflow-hidden"
      style={{ borderBottom: "1px dotted #d4d4d8" }}
    >
      <div
        className="relative w-full overflow-hidden"
        style={{
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
          maskImage:
            "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
        }}
      >
        <div className="marquee-track flex items-center gap-16 w-max">
          {doubled.map((logo, i) => (
            <img
              key={`${logo.alt}-${i}`}
              src={logo.src}
              alt={logo.alt}
              className="brightness-0 opacity-60 hover:opacity-100 transition-opacity duration-300 shrink-0"
              style={{ width: "auto", ...logo.style }}
            />
          ))}
        </div>
      </div>

      <style jsx>{`
        .marquee-track {
          animation: marquee 40s linear infinite;
        }
        .marquee-track:hover {
          animation-play-state: paused;
        }
        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}
