"use client";

import { useEffect, useRef } from "react";

import {
  ImageIcon,
  Loader2,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { useState } from "react";

import { type AspectRatio, useImageStore } from "./image-store";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ASPECT_RATIOS: { value: AspectRatio; label: string; hint: string }[] = [
  { value: "1:1", label: "1:1", hint: "Square" },
  { value: "16:9", label: "16:9", hint: "Landscape" },
  { value: "9:16", label: "9:16", hint: "Portrait" },
  { value: "4:3", label: "4:3", hint: "Standard" },
  { value: "3:4", label: "3:4", hint: "Tall" },
];

const INSPIRATION_PROMPTS = [
  "A futuristic city skyline at dusk, neon reflections on wet streets, cinematic photography",
  "A serene Japanese zen garden in autumn, maple leaves falling, soft golden hour light",
  "An astronaut floating in deep space surrounded by colorful nebulae, hyperrealistic",
];

const IMAGE_COST = 5;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PromptBar() {
  const {
    prompt,
    setPrompt,
    aspectRatio,
    setAspectRatio,
    isGenerating,
    setIsGenerating,
    credits,
    setCredits,
    prependImage,
  } = useImageStore();

  const [showCreditGate, setShowCreditGate] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [prompt]);

  async function handleGenerate() {
    if (credits < IMAGE_COST) {
      setShowCreditGate(true);
      return;
    }

    if (!prompt.trim()) {
      toast.error("Please enter a prompt before generating.");
      return;
    }

    setIsGenerating(true);

    try {
      const res = await fetch("/api/ai/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), aspectRatio }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 402) {
          setShowCreditGate(true);
          return;
        }
        if (res.status === 429) {
          toast.error(
            data.message ??
              "Rate limit reached. Your credits were refunded. Please wait a moment and try again.",
          );
          return;
        }
        toast.error(data.message ?? "Generation failed. Please try again.");
        return;
      }

      // Prepend new image to gallery and sync remaining credits
      prependImage({
        ...data.image,
        createdAt:
          typeof data.image.createdAt === "string"
            ? data.image.createdAt
            : new Date(data.image.createdAt).toISOString(),
      });
      setCredits(data.remainingCredits);
      toast.success("Image generated successfully.");
    } catch {
      toast.error("Network error. Please check your connection and try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  function handleInspirationClick(text: string) {
    setPrompt(text);
    textareaRef.current?.focus();
  }

  const canGenerate = !isGenerating && credits >= IMAGE_COST;

  return (
    <>
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm">
        {/* Prompt textarea */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="image-prompt" className="text-sm font-medium">
            Describe your image
          </Label>
          <Textarea
            id="image-prompt"
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A hyper-realistic golden retriever puppy sitting in a field of sunflowers at sunrise…"
            className="min-h-[72px] resize-none overflow-hidden text-sm leading-relaxed"
            disabled={isGenerating}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleGenerate();
              }
            }}
          />
        </div>

        {/* Aspect ratio + generate row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Aspect ratio selector */}
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Aspect ratio</Label>
            <ToggleGroup
              type="single"
              value={aspectRatio}
              onValueChange={(v) => v && setAspectRatio(v as AspectRatio)}
              className="gap-1"
            >
              {ASPECT_RATIOS.map((ar) => (
                <ToggleGroupItem
                  key={ar.value}
                  value={ar.value}
                  aria-label={ar.hint}
                  className="h-8 px-2.5 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                  title={ar.hint}
                >
                  {ar.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          {/* Generate button */}
          <Button
            onClick={handleGenerate}
            disabled={!canGenerate || !prompt.trim()}
            className={cn(
              "gap-2 min-w-[180px]",
              isGenerating && "opacity-80",
            )}
            size="default"
          >
            {isGenerating ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <WandSparkles className="size-4" />
                Generate
                <span className="ml-0.5 rounded-full bg-primary-foreground/20 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums leading-none">
                  5 credits
                </span>
              </>
            )}
          </Button>
        </div>

        {/* Low-credit warning inline */}
        {credits < IMAGE_COST && credits > 0 && (
          <p className="flex items-center gap-1.5 text-xs text-destructive">
            <ImageIcon className="size-3.5" />
            You need {IMAGE_COST} credits to generate. You have {credits}.{" "}
            <Link href="/billing" className="underline underline-offset-2 font-medium">
              Top up
            </Link>
          </p>
        )}
        {credits === 0 && (
          <p className="flex items-center gap-1.5 text-xs text-destructive">
            <ImageIcon className="size-3.5" />
            You have no credits left.{" "}
            <Link href="/billing" className="underline underline-offset-2 font-medium">
              Top up to continue
            </Link>
          </p>
        )}

        {/* Inspiration prompts */}
        <div className="flex flex-col gap-1.5">
          <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="size-3" />
            Inspiration
          </Label>
          <div className="flex flex-wrap gap-2">
            {INSPIRATION_PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handleInspirationClick(p)}
                disabled={isGenerating}
                className="rounded-full border border-dashed bg-muted/50 px-3 py-1 text-left text-xs text-muted-foreground transition-colors hover:border-primary/60 hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50 line-clamp-1 max-w-[260px]"
                title={p}
              >
                {p.length > 52 ? `${p.slice(0, 52)}…` : p}
              </button>
            ))}
          </div>
        </div>

        {/* Hint */}
        <p className="text-[11px] text-muted-foreground/70">
          Tip: Press{" "}
          <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">
            ⌘ Enter
          </kbd>{" "}
          to generate quickly.
        </p>
      </div>

      {/* Credit gate dialog */}
      <Dialog open={showCreditGate} onOpenChange={setShowCreditGate}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="size-5 text-muted-foreground" />
              Not enough credits
            </DialogTitle>
            <DialogDescription>
              Generating an image costs <strong>5 credits</strong>. Your current
              balance is <strong>{credits} credit{credits !== 1 ? "s" : ""}</strong>.
              Top up to keep creating.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowCreditGate(false)}>
              Cancel
            </Button>
            <Button asChild>
              <Link href="/billing" onClick={() => setShowCreditGate(false)}>
                Top up credits
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
