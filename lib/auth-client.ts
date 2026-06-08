import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";
import { phoneNumberClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [phoneNumberClient(), adminClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
