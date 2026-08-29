// Shared CSS-variable theme for CZAAH Mail — Apple-Mail-inspired, warm light
// palette with a single CZAAH gold accent. Injected once at the workspace root.
export const MAIL_THEME_CSS = `
.czaah-mail {
  --mail-bg: #faf9f6;
  --mail-panel: #ffffff;
  --mail-sidebar: #f3f1ea;
  --mail-panel-2: #f0ede4;
  --mail-border: rgba(28,26,20,0.09);
  --mail-border-strong: rgba(28,26,20,0.16);
  --mail-text: #1d1b16;
  --mail-text-dim: #6c675c;
  --mail-text-faint: #9a9487;
  --mail-accent: #9a7b2e;
  --mail-accent-dim: rgba(154,123,46,0.5);
  --mail-accent-soft: rgba(201,168,76,0.13);
  --mail-accent-wash: rgba(201,168,76,0.09);
  --mail-accent-fill: #c9a84c;
  --mail-gold: #c9a84c;
  --mail-hover: rgba(28,26,20,0.045);
  --mail-danger: #b5382b;
  --mail-chip: rgba(28,26,20,0.055);
  --mail-shadow: 0 1px 2px rgba(28,26,20,0.06), 0 4px 14px rgba(28,26,20,0.05);
  --mail-shadow-sm: 0 1px 3px rgba(28,26,20,0.10);
  font-family: 'Raleway', -apple-system, 'SF Pro Text', system-ui, sans-serif;
  color: var(--mail-text);
  -webkit-font-smoothing: antialiased;
}
.czaah-mail *, .czaah-mail *::before, .czaah-mail *::after { box-sizing: border-box; }
.czaah-mail button { font-family: inherit; }
.czaah-mail nav, .czaah-mail header, .czaah-mail footer, .czaah-mail section, .czaah-mail aside {
  position: static; top: auto; left: auto; right: auto; bottom: auto;
  width: auto; height: auto; z-index: auto; background: transparent;
}
.czaah-mail ::-webkit-scrollbar { width: 12px; height: 12px; }
.czaah-mail ::-webkit-scrollbar-thumb { background: rgba(28,26,20,0.18); border-radius: 8px; border: 3px solid transparent; background-clip: content-box; }
.czaah-mail ::-webkit-scrollbar-thumb:hover { background: rgba(28,26,20,0.3); background-clip: content-box; }
.czaah-mail ::-webkit-scrollbar-track { background: transparent; }
.czaah-mail select, .czaah-mail input, .czaah-mail textarea { color: var(--mail-text); }

/* pill / text button */
.czaah-mail .mi-btn {
  display: inline-flex; align-items: center; gap: 6px;
  background: var(--mail-panel); border: 1px solid var(--mail-border-strong);
  color: var(--mail-text-dim); border-radius: 7px;
  padding: 6px 11px; font-size: 12px; cursor: pointer;
  transition: background .12s, color .12s, border-color .12s, box-shadow .12s;
}
.czaah-mail .mi-btn:hover { background: var(--mail-hover); color: var(--mail-text); box-shadow: var(--mail-shadow-sm); }
.czaah-mail .mi-btn:disabled { opacity: .4; cursor: default; box-shadow: none; }
.czaah-mail .mi-btn.is-active { background: var(--mail-accent-soft); color: var(--mail-accent); border-color: var(--mail-accent-dim); }
.czaah-mail .mi-btn.is-danger:hover { color: var(--mail-danger); border-color: rgba(181,56,43,0.5); }

/* square icon button (Apple Mail toolbar) */
.czaah-mail .mi-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border-radius: 8px;
  background: transparent; border: 1px solid transparent;
  color: var(--mail-text-dim); cursor: pointer; transition: background .12s, color .12s;
}
.czaah-mail .mi-icon:hover { background: var(--mail-hover); color: var(--mail-text); }
.czaah-mail .mi-icon:disabled { opacity: .35; cursor: default; }
.czaah-mail .mi-icon.is-active { background: var(--mail-accent-soft); color: var(--mail-accent); }
.czaah-mail .mi-icon.is-danger:hover { background: rgba(181,56,43,0.1); color: var(--mail-danger); }

.czaah-mail .mi-primary {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  background: var(--mail-gold); color: #241c04; border: none;
  border-radius: 9px; padding: 10px 20px; font-size: 13px; font-weight: 600;
  cursor: pointer; letter-spacing: .01em; box-shadow: var(--mail-shadow-sm);
}
.czaah-mail .mi-primary:hover { background: #d0b055; box-shadow: var(--mail-shadow); }
.czaah-mail .mi-primary:disabled { opacity: .5; cursor: default; box-shadow: none; }

.czaah-mail .mi-input {
  background: var(--mail-panel-2); border: 1px solid transparent;
  border-radius: 9px; padding: 10px 13px; color: var(--mail-text);
  font-size: 13px; font-family: inherit; outline: none; width: 100%;
  transition: background .12s, border-color .12s, box-shadow .12s;
}
.czaah-mail .mi-input:focus { border-color: var(--mail-accent-dim); background: var(--mail-panel); box-shadow: var(--mail-shadow-sm); }
.czaah-mail .mi-input::placeholder { color: var(--mail-text-faint); }

.czaah-mail .mi-nav {
  display: flex; align-items: center; gap: 11px; width: 100%;
  background: transparent; border: none; color: var(--mail-text-dim);
  padding: 7px 12px; border-radius: 8px; cursor: pointer;
  font-size: 13px; text-align: left; transition: background .1s;
}
.czaah-mail .mi-nav:hover { background: var(--mail-hover); color: var(--mail-text); }
.czaah-mail .mi-nav.is-active { background: var(--mail-accent-soft); color: var(--mail-accent); font-weight: 600; }
.czaah-mail .mi-nav .count { margin-left: auto; font-size: 11px; opacity: .75; }

.czaah-mail .mi-row { background: transparent; transition: background .1s; }
.czaah-mail .mi-row:hover { background: var(--mail-hover); }
.czaah-mail .mi-row[data-sel] { background: var(--mail-accent-wash); box-shadow: inset 3px 0 0 var(--mail-gold); }
.czaah-mail .mi-row-star { opacity: 0; transition: opacity .1s; }
.czaah-mail .mi-row:hover .mi-row-star { opacity: .7; }
.czaah-mail .mi-row .mi-row-star:hover { opacity: 1; color: var(--mail-gold) !important; }

.czaah-mail .mi-backdrop { display: none; }
.czaah-mail .mi-menu-btn { display: none; }

@media (max-width: 820px) {
  .czaah-mail .mi-grid { grid-template-columns: 1fr !important; }
  .czaah-mail .mi-menu-btn {
    display: inline-flex; align-items: center; justify-content: center;
    width: 34px; height: 34px; flex-shrink: 0; border-radius: 8px;
    background: var(--mail-panel-2); border: 1px solid var(--mail-border);
    color: var(--mail-text-dim); cursor: pointer;
  }
  .czaah-mail .mi-navrail {
    position: fixed !important; top: 0 !important; left: 0 !important; bottom: 0 !important;
    width: 250px !important; z-index: 60 !important;
    transform: translateX(-100%); transition: transform .22s ease;
    box-shadow: 0 0 40px rgba(0,0,0,0.25);
  }
  .czaah-mail .mi-navrail.is-open { transform: translateX(0); }
  .czaah-mail .mi-backdrop { display: block; position: fixed; inset: 0; z-index: 55; background: rgba(0,0,0,0.42); }
  .czaah-mail .mi-topbar { flex-wrap: wrap; height: auto !important; padding: 10px 14px !important; gap: 10px !important; }
  .czaah-mail .mi-search { order: 3; flex-basis: 100% !important; max-width: none !important; }
}
`
