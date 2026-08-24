import { signOutAllSessions } from "@/lib/auth";

export async function POST() {
  try {
    await signOutAllSessions();
    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Unable to sign out from all sessions." },
      { status: 500 },
    );
  }
}
