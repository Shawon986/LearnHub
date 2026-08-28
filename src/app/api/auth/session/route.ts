import { apiHandler, json } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";

// Read endpoint for client components (navbars, guards).
export const GET = apiHandler(async () => {
  const user = await getCurrentUser();
  if (!user) return json({ user: null });
  return json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      emailVerified: Boolean(user.emailVerified),
      referralCode: user.referralCode,
    },
  });
});
