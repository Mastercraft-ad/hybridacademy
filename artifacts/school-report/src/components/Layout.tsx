import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useSchool } from "@/hooks/useSchool";
import {
  LayoutDashboard,
  School,
  Users,
  BookOpen,
  ClipboardList,
  FileText,
  Settings,
  GraduationCap,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/schools", label: "Schools", icon: School },
  { href: "/classes", label: "Classes", icon: GraduationCap },
  { href: "/students", label: "Students", icon: Users },
  { href: "/subjects", label: "Subjects", icon: BookOpen },
  { href: "/scores", label: "Score Entry", icon: ClipboardList },
  { href: "/reportcards", label: "Report Cards", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

function Sidebar({ onClose }: { onClose?: () => void }) {
  const [location] = useLocation();
  const { school } = useSchool();

  return (
    <aside className="w-64 bg-green-900 text-white flex flex-col shadow-xl h-full">
      <div className="p-5 border-b border-green-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-6 h-6 text-green-900" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-sm truncate">{school?.name ?? "School Report"}</p>
            <p className="text-green-400 text-xs truncate">{school?.motto ?? "Card Generator"}</p>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-green-300 hover:text-white md:hidden flex-shrink-0">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
      <nav className="flex-1 py-4 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            location === item.href ||
            (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 mx-3 px-3 py-2.5 rounded-lg mb-1 text-sm transition-all",
                active
                  ? "bg-yellow-400 text-green-900 font-semibold shadow"
                  : "text-green-200 hover:bg-green-800 hover:text-white"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
              {active && <ChevronRight className="w-3 h-3 ml-auto" />}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-green-800 text-xs text-green-500 text-center">
        Nigerian School Report Card Generator
      </div>
    </aside>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { school } = useSchool();

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col md:hidden transition-transform duration-200",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile top bar */}
        <header className="flex md:hidden items-center gap-3 px-4 py-3 bg-green-900 text-white flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-white p-1 -ml-1"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="w-7 h-7 bg-yellow-400 rounded-full flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-4 h-4 text-green-900" />
          </div>
          <span className="font-semibold text-sm truncate">
            {school?.name ?? "School Report"}
          </span>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}
