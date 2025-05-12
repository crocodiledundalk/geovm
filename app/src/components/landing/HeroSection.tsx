'use client';

import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { GlobeDemo } from '@/components/ui/globe';
import { HoverBorderGradient } from '@/components/ui/hover-border-gradient';

import { Moon, Sun } from 'lucide-react';
import UnicornScene from '../ui/unicorn';

export function HeroSection() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  return (
    <>
    

    <div className="relative flex flex-col items-start justify-center w-full h-screen overflow-hidden">

      <div className="absolute overflow-hidden w-screen">
        <UnicornScene jsonFilePath={theme === 'dark' ? "hero_dark.json" : "hero_light.json"} width="100vw" height="100vh" />
      </div>

      <div className="z-20 relative max-w-8xl mx-auto">
        <div className="w-1/2">
       
          <div className="mb-12">
            <img 
              src={theme === 'dark' ? "/logo-white.svg" : "/logo.svg"} 
              alt="GeoVM Logo" 
              className="h-12 w-auto"
            />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white max-w-4xl">
            GeoVM is enabling
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-4xl">
            Pioneering a revolution in geospatial data, computation and capital markets.
          </p>
          <div className="flex gap-4">
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
      <div className="absolute inset-0 z-10">
        <GlobeDemo theme={theme as 'light' | 'dark'} />
      </div>
    </div>
    </>
  );
} 

