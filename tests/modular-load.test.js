const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function scriptSourcesFromIndex() {
  const html = fs.readFileSync('extension/index.html', 'utf8');
  return [...html.matchAll(/<script\s+[^>]*src="([^"]+)"/g)]
    .map(match => match[1])
    .filter(src => !src.includes('config.local.js'));
}

function listenerApi() {
  return { addListener() {} };
}

function makeContext() {
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
    LOCAL_LANDING_PAGE_PATTERNS: [
      { hostname: 'mail.google.com', pathPrefix: '/mail' },
    ],
    LOCAL_CUSTOM_GROUPS: [
      { hostnameEndsWith: '.example.com', groupKey: 'example-suite', groupLabel: 'Example Suite' },
    ],
  };
  context.window = context;
  return context;
}

const scriptSources = scriptSourcesFromIndex();

assert.deepStrictEqual(scriptSources.slice(0, 8), [
  'settings.js',
  'domain.js',
  'favorites.js',
  'icons.js',
  'tabs.js',
  'ui.js',
  'render.js',
  'app.js',
]);

const context = makeContext();
vm.createContext(context);

for (const src of scriptSources) {
  vm.runInContext(fs.readFileSync(`extension/${src}`, 'utf8'), context, { filename: src });
}

assert.strictEqual(context.friendlyDomain('accounts.binance.com'), 'Binance');

const groups = context.groupTabsByDomain([
  { id: 1, url: 'https://mail.google.com/mail/u/0/#inbox', title: 'Inbox', pinned: false, lastAccessed: 10 },
  { id: 2, url: 'https://app.example.com/a', title: 'Example A', pinned: false, lastAccessed: 30 },
  { id: 3, url: 'file:///tmp/readme.txt', title: 'Local', pinned: false, lastAccessed: 5 },
], {
  landingPagePatterns: context.getLandingPagePatterns(),
  customGroups: context.getCustomGroups(),
});

assert.strictEqual(groups[0].domain, '__landing-pages__');
assert(groups.some(group => group.domain === 'example-suite'));
assert(groups.some(group => group.domain === 'local-files'));

const deepseekGroups = context.groupTabsByDomain([
  { id: 10, url: 'https://api.deepseek.com/', title: 'DeepSeek API', pinned: false, lastAccessed: 10 },
  { id: 11, url: 'https://chat.deepseek.com/', title: 'DeepSeek Chat', pinned: false, lastAccessed: 20 },
  { id: 12, url: 'https://platform.deepseek.com/', title: 'DeepSeek Platform', pinned: false, lastAccessed: 30 },
]);

assert.strictEqual(deepseekGroups.length, 1);
assert.strictEqual(deepseekGroups[0].domain, 'deepseek.com');
assert.strictEqual(deepseekGroups[0].tabs.length, 3);

console.log('modular load test passed');
