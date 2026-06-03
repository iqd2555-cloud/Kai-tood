import { writeFile } from "node:fs/promises";

const generatedAt = new Date().toISOString();
const buildSource = process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_APP_VERSION || "local";
const version = `${buildSource}-${Date.now()}`;
const payload = {
  version,
  generatedAt,
};

await writeFile(new URL("../public/pwa-version.json", import.meta.url), `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Generated PWA version ${version}`);
