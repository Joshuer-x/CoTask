"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";

interface TopBarProps {
  onMenuClick?: () => void;
}

const PAGE_NAMES: Record<string, string> = {
  "/dashboard": "Inbox",
  "/tasks": "Today",
  "/tasks/team": "Upcoming",
  "/meetings": "Meetings",
  "/settings": "Settings",
};

function getBreadcrumb(pathname: string): { label: string; href: string }[] {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];
  let path = "";
  for (const seg of segments) {
    path += "/" + seg;
    const name = PAGE_NAMES[path] ?? seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " ");
    crumbs.push({ label: name, href: path });
  }
  return crumbs;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const pathname = usePathname();
  const crumbs = getBreadcrumb(pathname);

  return (
    <header className="h-12 bg-white border-b border-[#F0F0F0] flex items-center px-4 gap-3 shrink-0">
      {/* Hamburger (mobile) */}
      <button
        className="lg:hidden p-1.5 rounded-md text-[#888888] hover:bg-[#F5F5F5] transition-colors"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 flex-1 min-w-0">
        {crumbs.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-1">
            {i > 0 && <span className="text-[#CCCCCC] text-sm">/</span>}
            {i < crumbs.length - 1 ? (
              <Link href={crumb.href} className="text-sm text-[#666666] hover:text-[#202020] transition-colors">
                {crumb.label}
              </Link>
            ) : (
              <span className="text-sm font-medium text-[#202020]">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>

      {/* Right actions */}
      <div className="flex items-center gap-1">
        <button className="text-sm text-[#444444] px-3 py-1.5 rounded-md hover:bg-[#F5F5F5] transition-colors font-medium">
          Invite members
        </button>
        <Link
          href="/settings"
          className="p-1.5 rounded-md text-[#888888] hover:bg-[#F5F5F5] transition-colors"
          aria-label="Settings"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M7.84 1.804A1 1 0 018.82 1h2.36a1 1 0 01.98.804l.331 1.652a6.993 6.993 0 011.929 1.115l1.598-.54a1 1 0 011.186.447l1.18 2.044a1 1 0 01-.205 1.251l-1.267 1.113a7.047 7.047 0 010 2.228l1.267 1.113a1 1 0 01.206 1.25l-1.18 2.045a1 1 0 01-1.187.447l-1.598-.54a6.993 6.993 0 01-1.929 1.115l-.33 1.652a1 1 0 01-.98.804H8.82a1 1 0 01-.98-.804l-.331-1.652a6.993 6.993 0 01-1.929-1.115l-1.598.54a1 1 0 01-1.186-.447l-1.18-2.044a1 1 0 01.205-1.251l1.267-1.114a7.05 7.05 0 010-2.227L1.821 7.773a1 1 0 01-.206-1.25l1.18-2.045a1 1 0 011.187-.447l1.598.54A6.993 6.993 0 017.51 3.456l.33-1.652zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
        </Link>
        <button
          className="relative p-1.5 rounded-md text-[#888888] hover:bg-[#F5F5F5] transition-colors"
          aria-label="Notifications"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M10 2a6 6 0 00-6 6c0 1.887-.454 3.665-1.257 5.234a.75.75 0 00.515 1.076 32.091 32.091 0 003.256.508 3.5 3.5 0 006.972 0 32.085 32.085 0 003.256-.508.75.75 0 00.515-1.076A11.448 11.448 0 0116 8a6 6 0 00-6-6zM8.05 14.943a33.54 33.54 0 003.9 0 2 2 0 01-3.9 0z" clipRule="evenodd" />
          </svg>
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-[#DB4035] rounded-full" />
        </button>
      </div>
    </header>
  );
}
