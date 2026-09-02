import { GoogleGenAI } from "@google/genai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not set. Add it to your .env.local file.");
}

export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
