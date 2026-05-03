const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function listenerApi() {
  return { addListener() {} };
}

function scriptSourcesFromIndex() {
  const html = fs.readFileSync('extension/index.html', 'utf8');
  return [...html.matchAll(/<script\s+[^>]*src="([^"]+)"/g)]
    .map(match => match[1])
    .filter(src => !src.includes('config.local.js'));
}

function loadApp() {
  const context = {
    console,
    setTimeout,
    clearTimeout,
    URL,
    Date,
    Intl,
    Map,
    Set,
    HTMLImageElement: class HTMLImageElement {},
    FileReader: class FileReader {},
    performance: { now: () => 0 },
    document: {
      documentElement: { dataset: {} },
      body: {
        appendChild() {},
        classList: { add() {}, remove() {} },
      },
      addEventListener() {},
      removeEventListener() {},
      createElement() {
        return {
          style: {},
          dataset: {},
          classList: { add() {}, remove() {}, contains() { return false; } },
          remove() {},
          appendChild() {},
          setAttribute() {},
          getBoundingClientRect() {
            return { width: 0, height: 0, left: 0, right: 0, top: 0, bottom: 0 };
          },
        };
      },
      createTextNode(text) {
        return { textContent: text };
      },
      getElementById() { return null; },
      querySelector() { return null; },
      querySelectorAll() { return []; },
    },
    window: {},
    chrome: {
      runtime: {
        id: 'test-extension',
        getURL: (path) => `chrome-extension://test-extension${path}`,
      },
      storage: {
        local: {
          get: async () => ({ favorites: [] }),
          set: async () => {},
        },
        onChanged: listenerApi(),
      },
      tabs: {
        query: async () => [],
        remove: async () => {},
        update: async () => {},
        get: async () => ({ id: 1, windowId: 1, pinned: false }),
        onCreated: listenerApi(),
        onRemoved: listenerApi(),
        onUpdated: listenerApi(),
        onMoved: listenerApi(),
        onActivated: listenerApi(),
      },
      windows: {
        getCurrent: async () => ({ id: 1 }),
        update: async () => {},
      },
    },
  };
  context.window = context;
  vm.createContext(context);
  for (const src of scriptSourcesFromIndex()) {
    vm.runInContext(fs.readFileSync(`extension/${src}`, 'utf8'), context, { filename: src });
  }
  return context;
}

const app = loadApp();

{
  const candidates = Array.from(app.getFaviconFallbackChain('https://www.cloudflare.com/products', 128));
  assert.deepStrictEqual(candidates, [
    'https://www.cloudflare.com/apple-touch-icon.png',
    'https://www.cloudflare.com/apple-touch-icon-precomposed.png',
    'chrome-extension://test-extension/_favicon/?pageUrl=https%3A%2F%2Fwww.cloudflare.com%2Fproducts&size=128',
  ]);
}

{
  const githubIcon = app.getFaviconUrl('https://github.com/0xHannibal', 32);
  assert.strictEqual(githubIcon, 'https://github.githubassets.com/favicons/favicon.svg');

  const html = app.renderTabChip({
    id: 42,
    url: 'https://github.com/0xHannibal',
    title: '0xHannibal (Kerwin)',
    pinned: false,
  });
  assert(html.includes(githubIcon), 'GitHub tab chips should use the stable GitHub favicon');
}

{
  const cachedIcon = 'data:image/png;base64,CACHED';
  const html = app.renderFavoriteItem({
    id: 'fav-cloudflare',
    url: 'https://www.cloudflare.com',
    title: 'Cloudflare',
    iconUrl: cachedIcon,
  });

  assert(html.includes(cachedIcon), 'cached iconUrl should be used directly');
  assert(!html.includes('iconCacheVersion'), 'rendered favorite should not depend on cache versions');
}

console.log('icon resolution tests passed');
