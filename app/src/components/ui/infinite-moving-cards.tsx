"use client";

import { cn } from "@/lib/utils";
import React, { useEffect, useRef, useState } from "react";
import { Button } from "./button";
import { ChevronRight } from "lucide-react";

type UseCase = {
  title: string;
  category: string;
  blurb: string;
  body: string;
};

interface InfiniteMovingCardsProps {
  items: UseCase[];
  direction?: "left" | "right";
  speed?: "fast" | "normal" | "slow";
  pauseOnHover?: boolean;
  className?: string;
  onItemClick?: (item: UseCase) => void;
}

export function InfiniteMovingCards({
  items,
  direction = "left",
  speed = "normal",
  pauseOnHover = true,
  className,
  onItemClick,
}: InfiniteMovingCardsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLUListElement>(null);
  const [start, setStart] = useState(false);

  useEffect(() => {
    addAnimation();
  }, []);

  function addAnimation() {
    if (containerRef.current && scrollerRef.current) {
      const scrollerContent = Array.from(scrollerRef.current.children);

      scrollerContent.forEach((item) => {
        const duplicatedItem = item.cloneNode(true);
        if (scrollerRef.current) {
          scrollerRef.current.appendChild(duplicatedItem);
        }
      });

      getDirection();
      getSpeed();
      setStart(true);
    }
  }

  const getDirection = () => {
    if (containerRef.current) {
      if (direction === "left") {
        containerRef.current.style.setProperty(
          "--animation-direction",
          "forwards"
        );
      } else {
        containerRef.current.style.setProperty(
          "--animation-direction",
          "reverse"
        );
      }
    }
  };

  const getSpeed = () => {
    if (containerRef.current) {
      if (speed === "fast") {
        containerRef.current.style.setProperty("--animation-duration", "20s");
      } else if (speed === "normal") {
        containerRef.current.style.setProperty("--animation-duration", "40s");
      } else {
        containerRef.current.style.setProperty("--animation-duration", "80s");
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "scroller relative z-20 max-w-9xl overflow-hidden [mask-image:linear-gradient(to_right,transparent,white_20%,white_80%,transparent)]",
        className
      )}
    >
      <ul
        ref={scrollerRef}
        className={cn(
          "flex w-max min-w-full shrink-0 flex-nowrap gap-4 py-2",
          start && "animate-scroll",
          pauseOnHover && "hover:[animation-play-state:paused]"
        )}
      >
        {items.map((item, idx) => (
          <li
            key={idx}
            className="group relative w-[350px] max-w-full shrink-0 rounded-2xl overflow-hidden h-[450px] md:w-[450px] cursor-pointer"
            onClick={() => onItemClick?.(item)}
          >
            {/* Background Image */}
            <div 
              className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
              style={{
                backgroundImage: `url(/usecases/${item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png)`
              }}
            />
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
            
            {/* Content Container */}
            <div className="relative z-20 h-full flex flex-col justify-end p-8">
              {/* Category Badge */}
              <div className="mb-4">
                <span className="inline-flex items-center px-3 py-1 text-xs font-medium bg-white/10 backdrop-blur-sm rounded-full text-white/90 border border-white/20">
                  {item.category}
                </span>
              </div>
              
              {/* Title */}
              <h3 className="text-3xl font-bold text-white mb-4">
                {item.title}
              </h3>
              
              {/* Blurb with Read More */}
              <div className="space-y-4">
                <p className="text-base text-white/80 line-clamp-2">
                  {item.blurb}
                </p>
                <Button 
                  variant="ghost" 
                  className="text-white hover:text-white hover:bg-white/10 px-2 h-auto group/button"
                >
                  <span className="flex items-center">
                    Read more
                    <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover/button:translate-x-1" />
                  </span>
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
