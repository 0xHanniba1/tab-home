/* ================================================================
   tab-home — Event Handlers and App Initialization

   The Chrome API wrappers, storage helpers, icon cache, and renderers live
   in focused files loaded before this one. This file wires user actions to
   those helpers and starts the dashboard.
   ================================================================ */

'use strict';




/* ----------------------------------------------------------------
   EVENT HANDLERS — using event delegation

   One listener on document handles ALL button clicks.
   Think of it as one security guard watching the whole building
   instead of one per door.
   ---------------------------------------------------------------- */

document.addEventListener('click', async (e) => {
  // Walk up the DOM to find the nearest element with data-action
  const actionEl = e.target.closest('[data-action]');
  if (!actionEl) return;

  const action = actionEl.dataset.action;

  // ---- Close duplicate tab-out tabs ----
  if (action === 'close-tabout-dupes') {
    await closeTabOutDupes();
    playCloseSound();
    const banner = document.getElementById('tabOutDupeBanner');
    if (banner) {
      banner.style.transition = 'opacity 0.4s';
      banner.style.opacity = '0';
      setTimeout(() => { banner.style.display = 'none'; banner.style.opacity = '1'; }, 400);
    }
    showToast(t('closedExtras'));
    return;
  }

  // ---- Language toggle ----
  if (action === 'toggle-lang') {
    await saveLang(currentLang === 'zh' ? 'en' : 'zh');
    applyStaticI18n();
    await renderDashboard();
    return;
  }

  // ---- Theme toggle (light / dark) ----
  if (action === 'toggle-theme') {
    await toggleTheme();
    return;
  }

  // ---- Favorites: toggle add modal ----
  if (action === 'toggle-favorite-form') {
    const modal = document.getElementById('favoritesModal');
    const btn   = document.getElementById('favoritesAddToggle');
    if (!modal) return;
    const showing = modal.style.display !== 'none';
    if (showing) {
      resetFavoriteForm();
      modal.style.display = 'none';
      if (btn) btn.classList.remove('open');
    } else {
      resetFavoriteForm();
      modal.style.display = 'flex';
      if (btn) btn.classList.add('open');
      const urlInput = document.getElementById('favoritesUrlInput');
      if (urlInput) setTimeout(() => urlInput.focus(), 0);
    }
    return;
  }

  // ---- Favorites: cancel (close modal) ----
  if (action === 'cancel-favorite-form') {
    closeFavoriteModal();
    return;
  }

  // ---- Favorites: delete from edit modal ----
  if (action === 'delete-from-form') {
    const form = document.getElementById('favoritesForm');
    const id   = form && form.dataset.editingId;
    if (!id) return;
    await removeFavorite(id);
    closeFavoriteModal();
    await renderFavoritesColumn();
    showToast(t('removedFromFavorites'));
    return;
  }

  // ---- Click on modal backdrop closes it ----
  if (e.target.id === 'favoritesModal') {
    closeFavoriteModal();
    return;
  }

  // (Favorite cards are real <a href> links — the browser handles
  //  navigation, modifier keys, middle-click, and right-click context
  //  menu natively. No JS click handler needed for plain opens.)

  // ---- Favorites: open the 3-dot menu next to the card (click again to close) ----
  if (action === 'favorite-menu') {
    // Stop the parent <a> link from navigating when the menu button is clicked.
    e.preventDefault();
    e.stopPropagation();
    const id = actionEl.dataset.favId;
    if (!id) return;
    const existing = document.getElementById('favoritePopupMenu');
    if (existing && existing.dataset.favId === id) {
      closeFavoriteMenu();
    } else {
      closeFavoriteMenu();
      openFavoriteMenu(actionEl, id);
    }
    return;
  }

  // ---- Menu items ----
  if (action === 'menu-edit-favorite') {
    const id = actionEl.dataset.favId;
    closeFavoriteMenu();
    if (id) await openEditFavorite(id);
    return;
  }
  if (action === 'menu-remove-favorite') {
    const id = actionEl.dataset.favId;
    closeFavoriteMenu();
    if (id) {
      await removeFavorite(id);
      await renderFavoritesColumn();
      showToast(t('removedFromFavorites'));
    }
    return;
  }


  // ---- Favorites: reset logo to default favicon ----
  if (action === 'reset-favorite-logo') {
    pendingLogoDataUrl = null;
    clearCustomLogo    = true;

    // Re-derive favicon from current URL input for live preview
    const urlVal = document.getElementById('favoritesUrlInput').value.trim();
    setLogoPreviewForUrl(urlVal);
    return;
  }

  // ---- Open tabs: edit the tab-home display title for this URL ----
  if (action === 'edit-tab-title') {
    e.preventDefault();
    e.stopPropagation();
    const tabUrl = actionEl.dataset.tabUrl;
    if (!tabUrl) return;

    const currentTitle = actionEl.dataset.tabTitle || '';
    const nextTitle = await showTextPrompt({
      message: t('editTitle'),
      value: currentTitle,
      okLabel: t('save'),
      cancelLabel: t('cancel'),
    });
    if (nextTitle === null) return;

    await setTabTitleOverride(tabUrl, nextTitle);
    await renderDashboard();
    showToast(nextTitle.trim() ? t('titleUpdated') : t('titleReset'));
    return;
  }


  // ---- Favorites: star a tab from a chip ----
  if (action === 'favorite-tab') {
    e.stopPropagation();
    const tabUrl = actionEl.dataset.tabUrl;
    if (!tabUrl) return;

    const already = await isFavorited(tabUrl);
    if (already) {
      // Removing is destructive enough to warrant a confirm.
      const ok = await showConfirm({
        message: t('confirmRemoveFav'),
        okLabel: t('remove'),
      });
      if (!ok) return;
      const favs = await getFavorites();
      const fav  = favs.find(f => f.url === tabUrl);
      if (fav) await removeFavorite(fav.id);
      actionEl.classList.remove('active');
      showToast(t('removedFromFavorites'));
    } else {
      const tabTitle = actionEl.dataset.tabTitle || '';
      const ok = await addFavorite(tabUrl, tabTitle);
      if (ok) {
        actionEl.classList.add('active');
        showToast(t('addedToFavorites'));
      } else {
        showToast(t('alreadyAdded'));
      }
    }
    await renderFavoritesColumn();
    return;
  }

  const card = actionEl.closest('.mission-card');

  // ---- Expand overflow chips ("+N more") ----
  if (action === 'expand-chips') {
    const overflowContainer = actionEl.parentElement.querySelector('.page-chips-overflow');
    if (overflowContainer) {
      overflowContainer.style.display = 'contents';
      actionEl.remove();
    }
    return;
  }

  // ---- Focus a specific tab ----
  if (action === 'focus-tab') {
    const tabId = parseInt(actionEl.dataset.tabId, 10);
    if (!Number.isNaN(tabId)) {
      try {
        const tab = await chrome.tabs.get(tabId);
        await chrome.tabs.update(tabId, { active: true });
        await chrome.windows.update(tab.windowId, { focused: true });
        return;
      } catch { /* tab gone — fall through to URL fallback */ }
    }
    const tabUrl = actionEl.dataset.tabUrl;
    if (tabUrl) await focusTab(tabUrl);
    return;
  }

  // ---- Close a single tab ----
  if (action === 'close-single-tab') {
    e.stopPropagation(); // don't trigger parent chip's focus-tab
    const tabId = parseInt(actionEl.dataset.tabId, 10);
    if (Number.isNaN(tabId)) return;

    // Close THIS exact tab — using its id, not URL (multiple tabs may
    // share the same URL but represent different open windows).
    try { await chrome.tabs.remove(tabId); } catch {}
    await fetchOpenTabs();

    playCloseSound();

    // Animate the chip row out
    const chip = actionEl.closest('.page-chip');
    if (chip) {
      const rect = chip.getBoundingClientRect();
      shootConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      chip.style.transition = 'opacity 0.2s, transform 0.2s';
      chip.style.opacity    = '0';
      chip.style.transform  = 'scale(0.8)';
      setTimeout(() => {
        chip.remove();
        // If the card now has no tabs, remove it too
        const parentCard = document.querySelector('.mission-card:has(.mission-pages:empty)');
        if (parentCard) animateCardOut(parentCard);
        document.querySelectorAll('.mission-card').forEach(c => {
          if (c.querySelectorAll('.page-chip[data-action="focus-tab"]').length === 0) {
            animateCardOut(c);
          }
        });
      }, 200);
    }

    // Update footer
    const statTabs = document.getElementById('statTabs');
    if (statTabs) statTabs.textContent = openTabs.length;

    showToast(t('tabClosed'));
    return;
  }

  // ---- Pin / unpin a single tab in Chrome (use exact tab id, not URL) ----
  if (action === 'pin-tab') {
    e.stopPropagation();
    const tabId = parseInt(actionEl.dataset.tabId, 10);
    if (Number.isNaN(tabId)) return;
    let tab;
    try { tab = await chrome.tabs.get(tabId); } catch { return; }
    const newPinned = !tab.pinned;
    await chrome.tabs.update(tabId, { pinned: newPinned });
    // Optimistic UI: flip the active class + tooltip. CSS handles the fill.
    // The live re-render listener will refresh the cards in full right after.
    actionEl.classList.toggle('active', newPinned);
    actionEl.title = newPinned ? t('unpinTip') : t('pinTip');
    return;
  }

  // ---- Close all tabs in a domain group ----
  if (action === 'close-domain-tabs') {
    const domainId    = actionEl.dataset.domainId;
    // Search the right group list based on which sub-section the X is in.
    const inPinned    = !!actionEl.closest('#pinnedSubSection');
    const sourceList  = inPinned ? pinnedDomainGroups : domainGroups;
    const group       = sourceList.find(g => domainStableId(g.domain) === domainId);
    if (!group) return;

    // Close exactly THIS group's tabs by id — robust against same-URL tabs
    // existing in the other section (pinned/unpinned).
    const tabIds = group.tabs.map(t => t.id).filter(Boolean);
    if (tabIds.length > 0) {
      try { await chrome.tabs.remove(tabIds); } catch {}
      await fetchOpenTabs();
    }

    if (card) {
      playCloseSound();
      animateCardOut(card);
    }

    // Remove from in-memory groups
    const idx = sourceList.indexOf(group);
    if (idx !== -1) sourceList.splice(idx, 1);

    const groupLabel = group.domain === '__landing-pages__' ? t('homepages') : (group.label || friendlyDomain(group.domain));
    showToast(t('closedNFromX', tabIds.length, groupLabel));

    const statTabs = document.getElementById('statTabs');
    if (statTabs) statTabs.textContent = openTabs.length;
    return;
  }

  // ---- Close duplicates of THIS specific URL (the inline chip badge) ----
  // Scoped to the same pin-state as the source chip — pinned and unpinned
  // sections are dedup'd separately, so a pinned tab is never used as the
  // "keep" for the unpinned section's dedup.
  if (action === 'dedup-this-url') {
    e.stopPropagation();
    e.preventDefault();
    const url    = actionEl.dataset.tabUrl;
    const chip   = actionEl.closest('.page-chip');
    const chipId = chip ? parseInt(chip.dataset.tabId, 10) : NaN;
    if (!url) return;

    const allTabs   = await chrome.tabs.query({});
    const sourceTab = !Number.isNaN(chipId) ? allTabs.find(t => t.id === chipId) : null;
    const wantPinned = sourceTab ? !!sourceTab.pinned : false;
    const matching = allTabs.filter(t => t.url === url && !!t.pinned === wantPinned);
    if (matching.length <= 1) return;

    // Keep the active match if any, else the first; close the rest.
    const keep = matching.find(t => t.active) || matching[0];
    const toClose = matching.filter(t => t.id !== keep.id).map(t => t.id);
    if (toClose.length > 0) await chrome.tabs.remove(toClose);
    await fetchOpenTabs();

    playCloseSound();
    // Fade out the badge — live re-render listener will refresh the card.
    actionEl.style.transition = 'opacity 0.2s';
    actionEl.style.opacity    = '0';
    setTimeout(() => actionEl.remove(), 200);
    showToast(t('closedDupes'));
    return;
  }

  // ---- Close ALL open tabs ----
  if (action === 'close-all-open-tabs') {
    const allUrls = openTabs
      .filter(t => t.url && !t.url.startsWith('chrome') && !t.url.startsWith('about:'))
      .map(t => t.url);
    await closeTabsByUrls(allUrls);
    playCloseSound();

    document.querySelectorAll('#openTabsMissions .mission-card').forEach(c => {
      shootConfetti(
        c.getBoundingClientRect().left + c.offsetWidth / 2,
        c.getBoundingClientRect().top  + c.offsetHeight / 2
      );
      animateCardOut(c);
    });

    showToast(t('allTabsClosed'));
    return;
  }
});

