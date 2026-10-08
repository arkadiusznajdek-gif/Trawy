import { GrassMark, GrassDivider } from "./GrassMark";
import { TAB_TITLES } from "../../constants";
import { Undo2 } from "lucide-react";

export function Header({ tab, potsTotal, onUndo, canUndo }) {
  return (
    <header className="app-header">
      <div className="app-header-row">
        <div className="brand">
          <GrassMark />
          <div>
            <div className="brand-title">Szkółka traw</div>
            <div className="brand-sub">{TAB_TITLES[tab]}</div>
          </div>
        </div>
        <div className="header-actions">
          <button
            className="undo-btn"
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            aria-label="Cofnij ostatnią zmianę danych"
            title="Cofnij ostatnią zmianę danych"
          >
            <Undo2 size={16} />
            <span>Cofnij</span>
          </button>
          <div className="header-totals">
            <span>{potsTotal}</span>
            <small>szt. w donicach</small>
          </div>
        </div>
      </div>
      <GrassDivider />
    </header>
  );
}
