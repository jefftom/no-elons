import { getViewer } from "@/server/auth/viewer";
import { unreadCount } from "@/server/services/notifications";

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return Response.json({ count: 0 }, { headers: { "Cache-Control": "no-store" } });
  return Response.json({ count: await unreadCount(viewer.id) }, { headers: { "Cache-Control": "no-store" } });
}
