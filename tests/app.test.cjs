const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInContext, createContext } = require('node:vm');
const { webcrypto } = require('node:crypto');
const path = require('node:path');

const root = path.join(__dirname, '..');
function app(overrides = {}) {
  const data = new Map();
  const context = createContext({
    URL, TextEncoder, Uint8Array, crypto: webcrypto, AbortController,
    setTimeout, clearTimeout, console,
    localStorage: {
      getItem: key => data.get(key) ?? null,
      setItem: (key, value) => data.set(key, String(value)),
      removeItem: key => data.delete(key),
    },
    ...overrides,
  });
  const load = file => runInContext(readFileSync(path.join(root, file), 'utf8'), context);
  const run = code => runInContext(code, context);
  load('JS/storage.js');
  return { context, data, load, run };
}
const item = id => ({ _id: id, title: `Item ${id}`, link: `https://example.com/${id}`, created: '2026-01-01' });
const ok = items => ({ ok: true, json: async () => ({ result: true, items }) });
function favorites(overrides = {}) {
  const env = app(overrides);
  env.run('let token = "test-token"; const grid = { setAttribute() {}, replaceChildren() {} }; let renders = 0; let status = ""; function renderFavorites() { renders++; } function setStatus(message) { status = message; }');
  env.load('JS/fetch.js');
  return env;
}

test('pagination loads more than 100 favorites without a count field', async () => {
  const pages = [];
  const env = favorites({ fetch: async url => {
    const page = Number(new URL(url).searchParams.get('page'));
    pages.push(page);
    return ok(Array.from({ length: page < 3 ? 50 : 7 }, (_, n) => item(page * 50 + n)));
  } });
  assert.equal((await env.run('fetchAllFavoriteItems()')).length, 157);
  assert.deepEqual(pages, [0, 1, 2, 3]);
});

test('exact page multiples terminate on the empty page', async () => {
  let calls = 0;
  const env = favorites({ fetch: async () => ok(calls++ === 0 ? Array.from({ length: 50 }, (_, n) => item(n)) : []) });
  assert.equal((await env.run('fetchAllFavoriteItems()')).length, 50);
  assert.equal(calls, 2);
});

test('pagination rejects repeated full pages instead of looping forever', async () => {
  const env = favorites({ fetch: async () => ok(Array.from({ length: 50 }, (_, n) => item(n))) });
  await assert.rejects(env.run('fetchAllFavoriteItems()'), /pagination/);
});

test('a failed page never replaces a complete cached list with partial results', async () => {
  let calls = 0;
  const env = favorites({ fetch: async () => calls++ === 0 ? ok(Array.from({ length: 50 }, (_, n) => item(n))) : { ok: false, status: 429 } });
  env.run('favoriteItems = [{link:"https://cached.example"}];');
  await env.run('refreshFavorites()');
  assert.equal(env.run('favoriteItems[0].link'), 'https://cached.example');
  assert.match(env.run('status'), /enregistrés restent affichés/);
});

test('concurrent refreshes share one request and render once', async () => {
  let calls = 0;
  const env = favorites({ fetch: async () => { calls++; return ok([item(1)]); } });
  const first = env.run('refreshFavorites()');
  const second = env.run('refreshFavorites()');
  assert.equal(first, second);
  await Promise.all([first, second]);
  assert.equal(calls, 1);
  assert.equal(env.run('renders'), 1);
});

test('unchanged network data preserves existing cards', async () => {
  const env = favorites({ fetch: async () => ok([item(1)]) });
  await env.run('refreshFavorites()');
  await env.run('refreshFavorites()');
  assert.equal(env.run('renders'), 1);
});

test('usage sorting reads storage once and falls back to creation date', () => {
  let reads = 0;
  const env = favorites({ localStorage: { getItem() { reads++; return '{"https://a.example":4}'; } } });
  const links = env.run('sortByUsage([{link:"https://b.example",created:"2026-01-02"},{link:"https://c.example",created:"2026-01-01"},{link:"https://a.example",created:"2025-01-01"}]).map(item=>item.link)');
  assert.deepEqual(Array.from(links), ['https://a.example', 'https://b.example', 'https://c.example']);
  assert.equal(reads, 1);
});

test('malformed usage data and unavailable storage do not break the app', () => {
  for (const value of ['{bad json', '[]', '42', 'null']) {
    const env = favorites();
    env.data.set('favoriteUsageCounts', value);
    env.run('recordUsage("https://example.com");');
    assert.equal(JSON.parse(env.data.get('favoriteUsageCounts'))['https://example.com'], 1);
  }
  const env = favorites({ localStorage: { getItem() { throw Error('blocked'); }, setItem() { throw Error('quota'); } } });
  assert.doesNotThrow(() => env.run('recordUsage("https://example.com"); sortByUsage([]);'));
});

test('warm cache restores bookmarks only for the same token', async () => {
  const env = favorites({ fetch: async () => ok([item(1)]) });
  await env.run('restoreFavoritesCache()');
  await env.run('refreshFavorites()');
  assert.equal(env.data.get('raindropFavoritesCacheV1').includes('test-token'), false);
  env.run('favoriteItems = null;');
  await env.run('restoreFavoritesCache()');
  assert.equal(env.run('favoriteItems.length'), 1);
  env.run('token = "another-token"; favoriteItems = null;');
  await env.run('restoreFavoritesCache()');
  assert.equal(env.run('favoriteItems'), null);
  assert.equal(env.data.has('raindropFavoritesCacheV1'), false);
});

