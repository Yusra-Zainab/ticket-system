import { z } from "zod";

import {
  buildResetUrl,
  createPasswordResetToken,
  sendMail,
} from "@/lib/auth";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rateLimit";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const { email } = schema.parse(await request.json());

    const ipCheck = rateLimit(`forgot:ip:${clientIp(request)}`, 10, 15 * 60_000);
    const emailCheck = rateLimit(
      `forgot:email:${email.trim().toLowerCase()}`,
      4,
      15 * 60_000,
    );
    if (!ipCheck.ok || !emailCheck.ok) {
      return tooManyRequests(
        Math.max(ipCheck.retryAfterSeconds, emailCheck.retryAfterSeconds),
      );
    }

    const record = await createPasswordResetToken(email);

    if (record) {
      const resetUrl = buildResetUrl(request, record.token);

      /*
       * Fire-and-forget so the response time does not depend on whether
       * the address was found or on SMTP latency (avoids a timing-based
       * account-enumeration side-channel — see F3).
       */
      void sendMail({
        to: record.user.email,
        subject: "Reset your Support Portal password",
        html: `
          <p>A password reset was requested for your Support Portal account.</p>
          <p><a href="${resetUrl}">Reset Password</a></p>
          <p>This link expires in 1 hour.</p>
        `,
      }).catch((error) => console.error("Password reset email failed:", error));
    }

    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid forgot-password request." },
        { status: 400 },
      );
    }

    console.error(error);
    return Response.json(
      { error: "Unable to process forgot password." },
      { status: 500 },
    );
  }
}
