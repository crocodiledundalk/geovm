"use client";
import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface WhitepaperModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
}

export function WhitepaperModal({ isOpen, onClose, pdfUrl }: WhitepaperModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] w-[90vw] h-[90vh] p-0 bg-white">
        <div className="w-full h-full">
          <iframe
            src={pdfUrl}
            title="Whitepaper PDF"
            className="w-full h-full rounded-lg"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
} 