import { randomUUID } from "node:crypto";
import { getSessionUser, isResourceRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { addResourceActivity, getResourceTicketAccess } from "@/lib/resourcePortal";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user || !isResourceRole(user.role)) return Response.json({ error: "Authentication required." }, { status: 401 });
    const { id } = await params;
    const access = await getResourceTicketAccess(user, id);
    if (!access) return Response.json({ error: "Ticket not found." }, { status: 404 });
    const data = await request.formData();
    const files = data.getAll("files").filter((item): item is File => item instanceof File && item.size > 0);
    if (!files.length) return Response.json({ error: "Choose at least one file." }, { status: 400 });
    if (files.some((file) => file.size > MAX_FILE_SIZE)) return Response.json({ error: "Each attachment must be 10 MB or smaller." }, { status: 413 });

    const uploaded = [];
    for (const file of files) {
      const attachmentId = randomUUID();
      const content = Buffer.from(await file.arrayBuffer());
      await db.execute(
        "INSERT INTO ticket_attachments (attachment_id, ticket_id, file_name, mime_type, size_bytes, content) VALUES (?, ?, ?, ?, ?, ?)",
        [attachmentId, id, file.name.slice(0, 255), file.type || "application/octet-stream", file.size, content],
      );
      uploaded.push({ id: attachmentId, name: file.name, url: `/api/resource-portal/attachments/${attachmentId}` });
    }
    await addResourceActivity(access.databaseId, user.id, `Uploaded ${uploaded.length} attachment${uploaded.length === 1 ? "" : "s"}`, access.status);
    return Response.json({ attachments: uploaded }, { status: 201 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Unable to upload attachments." }, { status: 500 });
  }
}
