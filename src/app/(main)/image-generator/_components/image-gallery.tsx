"use client";

import { useState } from "react";

import {
  Check,
  ClipboardCopy,
  Download,
  ImageIcon,
  Loader2,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { useImageStore, type GeneratedImageItem } from "./image-store";

// ---------------------------------------------------------------------------
// Individual image card
// ---------------------------------------------------------------------------

function ImageCard({ image }: { image: GeneratedImageItem }) {
  const removeImage = useImageStore((s) => s.removeImage);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  async function handleDownload() {
    try {
      const res = await fetch(image.imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vertix-${image.id.slice(0, 8)}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Download failed. Please try again.");
    }
  }

  async function handleCopyPrompt() {
    try {
      await navigator.clipboard.writeText(image.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Prompt copied to clipboard.");
    } catch {
      toast.error("Failed to copy prompt.");
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/ai/image?id=${encodeURIComponent(image.id)}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Delete failed");
      }

      removeImage(image.id);
      toast.success("Image deleted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
      setIsDeleting(false);
    }
  }

  return (
    <div className="group relative overflow-hidden rounded-xl border bg-muted/30 shadow-sm transition-shadow hover:shadow-md">
      {/* Loading shimmer */}
      {!imgLoaded && (
        <div className="absolute inset-0 animate-pulse bg-muted" aria-hidden />
      )}

      {/* Image */}
      <Image
        src={image.imageUrl}
        alt={image.prompt}
        width={512}
        height={512}
        className={cn(
          "w-full object-cover transition-opacity duration-300",
          imgLoaded ? "opacity-100" : "opacity-0",
        )}
        onLoad={() => setImgLoaded(true)}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        unoptimized={false}
      />

      {/* Hover overlay */}
      <div
        className={cn(
          "absolute inset-0 flex flex-col justify-between p-3",
          "bg-gradient-to-t from-black/80 via-black/30 to-transparent",
          "opacity-0 transition-opacity duration-200 group-hover:opacity-100",
        )}
      >
        {/* Action buttons — top right */}
        <div className="flex justify-end gap-1.5">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="secondary"
                  className="size-8 bg-black/50 text-white hover:bg-black/70"
                  onClick={handleDownload}
                  aria-label="Download image"
                >
                  <Download className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="secondary"
                  className="size-8 bg-black/50 text-white hover:bg-black/70"
                  onClick={handleCopyPrompt}
                  aria-label="Copy prompt"
                >
                  {copied ? (
                    <Check className="size-3.5 text-green-400" />
                  ) : (
                    <ClipboardCopy className="size-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{copied ? "Copied!" : "Copy prompt"}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="secondary"
                  className="size-8 bg-black/50 text-white hover:bg-destructive/80"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  aria-label="Delete image"
                >
                  {isDeleting ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Prompt text — bottom */}
        <p className="line-clamp-3 text-xs leading-relaxed text-white/90">
          {image.prompt}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Gallery grid
// ---------------------------------------------------------------------------

export function ImageGallery() {
  const images = useImageStore((s) => s.images);
  const isGenerating = useImageStore((s) => s.isGenerating);

  if (images.length === 0 && !isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed bg-muted/20 py-20 text-center">
        <div className="flex size-14 items-center justify-center rounded-full border bg-background shadow-sm">
          <ImageIcon className="size-6 text-muted-foreground" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="font-medium text-sm">No images generated yet</p>
          <p className="max-w-xs text-muted-foreground text-sm">
            Enter a prompt above to create your first masterpiece.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="grid gap-4"
      style={{
        gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))",
      }}
    >
      {/* Generating placeholder card */}
      {isGenerating && (
        <div className="flex min-h-[280px] animate-pulse flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/40">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground text-xs">Generating your image…</p>
        </div>
      )}

      {images.map((image) => (
        <ImageCard key={image.id} image={image} />
      ))}
    </div>
  );
}
