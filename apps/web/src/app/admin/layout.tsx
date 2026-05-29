"use client";
import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Mail,
  Users,
  Lightbulb,
  LogOut,
  Zap,
  Loader2,
  Menu,
  X,
  User as UserIcon,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Skip protection for login page
    if (pathname === "/admin/login") {
      setAuthorized(true);
      return;
    }

    const token = localStorage.getItem("admin_token");
    const userString = localStorage.getItem("admin_user");

    if (!token) {
      toast.error("Access denied. Please login first.");
      router.push("/admin/login");
      return;
    }

    if (userString) {
      setAdminUser(JSON.parse(userString));
    }
    setAuthorized(true);
  }, [pathname, router]);

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    toast.success("Logged out successfully.");
    router.push("/admin/login");
  };

  if (!authorized) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500 mb-2" />
        <p className="text-zinc-500 text-sm">Verifying security session...</p>
      </div>
    );
  }

  // Login page gets standard blank layout
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const NAV_ITEMS = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Messages", href: "/admin/messages", icon: Mail },
    { label: "Subscribers", href: "/admin/subscribers", icon: Users },
    { label: "Suggestions", href: "/admin/suggestions", icon: Lightbulb },
    { label: "Feedback Board", href: "/admin/feedback", icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen flex bg-zinc-950 text-white relative">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-violet-600/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r border-zinc-800 bg-zinc-900/20 backdrop-blur-md shrink-0">
        <div className="h-16 flex items-center gap-2 px-6 border-b border-zinc-800">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="font-extrabold tracking-tight text-white text-md">
            CONVERTHUB
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/20 border border-violet-500/30 text-violet-300 font-bold">
            ADMIN
          </span>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                  active
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-900/30"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                }`}
              >
                <Icon className="h-4.5 w-4.5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Profile Card / Logout */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/10">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="h-9 w-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
              <UserIcon className="h-4 w-4 text-zinc-300" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{adminUser?.name || "Administrator"}</p>
              <p className="text-xs text-zinc-500 truncate">{adminUser?.role === "admin" ? "Admin" : "Developer"}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 text-zinc-400 hover:text-white py-2.5 text-xs font-semibold transition"
          >
            <LogOut className="h-3.5 w-3.5" />
            Log Out
          </button>
        </div>
      </aside>

      {/* Mobile Top Navigation Bar */}
      <div className="md:hidden fixed top-0 inset-x-0 h-16 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md z-30 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center">
            <Zap className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-extrabold tracking-tight text-white text-sm">
            CONVERTHUB
          </span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="rounded-lg p-1.5 border border-zinc-800 text-zinc-400 hover:text-white"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Menu Panel */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-20 bg-zinc-950 pt-20 px-4 flex flex-col justify-between pb-6">
          <nav className="space-y-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                    active
                      ? "bg-violet-600 text-white"
                      : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                  }`}
                >
                  <Icon className="h-4.5 w-4.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-zinc-800 pt-6">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 py-3 text-sm font-semibold"
            >
              <LogOut className="h-4 w-4" />
              Log Out
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pt-16 md:pt-0">
        <main className="flex-1 p-6 md:p-10 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
