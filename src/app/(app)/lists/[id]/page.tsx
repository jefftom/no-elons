import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState, Feed } from "@/components/feed";
import { PageHeader } from "@/components/page-header";
import { getViewerInfo } from "@/server/auth/viewer";
import { listFeed } from "@/server/services/feeds";
import { getList } from "@/server/services/lists";
import { isUuid, parseCursor } from "@/lib/ids";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ cursor?: string }> };

export default async function ListPage({ params, searchParams }: Props) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const viewer = await getViewerInfo();
  const list = await getList(id, viewer?.id ?? null);
  if (!list) notFound();
  const cursor = parseCursor((await searchParams).cursor);
  const page = await listFeed(id, viewer?.id ?? null, cursor);
  const isOwner = viewer?.id === list.owner.id;
  return (
    <>
      <PageHeader
        title={list.name}
        subtitle={`${list.isPrivate ? "Private list" : "List"} by @${list.owner.username} · ${list.memberCount} members`}
        back
        right={
          isOwner ? (
            <Link href={`/lists/${id}/members`} className="btn-outline">
              Edit
            </Link>
          ) : null
        }
      />
      {list.description ? <p className="border-b border-line px-4 py-3 text-[15px]">{list.description}</p> : null}
      <Feed
        page={page}
        viewer={viewer}
        basePath={`/lists/${id}`}
        hasCursor={!!cursor}
        empty={
          <EmptyState title="Nothing here yet">
            {isOwner ? (
              <>
                <Link href={`/lists/${id}/members`} className="link font-semibold">
                  Add some people
                </Link>{" "}
                and their posts will show up here, in order.
              </>
            ) : (
              "Members of this list haven't posted yet."
            )}
          </EmptyState>
        }
      />
    </>
  );
}
