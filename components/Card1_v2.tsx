"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";

const TAGS = ["SaaS", "Marketplaces", "Platforms", "Usage-based", "E-commerce", "On-demand"];

const DOMAINS = [
  "acme.com/subscribe",
  "marketplace.io/checkout",
  "platform.dev/onboard",
  "api-co.com/invoice",
  "shop.com/checkout",
  "rideshare.app/pay",
];

const NfcIcon = () => (
  <img src="/contactless-tap.png" alt="" width={64} height={32} className="block" />
);

type TerminalData = { merchant: string; amount: string; items: { label: string; amount: string }[] };

const TERMINALS: TerminalData[] = [
  { merchant: "Pay Acme", amount: "$53.41", items: [{ label: "Pro Plan", amount: "$49.00" }, { label: "Tax", amount: "$4.41" }, { label: "Total", amount: "$53.41" }] },
  { merchant: "Pay Gear Vault", amount: "$346.80", items: [{ label: "Vintage Fender Strat", amount: "$340.00" }, { label: "Buyer protection", amount: "$6.80" }, { label: "Total", amount: "$346.80" }] },
  { merchant: "Pay Builder", amount: "$1,308.00", items: [{ label: "Platform access", amount: "$1,200.00" }, { label: "Tax", amount: "$108.00" }, { label: "Total", amount: "$1,308.00" }] },
  { merchant: "Pay API Co.", amount: "$15.60", items: [{ label: "API calls", amount: "$12.40" }, { label: "Storage", amount: "$3.20" }, { label: "Total", amount: "$15.60" }] },
  { merchant: "Pay Shop.", amount: "$129.00", items: [{ label: "Nike Air Max 90", amount: "$129.00" }, { label: "Shipping", amount: "Free" }, { label: "Total", amount: "$129.00" }] },
  { merchant: "Pay Swift", amount: "$18.40", items: [{ label: "Base fare", amount: "$14.00" }, { label: "Tip (20%)", amount: "$2.80" }, { label: "Surge", amount: "$1.60" }, { label: "Total", amount: "$18.40" }] },
];

function PhoneContent({ index, continueLabel, btnBg, btnColor }: { index: number; continueLabel: string; btnBg: string; btnColor: string }) {
  const t = TERMINALS[index];
  return (
    <div className="flex flex-col items-center w-full h-full">
      {/* NFC icon */}
      <div className="mb-3 mt-1">
        <NfcIcon />
      </div>

      {/* Merchant + amount */}
      <p className="text-[11px] text-[#425466] mb-1">{t.merchant}</p>
      <p className="text-3xl font-bold text-[#0a2540] mb-1">{t.amount}</p>
      <p className="text-[10px] text-[#8898aa] mb-4">Tap, insert, or swipe to pay</p>

      {/* Line items */}
      <div className="w-full flex-1">
        {t.items.map((item, i) => (
          <div
            key={item.label}
            className={`flex justify-between py-2 text-[10px] ${i < t.items.length - 1 ? "border-b border-[#eef0f5]" : "font-semibold"}`}
          >
            <span className={i === t.items.length - 1 ? "text-[#0a2540]" : "text-[#425466]"}>{item.label}</span>
            <span className="text-[#0a2540]">{item.amount}</span>
          </div>
        ))}
      </div>

      {/* Continue */}
      <button
        className="w-full py-2.5 rounded-xl text-[11px] font-medium mt-3"
        style={{ background: btnBg, color: btnColor }}
      >
        {continueLabel}
      </button>
    </div>
  );
}

type PaymentMethod = { label: string; sub?: string; icon: React.ReactNode; selected: boolean };
type CheckoutData = {
  brand: string;
  email: string;
  methods: PaymentMethod[];
  product: string;
  productSub: string;
  emoji: string;
  lineItems: { label: string; amount: string }[];
  continueLabel: string;
  btnBg: string;
  btnColor: string;
};

function MethodIcon({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className={`w-5 h-5 rounded flex items-center justify-center text-white text-[9px] font-bold shrink-0 ${color}`}>
      {children}
    </span>
  );
}

