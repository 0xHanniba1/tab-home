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

assert.strictEqual(typeof app.renderPinnedTabsList, 'function');

const groups = [
  {
    domain: 'github.com',
    tabs: [
      { id: 1, url: 'https://github.com/kerwin/project', title: 'kerwin/project', pinned: true },
      { id: 2, url: 'https://github.com/mcncarl/yichen-skills', title: 'mcncarl/yichen-skills', pinned: true },
    ],
  },
  {
    domain: 'claude.ai',
    tabs: [
      { id: 3, url: 'https://claude.ai/project', title: 'tab-home 设计', pinned: true },
    ],
  },
];

const html = app.renderPinnedTabsList(groups, new Set(), {});

assert(html.includes('class="pinned-tab-list"'), 'pinned output should use a compact list container');
assert(!html.includes('mission-card'), 'pinned output should not render full domain cards');
assert.strictEqual((html.match(/class="page-chip/g) || []).length, 3);
assert(html.includes('data-action="pin-tab"'), 'pinned rows should still expose unpin action');
assert(html.includes('data-action="close-single-tab"'), 'pinned rows should still expose close action');

console.log('pinned list render test passed');
