"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useOutsideClick } from "@/hooks/use-outside-click";
import { X } from "lucide-react";

interface UseCase {
  title: string;
  category: string;
  blurb: string;
  body: string;
}

interface ExpandableCardProps {
  useCase: UseCase;
  onClose: () => void;
  isOpen: boolean;
}

export function ExpandableCard({ useCase, onClose, isOpen }: ExpandableCardProps) {
  const ref = useRef<HTMLDivElement>(null!);
  const id = useId();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    if (isOpen) {
      document.body.style.overflow = "hidden";
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "auto";
    };
  }, [isOpen, onClose]);

  useOutsideClick(ref, () => onClose());

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm h-full w-full z-10"
          />
          <div className="fixed inset-0 grid place-items-center z-[100] p-4">
            <motion.button
              key={`button-${useCase.title}-${id}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2, delay: 0.1 }}
              className="flex absolute top-4 right-4 items-center justify-center bg-white dark:bg-neutral-800 rounded-full h-8 w-8 shadow-lg hover:scale-110 transition-transform"
              onClick={onClose}
            >
              <X className="h-4 w-4 text-black dark:text-white" />
            </motion.button>
            <motion.div
              layoutId={`card-${useCase.title}-${id}`}
              ref={ref}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ 
                type: "spring",
                stiffness: 300,
                damping: 30,
                duration: 0.3
              }}
              className="w-full max-w-[800px] h-[90vh] flex flex-col bg-white dark:bg-neutral-900 rounded-3xl overflow-hidden shadow-2xl"
            >
              {/* Image Section */}
              <motion.div 
                className="relative h-[300px] w-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div 
                  className="absolute inset-0 bg-cover bg-center"
                  style={{
                    backgroundImage: `url(/usecases/${useCase.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png)`
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <motion.h3
                    layoutId={`title-${useCase.title}-${id}`}
                    className="text-3xl font-bold text-white mb-2"
                  >
                    {useCase.title}
                  </motion.h3>
                  <motion.p
                    layoutId={`category-${useCase.category}-${id}`}
                    className="text-sm text-white/80"
                  >
                    {useCase.category}
                  </motion.p>
                </div>
              </motion.div>

              {/* Content Section */}
              <motion.div 
                className="flex-1 overflow-y-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="p-6 space-y-6">
                  <motion.p
                    layoutId={`blurb-${useCase.blurb}-${id}`}
                    className="text-lg text-neutral-600 dark:text-neutral-300 font-medium"
                  >
                    {useCase.blurb}
                  </motion.p>

                  <motion.div
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: 0.4 }}
                    className="prose prose-neutral dark:prose-invert max-w-none"
                  >
                    <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                      {useCase.body}
                    </p>
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
} 