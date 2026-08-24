import { getSessionUser, isClientRole } from "@/lib/auth";
import { canClientAccessTicketAttachment } from "@/lib/clientPortal";

export async function GET(_request: Request, { params }: { params: Promise<{ attachmentId: string }> }) {
  const user = await getSessionUser();
  if (!user || !isClientRole(user.role)) return new Response("Unauthorized", { status: 401 });
  const { attachmentId } = await params;
  const file = await canClientAccessTicketAttachment(user, attachmentId);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.content), {
    headers: {
      "Content-Type": file.mime_type || "application/octet-stream",
      "Content-Length": String(file.size_bytes ?? file.content.length),
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.file_name)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
