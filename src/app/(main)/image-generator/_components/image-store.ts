"use client";

import { create } from "zustand";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GeneratedImageItem {
  id: string;
  prompt: string;
  imageUrl: string;
  createdAt: string; // ISO string — serialized from the server
}

export type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";

type ImageStore = {
  // ── Gallery state ─────────────────────────────────────────────────────────
  images: GeneratedImageItem[];
  setImages: (images: GeneratedImageItem[]) => void;
  prependImage: (image: GeneratedImageItem) => void;
  removeImage: (id: string) => void;

  // ── Generation state ──────────────────────────────────────────────────────
  isGenerating: boolean;
  setIsGenerating: (v: boolean) => void;

  // ── Prompt / config ───────────────────────────────────────────────────────
  prompt: string;
  setPrompt: (v: string) => void;

  aspectRatio: AspectRatio;
  setAspectRatio: (v: AspectRatio) => void;

  // ── Credit balance (real-time sync) ───────────────────────────────────────
  credits: number;
  setCredits: (v: number) => void;
  decrementCredits: (amount: number) => void;
};

export const useImageStore = create<ImageStore>((set) => ({
  // Gallery
  images: [],
  setImages: (images) => set({ images }),
  prependImage: (image) =>
    set((s) => ({ images: [image, ...s.images] })),
  removeImage: (id) =>
    set((s) => ({ images: s.images.filter((img) => img.id !== id) })),

  // Generation
  isGenerating: false,
  setIsGenerating: (v) => set({ isGenerating: v }),

  // Prompt / config
  prompt: "",
  setPrompt: (v) => set({ prompt: v }),

  aspectRatio: "1:1",
  setAspectRatio: (v) => set({ aspectRatio: v }),

  // Credits
  credits: 0,
  setCredits: (v) => set({ credits: v }),
  decrementCredits: (amount) =>
    set((s) => ({ credits: Math.max(0, s.credits - amount) })),
}));
