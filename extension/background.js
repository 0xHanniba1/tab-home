/**
 * background.js — Service Worker for Badge Updates
 *
 * Chrome's "always-on" background script for tab-out.
 * Its only job: keep the toolbar badge showing the current open tab count.
 *
 * Since we no longer have a server, we query chrome.tabs directly.
 * The badge counts real web tabs (skipping chrome:// and extension pages).
 *
 * Color coding gives a quick at-a-glance health signal:
 *   Green  (#3d7a4a) → 1–10 tabs  (focused, manageable)
 *   Amber  (#b8892e) → 11–20 tabs (getting busy)
 *   Red    (#b35a5a) → 21+ tabs   (time to cull!)
 */

// ─── Badge updater ────────────────────────────────────────────────────────────

const TAB_USAGE_STATS_KEY = 'tabUsageStats';
const TAB_USAGE_STATS_LIMIT = 200;
const TWO_PART_PUBLIC_SUFFIXES = ['co.uk', 'co.jp', 'com.cn', 'com.tw', 'com.au', 'com.hk', 'co.kr'];

function isTrackableTabUrl(url) {
  const value = String(url || '');
  return !!value && !(
    value.startsWith('chrome://') ||
    value.startsWith('chrome-extension://') ||
    value.startsWith('about:') ||
    value.startsWith('edge://') ||
    value.startsWith('brave://')
  );
}

function mainDomainFromHostname(hostname) {
  if (!hostname) return '';
  const host = String(hostname).toLowerCase().replace(/\.$/, '').replace(/^www\./, '');
  if (!host || host === 'localhost') return host;
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host) || host.includes(':')) return host;

  const parts = host.split('.').filter(Boolean);
  if (parts.length <= 2) return host;

  const suffix = parts.slice(-2).join('.');
  if (TWO_PART_PUBLIC_SUFFIXES.includes(suffix)) {
    return parts.length >= 3 ? parts.slice(-3).join('.') : host;
  }
  return parts.slice(-2).join('.');
}

function usageDomainFromUrl(url) {
  if (!isTrackableTabUrl(url)) return '';
  try {
    if (url.startsWith('file://')) return 'local-files';
    return mainDomainFromHostname(new URL(url).hostname);
  } catch {
    return '';
  }
}

function sanitizeTabUsageStats(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};

  const clean = {};
  for (const [domain, stat] of Object.entries(raw)) {
    const key = String(domain || '').trim();
    if (!key) continue;

    const count = typeof stat === 'number' ? stat : Number(stat && stat.count);
    const lastUsed = typeof stat === 'object' ? Number(stat.lastUsed || 0) : 0;
    if (!Number.isFinite(count) || count <= 0) continue;

    clean[key] = {
      count: Math.min(Math.floor(count), 1000000),
      lastUsed: Number.isFinite(lastUsed) && lastUsed > 0 ? lastUsed : 0,
    };
  }
  return clean;
}

function trimTabUsageStats(stats, limit = TAB_USAGE_STATS_LIMIT) {
  const entries = Object.entries(stats || {});
  if (entries.length <= limit) return stats;

  entries.sort(([, a], [, b]) => {
    const aLast = Number(a && a.lastUsed) || 0;
    const bLast = Number(b && b.lastUsed) || 0;
    if (aLast !== bLast) return bLast - aLast;
    return (Number(b && b.count) || 0) - (Number(a && a.count) || 0);
  });

  return Object.fromEntries(entries.slice(0, limit));
}

async function recordTabUsage(url) {
  const domain = usageDomainFromUrl(url);
  if (!domain) return;

  try {
    const { [TAB_USAGE_STATS_KEY]: raw = {} } = await chrome.storage.local.get(TAB_USAGE_STATS_KEY);
    const stats = sanitizeTabUsageStats(raw);
    const current = stats[domain] || { count: 0, lastUsed: 0 };
    stats[domain] = {
      count: Math.min((Number(current.count) || 0) + 1, 1000000),
      lastUsed: Date.now(),
    };
    await chrome.storage.local.set({ [TAB_USAGE_STATS_KEY]: trimTabUsageStats(stats) });
  } catch (err) {
    console.warn('[wolfy] tab usage tracking failed:', err);
  }
}

/**
 * updateBadge()
 *
 * Counts open real-web tabs and updates the extension's toolbar badge.
 * "Real" tabs = not chrome://, not extension pages, not about:blank.
 */
