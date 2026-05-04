const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('extension/index.html', 'utf8');
const css = fs.readFileSync('extension/style.css', 'utf8');

function ruleBody(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]+)\\}`, 'm'));
  assert(match, `${selector} rule should exist`);
  return match[1];
}

assert(html.includes('<body data-ui="console-dark">'), 'page should opt into the console-dark UI skin');
assert(!html.includes('class="brand-mark"'), 'header should not include the brand square icon');
assert(!css.includes('.brand-mark'), 'unused brand square icon styles should be removed');

assert(css.includes('--console-accent'), 'console-dark palette should expose a green accent token');
assert(css.includes('Console dark skin'), 'console-dark override section should be clearly marked');

const body = ruleBody('body[data-ui="console-dark"]');
assert(body.includes('radial-gradient'), 'body should use the console-dark radial background');

const header = ruleBody('header');
assert(header.includes('position: sticky'), 'header should behave like a sticky console topbar');
assert(header.includes('var(--console-topbar'), 'header should use theme-specific console topbar color');

const card = ruleBody('.mission-card');
assert(card.includes('border-radius: 12px'), 'domain cards should use console-style rounded panels');

const sideColumn = ruleBody('.side-column');
assert(sideColumn.includes('max-width: 360px'), 'quick access should feel like a compact console aside');

const lightTheme = ruleBody('[data-theme="light"]');
assert(lightTheme.includes('--console-bg-2'), 'light theme should override console surface tokens');
assert(lightTheme.includes('--console-topbar'), 'light theme should provide a light console topbar token');
assert(lightTheme.includes('--console-footer'), 'light theme should provide a light console footer token');
assert(lightTheme.includes('--console-favorite-bg'), 'light theme should provide a light favorites tile token');
assert(lightTheme.includes('--console-topbar: transparent'), 'light theme topbar should blend into the page background');
assert(lightTheme.includes('--console-footer: transparent'), 'light theme footer should blend into the page background');

const footer = ruleBody('footer');
assert(footer.includes('var(--console-footer'), 'footer should use theme-specific console footer color');

const favoriteItem = ruleBody('.favorite-item');
assert(favoriteItem.includes('var(--console-favorite-bg'), 'favorites should use theme-specific tile color');

console.log('console dark UI test passed');
