import express from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config.js';
import { Agent, setGlobalDispatcher } from 'undici';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CONFIG
const NOTION_VERSION = process.env.NOTION_VERSION || '2025-09-03';
const SESSION_COOKIE = 'notion_playground_session';
const ALGO = 'aes-256-gcm';
const PORT = process.env.PORT || 3000;

// Progressive loading tuning
const FIRST_PAINT_PAGE_SIZE = 25;
const CHILDREN_PAGE_SIZE = 100;
const PREVIEW_PAGE_SIZE = 5;
const DATABASE_INITIAL_PAGE_SIZE = 25;
const DATABASE_FULL_PAGE_SIZE = 100;

// Cache TTL
const CACHE_TTL_MS = 20_000;
const METADATA_CACHE_TTL_MS = 5 * 60_000;
const SEARCH_CACHE_TTL_MS = 20_000;
const USERS_CACHE_TTL_MS = 60_000;
const PREVIEW_CACHE_TTL_MS = 20_000;

// HTTP / UNDICI
const globalKeepAliveAgent = new Agent({
  keepAliveTimeout: 30_000,
  keepAliveMaxTimeout: 120_000,
  connections: 8,
  pipelining: 1,
});
setGlobalDispatcher(globalKeepAliveAgent);

// EXPRESS
const app = express();
app.use(compression());
app.use(cookieParser());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../react/dist')));

// SESSION KEY
let SESSION_KEY;
try {
  SESSION_KEY = Buffer.from(config.SESSION_SECRET, 'base64');
  if (SESSION_KEY.length !== 32) throw new Error('bad length');
} catch (e) {
  console.error('SESSION_SECRET in config.js must be a base64-encoded 32-byte key (e.g. `openssl rand -base64 32`).');
  process.exit(1);
}

// ENCRYPTED STATELESS SESSION COOKIE
function encryptSession(data) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, SESSION_KEY, iv);
  const enc = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64url');
}

function decryptSession(token) {
  try {
    const buf = Buffer.from(token, 'base64url');
    if (buf.length < 28) return null;
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const enc = buf.subarray(28);
    const decipher = crypto.createDecipheriv(ALGO, SESSION_KEY, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
    return JSON.parse(dec.toString('utf8'));
  } catch (e) {
    return null;
  }
}

function getSession(req) {
  const token = req.cookies[SESSION_COOKIE];
  return token ? decryptSession(token) : null;
}

function setSession(res, data) {
  res.cookie(SESSION_COOKIE, encryptSession(data), {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24,
  });
}

// AUTH
app.get('/api/auth/login', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  res.cookie('oauth_state', state, { httpOnly: true, maxAge: 5 * 60 * 1000, sameSite: 'lax' });
  const params = new URLSearchParams({
    client_id: config.NOTION_CLIENT_ID,
    response_type: 'code',
    owner: 'user',
    redirect_uri: config.NOTION_REDIRECT_URI,
    state,
  });
  res.redirect(`https://api.notion.com/v1/oauth/authorize?${params.toString()}`);
});

app.get('/api/auth/callback/notion', async (req, res) => {
  const { code, state, error } = req.query;
  if (error) return res.status(400).send(`Notion returned an error: ${error}`);
  if (!code || !state || state !== req.cookies.oauth_state) {
    return res.status(400).send('Invalid OAuth state or missing authorization code.');
  }
  try {
    const basicAuth = Buffer.from(`${config.NOTION_CLIENT_ID}:${config.NOTION_CLIENT_SECRET}`).toString('base64');
    const tokenRes = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: config.NOTION_REDIRECT_URI,
      }),
    });

    const data = await safeJson(tokenRes);
    if (!tokenRes.ok) {
      console.error('Token exchange failed:', data);
      return res.status(500).send(`Token exchange failed: ${data?.error || 'unknown error'}`);
    }

    setSession(res, {
      access_token: data.access_token,
      workspace_name: data.workspace_name || null,
      workspace_icon: data.workspace_icon || null,
    });
    res.clearCookie('oauth_state');
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(500).send('Unexpected error during the OAuth callback.');
  }
});

