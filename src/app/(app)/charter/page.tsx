import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { CHARTER_PROMISES, RULES } from "@/lib/rules";

export const metadata = {
  title: "The Charter",
  description: "What NoElons promises its members, and the rules members agree to.",
};

export default function CharterPage() {
  return (
    <>
      <PageHeader title="The NoElons Charter" subtitle="Our promises to you, and the house rules" />
      <section className="px-4 py-6">
        <p className="font-display text-2xl font-extrabold leading-tight tracking-tight">
          A social network should be a public square, not somebody&apos;s private megaphone.
        </p>
        <p className="mt-3 text-[15px] text-muted">
          These promises are the product. They can only change through a public proposal with a 30-day comment period — never by one person on a whim.
        </p>
      </section>
      <section className="border-t border-line">
        <h2 className="px-4 pt-6 pb-2 font-display text-xl font-extrabold">Our promises</h2>
        <ol className="grid gap-3 p-4 sm:grid-cols-2">
          {CHARTER_PROMISES.map((p, i) => (
            <li key={p.title} className="card p-4">
              <div className="font-display text-3xl font-black text-accent">{String(i + 1).padStart(2, "0")}</div>
              <h3 className="mt-1 font-bold">{p.title}</h3>
              <p className="mt-1 text-sm text-muted">{p.body}</p>
            </li>
          ))}
        </ol>
      </section>
      <section id="rules" className="border-t border-line">
        <h2 className="px-4 pt-6 pb-1 font-display text-xl font-extrabold">House rules</h2>
        <p className="px-4 pb-3 text-sm text-muted">
          Break these and a moderator may remove the post or suspend the account. Every action is listed in the{" "}
          <Link href="/transparency" className="link">
            transparency log
          </Link>
          .
        </p>
        <ul className="divide-y divide-line border-y border-line">
          {RULES.map((r, i) => (
            <li key={r.code} className="flex gap-4 px-4 py-3">
              <span className="w-6 shrink-0 font-display text-lg font-black text-muted">{i + 1}</span>
              <div>
                <h3 className="font-bold">{r.title}</h3>
                <p className="text-sm text-muted">{r.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section className="px-4 py-6 text-sm text-muted">
        <p>
          NoElons is satire-adjacent in name only. We&apos;re not affiliated with any billionaire, rocket company, or electric car. We just think
          nobody should own the conversation.
        </p>
      </section>
    </>
  );
}
