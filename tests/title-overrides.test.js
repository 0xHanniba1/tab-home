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

function loadApp() {
  const storage = { favorites: [] };
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
          get: async (keys) => {
            if (!keys) return { ...storage };
            if (typeof keys === 'string') return { [keys]: storage[keys] };
            if (Array.isArray(keys)) {
              return Object.fromEntries(keys.map(key => [key, storage[key]]));
            }
            return Object.fromEntries(Object.keys(keys).map(key => [
              key,
              storage[key] ?? keys[key],
            ]));
          },
          set: async (values) => { Object.assign(storage, values); },
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
    _testStorage: storage,
  };
  context.window = context;
  vm.createContext(context);
  for (const src of scriptSourcesFromIndex()) {
    vm.runInContext(fs.readFileSync(`extension/${src}`, 'utf8'), context, { filename: src });
  }
  return context;
}

(async () => {
  const app = loadApp();
  const url = 'https://flow2.me/app';

  assert.strictEqual(typeof app.getTabTitleOverrides, 'function');
  assert.strictEqual(typeof app.setTabTitleOverride, 'function');
  assert.strictEqual(typeof app.resolveTabDisplayTitle, 'function');

  await app.setTabTitleOverride(url, '  WenDora AI Admin  ');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(app._testStorage.tabTitleOverrides)), {
    [url]: 'WenDora AI Admin',
  });

  const overrides = await app.getTabTitleOverrides();
  assert.strictEqual(overrides[url], 'WenDora AI Admin');

  const tab = { id: 42, url, title: 'Original Page Title', pinned: false };
  assert.strictEqual(
    app.resolveTabDisplayTitle(tab, 'flow2.me', overrides),
    'WenDora AI Admin',
  );

  const html = app.renderTabChip(tab, { groupDomain: 'flow2.me', titleOverrides: overrides });
  assert(html.includes('data-action="edit-tab-title"'), 'tab chip should expose title editing');
  assert(html.includes('WenDora AI Admin'), 'tab chip should render the custom title');
  assert(html.includes('data-tab-title="WenDora AI Admin"'), 'tab actions should carry the custom title');

  await app.setTabTitleOverride(url, '   ');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(app._testStorage.tabTitleOverrides)), {});
  assert.strictEqual(
    app.resolveTabDisplayTitle(tab, 'flow2.me', await app.getTabTitleOverrides()),
    'Original Page Title',
  );

  console.log('title override tests passed');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
