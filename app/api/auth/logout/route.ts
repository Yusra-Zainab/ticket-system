import { signOutCurrentSession } from "@/lib/auth";

export async function POST() {
  try {
    await signOutCurrentSession();
    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Unable to sign out." }, { status: 500 });
  }
}
