"use client"
import type React from "react"
import { useEffect, useRef, useState } from "react"
import { useMotionValueEvent, useScroll, AnimatePresence } from "framer-motion"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { HoverBorderGradient } from "./hover-border-gradient"
import { Button } from "./button"
import { useRouter } from 'next/navigation';

export const StickyScroll = ({
  content,
  contentClassName,
}: {
  content: {
    title: string
    subtitle: string
    description: string
    content?: React.ReactNode | any
  }[]
  contentClassName?: string
}) => {
  const [activeCard, setActiveCard] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter();

  // Use the entire page for scrolling instead of a container
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  })

  const cardLength = content.length
  // const cardLength = 1000; //typeof window !== 'undefined' ? window.innerHeight * 0.4 : 400 // 40vh equivalent

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const cardsBreakpoints = content.map((_, index) => index / cardLength)
    const closestBreakpointIndex = cardsBreakpoints.reduce((acc, breakpoint, index) => {
      const distance = Math.abs(latest - breakpoint)
      if (distance < Math.abs(latest - cardsBreakpoints[acc])) {
        return index
      }
      return acc
    }, 0)
    setActiveCard(closestBreakpointIndex)
  })

  const backgroundColors = [
    "#0f172a", // slate-900
    "#000000", // black
    "#171717", // neutral-900
  ]

  const linearGradients = [
    "linear-gradient(to bottom right, #06b6d4, #10b981)", // cyan-500 to emerald-500
    "linear-gradient(to bottom right, #ec4899, #6366f1)", // pink-500 to indigo-500
    "linear-gradient(to bottom right, #f97316, #eab308)", // orange-500 to yellow-500
  ]

  const [backgroundGradient, setBackgroundGradient] = useState(linearGradients[0])

  useEffect(() => {
    setBackgroundGradient(linearGradients[activeCard % linearGradients.length])
  }, [activeCard])

  return (
    <motion.div
      ref={ref}
      animate={{
        // backgroundColor: backgroundColors[activeCard % backgroundColors.length],
      }}
      className="relative min-h-screen w-full"
    >
      <div className="mx-auto flex max-w-7xl flex-col md:flex-row">
        {/* Left scrolling content */}
        <div className="w-full px-4 py-16 md:w-1/2 md:py-24">
          <div className="max-w-lg">
            {content.map((item, index) => (
              <div key={item.title + index} className="mb-40 min-h-[80vh] flex flex-col justify-center">
                <motion.h2
                  initial={{ opacity: 0 }}
                  animate={{ opacity: activeCard === index ? 1 : 0.3 }}
                  className="text-3xl font-bold text-slate-100"
                >
                  {item.title}
                </motion.h2>
                <motion.h2
                  initial={{ opacity: 0 }}
                  animate={{ opacity: activeCard === index ? 1 : 0.3 }}
                  className="text-xl text-teal-500/70 mt-2"
                >
                  {item.subtitle}
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: activeCard === index ? 1 : 0.3 }}
                  className="mt-6 text-md text-slate-400"
                >
                  {item.description}
                </motion.p>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: activeCard === index ? 1 : 0.3 }}
                  className="mt-6"
                >
                  <HoverBorderGradient
                    containerClassName="rounded-full"
                    as={Button}
                    className="dark:bg-black bg-teal-500 text-black dark:text-teal-500 px-6 py-2 cursor-pointer hover:cursor-pointer"
                    onClick={() => router.push('/#whitepaper')}
                >
                    Read the Whitepaper
                </HoverBorderGradient>
                </motion.p>
                
              </div>
            ))}
            {/* Extra space at the bottom to ensure scrolling works properly */}
            <div className="h-[50vh]" />
          </div>
        </div>

        {/* Right sticky content */}
        <div className="sticky top-0 hidden h-screen w-full items-center justify-center p-4 md:flex md:w-1/2">
          <div
            // style={{ background: backgroundGradient }}
            className={cn(
              "h-[60vh] w-full max-w-xl overflow-hidden rounded-xl shadow-2xl transition-all duration-500",
              contentClassName,
            )}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeCard}
                initial={{ opacity: 0, rotateY: -90, scale: 0.8 }}
                animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                exit={{ opacity: 0, rotateY: 90, scale: 0.8 }}
                transition={{ 
                  duration: 0.5,
                  ease: [0.4, 0, 0.2, 1],
                  scale: { duration: 0.3 }
                }}
                style={{ 
                  perspective: "1000px",
                  transformStyle: "preserve-3d"
                }}
                className="w-full h-full"
              >
                {content[activeCard].content ?? null}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
