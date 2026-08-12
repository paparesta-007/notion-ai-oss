// app-logic.js
// Stessa identica logica dell'app.js originale (stato, sidebar, command
// palette Ctrl+K, editing WYSIWYG, caricamento progressivo dei blocchi),
// solo richiamata da un useEffect di React invece che da DOMContentLoaded.
import { escapeHtml, renderPage, renderChildren, renderBlock, renderDatabase, wireUpTabs, emojiOrFileIcon } from './render.js';

export function initApp() {
  const views = {
    login: document.getElementById('loginView'),
    url: document.getElementById('urlView'),
    loading: document.getElementById('loadingView'),
    page: document.getElementById('pageView'),
  };

  function showView(name) {
    Object.values(views).forEach(v => v && v.classList.add('hidden'));
    if (views[name]) views[name].classList.remove('hidden');
  }

  const sidebarEl = document.getElementById('sidebar');

  async function doLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    refreshAuthArea();
  }

  async function refreshAuthArea() {
    const authArea = document.getElementById('authArea');
    const res = await fetch('/api/auth/status');
    const status = await res.json();
    if (!status.loggedIn) {
      authArea.innerHTML = '';
      sidebarEl.classList.add('hidden');
      document.getElementById('sidebarToggleBtn').classList.add('hidden');
      showView('login');
      return false;
    }
    const icon = status.workspace_icon ? `<img class="workspace-icon" src="${status.workspace_icon}" alt="">` : '';
    authArea.innerHTML = `
      ${icon}
      <span>${status.workspace_name ? escapeHtml(status.workspace_name) : 'Connesso'}</span>
      <button class="btn btn-ghost" id="logoutBtn">Esci</button>
    `;
    document.getElementById('logoutBtn').addEventListener('click', doLogout);

    sidebarEl.classList.remove('hidden');
    document.getElementById('sidebarToggleBtn').classList.remove('hidden');
    const workspaceEl = document.getElementById('sidebarWorkspace');
    workspaceEl.innerHTML = `
      ${status.workspace_icon ? `<img src="${status.workspace_icon}" alt="">` : '<span>◆</span>'}
      <span class="sidebar-workspace-name">${status.workspace_name ? escapeHtml(status.workspace_name) : 'Workspace'}</span>
      <svg class="lucide-icon lucide-chevron-down" style="margin-left: auto; width: 14px; height: 14px; color: #787774; flex-shrink: 0;" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
    `;
    
    // Configura workspace dropdown menu popup (Windows style)
    const workspaceMenu = document.getElementById('workspaceMenu');
    if (workspaceMenu && workspaceEl) {
      workspaceEl.onclick = (e) => {
        e.stopPropagation();
        workspaceMenu.classList.toggle('hidden');
      };
      
      // Close workspace menu if clicked outside
      window.addEventListener('click', () => {
        workspaceMenu.classList.add('hidden');
      });
      
      const menuLogoutBtn = document.getElementById('menuLogoutBtn');
      if (menuLogoutBtn) {
        menuLogoutBtn.onclick = (e) => {
          e.stopPropagation();
          workspaceMenu.classList.add('hidden');
          doLogout();
        };
      }

      const menuNewPageBtn = document.getElementById('menuNewPageBtn');
      if (menuNewPageBtn) {
        menuNewPageBtn.onclick = (e) => {
          e.stopPropagation();
          workspaceMenu.classList.add('hidden');
          const pageContent = document.getElementById('pageContent');
          pageContent.innerHTML = `<h1 class="page-title">Nuova Pagina</h1><p class="muted">Scrivi qui...</p>`;
          showView('page');
        };
      }

      const menuSaveDraftBtn = document.getElementById('menuSaveDraftBtn');
      if (menuSaveDraftBtn) {
        menuSaveDraftBtn.onclick = (e) => {
          e.stopPropagation();
          workspaceMenu.classList.add('hidden');
          alert('Bozza salvata localmente!');
        };
      }

      const menuToggleSidebarBtn = document.getElementById('menuToggleSidebarBtn');
      if (menuToggleSidebarBtn) {
        menuToggleSidebarBtn.onclick = (e) => {
          e.stopPropagation();
          workspaceMenu.classList.add('hidden');
          sidebarEl.classList.toggle('collapsed');
        };
      }

      const menuAboutBtn = document.getElementById('menuAboutBtn');
      if (menuAboutBtn) {
        menuAboutBtn.onclick = (e) => {
          e.stopPropagation();
          workspaceMenu.classList.add('hidden');
          const pageContent = document.getElementById('pageContent');
          pageContent.innerHTML = `<h1 class="page-title">About Notion Playground</h1><p class="muted">Versione 2.0.0 (Windows/IDE Layout Edition). Sviluppato per pair-programming.</p>`;
          showView('page');
        };
      }
    }
    
    loadSidebarRecents();
    return true;
  }

  // ---------------------------------------------------------------------------
  // Global floating loading manager
  // ---------------------------------------------------------------------------
  let activeLoads = 0;
  let floatingLoadingEl = null;

  function beginLoad(label) {
    activeLoads++;
    if (!floatingLoadingEl) {
      floatingLoadingEl = document.createElement('div');
      floatingLoadingEl.className = 'floating-loading';
      floatingLoadingEl.innerHTML = `<span class="floating-loading-dot"></span><span class="floating-loading-text"></span>`;
      document.body.appendChild(floatingLoadingEl);
    }
    floatingLoadingEl.querySelector('.floating-loading-text').textContent = label || 'Caricamento in corso…';
  }

  function endLoad() {
    activeLoads = Math.max(0, activeLoads - 1);
    if (activeLoads === 0 && floatingLoadingEl) {
      const el = floatingLoadingEl;
      floatingLoadingEl = null;
      el.style.transition = 'opacity 0.2s ease';
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 200);
    }
  }

  // ---------------------------------------------------------------------------
  // Data State & Background Streaming Architecture
  // ---------------------------------------------------------------------------
  let blockStore = new Map(); 
  let pagination = { id: null, cursor: null, hasMore: false, loading: false };

  function rememberBlocks(blocks) {
    blocks.forEach(b => blockStore.set(b.id, b));
  }

  // Manteniamo l'observer solo come fallback di sicurezza o se inserisci logiche particolari,
  // ma gli elementi "eager" ora vengono scatenati immediatamente via codice.
  const lazyObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        lazyObserver.unobserve(entry.target);
        hydrateLazyElement(entry.target);
      }
    });
  }, { root: null, rootMargin: '600px 0px', threshold: 0 });

  async function hydrateLazyElement(el) {
    // Evita di re-idratare elementi già in fase di caricamento o completati
    if (el.dataset.hydrating === '1') return;
    el.dataset.hydrating = '1';

    const id = el.dataset.lazyId;
    const isRoot = el.dataset.lazyRoot === '1';
    
    beginLoad('Caricamento contenuti…');
    try {
      const res = await fetch(`/api/notion/subtree?id=${encodeURIComponent(id)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore sconosciuto');
      
      let newNodes;
      if (isRoot) {
        const block = blockStore.get(id);
        if (!block) throw new Error('Blocco non trovato.');
        block._children = data.children;
        newNodes = htmlToNodes(renderBlock(block));
      } else {
        newNodes = data.children.length ? htmlToNodes(`<div class="n-children">${renderChildren(data.children)}</div>`) : [];
      }
      el.replaceWith(...newNodes);
      finalizeNodes(newNodes);
    } catch (err) {
      el.removeAttribute('data-hydrating');
      el.classList.add('n-lazy-failed');
      el.innerHTML = `<span class="n-lazy-error">Caricamento non riuscito.</span> <button type="button" class="n-lazy-retry">Riprova</button>`;
      el.querySelector('.n-lazy-retry').addEventListener('click', () => {
        el.classList.remove('n-lazy-failed');
        el.innerHTML = '';
        hydrateLazyElement(el);
      });
    } finally {
      endLoad();
    }
  }

  async function loadMoreTopLevel() {
    if (pagination.loading || !pagination.hasMore) return;
    pagination.loading = true;

    const sentinel = document.getElementById('loadMoreSentinel');
    beginLoad('Carico altri blocchi…');
    
    try {
      const params = new URLSearchParams({ id: pagination.id });
      if (pagination.cursor) params.set('cursor', pagination.cursor);
      
      const res = await fetch(`/api/notion/children?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore sconosciuto');
      
      rememberBlocks(data.blocks);
      const nodes = htmlToNodes(renderChildren(data.blocks));
      if (sentinel) sentinel.before(...nodes);
      
      finalizeNodes(nodes);
      
      pagination.cursor = data.nextCursor;
      pagination.hasMore = data.hasMore;
      
      if (!pagination.hasMore && sentinel) {
        sentinel.remove();
      }
    } catch (err) {
      if (sentinel) {
        sentinel.classList.add('n-lazy-failed');
        sentinel.innerHTML = `<span class="n-lazy-error">Caricamento non riuscito.</span> <button type="button" class="n-lazy-retry">Riprova</button>`;
        sentinel.querySelector('.n-lazy-retry').addEventListener('click', () => {
          sentinel.classList.remove('n-lazy-failed');
          sentinel.innerHTML = '';
          loadMoreTopLevel();
        });
      }
    } finally {
      pagination.loading = false;
      endLoad();
    }

    // RICORSIONE IN BACKGROUND: Se ci sono altri blocchi a livello principale,
    // chiama immediatamente la funzione successiva senza aspettare lo scroll.
    if (pagination.hasMore) {
      loadMoreTopLevel();
    }
  }

  function htmlToNodes(html) {
    const tpl = document.createElement('template');
    tpl.innerHTML = html;
    return Array.from(tpl.content.childNodes);
  }

  function finalizeNodes(nodes) {
    const elements = nodes.filter(n => n.nodeType === Node.ELEMENT_NODE);
    elements.forEach(el => {
      if (window.hljs) {
        const codeEls = [...(el.matches('.n-code-wrap code') ? [el] : []), ...el.querySelectorAll('.n-code-wrap code')];
        codeEls.forEach(code => hljs.highlightElement(code));
      }
      wireUpTabs(el);
      
      // CAMBIAMENTO CHIAVE: Invece di delegare all'IntersectionObserver via scroll,
      // intercettiamo tutti gli elementi "eager" appena vengono inseriti nel DOM e li carichiamo SUBITO.
      const eagerEls = [...(el.matches('[data-lazy-kind="eager"]') ? [el] : []), ...el.querySelectorAll('[data-lazy-kind="eager"]')];
      eagerEls.forEach(node => {
        hydrateLazyElement(node); 
      });

      // I toggle rimangono legati al click (comportamento nativo di Notion)
      const toggleEls = [...(el.matches('[data-lazy-kind="toggle"]') ? [el] : []), ...el.querySelectorAll('[data-lazy-kind="toggle"]')];
      toggleEls.forEach(node => {
        const details = node.closest('details');
        if (!details || details.dataset.lazyWired) return;
        details.dataset.lazyWired = '1';
        details.addEventListener('toggle', function onToggle() {
          if (details.open) hydrateLazyElement(node);
        }, { once: true });
      });
    });
  }

  function appendSentinelIfNeeded(container) {
    if (!pagination.hasMore) return;
    const sentinel = document.createElement('div');
    sentinel.id = 'loadMoreSentinel';
    sentinel.className = 'n-sentinel';
    container.appendChild(sentinel);
    // Nota: Rimosso il sentinelObserver.observe() per evitare conflitti con la ricorsione automatica.
  }

  async function loadWorkspaceMembers() {
    const pageMembers = document.getElementById('pageMembers');
    if (!pageMembers) return;
    pageMembers.innerHTML = '';
    
    try {
      const res = await fetch('/api/notion/users');
      if (!res.ok) return;
      const data = await res.json();
      const users = data.results || [];
      if (users.length === 0) return;

      const people = users.filter(u => u.type === 'person');
      if (people.length === 0) return;

      const avatarHtml = people.map(u => {
        const title = escapeHtml(u.name || 'Membro');
        if (u.avatar_url) {
          return `<img class="member-avatar" src="${escapeHtml(u.avatar_url)}" title="${title}" alt="${title}">`;
        } else {
          const initials = (u.name || '?').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
          return `<div class="member-avatar-fallback" title="${title}">${escapeHtml(initials)}</div>`;
        }
      }).join('');

      pageMembers.innerHTML = `
        <span style="font-size:12px;color:var(--text-light);margin-right:6px;font-weight:500;">Membri:</span>
        <div style="display:flex;align-items:center;gap:4px;">${avatarHtml}</div>
      `;
    } catch (e) {
      console.error('Failed to load workspace members:', e);
    }
  }

  async function loadPage(url) {
    showView('loading'); // Schermata di caricamento bloccante iniziale
    try {
      const res = await fetch(`/api/notion/page?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (!res.ok) {
        showView('url');
        showUrlError(data.error || 'Errore sconosciuto nel recupero della pagina.');
        return;
      }
      
      blockStore = new Map();
      rememberBlocks(data.blocks);
      pagination = { id: data.pageId, cursor: data.nextCursor, hasMore: data.hasMore, loading: false };
      lastLoadedUrl = url;
      
      const container = document.getElementById('pageContent');
      container.innerHTML = renderPage(data.page, data.blocks);
      appendSentinelIfNeeded(container);
      
      // Render breadcrumbs
      const pageBreadcrumbs = document.getElementById('pageBreadcrumbs');
      if (pageBreadcrumbs && data.breadcrumbs && data.breadcrumbs.length > 0) {
        pageBreadcrumbs.innerHTML = data.breadcrumbs.map((bItem, idx) => {
          const isLast = idx === data.breadcrumbs.length - 1;
          const title = escapeHtml(bItem.title || 'Senza titolo');
          const icon = bItem.icon ? emojiOrFileIcon(bItem.icon) : '📄';
          
          const iconHtml = `<span style="margin-right:4px;display:inline-flex;align-items:center;">${icon}</span>`;
          const titleHtml = `<span style="font-weight:${isLast ? '600' : 'normal'};color:${isLast ? '#37352F' : 'var(--text-light)'};">${title}</span>`;
          
          if (isLast) {
            return `<div style="display:flex;align-items:center;gap:4px;cursor:default;">${iconHtml} ${titleHtml}</div>`;
          } else {
            return `<div style="display:flex;align-items:center;gap:4px;cursor:pointer;" class="breadcrumb-item" onclick="window.loadNotionPage('${bItem.url}')">${iconHtml} ${titleHtml}</div>
                    <span style="color:#c4c4c2;font-size:12px;margin:0 2px;">/</span>`;
          }
        }).join('');
      } else if (pageBreadcrumbs) {
        pageBreadcrumbs.innerHTML = '';
      }

      // Idrata immediatamente i blocchi del primo blocco renderizzato
      finalizeNodes(Array.from(container.childNodes));
      enableEditing(container, data.pageId);
      
      showView('page'); // Nasconde lo spinner a schermo intero: l'utente può leggere la pagina
      
      loadWorkspaceMembers();

      // AVVIO DELLO STREAMING DI BACKROUND: Se la pagina ha più di 30 blocchi,
      // avvia subito il recupero sequenziale dei blocchi successivi.
      if (pagination.hasMore) {
        loadMoreTopLevel();
      }
    } catch (err) {
      showView('url');
      showUrlError('Errore di rete durante il recupero della pagina.');
    }
  }
  window.loadNotionPage = loadPage;

  // ---------------------------------------------------------------------------
  // Sidebar — lista "Recenti" (popolata via /api/notion/search), niente sezione Meetings
  // ---------------------------------------------------------------------------
  let currentPageId = null;
  let sidebarCache = null;
  let lastLoadedUrl = null;

  function getFileTextIconSvg(color = '#787774') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon lucide-file-text" style="vertical-align: middle; display: inline-block; width: 16px; height: 16px;"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>`;
  }

  function getHomeIconSvg(color = '#787774') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon lucide-home" style="vertical-align: middle; display: inline-block; width: 16px; height: 16px;"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
  }

  function getLogOutIconSvg(color = '#787774') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon lucide-log-out" style="vertical-align: middle; display: inline-block; width: 16px; height: 16px;"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>`;
  }

  function iconGlyph(icon, objectType = 'page') {
    if (!icon) {
      if (objectType === 'database') {
        return `<span class="sidebar-page-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#787774" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon lucide-database" style="vertical-align:middle;display:inline-block;width:14px;height:14px;"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg></span>`;
      }
      return `<span class="sidebar-page-icon">${getFileTextIconSvg('#787774')}</span>`;
    }
    if (icon.type === 'emoji') return `<span class="sidebar-page-icon">${icon.value}</span>`;
    return `<span class="sidebar-page-icon"><img src="${icon.value}" alt=""></span>`;
  }

  function renderSidebarLists(items) {
    const recentsList = document.getElementById('sidebarRecentList');
    const privateList = document.getElementById('sidebarPrivateList');
    
    if (!items.length) {
      recentsList.innerHTML = '<div class="sidebar-empty">Nessuna pagina recente</div>';
      privateList.innerHTML = '<div class="sidebar-empty">Nessuna pagina privata</div>';
      return;
    }
    
    // Render recents (first 6 items)
    const recentItems = items.slice(0, 6);
    recentsList.innerHTML = recentItems.map(item => `
      <button type="button" class="sidebar-page-item${item.id === currentPageId ? ' active' : ''}" data-page-url="${escapeHtml(item.url)}" data-page-id="${item.id}">
        ${iconGlyph(item.icon)}
        <span class="sidebar-page-title">${escapeHtml(item.title)}</span>
      </button>
    `).join('');
    
    // Render private (all items)
    privateList.innerHTML = items.map(item => `
      <button type="button" class="sidebar-page-item${item.id === currentPageId ? ' active' : ''}" data-page-url="${escapeHtml(item.url)}" data-page-id="${item.id}">
        ${iconGlyph(item.icon)}
        <span class="sidebar-page-title">${escapeHtml(item.title)}</span>
      </button>
    `).join('');
    
    // Bind click events to all rendered items
    document.querySelectorAll('.sidebar-page-item:not(.disabled-item)').forEach(btn => {
      btn.onclick = () => {
        const url = btn.dataset.pageUrl;
        if (url) loadPage(url);
      };
    });
  }

  async function loadSidebarRecents() {
    try {
      const res = await fetch('/api/notion/search?q=');
      if (!res.ok) return;
      const data = await res.json();
      sidebarCache = data.results || [];
      renderSidebarLists(sidebarCache);
    } catch (err) {
      // silenzioso: la sidebar resta vuota, non blocca il resto dell'app
    }
  }

  function setActiveSidebarItem(pageId) {
    currentPageId = pageId;
    document.querySelectorAll('.sidebar-page-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.pageId === pageId);
    });
  }

  // Interattività delle nav pills orizzontali e pulsanti in sidebar
  document.querySelectorAll('.sidebar-nav-row button').forEach(btn => {
    btn.onclick = () => {
      if (btn.id === 'sidebarSearchBtn') {
        openCommandPalette();
        return;
      }
      
      document.querySelectorAll('.sidebar-nav-row button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      if (btn.id === 'sidebarHomeBtn') {
        setActiveSidebarItem(null);
        showView('url');
      } else {
        setActiveSidebarItem(null);
        const title = btn.title || 'Sezione';
        const pageContent = document.getElementById('pageContent');
        pageContent.innerHTML = `<h1 class="page-title">${title}</h1><p class="muted">Questa sezione è una simulazione basata sullo screenshot di Notion.</p>`;
        showView('page');
      }
    };
  });



  const composeBtn = document.getElementById('sidebarComposeBtn');
  if (composeBtn) {
    composeBtn.onclick = () => {
      const pageContent = document.getElementById('pageContent');
      pageContent.innerHTML = `<h1 class="page-title">Nuova Pagina</h1><p class="muted">Scrivi qui...</p>`;
      showView('page');
    };
  }

  document.getElementById('sidebarHomeBtn').addEventListener('click', () => {
    setActiveSidebarItem(null);
    showView('url');
  });
  document.getElementById('sidebarToggleBtn').addEventListener('click', () => {
    sidebarEl.classList.toggle('collapsed');
  });

  // ---------------------------------------------------------------------------
  // Command palette (Ctrl+K) — menu dinamico centrato: cerca pagine Notion in
  // tempo reale + un piccolo set di comandi rapidi.
  // ---------------------------------------------------------------------------
  const cmdkOverlay = document.getElementById('cmdkOverlay');
  const cmdkInput = document.getElementById('cmdkInput');
  const cmdkResultsEl = document.getElementById('cmdkResults');
  let cmdkSelectedIndex = 0;
  let cmdkItems = [];
  let cmdkDebounce = null;
  let cmdkSeq = 0;
  let lastMouseX = 0;
  let lastMouseY = 0;

  const previewCache = new Map(); // pageId -> { parentPath, blocks }
  let currentPreviewId = null;

  function staticCommands(query) {
    const q = query.trim().toLowerCase();
    const all = [
      { kind: 'command', icon: getHomeIconSvg('#787774'), title: 'Vai alla Home', run: () => { setActiveSidebarItem(null); showView('url'); } },
      { kind: 'command', icon: getLogOutIconSvg('#787774'), title: 'Esci dall\'account', run: doLogout },
    ];
    if (!q) return all;
    return all.filter(c => c.title.toLowerCase().includes(q));
  }

  function clearCmdkPreview() {
    const previewEl = document.getElementById('cmdkPreview');
    if (!previewEl) return;
    previewEl.innerHTML = `
      <div class="cmdk-preview-placeholder">
        <div class="cmdk-preview-placeholder-text">Seleziona una pagina per vederne l'anteprima</div>
      </div>
    `;
    currentPreviewId = null;
  }

  async function updateCmdkPreview() {
    const previewEl = document.getElementById('cmdkPreview');
    if (!previewEl) return;
    
    const item = cmdkItems[cmdkSelectedIndex];
    if (!item || item.kind !== 'page') {
      clearCmdkPreview();
      return;
    }
    
    if (currentPreviewId === item.id) return;
    currentPreviewId = item.id;
    
    const coverHtml = item.cover 
      ? `<img class="cmdk-preview-cover" src="${escapeHtml(item.cover)}" alt="">` 
      : '';
      
    const iconHtml = item.icon 
      ? (item.icon.type === 'emoji' 
          ? item.icon.value 
          : `<img src="${escapeHtml(item.icon.value)}" alt="">`)
      : getFileTextIconSvg('#787774');

    previewEl.innerHTML = `
      <div class="cmdk-preview-card">
        <a href="${escapeHtml(item.url)}" target="_blank" class="cmdk-preview-link-btn" title="Apri in Notion">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon lucide-external-link" style="vertical-align: middle; display: inline-block; width: 12px; height: 12px;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg> <span>Apri</span>
        </a>
        
        <div class="cmdk-preview-cover-wrap">
          ${coverHtml}
          <div class="cmdk-preview-icon-wrap">
            ${iconHtml}
          </div>
        </div>
        
        <div class="cmdk-preview-meta">
          <div class="cmdk-preview-path" id="cmdkPreviewPath">${escapeHtml(item.parentPath || '...')}</div>
          <div class="cmdk-preview-title">${escapeHtml(item.title)}</div>
        </div>
        
        <div class="cmdk-preview-content" id="cmdkPreviewContent">
          <div class="cmdk-loading">Caricamento anteprima…</div>
        </div>
      </div>
    `;
    
    const targetId = item.id;
    
    try {
      let previewData;
      if (previewCache.has(targetId)) {
        previewData = previewCache.get(targetId);
      } else {
        const res = await fetch(`/api/notion/page-preview?id=${encodeURIComponent(targetId)}`);
        if (!res.ok) throw new Error('Errore caricamento anteprima');
        previewData = await res.json();
        previewCache.set(targetId, previewData);
      }
      
      if (currentPreviewId !== targetId) return;
      
      const pathEl = document.getElementById('cmdkPreviewPath');
      if (pathEl) pathEl.textContent = previewData.parentPath || 'Workspace';
      
      const contentEl = document.getElementById('cmdkPreviewContent');
      if (contentEl) {
        if (previewData.isDatabase) {
          const tag = `<span style="background: rgba(35, 131, 226, 0.1); color: #2383E2; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; display: inline-block; margin-bottom: 8px;">Database</span>`;
          contentEl.innerHTML = tag + renderDatabase(previewData.database, previewData.pages);
        } else if (previewData.blocks && previewData.blocks.length) {
          contentEl.innerHTML = renderChildren(previewData.blocks);
          if (window.hljs) {
            contentEl.querySelectorAll('.n-code-wrap code').forEach(code => {
              hljs.highlightElement(code);
            });
          }
        } else {
          contentEl.innerHTML = '<div class="muted" style="text-align: center; padding: 12px 0;">Pagina vuota</div>';
        }
      }
    } catch (err) {
      if (currentPreviewId !== targetId) return;
      const contentEl = document.getElementById('cmdkPreviewContent');
      if (contentEl) {
        contentEl.innerHTML = '<div class="n-lazy-error" style="text-align: center;">Impossibile caricare l\'anteprima</div>';
      }
    }
  }

  function renderCmdkResults() {
    if (!cmdkItems.length) {
      cmdkResultsEl.innerHTML = '<div class="cmdk-empty">Nessun risultato</div>';
      clearCmdkPreview();
      return;
    }
    let html = '';
    const pages = cmdkItems.filter(i => i.kind === 'page');
    const commands = cmdkItems.filter(i => i.kind === 'command');
    let idx = 0;
    
    if (pages.length) {
      // Raggruppamento: primi 6 come Today, i restanti come Yesterday
      const todayPages = pages.slice(0, 6);
      const yesterdayPages = pages.slice(6);
      
      html += '<div class="cmdk-group-label">Today</div>';
      html += todayPages.map(p => {
        const i = idx++;
        const pathText = p.parentPath ? ` — ${escapeHtml(p.parentPath)}` : '';
        return `<div class="cmdk-item${i === cmdkSelectedIndex ? ' selected' : ''}" data-idx="${i}">
          ${iconGlyph(p.icon, p.objectType)}
          <div class="cmdk-item-title-wrap">
            <span class="cmdk-item-title">${escapeHtml(p.title)}<span class="cmdk-item-path">${pathText}</span></span>
          </div>
        </div>`;
      }).join('');
      
      if (yesterdayPages.length) {
        html += '<div class="cmdk-group-label">Yesterday</div>';
        html += yesterdayPages.map(p => {
          const i = idx++;
          const pathText = p.parentPath ? ` — ${escapeHtml(p.parentPath)}` : '';
          return `<div class="cmdk-item${i === cmdkSelectedIndex ? ' selected' : ''}" data-idx="${i}">
            ${iconGlyph(p.icon, p.objectType)}
            <div class="cmdk-item-title-wrap">
              <span class="cmdk-item-title">${escapeHtml(p.title)}<span class="cmdk-item-path">${pathText}</span></span>
            </div>
          </div>`;
        }).join('');
      }
    }
    
    if (commands.length) {
      html += '<div class="cmdk-group-label">Comandi</div>';
      html += commands.map(c => {
        const i = idx++;
        return `<div class="cmdk-item${i === cmdkSelectedIndex ? ' selected' : ''}" data-idx="${i}">
          <span class="cmdk-item-icon">${c.icon}</span>
          <div class="cmdk-item-title-wrap">
            <span class="cmdk-item-title">${escapeHtml(c.title)}</span>
          </div>
        </div>`;
      }).join('');
    }
    cmdkResultsEl.innerHTML = html;
    
    // Aggiorna l'anteprima per l'elemento correntemente selezionato
    updateCmdkPreview();
    
    cmdkResultsEl.querySelectorAll('.cmdk-item').forEach(el => {
      el.onclick = () => runCmdkItem(parseInt(el.dataset.idx, 10));
      el.onmousemove = (e) => {
        if (e.clientX === lastMouseX && e.clientY === lastMouseY) return;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        
        const newIdx = parseInt(el.dataset.idx, 10);
        if (newIdx !== cmdkSelectedIndex) {
          cmdkSelectedIndex = newIdx;
          renderCmdkResults();
        }
      };
    });
  }

  function runCmdkItem(index) {
    const item = cmdkItems[index];
    if (!item) return;
    closeCommandPalette();
    if (item.kind === 'page') loadPage(item.url);
    else if (item.kind === 'command') item.run();
  }

  async function updateCmdkResults(query) {
    const seq = ++cmdkSeq;
    const commands = staticCommands(query);
    if (!query.trim()) {
      cmdkItems = [...(sidebarCache || []).map(p => ({ kind: 'page', ...p })), ...commands];
      cmdkSelectedIndex = 0;
      renderCmdkResults();
      return;
    }
    cmdkResultsEl.innerHTML = '<div class="cmdk-loading">Cerco…</div>';
    try {
      const res = await fetch(`/api/notion/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (seq !== cmdkSeq) return;
      const pages = (data.results || []).map(p => ({ kind: 'page', ...p }));
      cmdkItems = [...pages, ...commands];
      cmdkSelectedIndex = 0;
      renderCmdkResults();
    } catch (err) {
      if (seq !== cmdkSeq) return;
      cmdkItems = commands;
      cmdkSelectedIndex = 0;
      renderCmdkResults();
    }
  }

  function openCommandPalette() {
    cmdkOverlay.classList.remove('hidden');
    cmdkInput.value = '';
    updateCmdkResults('');
    setTimeout(() => cmdkInput.focus(), 0);
  }

  function closeCommandPalette() {
    cmdkOverlay.classList.add('hidden');
  }

  cmdkInput.addEventListener('input', () => {
    clearTimeout(cmdkDebounce);
    cmdkDebounce = setTimeout(() => updateCmdkResults(cmdkInput.value), 200);
  });

  cmdkOverlay.addEventListener('click', (e) => {
    if (e.target === cmdkOverlay) closeCommandPalette();
  });

  document.addEventListener('keydown', (e) => {
    const isK = e.key === 'k' || e.key === 'K';
    if (isK && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (cmdkOverlay.classList.contains('hidden')) openCommandPalette();
      else closeCommandPalette();
      return;
    }
    if (cmdkOverlay.classList.contains('hidden')) return;
    if (e.key === 'Escape') { closeCommandPalette(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      cmdkSelectedIndex = Math.min(cmdkSelectedIndex + 1, cmdkItems.length - 1);
      renderCmdkResults();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      cmdkSelectedIndex = Math.max(cmdkSelectedIndex - 1, 0);
      renderCmdkResults();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const item = cmdkItems[cmdkSelectedIndex];
        if (item && item.kind === 'page') {
          window.open(item.url, '_blank');
          closeCommandPalette();
        }
      } else {
        runCmdkItem(cmdkSelectedIndex);
      }
    }
  });

  // ---------------------------------------------------------------------------
  // WYSIWYG editing — contenteditable + scorciatoie in stile markdown/Notion.
  // Le modifiche sono locali (salvate solo in questo browser via localStorage):
  // l'integrazione Notion collegata è in sola lettura, quindi non c'è un
  // salvataggio "vero" sul workspace Notion.
  // ---------------------------------------------------------------------------
  const DRAFT_PREFIX = 'notion-playground-draft:';

  function placeCaretAtStart(el) {
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(el);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  const BLOCK_SELECTOR = 'p.n-paragraph, h1.n-h1, h2.n-h2, h3.n-h3, h4.n-h4, blockquote.n-quote, li, .n-todo-text, code[data-editable]';

  function getCurrentBlock(container) {
    const sel = window.getSelection();
    if (!sel.rangeCount) return null;
    let node = sel.getRangeAt(0).startContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    if (!node || !container.contains(node)) return null;
    return node.closest(BLOCK_SELECTOR);
  }

  function isHtmlEmpty(html) {
    return !html || html.replace(/<br\s*\/?>/gi, '').trim() === '';
  }

  function splitBlockAtCaret(block) {
    const sel = window.getSelection();
    if (!sel.rangeCount) return '';
    const range = sel.getRangeAt(0);
    const afterRange = range.cloneRange();
    afterRange.selectNodeContents(block);
    afterRange.setStart(range.endContainer, range.endOffset);
    const frag = afterRange.extractContents();
    const div = document.createElement('div');
    div.appendChild(frag);
    return div.innerHTML;
  }

  function wireTodoCheckbox(input) {
    input.disabled = false;
    input.addEventListener('change', () => {
      input.closest('.n-todo').classList.toggle('checked', input.checked);
    });
  }

  function newParagraph(html) {
    const p = document.createElement('p');
    p.className = 'n-paragraph';
    p.innerHTML = isHtmlEmpty(html) ? '<br>' : html;
    return p;
  }

  function handleEnterOnBlock(block) {
    // "---" da solo + invio → divider, come in Notion
    if (block.tagName === 'P' && block.classList.contains('n-paragraph') && block.textContent.trim() === '---') {
      const hr = document.createElement('hr');
      hr.className = 'n-divider';
      const p = newParagraph('');
      block.replaceWith(hr);
      hr.after(p);
      placeCaretAtStart(p);
      return;
    }

    const afterHtml = splitBlockAtCaret(block);

    if (block.tagName === 'LI') {
      const list = block.parentElement;
      if (isHtmlEmpty(block.innerHTML) && isHtmlEmpty(afterHtml)) {
        const p = newParagraph('');
        list.after(p);
        block.remove();
        if (!list.children.length) list.remove();
        placeCaretAtStart(p);
        return;
      }
      const li = document.createElement('li');
      li.innerHTML = isHtmlEmpty(afterHtml) ? '<br>' : afterHtml;
      block.after(li);
      placeCaretAtStart(li);
      return;
    }

    if (block.classList.contains('n-todo-text')) {
      const todoDiv = block.closest('.n-todo');
      const newTodo = document.createElement('div');
      newTodo.className = 'n-todo';
      newTodo.innerHTML = `<input type="checkbox"><span class="n-todo-text" data-editable="true">${isHtmlEmpty(afterHtml) ? '<br>' : afterHtml}</span>`;
      todoDiv.after(newTodo);
      wireTodoCheckbox(newTodo.querySelector('input'));
      placeCaretAtStart(newTodo.querySelector('.n-todo-text'));
      return;
    }

    if (block.tagName === 'CODE') {
      // dentro un blocco codice, invio = nuova riga, non nuovo blocco
      document.execCommand('insertHTML', false, '\n');
      return;
    }

    const p = newParagraph(afterHtml);
    block.after(p);
    placeCaretAtStart(p);
  }

  function convertParagraphTo(block, tagName, className) {
    const el = document.createElement(tagName);
    el.className = className;
    el.innerHTML = '<br>';
    block.replaceWith(el);
    placeCaretAtStart(el);
  }

  function convertParagraphToListItem(block, listTag, listClass) {
    const li = document.createElement('li');
    li.innerHTML = '<br>';
    const prev = block.previousElementSibling;
    let list;
    if (prev && prev.tagName.toLowerCase() === listTag && prev.classList.contains(listClass)) {
      list = prev;
    } else {
      list = document.createElement(listTag);
      list.className = listClass;
      block.before(list);
    }
    list.appendChild(li);
    block.remove();
    placeCaretAtStart(li);
  }

  function convertParagraphToTodo(block) {
    const div = document.createElement('div');
    div.className = 'n-todo';
    div.innerHTML = `<input type="checkbox"><span class="n-todo-text" data-editable="true"><br></span>`;
    block.replaceWith(div);
    wireTodoCheckbox(div.querySelector('input'));
    placeCaretAtStart(div.querySelector('.n-todo-text'));
  }

  function convertParagraphToCode(block) {
    const wrap = document.createElement('div');
    wrap.className = 'n-code-wrap';
    wrap.innerHTML = `<pre><code class="language-plaintext" data-editable="true"><br></code></pre>`;
    block.replaceWith(wrap);
    placeCaretAtStart(wrap.querySelector('code'));
  }

  function tryMarkdownShortcut(block) {
    if (block.tagName !== 'P' || !block.classList.contains('n-paragraph')) return;
    const text = block.textContent;
    if (/^#{1,4}\s$/.test(text)) {
      const level = text.trim().length;
      convertParagraphTo(block, `h${level}`, `n-h${level}`);
    } else if (/^[-*]\s$/.test(text)) {
      convertParagraphToListItem(block, 'ul', 'n-list-ul');
    } else if (/^\d+\.\s$/.test(text)) {
      convertParagraphToListItem(block, 'ol', 'n-list-ol');
    } else if (/^>\s$/.test(text)) {
      convertParagraphTo(block, 'blockquote', 'n-quote');
    } else if (/^\[\s?\]\s$/.test(text)) {
      convertParagraphToTodo(block);
    } else if (text.trim() === '```') {
      convertParagraphToCode(block);
    }
  }

  let draftSaveTimeout = null;
  function scheduleDraftSave(container) {
    clearTimeout(draftSaveTimeout);
    draftSaveTimeout = setTimeout(() => {
      if (!currentPageId) return;
      try {
        localStorage.setItem(DRAFT_PREFIX + currentPageId, container.innerHTML);
        showEditStatus(true);
      } catch (err) { /* storage piena o non disponibile: ignora silenziosamente */ }
    }, 500);
  }

  function showEditStatus(hasDraft) {
    const el = document.getElementById('editStatus');
    if (!hasDraft) { el.innerHTML = ''; return; }
    el.innerHTML = `<span class="edit-dot"></span> Modifiche locali <button type="button" id="revertDraftBtn">Ripristina originale</button>`;
    document.getElementById('revertDraftBtn').addEventListener('click', () => {
      if (!currentPageId || !lastLoadedUrl) return;
      localStorage.removeItem(DRAFT_PREFIX + currentPageId);
      loadPage(lastLoadedUrl);
    });
  }

  function enableEditing(container, pageId) {
    currentPageId = pageId;
    container.setAttribute('contenteditable', 'true');
    container.querySelectorAll('.n-todo input[type="checkbox"]').forEach(wireTodoCheckbox);

    const draft = localStorage.getItem(DRAFT_PREFIX + pageId);
    if (draft) {
      container.innerHTML = draft;
      finalizeNodes(Array.from(container.childNodes));
      container.querySelectorAll('.n-todo input[type="checkbox"]').forEach(wireTodoCheckbox);
      showEditStatus(true);
    } else {
      showEditStatus(false);
    }

    setActiveSidebarItem(pageId);
  }

  document.getElementById('pageContent').addEventListener('keydown', (e) => {
    const container = document.getElementById('pageContent');
    if (container.getAttribute('contenteditable') !== 'true') return;
    if (e.key === 'Enter' && !e.shiftKey) {
      const block = getCurrentBlock(container);
      if (block && block.tagName !== 'CODE') {
        e.preventDefault();
        handleEnterOnBlock(block);
        scheduleDraftSave(container);
      }
    }
  });

  document.getElementById('pageContent').addEventListener('keyup', (e) => {
    const container = document.getElementById('pageContent');
    if (container.getAttribute('contenteditable') !== 'true') return;
    if (e.key === ' ' || e.key === '`') {
      const block = getCurrentBlock(container);
      if (block) tryMarkdownShortcut(block);
    }
  });

  document.getElementById('pageContent').addEventListener('input', () => {
    const container = document.getElementById('pageContent');
    if (container.getAttribute('contenteditable') !== 'true') return;
    scheduleDraftSave(container);
  });

  function showUrlError(msg) {
    const box = document.getElementById('urlError');
    box.textContent = msg;
    box.classList.remove('hidden');
  }

  document.getElementById('urlForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('pageUrlInput');
    document.getElementById('urlError').classList.add('hidden');
    if (input.value.trim()) loadPage(input.value.trim());
  });

  document.getElementById('backBtn').addEventListener('click', () => {
    showView('url');
  });

  (async function init() {
    const loggedIn = await refreshAuthArea();
    if (loggedIn) showView('url');
  })();
}