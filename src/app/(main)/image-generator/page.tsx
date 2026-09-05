import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

import { ImageStudio } from "./_components/image-studio";

export default async function ImageGeneratorPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/auth/v2/login");

  const dbUser = await prisma.user.upsert({
    where: { id: authUser.id },
    update: {},
    create: {
      id: authUser.id,
      email: authUser.email!,
      credits: 50,
      plan: "FREE",
    },
    select: { credits: true },
  });

  // Fetch existing generated images for the gallery initial state
  const images = await prisma.generatedImage.findMany({
    where: { userId: authUser.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      prompt: true,
      imageUrl: true,
      createdAt: true,
    },
  });

  // Serialize dates to strings for client component consumption
  const serializedImages = images.map((img) => ({
    ...img,
    createdAt: img.createdAt.toISOString(),
  }));

  return (
    <main className="flex flex-col gap-6">
      <div>
        <h1 className="font-semibold text-2xl leading-none tracking-tight">
          Image Studio
        </h1>
        <p className="mt-1.5 text-muted-foreground text-sm">
          Generate stunning images from text prompts powered by Google Imagen.
        </p>
      </div>

      <ImageStudio
        initialCredits={dbUser.credits}
        initialImages={serializedImages}
      />
    </main>
  );
}
