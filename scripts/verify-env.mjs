const requiredVariables = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

let hasError = false;

for (const name of requiredVariables) {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`MISSING ${name}`);
    hasError = true;
    continue;
  }

  if (name === "NEXT_PUBLIC_SUPABASE_URL") {
    try {
      const parsed = new URL(value);
      if (!parsed.protocol.startsWith("http")) {
        console.error(`INVALID ${name}: must start with http:// or https://`);
        hasError = true;
        continue;
      }
    } catch {
      console.error(`INVALID ${name}: must be a valid URL`);
      hasError = true;
      continue;
    }
  }

  console.log(`OK ${name}`);
}

if (hasError) {
  console.error("Supabase environment verification failed.");
  process.exit(1);
}

console.log("Supabase environment verification passed.");
