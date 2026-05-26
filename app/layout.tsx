import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://stripe-redesign.vercel.app"),
  title: "Stripe redesign — RJ Rivera",
  description:
    "A speculative redesign of stripe.com by RJ Rivera. Editorial, image-led, built to convert.",
  openGraph: {
    title: "Stripe redesign — RJ Rivera",
    description:
      "A speculative redesign of stripe.com by RJ Rivera. Editorial, image-led, built to convert.",
    images: [
      {
        url: "/stripecta1.webp",
        width: 2460,
        height: 1060,
        alt: "Stripe redesign — aerial intersection",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Stripe redesign — RJ Rivera",
    description:
      "A speculative redesign of stripe.com by RJ Rivera. Editorial, image-led, built to convert.",
    images: ["/stripecta1.webp"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
