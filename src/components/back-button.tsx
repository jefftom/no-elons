"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export function BackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
      className="-ml-2 rounded-full p-2 hover:bg-surface-2"
      aria-label="Back"
    >
      <ArrowLeft size={20} />
    </button>
  );
}
