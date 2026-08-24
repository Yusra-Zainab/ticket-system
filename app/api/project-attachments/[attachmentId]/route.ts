import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { db } from "@/lib/db";

type AttachmentRow = RowDataPacket & {
  file_name: string;
  mime_type: string;
  file_data: Buffer;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ attachmentId: string }> },
) {
  const { attachmentId } = await params;

  try {
    const [rows] = await db.query<AttachmentRow[]>(
      `SELECT file_name,mime_type,file_data
         FROM project_attachments
        WHERE attachment_id=?
        LIMIT 1`,
      [attachmentId],
    );

    const attachment = rows[0];

    if (!attachment) {
      return Response.json({ error: "Attachment not found" }, { status: 404 });
    }

    return new Response(new Uint8Array(attachment.file_data), {
      headers: {
        "Content-Type": attachment.mime_type || "application/octet-stream",
        "Content-Disposition": `inline; filename="${attachment.file_name.replaceAll('"', "")}"`,
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Unable to read attachment" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ attachmentId: string }> },
) {
  const { attachmentId } = await params;

  try {
    const [result] = await db.execute<ResultSetHeader>(
      "DELETE FROM project_attachments WHERE attachment_id=?",
      [attachmentId],
    );

    if (!result.affectedRows) {
      return Response.json({ error: "Attachment not found" }, { status: 404 });
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Unable to delete attachment" },
      { status: 500 },
    );
  }
}