app.get('/api/auth/status', (req, res) => {
  const session = getSession(req);
  if (!session) return res.json({ loggedIn: false });
  res.json({
    loggedIn: true,
    workspace_name: session.workspace_name,
    workspace_icon: session.workspace_icon,
  });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie(SESSION_COOKIE);
  res.json({ ok: true });
});

// GENERIC HELPERS
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function safeJson(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

// CONCURRENCY CONTROL
class Semaphore {
  constructor(max) {
    this.max = max;
    this.active = 0;
    this.queue = [];
  }

  async acquire() {
    if (this.active < this.max) {
      this.active++;
      return;
    }
    await new Promise((resolve) => this.queue.push(resolve));
    this.active++;
  }

  release() {
    if (this.active > 0) this.active--;
    const next = this.queue.shift();
    if (next) next();
  }
}

const notionGates = new Map();
function getNotionGate(token) {
  const key = tokenKey(token);
  let gate = notionGates.get(key);
  if (!gate) {
    gate = new Semaphore(3);
    notionGates.set(key, gate);
  }
  return gate;
}

// NOTION FETCH
function getRetryDelay(res, attempt) {
  const retryAfterHeader = res.headers.get('retry-after');
  if (retryAfterHeader) {
    const retryAfterSeconds = Number.parseInt(retryAfterHeader, 10);
    if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0) {
      const jitter = Math.floor(Math.random() * 150);
      return retryAfterSeconds * 1000 + jitter;
    }
  }
  const exponential = Math.min(4000, 500 * (2 ** attempt));
  const jitter = Math.floor(Math.random() * 250);
  return exponential + jitter;
}

