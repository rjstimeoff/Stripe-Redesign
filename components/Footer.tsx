const columns: { title: string; items: string[] }[] = [
  {
    title: "Products",
    items: [
      "Payments",
      "Billing",
      "Connect",
      "Issuing",
      "Terminal",
      "Radar",
      "Identity",
      "Climate",
    ],
  },
  {
    title: "Solutions",
    items: [
      "Enterprises",
      "Startups",
      "SaaS",
      "Marketplaces",
      "Ecommerce",
      "Platforms",
    ],
  },
  {
    title: "Developers",
    items: [
      "Documentation",
      "API reference",
      "API status",
      "Libraries and SDKs",
      "Changelog",
    ],
  },
  {
    title: "Resources",
    items: [
      "Customer stories",
      "Blog",
      "Guides",
      "Sessions",
      "Pricing",
      "Support",
    ],
  },
  {
    title: "Company",
    items: [
      "Jobs",
      "Newsroom",
      "Stripe Press",
      "Privacy & terms",
      "Contact sales",
    ],
  },
];

export default function Footer() {
  return (
    <footer className="w-full bg-[#f8f7f4] px-12 pt-24 pb-10">
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-y-12">
        {columns.map((col, i) => (
          <div
            key={col.title}
            className={
              i === 0
                ? "pr-8"
                : "pl-4 pr-8 border-l border-dotted border-zinc-300"
            }
          >
            <h4 className="text-sm font-semibold text-zinc-900 mb-4">
              {col.title}
            </h4>
            <ul className="space-y-2.5">
              {col.items.map((item) => (
                <li key={item}>
                  <a
                    href="#"
                    className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors duration-200"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-zinc-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <img
          src="/logos/stripe_wordmark.svg"
          alt="Stripe"
          className="h-6 w-auto"
        />
        <div className="flex items-center gap-6 text-xs text-zinc-500">
          <span>© 2026 Stripe, Inc.</span>
          <a href="#" className="hover:text-zinc-900 transition-colors">
            United States (English)
          </a>
        </div>
      </div>
    </footer>
  );
}
