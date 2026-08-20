import { randomUUID } from "node:crypto";
import type { ResultSetHeader } from "mysql2/promise";

import { db } from "@/lib/db";
import type { TicketAttachment } from "@/types";

const MAX_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 10;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const projectId = Number(id);

  if (!Number.isInteger(projectId) || projectId <= 0) {
    return Response.json({ error: "Invalid project id" }, { status: 400 });
  }

  try {
    const form = await request.formData();
    const files = form
      .getAll("files")
      .filter((value): value is File => value instanceof File);

    if (!files.length) {
      return Response.json({ error: "No files selected." }, { status: 400 });
    }

    if (files.length > MAX_FILES) {
      return Response.json(
        { error: `Upload at most ${MAX_FILES} files at once.` },
        { status: 400 },
      );
    }

    const attachments: TicketAttachment[] = [];

    for (const file of files) {
      if (file.size > MAX_SIZE) {
        return Response.json(
          { error: `${file.name} is larger than 10 MB.` },
          { status: 400 },
        );
      }

      const attachmentId = `PAT-${randomUUID().replaceAll("-", "")}`;
      const bytes = Buffer.from(await file.arrayBuffer());

      await db.execute<ResultSetHeader>(
        `INSERT INTO project_attachments
          (attachment_id,project_id,file_name,mime_type,size_bytes,file_data)
         VALUES (?,?,?,?,?,?)`,
        [
          attachmentId,
          projectId,
          file.name,
          file.type || "application/octet-stream",
          file.size,
          bytes,
        ],
      );

      attachments.push({
        id: attachmentId,
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        url: `/api/project-attachments/${attachmentId}`,
        uploadedAt: new Date().toISOString(),
      });
    }

    return Response.json({ attachments }, { status: 201 });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Unable to upload project attachments." },
      { status: 500 },
    );
  }
}
