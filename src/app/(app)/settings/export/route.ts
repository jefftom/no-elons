import { getViewer } from "@/server/auth/viewer";
import { exportUserData } from "@/server/services/export";

export async function GET(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return new Response("Sign in to export your data.", { status: 401 });
  const origin = process.env.PUBLIC_URL ?? new URL(request.url).origin;
  const data = await exportUserData(viewer.id, origin);
  const filename = `noelons-${viewer.username}-${new Date().toISOString().slice(0, 10)}.json`;
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
