import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Server-side only — uses service role key, never expose to the client.
// ---------------------------------------------------------------------------

const BUCKET = "generated-images";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.",
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

/**
 * Uploads a JPEG image buffer to the `generated-images` Supabase Storage
 * bucket and returns the public URL.
 *
 * @param userId  Supabase auth UID — used as the folder prefix so each user's
 *                images are isolated under `<userId>/<uuid>.jpg`.
 * @param buffer  Raw image bytes (JPEG).
 * @returns       Publicly accessible URL string.
 */
export async function uploadImageBuffer(
  userId: string,
  buffer: Buffer,
): Promise<string> {
  const supabase = getAdminClient();

  const path = `${userId}/${crypto.randomUUID()}.jpg`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: "image/jpeg",
    upsert: false,
  });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return data.publicUrl;
}
