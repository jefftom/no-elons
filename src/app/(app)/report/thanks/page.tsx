import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { EmptyState } from "@/components/feed";
import { PageHeader } from "@/components/page-header";

export const metadata = { title: "Thanks for reporting" };

export default function ReportThanksPage() {
  return (
    <>
      <PageHeader title="Report sent" />
      <EmptyState title="Thanks for looking out" icon={<ShieldCheck />}>
        A moderator will review it against the rules. Decisions are published in the{" "}
        <Link href="/transparency" className="link font-semibold">
          transparency log
        </Link>
        . In the meantime you can mute or block the account from its profile.
      </EmptyState>
      <div className="text-center">
        <Link href="/" className="btn-primary">
          Back to Home
        </Link>
      </div>
    </>
  );
}