/* ----------------------------------------------------------------
   FAVORITES FORM — shared state for add/edit mode

   pendingLogoDataUrl:
     - null   = no new logo uploaded this session (keep current value on save)
     - string = data URL the user just picked, save as customLogo

   clearCustomLogo:
     - true   = user clicked "Reset", remove customLogo on save (revert to favicon)
     - false  = leave customLogo alone
   ---------------------------------------------------------------- */
let pendingLogoDataUrl = null;
let clearCustomLogo    = false;

function setLogoPreview(src, fallbackList = []) {
  const placeholder = document.getElementById('favoritesLogoPlaceholder');
  const img         = document.getElementById('favoritesLogoPreviewImg');
  if (!img || !placeholder) return;
  if (src) {
    img.dataset.fallback = fallbackList.join('|');
    img.src = src;
    img.style.display = 'block';
    placeholder.style.display = 'none';
  } else {
    img.removeAttribute('src');
    delete img.dataset.fallback;
    img.style.display = 'none';
    placeholder.style.display = 'block';
  }
}

/**
 * Set the logo preview using the same fallback chain as favorite cards.
 * Customizable: pass a customLogo data URL to skip the chain entirely.
 */
function setLogoPreviewForUrl(pageUrl, customLogo = null) {
  if (customLogo) { setLogoPreview(customLogo); return; }
  const chain = getFaviconFallbackChain(pageUrl, 128);
  if (chain.length === 0) { setLogoPreview(''); return; }
  setLogoPreview(chain[0], chain.slice(1));
}

