"use client";

import WorldMap from "@/components/ui/world-map";
import { motion } from "framer-motion";
import WhitepaperCTA from "@/components/landing/WhitepaperCTA";

export function FlatMapSection() {
  return (
    <div className="w-full relative">
      <div className="max-w-7xl mx-auto text-center">
        {/* <p className="font-bold text-xl md:text-4xl text-white">
          Global{" "}
          <span className="text-neutral-400">
            {"Connectivity".split("").map((word, idx) => (
              <motion.span
                key={idx}
                className="inline-block"
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: idx * 0.04 }}
              >
                {word}
              </motion.span>
            ))}
          </span>
        </p> */}
        {/* <p className="text-sm md:text-lg text-neutral-500 max-w-2xl mx-auto py-4">
          Connect and verify location data across the globe. Perfect for distributed systems and global applications.
        </p> */}
      </div>
      <WorldMap
        dots={[
          // {
          //   start: {
          //     lat: 64.2008,
          //     lng: -149.4937,
          //   }, // Alaska (Fairbanks)
          //   end: {
          //     lat: 34.0522,
          //     lng: -118.2437,
          //   }, // Los Angeles
          // },
          // {
          //   start: { lat: 64.2008, lng: -149.4937 }, // Alaska (Fairbanks)
          //   end: { lat: -15.7975, lng: -47.8919 }, // Brazil (Brasília)
          // },
          // {
          //   start: { lat: -15.7975, lng: -47.8919 }, // Brazil (Brasília)
          //   end: { lat: 38.7223, lng: -9.1393 }, // Lisbon
          // },
          // {
          //   start: { lat: 51.5074, lng: -0.1278 }, // London
          //   end: { lat: 28.6139, lng: 77.209 }, // New Delhi
          // },
          // {
          //   start: { lat: 28.6139, lng: 77.209 }, // New Delhi
          //   end: { lat: 43.1332, lng: 131.9113 }, // Vladivostok
          // },
          // {
          //   start: { lat: 28.6139, lng: 77.209 }, // New Delhi
          //   end: { lat: -1.2921, lng: 36.8219 }, // Nairobi
          // },
        ]}
      />
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 w-full max-w-3xl">
        <WhitepaperCTA />
      </div>
    </div>
  );
} 