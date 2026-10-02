import { ConnectionsPage } from "../connections";

export const metadata = { title: "Followers" };

export default async function FollowersPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ cursor?: string }>;
}) {
  const { username } = await params;
  return <ConnectionsPage username={username} direction="followers" cursorParam={(await searchParams).cursor} />;
}
