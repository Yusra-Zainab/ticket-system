import { z } from "zod";

import {
  authenticateUser,
  isAdminRole,
  isClientRole,
  isResourceRole,
  issueSessionResponse,
} from "@/lib/auth";
import {
  clientIp,
  rateLimit,
  rateLimitReset,
  tooManyRequests,
} from "@/lib/rateLimit";

/*
 * The login form's "Role" selector is authoritative: the account must
 * belong to the chosen portal. Selecting "Client" and entering admin
 * credentials is rejected (F5). Omitting `role` keeps the old
 * any-portal behaviour for non-form API callers.
 */
const roleLabels = ["Admin", "Resource", "Client", "Client Team"] as const;
type RoleLabel = (typeof roleLabels)[number];

const roleMatchers: Record<RoleLabel, (role: string) => boolean> = {
  Admin: isAdminRole,
  Resource: isResourceRole,
  Client: isClientRole,
  "Client Team": isClientRole,
};

const schema = z.object({
  email: z.string().email(),

  password: z.string().min(8).max(200),

  role: z.enum(roleLabels).optional(),
});

export async function POST(request: Request) {
  try {
    const { email, password, role } = schema.parse(await request.json());

    const ip = clientIp(request);
    const emailKey = `login:email:${email.trim().toLowerCase()}`;
    const ipCheck = rateLimit(`login:ip:${ip}`, 20, 15 * 60_000);
    const emailCheck = rateLimit(emailKey, 8, 15 * 60_000);

    if (!ipCheck.ok || !emailCheck.ok) {
      return tooManyRequests(
        Math.max(ipCheck.retryAfterSeconds, emailCheck.retryAfterSeconds),
      );
    }

    const user = await authenticateUser(email, password);

    if (!user) {
      return Response.json(
        {
          error: "Invalid email or password.",
        },
        {
          status: 401,
        },
      );
    }

    // Successful credential check — don't keep counting this account.
    rateLimitReset(emailKey);

    if (role && !roleMatchers[role](user.role)) {
      return Response.json(
        {
          error: `This account can't sign in through the ${role} portal. Change the Role selector and try again.`,
        },
        {
          status: 403,
        },
      );
    }

    return issueSessionResponse(user.id);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        {
          error: "Invalid login request.",
        },
        {
          status: 400,
        },
      );
    }

    console.error(error);

    return Response.json(
      {
        error: "Unable to sign in.",
      },
      {
        status: 500,
      },
    );
  }
}
