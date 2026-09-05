import { Home, Package, Calendar, ShoppingCart, Tag } from "lucide-react";

export function BottomNav({ tab, setTab }) {
  const items = [
    { id: "pulpit", label: "Pulpit", icon: Home },
    { id: "magazyn", label: "Magazyn", icon: Package },
    { id: "harmonogram", label: "Terminarz", icon: Calendar },
    { id: "sprzedaz", label: "Sprzedaż", icon: ShoppingCart },
    { id: "etykiety", label: "Etykiety", icon: Tag },
  ];
  return (
    <nav className="bottom-nav">
      {items.map((it) => {
        const Icon = it.icon;
        const active = tab === it.id;
        return (
          <button key={it.id} className={`nav-btn ${active ? "active" : ""}`} onClick={() => setTab(it.id)}>
            <Icon size={20} strokeWidth={active ? 2.4 : 1.9} />
            <span>{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
