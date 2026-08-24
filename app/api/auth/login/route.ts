import { z } from "zod";

import { authenticateAdmin, issueSessionResponse } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

export async function POST(request: Request) {
  try {
    const { email, password } = schema.parse(await request.json());
    const user = await authenticateAdmin(email, password);

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
