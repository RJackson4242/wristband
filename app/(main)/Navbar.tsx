import { Button } from "@/components/ui/button";
import { UserButton } from "@clerk/nextjs";
import { Mic2 } from "lucide-react";
import Link from "next/link";

export function Navbar() {
  return (
    <nav className="flex flex-wrap p-4 py-6 border-b mb-4">
      <div className="flex flex-1 items-center gap-2 text-2xl font-bold min-w-fit">
        <Mic2 className="w-8 h-8" />
        <span>BandManager</span>
      </div>
      <div className="order-last w-full flex justify-center gap-2 mt-4 md:mt-0 md:w-auto md:order-0">
        <Button
          asChild
          variant="ghost"
          className="flex-1 w-32 text-base md:flex-none"
        >
          <Link href="/bands">Bands</Link>
        </Button>
        <Button
          asChild
          variant="ghost"
          className="flex-1 w-32 text-base md:flex-none"
        >
          <Link href="/events">Events</Link>
        </Button>
        <Button
          asChild
          variant="ghost"
          className="flex-1 w-32 text-base md:flex-none"
        >
          <Link href="/invites">Invites</Link>
        </Button>
      </div>
      <div className="flex flex-1 justify-end ">
        <div className="scale-125 origin-right">
          <UserButton />
        </div>
      </div>
    </nav>
  );
}
