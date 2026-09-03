"use client";

import { format } from "date-fns";
import {
  AlertCircle,
  Bot,
  Coins,
  Copy,
  Lightbulb,
  Paperclip,
  Sparkles,
  Square,
  User,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CHAT_MODELS, findModel, type ChatModelId } from "@/config/ai-models";
import { cn } from "@/lib/utils";

import type { AttachedImage, ChatMessage } from "./types";
import { useChatStore } from "./use-chat-store";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const SUGGESTED_PROMPTS = [
  "Explain quantum computing in simple terms",
  "Write a Python script to parse a CSV file",
  "What are the best practices for REST API design?",
  "Draft a professional email declining a meeting",
];

const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_IMAGES = 4;

// ---------------------------------------------------------------------------
// Utility — File → AttachedImage
// ---------------------------------------------------------------------------
function fileToAttachedImage(file: File): Promise<AttachedImage> {
  return new Promise((resolve, reject) => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      reject(new Error(`Unsupported type: ${file.type}`));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // dataUrl = "data:<mime>;base64,<data>"
      const base64 = dataUrl.split(",")[1];
      resolve({
        id: Math.random().toString(36).slice(2),
        data: base64,
        mimeType: file.type,
        previewUrl: dataUrl,
      });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// ---------------------------------------------------------------------------
// Markdown renderer
// ---------------------------------------------------------------------------
function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ className, children, ...props }) {
          const isBlock = className?.startsWith("language-");
          const language = className?.replace("language-", "") ?? "";
          const codeStr = String(children).replace(/\n$/, "");

          if (!isBlock) {
            return (
              <code
                className="rounded bg-muted px-1 py-0.5 font-mono text-xs"
                {...props}
              >
                {children}
              </code>
            );
          }

          return (
            <div className="group/code relative my-2">
              {language && (
                <div className="flex items-center justify-between rounded-t-md border border-b-0 bg-muted px-3 py-1">
                  <span className="text-muted-foreground text-xs">{language}</span>
                  <CopyButton text={codeStr} />
                </div>
              )}
              <pre
                className={cn(
                  "overflow-x-auto rounded-md border bg-muted p-3 font-mono text-xs leading-relaxed",
                  language && "rounded-t-none",
                )}
              >
                <code>{children}</code>
              </pre>
            </div>
          );
        },
        blockquote({ children }) {
          return (
            <blockquote className="my-2 border-l-4 border-muted-foreground/30 pl-3 text-muted-foreground italic">
              {children}
            </blockquote>
          );
        },
        table({ children }) {
          return (
            <div className="my-2 overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">{children}</table>
            </div>
          );
        },
        th({ children }) {
          return (
            <th className="border bg-muted px-3 py-1.5 text-left font-medium text-xs">
              {children}
            </th>
          );
        },
        td({ children }) {
          return <td className="border px-3 py-1.5 text-xs">{children}</td>;
        },
        a({ href, children }) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 hover:opacity-80"
            >
              {children}
            </a>
          );
        },
        p({ children }) {
          return <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>;
        },
        ul({ children }) {
          return <ul className="mb-2 list-disc pl-5 text-sm">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="mb-2 list-decimal pl-5 text-sm">{children}</ol>;
        },
        li({ children }) {
          return <li className="mb-0.5">{children}</li>;
        },
        h1({ children }) {
          return <h1 className="mb-2 mt-3 font-bold text-lg">{children}</h1>;
        },
        h2({ children }) {
          return <h2 className="mb-2 mt-3 font-semibold text-base">{children}</h2>;
        },
        h3({ children }) {
          return <h3 className="mb-1.5 mt-2.5 font-semibold text-sm">{children}</h3>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

// ---------------------------------------------------------------------------
// Copy button
// ---------------------------------------------------------------------------
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded px-1.5 py-0.5 text-muted-foreground text-xs hover:bg-background hover:text-foreground"
      aria-label="Copy code"
    >
      {copied ? "Copied!" : <Copy className="size-3" />}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Typing indicator
// ---------------------------------------------------------------------------
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1 py-1" aria-label="AI is typing">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-2 rounded-full bg-muted-foreground/50"
          style={{
            animation: "typing-bounce 1.2s ease-in-out infinite",
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes typing-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Image thumbnail strip — used in both the composer preview and user bubbles
// ---------------------------------------------------------------------------
function ImageStrip({
  images,
  onRemove,
}: {
  images: AttachedImage[];
  /** If provided, renders a remove button on each thumbnail. */
  onRemove?: (id: string) => void;
}) {
  if (images.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {images.map((img) => (
        <div key={img.id} className="group/thumb relative">
          {/* biome-ignore lint/performance/noImgElement: preview thumbnail, not for SEO */}
          <img
            src={img.previewUrl}
            alt="Attached"
            className="size-16 rounded-lg border object-cover"
          />
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(img.id)}
              aria-label="Remove image"
              className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover/thumb:opacity-100"
            >
              <X className="size-2.5" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single message bubble
// ---------------------------------------------------------------------------
function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const isTyping = !isUser && message.streaming && message.content === "";

  return (
    <div
      className={cn(
        "flex w-full gap-3 px-4",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      {!isUser && (
        <Avatar className="mt-0.5 size-7 shrink-0">
          <AvatarFallback className="bg-primary/10 text-primary">
            <Bot className="size-4" />
          </AvatarFallback>
        </Avatar>
      )}

      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
          isUser
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : "rounded-bl-sm bg-muted text-foreground",
        )}
      >
        {/* Image thumbnails above the text in user bubbles */}
        {isUser && message.images && message.images.length > 0 && (
          <div className="mb-2">
            <ImageStrip images={message.images} />
          </div>
        )}

        {isUser ? (
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        ) : isTyping ? (
          <TypingIndicator />
        ) : (
          <>
            <MarkdownContent content={message.content} />
            {message.streaming && (
              <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-current align-middle" />
            )}
          </>
        )}

        {!isTyping && (
          <p
            className={cn(
              "mt-1 text-right text-[10px] leading-none",
              isUser ? "text-primary-foreground/60" : "text-muted-foreground",
            )}
          >
            {format(new Date(message.createdAt), "h:mm a")}
          </p>
        )}
      </div>

      {isUser && (
        <Avatar className="mt-0.5 size-7 shrink-0">
          <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
            <User className="size-4" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
function EmptyState({ onSelectPrompt }: { onSelectPrompt: (p: string) => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-12 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10">
        <Sparkles className="size-8 text-primary" />
      </div>
      <div>
        <h2 className="font-semibold text-xl">How can I help you today?</h2>
        <p className="mt-1.5 text-muted-foreground text-sm">
          Powered by Gemini — ask me anything.
        </p>
      </div>
      <div className="grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
        {SUGGESTED_PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onSelectPrompt(p)}
            className="flex items-center gap-2 rounded-xl border bg-muted/50 px-4 py-3 text-left text-sm transition-colors hover:bg-muted"
          >
            <Lightbulb className="size-4 shrink-0 text-muted-foreground" />
            <span className="line-clamp-2">{p}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Insufficient credits modal
// ---------------------------------------------------------------------------
function InsufficientCreditsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="size-5 text-destructive" />
            Out of Credits
          </DialogTitle>
          <DialogDescription>
            You don&apos;t have enough credits to send a message. Top up your
            balance to continue.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onClose();
              router.push("/billing");
            }}
          >
            Go to Billing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Model selector
// ---------------------------------------------------------------------------
function ModelSelector() {
  const { selectedModelId, setSelectedModelId, isStreaming } = useChatStore();

  return (
    <Select
      value={selectedModelId}
      onValueChange={(v) => setSelectedModelId(v as ChatModelId)}
      disabled={isStreaming} 
    >
    <div className="py-2">
        <SelectTrigger
        className="h-7 w-auto gap-1.5 border-0 bg-transparent py-2 px-2 text-xs shadow-none focus:ring-0 focus-visible:ring-0"
        aria-label="Select AI model"
      >
        
          <SelectValue   />
         
      </SelectTrigger>
    </div>
      <SelectContent align="start" className="w-64">
        {CHAT_MODELS.map((m) => (
          <SelectItem key={m.id} value={m.id} className="py-2.5">
            <div className="flex  px-1 w-full items-center justify-between gap-3">
              <div>
                <p className="font-medium text-sm leading-none">{m.name}</p>
                <p className="mt-0.5 text-muted-foreground text-xs">{m.description}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Badge variant="secondary" className="text-[10px]">
                  {m.badge}
                </Badge>
                <span className="text-muted-foreground text-[10px] tabular-nums">
                  {m.creditCost}cr
                </span>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ---------------------------------------------------------------------------
// Composer
// ---------------------------------------------------------------------------
function ChatComposer({
  credits,
  onSubmit,
  onAbort,
}: {
  credits: number;
  onSubmit: (prompt: string, images: AttachedImage[]) => void;
  onAbort: () => void;
}) {
  const [value, setValue] = useState("");
  const [images, setImages] = useState<AttachedImage[]>([]);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isStreaming = useChatStore((s) => s.isStreaming);
  const selectedModelId = useChatStore((s) => s.selectedModelId);
  const currentModel = findModel(selectedModelId);
  const creditCost = currentModel?.creditCost ?? 1;
  const isDisabled = credits < creditCost && !isStreaming;

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  function removeImage(id: string) {
    setImages((prev) => prev.filter((img) => img.id !== id));
  }

  async function addFiles(files: FileList | File[]) {
    const incoming = Array.from(files).filter((f) =>
      ACCEPTED_IMAGE_TYPES.includes(f.type),
    );
    if (!incoming.length) return;

    const remaining = MAX_IMAGES - images.length;
    const toProcess = incoming.slice(0, remaining);

    const converted = await Promise.all(
      toProcess.map((f) => fileToAttachedImage(f).catch(() => null)),
    );
    const valid = converted.filter((img): img is AttachedImage => img !== null);
    setImages((prev) => [...prev, ...valid]);
  }

  // ── Event handlers ────────────────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) addFiles(e.target.files);
    // Reset so the same file can be re-selected if removed
    e.target.value = "";
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const imageFiles = Array.from(e.clipboardData.items)
      .filter((item) => ACCEPTED_IMAGE_TYPES.includes(item.type))
      .map((item) => item.getAsFile())
      .filter((f): f is File => f !== null);

    if (imageFiles.length > 0) {
      e.preventDefault(); // prevent pasting the raw data into the textarea
      addFiles(imageFiles);
    }
    // Plain-text pastes fall through to default behaviour
  }

  function handleSubmit() {
    if (isStreaming) return;
    if (credits < creditCost) {
      setShowCreditsModal(true);
      return;
    }
    const trimmed = value.trim();
    // Allow sending with only images and no text
    if (!trimmed && images.length === 0) return;
    onSubmit(trimmed, images);
    setValue("");
    setImages([]);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const canSend = !isDisabled && (value.trim().length > 0 || images.length > 0);

  return (
    <>
      <InsufficientCreditsModal
        open={showCreditsModal}
        onClose={() => setShowCreditsModal(false)}
      />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        multiple
        className="sr-only"
        onChange={handleFileChange}
        aria-label="Attach image"
        tabIndex={-1}
      />

      <div className="shrink-0 border-t bg-background px-4 pb-4 pt-3">
        {isDisabled && (
          <Alert variant="destructive" className="mb-3">
            <AlertCircle className="size-4" />
            <AlertDescription>
              Not enough credits for this model ({creditCost} required).{" "}
              <a href="/billing" className="font-medium underline">
                Top up to continue.
              </a>
            </AlertDescription>
          </Alert>
        )}

        <div className="rounded-2xl border bg-background shadow-sm focus-within:ring-2 focus-within:ring-ring">
          {/* Row 1: model selector */}
          <div className="flex items-center justify-end border-b px-2 py-2">
            <ModelSelector  />
          </div>

          {/* Row 2: image preview strip (only shown when images are attached) */}
          {images.length > 0 && (
            <div className="border-b px-3 py-2">
              <ImageStrip images={images} onRemove={removeImage} />
            </div>
          )}

          {/* Row 3: textarea + action buttons */}
          <div className="flex items-end gap-2 px-3 py-2">
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={
                isDisabled
                  ? `Need ${creditCost} credits — not enough balance…`
                  : "Message VertixAI… (Enter to send, Shift+Enter for newline)"
              }
              disabled={isDisabled}
              rows={1}
              className="max-h-48 min-h-[2rem] flex-1 resize-none border-0 bg-transparent px-1 py-2 text-sm shadow-none focus-visible:ring-0"
            />

            <div className="flex shrink-0 items-center gap-1.5 self-end pb-0.5">
              {/* Paperclip — attach image */}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={isDisabled || images.length >= MAX_IMAGES}
                onClick={() => fileInputRef.current?.click()}
                aria-label="Attach image"
                className="size-8 text-muted-foreground hover:text-foreground"
              >
                <Paperclip className="size-3.5" />
              </Button>

              {/* Dynamic credit cost badge */}
              <Badge variant="secondary" className="hidden gap-1 text-[10px] sm:flex">
                <Coins className="size-2.5" />
                {creditCost} {creditCost === 1 ? "credit" : "credits"}
              </Badge>

              {isStreaming ? (
                <Button
                  size="icon-sm"
                  variant="destructive"
                  onClick={onAbort}
                  aria-label="Stop generation"
                  className="size-8"
                >
                  <Square className="size-3.5" />
                </Button>
              ) : (
                <Button
                  size="icon-sm"
                  onClick={handleSubmit}
                  disabled={!canSend}
                  aria-label="Send message"
                  className="size-8"
                >
                  <Sparkles className="size-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
          AI can make mistakes. Verify important information.
        </p>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// ChatThread — main export
// ---------------------------------------------------------------------------
interface ChatThreadProps {
  credits: number;
  className?: string;
}

export function ChatThread({ credits, className }: ChatThreadProps) {
  const {
    messages,
    activeConversationId,
    isStreaming,
    selectedModelId,
    appendMessage,
    appendStreamChunk,
    finalizeStream,
    setIsStreaming,
    abortController,
    setAbortController,
    setActiveConversationId,
    prependConversation,
    conversations,
  } = useChatStore();

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(
    async (prompt: string, images: AttachedImage[] = []) => {
      if (isStreaming) return;

      const userMsg: ChatMessage = {
        id: Math.random().toString(36).slice(2),
        role: "user",
        content: prompt,
        createdAt: new Date().toISOString(),
        images: images.length > 0 ? images : undefined,
      };

      const assistantMsg: ChatMessage = {
        id: Math.random().toString(36).slice(2),
        role: "model",
        content: "",
        createdAt: new Date().toISOString(),
        streaming: true,
      };

      appendMessage(userMsg);
      appendMessage(assistantMsg);
      setIsStreaming(true);

      const ac = new AbortController();
      setAbortController(ac);

      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            conversationId: activeConversationId ?? undefined,
            model: selectedModelId,
            // Strip previewUrl before sending — server only needs data + mimeType
            images:
              images.length > 0
                ? images.map(({ data, mimeType }) => ({ data, mimeType }))
                : undefined,
          }),
          signal: ac.signal,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error ?? `HTTP ${res.status}`);
        }

        const newConvId = res.headers.get("X-Conversation-Id");
        const newConvTitle = res.headers.get("X-Conversation-Title");
        if (newConvId && !activeConversationId) {
          setActiveConversationId(newConvId);
          const title = newConvTitle ? decodeURIComponent(newConvTitle) : "New Chat";
          const alreadyExists = conversations.some((c) => c.id === newConvId);
          if (!alreadyExists) {
            prependConversation({
              id: newConvId,
              title,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              messages: [],
            });
          }
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            appendStreamChunk(decoder.decode(value, { stream: true }));
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          // User cancelled — keep partial response
        } else {
          appendStreamChunk(
            err instanceof Error && err.message === "insufficient_credits"
              ? "\n\n_You have run out of credits. Please top up at /billing._"
              : "\n\n_Sorry, something went wrong. Your credits have not been charged._",
          );
        }
      } finally {
        finalizeStream();
        setIsStreaming(false);
        setAbortController(null);
      }
    },
    [
      isStreaming,
      selectedModelId,
      activeConversationId,
      conversations,
      appendMessage,
      appendStreamChunk,
      finalizeStream,
      setIsStreaming,
      setAbortController,
      setActiveConversationId,
      prependConversation,
    ],
  );

  function handleAbort() {
    abortController?.abort();
  }

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex min-h-full flex-col">
          {messages.length === 0 ? (
            <EmptyState onSelectPrompt={(p) => sendMessage(p)} />
          ) : (
            <div className="flex flex-col gap-5 py-6">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
            </div>
          )}
          <div ref={bottomRef} className="h-px" />
        </div>
      </div>

      <ChatComposer
        credits={credits}
        onSubmit={sendMessage}
        onAbort={handleAbort}
      />
    </div>
  );
}