function resetFavoriteForm() {
  const form = document.getElementById('favoritesForm');
  if (!form) return;
  form.dataset.editingId = '';
  document.getElementById('favoritesUrlInput').value   = '';
  document.getElementById('favoritesTitleInput').value = '';
  document.getElementById('favoritesLogoInput').value  = '';
  document.getElementById('favoritesFormSubmit').textContent = 'Add';
  const delBtn = document.getElementById('favoritesFormDelete');
  if (delBtn) delBtn.style.display = 'none';
  setLogoPreview('');
  pendingLogoDataUrl = null;
  clearCustomLogo    = false;
}

function closeFavoriteModal() {
  const modal = document.getElementById('favoritesModal');
  const btn   = document.getElementById('favoritesAddToggle');
  resetFavoriteForm();
  if (modal) modal.style.display = 'none';
  if (btn)   btn.classList.remove('open');
}

/**
 * showConfirm({ message, okLabel?, cancelLabel? })
 * Returns Promise<boolean> — resolves true on confirm, false on cancel /
 * Esc / backdrop click. In-page modal styled to match the rest of the app.
 */
function showConfirm({ message, okLabel, cancelLabel } = {}) {
  return new Promise((resolve) => {
    const modal     = document.getElementById('confirmModal');
    const msgEl     = document.getElementById('confirmMessage');
    const okBtn     = document.getElementById('confirmOkBtn');
    const cancelBtn = document.getElementById('confirmCancelBtn');
    if (!modal || !msgEl || !okBtn || !cancelBtn) {
      resolve(window.confirm(message || ''));
      return;
    }

    msgEl.textContent     = message || '';
    okBtn.textContent     = okLabel     || t('confirmOk');
    cancelBtn.textContent = cancelLabel || t('cancel');
    modal.style.display = 'flex';

    const cleanup = () => {
      modal.style.display = 'none';
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      modal.removeEventListener('click', onBackdrop);
      document.removeEventListener('keydown', onKey, true);
    };
    const onOk     = () => { cleanup(); resolve(true);  };
    const onCancel = () => { cleanup(); resolve(false); };
    const onBackdrop = (e) => { if (e.target === modal) onCancel(); };
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onCancel(); }
      else if (e.key === 'Enter') { e.stopPropagation(); onOk(); }
    };

    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
    modal.addEventListener('click', onBackdrop);
    document.addEventListener('keydown', onKey, true);

    // Default focus the safer choice (cancel)
    setTimeout(() => cancelBtn.focus(), 0);
  });
}

