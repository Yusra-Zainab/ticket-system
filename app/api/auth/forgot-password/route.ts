import { z } from "zod";

import {
  buildResetUrl,
  createPasswordResetToken,
  sendMail,
} from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const { email } = schema.parse(await request.json());
    const record = await createPasswordResetToken(email);

    if (record) {
      const resetUrl = buildResetUrl(request, record.token);

      await sendMail({
        to: record.user.email,
        subject: "Reset your Support Portal password",
        html: `
          <p>A password reset was requested for your Support Portal account.</p>
          <p><a href="${resetUrl}">Reset Password</a></p>
          <p>This link expires in 1 hour.</p>
        `,
      });
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
