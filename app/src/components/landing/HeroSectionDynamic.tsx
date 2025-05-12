'use client';

import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { HoverBorderGradient } from '@/components/ui/hover-border-gradient';
import { useEffect, useRef } from 'react';
import { FlipWords } from '@/components/ui/flip-words';

export function HeroSectionDynamic() {
  const router = useRouter();
  const { theme } = useTheme();
  const videoRef = useRef<HTMLVideoElement>(null);

  const words = [
    "spatial",
    "geographic",
    "location-based",
    "territorial",
    "regional"
  ];

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(error => {
        console.error("Error playing video:", error);
      });
    }
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center w-full h-screen overflow-hidden">
      {/* Video Background */}
      <div className="absolute inset-0 w-full h-full">
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: 'center' }}
        >
          <source src="/globe2_11mb.mp4" type="video/quicktime" />
          <source src="/globe2_11mb.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        {/* Overlay to ensure text readability */}
        <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
        {/* Vignette effect */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.5) 100%)',
            pointerEvents: 'none'
          }}
        />
      </div>

      <div className="z-20 relative max-w-8xl mx-auto px-4">
        <div className="flex flex-col items-center justify-center w-full">
          <div className="mb-12">
            <img 
              src="/logo-white.svg"
              alt="GeoVM Logo" 
              className="h-12 w-auto"
            />
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white text-center">
            The world isn't flat. <br/>
            Why are blockchain data models?
          </h1>
          <p className="text-xl md:text-2xl text-gray-200 mb-8 max-w-4xl text-center">
            Pioneering a revolution in{" "}
            <FlipWords 
              words={words} 
              className="text-blue-400 font-semibold"
              duration={4000}
            />{" "}
            data, computation and capital markets.
          </p>
          <div className="flex gap-4 justify-center">
            <HoverBorderGradient
              containerClassName="rounded-full"
              as={Button}
              className="dark:bg-black bg-white text-black dark:text-white px-6 py-2"
              onClick={() => router.push('/#whitepaper')}
            >
              Whitepaper
            </HoverBorderGradient>
            <HoverBorderGradient
              containerClassName="rounded-full"
              as={Button}
              className="dark:bg-black bg-white text-black dark:text-white px-6 py-2"
              onClick={() => router.push('/worlds')}
            >
              Demo
            </HoverBorderGradient>
          </div>
        </div>
      </div>
    </div>
  );
} 