"use client";
import React, { useState } from "react";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { WhitepaperModal } from "@/components/ui/WhitepaperModal";
import { CardSpotlight } from "@/components/ui/card-spotlight";
import { Button } from "../ui/button";

const WHITEPAPER_PDF_URL = "/GeoSVM - Whitepaper.pdf"; // Place your PDF in the public folder

export default function WhitepaperCTA() {
  const [open, setOpen] = useState(false);
  return (
        
    <section className="" id="whitepaper" >
      <div className="container max-w-8xl mx-auto">

        <CardSpotlight 
          className="relative mx-auto flex flex-col items-center rounded-3xl shadow-2xl bg-black min-h-[100px] p-8"
          color="#000000"
        >
          {/* Text and CTA */}
          <div className="flex flex-col justify-center items-center gap-6 z-10 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-2 text-white">
              Read the Whitepaper
            </h2>
            <p className="text-md md:text-lg mb-4 max-w-xl text-white/70">
              Dive deep into the technical vision and architecture powering decentralized geospatial computing on Solana.
            </p>
            <div>
              <HoverBorderGradient
                  containerClassName="rounded-full"
                  as={Button}
                  className="dark:bg-black bg-teal-500 text-black dark:text-teal-500 px-6 py-2 cursor-pointer hover:cursor-pointer"
                  onClick={() => setOpen(true)}
                >
                  Read Whitepaper
              </HoverBorderGradient>
            </div>
          </div>

          {/* <div className="relative">
            <img
                src="/whitepaper-cover.png"
                alt="Whitepaper Cover"
                className="rounded-xl shadow-2xl"
                style={{ height: '10%' }}
              />
          </div> */}
          
          {/* Right: Decorative cards, bounded by right/bottom, overflow top */}
          {/* <div className="flex-1 relative min-h-[380px] hidden md:block -mt-[40px] pr-20">
            <div className="absolute right-20 top-0 w-[400px] h-full ">
              <img
                src="/whitepaper-cover.png"
                alt="Whitepaper Cover"
                className="absolute w-full h-full object-cover rounded-xl shadow-2xl"
                style={{ top: '-50px' }}
              />
             
            </div>
          </div> */}

          <WhitepaperModal isOpen={open} onClose={() => setOpen(false)} pdfUrl={WHITEPAPER_PDF_URL} />
        </CardSpotlight>
      </div>
    </section>
  );
} 