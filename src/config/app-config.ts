import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "VertixAI",
  version: packageJson.version,
  copyright: `© ${currentYear}, VertixAI.`,
  meta: {
    title: "VertixAI — The Unified Workspace for Conversational Intelligence & Generative Media",
    description:
      "VertixAI is a multi-service AI SaaS platform built with Next.js 16, Tailwind CSS v4, and shadcn/ui. Featuring AI chat, image generation, and a full credit-based billing system.",
  },
};
