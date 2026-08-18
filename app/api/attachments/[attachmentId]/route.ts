import type { RowDataPacket } from "mysql2/promise";
import { db } from "@/lib/db";

type AttachmentRow = RowDataPacket & {
  attachment_id: string;
  file_name: string;
  mime_type: string;
  content: Buffer;
};

export async function GET(_request: Request, context: { params: Promise<{ attachmentId: string }> }) {
  try {
    const { attachmentId } = await context.params;
    const [rows] = await db.query<AttachmentRow[]>(
      "SELECT attachment_id, file_name, mime_type, content FROM ticket_attachments WHERE attachment_id=? LIMIT 1",
      [attachmentId],
    );
    const attachment = rows[0];
    if (!attachment) {
      return Response.json({ error: "Attachment not found" }, { status: 404 });
    }
    return new Response(new Uint8Array(attachment.content), {
      headers: {
        "Content-Type": attachment.mime_type || "application/octet-stream",
        "Content-Disposition": `inline; filename="${attachment.file_name}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Unable to load attachment" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ attachmentId: string }> }) {
  try {
    const { attachmentId } = await context.params;
    const [result] = await db.execute("DELETE FROM ticket_attachments WHERE attachment_id=?", [attachmentId]);
    if (!("affectedRows" in result) || result.affectedRows === 0) {
      return Response.json({ error: "Attachment not found" }, { status: 404 });
    }
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Unable to delete attachment" }, { status: 500 });
  }
}
