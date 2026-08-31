import { z } from "zod";

import { issueSessionResponse, resetPasswordFromToken } from "@/lib/auth";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  checkPasswordStrength,
} from "@/lib/passwordPolicy";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rateLimit";

const schema = z
  .object({
    token: z.string().min(20),
    password: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
    confirmPassword: z
      .string()
      .min(PASSWORD_MIN_LENGTH)
      .max(PASSWORD_MAX_LENGTH),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  })
  .refine((value) => checkPasswordStrength(value.password).ok, {
    message: "Password does not meet the strength requirements.",
    path: ["password"],
  });

export async function POST(request: Request) {
  const ipCheck = rateLimit(`reset:ip:${clientIp(request)}`, 15, 15 * 60_000);
  if (!ipCheck.ok) {
    return tooManyRequests(ipCheck.retryAfterSeconds);
  }

  const payload = await request.json().catch(() => undefined);
  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors as Record<
      string,
      string[] | undefined
    >;
    const passwordFieldError =
      fieldErrors.confirmPassword?.[0] ?? fieldErrors.password?.[0];
    const strengthHint = (() => {
      const candidate =
        payload && typeof payload === "object"
          ? (payload as Record<string, unknown>).password
          : undefined;
      return typeof candidate === "string"
        ? checkPasswordStrength(candidate).errors[0]
        : undefined;
    })();

    return Response.json(
      {
        error:
          passwordFieldError ??
          strengthHint ??
          "Invalid reset-password request.",
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
