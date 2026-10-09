import { Home, Package, Calendar, ShoppingCart, Tag } from "lucide-react";

export const PRIMARY_NAV_ITEMS = [
  { id: "pulpit", label: "Pulpit", icon: Home, description: "Podsumowanie szkółki i zadania" },
  { id: "magazyn", label: "Magazyn", icon: Package, description: "Rośliny, partie i zaopatrzenie" },
  { id: "harmonogram", label: "Terminarz", icon: Calendar, description: "Prace sezonowe i planowane" },
  { id: "sprzedaz", label: "Sprzedaż", icon: ShoppingCart, description: "Cennik, zestawy i zamówienia" },
  { id: "etykiety", label: "Etykiety", icon: Tag, description: "Etykiety i paszporty roślin" },
];

export function BottomNav({ tab, setTab }) {
  return (
    <nav className="bottom-nav" aria-label="Główne menu">
      {PRIMARY_NAV_ITEMS.map((it) => {
        const Icon = it.icon;
        const active = tab === it.id;
        return (
          <button
            key={it.id}
            className={`nav-btn ${active ? "active" : ""}`}
            onClick={() => setTab(it.id)}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={20} strokeWidth={active ? 2.4 : 1.9} />
            <span>{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
