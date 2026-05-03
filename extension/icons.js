/* ================================================================
   tab-home — Icon Resolution and Cache

   Favicon candidate generation, fallback handling, and binary cache writes.
   ================================================================ */

'use strict';

const KNOWN_FAVICON_URLS = {
  'github.com':      'https://github.githubassets.com/favicons/favicon.svg',
  'www.github.com':  'https://github.githubassets.com/favicons/favicon.svg',
  'gist.github.com': 'https://github.githubassets.com/favicons/favicon.svg',
};

/* ----------------------------------------------------------------
   FAVICON URL — prefers Chrome's cached favicon (most accurate for sites
   the user has visited), which works for sites Google's S2 service can't
   resolve (e.g. WhatsApp Web). Requires the "favicon" permission.
   ---------------------------------------------------------------- */
function getFaviconUrl(pageUrl, size = 64) {
  if (!pageUrl) return '';
  try {
    const known = KNOWN_FAVICON_URLS[new URL(pageUrl).hostname];
    if (known) return known;
    const u = new URL(chrome.runtime.getURL('/_favicon/'));
    u.searchParams.set('pageUrl', pageUrl);
    u.searchParams.set('size', String(size));
    return u.toString();
  } catch {
    return '';
  }
}

/**
 * High-quality favicon fallback chain.
 *  1. apple-touch-icon.png            — typically 180–512px, beautiful
 *  2. apple-touch-icon-precomposed.png — older convention, same idea
 *  3. Chrome's cached _favicon (real icon, but lower-res)
 *
 * Used as a list passed via data-fallback="…|…|…" — when the <img> errors
 * out (404, transparent, etc.), the global error handler advances to the
 * next URL in the list.
 */
function getFaviconFallbackChain(pageUrl, size = 128) {
  if (!pageUrl) return [];
  let origin = '';
  try { origin = new URL(pageUrl).origin; } catch { return []; }
  return [
    `${origin}/apple-touch-icon.png`,
    `${origin}/apple-touch-icon-precomposed.png`,
    getFaviconUrl(pageUrl, size),
  ].filter(Boolean);
}

// Global error-handler: when an <img class="favorite-favicon"> 404s, walk
// the fallback chain stored in data-fallback. Capture phase because `error`
// events don't bubble.
document.addEventListener('error', (e) => {
  const img = e.target;
  if (!(img instanceof HTMLImageElement)) return;
  if (!img.dataset || typeof img.dataset.fallback !== 'string') return;
  const list = img.dataset.fallback.split('|').filter(Boolean);
  if (list.length === 0) {
    img.style.display = 'none';
    return;
  }
  const next = list.shift();
  img.dataset.fallback = list.join('|');
  img.src = next;
}, true);

/* ----------------------------------------------------------------
   ICON RESOLUTION CACHE — once an image loads successfully, persist
   the URL that worked into the favorite's `iconUrl` field. Future
   renders skip the fallback chain entirely.
   ---------------------------------------------------------------- */
let _pendingIconWrites = new Map();   // favId → resolved url
let _iconWriteTimer    = null;
let _suppressFavReRender = false;     // set briefly so onChanged skips us

async function flushIconWrites() {
  _iconWriteTimer = null;
  const writes = _pendingIconWrites;
  if (writes.size === 0) return;
  _pendingIconWrites = new Map();
  const { favorites = [] } = await chrome.storage.local.get('favorites');
  let modified = false;
  for (const [favId, url] of writes) {
    const fav = favorites.find(f => f.id === favId);
    if (fav && fav.iconUrl !== url) {
      fav.iconUrl = url;
      modified = true;
    }
  }
  if (!modified) return;
  _suppressFavReRender = true;
  await chrome.storage.local.set({ favorites });
  setTimeout(() => { _suppressFavReRender = false; }, 200);
}

function queueIconWrite(favId, url) {
  if (!favId || !url) return;
  _pendingIconWrites.set(favId, url);
  if (_iconWriteTimer) clearTimeout(_iconWriteTimer);
  _iconWriteTimer = setTimeout(flushIconWrites, 500);
}

// Capture phase — `load` doesn't bubble for individual images.
document.addEventListener('load', (e) => {
  const img = e.target;
  if (!(img instanceof HTMLImageElement)) return;
  if (!img.classList.contains('favorite-favicon')) return;
  const favId = img.dataset.favId;
  if (!favId) return;
  if (img.dataset.resolved === '1') return;   // already cached
  const finalUrl = img.currentSrc || img.src;
  if (!finalUrl) return;
  // Don't re-cache an already-stored data URL.
  if (finalUrl.startsWith('data:')) return;
  img.dataset.resolved = '1';
  // Download the image bytes and persist as a base64 data URL — zero
  // network on subsequent renders.
  downloadAndCacheIcon(favId, finalUrl);
}, true);

const MAX_ICON_BYTES = 200 * 1024;   // hard cap to keep storage reasonable

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload  = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

async function downloadAndCacheIcon(favId, url) {
  try {
    const r = await fetch(url, { credentials: 'omit' });
    if (!r.ok) return;
    const blob = await r.blob();
    if (blob.size === 0 || blob.size > MAX_ICON_BYTES) return;
    const dataUrl = await blobToDataUrl(blob);
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) return;
    queueIconWrite(favId, dataUrl);
  } catch {
    // Fetch failed (network, blocked, etc.) — leave iconUrl unset; we'll
    // try again next render via the fallback chain.
  }
}