/**
 * showTextPrompt({ message, value?, okLabel?, cancelLabel? })
 * Returns Promise<string|null> — null means cancel. Blank strings are valid
 * and used here to clear a custom title override.
 */
function showTextPrompt({ message, value, okLabel, cancelLabel } = {}) {
  return new Promise((resolve) => {
    const modal     = document.getElementById('confirmModal');
    const card      = modal && modal.querySelector('.confirm-card');
    const msgEl     = document.getElementById('confirmMessage');
    const okBtn     = document.getElementById('confirmOkBtn');
    const cancelBtn = document.getElementById('confirmCancelBtn');
    const actions   = card && card.querySelector('.confirm-actions');
    if (!modal || !card || !msgEl || !okBtn || !cancelBtn || !actions) {
      const fallback = typeof window.prompt === 'function'
        ? window.prompt(message || '', value || '')
        : null;
      resolve(fallback);
      return;
    }

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'confirm-input';
    input.value = value || '';
    input.maxLength = 180;
    input.autocomplete = 'off';
    input.spellcheck = false;

    msgEl.textContent     = message || '';
    okBtn.textContent     = okLabel     || t('confirmOk');
    cancelBtn.textContent = cancelLabel || t('cancel');
    card.insertBefore(input, actions);
    modal.style.display = 'flex';

    const cleanup = () => {
      modal.style.display = 'none';
      input.remove();
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      modal.removeEventListener('click', onBackdrop);
      document.removeEventListener('keydown', onKey, true);
    };
    const onOk = () => {
      const next = input.value;
      cleanup();
      resolve(next);
    };
    const onCancel = () => {
      cleanup();
      resolve(null);
    };
    const onBackdrop = (e) => { if (e.target === modal) onCancel(); };
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onCancel(); }
      else if (e.key === 'Enter') { e.stopPropagation(); onOk(); }
    };

    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
    modal.addEventListener('click', onBackdrop);
    document.addEventListener('keydown', onKey, true);

    setTimeout(() => {
      input.focus();
      input.select();
    }, 0);
  });
}

