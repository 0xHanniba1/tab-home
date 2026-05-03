const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('extension/index.html', 'utf8');
const dashboardStart = html.indexOf('<div class="dashboard-columns" id="dashboardColumns">');
const dashboardEnd = html.indexOf('</div><!-- end .dashboard-columns -->');

assert(dashboardStart !== -1, 'dashboard columns container should exist');
assert(dashboardEnd > dashboardStart, 'dashboard columns container should close after it opens');

const dashboardHtml = html.slice(dashboardStart, dashboardEnd);
const openTabsIndex = dashboardHtml.indexOf('id="openTabsSection"');
const sideColumnIndex = dashboardHtml.indexOf('id="sideColumn"');
const pinnedIndex = dashboardHtml.indexOf('id="pinnedSubSection"');
const openTabsSubSectionIndex = dashboardHtml.indexOf('id="openTabsSubSection"');
const favoritesIndex = dashboardHtml.indexOf('id="favoritesColumn"');

assert(openTabsIndex !== -1, 'open tabs column should exist');
assert(sideColumnIndex !== -1, 'right side column should exist');
assert(pinnedIndex !== -1, 'pinned tabs section should exist');
assert(openTabsSubSectionIndex !== -1, 'regular open tabs section should exist');
assert(favoritesIndex !== -1, 'favorites column should exist');
assert(
  openTabsIndex < sideColumnIndex,
  'open tabs column should appear before the right side column',
);
assert(
  openTabsIndex < openTabsSubSectionIndex && openTabsSubSectionIndex < sideColumnIndex,
  'left column should contain regular open tabs before the right side column starts',
);
assert(
  sideColumnIndex < pinnedIndex && pinnedIndex < favoritesIndex,
  'right side column should contain pinned tabs before favorites',
);

console.log('layout order test passed');