async function notionFetch(token, endpoint, options = {}, retriesLeft = 4) {
  const gate = getNotionGate(token);
  await gate.acquire();

  try {
    let response;
    try {
      response = await fetch(`https://api.notion.com/v1${endpoint}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          'Notion-Version': NOTION_VERSION,
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
        signal: options.signal || AbortSignal.timeout(20_000),
      });
    } catch (err) {
      if (
          retriesLeft > 0 &&
          (err?.name === 'AbortError' ||
              err?.name === 'TimeoutError' ||
              err?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
              err?.code === 'UND_ERR_HEADERS_TIMEOUT' ||
              err?.code === 'UND_ERR_BODY_TIMEOUT')
      ) {
        const attempt = 4 - retriesLeft;
        const delay = 500 * (2 ** attempt) + Math.floor(Math.random() * 200);
        await sleep(Math.min(delay, 4000));
        return notionFetch(token, endpoint, options, retriesLeft - 1);
      }
      throw err;
    }

    if (
        (response.status === 429 ||
            response.status === 529 ||
            response.status === 502 ||
            response.status === 503 ||
            response.status === 504) &&
        retriesLeft > 0
    ) {
      const attempt = 4 - retriesLeft;
      const delay = getRetryDelay(response, attempt);
      await sleep(delay);
      return notionFetch(token, endpoint, options, retriesLeft - 1);
    }

    const json = await safeJson(response);
    if (!response.ok) {
      const err = new Error(json?.message || `Notion API error (${response.status})`);
      err.status = response.status;
      err.body = json;
      throw err;
    }
    return json;
  } finally {
    gate.release();
  }
}

// CACHE
const requestCache = new Map();

function cached(key, fn, ttl = CACHE_TTL_MS) {
  const now = Date.now();
  const hit = requestCache.get(key);
  if (hit && hit.expiresAt > now) return hit.promise;
  if (hit) requestCache.delete(key);

  const promise = Promise.resolve()
      .then(fn)
      .catch((err) => {
        requestCache.delete(key);
        throw err;
      });

  requestCache.set(key, { expiresAt: now + ttl, promise });
  return promise;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of requestCache.entries()) {
    if (entry.expiresAt <= now) requestCache.delete(key);
  }
}, 60_000).unref();

// TOKEN / CACHE KEYS
function tokenKey(token) {
  return crypto.createHash('sha256').update(token).digest('hex').slice(0, 16);
}

function scopedKey(token, prefix, id) {
  return `${prefix}:${tokenKey(token)}:${id}`;
}

// NOTION ID
function extractPageId(input) {
  if (!input) return null;
  const hex = input.trim().replace(/-/g, '');
  const match = hex.match(/[0-9a-fA-F]{32}(?=[^0-9a-fA-F]|$)/g);
  if (!match) return null;
  const id = match[match.length - 1];
  return [
    id.slice(0, 8),
    id.slice(8, 12),
    id.slice(12, 16),
    id.slice(16, 20),
    id.slice(20),
  ].join('-').toLowerCase();
}

// PAGE / BLOCKS
async function fetchChildrenBatch(token, blockId, cursor, pageSize = CHILDREN_PAGE_SIZE) {
  const params = new URLSearchParams({ page_size: String(pageSize) });
  if (cursor) params.set('start_cursor', cursor);
  const data = await notionFetch(token, `/blocks/${blockId}/children?${params.toString()}`);
  return {
    blocks: data.results || [],
    hasMore: Boolean(data.has_more),
    nextCursor: data.next_cursor || null,
  };
}

async function fetchAllDirectChildren(token, blockId) {
  const allBlocks = [];
  let cursor;
  do {
    const batch = await fetchChildrenBatch(token, blockId, cursor, CHILDREN_PAGE_SIZE);
    allBlocks.push(...batch.blocks);
    cursor = batch.hasMore ? batch.nextCursor : null;
  } while (cursor);
  return allBlocks;
}

// PAGE / DATABASE METADATA CACHE
async function getPageCached(token, pageId) {
  const key = scopedKey(token, 'page-meta', pageId);
  return cached(key, () => notionFetch(token, `/pages/${pageId}`), METADATA_CACHE_TTL_MS);
}

async function getDatabaseCached(token, databaseId) {
  const key = scopedKey(token, 'database-meta', databaseId);
  return cached(key, () => notionFetch(token, `/databases/${databaseId}`), METADATA_CACHE_TTL_MS);
}

async function getDataSourceCached(token, dataSourceId) {
  const key = scopedKey(token, 'datasource-meta', dataSourceId);
  return cached(key, () => notionFetch(token, `/data_sources/${dataSourceId}`), METADATA_CACHE_TTL_MS);
}

// DATABASE / DATA SOURCE
async function getDataSourceForDatabase(token, databaseId) {
  try {
    const db = await getDatabaseCached(token, databaseId);
    if (db.data_sources && db.data_sources.length > 0) {
      const dataSourceId = db.data_sources[0].id;
      const dataSource = await getDataSourceCached(token, dataSourceId);
      return { database: db, dataSource, dataSourceId };
    }
    return { database: db, dataSource: db, dataSourceId: databaseId };
  } catch (err) {
    console.error('Failed to get data source for database:', databaseId, err.message);
    return {
      database: { id: databaseId, properties: {} },
      dataSource: { id: databaseId, properties: {} },
      dataSourceId: databaseId,
    };
  }
}

// DATA SOURCE QUERY
async function queryDataSourcePages(
    token,
    dataSourceId,
    {
      sorts,
      pageSize = DATABASE_INITIAL_PAGE_SIZE,
      limit = null,
      filterProperties = null,
      fetchAll = false,
    } = {}
) {
  const defaultSorts = [{ timestamp: 'created_time', direction: 'ascending' }];
  const appliedSorts = sorts || defaultSorts;
  const pages = [];
  let cursor = null;

  while (true) {
    const currentPageSize = Math.min(pageSize, 100);
    const body = { page_size: currentPageSize, sorts: appliedSorts };
    if (cursor) body.start_cursor = cursor;

    const queryParams = new URLSearchParams();
    if (Array.isArray(filterProperties)) {
      for (const property of filterProperties) {
        queryParams.append('filter_properties[]', property);
      }
    }

    const queryString = queryParams.toString();
    const endpoint = `/data_sources/${dataSourceId}/query` + (queryString ? `?${queryString}` : '');

    try {
      const queryData = await notionFetch(token, endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      const results = queryData.results || [];
      pages.push(...results);

      if (limit !== null && pages.length >= limit) return pages.slice(0, limit);
      if (!fetchAll && results.length >= currentPageSize) return pages;
      if (!queryData.has_more || !queryData.next_cursor) return pages;

      cursor = queryData.next_cursor;
      if (pages.length >= 10_000) return pages;
    } catch (err) {
      console.error('Failed to query data source pages:', dataSourceId, err.message);
      return pages;
    }
  }
}

// DATABASE FULL HYDRATION
async function getAllDataSourcePages(token, dataSourceId, options = {}) {
  return queryDataSourcePages(token, dataSourceId, {
    ...options,
    pageSize: options.pageSize || DATABASE_FULL_PAGE_SIZE,
    fetchAll: true,
  });
}

// TITLE / ICON
function titleFromNotionObject(obj) {
  if (!obj) return 'Senza titolo';
  if (obj.object === 'page') {
    const props = obj.properties || {};
    const titleProp = Object.values(props).find((p) => p.type === 'title');
    const rich = titleProp?.title || [];
    const text = rich.map((t) => t.plain_text || '').join('').trim();
    return text || 'Senza titolo';
  }
  if (obj.object === 'database') {
    const text = (obj.title || []).map((t) => t.plain_text || '').join('').trim();
    return text || 'Database senza titolo';
  }
  return 'Senza titolo';
}

function iconFromNotionObject(obj) {
  const icon = obj?.icon;
  if (!icon) return null;
  if (icon.type === 'emoji') return { type: 'emoji', value: icon.emoji };
  if (icon.type === 'external') return { type: 'image', value: icon.external.url };
  if (icon.type === 'file') return { type: 'image', value: icon.file.url };
  return null;
}

// BREADCRUMBS CACHE
const pageTitleCache = new Map();
const pageParentCache = new Map();

function scopedMemoryKey(token, id) {
  return `${tokenKey(token)}:${id}`;
}

function setCachedTitle(token, id, title) {
  pageTitleCache.set(scopedMemoryKey(token, id), title);
}

function getCachedTitle(token, id) {
  return pageTitleCache.get(scopedMemoryKey(token, id));
}

function setCachedParent(token, id, parent) {
  pageParentCache.set(scopedMemoryKey(token, id), parent);
}

function getCachedParent(token, id) {
  return pageParentCache.get(scopedMemoryKey(token, id));
}

async function getParentPath(token, parentObj, depth = 0) {
  if (!parentObj || depth > 3 || parentObj.type === 'workspace') return '';
  const parentId = parentObj.page_id || parentObj.database_id;
  if (!parentId) return '';

  let cachedTitle = getCachedTitle(token, parentId);
  let nextParent = getCachedParent(token, parentId);

  if (cachedTitle) {
    if (!nextParent) return cachedTitle;
  } else {
    try {
      const parentEndpoint = parentObj.type === 'page_id' ? `/pages/${parentId}` : `/databases/${parentId}`;
      const parent = await notionFetch(token, parentEndpoint);
      cachedTitle = titleFromNotionObject(parent);
      setCachedTitle(token, parentId, cachedTitle);
      nextParent = parent.parent || null;
      if (nextParent) setCachedParent(token, parentId, nextParent);
    } catch (e) {
      return '';
    }
  }

  if (!nextParent) return cachedTitle || 'Senza titolo';
  const parentTitle = await getParentPath(token, nextParent, depth + 1);
  return parentTitle ? `${parentTitle} / ${cachedTitle}` : cachedTitle;
}

async function getBreadcrumbs(token, parentObj, depth = 0) {
  if (!parentObj || depth > 8 || parentObj.type === 'workspace') return [];
  const parentId = parentObj.page_id || parentObj.database_id;
  if (!parentId) return [];

  try {
    const isPage = parentObj.type === 'page_id';
    const parent = isPage ? await getPageCached(token, parentId) : await getDatabaseCached(token, parentId);

    setCachedTitle(token, parentId, titleFromNotionObject(parent));
    if (parent.parent) setCachedParent(token, parentId, parent.parent);

    const item = {
      id: parentId,
      title: titleFromNotionObject(parent),
      type: parent.object,
      icon: parent.icon || null,
      url: parent.url,
    };

    if (parent.parent) {
      const ancestors = await getBreadcrumbs(token, parent.parent, depth + 1);
      return [...ancestors, item];
    }
    return [item];
  } catch (err) {
    console.error('Failed to get breadcrumbs for', parentId, err.message);
    return [];
  }
}

// SEARCH
app.get('/api/notion/search', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'not_authenticated' });

  const q = (req.query.q || '').toString();
  try {
    const key = `search:${tokenKey(session.access_token)}:${q}`;
    const data = await cached(
        key,
        () =>
            notionFetch(session.access_token, '/search', {
              method: 'POST',
              body: JSON.stringify({
                query: q,
                sort: { direction: 'descending', timestamp: 'last_edited_time' },
                page_size: 20,
              }),
            }),
        SEARCH_CACHE_TTL_MS
    );

    const results = (data.results || []).map((obj) => {
      const title = titleFromNotionObject(obj);
      setCachedTitle(session.access_token, obj.id, title);
      if (obj.parent) setCachedParent(session.access_token, obj.id, obj.parent);

      let parentPath = '';
      if (obj.parent) {
        const parentId = obj.parent.page_id || obj.parent.database_id;
        if (parentId) {
          const cachedParentTitle = getCachedTitle(session.access_token, parentId);
          if (cachedParentTitle) {
            parentPath = cachedParentTitle;
            const grandParent = getCachedParent(session.access_token, parentId);
            if (grandParent) {
              const grandParentId = grandParent.page_id || grandParent.database_id;
              if (grandParentId) {
                const cachedGrandParentTitle = getCachedTitle(session.access_token, grandParentId);
                parentPath = cachedGrandParentTitle ? `${cachedGrandParentTitle} / ${parentPath}` : `... / ${parentPath}`;
              }
            }
          }
        }
      }

      return {
        id: obj.id,
        title,
        icon: iconFromNotionObject(obj),
        url: obj.url,
        last_edited_time: obj.last_edited_time,
        cover: obj.cover ? (obj.cover.type === 'external' ? obj.cover.external.url : obj.cover.file.url) : null,
        parent: obj.parent,
        parentPath: parentPath || (obj.parent && obj.parent.type !== 'workspace' ? '...' : ''),
        objectType: obj.object,
      };
    });

    res.json({ results });
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ error: err.body?.message || err.message });
  }
});

// USERS
app.get('/api/notion/users', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'not_authenticated' });

  try {
    const key = `users:${tokenKey(session.access_token)}`;
    const data = await cached(key, () => notionFetch(session.access_token, '/users'), USERS_CACHE_TTL_MS);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ error: err.body?.message || err.message });
  }
});

// FIRST PAINT PAGE
app.get('/api/notion/page', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'not_authenticated' });

  const { url } = req.query;
  const pageId = extractPageId(url);
  if (!pageId) {
    return res.status(400).json({ error: 'Non riesco a trovare un ID pagina Notion valido in quel testo/URL.' });
  }

  try {
    let page;
    let blocks = [];
    let hasMore = false;
    let nextCursor = null;

    try {
      page = await getPageCached(session.access_token, pageId);

      const [firstBatch, breadcrumbs] = await Promise.all([
        cached(
            scopedKey(session.access_token, 'children', `${pageId}:FIRST`),
            () => fetchChildrenBatch(session.access_token, pageId, undefined, FIRST_PAINT_PAGE_SIZE),
            CACHE_TTL_MS
        ),
        page.parent ? getBreadcrumbs(session.access_token, page.parent) : Promise.resolve([]),
      ]);

      blocks = firstBatch.blocks;
      hasMore = firstBatch.hasMore;
      nextCursor = firstBatch.nextCursor;

      const finalBreadcrumbs = [
        ...breadcrumbs,
        {
          id: pageId,
          title: titleFromNotionObject(page),
          type: page.object,
          icon: page.icon || null,
          url: page.url,
        },
      ];

      return res.json({
        page,
        pageId,
        blocks,
        hasMore,
        nextCursor,
        breadcrumbs: finalBreadcrumbs,
      });
    } catch (pageError) {
      const { database, dataSource, dataSourceId } = await getDataSourceForDatabase(session.access_token, pageId);

      const [pages, breadcrumbs] = await Promise.all([
        queryDataSourcePages(session.access_token, dataSourceId, {
          pageSize: DATABASE_INITIAL_PAGE_SIZE,
          limit: DATABASE_INITIAL_PAGE_SIZE,
        }),
        database.parent ? getBreadcrumbs(session.access_token, database.parent) : Promise.resolve([]),
      ]);

      setCachedTitle(session.access_token, pageId, titleFromNotionObject(database));

      const finalBreadcrumbs = [
        ...breadcrumbs,
        {
          id: pageId,
          title: titleFromNotionObject(database),
          type: database.object,
          icon: database.icon || null,
          url: database.url,
        },
      ];

      page = database;
      blocks = [
        {
          id: pageId,
          type: 'child_database',
          has_children: false,
          child_database: { title: titleFromNotionObject(database) },
          _database: dataSource,
          _pages: pages,
        },
      ];

      return res.json({
        page,
        pageId,
        blocks,
        hasMore: pages.length >= DATABASE_INITIAL_PAGE_SIZE,
        nextCursor: null,
        breadcrumbs: finalBreadcrumbs,
      });
    }
  } catch (err) {
    console.error('/api/notion/page error:', err);
    const message = err.status === 404
        ? 'Pagina o Database non trovato, o non è stato condiviso con questa integrazione Notion.'
        : err.body?.message || err.message;
    res.status(err.status || 500).json({ error: message });
  }
});

// CHILDREN / PROGRESSIVE LOADING
app.get('/api/notion/children', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'not_authenticated' });

  const { id, cursor } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing block id.' });

  try {
    const cacheKey = `children:${tokenKey(session.access_token)}:${id}:${cursor || 'FIRST'}`;
    const batch = await cached(
        cacheKey,
        () => fetchChildrenBatch(session.access_token, id, cursor || undefined, CHILDREN_PAGE_SIZE),
        CACHE_TTL_MS
    );
    res.json(batch);
  } catch (err) {
    console.error('/api/notion/children error:', err);
    res.status(err.status || 500).json({ error: err.body?.message || err.message });
  }
});

// PAGE PREVIEW
app.get('/api/notion/page-preview', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'not_authenticated' });

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing page id.' });

  try {
    const key = `preview:${tokenKey(session.access_token)}:${id}`;
    const data = await cached(
        key,
        async () => {
          let page;
          let isDatabase = false;
          let parentPath = '';
          let blocks = [];
          let database = null;
          let pages = [];

          try {
            page = await getPageCached(session.access_token, id);
            setCachedTitle(session.access_token, id, titleFromNotionObject(page));
            if (page.parent) setCachedParent(session.access_token, id, page.parent);

            const [blocksData, computedParentPath] = await Promise.all([
              notionFetch(session.access_token, `/blocks/${id}/children?page_size=${PREVIEW_PAGE_SIZE}`),
              page.parent ? getParentPath(session.access_token, page.parent) : Promise.resolve(''),
            ]);

            blocks = blocksData.results || [];
            parentPath = computedParentPath;
          } catch (e) {
            isDatabase = true;
            database = await getDatabaseCached(session.access_token, id);
            setCachedTitle(session.access_token, id, titleFromNotionObject(database));
            if (database.parent) setCachedParent(session.access_token, id, database.parent);

            const dsId = (database.data_sources && database.data_sources.length > 0)
                ? database.data_sources[0].id
                : id;

            const [queryData, computedParentPath] = await Promise.all([
              notionFetch(session.access_token, `/data_sources/${dsId}/query`, {
                method: 'POST',
                body: JSON.stringify({ page_size: PREVIEW_PAGE_SIZE }),
              }),
              database.parent ? getParentPath(session.access_token, database.parent) : Promise.resolve(''),
            ]);

            pages = queryData.results || [];
            parentPath = computedParentPath;
          }

          return { parentPath, isDatabase, blocks, database, pages };
        },
        PREVIEW_CACHE_TTL_MS
    );

    res.json(data);
  } catch (err) {
    console.error('/api/notion/page-preview error:', err);
    res.status(err.status || 500).json({ error: err.body?.message || err.message });
  }
});

// SUBTREE
async function getAllBlockChildren(token, blockId, depth = 0) {
  if (depth > 12) return [];
  let blocks = [];

  try {
    blocks = await fetchAllDirectChildren(token, blockId);
  } catch (e) {
    try {
      const { database, dataSource, dataSourceId } = await getDataSourceForDatabase(token, blockId);
      const pages = await getAllDataSourcePages(token, dataSourceId);
      return [
        {
          id: blockId,
          type: 'child_database',
          has_children: false,
          child_database: { title: titleFromNotionObject(database) },
          _database: dataSource,
          _pages: pages,
        },
      ];
    } catch (dbError) {
      return [];
    }
  }

  await Promise.all(
      blocks.map(async (block) => {
        const type = block.type;
        if (type === 'child_database') {
          try {
            const { dataSource, dataSourceId } = await getDataSourceForDatabase(token, block.id);
            const pages = await getAllDataSourcePages(token, dataSourceId);
            block._database = dataSource;
            block._pages = pages;
          } catch (err) {}
        } else if (block.has_children && type !== 'child_page') {
          block._children = await getAllBlockChildren(token, block.id, depth + 1);
        }
      })
  );

  return blocks;
}

app.get('/api/notion/subtree', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'not_authenticated' });

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing block id.' });

  try {
    const key = `subtree:${tokenKey(session.access_token)}:${id}`;
    const children = await cached(key, () => getAllBlockChildren(session.access_token, id), CACHE_TTL_MS);
    res.json({ id, children });
  } catch (err) {
    console.error('/api/notion/subtree error:', err);
    res.status(err.status || 500).json({ error: err.body?.message || err.message });
  }
});

// INTERNAL STATUS / DEBUG
app.get('/api/notion/debug/status', (req, res) => {
  res.json({
    notionVersion: NOTION_VERSION,
    firstPaintPageSize: FIRST_PAINT_PAGE_SIZE,
    childrenPageSize: CHILDREN_PAGE_SIZE,
    activeNotionGates: notionGates.size,
    cacheEntries: requestCache.size,
  });
});

// CLEAN SHUTDOWN
async function shutdown(signal) {
  console.log(`Received ${signal}. Shutting down...`);
  try {
    await globalKeepAliveAgent.close();
  } catch (err) {
    console.error('Failed to close Undici agent:', err);
  }
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// SERVER
app.listen(PORT, () => {
  console.log(`Notion Playground → http://localhost:${PORT}`);
  console.log(`Notion API version → ${NOTION_VERSION}`);
  console.log(`First paint → ${FIRST_PAINT_PAGE_SIZE} blocks`);
  console.log(`Progressive batches → ${CHILDREN_PAGE_SIZE} blocks`);
});