async function openEditFavorite(id) {
  const favs = await getFavorites();
  const fav  = favs.find(f => f.id === id);
  if (!fav) return;
  document.getElementById('favoritesUrlInput').value   = fav.url || '';
  document.getElementById('favoritesTitleInput').value = fav.title || '';
  setLogoPreviewForUrl(fav.url, fav.customLogo);
  pendingLogoDataUrl = null;
  clearCustomLogo    = false;
  const form  = document.getElementById('favoritesForm');
  const modal = document.getElementById('favoritesModal');
  form.dataset.editingId = id;
  if (modal) modal.style.display = 'flex';
  document.getElementById('favoritesAddToggle').classList.add('open');
  document.getElementById('favoritesFormSubmit').textContent = 'Save';
  const delBtn = document.getElementById('favoritesFormDelete');
  if (delBtn) delBtn.style.display = 'inline-flex';
}

function openFavoriteMenu(anchorEl, favId) {
  const menu = document.createElement('div');
  menu.id = 'favoritePopupMenu';
  menu.className = 'favorite-popup-menu';
  menu.dataset.favId = favId;
  menu.innerHTML = `
    <button class="favorite-popup-item" data-action="menu-edit-favorite"   data-fav-id="${favId}">${t('edit')}</button>
    <button class="favorite-popup-item favorite-popup-item-danger" data-action="menu-remove-favorite" data-fav-id="${favId}">${t('remove')}</button>
  `;
  document.body.appendChild(menu);

  // Position below-and-aligned-right with the anchor; clamp to viewport.
  const r = anchorEl.getBoundingClientRect();
  const m = menu.getBoundingClientRect();
  let top  = r.bottom + 4;
  let left = r.right  - m.width;
  if (top + m.height > window.innerHeight - 4) top = r.top - m.height - 4;
  if (left < 4) left = 4;
  menu.style.top  = `${top}px`;
  menu.style.left = `${left}px`;
}

