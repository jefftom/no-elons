import { ConnectionsPage } from "../connections";

export const metadata = { title: "Following" };

export default async function FollowingPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ cursor?: string }>;
}) {
  const { username } = await params;
  return <ConnectionsPage username={username} direction="following" cursorParam={(await searchParams).cursor} />;
}
