import { Dialog, DialogContent } from "@/components/ui/dialog";

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
}

export function VideoModal({ isOpen, onClose, videoUrl }: VideoModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] w-[90vw] h-[80vh] p-0 bg-black">
        <div className="w-full h-full">
          <iframe
            src={videoUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </DialogContent>
    </Dialog>
  );
} 