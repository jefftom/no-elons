import { getViewerInfo } from "@/server/auth/viewer";
import { photosFeed } from "@/server/services/feeds";
import { parseCursor } from "@/lib/ids";
import { PhotosView } from "./photos-view";

export const metadata = { title: "Photos" };

export default async function PhotosPage({ searchParams }: { searchParams: Promise<{ cursor?: string }> }) {
  const cursor = parseCursor((await searchParams).cursor);
  const viewer = await getViewerInfo();
  const page = await photosFeed(viewer?.id ?? null, "everyone", cursor);
  return <PhotosView page={page} viewer={viewer} basePath="/photos" hasCursor={!!cursor} />;
}
