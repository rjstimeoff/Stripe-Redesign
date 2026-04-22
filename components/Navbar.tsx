"use client";

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4">
      <div className="flex items-center gap-8">
        <img src="/logos/stripe_wordmark.svg" alt="Stripe" className="h-7 w-auto brightness-0 invert" />
        <div className="hidden md:flex items-center gap-6 text-sm text-white/70">
          <a href="#" className="hover:text-white transition-colors">Products</a>
          <a href="#" className="hover:text-white transition-colors">Solutions</a>
          <a href="#" className="hover:text-white transition-colors">Developers</a>
          <a href="#" className="hover:text-white transition-colors">Resources</a>
          <a href="#" className="hover:text-white transition-colors">Pricing</a>
        </div>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <a href="#" className="text-white/70 hover:text-white transition-colors">Sign in</a>
        <a
          href="#"
          className="border border-white/30 text-white px-4 py-2 rounded font-medium hover:bg-white/10 hover:border-white/60 transition-colors"
        >
          <span className="inline-flex items-center">
            Start now
            <svg className="ml-2 translate-y-[0.5px]" width="6" height="10" viewBox="0 0 8 13" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 0.5l6 6L1 12.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </a>
      </div>
    </nav>
  );
}
