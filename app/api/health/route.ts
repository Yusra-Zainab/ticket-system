import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.query("SELECT 1 AS ok");
    return Response.json({ ok: true, database: "connected" });
  } catch (error) {
    console.error("Database health check failed", error);
    return Response.json(
      { ok: false, database: "unavailable" },
      { status: 503 },
    );
  }
}
