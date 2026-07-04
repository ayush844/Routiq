import { signOutAction } from "@/actions/auth";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <Button variant="ghost" size="sm" type="submit">
        <LogOut className="h-4 w-4" />
        Sign out
      </Button>
    </form>
  );
}
