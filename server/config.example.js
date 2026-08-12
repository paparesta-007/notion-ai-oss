// config.js
// Copia questo file in "config.js" (nella stessa cartella) e riempi i valori.
// config.js NON deve mai essere committato: contiene segreti.
//
// - NOTION_CLIENT_ID / NOTION_CLIENT_SECRET: dalla tua integrazione pubblica
//   su https://www.notion.so/profile/integrations
// - NOTION_REDIRECT_URI: deve combaciare ESATTAMENTE con quella configurata
//   nell'integrazione, es. http://localhost:3000/api/auth/callback/notion
// - SESSION_SECRET: chiave base64 a 32 byte, generala con:
//     openssl rand -base64 32

export default {
  NOTION_CLIENT_ID: 'YOUR_NOTION_CLIENT_ID',
  NOTION_CLIENT_SECRET: 'YOUR_NOTION_CLIENT_SECRET',
  NOTION_REDIRECT_URI: 'http://localhost:3000/api/auth/callback/notion',
  SESSION_SECRET: 'REPLACE_WITH_openssl_rand_-base64_32_OUTPUT',
};
