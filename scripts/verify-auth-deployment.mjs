import { createClient } from "@supabase/supabase-js";

const REQUIRED_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const OWNER_EMAIL = "koykoykoy9783@gmail.com";

function env(name) {
  return process.env[name]?.trim() ?? "";
}

function fail(message) {
  console.error(`FAIL ${message}`);
  process.exitCode = 1;
}

function pass(message) {
  console.log(`OK ${message}`);
}

function skip(message) {
  console.log(`SKIP ${message}`);
}

function createSupabase(url, key) {
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
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

async function verifyRequiredEnv() {
  let valid = true;

  for (const name of REQUIRED_ENV) {
    const value = env(name);
    if (!value) {
      fail(`missing ${name}`);
      valid = false;
      continue;
    }

    if (name === "NEXT_PUBLIC_SUPABASE_URL") {
      try {
        const parsed = new URL(value);
        if (!parsed.protocol.startsWith("http")) {
          fail(`${name} must start with http:// or https://`);
          valid = false;
          continue;
        }
      } catch {
        fail(`${name} must be a valid URL`);
        valid = false;
        continue;
      }
    }

    pass(`${name} is set`);
  }

  return valid;
}

async function verifyServiceRole(adminClient) {
  const { error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (error) {
    fail(`SUPABASE_SERVICE_ROLE_KEY cannot call Auth Admin API: ${error.message}`);
    return false;
  }

  pass("SUPABASE_SERVICE_ROLE_KEY can call Auth Admin API");
  return true;
}

async function verifyLoginAndProfile({ anonClient, email, password, expectedRole, requireBranch }) {
  const { data: loginData, error: loginError } = await anonClient.auth.signInWithPassword({ email, password });
  if (loginError) {
    fail(`${email} cannot login: ${loginError.message}`);
    return false;
  }

  if (!loginData.user) {
    fail(`${email} login did not return a user session`);
    return false;
  }

  pass(`${email} can login with password`);

  const fullName = email.split("@")[0];
  const { data: profile, error: rpcError } = await anonClient
    .rpc("ensure_login_profile", {
      user_email: email,
      user_full_name: fullName,
      user_id: loginData.user.id,
    })
    .single();

  if (rpcError) {
    fail(`${email} profile provisioning failed: ${rpcError.message}`);
    await anonClient.auth.signOut();
    return false;
  }

  if (profile?.role !== expectedRole) {
    fail(`${email} expected role ${expectedRole}, received ${profile?.role ?? "null"}`);
    await anonClient.auth.signOut();
    return false;
  }

  if (requireBranch && !profile?.branch_id) {
    fail(`${email} staff profile has no branch_id`);
    await anonClient.auth.signOut();
    return false;
  }

  if (!requireBranch && profile?.branch_id) {
    fail(`${email} owner profile should not be branch-scoped`);
    await anonClient.auth.signOut();
    return false;
  }

  pass(`${email} profile role assignment is ${expectedRole}`);
  await anonClient.auth.signOut();
  return true;
}

async function verifyNewUserImmediateLogin({ adminClient, anonClient }) {
  const email = env("VERIFY_NEW_USER_EMAIL");
  const password = env("VERIFY_NEW_USER_PASSWORD");

  if (!email || !password) {
    skip("new-user immediate-login test; set VERIFY_NEW_USER_EMAIL and VERIFY_NEW_USER_PASSWORD to run it");
    return;
  }

  const existing = await findAuthUserByEmail(adminClient, email);
  if (existing) {
    fail(`${email} already exists; use a fresh test email for VERIFY_NEW_USER_EMAIL`);
    return;
  }

  const { data: signupData, error: signupError } = await anonClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: email.split("@")[0],
      },
    },
  });

  if (signupError) {
    fail(`${email} signup failed: ${signupError.message}`);
    return;
  }

  if (!signupData.session?.user) {
    fail(`${email} signup did not return a session; Confirm email is probably still enabled`);
    return;
  }

  pass(`${email} signup returned an immediate session`);
  await anonClient.auth.signOut();
  await verifyLoginAndProfile({ anonClient, email, password, expectedRole: "staff", requireBranch: true });
}

async function confirmAuthUserEmailIfNeeded(adminClient, email) {
  const user = await findAuthUserByEmail(adminClient, email);
  if (!user) return;
  if (user.email_confirmed_at) return;

  const { error } = await adminClient.auth.admin.updateUserById(user.id, { email_confirm: true });
  if (error) {
    fail(`${email} exists but could not be email-confirmed through Admin API: ${error.message}`);
    return;
  }

  pass(`${email} was email-confirmed through Admin API`);
}

async function verifyOwnerLogin({ adminClient, anonClient }) {
  const email = env("VERIFY_OWNER_EMAIL") || OWNER_EMAIL;
  const password = env("VERIFY_OWNER_PASSWORD");

  if (!password) {
    skip(`owner login test for ${email}; set VERIFY_OWNER_PASSWORD to run it`);
    return;
  }

  await confirmAuthUserEmailIfNeeded(adminClient, email);
  if (process.exitCode) return;

  await verifyLoginAndProfile({ anonClient, email, password, expectedRole: "owner", requireBranch: false });
}

async function main() {
  const envValid = await verifyRequiredEnv();
  if (!envValid) return;

  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = env("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");
  const adminClient = createSupabase(url, serviceRoleKey);
  const anonClient = createSupabase(url, anonKey);

  const serviceRoleValid = await verifyServiceRole(adminClient);
  if (!serviceRoleValid) return;

  await verifyNewUserImmediateLogin({ adminClient, anonClient });
  await verifyOwnerLogin({ adminClient, anonClient });

  if (process.exitCode) return;
  pass("Auth deployment verification completed");
}

await main();
