import { timingSafeEqual } from 'crypto';
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

// WR-04 fix: Validate NEXTAUTH_SECRET at module load time in production
if (process.env.NODE_ENV === 'production' && !process.env.NEXTAUTH_SECRET) {
  throw new Error('NEXTAUTH_SECRET environment variable is required in production. Generate one with: openssl rand -base64 32');
}

export const { auth, signIn, signOut, handlers } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const adminPassword = process.env.ADMIN_PASSWORD;
        if (!adminPassword) {
          console.error("ADMIN_PASSWORD environment variable is not set");
          return null;
        }
        const password = (credentials.password as string) ?? '';
        // WR-04 fix: Use timing-safe comparison to prevent timing attacks
        if (
          password.length === adminPassword.length &&
          timingSafeEqual(Buffer.from(password), Buffer.from(adminPassword))
        ) {
          return { id: "admin", name: "Admin" };
        }
        return null;
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 28800, // 8 hours
  },
  pages: {
    signIn: "/admin/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
});
