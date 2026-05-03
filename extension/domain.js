/* ================================================================
   tab-home — Domain and Title Helpers

   Pure URL grouping and display-name logic shared by tab cards and
   favorites. This mirrors tab-out's domain-grouped core.
   ================================================================ */

'use strict';

/* ----------------------------------------------------------------
   DOMAIN & TITLE CLEANUP HELPERS
   ---------------------------------------------------------------- */

// Map of known hostnames → friendly display names.
const FRIENDLY_DOMAINS = {
  'github.com':           'GitHub',
  'www.github.com':       'GitHub',
  'gist.github.com':      'GitHub Gist',
  'youtube.com':          'YouTube',
  'www.youtube.com':      'YouTube',
  'music.youtube.com':    'YouTube Music',
  'x.com':                'X',
  'www.x.com':            'X',
  'twitter.com':          'X',
  'www.twitter.com':      'X',
  'reddit.com':           'Reddit',
  'www.reddit.com':       'Reddit',
  'old.reddit.com':       'Reddit',
  'substack.com':         'Substack',
  'www.substack.com':     'Substack',
  'medium.com':           'Medium',
  'www.medium.com':       'Medium',
  'linkedin.com':         'LinkedIn',
  'www.linkedin.com':     'LinkedIn',
  'stackoverflow.com':    'Stack Overflow',
  'www.stackoverflow.com':'Stack Overflow',
  'news.ycombinator.com': 'Hacker News',
  'google.com':           'Google',
  'www.google.com':       'Google',
  'mail.google.com':      'Gmail',
  'docs.google.com':      'Google Docs',
  'drive.google.com':     'Google Drive',
  'calendar.google.com':  'Google Calendar',
  'meet.google.com':      'Google Meet',
  'gemini.google.com':    'Gemini',
  'chatgpt.com':          'ChatGPT',
  'www.chatgpt.com':      'ChatGPT',
  'chat.openai.com':      'ChatGPT',
  'claude.ai':            'Claude',
  'www.claude.ai':        'Claude',
  'code.claude.com':      'Claude Code',
  'notion.so':            'Notion',
  'www.notion.so':        'Notion',
  'figma.com':            'Figma',
  'www.figma.com':        'Figma',
  'slack.com':            'Slack',
  'app.slack.com':        'Slack',
  'discord.com':          'Discord',
  'www.discord.com':      'Discord',
  'wikipedia.org':        'Wikipedia',
  'en.wikipedia.org':     'Wikipedia',
  'amazon.com':           'Amazon',
  'www.amazon.com':       'Amazon',
  'netflix.com':          'Netflix',
  'www.netflix.com':      'Netflix',
  'spotify.com':          'Spotify',
  'open.spotify.com':     'Spotify',
  'vercel.com':           'Vercel',
  'www.vercel.com':       'Vercel',
  'npmjs.com':            'npm',
  'www.npmjs.com':        'npm',
  'developer.mozilla.org':'MDN',
  'arxiv.org':            'arXiv',
  'www.arxiv.org':        'arXiv',
  'huggingface.co':       'Hugging Face',
  'www.huggingface.co':   'Hugging Face',
  'producthunt.com':      'Product Hunt',
  'www.producthunt.com':  'Product Hunt',
  'xiaohongshu.com':      'RedNote',
  'www.xiaohongshu.com':  'RedNote',
  'local-files':          'Local Files',
};

const TWO_PART_PUBLIC_SUFFIXES = ['co.uk', 'co.jp', 'com.cn', 'com.tw', 'com.au', 'com.hk', 'co.kr'];

function getMainDomain(hostname) {
  if (!hostname) return '';
  const host = String(hostname).toLowerCase().replace(/\.$/, '').replace(/^www\./, '');
  if (!host || host === 'localhost' || host === 'local-files') return host;
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host) || host.includes(':')) return host;

  const parts = host.split('.').filter(Boolean);
  if (parts.length <= 2) return host;

  const suffix = parts.slice(-2).join('.');
  if (TWO_PART_PUBLIC_SUFFIXES.includes(suffix)) {
    return parts.length >= 3 ? parts.slice(-3).join('.') : host;
  }
  return parts.slice(-2).join('.');
}

