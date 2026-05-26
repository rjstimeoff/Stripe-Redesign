export default function MobileBlock() {
  return (
    <div className="md:hidden fixed inset-0 z-[1000] bg-[#0a0a14] flex flex-col items-center justify-center text-center px-8">
      <img
        src="/logos/stripe_wordmark.svg"
        alt="Stripe"
        className="h-7 w-auto brightness-0 invert mb-12 opacity-90"
      />
      <h1 className="text-white text-3xl font-medium tracking-tight leading-[1.1] mb-4">
        Built for desktop.
      </h1>
      <p className="text-white/60 text-base leading-relaxed max-w-[18rem]">
        This is a heavy, animation-led experience.
        <br />
        Come back on a laptop.
      </p>
    </div>
  );
}