function closeFavoriteMenu() {
  const menu = document.getElementById('favoritePopupMenu');
  if (menu) menu.remove();
}

// Click outside the menu closes it.
document.addEventListener('click', (e) => {
  if (!document.getElementById('favoritePopupMenu')) return;
  if (e.target.closest('#favoritePopupMenu')) return;
  if (e.target.closest('[data-action="favorite-menu"]')) return;
  closeFavoriteMenu();
});

// Escape closes whichever overlay is open.
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const modal = document.getElementById('favoritesModal');
  if (modal && modal.style.display !== 'none') { closeFavoriteModal(); return; }
  closeFavoriteMenu();
});

/**
 * Downscale an image blob to fit within `maxSize × maxSize` using a canvas,
 * exporting as a PNG data URL. Preserves transparency. Never upscales —
 * a 100×100 image stays 100×100. Output is typically a few KB regardless
 * of input size, which is what keeps chrome.storage.local from filling up.
 */
function compressImage(blob, maxSize = 256) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const srcW = img.naturalWidth  || img.width;
      const srcH = img.naturalHeight || img.height;
      if (!srcW || !srcH) { reject(new Error('zero-size image')); return; }
      const ratio = Math.min(maxSize / srcW, maxSize / srcH, 1);
      const w = Math.max(1, Math.round(srcW * ratio));
      const h = Math.max(1, Math.round(srcH * ratio));
      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      try {
        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

/**
 * Stage an image blob as the favorite's custom logo. Used by both the
 * file picker and the clipboard-paste path. Auto-compresses to ≤256×256
 * so storage stays small no matter how big the original image is.
 */
async function stageCustomLogoFromBlob(blob) {
  if (!blob || !blob.type || !blob.type.startsWith('image/')) return;
  try {
    const dataUrl = await compressImage(blob, 256);
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) return;
    pendingLogoDataUrl = dataUrl;
    clearCustomLogo    = false;
    setLogoPreview(dataUrl);
  } catch (err) {
    console.warn('[wolfy] image compress failed:', err);
  }
}

// ---- Logo file picker — read as base64 data URL, show in preview ----
document.addEventListener('change', (e) => {
  if (e.target.id !== 'favoritesLogoInput') return;
  const file = e.target.files && e.target.files[0];
  if (file) stageCustomLogoFromBlob(file);
});

