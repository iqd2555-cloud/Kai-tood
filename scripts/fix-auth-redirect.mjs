import { createClient } from "@supabase/supabase-js";

const DEFAULT_CONFIRMATION_EMAIL = "koykoykoy9783@gmail.com";
const REQUIRED_BASE_ENV = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_APP_URL"];

function env(name) {
  return process.env[name]?.trim() ?? "";
}

function normalizeUrl(value, name) {
  if (!value) throw new Error(`${name} is required`);
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid URL`);
  }

  if (url.protocol !== "https:") throw new Error(`${name} must use https:// for production auth redirects`);
  if (["localhost", "127.0.0.1", "0.0.0.0"].includes(url.hostname)) {
    throw new Error(`${name} must not point to localhost for production auth redirects`);
  }

  url.hash = "";
  url.search = "";
  return url.toString().replace(/\/$/, "");
}

function getProjectRef(supabaseUrl) {
  const explicitRef = env("SUPABASE_PROJECT_REF");
  if (explicitRef) return explicitRef;

  const hostname = new URL(supabaseUrl).hostname;
  const [ref] = hostname.split(".");
  if (!ref || ref === "localhost") throw new Error("SUPABASE_PROJECT_REF is required when it cannot be derived from NEXT_PUBLIC_SUPABASE_URL");
  return ref;
}

function createSupabase(url, key) {
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function readResponse(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function managementRequest(path, options = {}) {
  const token = env("SUPABASE_ACCESS_TOKEN");
  if (!token) throw new Error("SUPABASE_ACCESS_TOKEN is required to verify/update Supabase Dashboard Auth URL settings");

  const response = await fetch(`https://api.supabase.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  const body = await readResponse(response);
  if (!response.ok) {
    const detail = typeof body === "string" ? body : JSON.stringify(body);
    throw new Error(`Supabase Management API ${options.method ?? "GET"} ${path} failed: ${response.status} ${detail}`);
  }

  return body;
}

function parseAllowList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    return value
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function hasLocalhost(urls) {
  return urls.some((value) => {
    try {
      const url = new URL(value);
      return ["localhost", "127.0.0.1", "0.0.0.0"].includes(url.hostname);
    } catch {
      return /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(value);
    }
  });
}

async function verifyAndUpdateAuthConfig({ projectRef, appUrl }) {
  const path = `/v1/projects/${projectRef}/config/auth`;
  const currentConfig = await managementRequest(path);
  const currentSiteUrl = currentConfig?.site_url ?? "";
  const currentAllowList = parseAllowList(currentConfig?.uri_allow_list);

  console.log(`Current Site URL: ${currentSiteUrl || "(empty)"}`);
  console.log(`Current Redirect URLs: ${currentAllowList.length ? currentAllowList.join(", ") : "(empty)"}`);

  const nextAllowList = Array.from(new Set([appUrl, `${appUrl}/**`, ...currentAllowList.filter((url) => !hasLocalhost([url]))]));
  const shouldUpdate = currentSiteUrl !== appUrl || hasLocalhost(currentAllowList) || !nextAllowList.includes(appUrl);

  if (shouldUpdate) {
    await managementRequest(path, {
      method: "PATCH",
      body: JSON.stringify({
        site_url: appUrl,
        uri_allow_list: nextAllowList.join(","),
      }),
    });
    console.log(`Updated Site URL to: ${appUrl}`);
    console.log(`Updated Redirect URLs to: ${nextAllowList.join(", ")}`);
  } else {
    console.log("Supabase Auth URL settings already match production URL.");
  }

  const verifiedConfig = await managementRequest(path);
  const verifiedSiteUrl = verifiedConfig?.site_url ?? "";
  const verifiedAllowList = parseAllowList(verifiedConfig?.uri_allow_list);

  if (verifiedSiteUrl !== appUrl) throw new Error(`Site URL verification failed: expected ${appUrl}, received ${verifiedSiteUrl}`);
  if (!verifiedAllowList.includes(appUrl) && !verifiedAllowList.includes(`${appUrl}/**`)) {
    throw new Error(`Redirect URL verification failed: ${appUrl} is not allow-listed`);
  }
  if (hasLocalhost([verifiedSiteUrl, ...verifiedAllowList])) throw new Error("Localhost URL is still present in Supabase Auth URL settings");

  console.log("Verified Supabase Auth Site URL and Redirect URLs use production URL.");
}

async function findAuthUserByEmail(adminClient, email) {
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);

    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase());
    if (user) return user;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function sendConfirmationEmail({ anonClient, email, appUrl }) {
  const { error } = await anonClient.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: appUrl,
    },
  });

  if (error) throw new Error(`Could not send confirmation email to ${email}: ${error.message}`);
  console.log(`Sent confirmation email to ${email} with redirect URL ${appUrl}.`);
}

async function optionallyConfirmAndVerify({ adminClient, anonClient, email }) {
  const shouldConfirm = env("CONFIRM_EMAIL_WITH_ADMIN_API") === "true";
  const password = env("VERIFY_USER_PASSWORD");
  const user = await findAuthUserByEmail(adminClient, email);

  if (!user) throw new Error(`${email} does not exist in Supabase Auth; create the user before resending confirmation email`);

  if (!shouldConfirm) {
    console.log(`User exists. Email confirmed: ${Boolean(user.email_confirmed_at)}.`);
    console.log("Skipped Admin API confirmation; set CONFIRM_EMAIL_WITH_ADMIN_API=true to confirm programmatically.");
    return;
  }

  if (!user.email_confirmed_at) {
    const { error } = await adminClient.auth.admin.updateUserById(user.id, { email_confirm: true });
    if (error) throw new Error(`Could not confirm ${email}: ${error.message}`);
    console.log(`Confirmed ${email} through Supabase Admin API.`);
  } else {
    console.log(`${email} was already confirmed.`);
  }

  if (!password) {
    console.log("Skipped login verification; set VERIFY_USER_PASSWORD to test sign-in after confirmation.");
    return;
  }

  const { data, error } = await anonClient.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`${email} could not login after confirmation: ${error.message}`);
  if (!data.user) throw new Error(`${email} login did not return a user`);
  await anonClient.auth.signOut();
  console.log(`${email} can login after email confirmation.`);
}

async function main() {
  for (const name of REQUIRED_BASE_ENV) {
    if (!env(name)) throw new Error(`${name} is required`);
  }

  const supabaseUrl = normalizeUrl(env("NEXT_PUBLIC_SUPABASE_URL"), "NEXT_PUBLIC_SUPABASE_URL");
  const appUrl = normalizeUrl(env("NEXT_PUBLIC_APP_URL"), "NEXT_PUBLIC_APP_URL");
  const confirmationEmail = env("CONFIRMATION_EMAIL") || DEFAULT_CONFIRMATION_EMAIL;
  const projectRef = getProjectRef(supabaseUrl);

  await verifyAndUpdateAuthConfig({ projectRef, appUrl });

  const adminClient = createSupabase(supabaseUrl, env("SUPABASE_SERVICE_ROLE_KEY"));
  const anonClient = createSupabase(supabaseUrl, env("NEXT_PUBLIC_SUPABASE_ANON_KEY"));

  await sendConfirmationEmail({ anonClient, email: confirmationEmail, appUrl });
  await optionallyConfirmAndVerify({ adminClient, anonClient, email: confirmationEmail });

  console.log("Auth redirect repair completed.");
}

main().catch((error) => {
  console.error(`FAIL ${error.message}`);
  process.exit(1);
});
