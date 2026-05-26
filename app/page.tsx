import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import WhySection from "@/components/WhySection";
import IntegrationSection from "@/components/IntegrationSection";
import ClosingCTA from "@/components/ClosingCTA";
import LogoMarquee from "@/components/LogoMarquee";
import Footer from "@/components/Footer";
import MobileBlock from "@/components/MobileBlock";

export default function Home() {
  return (
    <>
      <MobileBlock />
      <main className="hidden md:block">
        <Navbar />
        <Hero />
        <WhySection />
        <IntegrationSection />
        <ClosingCTA />
        <LogoMarquee />
        <Footer />
      </main>
    </>
  );
}
