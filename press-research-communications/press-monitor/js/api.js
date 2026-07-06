// Tipolis Press Monitor — API + auth module.
// One place for: the Web App endpoint, the per-session token, every fetch,
// the {ok,data,error} unwrap, markdown rendering, and small UI helpers.
// Loaded as a classic script (no modules, no build step).
//
// The token is NEVER hardcoded here. It is entered at the login gate
// (index.html), kept only in memory + sessionStorage (cleared when the tab
// closes), and appended to every request. Anything that 401s drops the token
// and bounces back to the gate.

(function (global) {
  'use strict';

  // Endpoint is not a secret — just the deployed Web App /exec URL (spec §7).
  const WEB_APP_URL =
    'https://script.google.com/macros/s/AKfycbzmgzIONpheRejnEWztwCxTjNFlw3W_ZeusK85LeGzKU8CoAt7rA0rmqD2P3xBktuS1/exec';

  const TOKEN_KEY = 'pm_token';
  const GATE_PATH = './';          // index.html in the same folder = login gate
  const DEFAULT_TIMEOUT_MS = 45000;   // light reads/writes
  const SLOW_TIMEOUT_MS = 180000;     // search / filter / report-generate

  // Retry policy: every Web App fetch is attempted up to RETRY_ATTEMPTS times,
  // waiting RETRY_DELAY_MS between tries, before the error is allowed to reach
  // the user. Retries fire on a thrown fetch (network/timeout) or an HTTP
  // 4xx/5xx response.
  const RETRY_ATTEMPTS = 3;
  const RETRY_DELAY_MS = 3000;

  let memToken = null;

  // --- Token management -------------------------------------------------

  function getToken() {
    if (memToken) return memToken;
    try { memToken = global.sessionStorage.getItem(TOKEN_KEY) || null; } catch (e) { memToken = null; }
    return memToken;
  }

  function setToken(t) {
    memToken = String(t || '').trim();
    try { global.sessionStorage.setItem(TOKEN_KEY, memToken); } catch (e) {}
  }

  function clearToken() {
    memToken = null;
    try { global.sessionStorage.removeItem(TOKEN_KEY); } catch (e) {}
  }

  function hasToken() { return !!getToken(); }

  // Screen pages call this on load: bounce to the gate if there is no token.
  function requireToken() {
    if (!hasToken()) { global.location.href = GATE_PATH; return false; }
    return true;
  }

  function logout() {
    clearToken();
    global.location.href = GATE_PATH;
  }

  // --- Core request -----------------------------------------------------

  function buildUrl(path, params) {
    const u = new URL(WEB_APP_URL);
    u.searchParams.set('path', path);
    u.searchParams.set('token', getToken() || '');
    if (params) {
      Object.keys(params).forEach(k => {
        const v = params[k];
        if (v !== null && v !== undefined && v !== '') u.searchParams.set(k, String(v));
      });
    }
    return u.toString();
  }

  function timeoutError() {
    const e = new Error('The request took too long.');
    e.name = 'TimeoutError';
    return e;
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // One fetch attempt with its own timeout. Resolves with the Response on a
  // successful (res.ok) result; otherwise throws a classified, retryable error:
  // TimeoutError on abort, NetworkError on a thrown fetch, HttpError on 4xx/5xx.
  async function fetchOnce(url, fetchInit, path, ms) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    let res;
    try {
      res = await fetch(url, Object.assign({ signal: controller.signal }, fetchInit));
    } catch (err) {
      clearTimeout(timer);
      if (err && err.name === 'AbortError') throw timeoutError();
      const e = new Error("Couldn't reach the backend. Check your connection and that the Web App is deployed.");
      e.name = 'NetworkError';
      throw e;
    }
    clearTimeout(timer);

    if (!res.ok) {
      const e = new Error('HTTP ' + res.status + ' calling ' + path);
      e.name = 'HttpError';
      e.status = res.status;
      throw e;
    }
    return res;
  }

  // Retry wrapper — the single choke point every Web App fetch passes through.
  // On a thrown fetch (network/timeout) or an HTTP 4xx/5xx response it retries
  // up to RETRY_ATTEMPTS total attempts, RETRY_DELAY_MS apart. The error only
  // propagates after the final attempt fails, so callers keep their spinner up
  // and show no error message while retries are in flight.
  async function fetchWithRetry(url, fetchInit, path, ms) {
    let lastErr;
    for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
      try {
        return await fetchOnce(url, fetchInit, path, ms);
      } catch (err) {
        lastErr = err;
        if (attempt < RETRY_ATTEMPTS) await sleep(RETRY_DELAY_MS);
      }
    }
    throw lastErr;
  }

  async function request(path, init, opts) {
    opts = opts || {};
    const ms = opts.timeoutMs || DEFAULT_TIMEOUT_MS;
    const res = await fetchWithRetry(init.url, init.fetchInit, path, ms);

    let json;
    try { json = await res.json(); }
    catch (e) { throw new Error('Bad response from the backend (not JSON) for ' + path); }

    if (!json || json.ok !== true) {
      const msg = (json && json.error) || 'Request failed: ' + path;
      if (/unauthorized/i.test(msg)) {
        if (!opts.suppressAuthRedirect) logout();
        const e = new Error('Unauthorized');
        e.name = 'Unauthorized';
        throw e;
      }
      throw new Error(msg);
    }
    return json.data;
  }

  function apiGet(path, params, opts) {
    return request(path, { url: buildUrl(path, params), fetchInit: { method: 'GET' } }, opts);
  }

  function apiPost(path, body, opts) {
    return request(path, {
      url: buildUrl(path),
      fetchInit: {
        method: 'POST',
        // text/plain avoids the CORS preflight Apps Script cannot answer.
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(body || {})
      }
    }, opts);
  }

  // Validate a token candidate against a cheap read. Does not redirect.
  async function validateToken(candidate) {
    if (candidate !== undefined) setToken(candidate);
    try {
      await apiGet('/triage', null, { suppressAuthRedirect: true, timeoutMs: 20000 });
      return true;
    } catch (err) {
      if (err && err.name === 'Unauthorized') { clearToken(); return false; }
      // Network / timeout: surface so the gate can show a distinct message.
      throw err;
    }
  }

  // --- Slow-action UX (spec §4) ----------------------------------------
  // Disables the button, shows a "running…" label, runs the async fn with a
  // long timeout, toasts the result, and on timeout shows the honest
  // "still running in the background" message instead of a hard error.

  async function runSlow(btn, fn, opts) {
    opts = opts || {};
    const original = btn ? btn.textContent : '';
    if (btn) {
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
      btn.textContent = opts.runningLabel || 'Running… this can take a few minutes';
    }
    try {
      const res = await fn();
      toast(opts.successMessage || 'Done ✓', 'success');
      if (typeof opts.onDone === 'function') await opts.onDone(res);
      return res;
    } catch (err) {
      if (err && err.name === 'TimeoutError') {
        toast('Still running in the background — refresh in a minute to see results.', 'info');
      } else if (err && err.name === 'Unauthorized') {
        // logout() already redirected.
      } else {
        toast(err.message || 'Action failed', 'error');
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.removeAttribute('aria-busy');
        btn.textContent = original;
      }
    }
  }

  // --- Inline markdown -> HTML (**bold**, *italic*, [text](url)) --------

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

  // --- Small UI helpers -------------------------------------------------

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
    toastTimer = setTimeout(() => host.classList.remove('is-visible'), 3200);
  }

  function showStatus(target, state, message) {
    const node = typeof target === 'string' ? document.querySelector(target) : target;
    if (!node) return;
    node.textContent = message || '';
    node.dataset.state = state || '';
  }

  function formatDate(value) {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return d.toISOString().slice(0, 10);
  }

  function confirmDialog(message) {
    return Promise.resolve(global.confirm(message));
  }

  // Builds the shared sticky nav (mirrors general/ pattern) with a logout pill.
  // `active` is the screen slug to mark current.
  function mountNav(active) {
    const host = document.querySelector('[data-nav]');
    if (!host) return;
    const links = [
      { slug: 'hub', label: 'Hub', href: './' },
      { slug: 'triage', label: 'Triage', href: './triage.html' },
      { slug: 'summary', label: 'Summaries', href: './summary.html' },
      { slug: 'report', label: 'Report', href: './report.html' },
      { slug: 'config', label: 'Config', href: './config.html' },
      { slug: 'history', label: 'History', href: './history.html' }
    ];
    const items = el('div', { class: 't-nav__items' },
      links.map(l => el('a', {
        class: 't-pill' + (l.slug === active ? ' is-active' : ''),
        href: l.href,
        'aria-current': l.slug === active ? 'page' : null
      }, [l.label]))
    );
    const logout = el('button', {
      class: 't-pill pm-nav__logout',
      onClick: () => logout()
    }, ['Log out']);
    host.appendChild(el('a', { class: 't-nav__brand', href: './' }, [
      el('span', null, ['Tipolis · Press Monitor'])
    ]));
    host.appendChild(items);
    host.appendChild(el('div', { class: 'pm-nav__actions' }, [logout]));
  }

  global.PM = {
    WEB_APP_URL,
    getToken, setToken, clearToken, hasToken, requireToken, logout,
    apiGet, apiPost, validateToken, runSlow,
    renderMarkdown, escapeHtml,
    el, toast, showStatus, formatDate, confirmDialog, mountNav,
    SLOW_TIMEOUT_MS
  };
})(window);
