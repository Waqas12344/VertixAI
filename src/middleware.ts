import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const protectedRoutes = ["/dashboard", "/chat", "/image-generator", "/billing"];
const authRoutes = ["/auth"];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // IMPORTANT: Always call getUser() — never getSession() — for server-side
  // auth checks. getUser() validates the JWT with Supabase's servers every time,
  // while getSession() only reads the cookie and can be spoofed.
  const { data: { user }, error } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isProtected = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  const isAuthRoute = authRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  // Unauthenticated (or invalid session) on a protected route → login
  if (isProtected && (!user || error)) {
    const loginUrl = new URL("/auth/v2/login", request.url);
    loginUrl.searchParams.set("redirectTo", encodeURIComponent(pathname));
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated user on an auth route → dashboard
  if (isAuthRoute && user && !error) {
    const dashboardUrl = new URL("/dashboard/default", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
