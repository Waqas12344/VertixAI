"use client";

import { useEffect } from "react";

import type { GeneratedImageItem } from "./image-store";
import { useImageStore } from "./image-store";
import { ImageGallery } from "./image-gallery";
import { PromptBar } from "./prompt-bar";

// ---------------------------------------------------------------------------
// Props — passed down from the server page component
// ---------------------------------------------------------------------------

interface ImageStudioProps {
  /** Credit balance fetched server-side on every page load. */
  initialCredits: number;
  /** Existing generated images for this user, serialized from Prisma. */
  initialImages: GeneratedImageItem[];
}

// ---------------------------------------------------------------------------
// Root client wrapper for the Image Studio feature
// ---------------------------------------------------------------------------

export function ImageStudio({ initialCredits, initialImages }: ImageStudioProps) {
  const { setCredits, setImages } = useImageStore();

  // Hydrate store with server-rendered initial values
  useEffect(() => {
    setCredits(initialCredits);
    setImages(initialImages);
    // Only run once on mount — subsequent updates come from API responses
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {/* Prompt / control bar */}
      <PromptBar />

      {/* Gallery section */}
      <section aria-label="Generated images gallery">
        <h2 className="mb-3 font-medium text-sm text-muted-foreground">
          Your gallery
        </h2>
        <ImageGallery />
      </section>
    </div>
  );
}
