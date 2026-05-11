import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicEnv } from "@/lib/supabase-env";

function redirectToLogin(request: NextRequest, setup?: "supabase", error?: "auth") {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  if (setup) url.searchParams.set("setup", setup);
  if (error) url.searchParams.set("error", error);
  if (request.nextUrl.pathname !== "/") {
    url.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
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

export async function middleware(request: NextRequest) {
  const isLogin = request.nextUrl.pathname.startsWith("/login");
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

    if (!user && !isLogin) {
      return redirectToLogin(request);
    }

    if (user && isLogin) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
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
  matcher: ["/((?!api/health|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons).*)"],
};
