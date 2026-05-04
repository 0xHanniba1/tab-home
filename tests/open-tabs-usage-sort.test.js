const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function listenerApi() {
  return {
    listeners: [],
    addListener(fn) { this.listeners.push(fn); },
  };
}

function makeDomainContext() {
  return {
    console,
    URL,
    LOCAL_LANDING_PAGE_PATTERNS: [],
    LOCAL_CUSTOM_GROUPS: [],
  };
}

function makeBackgroundContext() {
  const storage = {};
  const onActivated = listenerApi();
  const onUpdated = listenerApi();
  return {
    console,
    URL,
    Date,
    chrome: {
      action: {
        setBadgeText: async () => {},
        setBadgeBackgroundColor: async () => {},
      },
      contextMenus: {
        create: () => {},
        removeAll: (cb) => cb && cb(),
        onClicked: listenerApi(),
      },
      runtime: {
        id: 'test-extension',
        onInstalled: listenerApi(),
        onStartup: listenerApi(),
      },
      storage: {
        local: {
          get: async (key) => ({ [key]: storage[key] }),
          set: async (value) => Object.assign(storage, value),
        },
      },
      tabs: {
        query: async () => [{ url: 'https://github.com/0xHanniba1/tab-home' }],
        get: async (tabId) => ({
          id: tabId,
          url: tabId === 2 ? 'https://www.google.com/search?q=tab-home' : 'https://github.com/0xHanniba1/tab-home',
        }),
        onActivated,
        onCreated: listenerApi(),
        onRemoved: listenerApi(),
        onUpdated,
      },
    },
    __storage: storage,
  };
}

const context = makeDomainContext();
vm.createContext(context);
vm.runInContext(fs.readFileSync('extension/domain.js', 'utf8'), context, { filename: 'domain.js' });

const groups = context.groupTabsByDomain([
  { id: 1, url: 'https://github.com/0xHanniba1/tab-home', title: 'Repo', lastAccessed: 10 },
  { id: 2, url: 'https://www.google.com/search?q=tab-home', title: 'Search', lastAccessed: 100 },
], {
  usageStats: {
    'github.com': { count: 9, lastUsed: 900 },
    'google.com': { count: 1, lastUsed: 1000 },
  },
});

assert.strictEqual(groups[0].domain, 'github.com', 'frequently used open-tab groups should sort before merely recent groups');

(async () => {
  const background = makeBackgroundContext();
  vm.createContext(background);
  vm.runInContext(fs.readFileSync('extension/background.js', 'utf8'), background, { filename: 'background.js' });

  const [onActivated] = background.chrome.tabs.onActivated.listeners;
  const onUsageUpdated = background.chrome.tabs.onUpdated.listeners.find(fn => fn.length >= 2);
  assert.strictEqual(typeof onActivated, 'function', 'background should listen for tab activation usage');
  assert.strictEqual(typeof onUsageUpdated, 'function', 'background should listen for active-tab URL changes');

  await onActivated({ tabId: 1 });
  await onActivated({ tabId: 1 });
  await onActivated({ tabId: 2 });
  await onUsageUpdated(3, { url: 'https://news.ycombinator.com/' }, { active: false });
  await onUsageUpdated(4, { url: 'https://x.com/home' }, { active: true });
  const stats = background.__storage.tabUsageStats;

  assert.strictEqual(stats['github.com'].count, 2, 'tab usage should accumulate by main domain');
  assert.strictEqual(stats['google.com'].count, 1, 'www subdomains should normalize to the main domain');
  assert.strictEqual(stats['news.ycombinator.com'], undefined, 'background URL changes should not count as active usage');
  assert.strictEqual(stats['x.com'].count, 1, 'active-tab URL changes should count toward usage');
  assert(stats['github.com'].lastUsed > 0, 'tab usage should record last-used time');

  console.log('open tabs usage sort test passed');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
