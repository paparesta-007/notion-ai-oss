import { useEffect } from 'react';
import { initApp } from './app-logic.js';

// App.jsx
// Stessa identica struttura dell'index.html originale (sidebar, topbar,
// viste login/url/loading/pagina, command palette Ctrl+K), tradotta in JSX.
// Tutta la logica (stato, fetch, editing, ecc.) resta quella di app-logic.js
// (porting 1:1 dell'app.js originale), avviata qui via useEffect al mount.
export default function App() {
  useEffect(() => {
    initApp();
  }, []);

  return (
    <>
  <div className="app-shell">

    {/* ------------------------------------------------------------------ */}
    {/* Sidebar (stile Notion, layout compatto: niente sezione "Meetings") */}
    {/* ------------------------------------------------------------------ */}
    {/* Workspace drop-down menu popup (Windows/IDE style) - placed outside sidebar to prevent overflow clipping */}
    <div id="workspaceMenu" className="workspace-menu hidden">
      <div className="workspace-menu-bar">
        <div className="menu-bar-item" data-menu="file">
          <span>File</span>
          <span className="menu-arrow">▶</span>
          <div className="menu-dropdown">
            <button type="button" className="menu-dropdown-item" id="menuNewPageBtn">New Page</button>
            <button type="button" className="menu-dropdown-item" id="menuSaveDraftBtn">Save Draft</button>
            <hr className="menu-divider" />
            <button type="button" className="menu-dropdown-item" id="menuLogoutBtn">
              <svg className="lucide-icon" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
              Logout (Esci)
            </button>
          </div>
        </div>
        <div className="menu-bar-item" data-menu="edit">
          <span>Edit</span>
          <span className="menu-arrow">▶</span>
          <div className="menu-dropdown">
            <button type="button" className="menu-dropdown-item">Undo</button>
            <button type="button" className="menu-dropdown-item">Redo</button>
            <hr className="menu-divider" />
            <button type="button" className="menu-dropdown-item">Preferences</button>
          </div>
        </div>
        <div className="menu-bar-item" data-menu="view">
          <span>View</span>
          <span className="menu-arrow">▶</span>
          <div className="menu-dropdown">
            <button type="button" className="menu-dropdown-item" id="menuToggleSidebarBtn">Toggle Sidebar</button>
            <button type="button" className="menu-dropdown-item">Zoom In</button>
            <button type="button" className="menu-dropdown-item">Zoom Out</button>
          </div>
        </div>
        <div className="menu-bar-item" data-menu="help">
          <span>Help</span>
          <span className="menu-arrow">▶</span>
          <div className="menu-dropdown">
            <button type="button" className="menu-dropdown-item" id="menuAboutBtn">About Notion Playground</button>
            <button type="button" className="menu-dropdown-item">Documentation</button>
          </div>
        </div>
      </div>
    </div>

    <nav id="sidebar" className="sidebar hidden">
      <div className="sidebar-workspace" id="sidebarWorkspace">
        {/* filled by app.js: icona + nome workspace + chevron */}
      </div>

      {/* Scrollable contents */}
      <div className="sidebar-scroll-area">
        {/* Horizontal Navigation Row */}
        <div className="sidebar-nav-row">
          <button type="button" className="sidebar-nav-pill active" id="sidebarHomeBtn">
            <span className="sidebar-nav-icon"><svg className="lucide-icon" viewBox="0 0 24 24"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></span>
            <span>Home</span>
          </button>
          <button type="button" className="sidebar-nav-icon-btn" id="sidebarSearchBtn" title="Cerca (Ctrl K)">
            <span className="sidebar-nav-icon"><svg className="lucide-icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg></span>
          </button>
        </div>

        {/* Recents Section */}
        <div className="sidebar-section">
          <div className="sidebar-section-label">Recents</div>
          <div className="sidebar-list" id="sidebarRecentList">
            <div className="sidebar-empty">Nessuna pagina recente</div>
          </div>
          <button type="button" className="sidebar-more-btn" id="sidebarRecentMoreBtn">
            <span>•••</span> <span>More</span>
          </button>
        </div>

        {/* Private Section */}
        <div className="sidebar-section">
          <div className="sidebar-section-label">Private</div>
          <div className="sidebar-list" id="sidebarPrivateList">
            <div className="sidebar-empty">Nessuna pagina privata</div>
          </div>
          <button type="button" className="sidebar-more-btn" id="sidebarPrivateMoreBtn">
            <span>•••</span> <span>More</span>
          </button>
        </div>
      </div>

      {/* Fixed bottom footer */}
      <div className="sidebar-footer">
        <button type="button" className="sidebar-footer-compose" id="sidebarComposeBtn" title="Nuova pagina (simulata)">
          <svg className="lucide-icon" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
        </button>
      </div>
    </nav>

    {/* ------------------------------------------------------------------ */}
    {/* Contenuto principale */}
    {/* ------------------------------------------------------------------ */}
    <div className="main-col">
      <header className="topbar">
        <div className="topbar-left">
          <button type="button" className="sidebar-toggle hidden" id="sidebarToggleBtn" title="Mostra/nascondi sidebar">☰</button>
          <span className="logo-mark">◆</span>
          <span className="logo-text">Notion Playground</span>
        </div>
        <div className="topbar-right" id="authArea">
          {/* filled by app.js */}
        </div>
      </header>

      <main id="app">

        <section id="loginView" className="center-view hidden">
          <div className="login-card">
            <div className="login-mark">◆</div>
            <h1>Notion Playground</h1>
            <p>Accedi con Notion, poi incolla l'URL di una pagina per vederla renderizzata seguendo i tipi di blocco ufficiali dell'API.</p>
            <a href="/api/auth/login" className="btn btn-primary btn-lg">Accedi con Notion</a>
          </div>
        </section>

        <section id="urlView" className="center-view hidden">
          <div className="url-card">
            <h1>Incolla l'URL di una pagina</h1>
            <p className="muted">La pagina deve essere stata condivisa con la tua integrazione durante il login, oppure scegline una dalla sidebar / da Ctrl+K.</p>
            <form id="urlForm">
              <input id="pageUrlInput" type="text" placeholder="https://www.notion.so/workspace/Titolo-pagina-1a2b3c4d..." autoComplete="off" />
              <button type="submit" className="btn btn-primary">Mostra pagina</button>
            </form>
            <div id="urlError" className="error-msg hidden"></div>
          </div>
        </section>

        <section id="loadingView" className="center-view hidden">
          <div className="spinner"></div>
          <p className="muted">Recupero e formattazione dei blocchi…</p>
        </section>

        <section id="pageView" className="hidden">
          <div className="page-toolbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button id="backBtn" className="btn btn-ghost">← Altra pagina</button>
              <div className="edit-status" id="editStatus"></div>
            </div>
            <div className="page-members" id="pageMembers"></div>
          </div>
          
          <article id="pageContent" className="notion-page" spellCheck="false"></article>
        </section>

      </main>
    </div>
  </div>

  {/* ------------------------------------------------------------------ */}
  {/* Command palette (Ctrl+K) */}
  {/* ------------------------------------------------------------------ */}
  <div id="cmdkOverlay" className="cmdk-overlay hidden">
    <div className="cmdk-panel" role="dialog" aria-modal="true" aria-label="Cerca">
      {/* Search Input Row */}
      <div className="cmdk-input-row">
        <span className="cmdk-input-icon"><svg className="lucide-icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg></span>
        <input id="cmdkInput" className="cmdk-input" type="text" placeholder="Cerca nel workspace..." autoComplete="off" />
        <div className="cmdk-input-actions">
          <button type="button" className="cmdk-action-icon" title="Split view">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/></svg>
          </button>
          <button type="button" className="cmdk-action-icon" title="Filter">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 3H2m20 6H2m14 6H8m10 6h-8"/></svg>
          </button>
        </div>
        <span className="sidebar-kbd cmdk-esc">Esc</span>
      </div>

      {/* Filters Row */}
      <div className="cmdk-filters-row">
        <button type="button" className="cmdk-filter-btn">
          <span><svg className="lucide-icon" viewBox="0 0 24 24"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" x2="15" y1="20" y2="20"/><line x1="12" x2="12" y1="4" y2="20"/></svg></span> Title only
        </button>
        <button type="button" className="cmdk-filter-btn">
          <span><svg className="lucide-icon" viewBox="0 0 24 24"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span> Created by <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m6 9 6 6 6-6"/></svg>
        </button>
        <button type="button" className="cmdk-filter-btn">
          <span><svg className="lucide-icon" viewBox="0 0 24 24"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg></span> In <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m6 9 6 6 6-6"/></svg>
        </button>
        <button type="button" className="cmdk-filter-btn cmdk-filter-add">
          <span><svg className="lucide-icon" viewBox="0 0 24 24"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg></span> Filter
        </button>
      </div>

      {/* Split Layout Body */}
      <div className="cmdk-body">
        {/* Left: Results */}
        <div id="cmdkResults" className="cmdk-results"></div>
        
        {/* Right: Preview */}
        <div id="cmdkPreview" className="cmdk-preview">
          <div className="cmdk-preview-placeholder">
            <div className="cmdk-preview-placeholder-text">Seleziona una pagina per vederne l'anteprima</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="cmdk-footer">
        <div className="cmdk-footer-left">
          <span className="sidebar-kbd">Ctrl+↵</span> <span className="cmdk-footer-text">Open in new tab</span>
        </div>
        <div className="cmdk-footer-right">
          <button type="button" className="cmdk-footer-settings-btn" title="Impostazioni ricerca">
            <svg className="lucide-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>
        </div>
      </div>
    </div>
  </div>
    </>
  );
}
