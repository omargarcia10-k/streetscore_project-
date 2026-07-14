"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";

export function AccountSwitcher({
  users,
}: {
  readonly users: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
    readonly email: string;
    readonly avatar: string;
    readonly role: string;
  }>;
}) {
  const activeUser = users[0];

  if (!activeUser) {
    return null;
  }

  return (
    <Avatar className="size-8 rounded-lg">
      <AvatarImage src={activeUser.avatar || undefined} alt={activeUser.name} />
      <AvatarFallback>{getInitials(activeUser.name)}</AvatarFallback>
    </Avatar>
  );
}
