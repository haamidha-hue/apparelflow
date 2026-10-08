import Link from "next/link";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { NAV_ITEMS, ROLE_CONFIG } from "@/lib/roles";
import LogoutButton from "@/components/LogoutButton";
import RoleSwitcher from "@/components/RoleSwitcher";

/**
 * Wraps every protected page:
 *  - not logged in   -> /login
 *  - wrong role      -> sent to their own home page
 *  - otherwise       -> header with menu, role switcher and logout
 * This is a usability guard. The API routes do the real security check.
 */
export default async function AppShell({
  allowed,
  title,
  children,
}: {
  allowed: Role[];
  title: string;
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!allowed.includes(session.role)) redirect(ROLE_CONFIG[session.role].home);

  const links = NAV_ITEMS.filter((n) => n.roles.includes(session.role));

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="border-b border-gray-300 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-6">
            <span className="text-lg font-bold text-gray-900">ApparelFlow</span>
            <nav className="flex gap-4">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-sm font-medium text-blue-800 underline-offset-4 hover:underline"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <RoleSwitcher currentRole={session.role} />
            <span className="text-sm text-gray-900">
              {session.fullName} ({ROLE_CONFIG[session.role].label})
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-4">
        <h1 className="mb-4 text-2xl font-bold text-gray-900">{title}</h1>
        {children}
      </main>
    </div>
  );
}