// ---- Paste an image from the clipboard while the favorites modal is open.
//      Works whether focus is on the URL/title input, on the form itself,
//      or just on the modal — anywhere inside.
document.addEventListener('paste', async (e) => {
  const modal = document.getElementById('favoritesModal');
  if (!modal || modal.style.display === 'none') return;
  const items = (e.clipboardData && e.clipboardData.items) || [];
  for (const item of items) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (!file) continue;
      e.preventDefault();
      await stageCustomLogoFromBlob(file);
      return;
    }
  }
});

// ---- Live preview update: when URL field changes and no custom logo
//      is staged, pull a favicon for the new domain so the preview tracks
//      what the saved card will look like. ----
document.addEventListener('input', (e) => {
  if (e.target.id !== 'favoritesUrlInput') return;
  if (pendingLogoDataUrl) return;          // user staged an upload — leave it alone
  const form = document.getElementById('favoritesForm');
  // While editing, only auto-update the preview if user clicked Reset
  // (otherwise we'd clobber their existing custom logo on every keystroke)
  if (form.dataset.editingId && !clearCustomLogo) return;
  const url = e.target.value.trim();
  setLogoPreviewForUrl(url);
});

// ---- Favorites form submission (handles both add and edit) ----
document.addEventListener('submit', async (e) => {
  if (e.target.id !== 'favoritesForm') return;
  e.preventDefault();

  const form       = e.target;
  const editingId  = form.dataset.editingId || '';
  const urlInput   = document.getElementById('favoritesUrlInput');
  const titleInput = document.getElementById('favoritesTitleInput');
  let   url        = urlInput.value.trim();
  let   title      = titleInput.value.trim();
  if (!url) return;

  // Auto-prepend https:// if the user typed a bare domain (e.g. "binance.com").
  // Without this we'd save invalid-looking URLs that later fail to navigate.
  if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) {
    url = 'https://' + url;
  }

  if (!title) {
    try { title = friendlyDomain(new URL(url).hostname); }
    catch { title = url; }
  }

  try {
    if (editingId) {
      const fields = { url, title };
      if (pendingLogoDataUrl)      fields.customLogo = pendingLogoDataUrl;
      else if (clearCustomLogo)    fields.customLogo = null;  // null sentinel → delete
      await updateFavorite(editingId, fields);
      showToast(t('favoriteUpdated'));
    } else {
      const ok = await addFavorite(url, title, pendingLogoDataUrl);
      if (!ok) {
        showToast(t('alreadyAdded'));
        return;
      }
      showToast(t('addedToFavorites'));
    }
  } catch (err) {
    // Most likely cause: chrome.storage.local quota exceeded.
    console.error('[wolfy] save favorite failed:', err);
    showToast(t('saveFailed'));
    return;
  }

  closeFavoriteModal();

  await renderFavoritesColumn();
  document.querySelectorAll(`.chip-star[data-tab-url="${url.replace(/"/g, '&quot;')}"]`).forEach(b => b.classList.add('active'));
});


/* ----------------------------------------------------------------
   FAVORITES DRAG-AND-DROP — reorder cards within the favorites column.

   Scope: strictly limited to the favorites column. Drops elsewhere on
   the page (including the OpenTabs section) are ignored. This is
   intentional — dragging onto OpenTabs used to "open as new tab", but
   that feature was confusing and got removed.

   Drop targets:
     - another card        → swap slots
     - empty slot          → place there
     - anywhere else       → no-op
   ---------------------------------------------------------------- */
let _draggedFavId = null;

function clearDropMarkers() {
  document.querySelectorAll('.favorite-item.drop-target, .favorite-slot-empty.drop-target')
    .forEach(el => el.classList.remove('drop-target'));
}

document.addEventListener('dragstart', (e) => {
  const item = e.target.closest('.favorite-item');
  if (!item) return;
  _draggedFavId = item.dataset.favId;
  item.classList.add('dragging');
  document.body.classList.add('dragging-favorite');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', _draggedFavId);
});