const CHECKOUTS: CheckoutData[] = [
  {
    brand: "ACME.",
    email: "jane.diaz@stripe.com",
    methods: [
      { label: "Card", icon: <MethodIcon color="bg-slate-600">▪</MethodIcon>, selected: false },
      { label: "Link", sub: "Pay in one click", icon: <MethodIcon color="bg-[#00d632]">⚡</MethodIcon>, selected: true },
      { label: "Apple Pay", icon: <MethodIcon color="bg-black">🍎</MethodIcon>, selected: false },
    ],
    product: "Pro Plan", productSub: "Billed monthly", emoji: "⚡",
    lineItems: [{ label: "Subtotal", amount: "$49.00" }, { label: "Tax", amount: "$4.41" }, { label: "Total", amount: "$53.41" }],
    continueLabel: "Subscribe",
    btnBg: "#635bff", btnColor: "#ffffff",          // blurple — SaaS subscription
  },
  {
    brand: "GEAR VAULT.",
    email: "buyer@example.com",
    methods: [
      { label: "Card", icon: <MethodIcon color="bg-slate-600">▪</MethodIcon>, selected: false },
      { label: "Affirm", sub: "4 interest-free payments of $86.70", icon: <MethodIcon color="bg-blue-500">A</MethodIcon>, selected: true },
      { label: "Cash App", icon: <MethodIcon color="bg-[#00d632]">$</MethodIcon>, selected: false },
    ],
    product: "Vintage Fender Strat", productSub: "Sold by @gear_vault", emoji: "🎸",
    lineItems: [{ label: "Item", amount: "$340.00" }, { label: "Buyer protection", amount: "$6.80" }, { label: "Total", amount: "$346.80" }],
    continueLabel: "Pay securely",
    btnBg: "#ffe4cc", btnColor: "#c4500a",          // orange — marketplace/consumer
  },
  {
    brand: "BUILDER.",
    email: "admin@acmecorp.com",
    methods: [
      { label: "Card", icon: <MethodIcon color="bg-slate-600">▪</MethodIcon>, selected: true },
      { label: "US bank account", icon: <MethodIcon color="bg-blue-700">🏦</MethodIcon>, selected: false },
      { label: "Wire transfer", icon: <MethodIcon color="bg-gray-500">→</MethodIcon>, selected: false },
    ],
    product: "Platform access", productSub: "Annual plan", emoji: "🏗️",
    lineItems: [{ label: "Subtotal", amount: "$1,200.00" }, { label: "Tax", amount: "$108.00" }, { label: "Total", amount: "$1,308.00" }],
    continueLabel: "Connect with Stripe",
    btnBg: "#0570de", btnColor: "#ffffff",          // blue — B2B enterprise
  },
  {
    brand: "API CO.",
    email: "dev@startup.io",
    methods: [
      { label: "Card", icon: <MethodIcon color="bg-slate-600">▪</MethodIcon>, selected: true },
      { label: "ACH debit", icon: <MethodIcon color="bg-blue-400">≡</MethodIcon>, selected: false },
      { label: "Crypto", icon: <MethodIcon color="bg-purple-500">₿</MethodIcon>, selected: false },
    ],
    product: "Invoice #1042", productSub: "Due today",  emoji: "📊",
    lineItems: [{ label: "API calls", amount: "$12.40" }, { label: "Storage", amount: "$3.20" }, { label: "Total", amount: "$15.60" }],
    continueLabel: "Pay invoice",
    btnBg: "#d4f5e2", btnColor: "#0a6640",          // green — dev/usage-based billing
  },
  {
    brand: "SHOP.",
    email: "jane.diaz@stripe.com",
    methods: [
      { label: "Card", icon: <MethodIcon color="bg-slate-600">▪</MethodIcon>, selected: false },
      { label: "Affirm", sub: "Pay now or 4 payments of $32.25", icon: <MethodIcon color="bg-blue-500">A</MethodIcon>, selected: true },
      { label: "Apple Pay", icon: <MethodIcon color="bg-black">🍎</MethodIcon>, selected: false },
      { label: "Cash App", icon: <MethodIcon color="bg-[#00d632]">$</MethodIcon>, selected: false },
    ],
    product: "Nike Air Max 90", productSub: "Size 10 · Black · Qty 1", emoji: "👟",
    lineItems: [{ label: "Subtotal", amount: "$129.00" }, { label: "Shipping", amount: "Free" }, { label: "Total", amount: "$129.00" }],
    continueLabel: "Continue",
    btnBg: "#ffe4cc", btnColor: "#c4500a",          // orange — e-commerce (intentional duplicate)
  },
  {
    brand: "SWIFT.",
    email: "rider@example.com",
    methods: [
      { label: "Card", icon: <MethodIcon color="bg-slate-600">▪</MethodIcon>, selected: false },
      { label: "Apple Pay", icon: <MethodIcon color="bg-black">🍎</MethodIcon>, selected: true },
      { label: "Cash App", icon: <MethodIcon color="bg-[#00d632]">$</MethodIcon>, selected: false },
    ],
    product: "Express delivery", productSub: "ETA ~18 min", emoji: "🚀",
    lineItems: [{ label: "Base fare", amount: "$14.00" }, { label: "Tip (20%)", amount: "$2.80" }, { label: "Total", amount: "$18.40" }],
    continueLabel: "Confirm & Pay",
    btnBg: "#e8e6ff", btnColor: "#4b44d4",          // light blurple — on-demand (intentional duplicate)
  },
];

