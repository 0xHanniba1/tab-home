/* ================================================================
   tab-home — Dashboard Rendering

   Pure-ish HTML renderers plus the main dashboard render orchestration.
   Event handling stays in app.js.
   ================================================================ */

'use strict';

/* ----------------------------------------------------------------
   SVG ICON STRINGS
   ---------------------------------------------------------------- */
const ICONS = {
  tabs:    `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8.25V18a2.25 2.25 0 0 0 2.25 2.25h13.5A2.25 2.25 0 0 0 21 18V8.25m-18 0V6a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 6v2.25m-18 0h18" /></svg>`,
  close:   `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>`,
  closeChip: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>`,
  edit:    `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" /></svg>`,
  pin:     `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>`,
  star:    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" /></svg>`,
};

const OPEN_TAB_CARD_VISIBLE_LIMIT = 2;


/* ----------------------------------------------------------------
   TAB CHIP RENDERING
   ---------------------------------------------------------------- */

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

function tabChipLabel(tab, groupDomain = '') {
  let label = cleanTitle(smartTitle(stripTitleNoise(tab.title || ''), tab.url), groupDomain);
  try {
    const parsed = new URL(tab.url);
    if (parsed.hostname === 'localhost' && parsed.port) label = `${parsed.port} ${label}`;
  } catch {}
  return label;
}

function resolveTabDisplayTitle(tab, groupDomain = '', titleOverrides = {}) {
  const override = tab && tab.url ? titleOverrides[tab.url] : '';
  return typeof override === 'string' && override.trim()
    ? override.trim()
    : (tab ? tabChipLabel(tab, groupDomain) : '');
}

function renderTabChip(tab, {
  groupDomain = '',
  urlCounts = {},
  favoritedUrls = new Set(),
  titleOverrides = {},
} = {}) {
  const label      = resolveTabDisplayTitle(tab, groupDomain, titleOverrides);
  const count      = urlCounts[tab.url] || 1;
  const safeUrl    = escapeHtml(tab.url || '');
  const safeTitle  = escapeHtml(label);
  const safeLabel  = escapeHtml(label);
  const dupeTag    = count > 1
    ? ` <button class="chip-dupe-badge" data-action="dedup-this-url" data-tab-url="${safeUrl}" title="${t('closeDupes')}"><span class="dupe-count">${t('dupeBadge', count)}</span><span class="dupe-action">${t('closeDupes')}</span></button>`
    : '';
  const chipClass  = count > 1 ? ' chip-has-dupes' : '';
  const isFav      = favoritedUrls.has(tab.url);
  const isPinned   = !!tab.pinned;
  const faviconUrl = getFaviconUrl(tab.url, 32);
  return `<div class="page-chip clickable${chipClass}" data-action="focus-tab" data-tab-url="${safeUrl}" data-tab-id="${tab.id}" title="${safeTitle}">
    ${faviconUrl ? `<img class="chip-favicon" src="${escapeHtml(faviconUrl)}" alt="" onerror="this.style.display='none'">` : ''}
    <span class="chip-text">${safeLabel}</span>${dupeTag}
    <div class="chip-actions">
      <button class="chip-action chip-edit" data-action="edit-tab-title" data-tab-url="${safeUrl}" data-tab-id="${tab.id}" data-tab-title="${safeTitle}" title="${t('editTitle')}">
        ${ICONS.edit}
      </button>
      <button class="chip-action chip-star${isFav ? ' active' : ''}" data-action="favorite-tab" data-tab-url="${safeUrl}" data-tab-title="${safeTitle}" title="${isFav ? t('removeFromFav') : t('addToFav')}">
        ${ICONS.star}
      </button>
      <button class="chip-action chip-pin${isPinned ? ' active' : ''}" data-action="pin-tab" data-tab-url="${safeUrl}" data-tab-id="${tab.id}" title="${isPinned ? t('unpinTip') : t('pinTip')}">
        ${ICONS.pin}
      </button>
      <button class="chip-action chip-close" data-action="close-single-tab" data-tab-url="${safeUrl}" data-tab-id="${tab.id}" title="${t('closeThisTab')}">
        ${ICONS.closeChip}
      </button>
    </div>
  </div>`;
}


