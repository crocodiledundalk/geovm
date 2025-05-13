'use client'; // Need this for useState and handlers

import { useState } from 'react'; // Import useState
import { AboutSection } from "@/components/about-section"
import { CtaSection } from "@/components/cta-section"
import { Footer } from "@/components/footer"
import { GlobeSection } from "@/components/globe-section"
import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { UseCasesSection } from "@/components/use-cases-section"
import { Button } from '@/components/ui/button'; // Import Button
import { CreateWorldModal } from '@/components/CreateWorldModal'; // Import Modal

export default function Home() {
  // State to control the modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const openCreateModal = () => setIsCreateModalOpen(true);
  const closeCreateModal = () => setIsCreateModalOpen(false);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection onOpenCreateModal={openCreateModal} />
        <AboutSection />
        <UseCasesSection />
        <GlobeSection />
        <CtaSection />
      </main>
      <Footer />

      <CreateWorldModal 
        isOpen={isCreateModalOpen} 
        onClose={closeCreateModal} 
      />
    </div>
  )
}
