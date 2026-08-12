# Notion Playground — Server

Backend Express: OAuth Notion, sessione cifrata (AES-256-GCM), fetch a livelli
dei blocchi, cache in memoria. Identico all'originale monolitico, tranne per
il percorso dei file statici serviti in produzione (ora punta alla build del
progetto `../react`).

## Setup

```bash
npm install
cp config.example.js config.js   # poi riempi i valori (client id/secret, redirect uri, session secret)
npm start
```

Parte su `http://localhost:3000`.

In sviluppo, il frontend React (progetto `../react`, Vite su `localhost:5173`)
gira separatamente e fa da proxy verso questo server per tutte le chiamate
`/api/*` (vedi `react/vite.config.js`), quindi i cookie di sessione
funzionano senza bisogno di CORS.

In produzione, esegui `npm run build` nel progetto `react` (genera
`react/dist`) e questo server servirà quei file statici automaticamente.
