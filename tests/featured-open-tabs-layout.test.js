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

assert.strictEqual(typeof app.renderOpenTabGroups, 'function', 'open tab groups should have a layout renderer');

function makeTabs(domain, count, idStart = 1) {
  return Array.from({ length: count }, (_, idx) => ({
    id: idStart + idx,
    url: `https://${domain}/page-${idx + 1}`,
    title: `${domain} ${idx + 1}`,
    pinned: false,
  }));
}

const html = app.renderOpenTabGroups([
  {
    domain: 'github.com',
    tabs: makeTabs('github.com', 4, 1),
  },
  {
    domain: 'dingtalk.com',
    tabs: makeTabs('dingtalk.com', 3, 20),
  },
  {
    domain: 'notion.so',
    tabs: makeTabs('notion.so', 10, 40),
  },
  {
    domain: 'claude.ai',
    tabs: makeTabs('claude.ai', 2, 80),
  },
], new Set(), {});

const featuredStart = html.indexOf('class="featured-open-tabs"');
const regularStart = html.indexOf('class="regular-open-tabs"');
const dingtalkCard = html.indexOf('data-domain-id="domain-dingtalk-com"');
const githubCard = html.indexOf('data-domain-id="domain-github-com"');
const notionCard = html.indexOf('data-domain-id="domain-notion-so"');

assert(html.includes('open-tabs-layout has-featured-domains'), 'featured domains should use a split layout wrapper');
assert(featuredStart !== -1, 'featured column should exist');
assert(regularStart !== -1, 'regular column should exist');
assert(featuredStart < notionCard && notionCard < regularStart, 'the dominant open-tab group should render in the featured column');
assert(regularStart < githubCard, 'non-featured domains should stay in the regular grid');
assert(regularStart < dingtalkCard, 'Dingtalk should not be featured unless it is the dominant group');

const balancedHtml = app.renderOpenTabGroups([
  {
    domain: 'github.com',
    tabs: makeTabs('github.com', 4, 100),
  },
  {
    domain: 'claude.ai',
    tabs: makeTabs('claude.ai', 3, 120),
  },
], new Set(), {});

assert(!balancedHtml.includes('open-tabs-layout has-featured-domains'), 'balanced small groups should keep the original grid');

const css = fs.readFileSync('extension/style.css', 'utf8');
assert(ruleBody(css, '.missions.has-featured-open-tabs').includes('display: block'), 'outer grid should yield to the split layout');
assert(ruleBody(css, '.open-tabs-layout').includes('repeat(4, minmax(0, 1fr))'), 'split layout should preserve the original four equal columns');
assert(ruleBody(css, '.regular-open-tabs').includes('grid-column: 2 / -1'), 'regular domains should occupy columns 2-4');
assert(ruleBody(css, '.regular-open-tabs').includes('display: grid'), 'regular domains should remain a grid');
assert(ruleBody(css, '.regular-open-tabs').includes('repeat(3, minmax(0, 1fr))'), 'regular domains should align to the remaining three original columns');
assert(ruleBody(css, '.regular-open-tabs').includes('align-items: stretch'), 'regular domain rows should keep the original equal-height alignment');

console.log('featured open tabs layout test passed');
