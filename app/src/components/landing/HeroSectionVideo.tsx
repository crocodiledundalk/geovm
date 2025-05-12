'use client';

import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { HoverBorderGradient } from '@/components/ui/hover-border-gradient';
import { useEffect, useRef } from 'react';
import { FlipWords } from '@/components/ui/flip-words';

export function HeroSectionVideo() {
  const router = useRouter();
  const { theme } = useTheme();
  const videoRef = useRef<HTMLVideoElement>(null);

  const words = [
    "geospatial capital markets.",
    "verifiable location oracles.",
    "geospatial revenue attribution.",
    "census oracle services.",
    "geospatial revenue attribution.",
    "observational oracle networks.",
    "geosharded distributed networks.",
    "better DePIN coordination.",
    "geodata interoperability",
  ];

  useEffect(() => {
    // Ensure video plays when component mounts
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
        <div className="flex flex-col w-full md:w-2/3 lg:w-2/3 md:min-h-[2/3] lg:min-h-[2/3]">

            <div className="text-xl md:text-2xl text-gray-200 mb-8 w-full text-left ">
                <span className="inline-flex items-center px-4 py-3 rounded-full bg-teal-500/25 border border-teal-500/50 text-teal-500">
                <img 
                    src="/logo-teal.svg"
                    alt="GeoVM" 
                    className="h-4 w-auto inline-block text-teal-500"
                />
                </span>
            </div>

            <div className="text-5xl md:text-8xl font-bold text-white text-left flex items-left gap-4 w-full">
                GeoSVM is enabling &nbsp;
            </div>
            <h1 className="text-5xl md:text-8xl font-bold mb-6 text-teal-500 text-left flex items-left w-full gap-4">
                <div className="w-full w-full">
                    <FlipWords 
                        words={words} 
                        className="text-teal-500"
                        duration={4000}
                    />
                </div>
            </h1>

            <div className="text-md md:text-lg mb-8 max-w-2/3 space-y-1 ">
                <span className="text-white ">
                    The first virtual machine with an <b>inherent understanding of our world's geospatial hierarchy</b>. 
                </span>&nbsp;
                <span className="text-white/70 ">
                    Unlock new frontiers for <b>physical infrastucture networks</b>, <b>location-based capital markets</b> and more.
                </span>
            </div>

            <div className="flex gap-4 ">
                <HoverBorderGradient
                    containerClassName="rounded-full"
                    as={Button}
                    className="dark:bg-black bg-teal-500 text-black dark:text-teal-500 px-6 py-2 cursor-pointer hover:cursor-pointer"
                    onClick={() => router.push('/#whitepaper')}
                >
                    Whitepaper
                </HoverBorderGradient>
                <HoverBorderGradient
                    containerClassName="rounded-full"
                    as={Button}
                    className="dark:bg-black bg-teal-500 text-black dark:text-teal-500 px-6 py-2 cursor-pointer hover:cursor-pointer"
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