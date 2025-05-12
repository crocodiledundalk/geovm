"use client";
import React, { useState } from "react";
import { VideoModal } from "@/components/ui/VideoModal";
import { Play } from "lucide-react";

const VIDEO_URL = "https://www.youtube.com/embed/YOUR_VIDEO_ID"; // Replace with your video ID

export default function VideoSection() {
  const [open, setOpen] = useState(false);

  return (
    <section className="max-w-8xl mx-auto py-12 bg-transparent" id="video">
      <div className="relative max-w-8xl mx-auto flex flex-col items-center text-center gap-8 pb-24">
        <h2 className="text-4xl md:text-5xl font-bold text-white">
          Watch the Demo
        </h2>
        <p className="text-lg md:text-2xl text-gray-300 max-w-2xl">
          See GeoSVM in action and discover how it's revolutionizing geospatial use cases and capital markets.
        </p>
        
        <div 
          className="relative w-full max-w-4xl aspect-video rounded-3xl overflow-hidden cursor-pointer group"
          onClick={() => setOpen(true)}
        >
          <img
            src="/earth.webp"
            alt="Video Thumbnail"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-all duration-300" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Play className="w-12 h-12 text-indigo-600 ml-1" />
            </div>
          </div>
        </div>

        <VideoModal isOpen={open} onClose={() => setOpen(false)} videoUrl={VIDEO_URL} />
      </div>
    </section>
  );
} 