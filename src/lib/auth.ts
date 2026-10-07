import { getServerSession, NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { isSessionCurrent } from "./security";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "admin@vaesen.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password || credentials.email.length > 254 || Buffer.byteLength(credentials.password, "utf8") > 72) {
          return null;
        }

        const user = await prisma.user.findFirst({
          where: { email: { equals: credentials.email.trim().toLowerCase(), mode: "insensitive" } }
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          sessionVersion: user.sessionVersion,
        };
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.sessionVersion = user.sessionVersion;
        token.invalid = false;
      }
      const currentUser = typeof token.id === "string" ? await prisma.user.findUnique({
        where: { id: token.id },
        select: { role: true, sessionVersion: true, name: true, email: true },
      }) : null;
      if (!isSessionCurrent(token, currentUser)) {
        // Middleware is only a first gate; every server entry point rejects this session.
        return { ...token, invalid: true, id: "", role: "" };
      }
      token.name = currentUser!.name;
      token.email = currentUser!.email;
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.role = token.invalid ? "" : token.role;
        session.user.id = token.invalid ? "" : token.id;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
  }
};

export async function getAppSession() {
  const session = await getServerSession(authOptions);
  return session?.user?.id && session.user.role ? session : null;
}