async function updateBadge() {
  try {
    const tabs = await chrome.tabs.query({});

    // Only count actual web pages — skip browser internals and extension pages
    const count = tabs.filter(t => {
      const url = t.url || '';
      return (
        !url.startsWith('chrome://') &&
        !url.startsWith('chrome-extension://') &&
        !url.startsWith('about:') &&
        !url.startsWith('edge://') &&
        !url.startsWith('brave://')
      );
    }).length;

    // Don't show "0" — an empty badge is cleaner
    await chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });

    if (count === 0) return;

    // Pick badge color based on workload level
    let color;
    if (count <= 10) {
      color = '#3d7a4a'; // Green — you're in control
    } else if (count <= 20) {
      color = '#b8892e'; // Amber — things are piling up
    } else {
      color = '#b35a5a'; // Red — time to focus and close some tabs
    }

    await chrome.action.setBadgeBackgroundColor({ color });

  } catch {
    // If something goes wrong, clear the badge rather than show stale data
    chrome.action.setBadgeText({ text: '' });
  }
}

// ─── Event listeners ──────────────────────────────────────────────────────────

// Update badge when the extension is first installed
chrome.runtime.onInstalled.addListener(() => {
  updateBadge();
  // Register the right-click menu items. (Re-registers on every install/upgrade
  // — that's the recommended pattern for service-worker extensions.)
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id:       'wolfy-favorite-page',
      title:    'Add page to tab-home favorites',
      contexts: ['page'],
    });
    chrome.contextMenus.create({
      id:       'wolfy-favorite-link',
      title:    'Add link to tab-home favorites',
      contexts: ['link'],
    });
  });
});

// ─── Right-click handler — save URL to favorites ─────────────────────────────
// Tiny brand-name extractor (mirrors friendlyDomain in domain.js for the
// background-script context, where we don't share helpers).
function brandFromUrl(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    const parts = host.split('.');
    const TLDS_2 = ['co.uk', 'co.jp', 'com.cn', 'com.tw', 'com.au', 'com.hk', 'co.kr'];
    let brand;
    if (parts.length >= 3 && TLDS_2.includes(parts.slice(-2).join('.'))) {
      brand = parts[parts.length - 3];
    } else if (parts.length >= 2) {
      brand = parts[parts.length - 2];
    } else {
      brand = parts[0];
    }
    return brand ? brand.charAt(0).toUpperCase() + brand.slice(1) : url;
  } catch { return url; }
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  let url;
  if (info.menuItemId === 'wolfy-favorite-page') {
    url = tab && tab.url;
  } else if (info.menuItemId === 'wolfy-favorite-link') {
    url = info.linkUrl;
  } else {
    return;
  }

  if (!url) return;
  const title = brandFromUrl(url);
  // Skip browser-internal pages
  if (url.startsWith('chrome://') ||
      url.startsWith('chrome-extension://') ||
      url.startsWith('about:') ||
      url.startsWith('edge://') ||
      url.startsWith('brave://')) {
    return;
  }

  try {
    const { favorites = [] } = await chrome.storage.local.get('favorites');
    if (favorites.some(f => f.url === url)) return;
    // Place at the first free slot — no upper bound.
    const taken = new Set(favorites.map(f => f.slot));
    let slot = 0;
    while (taken.has(slot)) slot++;
    favorites.push({
      id:      Date.now().toString(),
      url,
      title:   title || url,
      addedAt: new Date().toISOString(),
      slot,
    });
    await chrome.storage.local.set({ favorites });
  } catch (err) {
    console.warn('[wolfy] context menu favorite failed:', err);
  }
});

// Update badge when Chrome starts up
chrome.runtime.onStartup.addListener(() => {
  updateBadge();
});

// Update badge whenever a tab is opened
chrome.tabs.onCreated.addListener(() => {
  updateBadge();
});

// Update badge whenever a tab is closed
chrome.tabs.onRemoved.addListener(() => {
  updateBadge();
});

// Update badge when a tab's URL changes (e.g. navigating to/from chrome://)
chrome.tabs.onUpdated.addListener(() => {
  updateBadge();
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    await recordTabUsage(tab && tab.url);
  } catch {}
});

chrome.tabs.onUpdated.addListener(async (_tabId, changeInfo, tab) => {
  if (!changeInfo || !changeInfo.url) return;
  if (tab && !tab.active) return;
  await recordTabUsage(changeInfo.url || (tab && tab.url));
});

// ─── Initial run ─────────────────────────────────────────────────────────────

// Run once immediately when the service worker first loads
updateBadge();