/* ----------------------------------------------------------------
   OVERFLOW CHIPS ("+N more" expand button in domain cards)
   ---------------------------------------------------------------- */

function buildOverflowChips(hiddenTabs, urlCounts = {}, favoritedUrls = new Set(), groupDomain = '', titleOverrides = {}) {
  const hiddenChips = hiddenTabs
    .map(tab => renderTabChip(tab, { groupDomain, urlCounts, favoritedUrls, titleOverrides }))
    .join('');

  return `
    <div class="page-chips-overflow" style="display:none">${hiddenChips}</div>
    <div class="page-chip page-chip-overflow clickable" data-action="expand-chips">
      <span class="chip-text">${t('plusN', hiddenTabs.length)}</span>
    </div>`;
}


/* ----------------------------------------------------------------
   DOMAIN CARD RENDERER
   ---------------------------------------------------------------- */

/**
 * renderDomainCard(group, groupIndex)
 *
 * Builds the HTML for one domain group card.
 * group = { domain: string, tabs: [{ url, title, id, windowId, active }] }
 */
function renderDomainCard(group, favoritedUrls = new Set(), titleOverrides = {}) {
  const tabs      = group.tabs || [];
  const tabCount  = tabs.length;
  const isLanding = group.domain === '__landing-pages__';
  const stableId  = domainStableId(group.domain);

  // Count duplicates (exact URL match)
  const urlCounts = {};
  for (const tab of tabs) urlCounts[tab.url] = (urlCounts[tab.url] || 0) + 1;
  const dupeUrls   = Object.entries(urlCounts).filter(([, c]) => c > 1);
  const hasDupes   = dupeUrls.length > 0;

  const tabBadge = `<span class="open-tabs-badge">
    ${ICONS.tabs}
    ${tabCount}
  </span>`;

  // Deduplicate for display: show each URL once, with (Nx) badge if duped
  const seen = new Set();
  const uniqueTabs = [];
  for (const tab of tabs) {
    if (!seen.has(tab.url)) { seen.add(tab.url); uniqueTabs.push(tab); }
  }

  const visibleTabs = uniqueTabs.slice(0, OPEN_TAB_CARD_VISIBLE_LIMIT);
  const extraCount  = uniqueTabs.length - visibleTabs.length;

  const pageChips = visibleTabs
    .map(tab => renderTabChip(tab, { groupDomain: group.domain, urlCounts, favoritedUrls, titleOverrides }))
    .join('') + (extraCount > 0 ? buildOverflowChips(uniqueTabs.slice(OPEN_TAB_CARD_VISIBLE_LIMIT), urlCounts, favoritedUrls, group.domain, titleOverrides) : '');

  // Close-all icon-only button at the top-right of the card. Tooltip carries the label.
  const closeAllBtn = `
    <button class="action-btn close-tabs mission-close-all" data-action="close-domain-tabs" data-domain-id="${stableId}" title="${t('closeAllN', tabCount)}">
      ${ICONS.close}
    </button>`;

  return `
    <div class="mission-card domain-card ${hasDupes ? 'has-amber-bar' : 'has-neutral-bar'}" data-domain-id="${stableId}">
      <div class="status-bar"></div>
      <div class="mission-content">
        <div class="mission-top">
          <span class="mission-name">${isLanding ? t('homepages') : (group.label || friendlyDomain(group.domain))}</span>
          ${tabBadge}
          ${closeAllBtn}
        </div>
        <div class="mission-pages">${pageChips}</div>
      </div>
      <div class="mission-meta">
        <div class="mission-page-count">${tabCount}</div>
        <div class="mission-page-label">${t('tabs')}</div>
      </div>
    </div>`;
}

