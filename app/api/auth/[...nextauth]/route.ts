import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    jwt({ token, account }) {
      if (account?.providerAccountId) {
        token.googleId = account.providerAccountId
      }
      return token
    },
    session({ session, token }) {
      return { ...session, googleId: token.googleId as string | undefined }
    },
  },
})

export { handler as GET, handler as POST }
