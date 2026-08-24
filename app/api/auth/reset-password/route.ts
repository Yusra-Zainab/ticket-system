import { z } from "zod";

import { issueSessionResponse, resetPasswordFromToken } from "@/lib/auth";

const schema = z
  .object({
    token: z.string().min(20),
    password: z.string().min(8).max(200),
    confirmPassword: z.string().min(8).max(200),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export async function POST(request: Request) {
  const payload = await request.json().catch(() => undefined);
  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors as Record<
      string,
      string[] | undefined
    >;
    const confirmPasswordErrors = fieldErrors.confirmPassword;

    return Response.json(
      {
        error:
          confirmPasswordErrors?.[0] ?? "Invalid reset-password request.",
      },
      { status: 400 },
    );
  }

  try {
    const { token, password } = parsed.data;
    const user = await resetPasswordFromToken(token, password);

    if (!user) {
      return Response.json(
        { error: "This reset link is invalid or has expired." },
        { status: 400 },
      );
    }

    return issueSessionResponse(user.id);
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Unable to reset password." },
      { status: 500 },
    );
  }
}
