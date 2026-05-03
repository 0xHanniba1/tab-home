const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('extension/index.html', 'utf8');
const css = fs.readFileSync('extension/style.css', 'utf8');

function ruleBody(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`, 'm'));
  assert(match, `${selector} rule should exist`);
  return match[1];
}

const dashboardHtml = html.slice(
  html.indexOf('<div class="dashboard-columns" id="dashboardColumns">'),
  html.indexOf('</div><!-- end .dashboard-columns -->'),
);

const sideColumnIndex = dashboardHtml.indexOf('id="sideColumn"');
const quickAccessIndex = dashboardHtml.indexOf('id="quickAccessTitle"');
const pinnedIndex = dashboardHtml.indexOf('id="pinnedSubSection"');
const favoritesIndex = dashboardHtml.indexOf('id="favoritesColumn"');

assert(sideColumnIndex !== -1, 'right side column should exist');
assert(quickAccessIndex !== -1, 'right side column should have a Quick Access title');
assert(sideColumnIndex < quickAccessIndex, 'Quick Access title should be inside the right side column');
assert(quickAccessIndex < pinnedIndex, 'Quick Access title should appear above pinned tabs');
assert(pinnedIndex < favoritesIndex, 'Pinned should appear above Favorites');

const openTabsColumn = ruleBody('.dashboard-columns .active-section');
assert(openTabsColumn.includes('flex: 1 1 70%'), 'open tabs column should take 70%');

const sideColumn = ruleBody('.side-column');
assert(sideColumn.includes('flex: 0 0 30%'), 'Quick Access column should take 30%');

const pinnedMissions = ruleBody('.side-column #pinnedMissions');
assert(pinnedMissions.includes('columns: auto'), 'Pinned cards should disable masonry columns in the sidebar');

const pinnedList = ruleBody('.pinned-tab-list');
assert(pinnedList.includes('display: flex'), 'Pinned tabs should render as a compact vertical list');

const compactPinnedRows = ruleBody('.pinned-tab-list .page-chip');
assert(compactPinnedRows.includes('padding: 6px 8px'), 'Pinned rows should be compact in the sidebar');

const sideFavoritesGrid = ruleBody('.side-column .favorites-list');
assert(sideFavoritesGrid.includes('minmax(62px, 1fr)'), 'sidebar favorites should use smaller grid cells');

const sideFavoriteIcon = ruleBody('.side-column .favorite-favicon');
assert(sideFavoriteIcon.includes('clamp(28px, 45%, 40px)'), 'sidebar favorite icons should be capped on narrow widths');

const sideFavoriteTitle = ruleBody('.side-column .favorite-title');
assert(sideFavoriteTitle.includes('font-size: 10px'), 'sidebar favorite titles should be smaller');

console.log('quick access layout test passed');
