import { getSessionUser, isResourceRole } from "@/lib/auth";
import { canResourceAccessProjectAttachment } from "@/lib/resourcePortal";

export async function GET(_request: Request, { params }: { params: Promise<{ attachmentId: string }> }) {
  const user = await getSessionUser();
  if (!user || !isResourceRole(user.role)) return new Response("Unauthorized", { status: 401 });
  const { attachmentId } = await params;
  const file = await canResourceAccessProjectAttachment(user, attachmentId);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.file_data), {
    headers: {
      "Content-Type": file.mime_type || "application/octet-stream",
      "Content-Length": String(file.size_bytes ?? file.file_data.length),
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.file_name)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