test('expired cache is discarded', async () => {
  const env = favorites({ fetch: async () => ok([item(1)]) });
  await env.run('restoreFavoritesCache();');
  env.run('storage.set(FAVORITES_CACHE_KEY, JSON.stringify({owner:cacheOwner, savedAt:Date.now()-CACHE_MAX_AGE-1,items:[]}));');
  await env.run('restoreFavoritesCache()');
  assert.equal(env.run('favoriteItems'), null);
});

test('401 clears cached bookmarks and exposes a recovery message', async () => {
  const env = favorites({ fetch: async () => ({ ok: false, status: 401 }) });
  env.run('favoriteItems = []; storage.set(FAVORITES_CACHE_KEY,"cached");');
  await env.run('refreshFavorites()');
  assert.equal(env.run('favoriteItems'), null);
  assert.equal(env.data.has('raindropFavoritesCacheV1'), false);
  assert.match(env.run('status'), /Token invalide/);
});

test('malformed API responses fail with an actionable message', async () => {
  const env = favorites({ fetch: async () => ({ok:true,json:async()=>({result:false})}) });
  await assert.rejects(env.run('fetchAllFavoriteItems()'), /Réponse Raindrop invalide/);
});

test('timeout aborts the request and clears its timer', async () => {
  let callback;
  let cleared = false;
  const env = favorites({
    setTimeout: fn => { callback = fn; return 1; },
    clearTimeout: () => { cleared = true; },
    fetch: (url, {signal}) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(Object.assign(new Error(), {name:'AbortError'})))),
  });
  const request = env.run('fetchAllFavoriteItems()');
  callback();
  await assert.rejects(request, /trop de temps/);
  assert.equal(cleared, true);
});

test('favicon fallback removes CORS before Google and restores it before Vemetric', () => {
  for (const googleFirst of [false, true]) {
    const env = app();
    env.data.set('googleFaviconPriority', String(googleFirst));
    env.load('JS/favicons.js');
    env.run('function colorizeIconBackground() { throw Error("Google must not use canvas"); }');
    const handlers = {};
    const image = { dataset: {}, crossOrigin: null, addEventListener: (event, callback) => handlers[event] = callback, removeAttribute() { this.crossOrigin = null; } };
    env.context.image = image;
    env.run('loadFavicon(image,"https://example.com/page")');
    assert.equal(image.crossOrigin, googleFirst ? null : 'anonymous');
    if (googleFirst) handlers.load();
    handlers.error();
    assert.equal(image.crossOrigin, googleFirst ? 'anonymous' : null);
    if (!googleFirst) handlers.load();
    handlers.error();
    assert.match(image.src, /^data:image\/svg/);
    const final = image.src;
    handlers.error();
    assert.equal(image.src, final);
  }
});

test('cancelled prompt leaves token absent and malformed paths do not throw', () => {
  const env = app({ window: { location: { pathname: '/%invalid' }, prompt: () => null } });
  env.load('token.js');
  assert.equal(env.run('token'), null);
});

test('legacy URL token is saved and removed from the address bar', () => {
  const token = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  let clean;
  const env = app({ window: { location: { pathname: `/Raindrop-HomePage/${token}/`, search:'', hash:'' }, history: {replaceState: (_, __, path) => clean = path} } });
  env.load('token.js');
  assert.equal(env.run('token'), token);
  assert.equal(clean, '/Raindrop-HomePage/');
});

test('rendering uses safe URLs and text nodes for untrusted bookmark data', () => {
  class Element {
    constructor(tag) { this.tag = tag; this.children = []; this.dataset = {}; this.attrs = {}; }
    append(...nodes) { this.children.push(...nodes); }
    setAttribute(key, value) { this.attrs[key] = value; }
    addEventListener() {}
  }
  const env = app({ document: {getElementById: () => new Element('div'), createElement: tag => new Element(tag)} });
  env.load('JS/inserthtml.js');
  assert.equal(env.run('createCard({link:"javascript:alert(1)",title:"unsafe"}, true)'), null);
  assert.equal(env.run('createCard({link:"data:text/html,unsafe"}, true)'), null);
  const card = env.run('createCard({link:"https://example.com",title:"<img onerror=alert(1)>",cover:"javascript:alert(1)"}, true)');
  assert.equal(card.children[0].children[0].children.length, 0);
  assert.equal(card.children[0].children[1].textContent, '<img onerror=alert(1)>');
  assert.equal(card.attrs['aria-label'], '<img onerror=alert(1)>');
});

test('view changes reuse data and restore the persisted switch state', () => {
  const listeners = {};
  const elements = Object.fromEntries(['switch','change-token','priority'].map(key=>[key,{checked:false,addEventListener:(event,fn)=>listeners[key]=fn}]));
  const env = app({ document:{getElementById:id=>elements[id],querySelector:()=>elements.priority} });
  env.data.set('switch','on');
  env.run('let token = null; let renderCount = 0; function renderFavorites(){renderCount++;} function setStatus(){} function updateFaviconPriorityIndicator(){} function toggleFaviconPriority(){}');
  env.load('JS/toggle.js');
  assert.equal(elements.switch.checked, true);
  elements.switch.checked = false;
  listeners.switch();
  assert.equal(env.run('renderCount'), 1);
  assert.equal(env.data.get('switch'), 'off');
});

test('HTML has deferred local scripts and disallows inline script execution', () => {
  for (const file of ['index.html','404.html']) {
    const html = readFileSync(path.join(root,file),'utf8');
    assert.match(html, /script-src 'self';/);
    assert.doesNotMatch(html, /fontawesome|onerror=|<script>/);
    const scripts = [...html.matchAll(/<script([^>]+)>/g)];
    assert.equal(scripts.length, 7);
    assert.ok(scripts.every(([,attrs])=>attrs.includes('defer') && !attrs.includes('https:')));
  }
});
