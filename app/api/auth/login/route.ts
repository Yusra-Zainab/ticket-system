import { z } from "zod";

import { authenticateUser, issueSessionResponse } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
  // The existing login page also sends a role label. Authentication never trusts it;
  // the persisted users.role decides which portal the account may enter.
  role: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const { email, password } = schema.parse(await request.json());
    const user = await authenticateUser(email, password);

    if (!user) {
      return Response.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

    return issueSessionResponse(user.id);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Invalid login request." }, { status: 400 });
    }

    console.error(error);
    return Response.json({ error: "Unable to sign in." }, { status: 500 });
  }
}