function friendlyDomain(hostname) {
  if (!hostname) return '';
  if (FRIENDLY_DOMAINS[hostname]) return FRIENDLY_DOMAINS[hostname];

  if (hostname.endsWith('.substack.com') && hostname !== 'substack.com') {
    return capitalize(hostname.replace('.substack.com', '')) + "'s Substack";
  }
  if (hostname.endsWith('.github.io')) {
    return capitalize(hostname.replace('.github.io', '')) + ' (GitHub Pages)';
  }

  // Strip leading www., then return just the second-level domain (the
  // "brand"). For www.binance.com → "Binance". For accounts.binance.com →
  // also "Binance". Two-segment TLDs (.co.uk etc.) are handled too.
  const parts = hostname.replace(/^www\./, '').split('.');
  let brand;
  if (parts.length >= 3 && TWO_PART_PUBLIC_SUFFIXES.includes(parts.slice(-2).join('.'))) {
    brand = parts[parts.length - 3];
  } else if (parts.length >= 2) {
    brand = parts[parts.length - 2];
  } else {
    brand = parts[0];
  }
  return capitalize(brand);
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function stripTitleNoise(title) {
  if (!title) return '';
  // Strip leading notification count: "(2) Title"
  title = title.replace(/^\(\d+\+?\)\s*/, '');
  // Strip inline counts like "Inbox (16,359)"
  title = title.replace(/\s*\([\d,]+\+?\)\s*/g, ' ');
  // Strip email addresses (privacy + cleaner display)
  title = title.replace(/\s*[\-\u2010-\u2015]\s*[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, '');
  title = title.replace(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, '');
  // Clean X/Twitter format
  title = title.replace(/\s+on X:\s*/, ': ');
  title = title.replace(/\s*\/\s*X\s*$/, '');
  return title.trim();
}

function cleanTitle(title, hostname) {
  if (!title || !hostname) return title || '';

  const friendly = friendlyDomain(hostname);
  const domain   = hostname.replace(/^www\./, '');
  const seps     = [' - ', ' | ', ' — ', ' · ', ' – '];

  for (const sep of seps) {
    const idx = title.lastIndexOf(sep);
    if (idx === -1) continue;
    const suffix     = title.slice(idx + sep.length).trim();
    const suffixLow  = suffix.toLowerCase();
    if (
      suffixLow === domain.toLowerCase() ||
      suffixLow === friendly.toLowerCase() ||
      suffixLow === domain.replace(/\.\w+$/, '').toLowerCase() ||
      domain.toLowerCase().includes(suffixLow) ||
      friendly.toLowerCase().includes(suffixLow)
    ) {
      const cleaned = title.slice(0, idx).trim();
      if (cleaned.length >= 5) return cleaned;
    }
  }
  return title;
}

function smartTitle(title, url) {
  if (!url) return title || '';
  let pathname = '', hostname = '';
  try { const u = new URL(url); pathname = u.pathname; hostname = u.hostname; }
  catch { return title || ''; }

  const titleIsUrl = !title || title === url || title.startsWith(hostname) || title.startsWith('http');

  if ((hostname === 'x.com' || hostname === 'twitter.com' || hostname === 'www.x.com') && pathname.includes('/status/')) {
    const username = pathname.split('/')[1];
    if (username) return titleIsUrl ? `Post by @${username}` : title;
  }

  if (hostname === 'github.com' || hostname === 'www.github.com') {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length >= 2) {
      const [owner, repo, ...rest] = parts;
      if (rest[0] === 'issues' && rest[1]) return `${owner}/${repo} Issue #${rest[1]}`;
      if (rest[0] === 'pull'   && rest[1]) return `${owner}/${repo} PR #${rest[1]}`;
      if (rest[0] === 'blob' || rest[0] === 'tree') return `${owner}/${repo} — ${rest.slice(2).join('/')}`;
      if (titleIsUrl) return `${owner}/${repo}`;
    }
  }

  if ((hostname === 'www.youtube.com' || hostname === 'youtube.com') && pathname === '/watch') {
    if (titleIsUrl) return 'YouTube Video';
  }

  if ((hostname === 'www.reddit.com' || hostname === 'reddit.com' || hostname === 'old.reddit.com') && pathname.includes('/comments/')) {
    const parts  = pathname.split('/').filter(Boolean);
    const subIdx = parts.indexOf('r');
    if (subIdx !== -1 && parts[subIdx + 1]) {
      if (titleIsUrl) return `r/${parts[subIdx + 1]} post`;
    }
  }

  return title || url;
}



/* ----------------------------------------------------------------
   DOMAIN GROUPING
   ---------------------------------------------------------------- */

// Tabs are grouped purely by hostname. The original tab-out had a special
// "Homepages" group that pulled out x.com/home, gmail inbox, etc. — but
// splitting x.com tabs across two groups (Homepages + X) was confusing.
// Users can re-enable per-site landing-page splits via config.local.js
// (LOCAL_LANDING_PAGE_PATTERNS) if they want the old behavior.
function getLandingPagePatterns() {
  return [
    ...(typeof LOCAL_LANDING_PAGE_PATTERNS !== 'undefined' ? LOCAL_LANDING_PAGE_PATTERNS : []),
  ];
}

function getCustomGroups() {
  return typeof LOCAL_CUSTOM_GROUPS !== 'undefined' ? LOCAL_CUSTOM_GROUPS : [];
}

function matchesHostRule(parsedUrl, rule) {
  if (!parsedUrl || !rule) return false;
  if (rule.hostname) return parsedUrl.hostname === rule.hostname;
  if (rule.hostnameEndsWith) return parsedUrl.hostname.endsWith(rule.hostnameEndsWith);
  return false;
}

function isLandingPage(url, landingPagePatterns = getLandingPagePatterns()) {
  try {
    const parsed = new URL(url);
    return landingPagePatterns.some(p => {
      if (!matchesHostRule(parsed, p)) return false;
      if (p.test)       return p.test(parsed.pathname, url);
      if (p.pathPrefix) return parsed.pathname.startsWith(p.pathPrefix);
      if (p.pathExact)  return p.pathExact.includes(parsed.pathname);
      return parsed.pathname === '/';
    });
  } catch { return false; }
}

function matchCustomGroup(url, customGroups = getCustomGroups()) {
  try {
    const parsed = new URL(url);
    return customGroups.find(r => {
      if (!matchesHostRule(parsed, r)) return false;
      if (r.pathPrefix) return parsed.pathname.startsWith(r.pathPrefix);
      return true;
    }) || null;
  } catch { return null; }
}

function tabRecency(tab) {
  return tab.lastAccessed || 0;
}

function domainStableId(domain) {
  return 'domain-' + String(domain).replace(/[^a-z0-9]/g, '-');
}

/**
 * Group an array of tabs into domain cards. Runs for pinned and regular tabs
 * separately so each sub-section has the same sorting/grouping semantics.
 */
function groupTabsByDomain(tabs, {
  landingPagePatterns = getLandingPagePatterns(),
  customGroups = getCustomGroups(),
} = {}) {
  const groupMap = {};
  const landing  = [];
  for (const tab of tabs) {
    try {
      if (isLandingPage(tab.url, landingPagePatterns)) { landing.push(tab); continue; }
      const customRule = matchCustomGroup(tab.url, customGroups);
      if (customRule) {
        const key = customRule.groupKey;
        if (!groupMap[key]) groupMap[key] = { domain: key, label: customRule.groupLabel, tabs: [] };
        groupMap[key].tabs.push(tab);
        continue;
      }
      const hostname = (tab.url && tab.url.startsWith('file://'))
        ? 'local-files'
        : getMainDomain(new URL(tab.url).hostname);
      if (!hostname) continue;
      if (!groupMap[hostname]) groupMap[hostname] = { domain: hostname, tabs: [] };
      groupMap[hostname].tabs.push(tab);
    } catch { /* skip malformed */ }
  }
  if (landing.length > 0) {
    groupMap['__landing-pages__'] = { domain: '__landing-pages__', tabs: landing };
  }

  // Sort tabs WITHIN each group: most recently active first, then newer
  // tab ids (a fresh tab might have lastAccessed=0 but a higher id than
  // older tabs).
  for (const g of Object.values(groupMap)) {
    g.tabs.sort((a, b) => {
      const t = tabRecency(b) - tabRecency(a);
      return t !== 0 ? t : (b.id - a.id);
    });
  }

  return Object.values(groupMap).sort((a, b) => {
    // Landing pages still float to the top (no-op when LANDING_PAGE_PATTERNS is empty)
    const aIsLanding = a.domain === '__landing-pages__';
    const bIsLanding = b.domain === '__landing-pages__';
    if (aIsLanding !== bIsLanding) return aIsLanding ? -1 : 1;

    // Primary: group with the most recently active tab comes first.
    // Because tabs inside each group are already sorted by recency,
    // tabs[0] holds the freshest one.
    const aTime = a.tabs[0] ? tabRecency(a.tabs[0]) : 0;
    const bTime = b.tabs[0] ? tabRecency(b.tabs[0]) : 0;
    if (aTime !== bTime) return bTime - aTime;

    // Tie-break: highest tab id first — handles brand-new background
    // tabs that haven't been activated yet but should still appear at the top.
    const aMaxId = a.tabs[0] ? a.tabs[0].id : 0;
    const bMaxId = b.tabs[0] ? b.tabs[0].id : 0;
    return bMaxId - aMaxId;
  });
}

