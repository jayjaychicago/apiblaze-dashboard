import { NextAuthOptions, Session } from "next-auth";
import { JWT } from "next-auth/jwt";
import GithubProvider from "next-auth/providers/github";

// Extend the Session interface
declare module "next-auth" {
  interface Session {
    user: {
      id?: string | null;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      githubHandle?: string | null;
    };
    accessToken?: string;
  }

  interface User {
    id?: string;
    githubHandle?: string | null;
  }
}

// Extend the JWT interface
declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    githubHandle?: string | null;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: { scope: "read:user user:email repo" },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // Persist the GitHub access token to the JWT token
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }
      if (profile && (profile as { login?: string }).login) {
        token.githubHandle = (profile as { login: string }).login;
      }
      return token;
    },
    async session({ session, token }) {
      // Send the GitHub access token to the client
      if (token.accessToken) {
        session.accessToken = token.accessToken as string;
      }
      if (session.user && token.githubHandle) {
        session.user.githubHandle = token.githubHandle as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
  },
};

