// Tipolis Press Monitor — API wrapper, markdown rendering, UI helpers.
// Loaded as a classic script tag (no modules, no build step).

(function (global) {
  'use strict';

  const CFG = global.CONFIG || {};
  const isConfigured = () =>
    CFG.WEB_APP_URL && !CFG.WEB_APP_URL.startsWith('PASTE_') &&
    CFG.BEARER_TOKEN && !CFG.BEARER_TOKEN.startsWith('PASTE_');

  function buildUrl(path, extraParams) {
    const u = new URL(CFG.WEB_APP_URL);
    u.searchParams.set('path', path);
    u.searchParams.set('token', CFG.BEARER_TOKEN);
    if (extraParams) {
      Object.keys(extraParams).forEach(k => {
        const v = extraParams[k];
        if (v !== null && v !== undefined && v !== '') {
          u.searchParams.set(k, String(v));
        }
      });
    }
    return u.toString();
  }

  async function request(path, options) {
    if (!isConfigured()) {
      throw new Error('Frontend is not configured. Edit assets/js/config.js with the deployed Web App URL and bearer token.');
    }
    const res = await fetch(options.url, options.init);
    if (!res.ok) throw new Error('HTTP ' + res.status + ' calling ' + path);
    const json = await res.json();
    if (!json || json.ok !== true) {
      throw new Error((json && json.error) || 'Request failed: ' + path);
    }
    return json.data;
  }

  async function apiGet(path, params) {
    return request(path, {
      url: buildUrl(path, params),
      init: { method: 'GET' }
    });
  }

  async function apiPost(path, body) {
    return request(path, {
      url: buildUrl(path),
      init: {
        method: 'POST',
        // text/plain avoids the CORS preflight Apps Script cannot answer.
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(body || {})
      }
    });
  }

  // --- Inline markdown -> HTML ------------------------------------------
  // Supports **bold**, *italic*, and [text](url). The backend keeps the
  // same markdown when writing the Doc, so we never mutate stored strings.

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function renderMarkdown(md) {
    const text = String(md == null ? '' : md);
    let out = '';
    const re = /(\[([^\]]+)\]\(([^)]+)\))|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)/g;
    let last = 0, m;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) out += escapeHtml(text.slice(last, m.index));
      if (m[1]) {
        // [text](url) — allow nested **bold** inside the anchor text.
        let inner = m[2], bold = false;
        const bm = inner.match(/^\*\*([\s\S]+)\*\*$/);
        if (bm) { inner = bm[1]; bold = true; }
        const href = encodeURI(m[3]);
        const safeInner = escapeHtml(inner);
        out += '<a href="' + href + '" target="_blank" rel="noopener">' +
          (bold ? '<strong>' + safeInner + '</strong>' : safeInner) + '</a>';
      } else if (m[4]) {
        out += '<strong>' + escapeHtml(m[5]) + '</strong>';
      } else if (m[6]) {
        out += '<em>' + escapeHtml(m[7]) + '</em>';
      }
      last = re.lastIndex;
    }
    if (last < text.length) out += escapeHtml(text.slice(last));
    return out;
  }

  // --- UI helpers -------------------------------------------------------

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(k => {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'dataset') Object.assign(node.dataset, attrs[k]);
        else if (k.startsWith('on') && typeof attrs[k] === 'function') {
          node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        } else if (k === 'html') node.innerHTML = attrs[k];
        else node.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(c => {
      if (c == null) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  let toastTimer = null;
  function toast(message, kind) {
    let host = document.getElementById('pm-toast');
    if (!host) {
      host = document.createElement('div');
      host.id = 'pm-toast';
      host.className = 'pm-toast';
      document.body.appendChild(host);
    }
    host.textContent = message;
    host.dataset.kind = kind || 'info';
    host.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => host.classList.remove('is-visible'), 2400);
  }

  function showStatus(targetSelector, state, message) {
    const node = typeof targetSelector === 'string'
      ? document.querySelector(targetSelector) : targetSelector;
    if (!node) return;
    node.textContent = message || '';
    node.dataset.state = state || '';
  }

  function setBusy(node, busy) {
    if (!node) return;
    if (busy) node.setAttribute('aria-busy', 'true');
    else node.removeAttribute('aria-busy');
  }

  function formatDate(value) {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return d.toISOString().slice(0, 10);
  }

  function confirmDialog(message) {
    // Wrapper so we can later swap window.confirm for a styled modal.
    return Promise.resolve(window.confirm(message));
  }

  global.PM = {
    apiGet, apiPost, renderMarkdown, escapeHtml,
    el, toast, showStatus, setBusy, formatDate, confirmDialog,
    isConfigured
  };
})(window);
