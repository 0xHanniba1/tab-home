/* ================================================================
   tab-home — Language and Theme Settings

   User-facing strings, language persistence, and light/dark theme state.
   ================================================================ */

'use strict';

/* ----------------------------------------------------------------
   I18N — String table with simple t() lookup

   Values can be strings or functions (for pluralization / interpolation).
   Add a key once in both languages. Missing keys fall back to English.
   ---------------------------------------------------------------- */
const STRINGS = {
  en: {
    favorites: 'Favorites',
    add: 'Add', save: 'Save', cancel: 'Cancel', confirmOk: 'Confirm',
    uploadLogo: 'Upload logo (or paste image)', reset: 'Reset', auto: 'Auto',
    urlLabel: 'URL', titleLabel: 'Title',
    titlePlaceholder: 'Title (optional)',
    favoritesEmpty: 'Nothing pinned yet. Click + to add a URL, or star a tab on the left.',
    addAFavorite: 'Add a favorite',
    quickAccess: 'Quick Access',
    edit: 'Edit', remove: 'Remove', moreActions: 'More',
    rightNow: 'Right now', openTabs: 'Open tabs', pinned: 'Pinned',
    nTabsCount: (n) => `${n} tab${n !== 1 ? 's' : ''}`,
    homepages: 'Homepages',
    nDomains: (n) => `${n} domain${n !== 1 ? 's' : ''}`,
    nTabsOpen: (n) => `${n} tab${n !== 1 ? 's' : ''} open`,
    dupeBadge: (n) => `duplicate x ${n}`,
    closeAllN: (n) => `Close all ${n} tab${n !== 1 ? 's' : ''}`,
    closeDupes: 'Close duplicates',
    plusN: (n) => `+${n} more`,
    statTabs: 'Open tabs',
    addToFav: 'Add to favorites', removeFromFav: 'Remove from favorites',
    editTitle: 'Edit title',
    pinTip: 'Pin tab', unpinTip: 'Unpin tab',
    closeThisTab: 'Close this tab',
    nWolfyTabsOpen: 'tab-home tabs open', keepOne: 'Keep one',
    addedToFavorites: 'Added to favorites', removedFromFavorites: 'Removed from favorites',
    confirmRemoveFav: 'Remove this from favorites?',
    alreadyAdded: 'Already in favorites',
    saveFailed: 'Save failed (storage may be full)',
    favoriteUpdated: 'Favorite updated', tabClosed: 'Tab closed',
    titleUpdated: 'Title updated', titleReset: 'Title reset',
    allTabsClosed: 'All tabs closed. Fresh start.',
    closedExtras: 'Closed duplicate tab-home tabs',
    closedDupes: 'Closed duplicate tabs',
    closedNFromX: (n, name) => `Closed ${n} tab${n !== 1 ? 's' : ''} from ${name}`,
    tabs: 'tabs',
    langToggle: '中',
  },
  zh: {
    favorites: '收藏',
    add: '添加', save: '保存', cancel: '取消', confirmOk: '确定',
    uploadLogo: '上传图标（或粘贴图片）', reset: '重置', auto: '自动',
    urlLabel: '网址', titleLabel: '标题',
    titlePlaceholder: '标题（可选）',
    favoritesEmpty: '还没有收藏。点击 + 添加链接，或在左侧给标签页标星。',
    addAFavorite: '添加收藏',
    quickAccess: '快捷入口',
    edit: '编辑', remove: '删除', moreActions: '更多',
    rightNow: '正在打开', openTabs: '当前标签', pinned: '已固定',
    nTabsCount: (n) => `${n} 个标签`,
    homepages: '主页',
    nDomains: (n) => `${n} 个域名`,
    nTabsOpen: (n) => `已打开 ${n} 个`,
    dupeBadge: (n) => `重复 x ${n}`,
    closeAllN: (n) => `关闭全部 ${n} 个`,
    closeDupes: '关闭重复',
    plusN: (n) => `还有 ${n} 个`,
    statTabs: '已打开',
    addToFav: '加入收藏', removeFromFav: '移除收藏',
    editTitle: '编辑标题',
    pinTip: '固定此标签', unpinTip: '取消固定',
    closeThisTab: '关闭此标签',
    nWolfyTabsOpen: '个 tab-home 标签页', keepOne: '只保留一个',
    addedToFavorites: '已加入收藏', removedFromFavorites: '已从收藏移除',
    confirmRemoveFav: '确定要取消收藏此网址吗？',
    alreadyAdded: '已经收藏过了',
    saveFailed: '保存失败（存储可能已满）',
    favoriteUpdated: '收藏已更新', tabClosed: '标签已关闭',
    titleUpdated: '标题已更新', titleReset: '已恢复原标题',
    allTabsClosed: '所有标签已关闭。重新开始。',
    closedExtras: '已关闭重复的 tab-home',
    closedDupes: '已关闭重复的标签页',
    closedNFromX: (n, name) => `已从 ${name} 关闭 ${n} 个标签`,
    tabs: '个',
    langToggle: 'EN',
  },
};