function renderPinnedTabsList(groups, favoritedUrls = new Set(), titleOverrides = {}) {
  const tabsWithDomain = [];
  for (const group of groups || []) {
    for (const tab of group.tabs || []) {
      tabsWithDomain.push({ tab, groupDomain: group.domain });
    }
  }

  const urlCounts = {};
  for (const { tab } of tabsWithDomain) {
    urlCounts[tab.url] = (urlCounts[tab.url] || 0) + 1;
  }

  const rows = tabsWithDomain
    .map(({ tab, groupDomain }) => renderTabChip(tab, {
      groupDomain,
      urlCounts,
      favoritedUrls,
      titleOverrides,
    }))
    .join('');

  return `<div class="pinned-tab-list">${rows}</div>`;
}


/* ----------------------------------------------------------------
   LONG-TERM FAVORITES — Render Column
   ---------------------------------------------------------------- */

async function renderFavoritesColumn() {
  const list  = document.getElementById('favoritesList');
  const empty = document.getElementById('favoritesEmpty');
  if (!list || !empty) return;

  try {
    const items = await getFavorites();
    if (items.length === 0) {
      list.innerHTML = '';
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';

    // Render slots from 0 up to maxSlot + a trailing buffer of empty cells
    // (so users always have somewhere to drop when reordering near the end).
    const bySlot = new Map();
    let maxSlot = -1;
    for (const it of items) {
      const s = it.slot ?? 0;
      bySlot.set(s, it);
      if (s > maxSlot) maxSlot = s;
    }
    const TRAILING_EMPTY_BUFFER = 9;   // ~one extra row of drop targets
    const totalSlots = maxSlot + 1 + TRAILING_EMPTY_BUFFER;

    let html = '';
    for (let i = 0; i < totalSlots; i++) {
      const item = bySlot.get(i);
      html += item
        ? renderFavoriteItem(item)
        : `<div class="favorite-slot-empty" data-slot="${i}"></div>`;
    }
    list.innerHTML = html;
  } catch (err) {
    console.warn('[wolfy] Could not load favorites:', err);
  }
}

function renderFavoriteItem(fav) {
  const safeUrl   = (fav.url || '').replace(/"/g, '&quot;');
  const safeTitle = (fav.title || fav.url || '').replace(/"/g, '&quot;');

  let imgHtml = '';
  if (fav.customLogo) {
    imgHtml = `<img class="favorite-favicon" src="${fav.customLogo}" alt="">`;
  } else if (fav.iconUrl) {
    // Already resolved. Data URLs are real binary caches — mark resolved so
    // we never re-download. Plain URL strings (legacy) get rendered but left
    // unresolved, so the load handler downloads + upgrades to a data URL.
    const safe       = fav.iconUrl.replace(/"/g, '&quot;');
    const isBinary   = fav.iconUrl.startsWith('data:');
    const resolved   = isBinary ? 'data-resolved="1"' : '';
    imgHtml = `<img class="favorite-favicon" src="${safe}" data-fav-id="${fav.id}" ${resolved} alt="">`;
  } else {
    const chain = getFaviconFallbackChain(fav.url, 128);
    if (chain.length > 0) {
      const primary  = chain[0].replace(/"/g, '&quot;');
      const fallback = chain.slice(1).join('|').replace(/"/g, '&quot;');
      imgHtml = `<img class="favorite-favicon" src="${primary}" data-fallback="${fallback}" data-fav-id="${fav.id}" alt="">`;
    }
  }

  return `
    <a class="favorite-item" href="${safeUrl}" draggable="true" data-fav-id="${fav.id}" title="${safeUrl}">
      ${imgHtml}
      <span class="favorite-title">${safeTitle}</span>
      <button class="favorite-menu" data-action="favorite-menu" data-fav-id="${fav.id}" title="${t('moreActions')}">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>
      </button>
    </a>`;
}


/* ----------------------------------------------------------------
   MAIN DASHBOARD RENDERER
   ---------------------------------------------------------------- */

/**
 * renderStaticDashboard()
 *
 * The main render function:
 * 1. Paints the date
 * 2. Fetches open tabs via tabs.js
 * 3. Groups pinned and regular tabs separately
 * 4. Renders domain cards and favorite cards
 * 5. Updates footer stats and duplicate tab-home banner
 */
async function renderStaticDashboard() {
  // --- Header ---
  const dateEl = document.getElementById('dateDisplay');
  if (dateEl) dateEl.textContent = getDateDisplay();

  // --- Fetch tabs ---
  await fetchOpenTabs();
  const realTabs = getRealTabs();

  // Split tabs into pinned + regular and group each subset separately.
  const pinnedRealTabs  = realTabs.filter(t => t.pinned);
  const regularRealTabs = realTabs.filter(t => !t.pinned);
  const usageStats = await getTabUsageStats();
  const groupOptions = {
    landingPagePatterns: getLandingPagePatterns(),
    customGroups: getCustomGroups(),
    usageStats,
  };
  pinnedDomainGroups = groupTabsByDomain(pinnedRealTabs, groupOptions);
  domainGroups       = groupTabsByDomain(regularRealTabs, groupOptions);

  // --- Render domain cards ---
  const openTabsSection       = document.getElementById('openTabsSection');
  const openTabsSubSection    = document.getElementById('openTabsSubSection');
  const openTabsMissionsEl    = document.getElementById('openTabsMissions');
  const openTabsSectionCount  = document.getElementById('openTabsSectionCount');
  const openTabsSectionTitle  = document.getElementById('openTabsSectionTitle');
  const openTabsSectionAction = document.getElementById('openTabsSectionAction');
  const pinnedSubSection      = document.getElementById('pinnedSubSection');
  const pinnedMissionsEl      = document.getElementById('pinnedMissions');
  const pinnedSectionCount    = document.getElementById('pinnedSectionCount');
  const pinnedSectionTitle    = document.getElementById('pinnedSectionTitle');

  // Build cached lookup data so domain cards can render active stars and
  // tab-home-only custom titles without re-reading storage per card.
  const [favorites, titleOverrides] = await Promise.all([
    getFavorites(),
    getTabTitleOverrides(),
  ]);
  const favoritedUrls = new Set(favorites.map(f => f.url));

  // Pinned sub-section
  if (pinnedSubSection) {
    if (pinnedDomainGroups.length > 0) {
      if (pinnedSectionTitle) pinnedSectionTitle.textContent = t('pinned');
      if (pinnedSectionCount) pinnedSectionCount.innerHTML = t('nTabsCount', pinnedRealTabs.length);
      pinnedMissionsEl.innerHTML = renderPinnedTabsList(pinnedDomainGroups, favoritedUrls, titleOverrides);
      pinnedSubSection.style.display = 'block';
    } else {
      pinnedSubSection.style.display = 'none';
    }
  }

  // Open-tabs section is always visible — the column should hold its 50%
  // width even when there are no open tabs, so the favorites column can't
  // expand to swallow the whole page.
  if (openTabsSection) openTabsSection.style.display = 'block';

  if (domainGroups.length > 0 && openTabsSubSection) {
    if (openTabsSectionTitle) openTabsSectionTitle.textContent = t('openTabs');
    openTabsSectionCount.innerHTML = t('nDomains', domainGroups.length);
    if (openTabsSectionAction) {
      openTabsSectionAction.innerHTML = `<button class="action-btn close-tabs" data-action="close-all-open-tabs">${ICONS.close} ${t('closeAllN', regularRealTabs.length)}</button>`;
    }
    openTabsMissionsEl.innerHTML = domainGroups.map(g => renderDomainCard(g, favoritedUrls, titleOverrides)).join('');
    openTabsSubSection.style.display = 'block';
  } else if (openTabsSubSection) {
    openTabsSubSection.style.display = 'none';
    if (openTabsSectionAction) openTabsSectionAction.innerHTML = '';
  }

  // --- Footer stats ---
  const statTabs = document.getElementById('statTabs');
  if (statTabs) statTabs.textContent = openTabs.length;

  // --- Check for duplicate tab-out tabs ---
  checkTabOutDupes();

  // --- Render "Long-term Favorites" column ---
  await renderFavoritesColumn();
}

async function renderDashboard() {
  await renderStaticDashboard();
}
