export type SupabasePublicEnv = {
  url: string;
  anonKey: string;
};

export type SupabaseAdminEnv = {
  url: string;
  serviceRoleKey: string;
};

export type SupabaseAdminEnvDiagnostics = {
  missing: string[];
  invalid: string[];
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

function isValidHttpUrl(url: string) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
}

export function getSupabasePublicEnv(): SupabasePublicEnv | null {
  const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!url || !anonKey || !isValidHttpUrl(url)) return null;

  return { url, anonKey };
}

export function getSupabaseAdminEnvDiagnostics(): SupabaseAdminEnvDiagnostics {
  const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const missing = [];
  const invalid = [];

  if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  else if (!isValidHttpUrl(url)) invalid.push("NEXT_PUBLIC_SUPABASE_URL");

  if (!serviceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");

  return { missing, invalid };
}

export function getSupabaseAdminEnv(): SupabaseAdminEnv | null {
  const diagnostics = getSupabaseAdminEnvDiagnostics();
  if (diagnostics.missing.length > 0 || diagnostics.invalid.length > 0) return null;

  return {
    url: clean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    serviceRoleKey: clean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  };
}

export function hasSupabaseServiceRoleKey() {
  return clean(process.env.SUPABASE_SERVICE_ROLE_KEY).length > 0;
}

export function getSupabaseEnvStatus(): SupabaseEnvStatus {
  const nextPublicSupabaseUrl = clean(process.env.NEXT_PUBLIC_SUPABASE_URL).length > 0;
  const nextPublicSupabaseAnonKey = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).length > 0;
  const supabaseServiceRoleKey = hasSupabaseServiceRoleKey();
  const publicConfigValid = getSupabasePublicEnv() !== null;
  const adminDiagnostics = getSupabaseAdminEnvDiagnostics();

  return {
    nextPublicSupabaseUrl,
    nextPublicSupabaseAnonKey,
    supabaseServiceRoleKey,
    publicConfigValid,
    serverConfigValid: adminDiagnostics.missing.length === 0 && adminDiagnostics.invalid.length === 0,
  };
}

export function isSupabaseConfigured() {
  return getSupabasePublicEnv() !== null;
}
