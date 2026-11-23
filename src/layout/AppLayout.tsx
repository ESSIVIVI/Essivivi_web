import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui";
import { navFor } from "./nav";

export default function AppLayout() {
  const { me, role, signOut } = useAuth();
  const items = navFor(role);

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[14rem_1fr]">
      <aside className="border-b border-slate-200 bg-white md:sticky md:top-0 md:h-dvh md:border-r md:border-b-0">
        <div className="flex items-center justify-between gap-3 px-4 py-3 md:block md:py-5">
          <div>
            <p className="text-base font-semibold text-brand-700">ESSIVIVI-Sarl</p>
            <p className="hidden text-xs text-slate-500 md:block">{me?.role.name}</p>
          </div>
          <Button variant="ghost" className="min-h-9 px-3 py-1 md:hidden" onClick={() => void signOut()}>
            Déconnexion
          </Button>
        </div>
        <nav aria-label="Navigation principale" className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:px-3 md:pb-0">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                [
                  "shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive ? "bg-brand-50 text-brand-800" : "text-slate-700 hover:bg-slate-100",
                ].join(" ")
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden px-4 py-4 text-sm md:absolute md:inset-x-0 md:bottom-0 md:block">
          <p className="truncate font-medium text-slate-800">{me?.full_name}</p>
          <p className="truncate text-xs text-slate-500">{me?.email}</p>
          <Button variant="secondary" className="mt-3 w-full" onClick={() => void signOut()}>
            Se déconnecter
          </Button>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-5xl p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
