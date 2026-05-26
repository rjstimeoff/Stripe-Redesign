"use client";

import { useState } from "react";
import IntegrationCanvas from "./IntegrationCanvas";
import ParticleLogo from "./ParticleLogo";
import WaveStems from "./WaveStems";

const slides = [
  {
    label: "One integration.",
    n: "01.",
    title: ["One API.", "Six lines of code."],
    body: "Payments, Billing, Tax, Radar, Payouts, Identity — one API, one account, one contract. Turn anything on without a second integration, a second vendor, or a second support team.",
  },
  {
    label: "Every product.",
    n: "02.",
    title: ["Add anything.", "Rewrite nothing."],
    body: "Connect for marketplaces, Billing for subscriptions, Issuing for cards, Terminal for in-person, Radar for fraud. Every new capability plugs into the integration you already shipped.",
  },
  {
    label: "Stripe at the center.",
    n: "03.",
    title: ["All Stripe.", "Any stack."],
    body: "Built and run by Stripe top to bottom — yet drops into whatever you already run. SDKs in every language, webhooks for every event, native plug-ins for Salesforce, NetSuite, and your warehouse.",
  },
];

export default function IntegrationSection() {
  const [activeIdx, setActiveIdx] = useState(0);
  const active = slides[activeIdx];

  return (
    <section className="relative w-full px-32 py-24">
      <div
        className="relative w-full h-[75vh] overflow-hidden"
        style={{
          transform: "translateZ(0)",
          willChange: "transform",
          contain: "paint",
        }}
      >
        <IntegrationCanvas />
        <ParticleLogo activeState={activeIdx} />
        <WaveStems activeIdx={activeIdx} />
        <h2 className="absolute top-12 left-12 z-10 text-[#8b95ad] text-5xl font-medium leading-[1.05] tracking-tight max-w-[42rem]">
          {slides.map((s, i) => (
            <span key={i} className="block">
              <span
                onClick={() => setActiveIdx(i)}
                className={`inline-block origin-left cursor-pointer transition-all duration-500 ease-out hover:text-white ${
                  activeIdx === i ? "text-white scale-[1.06]" : "scale-100"
                }`}
              >
                {s.label}
              </span>
            </span>
          ))}
        </h2>
      </div>

      <div
        key={activeIdx}
        className="grid grid-cols-3 items-center"
        style={{ animation: "fadeIn 400ms ease both" }}
      >
        <div className="pl-[2px] pr-10 pt-6 pb-16">
          <div className="text-8xl font-light tabular-nums text-zinc-900 tracking-tight">
            {active.n}
          </div>
        </div>
        <div className="px-10 pt-6 pb-16 text-center">
          <div className="text-4xl font-medium tracking-tight leading-[1.15] text-zinc-900 inline-block text-left">
            {active.title[0]}
            <br />
            {active.title[1]}
          </div>
        </div>
        <div className="pl-10 pr-[2px] pt-6 pb-16">
          <p className="text-base text-zinc-600 leading-relaxed text-justify">
            {active.body}
          </p>
        </div>
      </div>
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}
