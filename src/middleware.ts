import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const session = request.cookies.get("checkrest_session");

  // Se for uma rota de API e não tiver sessão, pode retornar 401
  if (request.nextUrl.pathname.startsWith("/api")) {
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Não autorizado. Sessão inválida." },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
