"use client";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function SignOutButton() {
  const supabase = createClient();
  const router = useRouter();

  return (
    <button
      onClick={() => supabase.auth.signOut().then(() => router.push("/login"))}
      className="text-slate-400 hover:text-white flex gap-2 text-sm font-medium transition-colors"
    >
      <LogOut size={18}/> Salir
    </button>
  );
}
