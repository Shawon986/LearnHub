"use client";

import { useRouter } from "next/navigation";
import { ChevronDown, Heart, LayoutDashboard, LogOut, MessageSquare, Wallet } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Dropdown, DropdownItem, DropdownSeparator } from "@/components/ui/dropdown";
import { homeFor } from "@/lib/nav";
import { useToast } from "@/components/ui/toast";
import type { HeaderUser } from "@/components/layout/site-header";

export function UserMenu({ user }: { user: HeaderUser }) {
  const router = useRouter();
  const { toast } = useToast();

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    toast({ title: "Signed out", description: "See you soon!", variant: "info" });
    router.push("/");
    router.refresh();
  }

  const home = homeFor(user.role);

  return (
    <Dropdown
      align="end"
      trigger={
        <button
          type="button"
          className="flex items-center gap-2 rounded-full border border-transparent p-1 pr-2 transition-colors hover:border-line hover:bg-card-2"
          aria-label="Account menu"
        >
          <Avatar name={user.name} src={user.avatarUrl} size="sm" />
          <span className="hidden max-w-28 truncate text-[13px] font-bold text-foreground sm:block">
            {user.name.split(" ")[0]}
          </span>
          <ChevronDown className="hidden h-3.5 w-3.5 text-faint-fg sm:block" />
        </button>
      }
    >
      <div className="border-b border-line px-3.5 py-2.5">
        <p className="truncate text-[13px] font-bold text-foreground">{user.name}</p>
        <p className="truncate text-[11px] text-faint-fg">{user.email}</p>
      </div>
      <DropdownItem href={home} icon={<LayoutDashboard />}>
        Dashboard
      </DropdownItem>
      <DropdownItem href="/messages" icon={<MessageSquare />}>
        Messages
      </DropdownItem>
      {user.role === "STUDENT" && (
        <>
          <DropdownItem href="/dashboard/wishlist" icon={<Heart />}>
            Wishlist
          </DropdownItem>
          <DropdownItem href="/dashboard/payments" icon={<Wallet />}>
            Payments
          </DropdownItem>
        </>
      )}
      <DropdownSeparator />
      <DropdownItem onClick={signOut} icon={<LogOut />} danger>
        Sign out
      </DropdownItem>
    </Dropdown>
  );
}