let currentLang = 'en';

function t(key, ...args) {
  const v = (STRINGS[currentLang] && STRINGS[currentLang][key]) ?? STRINGS.en[key] ?? key;
  return typeof v === 'function' ? v(...args) : v;
}

async function loadLang() {
  try {
    const { lang } = await chrome.storage.local.get('lang');
    if (lang === 'zh' || lang === 'en') currentLang = lang;
  } catch {}
}

async function saveLang(lang) {
  if (lang !== 'zh' && lang !== 'en') return;
  currentLang = lang;
  try { await chrome.storage.local.set({ lang }); } catch {}
}


/* ----------------------------------------------------------------
   THEME — 'light' or 'dark', stored in chrome.storage.local
   ---------------------------------------------------------------- */
const ICON_SUN  = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" /></svg>`;
const ICON_MOON = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" /></svg>`;

async function loadTheme() {
  try {
    const { theme } = await chrome.storage.local.get('theme');
    const t = theme === 'light' ? 'light' : 'dark';
    document.documentElement.dataset.theme = t;
  } catch {
    document.documentElement.dataset.theme = 'dark';
  }
  paintThemeToggle();
}

function paintThemeToggle() {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  const isDark = document.documentElement.dataset.theme === 'dark';
  btn.innerHTML = isDark ? ICON_SUN : ICON_MOON;
}

async function toggleTheme() {
  const cur  = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  paintThemeToggle();
  try { await chrome.storage.local.set({ theme: next }); } catch {}
}

/**
 * applyStaticI18n()
 *
 * Updates the static labels in index.html that aren't otherwise
 * rebuilt by renderStaticDashboard. Called on init and on language switch.
 */
function applyStaticI18n() {
  document.documentElement.lang = currentLang === 'zh' ? 'zh' : 'en';

  const set = (selector, key, attr = 'textContent') => {
    const el = document.querySelector(selector);
    if (!el) return;
    if (attr === 'textContent') el.textContent = t(key);
    else el.setAttribute(attr, t(key));
  };

  // Header toggle button — shows the OTHER language as a hint to click
  set('#langToggle', 'langToggle');

  set('#quickAccessTitle', 'quickAccess');

  // Favorites column
  set('.favorites-column .section-header h2', 'favorites');
  set('#favoritesAddToggle', 'addAFavorite', 'title');
  set('#favoritesUrlLabel', 'urlLabel');
  set('#favoritesTitleLabel', 'titleLabel');
  set('#favoritesUrlInput', 'titlePlaceholder' /*unused below for url*/, 'placeholder'); // overridden next line
  const urlInput = document.getElementById('favoritesUrlInput');
  if (urlInput) urlInput.placeholder = 'https://...';
  set('#favoritesTitleInput', 'titlePlaceholder', 'placeholder');
  set('#favoritesLogoPlaceholder', 'auto');
  set('label[for="favoritesLogoInput"]', 'uploadLogo');
  set('.favorites-logo-reset', 'reset');
  set('#favoritesFormSubmit', 'add');
  set('.favorites-form-cancel', 'cancel');
  set('#favoritesFormDelete', 'remove');
  set('#favoritesEmpty', 'favoritesEmpty');

  // Open tabs section default title (overwritten by render when tabs exist)
  set('#openTabsSectionTitle', 'rightNow');

  // Footer stat
  set('.stat-label', 'statTabs');

  // tab-out duplicate banner — only the suffix and button label
  // (the count number lives in #tabOutDupeCount and is set by JS)
  const cleanupText = document.querySelector('.tab-cleanup-text');
  if (cleanupText) {
    // Rebuild: <strong id="tabOutDupeCount">N</strong> + suffix
    const strong = document.getElementById('tabOutDupeCount');
    const suffix = currentLang === 'zh' ? ` ${t('nWolfyTabsOpen')}` : ` ${t('nWolfyTabsOpen')}`;
    cleanupText.innerHTML = '';
    if (strong) cleanupText.appendChild(strong);
    cleanupText.appendChild(document.createTextNode(suffix));
  }
  set('.tab-cleanup-btn', 'keepOne');
}
