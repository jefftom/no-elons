import { redirect } from "next/navigation";
import { getViewer } from "@/server/auth/viewer";
import { safeNextPath } from "@/lib/validation";
import { LoginForm } from "./login-form";

export const metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; changed?: string }> }) {
  const sp = await searchParams;
  const next = safeNextPath(sp.next);
  if (await getViewer()) redirect(next);
  return (
    <>
      <h1 className="font-display text-3xl font-black tracking-tight">Welcome back</h1>
      <p className="mt-1 text-[15px] text-muted">Your timeline is exactly where you left it. In order.</p>
      {sp.changed ? <p className="mt-4 rounded-xl bg-repost-soft px-3 py-2 text-sm font-semibold text-repost">Password changed — please log in again.</p> : null}
      <LoginForm next={next} />
    </>
  );
}
