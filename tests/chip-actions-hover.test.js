const assert = require('assert');
const fs = require('fs');

const css = fs.readFileSync('extension/style.css', 'utf8');

function ruleBody(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`, 'm'));
  assert(match, `${selector} rule should exist`);
  return match[1];
}

const actions = ruleBody('.chip-actions');
assert(actions.includes('position: absolute'), 'chip actions should not occupy title row space');
assert(actions.includes('opacity: 0'), 'chip actions should be hidden by default');
assert(actions.includes('visibility: hidden'), 'chip actions should not be visible by default');
assert(actions.includes('pointer-events: none'), 'hidden chip actions should not catch clicks');

const hoverActions = ruleBody('.page-chip:hover .chip-actions,\n.page-chip:focus-within .chip-actions');
assert(hoverActions.includes('opacity: 1'), 'chip actions should show on hover/focus');
assert(hoverActions.includes('visibility: visible'), 'chip actions should become visible on hover/focus');
assert(hoverActions.includes('pointer-events: auto'), 'chip actions should become clickable on hover/focus');

console.log('chip actions hover test passed');