document.addEventListener('dragend', () => {
  document.querySelectorAll('.favorite-item.dragging')
    .forEach(el => el.classList.remove('dragging'));
  document.body.classList.remove('dragging-favorite');
  clearDropMarkers();
  _draggedFavId = null;
});

document.addEventListener('dragover', (e) => {
  if (!_draggedFavId) return;

  // Hovering another card → reorder (swap slots on drop)
  const card = e.target.closest('.favorite-item');
  if (card && card.dataset.favId && card.dataset.favId !== _draggedFavId) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    clearDropMarkers();
    card.classList.add('drop-target');
    return;
  }

  // Hovering an empty slot → place there
  const slot = e.target.closest('.favorite-slot-empty');
  if (slot) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    clearDropMarkers();
    slot.classList.add('drop-target');
  }
  // No third branch — drops outside the favorites grid are not allowed.
});

document.addEventListener('drop', async (e) => {
  if (!_draggedFavId) return;
  const draggedId = _draggedFavId;
  _draggedFavId = null;

  // Drop on another card → swap slots
  const card = e.target.closest('.favorite-item');
  if (card && card.dataset.favId && card.dataset.favId !== draggedId) {
    e.preventDefault();
    clearDropMarkers();
    const favorites = await getFavorites();
    const a = favorites.find(f => f.id === draggedId);
    const b = favorites.find(f => f.id === card.dataset.favId);
    if (a && b) {
      const tmp = a.slot;
      a.slot = b.slot;
      b.slot = tmp;
      await chrome.storage.local.set({ favorites });
      await renderFavoritesColumn();
    }
    return;
  }

  // Drop on an empty slot → set slot
  const slot = e.target.closest('.favorite-slot-empty');
  if (slot) {
    e.preventDefault();
    clearDropMarkers();
    const newSlot = parseInt(slot.dataset.slot, 10);
    if (!Number.isNaN(newSlot)) {
      await setFavoriteSlot(draggedId, newSlot);
      await renderFavoritesColumn();
    }
    return;
  }

  clearDropMarkers();
});


/* ----------------------------------------------------------------
   LIVE UPDATES — re-render whenever Chrome's tab state changes

   Without this, opening a favorite (or any tab change in another window)
   wouldn't show up here until the user manually refreshed the page.
   Debounced so a burst of events triggers exactly one re-render.
   ---------------------------------------------------------------- */
let _rerenderTimer = null;
function scheduleLiveRerender() {
  if (_rerenderTimer) clearTimeout(_rerenderTimer);
  _rerenderTimer = setTimeout(() => {
    _rerenderTimer = null;
    renderDashboard();
  }, 150);
}

if (chrome.tabs && chrome.tabs.onCreated) {
  chrome.tabs.onCreated.addListener(scheduleLiveRerender);
  chrome.tabs.onRemoved.addListener(scheduleLiveRerender);
  chrome.tabs.onUpdated.addListener((_id, changeInfo) => {
    // Re-render only on URL/title/pin changes; skip per-keystroke status flips
    if (changeInfo.url || changeInfo.title || 'pinned' in changeInfo) {
      scheduleLiveRerender();
    }
  });
  chrome.tabs.onMoved.addListener(scheduleLiveRerender);
  // Switching tabs updates lastAccessed → re-sort by recency/usage.
  if (chrome.tabs.onActivated) chrome.tabs.onActivated.addListener(scheduleLiveRerender);
}

// Storage changes can come from another context (e.g. right-click menu in
// background.js adds a favorite) — re-render so the page stays in sync.
if (chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.tabTitleOverrides || changes.tabUsageStats) {
      renderDashboard();
      return;
    }
    if (!changes.favorites) return;
    if (_suppressFavReRender) return;   // local iconUrl batch write — skip
    renderFavoritesColumn();
  });
}


/* ----------------------------------------------------------------
   INITIALIZE
   ---------------------------------------------------------------- */
(async () => {
  await loadLang();
  await loadTheme();
  await migrateAwayFromFolders();
  applyStaticI18n();
  await renderDashboard();
})();
