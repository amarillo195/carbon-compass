import { NavLink } from "react-router-dom";
import { Home, Utensils, MapPin, Lightbulb, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", icon: Home, label: "Inicio" },
  { to: "/meals", icon: Utensils, label: "Comidas" },
  { to: "/trips", icon: MapPin, label: "Viajes" },
  { to: "/tips", icon: Lightbulb, label: "Tips" },
  { to: "/share", icon: Share2, label: "Compartir" },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border px-2 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-0.5 py-2 px-3 text-xs font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )
            }
          >
            <Icon className="w-5 h-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
