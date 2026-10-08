export function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap');

      :root {
        --bg: #D7DBDF; --surface: #FFFFFF; --surface-2: #F2F4F6;
        --ink: #23281D; --ink-muted: #6E7260; --line: #C7CDD3;
        --brand: #2C5282; --brand-dark: #1A365D;
        --gold: #B98A28; --gold-soft: #E4E9EF;
        --rust: #B5502B; --rust-soft: #F6DCCF;
        --green-soft: #D7E3F0;
      }
      * { box-sizing: border-box; }
      .app-shell { font-family: 'Inter', system-ui, sans-serif; background: var(--bg); color: var(--ink); min-height: 100vh; max-width: 480px; margin: 0 auto; display: flex; flex-direction: column; position: relative; }
      .app-header { position: sticky; top: 0; z-index: 10; background: var(--bg); padding: 14px 16px 0 16px; }
      .app-header-row { display: flex; align-items: center; justify-content: space-between; }
      .header-actions { display: flex; align-items: center; gap: 12px; }
      .undo-btn { display: flex; align-items: center; gap: 4px; border: 1px solid var(--line); border-radius: 9px; padding: 6px 9px; background: var(--surface); color: var(--brand); font: 600 12px 'Inter', sans-serif; cursor: pointer; }
      .undo-btn:disabled { opacity: 0.45; cursor: default; }
      .brand { display: flex; align-items: center; gap: 10px; }
      .brand-title { font-family: 'Fraunces', serif; font-weight: 700; font-size: 19px; line-height: 1.1; color: var(--brand-dark); }
      .brand-sub { font-size: 12px; color: var(--ink-muted); margin-top: 1px; }
      .header-totals { text-align: right; font-family: 'JetBrains Mono', monospace; }
      .header-totals span { display: block; font-size: 18px; font-weight: 600; color: var(--brand); }
      .header-totals small { font-size: 10px; color: var(--ink-muted); letter-spacing: 0.02em; }
      .grass-mark .blade { transform-origin: 15px 28px; animation: sway 3.4s ease-in-out infinite; }
      .grass-mark .b1 { animation-delay: 0s; } .grass-mark .b2 { animation-delay: 0.3s; } .grass-mark .b3 { animation-delay: 0.6s; }
      @keyframes sway { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
      .grass-divider { display: flex; align-items: flex-end; height: 12px; margin-top: 10px; gap: 3px; overflow: hidden; }
      .gd-blade { width: 2px; border-radius: 2px 2px 0 0; background: var(--line); display: inline-block; transform-origin: bottom center; animation: sway-sm 2.6s ease-in-out infinite; }
      .gd-0 { height: 7px; background: var(--brand); opacity: 0.55; } .gd-1 { height: 11px; background: var(--gold); opacity: 0.5; } .gd-2 { height: 5px; background: var(--brand); opacity: 0.35; }
      @keyframes sway-sm { 0%, 100% { transform: rotate(-6deg); } 50% { transform: rotate(6deg); } }
      .app-content { flex: 1; padding-bottom: 84px; }
      .tab-pad { padding: 14px 16px 20px; }
      .loading { padding: 40px 16px; text-align: center; color: var(--ink-muted); }
      .totals-row { display: flex; gap: 8px; margin-bottom: 12px; }
      .totals-chip { flex: 1; background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 8px 6px; text-align: center; }
      .totals-num { display: block; font-family: 'JetBrains Mono', monospace; font-size: 17px; font-weight: 600; color: var(--brand); }
      .totals-label { font-size: 10px; color: var(--ink-muted); text-transform: uppercase; letter-spacing: 0.04em; }
      .search-bar { display: flex; align-items: center; gap: 8px; background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 9px 12px; margin-bottom: 12px; color: var(--ink-muted); }
      .search-bar input { border: none; outline: none; background: transparent; flex: 1; font-size: 14px; color: var(--ink); font-family: 'Inter', sans-serif; }
      .plant-list { display: flex; flex-direction: column; gap: 8px; }
      .plant-card { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; overflow: hidden; }
      .plant-card-head { width: 100%; display: flex; align-items: center; gap: 10px; padding: 10px 13px; }
      .plant-card-head-btn { flex: 1; min-width: 0; display: flex; align-items: center; justify-content: space-between; gap: 8px; background: none; border: none; text-align: left; cursor: pointer; color: var(--ink); padding: 0; }
      .plant-card-info { min-width: 0; flex: 1; }
      .photo-thumb { position: relative; flex-shrink: 0; border-radius: 10px; border: 1px dashed var(--line); background: var(--surface-2); color: var(--ink-muted); display: flex; align-items: center; justify-content: center; overflow: hidden; padding: 0; cursor: pointer; }
      .photo-thumb img { width: 100%; height: 100%; object-fit: cover; }
      .visually-hidden-input { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; opacity: 0; }
      .plant-name { font-weight: 600; font-size: 14.5px; }
      .plant-variety { font-size: 12.5px; color: var(--ink-muted); font-style: italic; margin-top: 1px; }
      .plant-opis-preview { font-size: 11.5px; color: var(--ink-muted); margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 220px; }
      .plant-opis-full { font-size: 12.5px; color: var(--ink-muted); margin-bottom: 10px; line-height: 1.4; }
      .plant-info-grid-wrap { margin-bottom: 10px; }
      .plant-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 14px; margin-bottom: 8px; }
      .info-item { display: flex; flex-direction: column; gap: 1px; }
      .info-label { font-size: 10.5px; color: var(--ink-muted); text-transform: uppercase; letter-spacing: 0.02em; }
      .info-value { font-size: 13px; color: var(--ink); font-weight: 500; }
      .info-block { font-size: 12.5px; color: var(--ink-muted); line-height: 1.45; margin-top: 6px; }
      .info-block b { color: var(--ink); }
      .plant-card-right { display: flex; align-items: center; gap: 8px; color: var(--ink-muted); flex-shrink: 0; }
      .plant-total-badge { font-family: 'JetBrains Mono', monospace; font-size: 12px; background: var(--green-soft); color: var(--brand-dark); padding: 3px 8px; border-radius: 999px; font-weight: 600; white-space: nowrap; }
      .plant-card-body { padding: 4px 13px 12px; display: flex; flex-direction: column; gap: 8px; border-top: 1px solid var(--line); padding-top: 10px; }
      .qty-row { display: flex; align-items: center; justify-content: space-between; }
      .qty-label { font-size: 13px; color: var(--ink-muted); font-weight: 500; width: 50px; }
      .stepper { display: flex; align-items: center; gap: 6px; }
      .stepper-btn { width: 30px; height: 30px; border-radius: 9px; border: 1px solid var(--line); background: var(--surface-2); color: var(--brand); display: flex; align-items: center; justify-content: center; cursor: pointer; }
      .stepper-btn:active { background: var(--green-soft); }
      .stepper-input { width: 48px; text-align: center; border: 1px solid var(--line); border-radius: 8px; padding: 5px 2px; font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 600; color: var(--ink); }
      .empty-state { padding: 24px 8px; text-align: center; color: var(--ink-muted); font-size: 13.5px; }
      .section-title { display: flex; align-items: center; gap: 7px; font-family: 'Fraunces', serif; font-weight: 600; font-size: 15.5px; color: var(--brand-dark); margin-bottom: 10px; }
      .section-title.small-title { font-size: 13px; margin: 4px 0 2px; }
      .task-list { display: flex; flex-direction: column; gap: 7px; margin-bottom: 4px; }
      .task-row { display: flex; align-items: center; gap: 10px; background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px; cursor: pointer; text-align: left; width: 100%; }
      .task-row.custom-row { padding: 6px 8px 6px 12px; }
      .task-row.done { opacity: 0.5; } .task-row.done .task-plant { text-decoration: line-through; }
      .task-check { width: 20px; height: 20px; border-radius: 6px; border: 1.6px solid var(--line); display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: white; }
      .task-check.checked { background: var(--brand); border-color: var(--brand); }
      .task-check-btn { background: none; border: none; padding: 0; cursor: pointer; }
      .task-text { flex: 1; display: flex; flex-direction: column; }
      .task-text-btn { flex: 1; background: none; border: none; text-align: left; padding: 0; cursor: pointer; min-width: 0; }
      .task-plant { font-size: 13.5px; font-weight: 600; }
      .task-variety { font-size: 11.5px; color: var(--ink-muted); font-style: italic; }
      .task-tag { font-size: 10.5px; padding: 3px 8px; border-radius: 999px; font-weight: 600; white-space: nowrap; }
      .tag-ciecie { background: var(--gold-soft); color: #7A5A16; }
      .tag-podzial { background: var(--green-soft); color: var(--brand-dark); }
      .tag-pielegnacja { background: var(--rust-soft); color: var(--rust); }
      .tag-wlasne { background: #E3DEF3; color: #4B3E82; }
      .custom-task-block { margin-top: 8px; display: flex; flex-direction: column; gap: 8px; }
      .add-task-btn { width: 100%; justify-content: center; }
      .add-task-form { display: flex; gap: 6px; align-items: center; }
      .add-task-form input { flex: 1; border: 1px solid var(--line); border-radius: 9px; padding: 9px 10px; font-size: 13px; font-family: 'Inter', sans-serif; background: var(--surface-2); color: var(--ink); }
      .month-accordion { display: flex; flex-direction: column; gap: 6px; }
      .month-block { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; overflow: hidden; }
      .month-block.is-current { border-color: var(--brand); }
      .month-head { width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 11px 13px; background: none; border: none; cursor: pointer; font-size: 13.5px; font-weight: 600; color: var(--ink); }
      .month-count { font-size: 11.5px; color: var(--ink-muted); font-family: 'JetBrains Mono', monospace; margin-left: auto; margin-right: 8px; }
      .month-block .task-list { padding: 0 10px 10px; }
      .month-block .custom-task-block { padding: 0 10px 10px; margin-top: 0; }
      .task-list.compact .task-row { padding: 8px 10px; }
      .segmented { display: flex; background: var(--surface-2); border: 1px solid var(--line); border-radius: 12px; padding: 3px; margin-top: 10px; margin-bottom: 4px; }
      .segmented button { flex: 1; border: none; background: none; padding: 8px 0; font-size: 12.5px; font-weight: 600; color: var(--ink-muted); border-radius: 9px; cursor: pointer; }
      .segmented button.active { background: var(--brand); color: #FFFFFF; box-shadow: 0 1px 3px rgba(0,0,0,0.18); }
      .segmented.scrollable { overflow-x: auto; -webkit-overflow-scrolling: touch; }
      .segmented.scrollable button { flex: 0 0 auto; padding: 8px 14px; white-space: nowrap; }
      .price-list { display: flex; flex-direction: column; gap: 8px; }
      .price-card { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 11px 13px; }
      .price-card-head { width: 100%; display: flex; align-items: center; justify-content: space-between; background: none; border: none; padding: 0; margin-bottom: 4px; cursor: pointer; text-align: left; color: var(--ink); }
      .cost-margin-body { border-top: 1px solid var(--line); margin-top: 8px; padding-top: 8px; display: flex; flex-direction: column; gap: 6px; }
      .cost-margin-row { display: flex; align-items: center; gap: 8px; }
      .cost-margin-label { font-weight: 700; font-size: 12px; width: 32px; flex-shrink: 0; }
      .margin-badge { font-size: 11px; font-weight: 600; color: var(--brand); margin-left: auto; white-space: nowrap; }
      .margin-badge.neg { color: var(--rust); }
      .division-banner { display: flex; flex-direction: column; gap: 8px; background: var(--gold-soft); border: 1px solid #DEC57F; border-radius: 10px; padding: 10px 12px; font-size: 12px; color: #6B4F12; }
      .status-tag { border: none; cursor: pointer; }
      .status-todo { background: var(--surface-2); color: var(--ink-muted); border: 1px solid var(--line); }
      .status-progress { background: var(--gold-soft); color: #7A5A16; }
      .status-done { background: var(--green-soft); color: var(--brand-dark); }
      .calendar-toggle { border: 1px solid var(--line); border-radius: 9px; background: var(--surface-2); }
      .calendar-toggle.active { background: var(--green-soft); color: var(--brand-dark); border-color: var(--brand); }
      .task-date-badge { display: inline-flex; align-items: center; gap: 3px; font-size: 10.5px; font-weight: 700; color: var(--brand-dark); background: var(--green-soft); padding: 3px 7px; border-radius: 999px; white-space: nowrap; flex-shrink: 0; }
      .price-inputs { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
      .price-field { flex: 1 1 70px; display: flex; flex-direction: column; gap: 3px; }
      .price-field span { font-size: 10.5px; color: var(--ink-muted); font-weight: 600; }
      .price-input-wrap { display: flex; align-items: center; border: 1px solid var(--line); border-radius: 8px; padding: 5px 8px; background: var(--surface-2); }
      .price-input-wrap.small { flex: 1; }
      .price-input-wrap input { border: none; outline: none; background: none; width: 100%; font-family: 'JetBrains Mono', monospace; font-size: 13px; color: var(--ink); }
      .price-input-wrap .pln { font-size: 11px; color: var(--ink-muted); }
      .price-warning { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--rust); margin-top: 2px; }
      .primary-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; background: var(--brand); color: white; border: none; border-radius: 12px; padding: 11px 16px; font-size: 14px; font-weight: 600; cursor: pointer; width: 100%; }
      .primary-btn:disabled { opacity: 0.45; }
      .primary-btn.small { width: auto; padding: 7px 12px; font-size: 12.5px; }
      .secondary-btn { background: var(--surface-2); color: var(--brand-dark); border: 1px solid var(--line); border-radius: 12px; padding: 10px 14px; font-size: 13.5px; font-weight: 600; cursor: pointer; }
      .secondary-btn.small { padding: 7px 12px; font-size: 12.5px; }
      .ghost-btn { background: none; border: 1px dashed var(--line); color: var(--ink-muted); border-radius: 12px; padding: 9px 14px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; flex: 1; }
      .ghost-btn.small { padding: 6px 10px; font-size: 12px; flex: none; }
      .add-plant-btn { width: 100%; justify-content: center; margin: 10px 0 4px; }
      .danger-btn { background: var(--rust); color: white; border: none; border-radius: 10px; padding: 7px 12px; font-size: 12.5px; font-weight: 600; cursor: pointer; }
      .icon-btn { background: none; border: none; color: var(--ink-muted); cursor: pointer; padding: 6px; }
      .modal-overlay { position: fixed; inset: 0; background: rgba(20, 24, 15, 0.45); display: flex; align-items: flex-end; justify-content: center; z-index: 60; padding: 0; }
      .modal-box { background: var(--surface); width: 100%; max-width: 480px; max-height: 88vh; overflow-y: auto; border-radius: 18px 18px 0 0; padding: 16px; box-shadow: 0 -8px 30px rgba(0,0,0,0.2); }
      .modal-header { display: flex; align-items: center; justify-content: space-between; font-weight: 700; font-family: 'Fraunces', serif; font-size: 16px; color: var(--brand-dark); margin-bottom: 8px; }
      .backup-textarea { width: 100%; min-height: 160px; border: 1px solid var(--line); border-radius: 10px; padding: 10px; font-size: 11.5px; font-family: 'JetBrains Mono', monospace; color: var(--ink); background: var(--surface-2); resize: vertical; }
      .chip-btn { border: 1px solid var(--line); background: var(--surface-2); color: var(--ink-muted); border-radius: 999px; padding: 7px 14px; font-size: 13px; font-weight: 600; cursor: pointer; }
      .chip-btn.chip-active { background: var(--brand); color: white; border-color: var(--brand); }
      .icon-btn.danger { color: var(--rust); }
      .etykiety-actions { display: flex; gap: 8px; margin-bottom: 12px; }
      .label-count-card { display: flex; align-items: center; justify-content: space-between; background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px; }
      .print-bar { position: sticky; bottom: 76px; display: flex; align-items: center; justify-content: space-between; background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px; margin-top: 14px; font-size: 12.5px; color: var(--ink-muted); }
      .print-bar .primary-btn { width: auto; }
      .order-form { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 14px; margin-top: 10px; display: flex; flex-direction: column; gap: 10px; }
      .field { display: flex; flex-direction: column; gap: 4px; }
      .field span { font-size: 11.5px; font-weight: 600; color: var(--ink-muted); }
      .field input, .field select, .order-item-row select { border: 1px solid var(--line); border-radius: 9px; padding: 9px 10px; font-size: 13.5px; font-family: 'Inter', sans-serif; background: var(--surface-2); color: var(--ink); }
      .checkbox-field { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--ink); }
      .checkbox-field input { width: 18px; height: 18px; }
      .month-chips { display: flex; flex-wrap: wrap; gap: 6px; }
      .month-chip { border: 1px solid var(--line); background: var(--surface-2); color: var(--ink-muted); border-radius: 8px; padding: 6px 9px; font-size: 11.5px; font-weight: 600; cursor: pointer; }
      .month-chip.active { background: var(--brand); color: #fff; border-color: var(--brand); }
      .pot-size-manager { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; margin-bottom: 10px; overflow: hidden; }
      .pot-size-toggle { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 9px 12px; background: none; border: none; cursor: pointer; font-size: 12px; color: var(--ink-muted); text-align: left; }
      .pot-size-body { padding: 0 12px 12px; border-top: 1px solid var(--line); padding-top: 10px; }
      .pot-size-chip { display: inline-flex; align-items: center; gap: 5px; border: 1px solid var(--line); background: var(--surface-2); color: var(--ink); border-radius: 8px; padding: 5px 6px 5px 10px; font-size: 12px; font-weight: 600; }
      .pot-size-remove { background: none; border: none; color: var(--ink-muted); cursor: pointer; padding: 2px; display: flex; }
      .recipe-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 0; border-top: 1px dashed var(--line); }
      .recipe-row:first-of-type { border-top: none; }
      .recipe-size { font-weight: 700; font-size: 13px; width: 48px; flex-shrink: 0; }
      .recipe-inputs { display: flex; align-items: center; gap: 8px; flex: 1; flex-wrap: wrap; }
      .recipe-inputs label { display: flex; flex-direction: column; gap: 2px; }
      .recipe-inputs label span { font-size: 9.5px; color: var(--ink-muted); font-weight: 600; }
      .recipe-total { font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 600; color: var(--brand); margin-left: auto; }
      .custom-badge { font-size: 9.5px; background: #E3DEF3; color: #4B3E82; padding: 2px 6px; border-radius: 999px; font-weight: 700; margin-left: 6px; vertical-align: middle; }
      .remove-plant-btn { display: flex; align-items: center; gap: 5px; font-size: 12px; margin-top: 4px; background: none; border: none; padding: 4px 0; cursor: pointer; color: var(--rust); }
      .supply-card { display: flex; align-items: center; justify-content: space-between; gap: 10px; background: var(--surface); border: 1px solid var(--line); border-radius: 18px; padding: 16px 18px; margin-bottom: 10px; }
      .supply-card.low { border-color: var(--rust); background: var(--rust-soft); }
      .supply-card-main { width: 100%; }
      .supply-meta { font-size: 12.5px; color: var(--ink-muted); margin-top: 3px; line-height: 1.4; }
      .supply-qty-row { display: flex; align-items: center; gap: 10px; margin-top: 12px; }
      .supply-qty-input { border: 1px solid var(--line); border-radius: 12px; padding: 10px 14px; font-size: 15px; width: 110px; background: var(--surface); color: var(--ink); }
      .supply-unit { font-size: 13px; color: var(--ink-muted); }
      .supply-qty-row .icon-btn { margin-left: auto; }
      .low-badge { font-size: 9.5px; background: var(--rust); color: white; padding: 2px 6px; border-radius: 999px; font-weight: 700; margin-left: 6px; }
      .recipe-linked-badge { color: var(--brand); font-weight: 600; }
      .stat-row { display: flex; gap: 10px; }
      .stat-box { flex: 1; background: var(--surface-2); border: 1px solid var(--line); border-radius: 14px; padding: 12px 14px; display: flex; flex-direction: column; gap: 4px; }
      .stat-label { font-size: 10.5px; color: var(--ink-muted); text-transform: uppercase; letter-spacing: 0.02em; }
      .stat-value { font-size: 17px; font-weight: 700; color: var(--brand-dark); font-family: 'Fraunces', serif; }
      .dash-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px; }
      .dash-card-wide { grid-column: 1 / -1; }
      .dash-card-split { flex-direction: row; justify-content: space-between; gap: 6px; }
      .dash-split-item { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
      .dash-num-sm { font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 700; color: var(--brand); white-space: nowrap; }
      .dash-card { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 12px; text-align: left; cursor: pointer; display: flex; flex-direction: column; gap: 4px; }
      .dash-num { font-family: 'JetBrains Mono', monospace; font-size: 20px; font-weight: 700; color: var(--brand); }
      .dash-label { font-size: 11px; color: var(--ink-muted); line-height: 1.25; }
      .alert-box { display: flex; align-items: center; gap: 8px; background: var(--rust-soft); color: var(--rust); border-radius: 12px; padding: 10px 12px; font-size: 12.5px; margin-bottom: 14px; }
      .log-list { display: flex; flex-direction: column; gap: 2px; }
      .log-row { display: flex; gap: 10px; padding: 8px 4px; border-bottom: 1px solid var(--line); font-size: 12.5px; }
      .log-time { color: var(--ink-muted); font-family: 'JetBrains Mono', monospace; font-size: 11px; white-space: nowrap; flex-shrink: 0; }
      .log-text { color: var(--ink); }
      .hint-text { font-size: 11.5px; color: var(--ink-muted); margin: 4px 0 10px; line-height: 1.4; }
      .file-label { display: inline-flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; flex: 1; }
      .order-item-row { display: flex; flex-direction: column; gap: 6px; border-top: 1px dashed var(--line); padding-top: 10px; }
      .order-item-sub { display: flex; gap: 6px; align-items: center; }
      .order-item-sub select { width: 64px; flex-shrink: 0; }
      .order-item-sub input[type=number] { width: 48px; flex-shrink: 0; border: 1px solid var(--line); border-radius: 8px; padding: 8px 4px; text-align: center; font-family: 'JetBrains Mono', monospace; }
      .zestaw-row-head { display: flex; align-items: center; gap: 6px; }
      .row-label-input { flex: 1; border: 1px solid var(--line); border-radius: 8px; padding: 7px 9px; font-size: 12.5px; background: var(--surface); color: var(--ink-muted); font-style: italic; }
      .icon-btn.calc-active { color: var(--brand); background: var(--green-soft); border-radius: 8px; }
      .planting-calc { background: var(--surface-2); border: 1px dashed var(--line); border-radius: 12px; padding: 10px 12px; margin-top: 4px; }
      .planting-calc.compact { padding: 8px 10px; }
      .planting-calc-head { font-size: 12px; font-weight: 700; color: var(--brand-dark); display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
      .planting-calc-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 4px; }
      .planting-calc-row input { width: 90px; border: 1px solid var(--line); border-radius: 8px; padding: 7px 9px; font-family: 'JetBrains Mono', monospace; background: var(--surface); }
      .chip-btn-group { display: flex; gap: 6px; flex-wrap: wrap; }
      .planting-calc-result { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; font-size: 12.5px; font-weight: 600; color: var(--ink); margin-top: 4px; }
      .planting-calc-apply { display: flex; gap: 6px; }
      .planting-calc-pick { display: flex; align-items: center; gap: 6px; }
      .chip-btn.tiny { padding: 4px 9px; font-size: 11px; }
      .qty-pick-input { width: 54px; border: 1px solid var(--line); border-radius: 8px; padding: 6px 4px; text-align: center; font-family: 'JetBrains Mono', monospace; background: var(--surface); }
      .calc-note { margin: 4px 0 0; }
      .order-item-subtotal { text-align: right; font-size: 11.5px; color: var(--ink-muted); font-family: 'JetBrains Mono', monospace; }
      .order-total { text-align: right; font-size: 14px; padding-top: 4px; }
      .form-actions { display: flex; gap: 8px; margin-top: 6px; }
      .form-actions .secondary-btn, .form-actions .primary-btn { flex: 1; }
      .order-list { display: flex; flex-direction: column; gap: 8px; margin-top: 14px; }
      .order-card { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; overflow: hidden; }
      .order-card-head { width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 11px 13px; background: none; border: none; cursor: pointer; text-align: left; }
      .order-card-head.static { cursor: default; }
      .order-client { font-weight: 600; font-size: 14px; }
      .order-date { font-size: 11.5px; color: var(--ink-muted); }
      .order-card-right { text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 3px; }
      .order-sum { display: block; font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 600; }
      .order-sum.neg { color: var(--rust); }
      .year-switcher { display: flex; align-items: center; justify-content: center; gap: 14px; margin-bottom: 12px; }
      .year-label { font-family: 'Fraunces', serif; font-weight: 700; font-size: 18px; color: var(--brand-dark); min-width: 52px; text-align: center; }
      .stat-box.stat-pos { background: var(--green-soft); border-color: var(--brand); }
      .stat-box.stat-pos .stat-value { color: var(--brand-dark); display: flex; align-items: center; gap: 4px; }
      .stat-box.stat-neg { background: var(--rust-soft); border-color: var(--rust); }
      .stat-box.stat-neg .stat-value { color: var(--rust); display: flex; align-items: center; gap: 4px; }
      .status-badge { font-size: 10px; padding: 2px 8px; border-radius: 999px; font-weight: 600; display: inline-block; }
      .status-badge.new { background: var(--gold-soft); color: #7A5A16; }
      .status-badge.ok { background: var(--green-soft); color: var(--brand-dark); }
      .order-card-body { border-top: 1px solid var(--line); padding: 10px 13px 13px; display: flex; flex-direction: column; gap: 6px; }
      .order-line { display: flex; justify-content: space-between; font-size: 12.5px; color: var(--ink-muted); gap: 8px; }
      .report-total { font-weight: 700; color: var(--ink); border-top: 1px dashed var(--line); padding-top: 6px; margin-top: 2px; }
      .order-card-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 6px; }
      .confirm-box { display: flex; flex-direction: column; gap: 6px; background: var(--surface-2); border: 1px solid var(--line); border-radius: 10px; padding: 8px 10px; font-size: 12.5px; width: 100%; }
      .confirm-actions { display: flex; gap: 6px; flex-wrap: wrap; }
      .bottom-nav { position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 480px; display: flex; background: var(--surface); border-top: 1px solid var(--line); padding: 6px 2px calc(6px + env(safe-area-inset-bottom, 0px)); z-index: 20; }
      .nav-btn { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; background: none; border: none; padding: 6px 0; color: var(--ink-muted); cursor: pointer; }
      .nav-btn span { font-size: 9.5px; font-weight: 500; }
      .nav-btn.active { color: var(--brand-dark); background: var(--green-soft); border-radius: 12px; }
      .nav-btn.active span { font-weight: 700; }
      .toast { position: fixed; bottom: 92px; left: 50%; transform: translateX(-50%); background: var(--rust); color: white; padding: 9px 14px; border-radius: 10px; font-size: 12.5px; display: flex; align-items: center; gap: 6px; max-width: 90%; z-index: 30; box-shadow: 0 4px 14px rgba(0,0,0,0.18); }
      .toast.success { background: var(--brand); }
      .print-area { display: none; }
      .label-preview-card {
        border: 1px dashed #999; border-radius: 8px; padding: 12px 14px; background: var(--surface);
        max-width: 220px; font-family: 'Inter', sans-serif;
      }
      .lp-name { font-family: 'Fraunces', serif; font-weight: 700; font-size: 15px; color: #1F331C; }
      .lp-variety { font-style: italic; font-size: 12px; color: #333; margin-bottom: 6px; }
      .lp-row { font-size: 10.5px; margin-top: 3px; color: #222; }
      @media print { .label-preview-section { display: none !important; } }
      @media print {
        .app-header, .bottom-nav, .toast, .tab-pad > *:not(.print-area) { display: none !important; }
        .app-content { padding-bottom: 0; }
        .print-area { display: block; }
        .print-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
        .print-label { border: 1px dashed #999; padding: 10px 12px; min-height: 3.4cm; break-inside: avoid; font-family: 'Inter', sans-serif; }
        .pl-name { font-family: 'Fraunces', serif; font-weight: 700; font-size: 13px; color: #1F331C; }
        .pl-variety { font-style: italic; font-size: 10.5px; color: #333; margin-bottom: 4px; }
        .pl-row { font-size: 8.5px; margin-top: 2px; color: #222; }

        /* Drukarka termiczna (etykiety pojedyncze, rozmiar z ustawień) — patrz FUNKCJA DODATKOWA w EtykietyTab.jsx */
        .print-area.thermal .print-grid { grid-template-columns: 1fr; }
        .print-area.thermal .print-label { border: none; min-height: 0; padding: 2mm; page: thermal; break-after: page; }
        .print-area.thermal .pl-name { font-size: 9px; }
        .print-area.thermal .pl-variety { font-size: 7.5px; margin-bottom: 2px; }
        .print-area.thermal .pl-row { font-size: 6.5px; margin-top: 1px; }

        /* Paszport roślin UE (Rozporządzenie 2016/2031 / 2017/2313) — pola A/B/C/D */
        .passport-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px; }
        .passport-flag { background: #003399; color: #FFCC00; font-weight: 700; font-size: 7px; padding: 1px 4px; border-radius: 2px; letter-spacing: 0.5px; }
        .passport-title { font-size: 7px; font-weight: 700; text-align: right; }
        .passport-row { font-size: 8px; margin-top: 1.5px; }
        .passport-letter { font-weight: 700; margin-right: 3px; }
      }
    `}</style>
  );
}
