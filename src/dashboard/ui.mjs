/**
 * Mission Control web UI renderer.
 * Designed with ui-craft (Command operator recipe), antislop-ui, and make-interfaces-feel-better:
 * - Zero purple gradients, zero emojis, matte graphite/light neutral surfaces
 * - Crisp serif headings + system sans body + tabular-nums metrics
 * - Action-first Home layout ("For you" NEXT spotlight + "ShipLaunchpad will do" + Status rail)
 * - Slide-over step-by-step fix drawer with numbered vertical timeline, click-path breadcrumbs,
 *   inline decisions, local vault storage, and one-click safe generators.
 */

export function renderDashboardHtml() {
  return `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Mission Control — ShipLaunchpad</title>
<style>
  :root {
    --bg: #0f1115;
    --sidebar: #13151a;
    --surface: #161920;
    --surface-2: #1c2029;
    --surface-next: #17202e;
    --border: rgba(255, 255, 255, 0.08);
    --border-strong: rgba(255, 255, 255, 0.15);
    --text: #f3f4f6;
    --text-2: #9ca3af;
    --text-3: #6b7280;
    --accent: #4c8bf5;
    --accent-hover: #3b7be6;
    --accent-soft: rgba(76, 139, 245, 0.13);
    --accent-fg: #ffffff;
    --ok: #2fb370;
    --ok-soft: rgba(47, 179, 112, 0.14);
    --warn: #d89b28;
    --warn-soft: rgba(216, 155, 40, 0.14);
    --danger: #e05d52;
    --danger-soft: rgba(224, 93, 82, 0.16);
    --danger-fg: #ffd6d2;
    --shadow-drawer: -12px 0 40px rgba(0, 0, 0, 0.45);
    --shadow-modal: 0 24px 60px rgba(0, 0, 0, 0.55);
    --font-serif: Georgia, 'Iowan Old Style', 'Palatino Linotype', serif;
    --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  [data-theme="light"] {
    --bg: #f6f7f9;
    --sidebar: #eef0f4;
    --surface: #ffffff;
    --surface-2: #f4f6f9;
    --surface-next: #edf4ff;
    --border: rgba(15, 23, 42, 0.09);
    --border-strong: rgba(15, 23, 42, 0.17);
    --text: #111827;
    --text-2: #4b5563;
    --text-3: #6b7280;
    --accent: #2563eb;
    --accent-hover: #1d4ed8;
    --accent-soft: rgba(37, 99, 235, 0.10);
    --accent-fg: #ffffff;
    --ok: #16804b;
    --ok-soft: rgba(22, 128, 75, 0.11);
    --warn: #b4690e;
    --warn-soft: rgba(180, 105, 14, 0.12);
    --danger: #c93b32;
    --danger-soft: rgba(201, 59, 50, 0.12);
    --danger-fg: #991b1b;
    --shadow-drawer: -12px 0 36px rgba(15, 23, 42, 0.12);
    --shadow-modal: 0 24px 60px rgba(15, 23, 42, 0.18);
  }

  * { box-sizing: border-box; }
  html {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    font-family: var(--font-sans);
    background: var(--bg);
    color: var(--text);
  }
  body { margin: 0; font-size: 14px; line-height: 1.5; background: var(--bg); color: var(--text); }
  button, input { font-family: inherit; color: inherit; }
  button { cursor: pointer; }
  a { color: var(--accent); text-decoration: none; }
  a:hover { text-decoration: underline; }
  :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .num { font-variant-numeric: tabular-nums; }
  h1, h2, h3 { text-wrap: balance; margin: 0; font-weight: 500; }
  p { text-wrap: pretty; }

  /* ── App Shell ── */
  .shell { display: grid; grid-template-columns: 244px 1fr; min-height: 100vh; }

  /* ── Sidebar ── */
  aside.sidebar {
    background: var(--sidebar);
    border-right: 1px solid var(--border);
    padding: 18px 14px 14px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    position: sticky;
    top: 0;
    height: 100vh;
    overflow-y: auto;
  }
  .brand { display: flex; align-items: center; gap: 10px; padding: 2px 6px; }
  .brand-mark {
    width: 30px; height: 30px; border-radius: 8px;
    background: var(--text); color: var(--bg);
    display: grid; place-items: center; flex-shrink: 0;
  }
  .brand-title { font-family: var(--font-serif); font-size: 16px; letter-spacing: -0.01em; line-height: 1.15; }
  .brand-sub { font-size: 11px; color: var(--text-3); }

  .jump-btn {
    display: flex; align-items: center; justify-content: space-between;
    width: 100%; height: 36px; padding: 0 10px;
    background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
    color: var(--text-2); font-size: 13px;
    transition-property: border-color, background-color; transition-duration: 140ms;
  }
  .jump-btn:hover { border-color: var(--border-strong); color: var(--text); }
  .jump-btn .left { display: flex; align-items: center; gap: 8px; }
  .kbd {
    font-family: var(--font-mono); font-size: 11px; color: var(--text-3);
    border: 1px solid var(--border); border-radius: 5px; padding: 1px 5px;
  }

  .nav-group { display: flex; flex-direction: column; gap: 2px; }
  .nav-item {
    display: flex; align-items: center; justify-content: space-between;
    width: 100%; min-height: 36px; padding: 7px 10px;
    background: transparent; border: 0; border-radius: 8px;
    color: var(--text-2); font-size: 13.5px; text-align: left;
    transition-property: background-color, color; transition-duration: 140ms;
  }
  .nav-item:hover { background: var(--surface-2); color: var(--text); }
  .nav-item.active { background: var(--accent-soft); color: var(--accent); font-weight: 500; }
  .nav-item .left { display: flex; align-items: center; gap: 9px; }
  .nav-badge {
    font-size: 11.5px; font-weight: 600; font-variant-numeric: tabular-nums;
    padding: 1px 7px; border-radius: 999px;
    background: var(--accent); color: var(--accent-fg);
  }

  .section-label {
    font-size: 11px; font-weight: 600; letter-spacing: 0.04em;
    color: var(--text-3); padding: 0 8px; margin-bottom: 4px;
    display: flex; justify-content: space-between; align-items: center;
  }
  .apps-list { display: flex; flex-direction: column; gap: 4px; }
  .app-item {
    display: flex; align-items: center; gap: 10px;
    width: 100%; padding: 8px 10px; border-radius: 10px;
    border: 1px solid transparent; background: transparent; text-align: left;
    transition-property: background-color, border-color; transition-duration: 140ms;
  }
  .app-item:hover { background: var(--surface-2); }
  .app-item.active { background: var(--surface); border-color: var(--border-strong); }
  .app-avatar {
    width: 26px; height: 26px; border-radius: 6px;
    background: var(--surface-2); border: 1px solid var(--border);
    color: var(--text); font-size: 12px; font-weight: 600;
    display: grid; place-items: center; flex-shrink: 0;
  }
  .app-meta { flex: 1; min-width: 0; }
  .app-name { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .app-sub { font-size: 11.5px; color: var(--text-3); }
  .mini-seg { display: flex; gap: 2px; height: 3px; margin-top: 5px; border-radius: 999px; overflow: hidden; background: var(--border); }
  .mini-seg span { height: 100%; }

  .sidebar-footer {
    margin-top: auto; padding-top: 12px; border-top: 1px solid var(--border);
    display: flex; flex-direction: column; gap: 8px;
  }
  .local-note { font-size: 11.5px; color: var(--text-3); padding: 0 6px; display: flex; align-items: center; gap: 6px; }
  .dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; flex-shrink: 0; }
  .dot-ok { background: var(--ok); }
  .dot-warn { background: var(--warn); }
  .dot-danger { background: var(--danger); }
  .dot-muted { background: var(--text-3); }
  .theme-toggle {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 3px;
    padding: 3px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
  }
  .theme-btn {
    border: 0; background: transparent; color: var(--text-2); font-size: 12px;
    padding: 5px 6px; border-radius: 6px;
    transition-property: background-color, color; transition-duration: 140ms;
  }
  .theme-btn.active { background: var(--surface-2); color: var(--text); font-weight: 500; }

  /* ── Main Content ── */
  main.content { padding: 24px 32px 48px; min-width: 0; }
  .topbar {
    display: flex; justify-content: space-between; align-items: flex-end; gap: 16px;
    margin-bottom: 18px;
  }
  .page-title { font-family: var(--font-serif); font-size: 26px; letter-spacing: -0.02em; line-height: 1.15; }
  .page-sub { color: var(--text-2); font-size: 13px; margin-top: 3px; }
  .top-actions { display: flex; gap: 8px; flex-wrap: wrap; }

  /* ── Segmented Launch-Pad Bar ── */
  .pad-bar-wrap { margin-bottom: 24px; }
  .seg-bar {
    display: flex; gap: 3px; height: 10px; border-radius: 999px;
    overflow: hidden; background: var(--surface-2); padding: 1px;
    border: 1px solid var(--border);
  }
  .seg-done { background: var(--ok); border-radius: 999px; }
  .seg-you { background: var(--warn); border-radius: 999px; }
  .seg-auto { background: #64748b; border-radius: 999px; }
  .seg-block { background: var(--danger); border-radius: 999px; }
  .seg-labels {
    display: flex; justify-content: space-between; font-size: 11.5px; color: var(--text-3);
    margin-top: 6px;
  }
  .seg-legend {
    display: flex; flex-wrap: wrap; gap: 14px; margin-top: 8px;
    font-size: 12.5px; color: var(--text-2);
  }
  .legend-item { display: inline-flex; align-items: center; gap: 6px; }
  .swatch { width: 8px; height: 8px; border-radius: 2px; display: inline-block; }

  /* ── Home 2-Col Grid ── */
  .home-grid { display: grid; grid-template-columns: minmax(0, 1fr) 310px; gap: 28px; align-items: start; }
  .col-heading {
    font-family: var(--font-serif); font-size: 21px; letter-spacing: -0.01em;
    display: flex; align-items: center; gap: 10px; margin-bottom: 16px;
  }
  .count-chip {
    font-family: var(--font-sans); font-size: 12px; font-weight: 500;
    color: var(--text-2); background: var(--surface-2); border: 1px solid var(--border);
    border-radius: 999px; padding: 1px 8px;
  }

  .group-head {
    display: flex; justify-content: space-between; align-items: baseline; gap: 12px;
    margin: 20px 0 10px;
  }
  .group-head:first-of-type { margin-top: 0; }
  .group-title { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; }
  .group-hint { font-size: 12.5px; color: var(--text-3); }

  /* ── Cards & Action Rows ── */
  .panel {
    background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
    overflow: hidden;
  }
  .next-card {
    background: var(--surface-next);
    border-bottom: 1px solid var(--border);
    border-left: 3px solid var(--accent);
    padding: 16px 18px;
    display: flex; justify-content: space-between; align-items: center; gap: 16px;
    cursor: pointer;
    transition-property: background-color; transition-duration: 140ms;
  }
  .next-card.is-blocking { border-left-color: var(--danger); }
  .next-card:hover { filter: brightness(1.04); }
  .next-tag {
    font-size: 11px; font-weight: 700; letter-spacing: 0.06em; color: var(--accent);
    margin-right: 6px;
  }
  .next-card.is-blocking .next-tag { color: var(--danger); }
  .row-title { font-size: 14.5px; font-weight: 600; color: var(--text); }
  .row-desc { font-size: 13px; color: var(--text-2); margin-top: 3px; }
  .pill-row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 8px; }
  .tag {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 11.5px; font-weight: 500; padding: 2px 8px; border-radius: 6px;
    border: 1px solid var(--border); background: var(--surface-2); color: var(--text-2);
  }
  .tag-warn { background: var(--warn-soft); color: var(--warn); border-color: transparent; }
  .tag-danger { background: var(--danger); color: #fff; border-color: transparent; font-weight: 600; }
  .tag-ok { background: var(--ok-soft); color: var(--ok); border-color: transparent; }
  .tag-accent { background: var(--accent-soft); color: var(--accent); border-color: transparent; }
  .tag-plain { background: transparent; border-color: transparent; color: var(--text-3); padding-left: 2px; }

  .divider-label {
    font-size: 11.5px; color: var(--text-3); padding: 8px 18px 6px;
    background: var(--surface); border-bottom: 1px solid var(--border);
  }
  .task-row {
    display: flex; justify-content: space-between; align-items: center; gap: 14px;
    padding: 13px 18px; border-bottom: 1px solid var(--border);
    background: var(--surface); cursor: pointer;
    border-left: 3px solid transparent;
    transition-property: background-color; transition-duration: 130ms;
  }
  .task-row:last-child { border-bottom: 0; }
  .task-row:hover { background: var(--surface-2); }
  .task-row.is-blocking { border-left-color: var(--danger); }
  .task-main { display: flex; align-items: flex-start; gap: 12px; min-width: 0; flex: 1; }
  .task-icon {
    width: 28px; height: 28px; border-radius: 7px;
    background: var(--surface-2); border: 1px solid var(--border);
    display: grid; place-items: center; color: var(--text-2); flex-shrink: 0; margin-top: 1px;
  }
  .expand-row {
    width: 100%; border: 0; background: var(--surface); color: var(--text-2);
    padding: 10px 16px; font-size: 12.5px; text-align: center;
    border-top: 1px solid var(--border);
    transition-property: background-color, color; transition-duration: 130ms;
  }
  .expand-row:hover { background: var(--surface-2); color: var(--text); }

  /* ── Buttons ── */
  .btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    min-height: 34px; padding: 6px 13px; border-radius: 8px;
    font-size: 13px; font-weight: 500; border: 1px solid var(--border-strong);
    background: var(--surface-2); color: var(--text); white-space: nowrap;
    transition-property: transform, background-color, border-color; transition-duration: 140ms;
  }
  .btn:hover { border-color: var(--text-3); }
  .btn:active { transform: scale(0.98); }
  .btn-primary {
    background: var(--accent); color: var(--accent-fg); border-color: transparent;
  }
  .btn-primary:hover { background: var(--accent-hover); border-color: transparent; }
  .btn-ghost { background: transparent; border-color: var(--border); color: var(--text-2); }
  .btn-ghost:hover { background: var(--surface-2); color: var(--text); }
  .btn-sm { min-height: 30px; padding: 4px 10px; font-size: 12.5px; border-radius: 7px; }
  .btn-icon { width: 38px; height: 38px; padding: 0; border-radius: 9px; }

  /* ── Status Right Rail ── */
  .status-card {
    background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
    padding: 16px 18px; display: flex; flex-direction: column; gap: 16px;
  }
  .status-sec-head {
    display: flex; justify-content: space-between; align-items: center;
    font-size: 12px; font-weight: 600; color: var(--text-3); margin-bottom: 8px;
  }
  .status-divider { height: 1px; background: var(--border); }
  .status-line {
    display: flex; justify-content: space-between; align-items: center; gap: 10px;
    padding: 5px 0; font-size: 13px;
  }
  .status-left { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .status-right { font-size: 12px; color: var(--text-3); white-space: nowrap; }

  /* ── Filter Bar & Category Grid (All Checks / Costs) ── */
  .filter-bar { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-bottom: 16px; }
  .filter-btn {
    border: 1px solid var(--border); background: transparent; color: var(--text-2);
    padding: 6px 12px; border-radius: 8px; font-size: 12.5px;
    transition-property: background-color, color, border-color; transition-duration: 130ms;
  }
  .filter-btn:hover { background: var(--surface-2); color: var(--text); }
  .filter-btn.active { background: var(--accent-soft); color: var(--accent); border-color: transparent; font-weight: 500; }

  .cat-block { margin-bottom: 20px; }
  .cat-header {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 8px; padding: 0 2px;
  }
  .cat-title { font-size: 14px; font-weight: 600; }
  .cat-stat { font-size: 12.5px; color: var(--text-3); }

  .cost-hero-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-bottom: 20px; }
  .metric-card {
    background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 16px 18px;
  }
  .metric-card.primary { background: var(--surface-next); border-color: var(--border-strong); }
  .metric-label { font-size: 12px; color: var(--text-2); }
  .metric-val { font-family: var(--font-serif); font-size: 32px; line-height: 1.15; margin-top: 4px; }
  .metric-note { font-size: 12px; color: var(--text-3); margin-top: 4px; }

  .toggle-strip {
    display: flex; flex-wrap: wrap; gap: 16px; align-items: center;
    background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
    padding: 14px 18px; margin-bottom: 18px;
  }
  .toggle-group { display: flex; align-items: center; gap: 10px; font-size: 13px; }
  .seg-ctrl { display: inline-flex; padding: 2px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 8px; }
  .seg-ctrl button { border: 0; background: transparent; padding: 4px 11px; border-radius: 6px; font-size: 12.5px; color: var(--text-2); }
  .seg-ctrl button.active { background: var(--surface); color: var(--text); font-weight: 500; box-shadow: 0 1px 2px rgba(0,0,0,0.2); }

  /* ── Slide-Over Step-by-Step Fix Drawer ── */
  .drawer-backdrop {
    position: fixed; inset: 0; background: rgba(0, 0, 0, 0.55);
    opacity: 0; pointer-events: none; z-index: 40;
    transition-property: opacity; transition-duration: 180ms;
  }
  .drawer-backdrop.open { opacity: 1; pointer-events: auto; }
  .drawer {
    position: fixed; top: 0; right: 0; bottom: 0; width: min(500px, 100vw);
    background: var(--surface); border-left: 1px solid var(--border-strong);
    box-shadow: var(--shadow-drawer); z-index: 50;
    display: flex; flex-direction: column;
    transform: translateX(100%);
    transition-property: transform; transition-duration: 210ms; transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
  }
  .drawer.open { transform: translateX(0); }
  .drawer-header {
    padding: 20px 22px 16px; border-bottom: 1px solid var(--border);
    display: flex; align-items: flex-start; justify-content: space-between; gap: 14px;
  }
  .drawer-title-wrap { display: flex; align-items: flex-start; gap: 12px; }
  .drawer-title { font-family: var(--font-serif); font-size: 22px; line-height: 1.25; letter-spacing: -0.01em; }
  .drawer-body {
    flex: 1; overflow-y: auto; padding: 18px 22px 28px;
    display: flex; flex-direction: column; gap: 18px;
  }
  .drawer-summary { font-size: 14px; color: var(--text); line-height: 1.55; margin: 0; }
  .drawer-reason {
    padding: 10px 12px; border-radius: 8px; font-size: 13px;
    background: var(--danger-soft); color: var(--danger-fg); border: 1px solid rgba(224, 93, 82, 0.3);
  }
  [data-theme="light"] .drawer-reason { color: #991b1b; }

  .timeline-head {
    display: flex; align-items: center; gap: 7px;
    font-size: 12.5px; font-weight: 600; color: var(--text-2); margin-bottom: 12px;
  }
  .timeline { display: flex; flex-direction: column; position: relative; }
  .tl-step {
    display: grid; grid-template-columns: 30px 1fr; gap: 12px;
    padding-bottom: 18px; position: relative;
  }
  .tl-step:last-child { padding-bottom: 0; }
  .tl-step:not(:last-child)::before {
    content: ''; position: absolute; left: 13px; top: 30px; bottom: 4px;
    width: 1px; background: var(--border-strong);
  }
  .tl-num {
    width: 26px; height: 26px; border-radius: 50%;
    border: 1.5px solid var(--warn); color: var(--warn);
    font-size: 12px; font-weight: 600; font-variant-numeric: tabular-nums;
    display: grid; place-items: center; background: var(--surface); position: relative; z-index: 1;
  }
  .tl-num.auto { border-color: var(--accent); color: var(--accent); }
  .tl-title { font-size: 14px; font-weight: 500; color: var(--text); padding-top: 2px; }
  .tl-detail { font-size: 13px; color: var(--text-2); margin-top: 4px; line-height: 1.5; }

  .crumb-box {
    margin-top: 10px; padding: 10px 12px; border-radius: 10px;
    background: var(--bg); border: 1px solid var(--border);
    display: flex; flex-wrap: wrap; align-items: center; gap: 6px;
  }
  .crumb-pill {
    font-size: 12px; padding: 4px 9px; border-radius: 6px;
    background: var(--surface-2); border: 1px solid var(--border); color: var(--text);
  }
  .crumb-pill.last { border-color: var(--accent); background: var(--accent-soft); color: var(--text); font-weight: 500; }
  .crumb-sep { color: var(--text-3); font-size: 12px; }

  .cmd-box {
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    margin-top: 8px; padding: 9px 11px; border-radius: 8px;
    background: var(--bg); border: 1px solid var(--border);
    font-family: var(--font-mono); font-size: 12px; color: var(--text);
  }
  .cmd-box code { overflow-x: auto; white-space: nowrap; }
  .inline-code {
    font-family: var(--font-mono); font-size: 12px;
    padding: 1px 5px; border-radius: 5px;
    background: var(--surface-2); border: 1px solid var(--border);
    color: var(--text); word-break: break-word;
  }

  .box-card {
    background: var(--bg); border: 1px solid var(--border); border-radius: 10px; padding: 14px;
    display: flex; flex-direction: column; gap: 10px;
  }
  .input-row { display: flex; gap: 8px; }
  .text-input {
    flex: 1; height: 36px; padding: 0 11px; border-radius: 8px;
    border: 1px solid var(--border-strong); background: var(--surface); color: var(--text);
    font-size: 13px;
  }
  .drawer-footer {
    padding: 14px 22px; border-top: 1px solid var(--border);
    background: var(--surface); display: flex; justify-content: space-between; align-items: center; gap: 10px;
  }
  .footer-left { display: flex; gap: 8px; align-items: center; }

  /* ── Command Palette (⌘K) ── */
  .modal-backdrop {
    position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6);
    display: none; place-items: start center; padding-top: 12vh; z-index: 60;
  }
  .modal-backdrop.open { display: grid; }
  .palette {
    width: min(560px, 92vw); background: var(--surface); border: 1px solid var(--border-strong);
    border-radius: 14px; box-shadow: var(--shadow-modal); overflow: hidden;
  }
  .palette input {
    width: 100%; height: 48px; border: 0; border-bottom: 1px solid var(--border);
    padding: 0 16px; background: transparent; font-size: 14.5px; color: var(--text);
  }
  .palette input:focus { outline: none; }
  .palette-list { max-height: 360px; overflow-y: auto; padding: 6px; }
  .pal-row {
    width: 100%; display: flex; justify-content: space-between; align-items: center;
    padding: 9px 12px; border: 0; background: transparent; border-radius: 8px; text-align: left;
    font-size: 13px; color: var(--text);
  }
  .pal-row:hover { background: var(--surface-2); }

  .toast {
    position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%) translateY(16px);
    background: var(--text); color: var(--bg); padding: 9px 16px; border-radius: 8px;
    font-size: 13px; font-weight: 500; opacity: 0; pointer-events: none; z-index: 80;
    transition-property: opacity, transform; transition-duration: 180ms;
  }
  .toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { transition-duration: 0.01ms !important; }
  }
  @media (max-width: 1060px) {
    .home-grid { grid-template-columns: 1fr; }
    .cost-hero-grid { grid-template-columns: 1fr; }
  }
  @media (max-width: 780px) {
    .shell { grid-template-columns: 1fr; }
    aside.sidebar { height: auto; position: static; border-right: 0; border-bottom: 1px solid var(--border); }
    main.content { padding: 18px 16px 40px; }
  }
</style>
</head>
<body>
<div class="shell">
  <aside class="sidebar">
    <div class="brand">
      <div class="brand-mark" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/></svg>
      </div>
      <div>
        <div class="brand-title">Mission Control</div>
        <div class="brand-sub">shiplaunchpad</div>
      </div>
    </div>

    <button class="jump-btn" id="jump-open" type="button">
      <span class="left">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        Jump to...
      </span>
      <span class="kbd">⌘K</span>
    </button>

    <nav class="nav-group" aria-label="Primary">
      <button class="nav-item active" data-view="home" type="button">
        <span class="left">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
          Home
        </span>
        <span class="nav-badge num" id="nav-remaining">0</span>
      </button>
      <button class="nav-item" data-view="costs" type="button">
        <span class="left">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><path d="M14.5 9.5c-.5-1-1.5-1.5-2.5-1.5-1.5 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1 2-2.5 2c-1.2 0-2.1-.6-2.5-1.5M12 6.5v11"/></svg>
          Costs
        </span>
      </button>
      <button class="nav-item" data-view="checks" type="button">
        <span class="left">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
          All checks
        </span>
      </button>
    </nav>

    <div>
      <div class="section-label"><span>Apps</span><span class="num" id="apps-count">0</span></div>
      <div class="apps-list" id="apps-list"></div>
    </div>

    <div class="sidebar-footer">
      <div class="local-note"><span class="dot dot-ok"></span>Local only · 127.0.0.1</div>
      <div class="theme-toggle" role="group" aria-label="Theme">
        <button class="theme-btn" data-theme-set="auto" type="button">Auto</button>
        <button class="theme-btn" data-theme-set="dark" type="button">Dark</button>
        <button class="theme-btn" data-theme-set="light" type="button">Light</button>
      </div>
    </div>
  </aside>

  <main class="content" id="main-content">
    <p class="page-sub">Loading Mission Control...</p>
  </main>
</div>

<div class="drawer-backdrop" id="drawer-backdrop"></div>
<aside class="drawer" id="drawer" aria-hidden="true"></aside>

<div class="modal-backdrop" id="palette-backdrop">
  <div class="palette" role="dialog" aria-label="Quick Jump">
    <input id="palette-input" type="text" placeholder="Jump to a check, guide, view, or project..." autocomplete="off">
    <div class="palette-list" id="palette-list"></div>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
const STATE = {
  projects: [],
  activeRoot: null,
  view: 'home',
  filter: 'all',
  expandedForYou: false,
  expandedAuto: false,
  expandedDone: false,
  drawerItemId: null,
  drawerMode: null, // 'item' | 'report'
};

const ICONS = {
  hand: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 11V6a2 2 0 0 0-4 0"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>',
  bolt: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
  decision: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3"/><path d="m15 9 6-6"/></svg>',
  ext: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>',
  copy: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  close: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  layers: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
  check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
  web: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z"/></svg>',
  stores: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/></svg>',
  security: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  monitoring: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
  legal: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
  payments: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>',
  build: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
  dashboard: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>',
};

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtInline(s) {
  return esc(s).replace(/\`([^\`]+)\`/g, '<code class="inline-code">$1</code>');
}

function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

async function copyText(txt, label = 'Copied to clipboard') {
  try {
    await navigator.clipboard.writeText(txt);
    showToast(label);
  } catch {
    showToast('Copy failed — select and copy manually');
  }
}

function applyTheme(pref) {
  localStorage.setItem('slp-theme', pref);
  const resolved = pref === 'auto'
    ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    : pref;
  document.documentElement.setAttribute('data-theme', resolved);
  document.querySelectorAll('[data-theme-set]').forEach(b => {
    b.classList.toggle('active', b.dataset.themeSet === pref);
  });
}

function activeProject() {
  return STATE.projects.find(p => p.root === STATE.activeRoot) || STATE.projects[0] || null;
}

async function refresh() {
  const res = await fetch('/api/projects');
  const data = await res.json();
  STATE.projects = data.projects || [];
  if (!STATE.activeRoot && STATE.projects.length) STATE.activeRoot = STATE.projects[0].root;
  renderAll();
  if (STATE.drawerMode === 'item' && STATE.drawerItemId) renderItemDrawer(STATE.drawerItemId);
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function sortQueue(items) {
  return [...items].sort((a, b) => {
    if (a.blocksRelease !== b.blocksRelease) return a.blocksRelease ? -1 : 1;
    if ((a.status === 'fail') !== (b.status === 'fail')) return a.status === 'fail' ? -1 : 1;
    const ownerRank = o => o === 'you' ? 0 : o === 'decision' ? 1 : 2;
    return ownerRank(a.guide?.owner) - ownerRank(b.guide?.owner);
  });
}

function secretProgress(item, project) {
  const req = item.guide?.requiredSecrets || [];
  if (!req.length) return null;
  const storedSet = new Set((project.vaultKeys || []).map(k => k.keyName));
  const stored = req.filter(k => storedSet.has(k)).length;
  return { stored, total: req.length, storedSet, req };
}

function ownerPill(guide) {
  if (guide.owner === 'decision') return \`<span class="tag tag-accent">\${ICONS.decision} Your decision</span>\`;
  if (guide.owner === 'auto') return \`<span class="tag">\${ICONS.bolt} ShipLaunchpad, automatically</span>\`;
  return \`<span class="tag tag-warn">\${ICONS.hand} You, by hand</span>\`;
}

function renderSidebar() {
  const p = activeProject();
  document.getElementById('nav-remaining').textContent = p ? p.checklist.remainingCount : 0;
  document.getElementById('apps-count').textContent = STATE.projects.length;
  document.querySelectorAll('[data-view]').forEach(btn => {
    const active = btn.dataset.view === STATE.view;
    btn.classList.toggle('active', active);
    if (active) btn.setAttribute('aria-current', 'page');
    else btn.removeAttribute('aria-current');
  });

  const appsEl = document.getElementById('apps-list');
  if (!STATE.projects.length) {
    appsEl.innerHTML = '<div class="app-sub" style="padding:6px 8px">No apps registered yet</div>';
    return;
  }
  appsEl.innerHTML = STATE.projects.map(proj => {
    const tot = Math.max(1, proj.checklist.applicableCount);
    const s = proj.checklist.summary;
    const active = proj.root === STATE.activeRoot;
    return \`
      <button class="app-item \${active ? 'active' : ''}" type="button" onclick="selectApp('\${esc(proj.root)}')">
        <div class="app-avatar">\${esc((proj.name || '?')[0].toUpperCase())}</div>
        <div class="app-meta">
          <div class="app-name">\${esc(proj.name)}</div>
          <div class="app-sub num">\${proj.checklist.remainingCount} to do · \${proj.checklist.scorePct}%</div>
          <div class="mini-seg">
            <span style="width:\${(s.done*100/tot).toFixed(1)}%;background:var(--ok)"></span>
            <span style="width:\${(s.forYou*100/tot).toFixed(1)}%;background:var(--warn)"></span>
            <span style="width:\${(s.auto*100/tot).toFixed(1)}%;background:#64748b"></span>
          </div>
        </div>
      </button>
    \`;
  }).join('');
}

function renderHomeView(p) {
  const s = p.checklist.summary;
  const tot = Math.max(1, p.checklist.applicableCount);
  const forYou = sortQueue(p.checklist.items.filter(i => i.bucket === 'for_you'));
  const auto = sortQueue(p.checklist.items.filter(i => i.bucket === 'auto'));
  const done = p.checklist.items.filter(i => i.bucket === 'done');

  const nextItem = forYou[0] || null;
  const comingUpAll = forYou.slice(1);
  const comingUpShown = STATE.expandedForYou ? comingUpAll : comingUpAll.slice(0, 3);
  const autoShown = STATE.expandedAuto ? auto : auto.slice(0, 2);

  const nextSecret = nextItem ? secretProgress(nextItem, p) : null;

  const deploys = p.stacks.length
    ? p.stacks.map(st => \`
      <div class="status-line">
        <div class="status-left">
          <span class="dot \${st.status === 'deploys' ? 'dot-ok' : 'dot-warn'}"></span>
          <span><strong>\${esc(st.name)}</strong><br><span class="app-sub">\${esc(st.deployTarget)}</span></span>
        </div>
        <span class="status-right">\${st.status === 'deploys' ? (p.workflows.length ? 'wired' : 'ready to wire') : 'scored only'}</span>
      </div>\`).join('')
    : '<div class="app-sub">No framework detected yet.</div>';

  const hasUptime = p.workflows.some(w => /uptime/i.test(w));
  const hasCrash = p.services.some(sv => sv.id === 'sentry' || sv.id === 'firebase');
  const hasAnalytics = p.services.some(sv => sv.id === 'posthog');

  return \`
    <div class="topbar">
      <div>
        <h1 class="page-title">\${esc(p.name)}</h1>
        <div class="page-sub">\${esc(p.surfaces.join(' · ') || 'Repository')} · \${p.checklist.passedCount} of \${p.checklist.applicableCount} checks passing</div>
      </div>
      <div class="top-actions">
        <button class="btn btn-ghost btn-sm" type="button" onclick="openDoctorReport()">Doctor report</button>
        <button class="btn btn-sm" type="button" onclick="runApplyAction({})">Run auto-setup</button>
      </div>
    </div>

    <div class="pad-bar-wrap">
      <div class="seg-bar" role="img" aria-label="Launch readiness progress">
        \${s.done ? \`<div class="seg-done" style="width:\${(s.done*100/tot).toFixed(2)}%"></div>\` : ''}
        \${s.forYou ? \`<div class="seg-you" style="width:\${(s.forYou*100/tot).toFixed(2)}%"></div>\` : ''}
        \${s.auto ? \`<div class="seg-auto" style="width:\${(s.auto*100/tot).toFixed(2)}%"></div>\` : ''}
      </div>
      <div class="seg-labels"><span>on the pad</span><span class="num">\${p.checklist.scorePct}% ready</span><span>all done</span></div>
      <div class="seg-legend num">
        <span class="legend-item"><span class="swatch" style="background:var(--ok)"></span><strong>\${s.done}</strong> done</span>
        <span class="legend-item"><span class="swatch" style="background:var(--warn)"></span><strong>\${s.forYou}</strong> your turn</span>
        <span class="legend-item"><span class="swatch" style="background:#64748b"></span><strong>\${s.auto}</strong> shiplaunchpad will do</span>
        \${s.blocking ? \`<span class="legend-item"><span class="swatch" style="background:var(--danger)"></span><strong>\${s.blocking}</strong> block a release</span>\` : ''}
      </div>
    </div>

    <div class="home-grid">
      <section>
        <h2 class="col-heading">Remaining <span class="count-chip num">\${p.checklist.remainingCount}</span></h2>

        <div class="group-head">
          <div class="group-title">\${ICONS.hand} For you <span class="count-chip num">\${forYou.length}</span></div>
          <div class="group-hint">Your decisions and fixes — release blockers first.</div>
        </div>

        \${forYou.length ? \`
          <div class="panel">
            <div class="next-card \${nextItem.blocksRelease ? 'is-blocking' : ''}" onclick="openItemDrawer('\${esc(nextItem.id)}')">
              <div style="min-width:0;flex:1">
                <div class="row-title"><span class="next-tag">NEXT</span>\${esc(nextItem.title)}</div>
                <div class="row-desc">\${fmtInline(nextItem.status === 'fail' ? nextItem.reason : nextItem.why)}</div>
                <div class="pill-row">
                  \${ownerPill(nextItem.guide)}
                  \${nextItem.blocksRelease ? '<span class="tag tag-danger">Blocks release</span>' : ''}
                  \${nextItem.guide.scope === 'once' ? \`<span class="tag">\${ICONS.layers} Once for all apps</span>\` : ''}
                  \${nextSecret ? \`<span class="tag tag-plain num">\${nextSecret.stored} of \${nextSecret.total} keys stored</span>\` : ''}
                </div>
              </div>
              <button class="btn btn-primary" type="button" onclick="event.stopPropagation();openItemDrawer('\${esc(nextItem.id)}')">\${esc(nextItem.guide.ctaLabel)}</button>
            </div>

            \${comingUpShown.length ? '<div class="divider-label">Coming up</div>' : ''}
            \${comingUpShown.map(item => {
              const sp = secretProgress(item, p);
              return \`
                <div class="task-row \${item.blocksRelease ? 'is-blocking' : ''}" onclick="openItemDrawer('\${esc(item.id)}')">
                  <div class="task-main">
                    <div class="task-icon">\${ICONS[item.category] || ICONS.build}</div>
                    <div style="min-width:0">
                      <div class="row-title">\${esc(item.title)}</div>
                      <div class="pill-row">
                        \${ownerPill(item.guide)}
                        \${item.blocksRelease ? '<span class="tag tag-danger">Blocks release</span>' : ''}
                        \${sp ? \`<span class="tag tag-plain num">\${sp.stored}/\${sp.total} keys</span>\` : ''}
                      </div>
                    </div>
                  </div>
                  <button class="btn btn-sm" type="button" onclick="event.stopPropagation();openItemDrawer('\${esc(item.id)}')">\${esc(item.guide.ctaLabel)}</button>
                </div>\`;
            }).join('')}

            \${comingUpAll.length > 3 ? \`
              <button class="expand-row" type="button" onclick="STATE.expandedForYou=!STATE.expandedForYou;renderAll()">
                \${STATE.expandedForYou ? 'Show fewer' : '+ ' + (comingUpAll.length - 3) + ' more'}
              </button>\` : ''}
          </div>
        \` : \`
          <div class="panel" style="padding:18px;color:var(--text-2)">
            Nothing waiting on you right now.
          </div>
        \`}

        <div class="group-head">
          <div class="group-title">\${ICONS.bolt} ShipLaunchpad will do <span class="count-chip num">\${auto.length}</span></div>
          <div style="display:flex;gap:8px;align-items:center">
            <button class="btn btn-ghost btn-sm" type="button" onclick="copyText('/ship-setup', 'Copied /ship-setup prompt')">\${ICONS.copy} Copy request</button>
          </div>
        </div>

        \${auto.length ? \`
          <div class="panel">
            \${autoShown.map(item => \`
              <div class="task-row" onclick="openItemDrawer('\${esc(item.id)}')">
                <div class="task-main">
                  <div class="task-icon">\${ICONS[item.category] || ICONS.build}</div>
                  <div style="min-width:0">
                    <div class="row-title">\${esc(item.title)}</div>
                    <div class="pill-row">\${ownerPill(item.guide)}</div>
                  </div>
                </div>
                <button class="btn btn-ghost btn-sm" type="button" onclick="event.stopPropagation();openItemDrawer('\${esc(item.id)}')">Steps</button>
              </div>\`).join('')}
            \${auto.length > 2 ? \`
              <button class="expand-row" type="button" onclick="STATE.expandedAuto=!STATE.expandedAuto;renderAll()">
                \${STATE.expandedAuto ? 'Show fewer' : '+ ' + (auto.length - 2) + ' more'}
              </button>\` : ''}
          </div>
        \` : \`<div class="panel" style="padding:16px;color:var(--text-2)">All automated setup tasks are complete.</div>\`}

        <div class="group-head">
          <div class="group-title">\${ICONS.check} Done <span class="count-chip num">\${done.length}</span></div>
          <button class="btn btn-ghost btn-sm" type="button" onclick="STATE.expandedDone=!STATE.expandedDone;renderAll()">\${STATE.expandedDone ? 'Hide' : 'Show'}</button>
        </div>
        \${STATE.expandedDone ? \`
          <div class="panel">
            \${done.map(item => \`
              <div class="task-row" onclick="openItemDrawer('\${esc(item.id)}')">
                <div class="task-main">
                  <div class="task-icon" style="color:var(--ok)">\${ICONS.check}</div>
                  <div>
                    <div class="row-title" style="font-weight:500">\${esc(item.title)}</div>
                    <div class="row-desc">\${esc(item.reason)}</div>
                  </div>
                </div>
                <span class="tag tag-ok">Done</span>
              </div>\`).join('')}
          </div>\` : ''}
      </section>

      <aside>
        <h2 class="col-heading">Status</h2>
        <div class="status-card">
          <div>
            <div class="status-sec-head"><span>Live</span></div>
            <div class="status-line">
              <div class="status-left">
                <span class="dot \${p.config?.domain ? 'dot-ok' : 'dot-muted'}"></span>
                <span>\${p.config?.domain ? esc(p.config.domain) : '<span style="color:var(--text-3)">Nothing released yet</span>'}</span>
              </div>
            </div>
          </div>

          <div class="status-divider"></div>

          <div>
            <div class="status-sec-head">
              <span>Deploys</span>
              <a href="#checks" onclick="event.preventDefault();STATE.view='checks';renderAll()">Details &rarr;</a>
            </div>
            \${deploys}
          </div>

          <div class="status-divider"></div>

          <div>
            <div class="status-sec-head"><span>Health</span></div>
            <div class="status-line"><div class="status-left"><span class="dot \${hasUptime ? 'dot-ok' : 'dot-muted'}"></span>Uptime</div><span class="status-right">\${hasUptime ? 'configured' : 'not connected'}</span></div>
            <div class="status-line"><div class="status-left"><span class="dot \${hasCrash ? 'dot-ok' : 'dot-muted'}"></span>Crashes</div><span class="status-right">\${hasCrash ? 'configured' : 'not connected'}</span></div>
            <div class="status-line"><div class="status-left"><span class="dot \${hasAnalytics ? 'dot-ok' : 'dot-muted'}"></span>Analytics</div><span class="status-right">\${hasAnalytics ? 'configured' : 'not connected'}</span></div>
          </div>

          \${p.surfaces.includes('android') ? \`
            <div class="status-divider"></div>
            <div>
              <div class="status-sec-head"><span>Play 14-day closed test</span></div>
              <div class="row-desc num" style="margin-bottom:8px">
                \${p.playTest.active
                  ? \`Day \${p.playTest.daysElapsed}/14 (\${p.playTest.daysRemaining} left) · \${p.playTest.testersCount}/12 testers\`
                  : 'Not started yet (personal accounts after Nov 13, 2023).'}
              </div>
              <button class="btn btn-sm" type="button" onclick="startPlayTest()">\${p.playTest.active ? 'Restart 14d clock' : 'Start 14-day clock'}</button>
            </div>\` : ''}

          <div class="status-divider"></div>

          <div>
            <div class="status-sec-head"><span>Safety &amp; Rollback</span></div>
            <div class="status-line">
              <div class="status-left"><span class="dot \${p.audit.criticalCount ? 'dot-danger' : 'dot-ok'}"></span>Audit findings</div>
              <span class="status-right num">\${p.audit.criticalCount} critical · \${p.audit.warnCount} warn</span>
            </div>
            <div class="status-line">
              <div class="status-left"><span class="dot dot-muted"></span>Undo snapshots</div>
              <span class="status-right num">\${p.snapshotsCount} saved</span>
            </div>
            \${p.snapshotsCount ? '<button class="btn btn-ghost btn-sm" style="margin-top:8px;width:100%" type="button" onclick="runUndoAction()">Undo last apply safely</button>' : ''}
          </div>
        </div>
      </aside>
    </div>
  \`;
}

function renderCostsView(p) {
  const c = p.costs;
  const pays = Boolean(p.config?.payments === true || p.config?.payments === 'true');
  const comp = Boolean(p.config?.company === true || p.config?.company === 'true');

  return \`
    <div class="topbar">
      <div>
        <h1 class="page-title">Costs &amp; Wait Timelines</h1>
        <div class="page-sub">Official vendor fees and store approval waits for \${esc(p.name)} (\${esc(p.surfaces.join(', ') || 'none')}).</div>
      </div>
    </div>

    <div class="toggle-strip">
      <div class="toggle-group">
        <span>Will this app take payments?</span>
        <div class="seg-ctrl">
          <button class="\${pays ? 'active' : ''}" type="button" onclick="saveConfigKey('payments', true)">Yes</button>
          <button class="\${!pays ? 'active' : ''}" type="button" onclick="saveConfigKey('payments', false)">No</button>
        </div>
      </div>
      <div class="toggle-group">
        <span>Enrolling as a company (D-U-N-S)?</span>
        <div class="seg-ctrl">
          <button class="\${comp ? 'active' : ''}" type="button" onclick="saveConfigKey('company', true)">Yes</button>
          <button class="\${!comp ? 'active' : ''}" type="button" onclick="saveConfigKey('company', false)">No</button>
        </div>
      </div>
    </div>

    <div class="cost-hero-grid">
      <div class="metric-card primary">
        <div class="metric-label">Before you launch</div>
        <div class="metric-val num">$\${c.beforeLaunchTotal}</div>
        <div class="metric-note">\${c.beforeLaunchVendors.length ? esc(c.beforeLaunchVendors.join(' & ')) + ' developer fees' : 'No required platform fees'}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Repeating fees</div>
        <div class="metric-val num">\${c.recurring.length ? c.recurring.map(r => '$' + r.amount).join(' + ') : '$0'}</div>
        <div class="metric-note">\${c.recurring.length ? esc(c.recurring.map(r => '$' + r.amount + ' ' + r.cadenceLabel).join(' · ')) : 'Runs on free tiers'}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Minimum approval wait</div>
        <div class="metric-val num">\${c.minWaitDays} day\${c.minWaitDays === 1 ? '' : 's'}</div>
        <div class="metric-note">\${c.minWaitDays >= 14 ? 'Google Play 12-tester closed test' : c.minWaitDays >= 7 ? 'D-U-N-S company verification' : 'Live as soon as setup finishes'}</div>
      </div>
    </div>

    <div class="cat-block">
      <div class="cat-header"><div class="cat-title">Required &amp; triggered fees</div></div>
      <div class="panel">
        \${c.fees.length ? c.fees.map(f => \`
          <div class="task-row" onclick="window.open('\${esc(f.source)}','_blank','noopener')">
            <div>
              <div class="row-title">\${esc(f.name)}</div>
              <div class="row-desc">\${esc(f.detail)}</div>
            </div>
            <div style="text-align:right">
              <div class="row-title num">$\${f.amount} \${esc(f.cadenceLabel)}</div>
              <div class="app-sub">Official source \${ICONS.ext}</div>
            </div>
          </div>\`).join('') : '<div style="padding:16px;color:var(--text-2)">No mandatory fees for detected surfaces.</div>'}
      </div>
    </div>

    <div class="cat-block">
      <div class="cat-header"><div class="cat-title">Billed by use &amp; spend caps</div></div>
      <div class="panel">
        \${c.metered.length ? c.metered.map(m => \`
          <div class="task-row" onclick="window.open('\${esc(m.source)}','_blank','noopener')">
            <div>
              <div class="row-title">\${esc(m.name)}</div>
              <div class="row-desc">\${esc(m.detail)}</div>
            </div>
            <span class="btn btn-ghost btn-sm">Pricing \${ICONS.ext}</span>
          </div>\`).join('') : '<div style="padding:16px;color:var(--text-2)">No metered services detected in code.</div>'}
      </div>
    </div>

    \${c.waits.length ? \`
      <div class="cat-block">
        <div class="cat-header"><div class="cat-title">Waiting times</div></div>
        <div class="panel">
          \${c.waits.map(w => \`
            <div class="task-row" onclick="window.open('\${esc(w.source)}','_blank','noopener')">
              <div>
                <div class="row-title">\${esc(w.name)}</div>
                <div class="row-desc">\${esc(w.detail)}</div>
              </div>
              <span class="tag num">\${w.minDays ? w.minDays + 'd+' : 'varies'}</span>
            </div>\`).join('')}
        </div>
      </div>\` : ''}
  \`;
}

function renderChecksView(p) {
  const filters = [
    ['all', 'All applicable'],
    ['for_you', 'For you'],
    ['blocking', 'Blocks release'],
    ['auto', 'ShipLaunchpad auto'],
    ['done', 'Done'],
  ];
  const matchesFilter = i => {
    if (i.status === 'na') return false;
    if (STATE.filter === 'for_you') return i.bucket === 'for_you';
    if (STATE.filter === 'blocking') return i.blocksRelease && i.status !== 'pass';
    if (STATE.filter === 'auto') return i.bucket === 'auto';
    if (STATE.filter === 'done') return i.status === 'pass';
    return true;
  };

  return \`
    <div class="topbar">
      <div>
        <h1 class="page-title">All checks</h1>
        <div class="page-sub">50-item production checklist across 8 categories. Click any row for step-by-step fix instructions.</div>
      </div>
    </div>

    <div class="filter-bar">
      \${filters.map(([k, label]) => \`
        <button class="filter-btn \${STATE.filter === k ? 'active' : ''}" type="button" onclick="STATE.filter='\${k}';renderAll()">\${label}</button>\`).join('')}
      \${STATE.filter !== 'all' ? '<button class="filter-btn" type="button" onclick="STATE.filter=\\'all\\';renderAll()">Reset</button>' : ''}
    </div>

    \${p.checklist.byCategory.map(cat => {
      const visible = cat.items.filter(matchesFilter);
      if (!visible.length) return '';
      return \`
        <div class="cat-block">
          <div class="cat-header">
            <div class="cat-title">\${esc(cat.name)}</div>
            <div class="cat-stat num">\${cat.passed} of \${cat.applicable} done</div>
          </div>
          <div class="panel">
            \${visible.map(item => \`
              <div class="task-row \${item.blocksRelease && item.status !== 'pass' ? 'is-blocking' : ''}" onclick="openItemDrawer('\${esc(item.id)}')">
                <div class="task-main">
                  <div class="task-icon" style="\${item.status === 'pass' ? 'color:var(--ok)' : ''}">\${item.status === 'pass' ? ICONS.check : (ICONS[cat.id] || ICONS.build)}</div>
                  <div style="min-width:0">
                    <div class="row-title">\${esc(item.title)}</div>
                    <div class="row-desc">\${fmtInline(item.reason)}</div>
                  </div>
                </div>
                <div style="display:flex;gap:6px;align-items:center;flex-shrink:0">
                  \${item.status === 'pass'
                    ? '<span class="tag tag-ok">Done</span>'
                    : (item.blocksRelease ? '<span class="tag tag-danger">Blocks release</span>' : '') + \`<button class="btn btn-sm" type="button" onclick="event.stopPropagation();openItemDrawer('\${esc(item.id)}')">\${esc(item.guide.ctaLabel)}</button>\`}
                </div>
              </div>\`).join('')}
          </div>
        </div>\`;
    }).join('') || '<div class="panel" style="padding:20px;color:var(--text-2)">No checks match the selected filter.</div>'}
  \`;
}

function renderAll() {
  renderSidebar();
  const main = document.getElementById('main-content');
  const p = activeProject();
  if (!p) {
    main.innerHTML = '<div class="panel" style="padding:28px"><h1 class="page-title">No project registered</h1><p class="page-sub">Run <code>shiplaunchpad register</code> or <code>/ship-onboard</code> inside a repository to add it to Mission Control.</p></div>';
    return;
  }
  if (STATE.view === 'costs') main.innerHTML = renderCostsView(p);
  else if (STATE.view === 'checks') main.innerHTML = renderChecksView(p);
  else main.innerHTML = renderHomeView(p);
}

/* ── Slide-Over Step-by-Step Drawer ── */
function openItemDrawer(itemId) {
  STATE.drawerMode = 'item';
  STATE.drawerItemId = itemId;
  renderItemDrawer(itemId);
  document.getElementById('drawer').classList.add('open');
  document.getElementById('drawer').setAttribute('aria-hidden', 'false');
  document.getElementById('drawer-backdrop').classList.add('open');
}

function closeDrawer() {
  STATE.drawerMode = null;
  STATE.drawerItemId = null;
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('drawer').setAttribute('aria-hidden', 'true');
  document.getElementById('drawer-backdrop').classList.remove('open');
}

function renderItemDrawer(itemId) {
  const p = activeProject();
  if (!p) return;
  const item = p.checklist.items.find(i => i.id === itemId);
  if (!item) return;
  const g = item.guide;
  const sp = secretProgress(item, p);
  const drawer = document.getElementById('drawer');

  const crumbsHtml = g.consolePath ? \`
    <div class="crumb-box">
      \${g.consolePath.map((seg, idx) => \`
        <span class="crumb-pill \${idx === g.consolePath.length - 1 ? 'last' : ''}">\${esc(seg)}</span>
        \${idx < g.consolePath.length - 1 ? '<span class="crumb-sep">&rsaquo;</span>' : ''}
      \`).join('')}
    </div>
    \${g.consoleUrl ? \`<div style="margin-top:8px"><a class="btn btn-sm" href="\${esc(g.consoleUrl)}" target="_blank" rel="noopener">\${ICONS.ext} Open</a></div>\` : ''}
  \` : '';

  const decisionHtml = g.decision ? \`
    <div class="box-card">
      <div style="font-weight:600;font-size:13.5px">\${esc(g.decision.label)}</div>
      \${g.decision.type === 'boolean' ? \`
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn \${p.config?.[g.decision.key] === true || p.config?.[g.decision.key] === 'true' ? 'btn-primary' : ''}" type="button" onclick="saveConfigKey('\${esc(g.decision.key)}', true)">\${esc(g.decision.yesLabel || 'Yes')}</button>
          <button class="btn \${p.config?.[g.decision.key] === false || p.config?.[g.decision.key] === 'false' ? 'btn-primary' : ''}" type="button" onclick="saveConfigKey('\${esc(g.decision.key)}', false)">\${esc(g.decision.noLabel || 'No')}</button>
        </div>
      \` : \`
        <div class="input-row">
          <input class="text-input" id="decision-input" type="text" value="\${esc(p.config?.[g.decision.key] || '')}" placeholder="\${esc(g.decision.placeholder || '')}">
          <button class="btn btn-primary" type="button" onclick="saveConfigKey('\${esc(g.decision.key)}', document.getElementById('decision-input').value.trim())">Save</button>
        </div>
      \`}
    </div>
  \` : '';

  const vaultHtml = sp ? \`
    <div class="box-card">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-weight:600;font-size:13.5px">Required keys in local vault</span>
        <span class="app-sub num">\${sp.stored} of \${sp.total} stored</span>
      </div>
      \${sp.req.map(k => {
        const has = sp.storedSet.has(k);
        return \`
          <div style="display:flex;flex-direction:column;gap:6px;padding-top:6px;border-top:1px solid var(--border)">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <code style="font-family:var(--font-mono);font-size:12px">\${esc(k)}</code>
              <span class="tag \${has ? 'tag-ok' : ''}">\${has ? 'Stored in Keychain/Vault' : 'Not stored'}</span>
            </div>
            <div class="input-row">
              <input class="text-input" id="vk-\${esc(k)}" type="password" placeholder="Paste value to save locally (never shown again)" autocomplete="off">
              <button class="btn btn-sm" type="button" onclick="saveVaultKey('\${esc(k)}')">Save key</button>
            </div>
          </div>\`;
      }).join('')}
    </div>
  \` : '';

  drawer.innerHTML = \`
    <div class="drawer-header">
      <div class="drawer-title-wrap">
        <div class="task-icon" style="width:34px;height:34px">\${ICONS[item.category] || ICONS.build}</div>
        <div>
          <h2 class="drawer-title">\${esc(item.title)}</h2>
          <div class="pill-row">
            \${ownerPill(g)}
            <span class="tag \${item.status === 'pass' ? 'tag-ok' : ''}">\${item.status === 'pass' ? 'Done' : item.status === 'fail' ? 'Needs fix' : 'To do'}</span>
            \${item.blocksRelease && item.status !== 'pass' ? '<span class="tag tag-danger">Blocks a release</span>' : ''}
            \${g.scope === 'once' ? \`<span class="tag">\${ICONS.layers} Once for all your apps</span>\` : ''}
          </div>
        </div>
      </div>
      <button class="btn btn-icon btn-ghost" type="button" aria-label="Close" onclick="closeDrawer()">\${ICONS.close}</button>
    </div>

    <div class="drawer-body">
      <p class="drawer-summary">\${fmtInline(item.why)}</p>
      \${item.status === 'fail' ? \`<div class="drawer-reason"><strong>Audit detected:</strong> \${fmtInline(item.reason)}\${item.fix ? '<br><br><strong>Fix:</strong> ' + fmtInline(item.fix) : ''}</div>\` : ''}
      \${decisionHtml}
      \${vaultHtml}

      <div>
        <div class="timeline-head">\${g.owner === 'auto' ? ICONS.bolt : ICONS.hand} The quickest way</div>
        <div class="timeline">
          \${g.steps.map((st, idx) => \`
            <div class="tl-step">
              <div class="tl-num \${g.owner === 'auto' ? 'auto' : ''}">\${idx + 1}</div>
              <div>
                <div class="tl-title">\${fmtInline(st.title)}</div>
                <div class="tl-detail">\${fmtInline(st.detail)}</div>
                \${idx === 0 ? crumbsHtml : ''}
              </div>
            </div>\`).join('')}
        </div>
      </div>

      \${g.cliCommand ? \`
        <div>
          <div class="app-sub" style="margin-bottom:4px">Terminal command</div>
          <div class="cmd-box">
            <code>\${esc(g.cliCommand)}</code>
            <button class="btn btn-sm btn-ghost" type="button" onclick="copyText('\${esc(g.cliCommand)}', 'Command copied')">\${ICONS.copy} Copy</button>
          </div>
        </div>\` : ''}
    </div>

    <div class="drawer-footer">
      <div class="footer-left">
        \${g.autoAction && item.status !== 'pass'
          ? \`<button class="btn btn-primary" type="button" onclick="runApplyAction(\${esc(JSON.stringify(g.autoAction.flags || {}))})">\${esc(g.autoAction.label)}</button>\`
          : ''}
        \${item.status !== 'pass'
          ? \`<button class="btn \${g.autoAction ? '' : 'btn-primary'}" type="button" onclick="setChecklistState('\${esc(item.id)}', 'done')">Mark as done</button>\`
          : \`<button class="btn" type="button" onclick="setChecklistState('\${esc(item.id)}', 'reset')">Reopen</button>\`}
        \${g.consoleUrl ? \`<a class="btn btn-ghost" href="\${esc(g.consoleUrl)}" target="_blank" rel="noopener">\${ICONS.ext} Open</a>\` : ''}
      </div>
      \${item.status !== 'pass' ? \`<button class="btn btn-ghost btn-sm" type="button" onclick="setChecklistState('\${esc(item.id)}', 'na')">Not applicable</button>\` : ''}
    </div>
  \`;
}

async function openDoctorReport() {
  const p = activeProject();
  if (!p) return;
  STATE.drawerMode = 'report';
  const drawer = document.getElementById('drawer');
  drawer.innerHTML = '<div class="drawer-header"><h2 class="drawer-title">Doctor Report</h2><button class="btn btn-icon btn-ghost" type="button" onclick="closeDrawer()">'+ICONS.close+'</button></div><div class="drawer-body"><p class="page-sub">Generating redacted diagnostic report...</p></div>';
  drawer.classList.add('open');
  document.getElementById('drawer-backdrop').classList.add('open');

  const res = await fetch('/api/report?root=' + encodeURIComponent(p.root));
  const rep = await res.json();
  const pretty = JSON.stringify(rep, null, 2);
  drawer.innerHTML = \`
    <div class="drawer-header">
      <div>
        <h2 class="drawer-title">Redacted Doctor Report</h2>
        <div class="page-sub">Safe to share — API keys, JWTs, emails, and usernames are stripped.</div>
      </div>
      <button class="btn btn-icon btn-ghost" type="button" onclick="closeDrawer()">\${ICONS.close}</button>
    </div>
    <div class="drawer-body">
      <pre style="margin:0;padding:12px;border-radius:10px;background:var(--bg);border:1px solid var(--border);font-family:var(--font-mono);font-size:12px;overflow:auto;line-height:1.45">\${esc(pretty)}</pre>
    </div>
    <div class="drawer-footer">
      <button class="btn btn-primary" type="button" onclick="copyText(document.querySelector('#drawer pre').textContent, 'Doctor report copied')">\${ICONS.copy} Copy report</button>
      <button class="btn btn-ghost" type="button" onclick="closeDrawer()">Close</button>
    </div>
  \`;
}

/* ── Actions ── */
function selectApp(root) {
  STATE.activeRoot = root;
  closeDrawer();
  renderAll();
}

async function setChecklistState(id, action) {
  const p = activeProject();
  if (!p) return;
  await postJson('/api/project/checklist', { root: p.root, id, action });
  showToast(action === 'done' ? 'Marked done' : action === 'na' ? 'Marked not applicable' : 'Reopened check');
  await refresh();
}

async function saveConfigKey(key, value) {
  const p = activeProject();
  if (!p) return;
  await postJson('/api/project/config', { root: p.root, key, value });
  showToast('Saved ' + key);
  await refresh();
}

async function saveVaultKey(keyName) {
  const p = activeProject();
  const input = document.getElementById('vk-' + keyName);
  if (!p || !input || !input.value.trim()) { showToast('Enter a value first'); return; }
  try {
    const res = await postJson('/api/project/vault', { root: p.root, keyName, value: input.value.trim() });
    input.value = '';
    showToast('Saved ' + keyName + ' to ' + res.backend);
    await refresh();
  } catch (err) {
    showToast(err.message);
  }
}

async function runApplyAction(flags) {
  const p = activeProject();
  if (!p) return;
  try {
    const res = await postJson('/api/project/apply', { root: p.root, ...flags });
    showToast('Applied (' + (res.written?.length || 0) + ' file(s) written, snapshot saved)');
    await refresh();
  } catch (err) {
    showToast(err.message);
  }
}

async function runUndoAction() {
  const p = activeProject();
  if (!p) return;
  try {
    const res = await postJson('/api/project/undo', { root: p.root });
    showToast('Undid last apply (' + (res.restored.length + res.deleted.length) + ' reverted, ' + res.preserved.length + ' edited preserved)');
    await refresh();
  } catch (err) {
    showToast(err.message);
  }
}

async function startPlayTest() {
  const p = activeProject();
  if (!p) return;
  await postJson('/api/project/play-test', { root: p.root, action: 'start', testersCount: 12 });
  showToast('Started 14-day Play closed test tracker');
  await refresh();
}

/* ── Quick Jump Palette (⌘K) ── */
function openPalette() {
  document.getElementById('palette-backdrop').classList.add('open');
  const inp = document.getElementById('palette-input');
  inp.value = '';
  renderPalette('');
  setTimeout(() => inp.focus(), 20);
}
function closePalette() {
  document.getElementById('palette-backdrop').classList.remove('open');
}
function renderPalette(q) {
  const p = activeProject();
  const needle = q.trim().toLowerCase();
  const rows = [
    { label: 'Go to Home', hint: 'View', run: () => { STATE.view = 'home'; renderAll(); } },
    { label: 'Go to Costs & Timeline Calculator', hint: 'View', run: () => { STATE.view = 'costs'; renderAll(); } },
    { label: 'Go to All checks (50 items)', hint: 'View', run: () => { STATE.view = 'checks'; renderAll(); } },
    { label: 'Open Redacted Doctor Report', hint: 'Action', run: () => openDoctorReport() },
  ];
  if (p) {
    for (const item of p.checklist.items.filter(i => i.status !== 'na')) {
      rows.push({
        label: item.title,
        hint: item.status === 'pass' ? 'Done' : item.guide.ctaLabel,
        run: () => openItemDrawer(item.id),
      });
    }
  }
  const filtered = rows.filter(r => !needle || r.label.toLowerCase().includes(needle) || r.hint.toLowerCase().includes(needle)).slice(0, 14);
  window.__palRows = filtered;
  document.getElementById('palette-list').innerHTML = filtered.map((r, i) => \`
    <button class="pal-row" type="button" onclick="closePalette();window.__palRows[\${i}].run()">
      <span>\${esc(r.label)}</span><span class="app-sub">\${esc(r.hint)}</span>
    </button>\`).join('') || '<div class="app-sub" style="padding:12px">No matching items.</div>';
}

/* ── Event Wiring ── */
document.querySelectorAll('[data-view]').forEach(btn => {
  btn.addEventListener('click', () => { STATE.view = btn.dataset.view; renderAll(); });
});
document.querySelectorAll('[data-theme-set]').forEach(btn => {
  btn.addEventListener('click', () => applyTheme(btn.dataset.themeSet));
});
document.getElementById('drawer-backdrop').addEventListener('click', closeDrawer);
document.getElementById('jump-open').addEventListener('click', openPalette);
document.getElementById('palette-backdrop').addEventListener('click', e => { if (e.target.id === 'palette-backdrop') closePalette(); });
document.getElementById('palette-input').addEventListener('input', e => renderPalette(e.target.value));
window.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); }
  else if (e.key === 'Escape') { closeDrawer(); closePalette(); }
});

applyTheme(localStorage.getItem('slp-theme') || 'dark');
refresh();
</script>
</body>
</html>`;
}
