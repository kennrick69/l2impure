import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { MainContent } from "@/components/MainContent";
import { DiscordBanner } from "@/components/DiscordBanner";
import { FeaturesSection } from "@/components/FeaturesSection";
import { StatisticsSection } from "@/components/StatisticsSection";
import { JoinSection } from "@/components/JoinSection";
import { Footer } from "@/components/Footer";
import { HopZoneBanner } from "@/components/HopZoneBanner";
import { PlayModalProvider } from "@/components/PlayModal";

export default function Home() {
  return (
    <PlayModalProvider>
      <Header />
      <main className="flex-1">
        <Hero />
        <MainContent />
        <DiscordBanner />
        <FeaturesSection />
        <StatisticsSection />
        <JoinSection />
      </main>
      <Footer />
      <HopZoneBanner />
    </PlayModalProvider>
  );
}
