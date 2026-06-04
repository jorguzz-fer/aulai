import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Middleware roda no Edge → usa só authConfig (sem Prisma/bcrypt).
export default NextAuth(authConfig).auth;

export const config = {
  // Protege tudo exceto API, estáticos e a rota de reset (pública).
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login/reset).*)"],
};
