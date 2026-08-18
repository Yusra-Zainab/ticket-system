import { randomUUID } from "node:crypto";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { db } from "@/lib/db";

type TicketRow = RowDataPacket & { ticket_id: string };
type AttachmentRow = RowDataPacket & {
  attachment_id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
};

async function ticketExists(ticketId: string) {
  const [rows] = await db.query<TicketRow[]>(
    "SELECT ticket_id FROM tickets WHERE ticket_id=? LIMIT 1",
    [ticketId],
  );
  return Boolean(rows[0]);
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const [rows] = await db.query<AttachmentRow[]>(
      "SELECT attachment_id, file_name, mime_type, size_bytes, created_at FROM ticket_attachments WHERE ticket_id=? ORDER BY created_at ASC",
      [id],
    );
    return Response.json({
      attachments: rows.map((row) => ({
        id: row.attachment_id,
        name: row.file_name,
        mimeType: row.mime_type,
        size: Number(row.size_bytes ?? 0),
        url: `/api/attachments/${row.attachment_id}`,
        uploadedAt: row.created_at,
      })),
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Unable to load attachments" }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!(await ticketExists(id))) {
      return Response.json({ error: "Ticket not found" }, { status: 404 });
    }
    const formData = await request.formData();
    const files = formData.getAll("files").filter((value): value is File => value instanceof File);
    if (!files.length) {
      return Response.json({ error: "At least one file is required" }, { status: 400 });
    }
    const attachments = [];
    for (const file of files) {
      const attachmentId = `ATT-${randomUUID().replaceAll("-", "").slice(0, 32)}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      const [result] = await db.execute<ResultSetHeader>(
        "INSERT INTO ticket_attachments (attachment_id, ticket_id, file_name, mime_type, size_bytes, content) VALUES (?, ?, ?, ?, ?, ?)",
        [attachmentId, id, file.name, file.type || "application/octet-stream", file.size, buffer],
      );
      if (!("affectedRows" in result) || result.affectedRows === 0) {
        throw new Error("Failed to store attachment");
      }
      attachments.push({
        id: attachmentId,
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        url: `/api/attachments/${attachmentId}`,
        uploadedAt: new Date().toISOString(),
      });
    }
    return Response.json({ attachments }, { status: 201 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Unable to upload attachments" }, { status: 500 });
  }
}
