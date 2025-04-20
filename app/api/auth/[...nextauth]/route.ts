import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth-options";

// Create the handler using the imported auth options
const handler = NextAuth(authOptions);

// Only export the handler functions, not the options
export { handler as GET, handler as POST }; 