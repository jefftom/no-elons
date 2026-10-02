import { redirect } from "next/navigation";
import { getViewer } from "@/server/auth/viewer";
import { SignupForm } from "./signup-form";

export const metadata = { title: "Join NoElons" };

export default async function SignupPage() {
  if (await getViewer()) redirect("/");
  return (
    <>
      <h1 className="font-display text-3xl font-black tracking-tight">Join NoElons</h1>
      <p className="mt-1 text-[15px] text-muted">No algorithm. No blue-check tax. Just people.</p>
      <SignupForm />
    </>
  );
}
