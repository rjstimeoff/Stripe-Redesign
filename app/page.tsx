import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import WhySection from "@/components/WhySection";
import IntegrationSection from "@/components/IntegrationSection";
import ClosingCTA from "@/components/ClosingCTA";
import LogoMarquee from "@/components/LogoMarquee";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <WhySection />
      <IntegrationSection />
      <ClosingCTA />
      <LogoMarquee />
      <Footer />
    </main>
  );
}
