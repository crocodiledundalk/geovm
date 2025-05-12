import { AboutSection } from "@/components/about-section"
import { CtaSection } from "@/components/cta-section"
import { Footer } from "@/components/footer"
import { GlobeSection } from "@/components/globe-section"
import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { UseCasesSection } from "@/components/use-cases-section"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <AboutSection />
        <UseCasesSection />
        <GlobeSection />
        <CtaSection />
      </main>
      <Footer />
    </div>
  )
}
