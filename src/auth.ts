import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

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
        if (credentials.password === adminPassword) {
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
