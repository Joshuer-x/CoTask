"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { useAuthStore } from "@/stores/authStore";

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const NAV_MAIN = [
  {
    href: "/dashboard",
    label: "Inbox",
    exact: false,
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M2 3.5A1.5 1.5 0 013.5 2h1.148a1.5 1.5 0 011.465 1.175l.716 3.223a1.5 1.5 0 01-1.052 1.767l-.933.267c-.41.117-.643.555-.48.95a11.542 11.542 0 006.254 6.254c.395.163.833-.07.95-.48l.267-.933a1.5 1.5 0 011.767-1.052l3.223.716A1.5 1.5 0 0118 15.352V16.5a1.5 1.5 0 01-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 012.43 8.326 13.019 13.019 0 012 5V3.5z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    href: "/tasks",
    label: "Today",
    exact: true,
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    href: "/tasks/team",
    label: "Upcoming",
    exact: false,
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v4.59L7.3 9.24a.75.75 0 00-1.1 1.02l3.25 3.5a.75.75 0 001.1 0l3.25-3.5a.75.75 0 10-1.1-1.02l-1.95 2.1V6.75z" clipRule="evenodd" />
      </svg>
    ),
  },
];

const NAV_PROJECTS = [
  {
    href: "/tasks",
    label: "My Tasks",
    exact: true,
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    href: "/tasks/team",
    label: "Team Tasks",
    exact: false,
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M7 8a3 3 0 100-6 3 3 0 000 6zM14.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM1.615 16.428a1.224 1.224 0 01-.569-1.175 6.002 6.002 0 0111.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 017 17a9.953 9.953 0 01-5.385-1.572zM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 00-1.588-3.755 4.502 4.502 0 015.874 2.636.818.818 0 01-.36.98A7.465 7.465 0 0114.5 16z" />
      </svg>
    ),
  },
  {
    href: "/meetings",
    label: "Meetings",
    exact: false,
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M3.25 4A2.25 2.25 0 001 6.25v7.5A2.25 2.25 0 003.25 16h7.5A2.25 2.25 0 0013 13.75v-7.5A2.25 2.25 0 0010.75 4h-7.5zM19 4.75a.75.75 0 00-1.28-.53l-3 3a.75.75 0 00-.22.53v4.5c0 .199.079.39.22.53l3 3a.75.75 0 001.28-.53V4.75z" />
      </svg>
    ),
  },
];

const NAV_BOTTOM = [
  {
    href: "/settings",
    label: "Settings",
    exact: false,
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M7.84 1.804A1 1 0 018.82 1h2.36a1 1 0 01.98.804l.331 1.652a6.993 6.993 0 011.929 1.115l1.598-.54a1 1 0 011.186.447l1.18 2.044a1 1 0 01-.205 1.251l-1.267 1.113a7.047 7.047 0 010 2.228l1.267 1.113a1 1 0 01.206 1.25l-1.18 2.045a1 1 0 01-1.187.447l-1.598-.54a6.993 6.993 0 01-1.929 1.115l-.33 1.652a1 1 0 01-.98.804H8.82a1 1 0 01-.98-.804l-.331-1.652a6.993 6.993 0 01-1.929-1.115l-1.598.54a1 1 0 01-1.186-.447l-1.18-2.044a1 1 0 01.205-1.251l1.267-1.114a7.05 7.05 0 010-2.227L1.821 7.773a1 1 0 01-.206-1.25l1.18-2.045a1 1 0 011.187-.447l1.598.54A6.993 6.993 0 017.51 3.456l.33-1.652zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
      </svg>
    ),
  },
];

function NavLink({ item, pathname }: { item: { href: string; label: string; exact: boolean; icon: React.ReactNode }; pathname: string }) {
  const active = item.exact ? pathname === item.href : pathname.startsWith(item.href) && !(item.href === "/tasks" && pathname === "/tasks/team");
  return (
    <Link
      href={item.href}
      className={clsx("nav-item", active && "nav-item-active")}
    >
      <span className={clsx("transition-colors", active ? "text-[#DB4035]" : "text-[#888888]")}>
        {item.icon}
      </span>
      {item.label}
    </Link>
  );
}

function SidebarContent({ pathname, userId, role }: { pathname: string; userId: string | null; role: string | null }) {
  return (
    <>
      {/* Top user bar */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#F0F0F0]">
        <div className="w-8 h-8 rounded-full bg-[#DB4035] flex items-center justify-center text-xs font-semibold text-white shrink-0">
          {userId ? userId.slice(0, 2).toUpperCase() : "?"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#202020] truncate">My Workspace</p>
        </div>
        <button className="text-[#888888] hover:text-[#444444] transition-colors" aria-label="Notifications">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M10 2a6 6 0 00-6 6c0 1.887-.454 3.665-1.257 5.234a.75.75 0 00.515 1.076 32.091 32.091 0 003.256.508 3.5 3.5 0 006.972 0 32.085 32.085 0 003.256-.508.75.75 0 00.515-1.076A11.448 11.448 0 0116 8a6 6 0 00-6-6zM8.05 14.943a33.54 33.54 0 003.9 0 2 2 0 01-3.9 0z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Add Task button */}
      <div className="px-3 py-2 border-b border-[#F0F0F0]">
        <button className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm font-semibold text-[#DB4035] hover:bg-[#FFF5F5] transition-colors duration-150">
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-[#DB4035]">
            <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z" />
          </svg>
          Add task
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {NAV_MAIN.map((item) => (
          <NavLink key={item.href + item.label} item={item} pathname={pathname} />
        ))}

        <div className="pt-4 pb-1">
          <span className="section-label px-3">Projects</span>
        </div>

        {NAV_PROJECTS.map((item) => (
          <NavLink key={item.href + item.label} item={item} pathname={pathname} />
        ))}

        <div className="pt-4 pb-1">
          <span className="section-label px-3">Manage</span>
        </div>

        {NAV_BOTTOM.map((item) => (
          <NavLink key={item.href + item.label} item={item} pathname={pathname} />
        ))}
      </nav>

      {/* Help footer */}
      <div className="px-3 py-3 border-t border-[#F0F0F0]">
        <button className="nav-item w-full">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-[#888888]">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.94 6.94a.75.75 0 11-1.061-1.061 3 3 0 112.871 5.026v.345a.75.75 0 01-1.5 0v-.5c0-.72.57-1.172 1.081-1.287A1.5 1.5 0 108.94 6.94zM10 15a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          <span className="text-[#888888]">Help &amp; resources</span>
        </button>
      </div>
    </>
  );
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const userId = useAuthStore((s) => s.userId);
  const role = useAuthStore((s) => s.role);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 shrink-0 bg-white border-r border-[#F0F0F0] flex-col h-screen sticky top-0">
        <SidebarContent pathname={pathname} userId={userId} role={role} />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/30" onClick={onMobileClose} />
          <aside className="relative z-50 flex w-60 shrink-0 bg-white border-r border-[#F0F0F0] flex-col h-screen">
            <SidebarContent pathname={pathname} userId={userId} role={role} />
          </aside>
        </div>
      )}
    </>
  );
}
