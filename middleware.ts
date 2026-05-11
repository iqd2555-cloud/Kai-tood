import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicEnv } from "@/lib/supabase-env";

const LOGIN_PATH = "/login";
const DEFAULT_AUTHENTICATED_PATH = "/dashboard";
const LOGIN_PASSTHROUGH_ERRORS = new Set(["auth", "profile"]);

function isLoginPath(pathname: string) {
  return pathname === LOGIN_PATH || pathname.startsWith(`${LOGIN_PATH}/`);
}

function getReturnPath(request: NextRequest) {
  return `${request.nextUrl.pathname}${request.nextUrl.search}`;
}

function isSafeInternalPath(path: string | null) {
  return Boolean(path && path.startsWith("/") && !path.startsWith("//") && !isLoginPath(path));
}

function getSafeRedirectPath(path: string | null) {
  return isSafeInternalPath(path) ? path! : DEFAULT_AUTHENTICATED_PATH;
}

function redirectToLogin(request: NextRequest, setup?: "supabase", error?: "auth") {
  const url = request.nextUrl.clone();
  url.pathname = LOGIN_PATH;
  url.search = "";

  if (setup) url.searchParams.set("setup", setup);
  if (error) url.searchParams.set("error", error);

  const returnPath = getReturnPath(request);
  if (returnPath !== "/" && !isLoginPath(request.nextUrl.pathname)) {
    url.searchParams.set("next", returnPath);
  }

  return NextResponse.redirect(url);
}

function redirectWithSessionCookies(url: URL, response: NextResponse) {
  const redirectResponse = NextResponse.redirect(url);
  response.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });
  return redirectResponse;
}

function loginCanRenderForAuthenticatedUser(request: NextRequest) {
  const setup = request.nextUrl.searchParams.get("setup");
  const error = request.nextUrl.searchParams.get("error");

  return setup === "supabase" || (error !== null && LOGIN_PASSTHROUGH_ERRORS.has(error));
}

export async function middleware(request: NextRequest) {
  const isLogin = isLoginPath(request.nextUrl.pathname);
  const supabaseEnv = getSupabasePublicEnv();

  if (!supabaseEnv) {
    if (isLogin) return NextResponse.next();
    return redirectToLogin(request, "supabase");
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(supabaseEnv.url, supabaseEnv.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      if (isLogin) return response;
      return redirectToLogin(request);
    }

    if (isLogin && request.method === "GET" && !loginCanRenderForAuthenticatedUser(request)) {
      const url = new URL(getSafeRedirectPath(request.nextUrl.searchParams.get("next")), request.url);
      return redirectWithSessionCookies(url, response);
    }
  } catch (error) {
    console.error("Supabase middleware auth check failed", error);

    if (!isLogin) {
      return redirectToLogin(request, undefined, "auth");
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!api(?:/|$)|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons(?:/|$)|.*\\..*).*)"],
};
