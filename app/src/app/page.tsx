'use client';

import { useState } from 'react';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeatureSection } from '@/components/landing/FeatureSection';
import { UseCasesSection } from '@/components/landing/UseCasesSection';
import { FooterSection } from '@/components/landing/FooterSection';
import { FlatMapSection } from '@/components/landing/FlatMapSection';
import { ExplainerSection } from '@/components/landing/ExplainerSection';
import WhitepaperCTA from '@/components/landing/WhitepaperCTA';
import VideoSection from '@/components/landing/VideoSection';
import { HeroSectionVideo } from '@/components/landing/HeroSectionVideo';

export default function Home() {
  // State to control the modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const openCreateModal = () => setIsCreateModalOpen(true);
  const closeCreateModal = () => setIsCreateModalOpen(false);

  return (
    <main className="min-h-screen bg-black">
      <HeroSectionVideo />
      <ExplainerSection />
      <VideoSection />
      <FlatMapSection />
      <UseCasesSection/>
      <FooterSection />
    </main>
  );
}
