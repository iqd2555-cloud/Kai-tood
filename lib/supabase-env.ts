export type SupabasePublicEnv = {
  url: string;
  anonKey: string;
};

function clean(value: string | undefined) {
  return value?.trim() ?? "";
}

export function getSupabasePublicEnv(): SupabasePublicEnv | null {
  const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!url || !anonKey) return null;

  try {
    const parsedUrl = new URL(url);
    if (!parsedUrl.protocol.startsWith("http")) return null;
  } catch {
    return null;
  }

  return { url, anonKey };
}

export function isSupabaseConfigured() {
  return getSupabasePublicEnv() !== null;
}
