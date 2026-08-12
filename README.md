# Notion Playground — monorepo (server + react)

Il progetto originale (un'unica app Express che serviva anche i file statici
vanilla JS) è stato diviso in due sotto-progetti indipendenti:

```
server/   Backend Express — quasi identico all'originale (OAuth Notion,
          sessione cifrata, fetch/cache dei blocchi Notion). Vedi server/README.md
react/    Frontend, riscritto in React (Vite) mantenendo esattamente la
          stessa struttura, lo stesso tema/colori e la stessa logica
          dell'app.js/render.js/style.css originali. Vedi react/README.md
```

## Avvio rapido (sviluppo)

Terminale 1:
```bash
cd server
npm install
cp config.example.js config.js   # poi riempi client id/secret Notion + session secret
npm start
```

Terminale 2:
```bash
cd react
npm install
npm run dev
```

Apri `http://localhost:5173`. Il frontend proxa `/api/*` verso il backend su
`:3000`, quindi login Notion e cookie di sessione funzionano esattamente come
nell'app originale, pur girando su due processi/porte separati.

## Produzione

```bash
cd react && npm run build   # genera react/dist
cd ../server && npm start   # serve react/dist automaticamente su :3000
```
