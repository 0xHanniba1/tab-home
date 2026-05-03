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

function ruleBody(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`, 'm'));
  assert(match, `${selector} rule should exist`);
  return match[1];
}

const app = loadApp();

const html = app.renderDomainCard({
  domain: 'google.com',
  tabs: [
    { id: 1, url: 'https://google.com/a', title: 'First Google tab', pinned: false },
    { id: 2, url: 'https://google.com/b', title: 'Second Google tab', pinned: false },
    { id: 3, url: 'https://google.com/c', title: 'Third Google tab', pinned: false },
    { id: 4, url: 'https://google.com/d', title: 'Fourth Google tab', pinned: false },
  ],
});

const visibleHtml = html.slice(0, html.indexOf('page-chips-overflow'));
assert.strictEqual((visibleHtml.match(/data-action="focus-tab"/g) || []).length, 2);
assert(html.includes('+2 more'), 'card should collapse tabs after two visible rows');

const css = fs.readFileSync('extension/style.css', 'utf8');
const missions = ruleBody(css, '.missions');
assert(missions.includes('display: grid'), 'open tab cards should use grid instead of masonry columns');
assert(missions.includes('grid-template-columns'), 'open tab grid should define responsive columns');

const missionCard = ruleBody(css, '.mission-card');
assert(!missionCard.includes('margin-bottom: 12px'), 'grid gap should control vertical spacing');

console.log('open tabs density test passed');
