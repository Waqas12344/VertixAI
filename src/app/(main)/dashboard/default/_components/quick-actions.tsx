import { Bot, ImageIcon } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function QuickActions() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {/* New AI Chat */}
      <Link href="/chat" className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl">
        <Card className="h-full cursor-pointer border-2 border-transparent transition-colors duration-150 group-hover:border-primary/40 group-hover:bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base leading-none">
              <div className="flex size-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
                <Bot className="size-4 text-blue-600 dark:text-blue-400" />
              </div>
              New AI Chat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Start a multi-turn conversation with Gemini Flash. Each message costs 1 credit.
            </CardDescription>
          </CardContent>
        </Card>
      </Link>

      {/* Create Generative Image */}
      <Link href="/image-generator" className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl">
        <Card className="h-full cursor-pointer border-2 border-transparent transition-colors duration-150 group-hover:border-primary/40 group-hover:bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base leading-none">
              <div className="flex size-8 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-950">
                <ImageIcon className="size-4 text-purple-600 dark:text-purple-400" />
              </div>
              Create Generative Image
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Turn a text prompt into an image using the AI Studio. Each generation costs 5 credits.
            </CardDescription>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