function BrowserContent({ index }: { index: number }) {
  const d = CHECKOUTS[index];
  return (
    <div className="flex h-full text-[#0a2540]">
      {/* Left: checkout form */}
      <div className="flex-1 flex flex-col gap-3 p-5 overflow-y-auto">
        <p className="text-sm font-bold tracking-wide">{d.brand}</p>

        {/* Email */}
        <div>
          <p className="text-xs text-[#425466] mb-1">Email</p>
          <div className="border border-[#e0e0e0] rounded-lg px-3 py-2 text-xs">{d.email}</div>
        </div>

        {/* Express buttons */}
        <div className="flex gap-2">
          <button className="flex-1 py-2 rounded-lg bg-[#00d632] text-white text-xs font-medium flex items-center justify-center gap-1">
            <span>⚡</span> Link
          </button>
          <button className="flex-1 py-2 rounded-lg bg-black text-white text-xs font-medium">
            🍎 Pay
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-[#e0e0e0]" />
          <span className="text-xs text-[#425466]">or</span>
          <div className="flex-1 h-px bg-[#e0e0e0]" />
        </div>

        {/* Payment methods */}
        <p className="text-xs text-[#425466]">Payment method</p>
        <div className="border border-[#e0e0e0] rounded-xl overflow-hidden">
          {d.methods.map((m, i) => (
            <div
              key={m.label}
              className={`flex items-start gap-2 px-3 py-2.5 ${i < d.methods.length - 1 ? "border-b border-[#e0e0e0]" : ""} ${m.selected ? "bg-[#f6f9fc]" : ""}`}
            >
              <div className={`w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 ${m.selected ? "border-[#635bff] bg-[#635bff]" : "border-[#c0c0c0]"}`} />
              {m.icon}
              <div>
                <p className="text-xs font-medium leading-tight">{m.label}</p>
                {m.sub && <p className="text-[11px] text-[#425466] leading-tight mt-0.5">{m.sub}</p>}
              </div>
            </div>
          ))}
        </div>

        {/* Continue */}
        <button
          className="w-full py-2.5 rounded-lg text-xs font-medium mt-auto"
          style={{ background: d.btnBg, color: d.btnColor }}
        >
          {d.continueLabel}
        </button>
      </div>

      {/* Right: order summary — intentionally overflows frame right edge */}
      <div className="w-[285px] shrink-0 -mr-[25px] flex flex-col gap-4 p-5 border-l border-[#f0f0f0]">
        <p className="text-base font-semibold text-[#0a2540]">Order summary</p>
        <div className="border border-[#e8e8e8] rounded-xl p-3 flex items-center gap-3">
          <div className="w-16 h-16 bg-[#f6f9fc] rounded-lg flex items-center justify-center text-4xl shrink-0">{d.emoji}</div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[#0a2540] leading-snug">{d.product}</p>
            <p className="text-xs text-[#425466] leading-snug mt-0.5">{d.productSub}</p>
            <p className="text-sm font-semibold text-[#0a2540] mt-1">{d.lineItems[0].amount}</p>
          </div>
        </div>
        <div className="space-y-3 mt-2">
          {d.lineItems.map((item, i) => (
            <div
              key={item.label}
              className={`flex justify-between text-sm ${i === d.lineItems.length - 1 ? "border-t border-[#e0e0e0] pt-3 font-semibold" : "text-[#425466]"}`}
            >
              <span>{item.label}</span>
              <span className="text-[#0a2540]">{item.amount}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Card1() {
  const [active, setActive] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const lift = useSpring(0, { stiffness: 250, damping: 35 });
  const scale = useSpring(1, { stiffness: 250, damping: 35 });
  const border = useSpring(0, { stiffness: 300, damping: 35 });
  const shadow = useTransform(lift, [0, 10], [
    "0 4px 20px rgba(0,0,0,0.06)",
    "0 20px 48px rgba(0,0,0,0.13)",
  ]);
  const bezelMask = useTransform([rawX, rawY], ([x, y]: number[]) => {
    const px = ((x as number) + 0.5) * 100;
    const py = ((y as number) + 0.5) * 100;
    return `radial-gradient(circle 320px at ${px}% ${py}%, #fff, transparent)`;
  });
  useEffect(() => {
    const id = setInterval(() => setActive((i) => (i + 1) % TAGS.length), 3500);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div
      ref={cardRef}
      initial="rest"
      whileHover="hover"
      style={{ translateZ: lift, scale, boxShadow: shadow, position: "relative" }}
      onMouseMove={(e) => {
        const r = cardRef.current!.getBoundingClientRect();
        rawX.set((e.clientX - r.left) / r.width - 0.5);
        rawY.set((e.clientY - r.top) / r.height - 0.5);
        lift.set(10); scale.set(1.013); border.set(1);
      }}
      onMouseLeave={() => { rawX.set(0); rawY.set(0); lift.set(0); scale.set(1); border.set(0); }}
      className="bg-transparent backdrop-blur-md rounded-2xl p-8 flex flex-col min-h-[70vh] overflow-hidden"
    >
      <motion.svg
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: border, pointerEvents: "none", zIndex: 50, WebkitMask: bezelMask, maskImage: bezelMask }}
      >
        <defs>
          <linearGradient id="card1-bezel-grad" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
            <stop offset="0%" stopColor="#ff4444" />
            <stop offset="100%" stopColor="#4444ff" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" rx="16" ry="16" fill="none" stroke="url(#card1-bezel-grad)" strokeWidth="2" />
      </motion.svg>
      {/* Header */}
      <motion.button
        className="absolute top-5 right-5 w-7 h-7 rounded-lg flex items-center justify-center"
        variants={{
          rest: { skewX: 0, skewY: 0, backgroundColor: "rgba(255,255,255,0.85)", color: "#635bff" },
          hover: { skewX: -10, skewY: -3, backgroundColor: "rgba(99,91,255,1)", color: "#ffffff" },
        }}
        transition={{
          skewX: { type: "spring", stiffness: 400, damping: 20 },
          skewY: { type: "spring", stiffness: 400, damping: 20 },
          backgroundColor: { type: "tween", ease: "easeOut", duration: 0.15 },
          color: { type: "tween", ease: "easeOut", duration: 0.15 },
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M9 1h4v4M5 13H1V9M13 1L8 6M1 13l5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.button>
      <h3 className="text-3xl font-medium text-[#0a2540] leading-tight mb-5 pr-10">Built for whatever you&apos;re building.</h3>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-8">
        {TAGS.map((tag, i) => (
          <button
            key={tag}
            onClick={() => setActive(i)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 ${
              i === active
                ? "bg-[#635bff] text-white"
                : "border border-white/40 text-[#425466] bg-white/20"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Mockups */}
      <div className="flex-1 flex items-end gap-6">
        {/* Phone frame */}
        <div className="shrink-0 w-[200px]">
          <div className="relative w-[200px] h-[400px] bg-[#1a1a1a] rounded-[36px] p-[4px] shadow-2xl">
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[50px] h-[6px] bg-[#1a1a1a] rounded-full z-10" />
            <div className="w-full h-full bg-white rounded-[32px] overflow-hidden flex flex-col items-center pt-12 px-4 pb-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  className="w-full"
                >
                  <PhoneContent index={active} continueLabel={CHECKOUTS[active].continueLabel} btnBg={CHECKOUTS[active].btnBg} btnColor={CHECKOUTS[active].btnColor} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Browser frame — oversized, clips at card edge */}
        <div className="w-[680px] shrink-0 h-[520px] bg-white rounded-tl-xl overflow-hidden border border-[#e0e0e0]/60 shadow-lg flex flex-col -mb-8 -mr-8">
          {/* Chrome bar */}
          <div className="bg-[#f5f5f7] px-4 py-3 flex items-center gap-3 border-b border-[#e0e0e0]/60 shrink-0">
            <div className="flex gap-2">
              <div className="w-3.5 h-3.5 rounded-full bg-[#ff5f57]" />
              <div className="w-3.5 h-3.5 rounded-full bg-[#ffbd2e]" />
              <div className="w-3.5 h-3.5 rounded-full bg-[#28c840]" />
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex-1 bg-white rounded-md px-3 py-1.5 text-xs text-[#666] flex items-center gap-2 min-w-0"
              >
                <svg width="10" height="11" viewBox="0 0 10 11" fill="none" className="shrink-0">
                  <rect x="0.5" y="0.5" width="9" height="10" rx="2" stroke="#999" strokeWidth="0.8" />
                  <path d="M3 4.5h4M3 6.5h3" stroke="#999" strokeWidth="0.8" strokeLinecap="round" />
                </svg>
                <span className="truncate">{DOMAINS[active]}</span>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Page content */}
          <div className="flex-1 relative overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 overflow-auto"
              >
                <BrowserContent index={active} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
