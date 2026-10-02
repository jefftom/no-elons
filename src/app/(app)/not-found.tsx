import Link from "next/link";
import { EmptyState } from "@/components/feed";
import { PageHeader } from "@/components/page-header";

export default function NotFound() {
  return (
    <>
      <PageHeader title="Not found" back />
      <EmptyState title="Nothing to see here">
        This page doesn&apos;t exist — or it was deleted, or it&apos;s hidden from you.{" "}
        <Link href="/" className="link font-semibold">
          Go home
        </Link>
        .
      </EmptyState>
    </>
  );
}
