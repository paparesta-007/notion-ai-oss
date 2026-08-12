# Notion Playground — React

Stesso frontend dell'app originale (stessa struttura, stesso tema/colori,
stessa logica), portato da vanilla JS + HTML statico a React (Vite).

## Cosa è cambiato rispetto all'originale

- `public/index.html` → `index.html` (shell Vite) + `src/App.jsx` (JSX 1:1
  della stessa struttura: sidebar, topbar, viste login/url/loading/pagina,
  command palette Ctrl+K).
- `public/render.js` → `src/render.js`: **stesso codice**, solo con `export`
  aggiunto alle funzioni usate da `App.jsx`/`app-logic.js`.
- `public/app.js` → `src/app-logic.js`: **stesso codice** (stato, sidebar,
  Ctrl+K, editing WYSIWYG, caricamento progressivo dei blocchi), avvolto in
  `export function initApp() { ... }` invece che in
  `window.addEventListener('DOMContentLoaded', ...)`. `App.jsx` lo richiama
  in un `useEffect(() => { initApp(); }, [])` al mount.
- `public/style.css` → `src/style.css`: identico, importato in `main.jsx`.
- highlight.js e KaTeX restano caricati da CDN via `<script>` in
  `index.html`, esattamente come nell'originale.

## Setup

```bash
npm install
npm run dev
```

Parte su `http://localhost:5173`. Le chiamate `/api/*` vengono proxate
automaticamente verso il backend Express (progetto `../server`, che deve
girare su `http://localhost:3000` — vedi il suo README) grazie al proxy
configurato in `vite.config.js`. Così i cookie di sessione funzionano senza
bisogno di CORS.

## Build di produzione

```bash
npm run build
```

Genera `dist/`, che il server Express (`../server/server.js`) serve
automaticamente come file statici.
