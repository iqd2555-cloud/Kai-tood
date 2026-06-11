export type SupabasePublicEnv = {
  url: string;
  anonKey: string;
};

export type SupabaseEnvStatus = {
  nextPublicSupabaseUrl: boolean;
  nextPublicSupabaseAnonKey: boolean;
  supabaseServiceRoleKey: boolean;
  publicConfigValid: boolean;
  serverConfigValid: boolean;
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

export function hasSupabaseServiceRoleKey() {
  return clean(process.env.SUPABASE_SERVICE_ROLE_KEY).length > 0;
}

export function getSupabaseEnvStatus(): SupabaseEnvStatus {
  const nextPublicSupabaseUrl = clean(process.env.NEXT_PUBLIC_SUPABASE_URL).length > 0;
  const nextPublicSupabaseAnonKey = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).length > 0;
  const supabaseServiceRoleKey = hasSupabaseServiceRoleKey();
  const publicConfigValid = getSupabasePublicEnv() !== null;

  return {
    nextPublicSupabaseUrl,
    nextPublicSupabaseAnonKey,
    supabaseServiceRoleKey,
    publicConfigValid,
    serverConfigValid: publicConfigValid && supabaseServiceRoleKey,
  };
}

export function isSupabaseConfigured() {
  return getSupabasePublicEnv() !== null;
}
