import { requireViewer, getViewerInfo } from "@/server/auth/viewer";
import { photosFeed } from "@/server/services/feeds";
import { parseCursor } from "@/lib/ids";
import { PhotosView } from "../photos-view";

export const metadata = { title: "Photos · Following" };

export default async function FollowingPhotosPage({ searchParams }: { searchParams: Promise<{ cursor?: string }> }) {
  await requireViewer("/photos/following");
  const cursor = parseCursor((await searchParams).cursor);
  const viewer = await getViewerInfo();
  const page = await photosFeed(viewer!.id, "following", cursor);
  return <PhotosView page={page} viewer={viewer} basePath="/photos/following" hasCursor={!!cursor} />;
}
