import { Bell, Search } from "lucide-react";
import { SidebarTrigger } from "../ui/sidebar";
import { Input } from "../ui/input";

function DashboardHeader() {
  return (
    <header className="flex items-center justify-between md:justify-start gap-3 py-4 px-8 bg-card">
      <SidebarTrigger className="border border-input scale-[1.2]" />

      <form className="md:w-86 w-full relative hidden md:block">
        <Search
          className="absolute top-2 left-2 text-muted-foreground scale-[.8]"
          size={19}
        />
        <Input
          className="px-8 placeholder:text-[14px] placeholder:font-semibold text-muted-foreground"
          placeholder="Search receipts, customers, services"
        />
      </form>

      <h1 className="md:hidden text-xl font-semibold">Dashboard</h1>

      <div className="md:ml-auto border border-input p-2 rounded-lg cursor-pointer">
        <Bell size={18} />
      </div>
    </header>
  );
}

export default DashboardHeader;
