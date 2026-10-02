"use server";

import { redirect } from "next/navigation";
import { clientIp, endSession, startSession } from "@/server/auth/viewer";
import { AppError } from "@/server/errors";
import { rateLimit, LIMITS_PER_ACTION } from "@/server/rate-limit";
import { authenticate, createUser } from "@/server/services/users";
import { safeNextPath } from "@/lib/validation";
import { guarded, str, type ActionResult } from "./result";

export async function signupAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const result = await guarded(async () => {
    const ip = await clientIp();
    const rl = rateLimit(`signup:${ip}`, LIMITS_PER_ACTION.signup.limit, LIMITS_PER_ACTION.signup.windowMs);
    if (!rl.ok) throw new AppError(`Too many sign-ups from here. Try again in ${Math.ceil(rl.retryAfterSeconds / 60)} min.`, "rate_limited");
    const user = await createUser({
      username: str(fd, "username"),
      displayName: str(fd, "displayName"),
      email: str(fd, "email"),
      password: str(fd, "password"),
    });
    await startSession(user.id);
  });
  if (!result.ok) return result;
  redirect("/?welcome=1");
}

export async function loginAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const identifier = str(fd, "identifier");
  const result = await guarded(async () => {
    const ip = await clientIp();
    const id = identifier.trim().toLowerCase();
    // Per IP+account, and per account from anywhere (so rotating IPs doesn't help a guesser).
    const rl = rateLimit(`login:${ip}:${id}`, LIMITS_PER_ACTION.login.limit, LIMITS_PER_ACTION.login.windowMs);
    const rlAccount = rateLimit(`login-account:${id}`, LIMITS_PER_ACTION.loginAccount.limit, LIMITS_PER_ACTION.loginAccount.windowMs);
    const blocked = !rl.ok ? rl : !rlAccount.ok ? rlAccount : null;
    if (blocked) throw new AppError(`Too many attempts. Try again in ${Math.ceil(blocked.retryAfterSeconds / 60)} min.`, "rate_limited");
    const user = await authenticate(identifier, str(fd, "password"));
    if (!user) throw new AppError("That username/email and password don't match.");
    await startSession(user.id);
  });
  if (!result.ok) return result;
  redirect(safeNextPath(str(fd, "next")));
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect("/");
}
