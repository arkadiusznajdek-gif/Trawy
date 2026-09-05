import { GrassMark, GrassDivider } from "./GrassMark";
import { TAB_TITLES } from "../../constants";

export function Header({ tab, potsTotal }) {
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
        <div className="header-totals">
          <span>{potsTotal}</span>
          <small>szt. w donicach</small>
        </div>
      </div>
      <GrassDivider />
    </header>
  );
}
